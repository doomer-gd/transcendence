import Matter from "matter-js";
import { MenuButton } from "./Button";

export class ButtonCross
{
  scene:      Phaser.Scene;
  buttons:    MenuButton[];
  center:     Matter.Vector;
  positions:  Matter.Vector[];
  width:      number;
  label:      string;

  constructor (scene: Phaser.Scene, backLabel: string, width: number)
  {
    this.scene = scene;
    this.label = backLabel;
    this.width = width;
    this.buttons = [];
    const back = this.scene.textures.getFrame(backLabel, '__BASE');
    const height = (this.width / back.width) * back.height;
    this.center = {x: 0, y: -1000};
    this.positions = new Array<Matter.Vector>(5);
    this.positions[0] = {x: 0, y: 0};
    this.positions[1] = {x: width, y: 0};
    this.positions[2] = {x: 0, y: -height};
    this.positions[3] = {x: -width, y: 0};
    this.positions[4] = {x: 0, y: height};
    this.buttons = new Array<MenuButton>(5);
  }

  setItem(slot: number, texture: string, label: string, callbackDown: () => void, context?: any, callbackUp?: () => void)
  {
    if (slot < 0 || slot > 5)
      return ;
    const button = new MenuButton(this.scene, this.label, this.width);
    this.buttons[slot] = button;
    button.setOverlay(texture, label);
    button.setCallback(callbackDown, context, callbackUp);
  }

  setPosition(pos: Matter.Vector)
  {
    this.center = pos;
    for (let i = 0; i < 5; i++)
    {
      if (this.buttons[i] !== undefined)
      {
        const position = Matter.Vector.add(this.positions[i], this.center);
        this.buttons[i].setPosition(position.x, position.y);
      }
    }
  }

  setVisible(isVisible: boolean)
  {
    this.buttons.forEach((button) =>
    {
      if (button !== undefined)
        button.setVisible(isVisible);
    })
  }

  destroy()
  {
    this.buttons.forEach((button) =>
    {
      if (button !== undefined)
        button.destroy();
    })
  }

}
