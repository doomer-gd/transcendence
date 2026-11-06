import { GameObject, IObjectState } from "@/game_common/gameobjects/GameObject";
import { IsZero } from "@/game_common/utility/Maths";
import Matter from "matter-js";

const DF_HP_BAR_WIDTH = 30;
const DF_HP_BAR_HEIGHT = 6;


export class HealthBar
{
  private bar: Phaser.GameObjects.Graphics;
  private target: GameObject;
  private maxHP: number;
  private width: number;
  private height: number;
  private oldFill: number;
  private shift: Matter.Vector;
  state: IObjectState;

  constructor(sprite: Phaser.GameObjects.Sprite, gapY: number, target: GameObject)
  {
    this.target = target;
    this.state = target.state;
    this.maxHP = this.state.hp;
    this.width = this.maxHP / 2;
    this.shift = {x: -this.width / 2, y: -gapY};
    this.height = DF_HP_BAR_HEIGHT;
    this.oldFill = 0;
    this.bar = sprite.scene.add.graphics();
  }

  update()
  {
    const fill = this.state.hp / this.maxHP;
    if (!IsZero(fill - this.oldFill))
    {
      this.bar.clear();
      this.bar.fillStyle(0x000000, 0.5);
      this.bar.fillRect(0, 0, this.width, this.height);
      this.bar.fillStyle(0xff0000, 0.7)
      this.bar.fillRect(1, 1, (this.width - 2) * fill, this.height - 2);
      this.oldFill = fill;
    }
    const pos = Matter.Vector.add(this.target.body.position, this.shift);
    this.bar.setPosition(pos.x, pos.y);
  }

  setVisible(isVisible: boolean)
  {
    this.bar.setVisible(isVisible);
  }

  destroy()
  {
    this.bar.destroy();
  }
}
