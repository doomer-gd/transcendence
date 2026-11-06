import Matter, { Body, Composite } from "matter-js";
import { Constructors, Hitbox, MatterData } from "../utility/Constructors";
import { MoverPlayer } from "../gameplay/MoverSimple";
import { PlayerInput } from "../network/Interfaces";
import { GameObject, GameObjectType, IObjectState } from "./GameObject";
import { IFile } from "../utility/SharedConfig";
import { IAnimationModes, IFrameData } from "../animation/Animator";
import { AnimatorPlayer } from "../animation/AnimatorPlayer";
import { Normalize } from "../utility/Maths";
import { GameEvents } from "../gameplay/Simulation";
import { IAttackProfile } from "./PlayerActions";
import { GameObjectFactory } from "../gameplay/Factory";
import { ISoundProfile } from "@/game_user/player/AudioSystem";

export interface PlayerConfig
{
  label: string,
  title: {lang: string, title: string}[],
  data: IFile,
  atlas: IFile,
  image: IFile,
  frames: IFrameData[],
  animModes: IAnimationModes,
  hitbox: Hitbox,
  moves: IAttackProfile[],
  durations: Array<number>,
  params: IPlayerParams,
  audio: ISoundProfile
}

export interface IPlayerParams
{
  speedBase: number,
  jumpForce: number,
  maxHP: number,
  maxEnergy: number,
  airDamping: number,
  meleeDamage: number,
  poise: number, // between 0 and 1, lower is tougher
  gravity: number,
  regen: number,
  cooldown: number,
  charges: number,
  mass: number
}

export interface IPlayerState extends IObjectState
{
  groundContacts: number,
  InputVelocity: number,
  actionStep: number,
  actionEnd: number,
  energy: number,
  cooldown: number,
  charges: number,
  lastHit: [number, number],
  playersHit: number[],
  action: EPlayerActionTypes,
  isOnGround: boolean,
  isReady: boolean,
  isInvulnerable: boolean
}

export enum EPlayerActionTypes
{
  melee,
  special,
  ranged,
  block,
  dodge,
  secondary, //either ranged or block
  move,
  hit,
  dead
}

export const G_ActionAnimMap = new Map<EPlayerActionTypes, keyof IAnimationModes>(
  [
    [EPlayerActionTypes.block, "attack2"],
    [EPlayerActionTypes.dodge, "dodge"],
    [EPlayerActionTypes.melee, "attack1"],
    [EPlayerActionTypes.ranged, "attack2"],
    [EPlayerActionTypes.special, "special"],
    [EPlayerActionTypes.hit, "hit"],
    [EPlayerActionTypes.dead, "dead"]
  ]);

export const G_AnimActionMap = new Map<keyof IAnimationModes, EPlayerActionTypes>(
  Array.from(G_ActionAnimMap.entries()).map(([action, anim]) => [anim, action])
);

export class Player extends GameObject
{
  team: number;
  events: GameEvents;
  state: IPlayerState;
  params: IPlayerParams;
  body: Body;
  config: PlayerConfig;
  matter: MatterData;
  controller: MoverPlayer;
  animator: AnimatorPlayer;
  animModes: IAnimationModes;
  gravity: Matter.Vector;

  constructor(id:number, matter: MatterData, config: PlayerConfig,
    events: GameEvents, factory: GameObjectFactory)
  {
    super(id, GameObjectType.player, config.label);
    this.params = config.params;
    this.config = config;
    this.matter = matter;
    this.events = events;
    this.team = -id;
    this.soundState = {isPlayed: false, action: EPlayerActionTypes.move};
    this.state = {groundContacts: 0, InputVelocity: 0, actionStep: 0, actionEnd: 1,
      isOnGround: false, action: EPlayerActionTypes.move, isReady: false,
      isInvulnerable: false, facing: 1, hp: this.params.maxHP,
      energy: this.params.maxEnergy, cooldown: 0, charges: this.params.charges,
      lastHit: [0, 0], playersHit: []};
    this.body = Constructors.constructBodyWithFeet(config.hitbox, config.params.mass);
    this.gravity = {x: 0, y: matter.gravity * this.body.mass};
    this.body.plugin.gameObject = this;
    this.animModes = config.animModes;
    this.controller = new MoverPlayer(this, this.matter, factory);
    this.animator = new AnimatorPlayer(this, this.body, this.state);
  }

  applyInput(input: PlayerInput)
  {
    if (input.x !== undefined)
      this.controller.movePlayer(input.x);
    if (this.state.action === EPlayerActionTypes.dead
      || !this.isInterruptible(this.state.action))
        return ;
    if (input.jump)
      this.controller.jumpPlayer();
    if (input.action !== undefined)
      this.controller.actionPlayer(input.action);
  }

  update()
  {
    if (!this.state.isReady)
      return ;
    this.state.actionStep++;
    this.perTickStatusUpdate();
    this.controller.update();
    this.animator.update();
    Body.applyForce(this.body, this.body.position, this.gravity);
    this.checkDead();
  }

  beHit(damage: number, hitOrigin: Matter.Vector, id: number): boolean
  {
    if (this.state.isInvulnerable)
      return false;
    const dir = Normalize(this.body.position.x - hitOrigin.x);
    if (this.state.action === EPlayerActionTypes.block && this.state.facing === -dir)
    {
      this.gainCharge(1);
      return false;
    }
    this.state.hp -= damage;
    this.state.lastHit = [id, this.matter.tick];
    if (this.state.hp < 1)
    {
      this.die(id);
      return true;
    }
    this.controller.actionPlayer(EPlayerActionTypes.hit);
    this.bePushed(damage, dir);
    return true;
  }

  die(id: number)
  {
    if (this.state.action === EPlayerActionTypes.dead || !this.state.isReady)
      return ;
    this.state.hp = 0;
    this.controller.actionPlayer(EPlayerActionTypes.dead);
    Body.setVelocity(this.body, {x: 0, y: this.body.velocity.y});
    this.events.emit("frag", this.id, id);
  }

  restoreEnergy(amount: number): boolean
  {
    if (this.state.energy === this.params.maxEnergy)
      return false;
    this.state.energy += amount;
    if (this.state.energy > this.params.maxEnergy)
      this.state.energy = this.params.maxEnergy;
    return true;
  }

  heal(amount: number): boolean
  {
    if (this.state.hp === this.params.maxHP)
      return false;
    this.state.hp += amount;
    if (this.state.hp > this.params.maxHP)
      this.state.hp = this.params.maxHP;
    return true;
  }

  gainCharge(charge: number)
  {
    this.state.charges -= charge;
    if (this.state.charges < 0)
      this.state.charges = 0;
  }

  getSound(): [keyof ISoundProfile | undefined, number]
  {
    if (this.state.actionStep !== 1)
      return [undefined, 0];
    switch (this.state.action)
    {
      case EPlayerActionTypes.hit:
      case EPlayerActionTypes.dead:
        return ["hit", this.matter.tick];
      case EPlayerActionTypes.melee:
        return ["attack", this.matter.tick];
      case EPlayerActionTypes.dodge:
        return ["dash", this.matter.tick];
      case EPlayerActionTypes.ranged:
        return ["secondary", this.matter.tick];
      case EPlayerActionTypes.special:
        return ["special", this.matter.tick];
      default:
        return [undefined, 0];
    }
  }

  reset()
  {
    this.state.action = EPlayerActionTypes.move;
    this.state.InputVelocity = 0;
    this.state.isInvulnerable = false;
    this.state.isReady = true;
    this.state.hp = this.params.maxHP;
    this.state.energy = this.params.maxEnergy;
    this.state.charges = this.params.charges;
  }

  destroy()
  {
    Composite.remove(this.matter.world, this.body);
    this.controller.destroy();
    this.sprite = undefined;
  }

  private perTickStatusUpdate()
  {
    if (this.state.cooldown > 0)
      this.state.cooldown--;
    if (this.state.cooldown < 1)
    {
      this.restoreEnergy(this.params.regen);
    }
  }
  private isInterruptible(type: EPlayerActionTypes): boolean
  {
    switch (type)
    {
      case EPlayerActionTypes.move:
      case EPlayerActionTypes.block:
      case EPlayerActionTypes.melee:
        return true;
      default:
        return false;
    }
  }

  private checkDead()
  {
    if (this.state.action === EPlayerActionTypes.dead && this.isLastStep() && this.state.isReady)
    {
      this.state.action = EPlayerActionTypes.move;
      this.state.isReady = false;
      this.events.emit("dead", this.id);
    }
  }

  private isLastStep()
  {
    return this.state.actionStep >= this.state.actionEnd;
  }

  private bePushed(force: number, direction: number)
  {
    const forceCorrected = 5.5 * Math.sqrt(force);
    const push = forceCorrected * this.params.poise;
    const velocity = {
      x: direction * push,
      y: -push
    }
    Body.setVelocity(this.body, velocity);
    this.state.facing = -direction;
    this.state.isOnGround = false;
  }
}
