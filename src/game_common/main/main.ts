import { GameOver } from '../../game_user/scenes/GameOver.ts';
import { GameScene } from '../../game_user/scenes/Game';
import { MainMenu } from '../../game_user/scenes/MainMenu';
import { AUTO, Game } from 'phaser';
import { Preloader } from '../../game_user/scenes/Preloader';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig

const GAME_WIDTH:number = 1024;
const GAME_HEIGHT:number = 768;

const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#028af8',
  scene: [
    Preloader,
    MainMenu,
    GameScene,
    GameOver
  ],
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 3, x: 0 },
      runner: {
        fps:60
      },
      setBounds: {
        x: 0,
        y: 0,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
      },
      debug: {showBody: true,
        showStaticBody: true,
        showVelocity: true,
        showCollisions: true
      }
    }
  }
};

const StartGame = (parent: string) => {

  return new Game({ ...config, parent });

}

export default StartGame;
