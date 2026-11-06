import { GameScene } from '../../game_user/scenes/Game';
import { MainMenu } from '../../game_user/scenes/MainMenu';
import { Preloader } from '../../game_user/scenes/Preloader';
import { OfflinePreview } from '@/game_user/scenes/OfflinePreview.ts';
import { UIScene } from '@/game_user/scenes/UIOverlay.ts';
import * as Phaser from 'phaser'

export const DF_GAME_WIDTH: number = 1280;
export const DF_GAME_HEIGHT: number = 720;

export const enum EScenes {
  preload = "ScenePreload",
  mainMenu = "SceneMainMenu",
  game = "SceneGame",
  UI = "SceneUserInterface",
  offline = "SceneOffline",
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: DF_GAME_WIDTH,
  height: DF_GAME_HEIGHT,
  pixelArt: true,
  parent: "game-container",
  backgroundColor: "#028af8",
  scene: [Preloader, MainMenu, GameScene, UIScene, OfflinePreview],
  audio: {
        disableWebAudio: true // Forces HTML5 Audio tags for all sounds
  },
  scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  physics: {
    default: "matter",
    matter: {
      gravity: { y: 3, x: 0 },
      autoUpdate: false,
      runner: {
        fps: 60,
      },
      debug: {
        showBody: true,
        showStaticBody: true,
        showVelocity: true,
        showCollisions: true,
      },
    },
  },
};

const StartGame = (parent: string) => {
  return new Phaser.Game({ ...config, parent });
};

export default StartGame;
