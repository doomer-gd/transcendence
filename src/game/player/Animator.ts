
interface FrameData
{
  label: string,
  numberFrames: number,
  type: keyof AnimationModes,
  prefix: string,
  frameRate?: number,
  repeat?: number
}

export interface AnimationModes
{
  idle: string,
  walk?: string,
  jump?: string,
  fall?: string,
  attack1?: string,
  attack2?: string,
  hit?: string,
  dead?: string
}


export class Animator
{
  scene: Phaser.Scene;
  anims: Phaser.Animations.AnimationState;
  modes: AnimationModes = {idle: ''};
  modeCurrent: keyof AnimationModes;

  constructor (scene: Phaser.Scene, anims: Phaser.Animations.AnimationState, label: string)
  {
    this.scene = scene;
    this.anims = anims;
    const metaData = this.scene.cache.json.get(`${label}_data`);
    const frames = metaData.frames as FrameData[];
    for (const frame of frames)
    {
      this.scene.anims.create({
        key: frame.label,
        frames: this.scene.anims.generateFrameNames(`${label}_atlas`,{
            prefix: frame.prefix,
            suffix: ".png",
            start: 0,
            end: frame.numberFrames - 1
          }),
        frameRate: (frame.frameRate ?? 10),
        repeat: (frame.repeat ?? -1),
      });
      this.modes[frame.type] = frame.label;
    }
    this.playAnim('idle');
  }

  playAnim(type: keyof AnimationModes, ignoreIfPlaying?: boolean): boolean
  {
    if (this.modes[type])
    {
      this.modeCurrent = type;
      this.anims.play(this.modes[type], ignoreIfPlaying);
      return true;
    }
    return false;
  }
}
