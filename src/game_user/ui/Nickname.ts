import { GameObject } from "@/game_common/gameobjects/GameObject";

const DF_MAX_NICK_LENGTH = 16


export class NickNameBar
{
  private bar: Phaser.GameObjects.Text;
  private parent: Phaser.GameObjects.Sprite;
  private target: GameObject;
  private gapY: number;

  constructor(sprite: Phaser.GameObjects.Sprite, gapY: number, name: string, target: GameObject)
  {
    this.parent = sprite;
    this.gapY = gapY;
    this.target = target;
    this.bar = sprite.scene.add.text(0, 0, name, {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#ffffff',
      strokeThickness: 0,
      align: 'center'
    }).setOrigin(0.5);
  }

  update()
  {
    const pos = this.target.body.position;
    this.bar.setPosition(pos.x, pos.y - this.gapY); //needs to be limited in length
  }

  setNick(name: string)
  {
    if (name.length > DF_MAX_NICK_LENGTH)
      name = name.substring(0, DF_MAX_NICK_LENGTH);
    this.bar.setText(name);
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
