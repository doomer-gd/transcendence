import { CollisionMasks, CollisionTypes, MatterData } from "../utility/Constructors";
import Matter, { Bodies, Body, Composite, Query } from "matter-js";
import { EPlayerActionTypes, Player } from "./Player";
import { GameObjectFactory } from "../gameplay/Factory";
import { GameObject, GameObjectType } from "./GameObject";
import { Projectile } from "./Projectile";

export type AttackBox = {x: number, y: number, height: number, width: number};

export interface IAttackProfile
{
  type: EPlayerActionTypes,
  duration: number,
  start: number,
  end: number,
  damage: number,
  cost: number
  box?: AttackBox,
  label?: string
}

export interface IAttackState
{
  now: number,
  type: EPlayerActionTypes,
  isBoxHere: boolean,
  shift: Matter.Vector
}


export class PlayerAttacks
{
  player: Player;
  attacks: IAttackProfile[];
  bodies: Body[];
  boxCurrent: Body;
  factory: GameObjectFactory;
  state: IAttackState;
  matter: MatterData;

  constructor(player: Player, matter: MatterData, factory: GameObjectFactory)
  {
    this.player = player;
    this.matter = matter;
    this.factory = factory;
    this.attacks = player.config.moves;
    this.bodies = new Array<Body>();
    this.bodies.push(Bodies.rectangle(-1000, -1000, this.attacks[0].box!.width, this.attacks[0].box!.height, {isSensor: true, isStatic: true, collisionFilter: {category: CollisionTypes.attack, mask: CollisionMasks.attack}}));
    this.bodies.push(Bodies.rectangle(-1000, -1000, this.attacks[1].box!.width, this.attacks[1].box!.height, {isSensor: true, isStatic: true, collisionFilter: {category: CollisionTypes.attack, mask: CollisionMasks.attack}}));
    Composite.add(matter.world, this.bodies);
    this.state = {now: 0, type: EPlayerActionTypes.melee, isBoxHere:false, shift: {x: 0, y: 0}};
    this.boxCurrent = this.bodies[0];
  }

  strike(type: EPlayerActionTypes, step: number)
  {
    switch(type)
    {
      case EPlayerActionTypes.melee:
        if (!this.checkStrike(0, step))
          return ;
        this.setBox(0);
        this.hit(0);
        break ;
      case EPlayerActionTypes.special:
        if (!this.checkStrike(1, step))
          return ;
        this.setBox(1);
        this.hit(1);
        break ;
      case EPlayerActionTypes.ranged:
        if (step !== this.attacks[2].end)
          return ;
        this.shoot();
        break ;
    }
  }

  destroy()
  {
    Composite.remove(this.matter.world, this.bodies);
  }

  private refresh()
  {
    this.player.state.playersHit.length = 0;
    Body.setPosition(this.boxCurrent, {x: -1000, y: -1000});
    this.state.isBoxHere = false;
  }

  private checkStrike(index: number, step: number): boolean
  {
    if (step < this.attacks[index].start)
      return false;
    if (step >= this.attacks[index].end)
    {
      if (this.state.isBoxHere)
        this.refresh();
      return false;
    }
    return true;
  }

  private setBox(index: number)
  {
    if (this.boxCurrent !== this.bodies[index] || !this.state.isBoxHere)
    {
      Body.setPosition(this.boxCurrent, {x:-1000, y:-1000});
      this.boxCurrent = this.bodies[index];
      this.state.shift = {x: this.attacks[index].box!.x * this.player.state.facing, y: this.attacks[index].box!.y};
      this.state.isBoxHere = true;
    }
    Body.setPosition(this.boxCurrent, Matter.Vector.add(this.player.body.position, this.state.shift));
  }

  private hit(index: number)
  {
    const collisions = Query.collides(this.boxCurrent, this.matter.world.bodies);
    collisions.forEach((collision: Matter.Collision) =>
    {
      const otherBody = collision.bodyA === this.boxCurrent ? collision.bodyB : collision.bodyA;
      if (otherBody.parent === this.player.body)
        return ;
      const otherObject = otherBody.parent.plugin.gameObject as GameObject | undefined;
      if (!otherObject)
        return ;
      if (otherObject.type === GameObjectType.player && !this.player.state.playersHit.includes(otherObject.id) && this.player.team !== otherObject.team)
      {
        const result = (otherObject as Player).beHit(this.attacks[index].damage, this.player.body.position, this.player.id);
        if (result)
          this.player.gainCharge(1);
        this.player.state.playersHit.push(otherObject.id);
      }
    })
  }

  private shoot()
  {
    const profile = this.attacks[2];
    if (profile.type !== EPlayerActionTypes.ranged)
      return ;
    const bullet = this.factory.create(GameObjectType.projectile, profile.label!) as Projectile;
    if (!bullet)
      return ;
    bullet.setOwner(this.player);
    const shift = {x: this.attacks[2].box!.x * this.player.state.facing, y: this.attacks[2].box!.y};
    const start = Matter.Vector.add(this.player.body.position, shift);
    bullet.fly(start, this.player.state.facing);
  }

}
