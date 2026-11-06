import { GameObject, GameObjectType } from "@/game_common/gameobjects/GameObject";
import { HealthBar } from "../ui/HealthBar";
import Matter, { Body } from "matter-js";
import { Animator } from "@/game_common/animation/Animator";
import { NickNameBar } from "../ui/Nickname";
import { Hitbox, ObjectConstructData } from "@/game_common/utility/Constructors";
import { AudioSystem, ISoundProfile } from "../player/AudioSystem";


export const DF_CHAR_SCALE = 2;
const DEBUG_MODE = false;

export class EntitySprite
{
  id: number;
  sprite: Phaser.GameObjects.Sprite;
  parent: GameObject;
  scene: Phaser.Scene;
  offset: Matter.Vector;
  facing: number;
  body?: Body;
  health?: HealthBar;
  animator?: Animator;
  nick?: NickNameBar;
  audio?: AudioSystem;
  camera: Phaser.Cameras.Scene2D.Camera;
  debugHitbox: Phaser.GameObjects.RenderTexture;
  debugBoxes: Phaser.GameObjects.RenderTexture[];

  constructor(sprite: Phaser.GameObjects.Sprite, parent: GameObject, hitbox: Hitbox)
  {
    this.sprite = sprite;
    this.parent = parent;
    this.id = parent.id;
    this.scene = sprite.scene;
    this.body = parent.body;
    this.animator = parent.animator;
    this.facing = 1;
    this.offset = {x:hitbox.xOffset, y: hitbox.yOffset};
    this.sprite.setScale(hitbox.scale ?? 1);
    this.camera = this.scene.cameras.main;
    if (parent.config && parent.config.audio)
      this.audio = new AudioSystem(this.scene, parent.config.audio);
    if (DEBUG_MODE)
      this.addDebugBodies(parent, hitbox);
  }

  update()
  {
    const pos = this.updatePosition();
    this.health?.update();
    this.nick?.update();
    if (this.audio)
      this.updateSound(pos);
    if (this.animator)
      this.updateAnimator();
  }

  setVisible(isVisible: boolean)
  {
    this.sprite.setVisible(isVisible);
    this.health?.setVisible(isVisible);
    this.nick?.setVisible(isVisible);
  }

  private updatePosition(): Matter.Vector
  {
    let pos = {x: 0, y: 0};
    if (this.body)
    {
      pos = Matter.Vector.add(this.body.position, this.offset);
      this.sprite.setPosition(pos.x, pos.y);
      if (DEBUG_MODE)
        this.debugUpdate();
    }
    if (this.facing !== this.parent.state.facing)
    {
      this.facing = this.parent.state.facing;
      this.sprite.setScale(this.facing * Math.abs(this.sprite.scaleX), this.sprite.scaleY);
    }
    return pos;
  }

  private updateAnimator()
  {
    const state: {label: string, frame: number} = this.parent.animator.getState();
    const frame = this.scene.anims.get(state.label).getFrameAt(state.frame);
    this.sprite.setFrame(frame.frame);
  }

  private updateSound(pos: Matter.Vector)
  {
    let soundKey: [keyof ISoundProfile | undefined, number] = [undefined, 0];
    if (!this.camera.worldView.contains(pos.x, pos.y))
      return ;
    if (this.parent.getSound)
      soundKey = this.parent.getSound();
    if (soundKey[0] !== undefined)
      this.audio!.play(soundKey as [keyof ISoundProfile, number]);
  }

  playSound(soundKey: [keyof ISoundProfile, number])
  {
    if (this.audio?.soundModes[soundKey[0]])
    {
      const pos = {x: this.sprite.x, y: this.sprite.y};
      if (!this.camera.worldView.contains(pos.x, pos.y))
        return ;
      this.audio.play(soundKey);
    }
  }

  destroy()
  {
    this.sprite.destroy();
    this.debugHitbox?.destroy();
    this.debugBoxes?.forEach((box) => box.destroy());
    this.nick?.destroy();
    this.health?.destroy();
    if (this.audio && this.audio.soundCurrent)
      this.audio.soundCurrent.once("complete", () => this.audio?.destroy());
    else
      this.audio?.destroy();
    this.parent.sprite = undefined;
  }

  private debugUpdate()
  {
    if (this.body)
    {
      this.debugHitbox.setPosition(this.body.position.x, this.body.position.y);
      if (this.parent.type === GameObjectType.player)
      {
        let pos = this.parent.controller.attack.bodies[0].position;
        this.debugBoxes[0].setPosition(pos.x, pos.y);
        pos = this.parent.controller.attack.bodies[1].position;
        this.debugBoxes[1].setPosition(pos.x, pos.y);
        pos = this.parent.body.parts[2].position;
        this.debugBoxes[2].setPosition(pos.x, pos.y);
      }
    }
  }


  private addDebugBodies(parent: GameObject, hitbox: Hitbox)
  {
    this.debugHitbox = this.scene.add.renderTexture(0,0, hitbox.width, hitbox.height);
    this.debugHitbox.fill(0xff0000, 0.3); // Fill with red color
    this.debugHitbox.render();
    if (parent.type === GameObjectType.player)
    {
      if (DEBUG_MODE)
      {
        this.debugBoxes = new Array<Phaser.GameObjects.RenderTexture>();
        this.debugBoxes.push(this.scene.add.renderTexture(0,0, parent.config.moves[0].box.width, parent.config.moves[0].box.height));
        this.debugBoxes[0].fill(0x0000ff, 0.3);
        this.debugBoxes[0].render();
        this.debugBoxes.push(this.scene.add.renderTexture(0,0, parent.config.moves[1].box.width, parent.config.moves[1].box.height));
        this.debugBoxes[1].fill(0x00ff00, 0.3);
        this.debugBoxes[1].render();
        const feet = (parent.body as Body).parts[2];
        const feetWidth = feet.bounds.max.x - feet.bounds.min.x;
        const feetHeight = feet.bounds.max.y - feet.bounds.min.y;
        this.debugBoxes.push(this.scene.add.renderTexture(0,0, feetWidth, feetHeight));
        this.debugBoxes[2].fill(0x00ff00, 1);
        this.debugBoxes[2].render();
      }
    }
  }
}
