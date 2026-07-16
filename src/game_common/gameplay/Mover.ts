import { Body } from "matter-js";
import { IPlayerStats } from "../../game_user/player/Player";
import * as Colliders from "../utility/Collision";
import { EventEmitter} from 'eventemitter3'
import { Engine } from "matter-js";

export class MoverSimple
{
  stats: IPlayerStats;
  body: Body;
  engine: Engine;
  events: EventEmitter;

  constructor(body: Body, stats: IPlayerStats, engine: Engine, events: EventEmitter)
  {
    this.body = body;
    this.stats = stats;
    this.engine = engine;
    this.events = events;
    this.setListeners();
  }

  setListeners()
  {
    Colliders.onCollisionCallback('collisionstart', this.engine, this.body.parts[1], this.feetHit.bind(this));
    Colliders.onCollisionCallback('collisionend', this.engine, this.body.parts[1], this.feetEndContact.bind(this));
  }

  movePlayer (velocityFactor: number)
  {
    let newVelocity: number;
    this.stats.InputVelocity = velocityFactor;
    newVelocity = velocityFactor * this.stats.speedCurrent;
    if (this.stats.isOnGround === false)
      newVelocity *= 0.3;
    Body.setVelocity(this.body, {x: newVelocity, y: this.body.velocity.y});
  }

  jumpPlayer()
  {
    if (this.stats.isOnGround)
      Body.applyForce(this.body, this.body.position, {x: 0, y: -this.stats.jumpForce});
  }

  actionPlayer(type: number)
  {
    console.log("Action: ", type);
  }

  feetHit(body: Body)
  {
    //save who is in contact with, as a set
    Body.setVelocity(this.body, {x: this.stats.InputVelocity * this.stats.speedCurrent, y: this.body.velocity.y});
    if (body.label === 'ground')
    {
      this.stats.groundContacts++;
      this.stats.isOnGround = true;
    }
  }

  feetEndContact(body: Body)
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
