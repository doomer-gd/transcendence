import Matter from "matter-js";
import { UI } from "../scenes/Preloader";

const LB_TEXT_GAP = 8;

export class ListBoard
{
  scene:      Phaser.Scene;
  pos:        Matter.Vector;
  fontSize:   number;
  header:     Phaser.GameObjects.BitmapText[];
  list:       Phaser.GameObjects.BitmapText[];
  back:       Phaser.GameObjects.Image;
  isVisible:  boolean;

  constructor(scene: Phaser.Scene, labelImage: string, width: number, position: Matter.Vector, fontSize: number)
  {
    this.scene = scene;
    this.fontSize = fontSize;
    this.pos = position;
    this.isVisible = true;
    this.back = this.scene.add.image(position.x, position.y, labelImage);
    const scale = width / this.back.width;
    this.back.setScale(scale);
    this.back.setSize(width, this.back.height * scale);
  }

  setHeader(textLeft: string, textCol1: string, textCol2: string, offsetRelative: Matter.Vector, colorHeader: number)
  {
    this.header = [];
    this.list = [];
    let posY = this.pos.y - this.back.height * (0.5 - offsetRelative.y);
    let posX = this.pos.x - this.back.width * (0.5 - offsetRelative.x);
    const header = this.scene.add.bitmapText(posX, posY, UI.font, textLeft + '\n', this.fontSize).setTint(UI.color_aux);
    const headerList = this.scene.add.bitmapText(posX, posY + header.height * 2, UI.font, textLeft + '\n', this.fontSize).setTint(colorHeader);
    posX = this.pos.x + this.back.width * (0.5 - 2.5 * offsetRelative.x);
    const column1 = this.scene.add.bitmapText(0, 0, UI.font, textCol1 + '\n', this.fontSize).setTint(UI.color_aux);
    const column1List = this.scene.add.bitmapText(0, 0, UI.font, textCol1 + '\n', this.fontSize).setTint(colorHeader);
    const column2 = this.scene.add.bitmapText(posX, posY, UI.font, textCol2 + '\n', this.fontSize).setTint(UI.color_aux);
    const column2List = this.scene.add.bitmapText(posX, posY, UI.font, textCol2 + '\n', this.fontSize).setTint(colorHeader);
    const slash = this.scene.add.bitmapText(0, 0, UI.font, '/\n', this.fontSize).setTint(UI.color_aux);
    const slashList = this.scene.add.bitmapText(0, 0, UI.font, '/\n', this.fontSize).setTint(colorHeader);
    posX = this.pos.x + this.back.width * (0.5 - 2.3 * offsetRelative.x);
    column2.setPosition(posX, posY);
    column2List.setPosition(posX, posY + header.height * 2);
    posX -= LB_TEXT_GAP + slash.width;
    slash.setPosition(posX, posY);
    slashList.setPosition(posX, posY + header.height * 2);
    posX -= LB_TEXT_GAP + column1.width;
    column1.setPosition(posX, posY);
    column1List.setPosition(posX, posY + header.height * 2);
    this.header.push(header, column1, slash, column2);
    this.list.push(headerList, column1List, slashList, column2List);
  }

  setScores(scores: Array<[string, number, number]>, header: boolean)
  {
    let lines = Array<string>("", "", "", "");
    let i = 0;
    if (header)
    {
      lines[0] = scores[0][0] + '\n';
      lines[1] += scores[0][1] + '\n';
      lines[2] += '/' + '\n';
      lines[3] += scores[0][2] + '\n';
      i = 1;
    }
    for (; i < scores.length; i++)
    {
      const player = scores[i];
      const index = header ? i : i + 1;
      lines[0] += index.toString()+ '.\t' + player[0] + '\n';
      lines[1] += player[1] + '\n';
      lines[2] += '/' + '\n';
      lines[3] += player[2] + '\n';
    };
    for (let i = 0; i < 4; i++)
      this.list[i].setText(lines[i]);
  }

  setAlpha(alpha: number)
  {
    this.back.setAlpha(alpha);
    for (const item of this.header)
      item.setAlpha(alpha);
    for (const item of this.list)
      item.setAlpha(alpha);
  }

  setVisible(isVisible: boolean)
  {
    if (this.isVisible === isVisible)
      return ;
    this.isVisible = isVisible;
    this.back.setVisible(isVisible);
    for (const item of this.header)
      item.setVisible(isVisible);
    for (const item of this.list)
      item.setVisible(isVisible);
  }

  destroy()
  {
    this.back?.destroy();
    this.header?.forEach((item) => item.destroy());
    this.header = [];
    this.list?.forEach((item) => item.destroy());
    this.list = [];
  }
}
