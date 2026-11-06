const tempSettings: Phaser.Types.Sound.SoundConfig = {
        source: {
            x: -1000,
            y: -1000,
            refDistance: 400,
            rolloffFactor: 1
        }
    }

export interface ISoundProfile
{
  hit: string,
  attack?: string,
  special?: string,
  secondary?: string,
  dash?: string
}

export class AudioSystem
{
  soundModes:   ISoundProfile;
  sounds:       Map<keyof ISoundProfile, Phaser.Sound.BaseSound>;
  soundCurrent: Phaser.Sound.BaseSound | undefined;
  keyCurrent:   string | undefined;
  startTick:      number;
  scene:        Phaser.Scene;


  constructor(scene: Phaser.Scene, profile: ISoundProfile)
  {
    this.scene = scene;
    this.soundModes = profile;
    this.sounds = new Map<keyof ISoundProfile, Phaser.Sound.BaseSound>();
    this.keyCurrent = undefined;
    this.startTick = 0;
    for (const [key, value] of Object.entries(this.soundModes))
    {
      const sound = this.scene.sound.add(value);
      this.sounds.set(key as keyof ISoundProfile, sound);
    }
  }

  play(soundKey: [keyof ISoundProfile, number])
  {
    if (!this.soundModes[soundKey[0]]
      || (this.keyCurrent === soundKey[0] && this.startTick === soundKey[1]))
      return ;
    if (this.soundCurrent)
      this.soundCurrent.stop();
    this.keyCurrent = soundKey[0];
    this.startTick = soundKey[1];
    this.soundCurrent = this.sounds.get(soundKey[0]);
    this.soundCurrent!.once("complete", () =>
    {
      this.keyCurrent = undefined;
      this.soundCurrent = undefined;
    });
    this.soundCurrent!.play();
  }

  destroy()
  {
    this.sounds.forEach((sound) => sound.destroy());
    this.sounds.clear();
  }

  setPosition(x: number, y: number)
  {
    this.sounds.forEach((sound) =>
    {
      (sound as Phaser.Sound.WebAudioSound).x = x;
      (sound as Phaser.Sound.WebAudioSound).y = y;
    })
  }

}
