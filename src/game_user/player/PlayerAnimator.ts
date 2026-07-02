import { AnimationModes, Animator } from "./Animator";
import * as Phaser from 'phaser';

const PlayerMovements =  new Set<keyof AnimationModes>(['idle', 'walk', 'jump', 'fall']);

export class CharacterAnimator extends Animator
{
  sprite: Phaser.Physics.Matter.Sprite;
  body: MatterJS.BodyType;
  events: Phaser.Events.EventEmitter;

  constructor (sprite: Phaser.Physics.Matter.Sprite, events: Phaser.Events.EventEmitter, label: string)
  {
    super(sprite.scene, sprite.anims, label);
    this.sprite = sprite;
    this.body = sprite.body as MatterJS.BodyType;
    this.events = events;
    this.registerListen();
  }

  registerListen()
  {
    this.events.on('attack', (mode: number) => this.playAttack(mode), this);
  }

  //runs every frame to set move animation
  updateMovement(): void
  {
    if (PlayerMovements.has(this.modeCurrent))
    {
      if (!(Phaser.Math.Fuzzy.Equal(this.body.velocity.y, 0, 0.0001)))
      {
        if (this.body.velocity.y > 0)
          this.playAnim('jump', true);
        else
          this.playAnim('fall', true);
      }
      else if (!(Phaser.Math.Fuzzy.Equal(this.body.velocity.x, 0, 0.0001)))
      {
        if (this.sprite.flipX !== (this.body.velocity.x < 0))
        {
          this.sprite.setFlipX(!this.sprite.flipX);
          this.playAnim('walk', false);
        }
        else
          this.playAnim('walk', true);
      }
      else
        this.playAnim('idle', true);
    }
  }

  playAttack(mode: number): boolean
  {
    var isRecognized: boolean = true;
    var key: keyof AnimationModes = 'attack1';

    switch (mode){
      case 1:
        key = 'attack1'
        break;
      case 2:
        key = 'attack2';
        break;
      default:
        isRecognized = false;
    }
    if (isRecognized && this.modeCurrent != key)
    {
      this.playAnim(key);
      this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE,() => this.onAttackFinished(mode), this);
      return true;
    }
    return false;
  }

  private onAttackFinished(mode: number)
  {
    this.events.emit('attack_complete', mode);
    this.modeCurrent = "idle";
    this.updateMovement();
  }
}
