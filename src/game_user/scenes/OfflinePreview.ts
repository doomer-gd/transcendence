import { Scene } from 'phaser';
import { GameConstructData, GameMap } from '../../game_common/utility/SharedConfig';
import { PlayerClient } from '../player/PlayerClient';
import { PlayerSimulation } from '../gameplay/PlayerSimulation';
import { SpriteFactory } from '../render/SpriteFactory';
import { GameObject } from '@/game_common/gameobjects/GameObject';
import { EntitySprite } from '../render/EntitySprite';
import { EPlayerActionTypes, Player } from '@/game_common/gameobjects/Player';
import { EventBus } from '@/game_common/main/EventBus';
import { DF_GAME_HEIGHT, DF_GAME_WIDTH, EScenes } from '@/game_common/main/main';
import { MatterData } from '@/game_common/utility/Constructors';
import Matter, { Body } from 'matter-js';

export class OfflinePreview extends Scene
{
  player:     PlayerClient;
  map:        Phaser.Tilemaps.Tilemap;
  sim:        PlayerSimulation;
  spriteFactory:    SpriteFactory;
  private overlay:    Phaser.GameObjects.Image;
  private config:     GameConstructData;
  private mapConfig:  GameMap;

  constructor()
  {
    super(EScenes.offline);
  }

  init()
  {
    this.config = this.registry.get("g_config");
    const mapIndex = Math.trunc(Math.random() * 3);
    this.mapConfig = this.config.maps[mapIndex];
    this.spriteFactory = new SpriteFactory(this, this.config);
  }

  create()
  {
    this.sim = new PlayerSimulation(this.mapConfig, this.config, this.events);
    this.constructTilemap(this.mapConfig);
    this.events.once("worldConstructed", () =>
    {
      // const heroIndex = Math.trunc(Math.random() * 6);
      const heroIndex = 3;
      const id = this.sim.offlineAddPlayer(this.config.characters[heroIndex].label)!.id;
      this.reconcileSprites();
      this.debugTiles();
      this.constructPlayerClient(id);
      this.addAudioEventListeners();
      this.addListeners();
      this.scene.launch(EScenes.UI, [this.player.player, this.sim, this]).bringToTop(EScenes.UI);
      this.sim.spawnPlayer(id, true);
      this.sim.start();
    })
    EventBus.emit('current-scene-ready', this);
  }


  update(time: number, delta: number): void
  {
    if (this.sim.isActive())
    {
      if (this.sim.update())
      {
        this.player.player.state.charges = 0;
        const input = this.sim.getInput();
        if (input)
          this.sim.addEvent(this.sim.getTick(), {type:"input", input: input});
      }
      this.reconcileSprites();
    }
  }

  reconcileSprites()
  {
    const gameObjects = this.sim.getObjectMap();
    gameObjects.forEach((obj:GameObject) =>
    {
      let sprite: EntitySprite | undefined = obj.sprite;
      if (!sprite)
        sprite = this.spriteFactory.insert(obj);
      sprite.update();
    })
    const objectMap = this.sim.getObjectMap();
    this.spriteFactory.getSpriteMap().forEach((entity: EntitySprite, key: number) =>
    {
      const current = objectMap.get(key);
      if (!current || current.sprite !== entity)
        this.spriteFactory.remove(key);
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
    decorObjects.forEach((item: any) =>
      this.placeDecorItem(item, mapConfig.worldConfig.scale));
  }

  private addLayer(image: Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite,
    pos: Matter.Vector, scrollFactor: number)
  {
    const scale = this.overlay.width / image.width;
    image.setScale(scale);
    image.setSize(this.overlay.width, this.overlay.height);
    image.setPosition(pos.x, pos.y);
    image.setScrollFactor(scrollFactor);
  }

  private addListeners()
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
        return ;
      entity.playSound(["hit", this.sim.getTick()]);
    })
  }

  private constructPlayerClient(id: number)
  {
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

  private debugTiles()
  {
    (this.sim.debugMatter() as MatterData).idObjectMap.forEach((tile: GameObject) =>
    {
      if (!tile.body)
        return ;
      const body = tile.body as Body;
      const size = {x: body.bounds.max.x - body.bounds.min.x, y: body.bounds.max.y - body.bounds.min.y};
      const pos = {x: body.position.x , y: body.position.y};
      // this.add.rectangle(pos.x, pos.y, size.x, size.y, 0xff0000, 0.3);
    })
  }
}
