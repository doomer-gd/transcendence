import { IPlayerStats } from "./Player";
import { Colliders } from "../utility/Collision";


export class MoverSimple
{
  stats: IPlayerStats;
  body: MatterJS.BodyType;
  controller: Phaser.Events.EventEmitter;
  scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, body: MatterJS.BodyType, stats: IPlayerStats, controller: Phaser.Events.EventEmitter)
  {
    this.scene = scene;
    this.body = body;
    this.stats = stats;
    this.controller = controller;
    this.setListeners();
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
    this.stats.InputVelocity = velocityFactor;
    newVelocity = velocityFactor * this.stats.speedCurrent;
    if (this.stats.isOnGround === false)
      newVelocity *= 0.3;
    if (this.stats.isOnGround)
      this.scene.matter.body.setVelocity(this.body, {x: newVelocity, y: this.body.velocity.y});
  }

  jumpPlayer()
  {
    if (this.stats.isOnGround)
      this.scene.matter.body.applyForce(this.body, this.body.centerOfMass, {x: 0, y: -this.stats.jumpForce});
  }

  feetHit(body: MatterJS.BodyType, context?: Phaser.GameObjects.GameObject)
  {
    //save who is in contact with, as a set
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
