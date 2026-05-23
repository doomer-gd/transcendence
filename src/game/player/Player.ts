import * as Phaser from 'phaser';
import { PlayerController } from "./PlayerController";
import { Colliders } from '../utility/Collision';
import { Constructors } from '../utility/Constructors';
import { MoverSimple } from './Movers';

export interface IEntityStats
{
  speedBase: number,
  hp: number,
  canMove: boolean,
  facing: number
}

export interface IPlayerStats extends IEntityStats
{
  speedCurrent: number,
  isOnGround: boolean,
  groundContacts: number,
  jumpForce: number,
  canFly: boolean,
  airDamping: number,
  InputVelocity: number
}

export class Player extends Phaser.Events.EventEmitter
{
  anim: Phaser.Animations.Animation;
  scene: Phaser.Scene;
  controller: PlayerController;
  mover: MoverSimple;
  sprite: Phaser.Physics.Matter.Sprite;
  stats: IPlayerStats;

  constructor (scene: Phaser.Scene, x: number, y: number)
  {
    super();
    this.scene = scene;
    this.controller = new PlayerController(scene, this, 'keymap');
    this.sprite = Constructors.constructSpriteFeet(scene, 'player', x, y);
    this.stats = Constructors.getPlaceholderStats(scene);
    this.mover = new MoverSimple(scene, this.sprite.body as MatterJS.BodyType, this.stats, this);
    console.log("Player constructed");
  }

}
