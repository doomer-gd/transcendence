import { PlayerClient } from '../player/PlayerClient';
import { Scene } from 'phaser';
import { PlayerNetwork } from '../player/PlayerNetwork';
import { PlayerSimulation } from '../gameplay/PlayerSimulation';
import { GameConstructData, GameMap } from '../../game_common/utility/SharedConfig';
import { GameModes, Snapshot } from '@/game_common/gameplay/Simulation';
import { EPlayerActionTypes, Player } from '@/game_common/gameobjects/Player';
import { GameObject } from '@/game_common/gameobjects/GameObject';
import { SpriteFactory } from '../render/SpriteFactory';
import { EntitySprite } from '../render/EntitySprite';
import { EventBus } from '@/game_common/main/EventBus';
import { DF_GAME_HEIGHT, DF_GAME_WIDTH, EScenes } from '@/game_common/main/main';
import Matter from 'matter-js';

export class GameScene extends Scene
{
  player: PlayerClient;
  network: PlayerNetwork;
  sim: PlayerSimulation;
  spriteFactory: SpriteFactory;
  nickList: Map<number, string>;
  scores: Array<[string, number, number]>;
  private overlay: Phaser.GameObjects.Image;
  private config: GameConstructData;
  private mapConfig: GameMap;

  constructor()
  {
    super(EScenes.game);
  }

  preload() {};

  init(mapConfig: GameMap)
  {
    this.mapConfig = mapConfig;
    this.network = this.registry.get("g_network");
    this.config = this.registry.get("g_config");
    this.spriteFactory = new SpriteFactory(this, this.config);
  }

  create()
  {
    this.sim = new PlayerSimulation(this.mapConfig, this.config, this.events);
    this.constructTilemap(this.mapConfig);
    this.events.once("worldConstructed", () =>
    {
      this.network.sock.once("playerInfo", (snap: Snapshot, id: number) =>
      {
        this.sim.importSnapshot(snap);
        this.reconcileSprites();
        this.constructPlayerClient(id);
        this.addControllListeners();
        this.addAudioEventListeners();
        this.expectUpdates();
        this.events.once("UISceneConstructed", () => this.network.sock.emit("playerReady"));
        this.scene.launch(EScenes.UI, [this.player.player, this.sim, this]);
      });
      this.network.sock.emit("playerLoading");
    });
    this.events.once("shutdown", this.callbackOnShutdown, this);
    this.events.on("wake", () => this.callbackOnWake(), this);
    EventBus.emit("current-scene-ready", this);
  }

  update(time: number, delta: number): void
  {
    if (!this.sim || !this.sim.isActive() || !this.player || !this.player.sprite)
      return;
    this.sim.reconcile();
    if (this.sim.update())
    {
      const input = this.sim.getInput();
      if (input)
      {
        this.network.sock.emit("input", this.sim.getTick(), input);
        this.sim.addEvent(this.sim.getTick(), { type: "input", input: input });
      }
    }
    this.reconcileSprites();
  }

  callbackOnWake()
  {
    this.network.sock.once("playerInfo", (snap: Snapshot, id: number) =>
    {
      this.sim.importSnapshot(snap);
      this.sim.setTick(snap.tick);
      this.reconcileSprites();
      this.constructPlayerClient(id);
      this.expectUpdates();
      this.sim.eventsGame.emit("spawn", id);
      this.network.sock.emit("playerReady");
    });
    this.network.sock.emit("playerLoading");
    this.sim.refreshTimer();
  }

  callbackOnShutdown()
  {
    if (this.network)
    {
      this.network.removeCallback("close", this.returnToMenu, this);
      if (this.network.sock)
      {
        this.network.sock.off("snapShot");
        this.network.sock.off("scores");
        this.network.sock.off("playerInfo");
        this.network.sock.off("gameReady");
      }
    }
    this.sim?.destroy();
    this.player?.destroy();
    this.player = undefined as any;
    this.spriteFactory?.clear();
    this.events.off("worldConstructed");
    this.events.off("UISceneConstructed");
    this.events.off("resume");
    this.events.off("wake");
    this.events.off("move");
    this.events.off("jump");
    this.events.off("action");
    this.events.off("soundOnDestroy");
    this.events.off("nickList");
    this.events.off("scores");
    this.events.off("scoresVisible");
    this.events.off("endGame");
    this.children.removeAll();
  }

  reconcileSprites()
  {
    if (!this.sim || !this.spriteFactory)
      return;
    const gameObjects = this.sim.getObjectMap();
    if (!gameObjects)
      return;
    gameObjects.forEach((obj: GameObject) =>
    {
      let sprite: EntitySprite | undefined = obj.sprite;
      if (!sprite)
      {
        this.spriteFactory.remove(obj.id);
        sprite = this.spriteFactory.insert(obj);
      }
      sprite.update();
    });
    this.spriteFactory.getSpriteMap().forEach((entity: EntitySprite, key: number) =>
    {
      const parent = gameObjects.get(key);
      if (!parent || parent.sprite !== entity)
        this.spriteFactory.remove(key);
    });
  }

  private expectUpdates()
  {
    this.network.sock.off("gameReady");
    this.network.sock.once("gameReady", (snap: Snapshot, nickList: [string, number][]) =>
    {
      this.sim.importSnapshot(snap);
      this.sim.setTick(snap.tick);
      this.reconcileSprites();
      this.setNicknames(nickList);
      this.scene.sleep(EScenes.mainMenu);
      this.sim.start();
      this.network.sock.off("snapShot");
      this.network.sock.on("snapShot", (snapshot: Snapshot) => this.sim.setLastSnap(snapshot));
      this.network.sock.off("scores");
      this.network.sock.on("scores", (scores) => this.updateScores(scores));
      this.network.setCallback("close", this.returnToMenu, this);
      this.events.off("resume");
      this.events.on("resume", () => this.sim.refreshTimer());
    });
  }

  private constructTilemap(mapConfig: GameMap)
  {
    const pos = mapConfig.worldConfig.offset as Matter.Vector;
    const overlayScale = mapConfig.worldConfig.scale;
    let walls = [];
    const back = this.add.tileSprite(0, 0, DF_GAME_WIDTH, DF_GAME_HEIGHT, mapConfig.background.label).setOrigin(0, 0);
    if (mapConfig.backLayers)
    {
      for (const layer of mapConfig.backLayers)
        walls.push(this.add.image(0, 0, layer.label).setOrigin(0, 0));
    }
    this.overlay = this.add.image(pos.x * overlayScale, pos.y * overlayScale, this.mapConfig.mapImage.label);
    this.overlay.setScale(overlayScale).setOrigin(0, 0);
    this.overlay.setSize(this.overlay.width * overlayScale, this.overlay.height * overlayScale);
    if (walls)
      walls.forEach((layer) => this.addLayer(layer, pos, 1));
    this.addLayer(back, pos, 0.8);
    const decorObjects = this.mapConfig.worldConfig.decor;
    decorObjects.forEach((item: any) => this.placeDecorItem(item, mapConfig.worldConfig.scale));
  }

  private addLayer(image: Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite,
    pos: Matter.Vector,scrollFactor: number)
  {
    const scale = this.overlay.width / image.width;
    image.setScale(scale);
    image.setSize(this.overlay.width, this.overlay.height);
    image.setPosition(pos.x, pos.y);
    image.setScrollFactor(scrollFactor);
  }

  private addControllListeners()
  {
    this.events.on("move", (dir: number) => this.sim.addInput({id: this.player.localId, x: dir}));
    this.events.on("jump", () => this.sim.addInput({id: this.player.localId, jump: true}));
    this.events.on("action", (type: EPlayerActionTypes) => this.sim.addInput({id: this.player.localId, action: type}));
    this.sim.eventsGame.on("despawn", (id: number) => this.spriteFactory.getSprite(id)?.setVisible(false));
    this.sim.eventsGame.on("spawn", (id: number) => this.spriteFactory.getSprite(id)?.setVisible(true));
  }

  private addAudioEventListeners()
  {
    this.events.on("soundOnDestroy", (id: number) =>
    {
      const entity = this.spriteFactory.getSprite(id);
      if (entity === undefined)
        return;
      entity.playSound(["hit", this.sim.getTick()]);
    });
  }

  private constructPlayerClient(id: number)
  {
    this.player?.destroy();
    const playerSprite = this.spriteFactory.getSprite(id);
    this.player = new PlayerClient(playerSprite!, this.overlay.getBounds());
    this.player.localId = id;
    this.player.player = this.sim.getObjectMap().get(id) as Player;
  }

  private placeDecorItem(item: any, scale: number)
  {
    if (item.type === "anim")
    {
      const sprite = this.add.sprite(item.x, item.y, "");
      this.anims.play(item.label, sprite);
      sprite.setScale(scale);
    }
    if (item.type === "image")
      this.add.image(item.x, item.y, item.label).setScale(scale);
  }

  private setNicknames(nickList: [string, number][])
  {
    this.nickList = new Map<number, string>(nickList.map(([playerId, localId]) =>
      [localId, playerId]));
    const maxLength = this.config.server.maxNickLength ?? 8;
    this.nickList.forEach((nick: string, id: number) =>
    {
      if (nick.length > maxLength)
      {
        nick = nick.slice(0, maxLength - 1) + ".";
        this.nickList.set(id, nick);
      }
      const sprite = this.spriteFactory.getSprite(id);
      if (!sprite)
        return;
      sprite.nick?.setNick(nick);
    });
    this.events.emit("nickList", this.nickList);
    const scores: [number, number, number][] =
      nickList.map((player: [string, number]) => [player[1], 0, 0]);
    this.updateScores(scores);
  }

  private updateScores(scores: [number, number, number][])
  {
    if (this.mapConfig.worldConfig.mode === GameModes.ffa)
    {
      const table = scores.map((item: [number, number, number]) => [this.nickList.get(item[0]), item[1], item[2]]);
      this.events.emit("scores", table, 0);
    }
    else if (this.mapConfig.worldConfig.mode === GameModes.teams)
    {
      let tables: [number, number, number][][] = [];
      tables.push(scores.filter((player: [number, number, number]) => this.sim.getObjectMap().get(player[0])?.team === 0));
      tables.push(scores.filter((player: [number, number, number]) => this.sim.getObjectMap().get(player[0])?.team === 1));
      let team = new Array<[number, number]>(2).fill([0,0]);
      tables.forEach((table: [number, number, number][], index: number) =>
      {
        table.forEach((player) => {team[index][0] += player[1], team[index][1] += player[2]});
        const tableWithNicks = table.map((item: [number, number, number]) => [this.nickList.get(item[0]), item[1], item[2]]);
        tableWithNicks.unshift(["team", team[index][0], team[index][1]]);
        this.events.emit("scores", tableWithNicks, index);
      });
    }
  }

  private returnToMenu(gameEnded: boolean)
  {
    this.scene.wake(EScenes.mainMenu, { gameEnded: gameEnded }).bringToTop();
    this.scene.stop(EScenes.UI);
    this.scene.stop(EScenes.game);
  }
}
