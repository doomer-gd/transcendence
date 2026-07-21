import * as Phaser from 'phaser';
import { PlayerController } from "../../game_user/player/PlayerController";
import { Constructors } from '../../game_common/utility/Constructors';
import { MoverSimple } from '../../game_common/gameplay/Mover';
import { CharacterAnimator } from '../../game_user/player/PlayerAnimator';
import { CameraController } from './CameraFollower';
import { Hitbox } from '../../game_server/gameplay/Player';
import { PlayerNetwork } from './PlayerNetwork';

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
  network: PlayerNetwork;
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
    const hitbox = this.scene.cache.json.get('wizard_data').gameplay.hitbox as Hitbox;
    const body = Constructors.constructPhaserBody(this.scene, hitbox);
    body.position = {x:x, y:y};
    body.velocity = {x:0, y:0};
    this.sprite.setExistingBody(body);
    this.body = body;
    this.stats = Constructors.getPlaceholderStats();
    this.animator = new CharacterAnimator(this.sprite, this, label);
    //this.camera = new CameraController(this.sprite, `${label}_data`);
    this.network = new PlayerNetwork(this);
    console.log("Player constructed");
  }

  update()
  {
    this.animator.updateMovement();
  }
}
