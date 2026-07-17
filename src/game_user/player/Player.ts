import * as Phaser from 'phaser';
import { PlayerController } from "../../game_user/player/PlayerController";
import { Constructors } from '../../game_common/utility/Constructors';
import { MoverSimple } from '../../game_common/gameplay/Mover';
import { CharacterAnimator } from '../../game_user/player/PlayerAnimator';
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
  InputVelocity: number,
  isReady: boolean
}

export class Player extends Phaser.Events.EventEmitter
{
  scene: Phaser.Scene;
  sprite: Phaser.Physics.Matter.Sprite;
  body: MatterJS.BodyType;
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
    const hitbox = this.scene.cache.json.get('wizard_data').physics.hitbox;
    Constructors.constructBodyWithFeet(hitbox);
    this.stats = Constructors.getPlaceholderStats();
    this.animator = new CharacterAnimator(this.sprite, this, label);
    this.camera = new CameraController(this.sprite, `${label}_data`);
    console.log("Player constructed");
  }

  update()
  {
    this.animator.updateMovement();
  }
}
