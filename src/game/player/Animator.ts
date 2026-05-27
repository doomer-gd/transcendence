
interface FrameData
{
  numberFrames: number,
  frameRate?: number,
  hitBox?: {
    height: number,
    width: number
  },
  repeat?: number
}



export class Animator
{
  scene: Phaser.Scene;
  texture: Phaser.Textures.Texture;

  constructor (scene: Phaser.Scene, label: string)
  {
    this.scene = scene;
    this.texture = this.scene.textures.get(label);
    const frameNames = this.texture.getFrameNames();
    for (const frameName of frameNames)
    {
      const customData = this.texture.get(frameName).customData as FrameData;
      this.scene.anims.create({
        key: frameName,
        frames: this.scene.anims.generateFrameNames(frameName, {start: 0, end: customData.numberFrames}),
        frameRate: (customData.frameRate || 10),
        repeat: (customData.repeat || -1)
      });
    }
  }


    this.anims.create({
      key: 'wizard_idle',
      frames: this.anims.generateFrameNames('wizard_idle', {start: 0, end: 5}),
      frameRate: 6,
      repeat: -1
    })
    this.textures.get('wizard').get()
    this.matter.add.sprite(700, 200, 'wizard_idle').play('wizard_idle');
}
