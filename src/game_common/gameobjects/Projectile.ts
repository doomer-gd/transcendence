import Matter, { Bodies, Body, Query } from "matter-js";
import { CollisionMasks, CollisionTypes, Hitbox, MatterData, ObjectConstructData } from "../utility/Constructors";
import { GameObject, GameObjectType, IObjectState } from "./GameObject";
import { IFile } from "../utility/SharedConfig";
import { Animator, IAnimationModes, IFrameData } from "../animation/Animator";
import { Player } from "./Player";
import { GameEvents } from "../gameplay/Simulation";
import { ISoundProfile } from "@/game_user/player/AudioSystem";


export interface IProjectileData extends ObjectConstructData
{
  data: IFile,
  atlas: IFile,
  image: IFile,
  frames: IFrameData[],
  animModes: IAnimationModes,
  hitbox: Hitbox,
  speed: number
}

export interface IProjectileParams
{
  owner?: number,
  damage: number,
  team: number
}

export interface IProjectileState extends IObjectState
{
  actionTick: number,
  hit: boolean,
  soundPlayed: boolean
}

export class Projectile extends GameObject
{
  private matter: MatterData;
  private animator: Animator;
  private animModes: IAnimationModes;
  private events: GameEvents;
  private body: Body;
  private speed: number;
  private duration: number;
  private config: IProjectileData;
  state:  IProjectileState;
  params: IProjectileParams;

  constructor(id: number, config: IProjectileData, matter: MatterData, events: GameEvents)
  {
    super(id, GameObjectType.projectile, config.label);
    this.matter = matter;
    this.events = events;
    this.config = config;
    this.animModes = config.animModes;
    this.speed = config.speed;
    this.params = {damage: 0, team: -1, owner: 0};
    this.state = {soundPlayed: false, actionTick: 0, hit: false, facing: 1, hp: 1};
    this.duration = config.frames.find((frame: IFrameData) => frame.type === "dead")?.duration ?? 1;
    this.animator = new Animator(this);
    this.body = Bodies.rectangle(-1000, -1000, config.hitbox.width, config.hitbox.height, {isSensor: true, ...config.hitbox.options, frictionAir:0, collisionFilter:{category: CollisionTypes.projectile, mask: CollisionMasks.projectile}});
    this.body.plugin = this.body.plugin ?? {};
    this.body.plugin.gameObject = this;
  }

  fly(start: Matter.Vector, dir: number)
  {
    this.speed *= dir;
    this.state.facing = dir;
    this.animator.playAnim('idle');
    Body.setPosition(this.body, start);
    Body.setVelocity(this.body, {x: this.speed, y: 0});
  }

  update()
  {
    if (!this.state.hit)
      this.checkHit();
    if (this.state.hit)
    {
      if (this.state.actionTick === this.duration)
        this.events.emit("destroy", this.id);
      else
        this.animator.setAnim("dead", this.state.actionTick);
      this.state.actionTick++;
      return ;
    }
    this.animator.update();
  }

  setOwner(player: Player)
  {
    this.params.owner = player.id;
    this.params.damage = player.config.moves[2].damage;
    this.params.team = player.team;
  }

  getSound(): [keyof ISoundProfile | undefined, number]
  {
    if (!this.state.hit || this.state.actionTick !== 1)
      return [undefined, 0];
    this.state.soundPlayed = true;
    return ["attack", this.matter.tick];
  }

  private checkHit()
  {
    const collisions = Query.collides(this.body, this.matter.world.bodies);
    collisions.forEach((collision: Matter.Collision) =>
    {
      if (this.state.hit)
        return ;
      const otherBody = collision.bodyA === this.body ? collision.bodyB : collision.bodyA;
      if (otherBody.parent === this.body)
        return ;
      if (otherBody.label === "ground")
        this.explode();
      const otherObject = otherBody.parent.plugin.gameObject as Player | undefined;
      if (!otherObject ||
        otherObject.type !== GameObjectType.player ||
        otherObject.state.isInvulnerable ||
        otherObject.team === this.params.team)
        return ;
      const ownerId = this.params.owner ?? 0
      const result = otherObject.beHit(this.params.damage, this.body.position, ownerId);
      if (result && ownerId !== 0)
        (this.matter.dynamics.get(ownerId) as Player).gainCharge(1);
      this.explode();
    })
  }

  private explode()
  {
    this.animator.playAnim("dead");
    this.state.hit = true;
    Body.setVelocity(this.body, {x: 0, y: 0});
  }

  destroy()
  {
    this.sprite = undefined;
  }
}
