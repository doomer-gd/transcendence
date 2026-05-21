import * as Phaser from 'phaser';
import { PlayerController } from "./PlayerController";
import { Colliders } from '../utility/Collision';

interface IEntityStats
{
  speedBase: number,
  hp: number,
  canMove: boolean,
  facing: number
}

interface IPlayerStats extends IEntityStats
{
  speedCurrent: number,
  isOnGround: boolean,
  groundContacts: number,
  jumpForce: number,
  canFly: boolean,
  airDamping: number,
  InputVelocity: number
}

export class Player
{
  anim: Phaser.Animations.Animation;
  scene: Phaser.Scene;
  controller: PlayerController;
  sprite: Phaser.Physics.Matter.Sprite;
  body: MatterJS.BodyType;
  stats: IPlayerStats;

  constructor (scene: Phaser.Scene, x: number, y: number)
  {
    this.scene = scene;
    this.controller = new PlayerController(scene, 'keymap');

    this.constructBody(x, y);
    this.setPlaceholderStats();
    this.setListeners();
    this.sprite.x = x;
    this.sprite.y = y;
    console.log("Player constructed");
  }

  //needs to come from a settings file
  setPlaceholderStats ()
  {
    this.stats = {
      speedBase: 5,
      canMove: true,
      canFly: true,
      airDamping: 0.3,
      InputVelocity: 0,
      speedCurrent: 7,
      hp: 10,
      jumpForce: (this.scene.matter.getConfig().gravity?.y || 600) * 0.1,
      isOnGround: false,
      groundContacts: 0,
      facing: 1
    }
  }

  constructBody(x: number, y: number)
  {
    this.sprite = this.scene.matter.add.sprite(x, y, 'player');
    const body =  this.sprite.body as MatterJS.BodyType;
    const feet = this.scene.matter.bodies.rectangle(x, y + this.sprite.height - 1, this.sprite.width, 10, {isSensor: true, label: 'feet'});
    const compound = this.scene.matter.body.create({ parts: [feet, body], inertia: Infinity, friction: 0, frictionAir: 0, restitution: 0 });
    this.sprite.setExistingBody(compound);
    this.sprite.setOrigin(0.5, 0.5);
    this.body = compound;
  }

  setListeners()
  {
    this.controller.on('move', (velocity: number) => this.movePlayer(velocity));
    this.controller.on('jump', this.jumpPlayer, this);
    Colliders.onCollisionCallback('collisionstart', this.scene, this.body.parts[1], this.feetHit.bind(this));
    Colliders.onCollisionCallback('collisionend', this.scene, this.body.parts[1], this.feetEndContact.bind(this));
  }

  movePlayer (velocityFactor: number)
  {
    let newVelocity: number;
    if (velocityFactor != 0)
    {
      this.stats.facing = velocityFactor;
      this.sprite.scaleX = this.stats.facing;
    }
    this.stats.InputVelocity = velocityFactor;
    newVelocity = velocityFactor * this.stats.speedCurrent;
    if (this.stats.isOnGround === false)
      newVelocity *= 0.3;
    if (this.stats.isOnGround)
      this.scene.matter.body.setVelocity(this.body, {x: newVelocity, y: this.body.velocity.y});
    console.log(this.body.velocity.x);
  }

  jumpPlayer()
  {
    if (this.stats.isOnGround)
      this.scene.matter.body.applyForce(this.body, this.body.centerOfMass, {x: 0, y: -this.stats.jumpForce});
  }

  feetHit(body: MatterJS.BodyType, context?: Phaser.GameObjects.GameObject)
  {
    //save who in contact with, as a set
    this.scene.matter.body.setVelocity(this.body, {x: this.stats.InputVelocity * this.stats.speedCurrent, y: this.body.velocity.y});
    if (body.label === 'ground')
    {
      this.stats.groundContacts++;
      this.stats.isOnGround = true;
    }
  }

  feetEndContact(body: MatterJS.BodyType, context?: Phaser.GameObjects.GameObject)
  {
    if (body.label === 'ground')
    {
      this.stats.groundContacts--;
      if (this.stats.groundContacts <= 0)
      {
        this.stats.isOnGround = false;
        this.stats.groundContacts = 0;
      }
    }
  }
}
