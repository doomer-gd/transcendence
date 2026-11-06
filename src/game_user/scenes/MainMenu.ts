import { Scene } from "phaser";
import { GameConstructData, GameMap } from "../../game_common/utility/SharedConfig";
import { PlayerNetwork } from "../player/PlayerNetwork";
import { PlayerConfig } from "@/game_common/gameobjects/Player";
import { ObjectConstructData } from "@/game_common/utility/Constructors";
import {IFrameData} from "@/game_common/animation/Animator";
import { DF_GAME_HEIGHT, DF_GAME_WIDTH, EScenes} from "@/game_common/main/main";
import { UI } from "./Preloader";
import { TextBoard } from "../ui/TextBoard";
import { DF_TEXT_PARAMS, TextWindow } from "./UIOverlay";
import { MenuGrid } from "../ui/MenuGrid";
import { MenuButton } from "../ui/Button";
import {EPlayerGameStatus,IPlayerGameParams} from "@/game_common/network/Interfaces";
import { IDialogue,  IDictionaries } from "../ui/Dictionary";
import * as Parsers from "@/game_common/utility/Parsers";
import { requestProfileFromParent } from "../player/ProfileBridge";

const MM_MAX_MSGS = 7;
const MM_MAX_MSG_LENGTH = 50;
const MM_MSG_POS_X = 0.38;
const MM_MSG_POS_Y = 0.27;
const MM_MSGB_SIZE = 0.25;
const MM_HERO_WIDTH = 0.1;
const MM_HERO_POS_X = 0.6;
const MM_EDGE_GAP = 10;
const MM_FINDG_SIZE = 0.3;
const serverURL = import.meta.env.DEV ? "http://localhost:3000" : window.location.origin;

interface IMenuOptions
{
  hero: number,
  map: number,
  heroPos: {x: number, y: number},
  mapPos: {x: number, y: number},
  menu: EActiveMenu,
  status: IPlayerGameParams
}

enum EActiveMenu
{
  hero,
  map,
  start,
  reconnect,
  none
}

export class MainMenu extends Scene
{
  config: GameConstructData;
  network: PlayerNetwork;
  messages: TextWindow;
  gridHero: MenuGrid;
  gridMap: MenuGrid;
  buttonFind: MenuButton;
  buttonLeave: MenuButton;
  options:      IMenuOptions;
  dialogue:     IDialogue;
  language:     string;
  playerName:   string;
  window: {w: number, h: number, halfW: number, halfH: number};
  connectionAttempts: number;

  constructor()
  {
    super(EScenes.mainMenu);
    this.window = {w: DF_GAME_WIDTH, h: DF_GAME_HEIGHT, halfW: DF_GAME_WIDTH / 2, halfH: DF_GAME_HEIGHT / 2};
    this.connectionAttempts = 1;
    this.language = this.resolveLanguage();
    this.playerName = this.resolvePlayerName();
    this.dialogue = IDictionaries.get(this.language)!;
    this.options = {hero: -1, map: -1, heroPos: { x: -1000, y: -1000 },
      mapPos: { x: -1000, y: -1000 }, menu: EActiveMenu.none, status: { state: EPlayerGameStatus.offline }};
  }

  preload()
  {
    this.config = this.cache.json.get("config");
    this.preloadTextures();
    this.preloadAudio();
  }

  create()
  {
    this.parseConfig();
    this.registry.set("g_config", this.config);
    this.registry.set("g_language", this.language);
    const background = this.add.image(0, 0, this.config.maps[0].background.label).setOrigin(0, 0);
    background.setScale(this.window.w / background.width, this.window.h / background.height);
    const offlineMode = new URLSearchParams(window.location.search).get("mode") === "offline";
    this.placeMessageBoard();
    this.createMenus();
    if (offlineMode)
      return this.scene.start(EScenes.offline);
    this.network = new PlayerNetwork();
    this.registry.set("g_network", this.network);
    this.setStatus(EPlayerGameStatus.connectingServer);
    requestProfileFromParent().then((profile) =>
    {
      this.network.setProfile(profile);
      this.log(`${this.dialogue.MSG_WELCOME}, ${profile?.username ?? this.playerName}!`);
      this.connectToServer();
    });
    this.events.on("wake", (_sys: Phaser.Scenes.Systems, data?: { gameEnded: boolean }) =>
    {
      this.updateStatus();
      if (data?.gameEnded)
      {
        this.setStatus(EPlayerGameStatus.ready);
        this.log(this.dialogue.MSG_GAME_END);
      }
    }, this);
  }

  update(time: number, delta: number): void
  {
    let menu = EActiveMenu.start;
    if (this.options.hero < 0)
      menu = EActiveMenu.hero;
    else if (this.options.map < 0)
      menu = EActiveMenu.map;
    if (this.options.status.state === EPlayerGameStatus.game)
      menu = EActiveMenu.reconnect;
    this.setMenu(menu);
  }

  private connectToServer()
  {
    this.connectionAttempts = 1;
    this.network.setCallback("reconnect_failed", this.callbackServerOffline, this);
    this.network.setCallback("reconnect", this.callbackConnectionSuccess, this);
    this.network.setCallback("open", this.callbackConnectionSuccess, this);
    this.network.setCallback("close", this.callbackConnectionLost, this);
    this.network.setCallback("error", this.callbackConnectionFail, this);
    this.network.setCallback("reconnect_attempt", this.callbackReconnectFail, this);
    this.log(this.dialogue.MSG_CONNECTING);
    this.setStatus(EPlayerGameStatus.connectingServer);
    this.network.connect(serverURL); //should be replaced in settings
    this.network.sock.on("connect_error", this.callbackConnectionError.bind(this));
  }

  startGame()
  {
    if (this.scene.isSleeping(EScenes.game))
    {
      this.scene.wake(EScenes.game);
      this.scene.wake(EScenes.UI);
    }
    else
    {
      this.scene.launch(EScenes.game, this.config.maps[this.options.map]);
      this.scene.bringToTop();
    }
    this.network.sock.once("gameReady", () =>
    {
      this.log(this.dialogue.MSG_GAME_START);
      this.setStatus(EPlayerGameStatus.game);
      if (this.scene.isActive())
        this.scene.sleep();
    });
  }

  stopGame()
  {
    this.scene.stop(EScenes.game);
    this.scene.stop(EScenes.UI);
  }

  log(msg: string)
  {
    this.messages?.board.push(msg);
  }

  setMenu(menu: EActiveMenu)
  {
    if (this.options.menu === menu)
      return;
    this.options.menu = menu;
    this.gridHero.setVisible(false);
    this.gridMap.setVisible(false);
    this.buttonFind.setVisible(false);
    this.buttonLeave.setVisible(false);
    switch (menu)
    {
      case EActiveMenu.hero:
        this.gridHero.setVisible(true);
        break;
      case EActiveMenu.map:
        this.gridMap.setVisible(true);
        break;
      case EActiveMenu.start:
        this.buttonFind.setVisible(true);
        break;
      case EActiveMenu.reconnect:
        this.buttonFind.setVisible(true);
        this.buttonLeave.setVisible(true);
    }
  }

  private resolveLanguage(): string
  {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("lang")?.trim().toLowerCase();
    const fallback = window.localStorage.getItem("site-language")?.trim().toLowerCase()
      || IDictionaries.keys().next().value;
    const selected = IDictionaries.has(fromQuery ?? "") ? fromQuery : fallback;
    return selected as string;
  }

  private resolvePlayerName(): string
  {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("nickname")?.trim();
    if (fromQuery)
      return fromQuery;
    const cachedName = window.localStorage.getItem("site-username")?.trim();
    return cachedName || "Player";
  }

  private createMenus()
  {
    this.gridMap = new MenuGrid(this, UI.compass, this.window.w * MM_HERO_WIDTH,
      {x:3, y: 1}, {x: this.window.halfW, y: this.window.h * MM_HERO_POS_X});
    this.gridMap.setTitles(Array.from(this.config.maps, (map) => map.title.find((title) => title.lang === this.language)!.title), 16);
    this.gridHero = new MenuGrid(this, UI.portrait, this.window.w * MM_HERO_WIDTH,
      {x:6, y: 1}, {x: this.window.halfW, y: this.window.h * MM_HERO_POS_X});
    this.gridHero.setTitles(Array.from(this.config.characters, (hero) => hero.title.find((title) => title.lang === this.language)!.title), 16);
    const anims = this.config.characters.map((hero) => this.anims.get(hero.animModes["idle"].label));
    const mapThumbs = this.config.maps.map((map) => map.thumb.label);
    const offsets: { x: number; y: number }[] = this.config.characters.map(
      (hero) => ({ x: hero.hitbox.xOffset, y: hero.hitbox.yOffset }));
    this.gridHero.setSprites(anims, 2, offsets);
    this.gridMap.setImages(mapThumbs);
    this.gridHero.setCallbackOnClick(this.callbackHeroSelect, this);
    this.gridMap.setCallbackOnClick(this.callbackMapSelect, this);
    this.gridHero.toggle();
    this.gridMap.toggle();
    const heroSize = this.gridHero.getSize();
    const mapSize = this.gridMap.getSize();
    const heroPos = {x: this.window.w - heroSize.x / 2 - MM_EDGE_GAP, y: MM_EDGE_GAP + heroSize.y / 2};
    const mapPos = {x: mapSize.x / 2 + MM_EDGE_GAP, y: MM_EDGE_GAP + mapSize.y / 2};
    this.options.heroPos = heroPos;
    this.options.mapPos = mapPos;
    this.buttonFind = new MenuButton(this, UI.find_game, this.window.w * MM_FINDG_SIZE, UI.font, UI.color_aux);
    this.buttonFind.setPosition(this.window.halfW, this.window.h * MM_HERO_POS_X);
    this.buttonFind.setCallback(this.callbackFindButton, this);
    this.buttonFind.setText(this.dialogue.OFFLINE);
    this.buttonLeave = new MenuButton(this, UI.find_game, this.window.w * MM_FINDG_SIZE, UI.font, UI.color_aux);
    const cancelPos = { x: this.buttonFind.center.x,
                        y: this.buttonFind.center.y + this.buttonFind.image.height + MM_EDGE_GAP};
    this.buttonLeave.setPosition(cancelPos.x, cancelPos.y);
    this.buttonLeave.setText(this.dialogue.LEAVE);
    this.buttonLeave.setCallback(this.callbackLeaveButton, this);
  }

  private callbackHeroSelect(index: number)
  {
    if (this.options.hero === index)
      this.options.hero = -1;
    else
      this.options.hero = index;
    this.gridHero.toggle();
    this.gridHero.stealItem(index, this.options.heroPos);
    this.setMenu(EActiveMenu.none);
  }

  private callbackMapSelect(index: number)
  {
    if (this.options.map === index)
      this.options.map = -1;
    else
      this.options.map = index;
    this.gridMap.toggle();
    this.gridMap.stealItem(index, this.options.mapPos);
    this.setMenu(EActiveMenu.none);
  }

  private callbackFindButton()
  {
    switch (this.options.status.state)
    {
      case EPlayerGameStatus.connectingServer:
        return;
      case EPlayerGameStatus.offline:
        this.connectToServer();
        return;
      case EPlayerGameStatus.game:
      case EPlayerGameStatus.ready:
        this.setStatus(EPlayerGameStatus.queue);
        this.findGame();
        return;
      case EPlayerGameStatus.queue:
        this.network.sock.emit("abandonMatch");
        this.setStatus(EPlayerGameStatus.ready);
        this.stopGame();
        this.log(this.dialogue.MSG_SEARCH_CANCELLED);
    }
  }

  private callbackLeaveButton()
  {
    this.network.sock.emit("abandonMatch");
    this.setStatus(EPlayerGameStatus.ready);
    this.setMenu(EActiveMenu.start);
    this.stopGame();
    this.log(this.dialogue.MSG_GAME_ABANDONDED);
  }

  private updateStatus(): boolean
  {
    if (!this.network.sock || this.network.sock.disconnected)
    {
      this.setStatus(EPlayerGameStatus.offline);
      return false;
    }
    this.sendRequestStatus();
    return true;
  }

  private sendRequestStatus()
  {
    if (!this.network.sock)
      return;
    this.network.sock.emit("requestStatus");
  }

  private findGame()
  {
    const gameParams = {map: this.config.maps[this.options.map].label,
                        hero: this.config.characters[this.options.hero].label};
    const checkJoinStatus = (status: number) =>
    {
      if (status === 0)
      {
        this.log(this.dialogue.MSG_MATCH_FOUND);
        this.log(this.dialogue.MSG_AWAITING_PLAYERS);
        this.setStatus(EPlayerGameStatus.queue);
        this.startGame();
      };
    }
    if (!this.updateStatus())
      return ;
    this.network.sock.once("playerStatus", (status) =>
    {
      if (status.state === EPlayerGameStatus.ready || status.state === EPlayerGameStatus.game)
      {
        this.log(this.dialogue.MSG_SEARCHING_FOR);
        this.network.sock.emit("joinMatch", gameParams.map, gameParams.hero);
        this.network.sock.once("joinStatus", (status: number) => checkJoinStatus(status));
      }
    });
  }

  private setStatus(status: EPlayerGameStatus)
  {
    this.options.status.state = status;
    switch (status)
    {
      case EPlayerGameStatus.offline:
        this.buttonFind.setText(this.dialogue.CONNECT);
        this.setMenusInteractive(true);
        break;
      case EPlayerGameStatus.connectingServer:
        this.buttonFind.setText(this.dialogue.CONNECTING);
        this.setMenusInteractive(true);
        break;
      case EPlayerGameStatus.game:
        this.buttonFind.setText(this.dialogue.RECONNECT);
        this.setMenusInteractive(false);
        break;
      case EPlayerGameStatus.queue:
        this.buttonFind.setText(this.dialogue.CANCEL_SEARCH);
        this.setMenusInteractive(false);
        break;
      case EPlayerGameStatus.ready:
        this.buttonFind.setText(this.dialogue.FIND_GAME);
        this.setMenusInteractive(true);
    }
  }

  private setMenusInteractive(isInteractive: boolean)
  {
    this.gridHero.setInteractive(isInteractive);
    this.gridMap.setInteractive(isInteractive);
  }

  private callbackConnectionFail()
  {
    if (this.options.status.state === EPlayerGameStatus.connectingServer)
      return;
    this.log(this.dialogue.MSG_CONNECTION_FAILED);
  }

  private callbackConnectionError(error: Error)
  {
    this.log(this.dialogue.MSG_CONNECTION_DENIED + ": " + error.message);
    this.setStatus(EPlayerGameStatus.offline);
  }

  private callbackReconnectFail()
  {
    this.connectionAttempts++;
    this.log(`${this.dialogue.MSG_CONNECTION_ATTMT}: ${this.connectionAttempts}`);
  }

  private callbackConnectionSuccess()
  {
    this.connectionAttempts = 1;
    this.network.sock.on("playerStatus", (status) => {
      if (
        this.options.status.state === EPlayerGameStatus.game &&
        status.state === EPlayerGameStatus.ready
      )
        this.log(this.dialogue.MSG_GAME_END);
      this.setStatus(status.state);
      this.setSelectedItems(status.map, status.hero);
    });
    this.sendRequestStatus();
    this.log(this.dialogue.MSG_CONNECTION_SUCCESS);
  }

  private callbackConnectionLost(reason: string)
  {
    if (reason === "forced close")
      return;
    this.log(this.dialogue.MSG_CONNECTION_FAILED);
    this.network.sock?.io.reconnection(false);
    this.setStatus(EPlayerGameStatus.offline);
    this.stopGame();
  }

  private callbackServerOffline()
  {
    this.log(this.dialogue.MSG_CONNECTION_FAILED);
    this.setStatus(EPlayerGameStatus.offline);
    this.stopGame();
  }

  private setSelectedItems(mapLabel?: string, heroLabel?: string)
  {
    let heroIndex: number = this.options.hero;
    let mapIndex: number = this.options.map;
    if (heroLabel !== undefined)
      heroIndex = this.config.characters.findIndex((hero) => hero.label === heroLabel);
    if (mapLabel !== undefined)
      mapIndex = this.config.maps.findIndex((map) => map.label === mapLabel);
    this.options.hero = heroIndex;
    this.options.map = mapIndex;
    if (heroIndex > -1)
      this.gridHero.stealItem(heroIndex, this.options.heroPos);
    if (heroIndex > -1)
      this.gridMap.stealItem(mapIndex, this.options.mapPos);
  }

  private placeMessageBoard()
  {
    const image = this.add.image(this.window.halfW, this.window.h * MM_MSG_POS_Y,
      UI.message_board);
    const scale = (this.window.w * MM_MSGB_SIZE) / image.width;
    image.setScale(scale);
    image.setSize(image.width * scale, image.height * scale);
    const offset = {x: image.width * MM_MSG_POS_X, y: image.height * MM_MSG_POS_Y};
    const board = new TextBoard(this, image.x - offset.x, image.y - offset.y,
      MM_MAX_MSGS, MM_MAX_MSG_LENGTH, {...DF_TEXT_PARAMS, fontSize: 18, align: 'left'});
    this.messages = {board: board, image: image, x: offset.x, y: offset.y, width: image.width, height: image.height};
  }

  private preloadTextures()
  {
    this.config.maps.forEach((map: GameMap) =>
    {
      this.load.json(map.data.label, map.data.fileName);
      this.load.image(map.mapImage.label, map.mapImage.fileName);
      this.load.image(map.background.label, map.background.fileName);
      this.load.image(map.thumb.label, map.thumb.fileName);
      if (map.backLayers)
        map.backLayers.forEach((file) =>
          this.load.image(file.label, file.fileName));
    });
    this.events.emit("progress", 0.5);
    this.config.characters.forEach((player: PlayerConfig) =>
    {
      this.load.json(player.data.label, player.data.fileName);
      this.load.atlas(player.atlas.label, player.image.fileName, player.atlas.fileName);
    });
    this.events.emit("progress", 0.7);
    this.config.gameObjects.forEach((obj: ObjectConstructData) =>
    {
      if (obj.data)
        this.load.json(obj.data.label, obj.data.fileName);
      if (obj.atlas && !this.cache.atlas.has(obj.atlas.label))
        this.load.atlas(obj.atlas.label, obj.image.fileName, obj.atlas.fileName);
      else if (obj.image)
        this.load.image(obj.image.label, obj.image.fileName);
    });
    this.events.emit("progress", 1);
    this.load.start();
  }

  private preloadAudio()
  {
    this.config.audio.forEach((file) =>
      this.load.audio(file.label, file.fileName));
  }

  private parseConfig()
  {
    this.config.characters.forEach((playerConfig: PlayerConfig) =>
    {
      const playerData = this.cache.json.get(playerConfig.data.label);
      Parsers.parseCharacter(playerConfig, playerData);
      playerConfig.frames.forEach((frame: IFrameData) =>
        Parsers.cutFrames(this, playerConfig.atlas.label, frame));
    });
    this.config.gameObjects.forEach((obj: ObjectConstructData) =>
    {
      const objConfig = this.cache.json.get(obj.data?.label);
      Parsers.parseGameObject(obj, objConfig);
      obj.frames?.forEach((frame: IFrameData) =>
        Parsers.cutFrames(this, obj.atlas.label, frame));
    });
    //parse the maps last
    this.config.maps.forEach((map: GameMap) =>
    {
      const mapfound = this.cache.json.get(map.data.label);
      Parsers.parseMap(this.config, map, mapfound);
    });
  }
}
