import Matter, { Bodies, Body, Composite } from "matter-js";
import { CollisionMasks, CollisionTypes, Hitbox, MatterData, ObjectConstructData } from "../utility/Constructors";
import { IFile } from "../utility/SharedConfig";
import { GameObject, GameObjectType, IObjectState } from "./GameObject";
import * as Colliders from "../utility/Collision";
import { Player } from "./Player";
import { GameEvents } from "../gameplay/Simulation";
import { ISoundProfile } from "@/game_user/player/AudioSystem";
import { SeededRandom } from "../utility/Maths";


const enum EPickupType
{
  heal = "heal",
  energy = "energy",
  speed = "speed",
  damage = "damage"
}

export interface IPickupConfig extends ObjectConstructData
{
  title: string,
  atlas: IFile,
  data: IFile,
  hitbox: Hitbox,
  typePickup: EPickupType,
  effect: number,
  audio: ISoundProfile
}

interface IPickupState extends IObjectState
{
  respawnDelay?: number,
  isRespawner?: boolean,
  isActive:     boolean,
  center:       Matter.Vector
}

export class Pickup extends GameObject
{
  hitbox:       Hitbox;
  typePickup:   EPickupType;
  effect:       number;
  state:        IPickupState;
  body:         Body;
  sensor:       Body;
  events:       GameEvents;
  matter:       MatterData;
  gravity:      number;
  config:       IPickupConfig;

  constructor(id: number, config: IPickupConfig, matter: MatterData, events: GameEvents)
  {
    super(id, GameObjectType.pickup, config.label);
    this.matter = matter;
    this.events = events;
    this.config = config;
    this.hitbox = config.hitbox;
    this.typePickup = config.typePickup;
    this.effect = config.effect;
    this.state = {hp: 1, facing: 1, isActive: false, isRespawner: false, center: {x: -1000, y: -1000}, respawnDelay: 0};
    this.addBodies();
    this.addListeners();
  }

  setParams(position: Matter.Vector, isRespawner: boolean = false, delay: number = 0)
  {
    this.state.isRespawner = isRespawner;
    this.state.respawnDelay = delay;
    this.state.center = position;
  }

  spawn()
  {
    this.state.isActive = true;
    Body.setPosition(this.body, this.state.center);
  }

  jump(force: number)
  {
    const velY = -SeededRandom(this.matter.tick, 0xa341316c) * force;
    const velX = SeededRandom(this.matter.tick, 0xc8013ea4) * force;
    Body.setVelocity(this.body, {x: velX, y: velY});
  }

  despawn()
  {
    this.state.isActive = false;
    Body.setPosition(this.body, {x: -1000, y: -1000});
  }

  update()
  {
    if (!this.state.isActive)
      return ;
    Body.applyForce(this.body, this.body.position, {x: 0, y: this.gravity});
    Body.setPosition(this.sensor, this.body.position);
  }

  private addListeners()
  {
    Colliders.onCollisionCallback("collisionStart", this.matter.engine, this.sensor, this.checkCollision.bind(this));
  }

  private checkCollision(collider: Body)
  {
    if (!this.state.isActive)
      return ;
    const body = collider.parent;
    const gameObject = body.plugin.gameObject as GameObject | undefined;
    if (!gameObject || gameObject.type !== GameObjectType.player
      || !(gameObject as Player).state.isReady)
      return ;
    if (this.checkAndApplyEffect(gameObject as Player))
        return this.events.emit("destroy", this.id);
  }

  private checkAndApplyEffect(player: Player): boolean
  {
    switch(this.typePickup)
    {
      case EPickupType.heal:
        return player.heal(this.effect);
      case EPickupType.energy:
        return player.restoreEnergy(this.effect);
      case EPickupType.damage:
        return false; //TBD
      case EPickupType.speed:
        return false;
    }
  }

  destroy()
  {
    Composite.remove(this.matter.world, this.sensor);
    this.sprite = undefined;
  }

  private addBodies()
  {
    this.body = Bodies.rectangle(-1000, -1000, this.hitbox.width, this.hitbox.height,
      {...this.hitbox.options, collisionFilter: {category: CollisionTypes.pickup, mask: CollisionMasks.pickup}, mass: 2000});
    this.gravity = this.matter.gravity * this.body.mass;
    this.sensor = Bodies.rectangle(-1000, -1000, this.hitbox.width, this.hitbox.height,
      {...this.hitbox.options, isSensor: true, collisionFilter: {category: CollisionTypes.attack, mask: CollisionMasks.attack}});
    Composite.add(this.matter.world, this.sensor);
    this.body.plugin = this.body.plugin ?? {};
    this.body.plugin.gameObject = this;
  }

}
