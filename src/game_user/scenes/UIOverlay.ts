import { EPlayerActionTypes, IPlayerParams, IPlayerState, Player } from "@/game_common/gameobjects/Player";
import { DF_GAME_HEIGHT, DF_GAME_WIDTH, EScenes } from "@/game_common/main/main";
import * as Phaser from 'phaser';
import { PlayerNetwork } from "../player/PlayerNetwork";
import { PlayerSimulation } from "../gameplay/PlayerSimulation";
import { UI } from "./Preloader";
import { TextBoard } from "../ui/TextBoard";
import { MenuButton } from "../ui/Button";
import { UICounter } from "../ui/Counter";
import { GameConstructData } from "@/game_common/utility/SharedConfig";
import { ObjectConstructData } from "@/game_common/utility/Constructors";
import { ListBoard } from "../ui/ListBoard";
import { IDialogue, IDictionaries } from "../ui/Dictionary";
import { AnnounceEvent } from "@/game_common/network/Interfaces";
import { GameModes } from "@/game_common/gameplay/Simulation";
import { ButtonCross } from "../ui/ButtonCross";

const R_BAR_SIZE = {width: 0.125, height: 0.020};
const R_BAR_POSX_HP = 0.3930;
const R_BAR_POSX_END = 0.6040;
const R_EDGE_OFFSET = 15;
const R_ICON_POS = {x: 0.045, y: 0.057};
const R_ICON_SIZE = 0.031;
const R_TIMER_POS = 0.011;
const R_TIMER_SIZE = 0.030;
const R_TEXT_OFFSETX = 0.71;
const R_TEXT_OFFSETY = 0.03;
const R_BUTTON_SIZE = 0.10;
const R_BUTTON_POS = 0.20;
const R_CHARGE_SIZE = 0.06;
const R_SCORE_SIZE = 0.3;
const R_SCORE_ALPHA = 0.8;
const R_CONTROL_SIZE = 0.08;
const R_CONTROL_OFFSET_Y = 0.1;
const R_CONTROL_OFFSET_X = 0.15;
const F_MAX_LINES = 5;
const F_LINE_LENGTH = 41;
const COLOR_HEALTH = 0xc41d00;
const COLOR_ENERGY = 0xdb201;
const COLOR_FONT = 0xfad526;
export const DF_TEXT_PARAMS = {
  fontFamily: 'Arial',
  fontSize: '14px',
  color: '#fffdfd',
  stroke: '#030303',
  strokeThickness: 0,
  align: 'center'
};
const MINUTES_IN_SEC = 1 / 60;

export interface UIElementPos
{
  x: number,
  y: number,
  width: number,
  height: number
}

interface IBar extends UIElementPos
{
  bar: Phaser.GameObjects.Graphics,
  text: Phaser.GameObjects.Text,
  color: number,
  fill: number,
  max: number
}

interface ITimer extends UIElementPos
{
  text: Phaser.GameObjects.BitmapText,
  time: number,
  min: number,
  sec: number
}

export interface TextWindow extends UIElementPos
{
  image: Phaser.GameObjects.Image;
  board: TextBoard;
}

export class UIScene extends Phaser.Scene
{
  network: PlayerNetwork;
  config: GameConstructData;
  eventsScene:  Phaser.Events.EventEmitter;
  sim: PlayerSimulation;
  player: Player;
  window: {w: number, h: number};
  health: IBar;
  energy: IBar;
  timer: ITimer;
  chargeCounter:  UICounter;
  leaderBoard:  ListBoard[];
  controls?: ButtonCross[];
  isTouch: boolean;
  moveDown: boolean[];
  messages: TextWindow;
  buttonMenu: MenuButton;
  buttonMusic: MenuButton;
  buttonScreen: MenuButton;
  music: Phaser.Sound.BaseSound;
  dialogue: IDialogue;
  nickList: Map<number, string>;

  constructor()
  {
    super(EScenes.UI);
  }

  init(input: [Player, PlayerSimulation, Phaser.Scene])
  {
    this.player = input[0];
    this.sim = input[1];
    this.eventsScene = input[2].events;
    this.window = {w: DF_GAME_WIDTH, h: DF_GAME_HEIGHT};
    this.network = this.registry.get("g_network");
    this.config = this.registry.get("g_config");
    const language = this.registry.get("g_language") ?? this.resolveLanguage();
    this.dialogue = IDictionaries.get(language)!;
  }

  create()
  {
    this.isTouch = (navigator.maxTouchPoints > 0);
    //ui elements
    if (this.isTouch)
      this.placeControlButtons();
    this.placeBars();
    this.placeIcons();
    this.placeTimer();
    this.placeMessageBoard();
    this.placeMenuButtons();
    this.placeCharges();
    this.placeScores();
    this.createAudio();
    //listeners and other stuff
    if (this.network)
      this.addNetworkListeners();
    this.events.once("shutdown", this.callbackOnShutdown, this);
    this.events.on("wake", () =>
    {
      this.scene.bringToTop();
      this.music.play();
    });
    this.eventsScene.emit("UISceneConstructed");
  }

  private resolveLanguage(): string
  {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("lang")?.trim().toLowerCase();
    const fallback = window.localStorage.getItem("site-language")?.trim().toLowerCase() || IDictionaries.keys().next().value;
    const selected = IDictionaries.has(fromQuery ?? "") ? fromQuery : fallback;
    return selected as string;
  }

  update()
  {
    if (!this.player || !this.player.state || !this.health || !this.energy || !this.chargeCounter || !this.timer)
      return;
    this.fillBar(this.health, this.player.state.hp);
    this.fillBar(this.energy, this.player.state.energy);
    this.chargeCounter.setCount(this.player.state.charges);
    this.updateTimer();
  }

  private placeMenuButtons()
  {
    this.buttonMenu = new MenuButton(this, UI.find_game, this.window.w * R_BUTTON_SIZE, UI.font, UI.color_aux);
    this.buttonMusic = new MenuButton(this, UI.find_game, this.window.w * R_BUTTON_SIZE, UI.font, UI.color_aux);
    this.buttonScreen = new MenuButton(this, UI.find_game, this.window.w * R_BUTTON_SIZE, UI.font, UI.color_aux);
    let posX = this.window.w - R_EDGE_OFFSET - this.buttonMenu.image.width / 2;
    let posY = this.window.h - R_EDGE_OFFSET - this.buttonMenu.image.height / 2;
    if (this.isTouch)
    {
      posX = this.window.w * R_BUTTON_POS + this.buttonMenu.image.width / 2;
      posY = R_EDGE_OFFSET + this.buttonMenu.image.height * 2.3 + 10;
    }
    this.buttonMenu.setPosition(posX, posY);
    this.buttonMusic.setPosition(posX, posY - 5 - this.buttonMusic.image.height);
    this.buttonScreen.setPosition(posX, posY - 10 - this.buttonMusic.image.height * 2);
    this.buttonMenu.setText(this.dialogue.LEAVE);
    this.buttonMusic.setText(this.dialogue.MUSIC + ": " + this.dialogue.ON);
    this.buttonScreen.setText(this.dialogue.FULLSCREEN + ": " + this.dialogue.OFF);
    this.buttonMenu.setVisible(true);
    this.buttonMusic.setVisible(true);
    this.buttonScreen.setVisible(true);
    this.buttonMenu.setCallback(this.callbackMenu, this);
    this.buttonMusic.setCallback(this.callbackMusicToggle, this);
    this.buttonScreen.setCallback(this.callbackFullscreen, this);
  }

  private placeHUDElement(label: string): Phaser.GameObjects.Image
  {
    const image = this.add.image(this.window.w / 2, this.window.h / 2, label);
    const scale = this.window.w / image.width;
    image.setScale(scale);
    image.setSize(scale * image.width, scale * image.width);
    return image;
  }

  private placeTimer()
  {
    this.placeHUDElement(UI.hud_timer);
    const pos = {x: this.window.w / 2, y: R_EDGE_OFFSET + R_TIMER_POS * this.window.h};
    const text = this.add.bitmapText(pos.x, pos.y, UI.font, "10:10", this.window.h * R_TIMER_SIZE).setTint(0x060845);
    text.setPosition(text.x - text.width / 2.2, text.y);
    this.timer = {x: text.x, y: text.y, width: text.width, height: text.height, text: text, time: 0, min: 0, sec: 0};
  }

  private updateTimer()
  {
    const time = this.sim.getTimeRemaining();
    if (this.timer.time !== time)
    {
      this.timer.time = time;
      this.timer.min = Math.trunc(time * MINUTES_IN_SEC);
      this.timer.sec = time % 60;
      const text = this.timer.min.toString().padStart(2, " ") + ':' + this.timer.sec.toString().padStart(2, "0");
      this.timer.text.setText(text);
    }
  }

  private placeMessageBoard()
  {
    const frame = this.placeHUDElement(UI.hud_message);
    const posX = R_TEXT_OFFSETX * this.window.w - R_EDGE_OFFSET;
    const posY = this.window.h * R_TEXT_OFFSETY + R_EDGE_OFFSET;
    const board = new TextBoard(this, posX, posY, F_MAX_LINES, F_LINE_LENGTH, {...DF_TEXT_PARAMS, align: 'left', fontSize: 16});
    this.messages = {image: frame, board: board, x: posX, y: posY, height: board.text.height, width: board.text.width};
    this.messages.board.text.setAlpha(0.8);
  }

  private placeIcons()
  {
    this.placeHUDElement(UI.hud_icons);
    let size = R_ICON_SIZE * this.window.h;
    let pos = {x: R_EDGE_OFFSET + R_ICON_POS.x * this.window.w, y: R_EDGE_OFFSET + R_ICON_POS.y * this.window.h};
    let iconList = ["sword", "special", "shield", "dash"];
    const keys = this.cache.json.get('keymap');
    const keyNames = ["ATTACK", "SPEACIAL", "SECONDARY", "DODGE"];
    if (this.player.config.moves[2].type === EPlayerActionTypes.ranged)
      iconList[2] = "bow";
    let image = this.add.image(pos.x + size * 1.5, pos.y - size, "icons_atlas", "blood");
    const scale = size / image.width;
    image.setScale(scale);
    image = this.add.image(pos.x + size * 3, pos.y - size, "icons_atlas", "energy_cost");
    image.setScale(scale);
    let textSize = size * 0.8;
    for (let i = 0; i < 4; i++)
    {
      let image = this.add.image(pos.x, pos.y, "icons_atlas", iconList[i]);
      const text = `${(keys[keyNames[i]] as string).slice(0, 2)}:`;
      let textPosY = pos.y - textSize / 2;
      this.add.bitmapText(pos.x - textSize * 2.5, textPosY, UI.font, text, textSize).setTint(COLOR_FONT);
      this.add.bitmapText(pos.x + textSize * 1.3, textPosY, UI.font, this.player.config.moves[i].damage.toString(), textSize).setTint(COLOR_FONT);
      this.add.bitmapText(pos.x + textSize * 3.1, textPosY, UI.font, this.player.config.moves[i].cost.toString(), textSize).setTint(COLOR_FONT);
      image.setScale(scale);
      pos.y += size;
    }
  }

  private placeBars()
  {
    const barWidth = R_BAR_SIZE.width * this.window.w;
    const barHeight = R_BAR_SIZE.height * this.window.h;
    const barHpPosX = R_BAR_POSX_HP * this.window.w;
    const barEndPosX = R_BAR_POSX_END * this.window.w;
    const barPosY = this.window.h - R_EDGE_OFFSET - barHeight;
    const bar_energy = this.add.graphics();
    const bar_hp = this.add.graphics();
    const posHp: UIElementPos = {x: barHpPosX - barWidth / 2, y: barPosY, width: barWidth, height: barHeight};
    const posEnd: UIElementPos = {x: barEndPosX - barWidth / 2, y: barPosY, width: barWidth, height: barHeight};
    bar_hp.setPosition(posHp.x, posHp.y);
    bar_energy.setPosition(posEnd.x, posEnd.y);
    this.placeHUDElement(UI.hud_bars);
    const textHp = this.add.text(barHpPosX, barPosY - barHeight / 2, "100/100", DF_TEXT_PARAMS);
    const textEne = this.add.text(barEndPosX, barPosY - barHeight / 2, "100/100", DF_TEXT_PARAMS);
    textHp.setPosition(textHp.x - textHp.width / 2, textHp.y + barHeight / 2);
    textEne.setPosition(textEne.x - textEne.width / 2, textEne.y + barHeight / 2);
    this.health = {bar: bar_hp, text: textHp, fill: 0, max: this.player.params.maxHP, color: COLOR_HEALTH, ...posHp};
    this.energy = {bar: bar_energy, text: textEne, fill: 0, max: this.player.params.maxEnergy, color: COLOR_ENERGY, ...posEnd};
    this.fillBar(this.health, this.player.state.hp);
    this.fillBar(this.energy, this.player.state.energy);
  }

  private fillBar(bar: IBar, fill: number)
  {
    fill = Math.trunc(fill);
    if (bar.fill === fill)
      return ;
    bar.fill = fill;
    const fillPortion = bar.fill / bar.max;
    bar.bar.clear();
    bar.bar.fillStyle(0x000000, 1);
    bar.bar.fillRect(0, 0, bar.width, bar.height);
    bar.bar.fillStyle(bar.color, 1)
    bar.bar.fillRect(1, 1, Math.trunc((bar.width - 2) * fillPortion), bar.height - 2);
    let text: string = bar.fill.toString() + '/' + bar.max.toString();
    text = text.padStart(7, " ");
    bar.text.setText(text);
  }

  private placeCharges()
  {
    this.chargeCounter = new UICounter(this, this.player.params.charges, this.window.w * R_CHARGE_SIZE);
    this.chargeCounter.setItemImages("icons_atlas", "sword");
    const flameConfig = this.config.gameObjects.find((item) => item.label === "flame") as ObjectConstructData;
    this.chargeCounter.setAnims(flameConfig);
    const pos = {x: this.window.w / 2, y: this.window.h - R_EDGE_OFFSET};
    this.chargeCounter.setPosition(pos);
  }

  private placeScores()
  {
    this.leaderBoard = [];
    const mode = this.sim.mapConfig.worldConfig.mode as GameModes;
    if (mode === "ffa")
      this.leaderBoard.push(this.placeLeaderBoard(this.window.w / 2, this.window.h / 2, UI.color_aux));
    else if (mode === "teams")
    {
      const gap = 0.5 * this.window.w * R_SCORE_SIZE;
      this.leaderBoard.push(this.placeLeaderBoard(this.window.w / 2 - gap, this.window.h / 2, UI.color_team_red));
      this.leaderBoard.push(this.placeLeaderBoard(this.window.w / 2 + gap, this.window.h / 2, UI.color_team_blue));
    }
    this.eventsScene.on("scores", (scores: [string, number, number][], index: number) =>
    {
      const mode = this.sim.mapConfig.worldConfig.mode;
      if (mode === GameModes.teams)
      {
        if (index === 0)
          scores[0][0] = this.dialogue.TEAM_RED;
        if (index === 1)
          scores[0][0] = this.dialogue.TEAM_BLUE;
        this.leaderBoard[index].setScores(scores, true);
      }
      else
        this.leaderBoard[0].setScores(scores, false);
    });
  }

  private placeLeaderBoard(x: number, y: number, color: number): ListBoard
  {
    const pos = {x: x, y: y};
    const leaderBoard = new ListBoard(this, UI.board, this.window.w * R_SCORE_SIZE, pos, 24);
    leaderBoard.setHeader(`${this.dialogue.NAME}\n`, this.dialogue.KILLS, this.dialogue.DEATHS, {x: 0.13, y: 0.26}, color);
    leaderBoard.setAlpha(R_SCORE_ALPHA);
    leaderBoard.setVisible(false);
    this.eventsScene.on("scoresVisible", (isVisible: boolean) => leaderBoard.setVisible(isVisible));
    this.eventsScene.once("endGame", () =>
    {
      leaderBoard.setVisible(true);
      this.eventsScene.off("scoresVisible");
    });
    return leaderBoard;
  }

  private placeControlButtons()
  {
    this.controls = [];
    this.moveDown = Array(2).fill(false);
    const actions = new ButtonCross(this, UI.control, R_CONTROL_SIZE * this.window.w);
    const moves = new ButtonCross(this, UI.control, R_CONTROL_SIZE * this.window.w);

    const callbacks =
    {
      move_left_down: () => move_input(-1, true),
      move_left_up: () => move_input(-1, false),
      move_right_down: () => move_input(1, true),
      move_right_up: () => move_input(1, false),
      jump: () => this.sim.addInput({id: this.player.localId, jump: true}),
      dodge: () => this.sim.addInput({id: this.player.localId, action: EPlayerActionTypes.dodge}),
      attack: () => this.sim.addInput({id: this.player.localId, action: EPlayerActionTypes.melee}),
      second: () => this.sim.addInput({id: this.player.localId, action: EPlayerActionTypes.secondary}),
      special: () => this.sim.addInput({id: this.player.localId, action: EPlayerActionTypes.special})
    }

    const move_input: (dir: number, down: boolean) => void = (dir: number, down: boolean) =>
    {
      const index = (dir + 1) / 2;
      if (down)
      {
        this.sim.addInput({id: this.player.localId, x: dir});
        this.moveDown[index] = true;
      }
      else
      {
        this.moveDown[index] = false;
        let vector = 0;
        if (this.moveDown[0])
          vector += -1;
        if (this.moveDown[1])
          vector += 1;
        this.sim.addInput({id: this.player.localId, x: vector});
      }
    }

    let secondary = "shield";
    if (this.player.config.moves[2].type === EPlayerActionTypes.ranged)
      secondary = "bow";
    actions.setItem(2, "icons_atlas", "jump", callbacks.jump, this);
    actions.setItem(0, "icons_atlas", "sword", callbacks.attack, this);
    actions.setItem(3, "icons_atlas", secondary, callbacks.second, this);
    actions.setItem(1, "icons_atlas", "special", callbacks.special, this);
    moves.setItem(1, "icons_atlas", "right", callbacks.move_right_down, this, callbacks.move_right_up);
    moves.setItem(3, "icons_atlas", "left", callbacks.move_left_down, this, callbacks.move_left_up);
    moves.setItem(0, "icons_atlas", "dash", callbacks.dodge, this);
    const gaps = {x: R_CONTROL_OFFSET_X * this.window.w, y: (1 - R_CONTROL_OFFSET_Y) * this.window.h};
    actions.setPosition({x: gaps.x, y: gaps.y});
    moves.setPosition({x: this.window.w - gaps.x, y: gaps.y});
    this.input.addPointer();
  }

  private callbackMenu()
  {
    this.music.stop();
    if (this.sim && this.sim.isActive())
    {
      this.scene.sleep(EScenes.game);
      this.scene.sleep(EScenes.UI);
      this.scene.wake(EScenes.mainMenu, {gameEnded: false});
      this.scene.bringToTop(EScenes.mainMenu);
    }
    else
    {
      this.scene.stop(EScenes.game);
      this.scene.stop(EScenes.UI);
      this.scene.wake(EScenes.mainMenu, {gameEnded: true});
      this.scene.bringToTop(EScenes.mainMenu);
    }
    if (this.network?.sock)
      this.network.sock.emit("leaveMatch");
  }

  callbackFullscreen()
  {
    const isOn = !this.scale.isFullscreen;
    this.scale.toggleFullscreen();
    let text = this.dialogue.FULLSCREEN + ": ";
    if (isOn)
      text += this.dialogue.ON;
    else
      text += this.dialogue.OFF;
    this.buttonScreen.setText(text);
  }

  callbackOnShutdown()
  {
    this.events.off("wake");
    if (this.network?.sock)
      this.network.sock.off("announce");
    if (this.eventsScene)
    {
      this.eventsScene.off("nickList");
      this.eventsScene.off("scoresVisible");
      this.eventsScene.off("scores");
      this.eventsScene.off("endGame");
    }
    if (this.music)
    {
      this.music.stop();
      this.music.destroy();
      this.music = undefined as any;
    }
    this.leaderBoard?.forEach((board) => board.destroy());
    this.leaderBoard = undefined as any;
    this.buttonMenu?.destroy();
    this.buttonMenu = undefined as any;
    this.buttonMusic?.destroy();
    this.buttonMusic = undefined as any;
    this.buttonScreen?.destroy();
    this.buttonScreen = undefined as any;
    this.chargeCounter?.destroy();
    this.chargeCounter = undefined as any;
    this.messages?.board?.destroy();
    this.messages = undefined as any;
    this.controls?.forEach((buttons) => buttons.destroy());
    if (this.health)
    {
      this.health.bar?.destroy();
      this.health.text?.destroy();
      this.health = undefined as any;
    }
    if (this.energy)
    {
      this.energy.bar?.destroy();
      this.energy.text?.destroy();
      this.energy = undefined as any;
    }
    if (this.timer?.text)
    {
      this.timer.text.destroy();
      this.timer = undefined as any;
    }
    this.children.removeAll(true);
  }

  private callbackMusicToggle()
  {
    const isPlaying = this.music.isPlaying;
    if (isPlaying)
    {
      this.buttonMusic.setText(this.dialogue.MUSIC + ": " + this.dialogue.OFF);
      this.music.pause();
    }
    else
    {
      this.buttonMusic.setText(this.dialogue.MUSIC + ": " + this.dialogue.ON);
      this.music.resume();
    }
  }

  private createAudio()
  {
    this.music = this.sound.add(this.sim.mapConfig.worldConfig.music,
      {volume: 0.15, loop: true, source: {x: 0, y: 0}});
  }

  private announceCallback(msg: AnnounceEvent)
  {
    if (this.messages.board === undefined)
      return ;
    let player = "";
    let author = "";
    const data = "data" in msg ? msg.data as any: undefined;
    if (data && data.id)
      player = this.nickList.get(data.id) as string;
    if (data && data.author)
      author = this.nickList.get(data.author) as string;
    switch(msg.type)
    {
      case "start":
        this.messages.board.push(this.dialogue.MSG_GAME_START);
        this.music.play();
        break;
      case "end":
        this.messages.board.push(this.dialogue.MSG_GAME_END);
        break;
      case "dead":
        this.messages.board.push(player + this.dialogue.MSG_DEAD);
        break ;
      case "frag":
        this.messages.board.push(player + this.dialogue.MSG_FRAG + author);
        break ;
      case "abandoned":
        this.messages.board.push(player + this.dialogue.MSG_ABANDONED);
        this.sim.eventsGame.emit("despawn", data.id);
        break ;
      case "left":
        this.messages.board.push(player + this.dialogue.MSG_LEFT);
        this.sim.eventsGame.emit("despawn", data.id);
        break ;
      case "recon":
        this.messages.board.push(player + this.dialogue.MSG_RECONNECTED);
        this.sim.eventsGame.emit("spawn", data.id);
        break ;
    }
  }

  private addNetworkListeners()
  {
    this.eventsScene.once("nickList", (nickList: Map<number, string>) =>
    {
      this.nickList = nickList;
      this.network.sock.on("announce", (msg: AnnounceEvent) => this.announceCallback(msg));
    });
  }
}
