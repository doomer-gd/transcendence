import { GameObject } from "../gameobjects/GameObject";

export interface IFrameData
{
  label: string,
  type: keyof IAnimationModes,
  prefix: string,
  numberFrames: number,
  duration: number
}

export interface IAnimationData
{
  label: string,
  numFrames: number,
  duration: number,
  ticksPerFrame: number,
  inverseTPF: number
}

export interface IAnimationModes
{
  idle: IAnimationData,
  walk?: IAnimationData,
  jump?: IAnimationData,
  fall?: IAnimationData,
  attack1?: IAnimationData,
  attack2?: IAnimationData,
  special?: IAnimationData,
  dodge?: IAnimationData,
  hit?: IAnimationData,
  dead?: IAnimationData
}

export interface IAnimationState
{
  type: keyof IAnimationModes,
  now: number,
  duration: number,
  frame: number,
  nextFrameTick: number,
  tpf: number, //ticksPerFrame, fixed parameter
  inverseTPF: number,
  isDirty: boolean
}

export class Animator
{
  protected modes: IAnimationModes;
  protected state: IAnimationState;
  obj: GameObject;

  constructor(obj: GameObject)
  {
    this.obj = obj;
    this.modes = obj.animModes;
    this.state = {type: 'idle', now: 0, duration: 0, frame: 0, nextFrameTick: 1, tpf: 1, inverseTPF: 1, isDirty: false};
    this.playAnim('idle');
  }

  playAnim(type: keyof IAnimationModes, ignoreIfPlaying?: boolean): boolean
  {
    const anim = this.modes[type];
    if (!anim)
      return false;
    if (this.state.type === type && ignoreIfPlaying)
      return false;
    this.state = {
      type: type,
      now: 0,
      frame: 0,
      duration: anim.duration,
      tpf: anim.ticksPerFrame,
      inverseTPF: anim.inverseTPF,
      nextFrameTick: anim.ticksPerFrame,
      isDirty: true
    };
    return true;
  }

  setAnim(type: keyof IAnimationModes, now: number)
  {
    if (this.state.type !== type)
      this.playAnim(type);
    const normalizedNow = now % this.state.duration;
    this.state.now = normalizedNow;
    this.state.frame = Math.trunc(normalizedNow * this.state.inverseTPF);
    this.state.nextFrameTick = (this.state.frame + 1) * this.state.tpf;
  }

  getState(): {label: string, frame: number}
  {
    return {label: this.modes[this.state.type]!.label, frame: this.state.frame};
  }

  getSnap(): {now: number, type: keyof IAnimationModes}
  {
    return {now: this.state.now, type: this.state.type};
  }

  isDirty(): boolean
  {
    return this.state.isDirty;
  }

  getType()
  {
    return this.state.type;
  }

  protected step()
  {
    this.state.now++;
    this.state.isDirty = false;
    if (this.state.now === this.state.duration)
    {
      this.state.now = 0;
      this.state.frame = 0;
      this.state.nextFrameTick = this.state.tpf;
    }
    else if (this.state.now > this.state.nextFrameTick)
    {
      this.state.frame++;
      this.state.nextFrameTick += this.state.tpf;
    }
  }

  update()
  {
    this.step();
  }

  debugGetState(): IAnimationState
  {
    return this.state;
  }

  isLastTick(): boolean
  {
    return this.state.now === (this.state.duration - 1);
  }
}
