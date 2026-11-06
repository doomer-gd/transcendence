import { IAnimationModes } from "@/game_common/animation/Animator";
import { ObjectConstructData } from "@/game_common/utility/Constructors";
import Matter from "matter-js";

interface CounterState
{
  count:    number,
  max:      number,
  width:    number,
  gap:      number,
  offsets:  number[],
  center:   Matter.Vector
}

export class UICounter
{
  private params: CounterState;
  private isVisible:  boolean;
  private items:  Phaser.GameObjects.Image[];
  private anim:   Phaser.GameObjects.Sprite;
  private animModes:  IAnimationModes;
  private scene:  Phaser.Scene;

  constructor(scene: Phaser.Scene, max: number, width: number)
  {
    this.scene = scene;
    const gap = width / max;
    const start = -width / 2 + gap / 2;
    const offsets = Array.from({length: max}, (_, i) => start + gap * i);
    this.isVisible = true;
    this.params = {max: max, count: max, width: width, gap: gap, offsets: offsets, center: {x: 0, y:0}};
  }

  setItemImages(labelItem: string, textureLabel?: string)
  {
    this.items = [];
    for (let i = 0; i < this.params.max; i++)
      this.items.push(this.scene.add.image(0, 0, labelItem, textureLabel));
    const scale = this.params.gap / this.items[0].width;
    this.items.forEach((item) => {
      item.setScale(scale);
      item.setSize(item.width * scale, item.height * scale);
    });
  }

  setAnims(config: ObjectConstructData)
  {
    this.anim = this.scene.add.sprite(0,0,"");
    this.anim.setVisible(false);
    this.animModes = config.animModes;
  }

  setPosition(pos: Matter.Vector)
  {
    this.params.center = pos;
    const gapY = this.scene.anims.get(this.animModes["idle"].label).frames[0].frame.height;
    this.anim.setPosition(pos.x, pos.y - gapY / 4);
    this.items.forEach((item: Phaser.GameObjects.Image, index: number) =>
    {
      item.setPosition(pos.x - this.params.offsets[index], pos.y);
    });
  }

  setVisible(isVisible: boolean)
  {
    if (this.isVisible === isVisible)
      return ;
    this.isVisible = isVisible;
    if (!isVisible)
      this.items.forEach((item) => item.setVisible(false));
    else
      this.updateVisible();
  }

  setCount(count: number)
  {
    if (count < 0 || count > this.params.max || this.params.count === count)
      return ;
    this.params.count = count;
    if (count === 0 && this.anim)
      this.anim.play(this.animModes["idle"].label).setVisible(true);
    else if (count === this.params.max && this.anim)
    {
      this.setVisible(false);
      this.anim.play(this.animModes["dead"]!.label).setVisible(true).once("animationrepeat", () =>
      {
        this.anim.setVisible(false);
        this.anim.stop();
        this.setVisible(true);
      });
    }
    this.updateVisible();
  }

  private updateVisible()
  {
    this.items.forEach((item: Phaser.GameObjects.Image, index: number) =>
    {
      if (index < this.params.count)
        item.setVisible(this.isVisible);
      else
        item.setVisible(false);
    })
  }

  getImageHeight()
  {
    if (this.items.length === 0)
      return 0;
    return this.items[0].height;
  }

  destroy()
  {
    this.items?.forEach((item) => item.destroy());
    this.items = [];
    this.anim?.destroy();
  }

}
