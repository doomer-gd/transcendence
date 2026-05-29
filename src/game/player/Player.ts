import * as Phaser from 'phaser';
import { PlayerController } from "@/player/PlayerController";
import { Constructors } from '@/utility/Constructors';
import { MoverSimple } from '@/player/Movers';
import { CharacterAnimator } from '@/player/PlayerAnimator';
import { CameraController } from './CameraFollower';

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
  scene: Phaser.Scene;
  sprite: Phaser.Physics.Matter.Sprite;
  controller: PlayerController;
  mover: MoverSimple;
  animator: CharacterAnimator;
  camera: CameraController;
  stats: IPlayerStats;

  constructor (scene: Phaser.Scene, x: number, y: number, label: string)
  {
    super();
    this.scene = scene;
    this.controller = new PlayerController(scene, this, 'keymap');
    this.sprite = scene.matter.add.sprite(x, y, `${label}_atlas`);
    Constructors.constructBodyByData(this.sprite, `${label}_data`);
    Constructors.constructSpriteFeet(this.sprite);
    this.stats = Constructors.getPlaceholderStats(scene);
    this.mover = new MoverSimple(scene, this.sprite.body as MatterJS.BodyType, this.stats, this);
    this.animator = new CharacterAnimator(this.sprite, this, label);
    this.camera = new CameraController(this.sprite, `${label}_data`);
    console.log("Player constructed");
  }

  update()
  {
    this.animator.updateMovement();
  }
}
