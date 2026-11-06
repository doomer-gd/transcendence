import { Body, Query } from "matter-js";
import { EPlayerActionTypes, IPlayerParams, IPlayerState, Player } from "../gameobjects/Player";
import { IsZero, SetNonZeroComponents } from "../utility/Maths";
import { PlayerAttacks } from "../gameobjects/PlayerActions";
import { GameObjectFactory } from "./Factory";
import { MovingPlatform } from "../gameobjects/Platform";
import { GameObject, GameObjectType } from "../gameobjects/GameObject";
import { MatterData } from "../utility/Constructors";

interface IActionCosts
{
  attack: number,
  second: number,
  special: number,
  dash: number
}

export class MoverPlayer
{
  player: Player;
  body: Body;
  feet: Body;
  torso: Body;
  contact?: MovingPlatform;
  state: IPlayerState;
  params: IPlayerParams;
  matter: MatterData;
  costs: IActionCosts;
  attack: PlayerAttacks;

  constructor(player: Player, matter: MatterData, factory: GameObjectFactory)
  {
    this.player = player
    this.body = player.body;
    this.state = player.state;
    this.params = player.params;
    this.matter = matter; //should be done separately in the collision manager
    const moves = player.config.moves;
    this.costs = {
      attack: moves[0].cost,
      second: moves[2].cost,
      special: moves[1].cost,
      dash: moves[3].cost
    }
    this.attack = new PlayerAttacks(player, matter, factory);
    this.setBodyParts();
  }

  private setBodyParts()
  {
    const feet = this.body.parts.filter((body: Body) => body.label === 'feet');
    if (feet.length === 1)
      this.feet = feet[0];
    const torso = this.body.parts.filter((body: Body) => body.label === 'torso');
    if (torso.length === 1)
      this.torso = torso[0];
  }

  movePlayer (velocityFactor: number)
  {
    this.state.InputVelocity = velocityFactor;
  }

  jumpPlayer()
  {
    if (this.state.isOnGround && this.state.action === EPlayerActionTypes.move)
      Body.setVelocity(this.body, {x: 0, y: this.body.velocity.y -this.params.jumpForce});
  }

  actionPlayer(type: EPlayerActionTypes): boolean
  {
    if (type === EPlayerActionTypes.secondary)
      type = this.player.config.moves[2].type; // probably can be done more elegantly
    if (this.state.action === type)
      return false;
    switch (type)
    {
      case EPlayerActionTypes.melee:
        if (!this.payActionCost(this.costs.attack))
          return false;
        this.setState(EPlayerActionTypes.melee);
        return true;
      case EPlayerActionTypes.ranged:
      case EPlayerActionTypes.block:
        if (!this.payActionCost(this.costs.second))
          return false;
        this.setState(type);
        return true;
      case EPlayerActionTypes.special:
        if (this.state.charges !== 0 || !this.payActionCost(this.costs.special))
          return false;
        this.state.isInvulnerable = true;
        this.setState(EPlayerActionTypes.special);
        return true;
      case EPlayerActionTypes.dodge:
        if (!this.payActionCost(this.costs.dash))
          return false;
        this.dodge();
        return true;
      case EPlayerActionTypes.dead:
      case EPlayerActionTypes.hit:
        this.state.isInvulnerable = true;
        this.setState(type);
        return true;
      default:
        return false;
    }
  }

  update()
  {
    if (this.state.action === EPlayerActionTypes.dead)
    {
      if (this.state.actionStep > this.state.actionEnd)
        this.state.actionStep = this.state.actionEnd;
      return ;
    }
    if (this.state.actionStep >= this.state.actionEnd)
      this.refresh();
    this.checkIsOnGround();
    this.applyOnGroundEffects();
    switch(this.state.action)
    {
      case EPlayerActionTypes.move:
        this.applyMoveInput(this.state.InputVelocity);
        break ;
      case EPlayerActionTypes.melee:
      case EPlayerActionTypes.special:
      case EPlayerActionTypes.ranged:
        this.attack.strike(this.state.action, this.state.actionStep);
        break ;
    }
  }

  destroy()
  {
    this.attack.destroy();
  }

  private payActionCost(cost: number): boolean
  {
    if (this.state.energy < cost)
      return false;
    this.state.energy -= cost;
    this.state.cooldown = this.params.cooldown;
    return true;
  }

  private applyMoveInput(input: number)
  {
    let velocity = this.body.velocity;
    let targetVelocity = input * this.params.speedBase;
    if (!this.state.isOnGround)
      targetVelocity *= this.params.airDamping;
    if (targetVelocity === 0)
      targetVelocity = velocity.x;
    Body.setVelocity(this.body, {x: targetVelocity, y: velocity.y});
    if (input !== 0)
      this.state.facing = input;
  }

  private applyOnGroundEffects()
  {
    if (!this.state.isOnGround)
      return ;
    if (this.state.lastHit[1] !== this.matter.tick)
      this.state.lastHit = [0, this.matter.tick];
    if (this.state.action === EPlayerActionTypes.dodge) //very ugly, no other way for now
      return ;
    let velocity = this.body.velocity;
    if (velocity.y < 0 && !IsZero(velocity.y))
      return ;
    velocity.x = 0;
    if (this.contact)
      velocity = SetNonZeroComponents(velocity, this.contact.state.velocity);
    Body.setVelocity(this.body, velocity);
  }

  private refresh()
  {
    if (this.state.action === EPlayerActionTypes.special)
      this.state.charges = this.params.charges;
    this.state.action = EPlayerActionTypes.move;
    this.state.actionStep = 0;
    this.state.actionEnd = 1000000;
    this.state.isInvulnerable = false;
    this.player.isSoundPlayed = false;
  }
  private dodge()
  {
    this.setState(EPlayerActionTypes.dodge);
    let targetX = this.state.facing * this.params.speedBase * 2;
    let targetY = this.body.velocity.y;
    Body.setVelocity(this.body, {x: targetX, y: targetY});
    this.state.isInvulnerable = true;
  }

  private checkIsOnGround()
  {
    const feetCollisions = Query.collides(this.feet, this.matter.world.bodies).map((col) => col.bodyA);
    const torsoCollisions = Query.collides(this.torso, this.matter.world.bodies).map((col) => col.bodyA);
    const commonCollisions = feetCollisions.filter((collision) => torsoCollisions.includes(collision));
    this.contact = undefined;
    this.state.isOnGround = false;
    commonCollisions.forEach((otherBody) =>
    {
      if (otherBody.label === "ground")
        this.state.isOnGround = true;
    });
    feetCollisions.forEach((otherBody) =>
    {
      const gameObject = otherBody.parent.plugin.gameObject as GameObject | undefined;
      if (gameObject && gameObject.type === GameObjectType.movingObstacle)
        this.contact = gameObject as MovingPlatform;
    });
    //plug for downward platforms
    if (this.contact !== undefined && this.contact.state.velocity.y > 0)
      this.player.state.isOnGround = true;
  }

  private setState(type: EPlayerActionTypes)
  {
    this.state.action = type;
    this.state.actionStep = 0;
    this.state.actionEnd = this.player.config.durations[type];
    Body.setVelocity(this.body, {x: 0, y: this.body.velocity.y});
  }

}
