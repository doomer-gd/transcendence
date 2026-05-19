import { PlayerController } from "./PlayerController";
import { Physics } from 'phaser'

interface IEntityStats
{
  speedBase: number,
  hp: number,
  canMove: boolean
}

interface IPlayerStats extends IEntityStats
{
  speedCurrent: number,
  isOnGround: boolean,
  jumpForce: number,
  canFly: boolean
}

export class Player extends Phaser.GameObjects.GameObject
{
  anim: Phaser.Animations.Animation;
  controller: PlayerController;
  sprite: Phaser.Physics.Arcade.Sprite;
  stats: IPlayerStats;

  constructor (scene: Phaser.Scene, x: number, y: number)
  {
    super(scene, 'player');
    this.controller = new PlayerController(scene, 'keymap');
    this.scene.add.sprite(x, y, 'player');
    this.scene.physics.add.existing(this.sprite);
    this.sprite.setCollideWorldBounds(true);
    this.body = this.sprite.body;
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
    this.controller.on('move', (velocity: number) => this.movePlayer(velocity));
    this.controller.on('jump', this.jumpPlayer);
  }

  movePlayer (velocity: number)
  {
    if (this.body)
      this.body.velocity.x = velocity * this.stats.speedCurrent;
  }
  jumpPlayer()
  {
    //should access isOnGround property
    if (this.body && this.body.touching.down)
    {
      this.body.velocity.y = -1 * this.stats.jumpForce;
      this.stats.isOnGround = false;
    }
  }
}
