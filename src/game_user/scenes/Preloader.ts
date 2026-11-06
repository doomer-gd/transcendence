import { Scene } from 'phaser';
import { EScenes } from '@/game_common/main/main';

export enum UI
{
  hud_timer = "hud_timer",
  hud_bars = "hud_bars",
  hud_icons = "hud_icons",
  hud_message = "hud_message",
  control = "touch_control",
  compass = "compass",
  message_board = "message_board",
  portrait = "portrait",
  find_game = "find_game",
  font = "font_thaleahFat",
  board = "hud_board",
  color_main = 0xfad526,
  color_aux = 0x060845,
  color_team_red = 0x850101,
  color_team_blue = 0x002db3
}

export class Preloader extends Scene {


  constructor() {
    super(EScenes.preload);
  }

  init()
  {
    this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);
    const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);
    this.load.on('progress', (progress: number) => {
      bar.width = 4 + (460 * progress);
    });
  }

  preload()
  {
    //  Load the config first, then queue the rest once config is available.
    this.load.json('keymap', 'config/keymap.json');
    this.load.json('config', 'config/config.json');

    this.load.image(UI.board, "assets/ui/hud_scroll.png");
    this.load.image(UI.hud_timer, "assets/ui/hud_timer.png");
    this.load.image(UI.hud_bars, "assets/ui/hud_bars.png");
    this.load.image(UI.hud_icons, "assets/ui/hud_items.png");
    this.load.image(UI.hud_message, "assets/ui/hud_message.png");
    this.load.image(UI.find_game, "assets/ui/button_scroll.png");
    this.load.image(UI.compass, "assets/ui/compass.png");
    this.load.image(UI.message_board, "assets/ui/message_board.png");
    this.load.image(UI.portrait, "assets/ui/portrait_frame.png");
    this.load.image(UI.control, "assets/ui/control_key.png");
    this.load.atlas("icons_atlas", "assets/ui/icons.png",  "assets/ui/icons_atlas.json");
    this.load.bitmapFont(UI.font, "assets/ui/ThaleahFat.png", "assets/ui/ThaleahFat.xml");
  }

  create()
  {
    this.scene.start(EScenes.mainMenu);
  }
}
