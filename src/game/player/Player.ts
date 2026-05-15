import { PlayerController } from "./PlayerController";

interface IEntityStats
{
  speedBase: number,
  hp: number,
  canMove: boolean
}

interface IPlayerStats extends IEntityStats
{
  speedCurrent: number,
  jumpForce: number,
  canFly: boolean,
}




export class Player extends Phaser.GameObjects.GameObject
{
  anim: Phaser.Animations.Animation;
  controller: PlayerController;
  stats: IPlayerStats;

  constructor (scene: Phaser.Scene)
  {
    super(scene, 'player');
    this.controller = new PlayerController(scene, 'keymap');
    this.setListeners();
    this.setPlaceholderStats();
  }

  //needs to come from a settings file
  setPlaceholderStats ()
  {
    this.stats.canMove = true;
    this.stats.canFly = true;
    this.stats.speedBase = 100;
    this.stats.speedCurrent = 100;
    this.stats.hp = 10;
    this.stats.jumpForce = (this.scene.physics.getConfig().gravity?.y || 500);
  }

  setListeners()
  {
    this.controller.on('move', this.movePlayer);
    this.controller.on('jump', this.jumpPlayer);
  }

  movePlayer (){};
  jumpPlayer(){};


}
