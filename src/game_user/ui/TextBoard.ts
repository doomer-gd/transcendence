

export class TextBoard
{
  private lines: string[];
  readonly maxLines: number;
  readonly maxLength: number;
  scene: Phaser.Scene;
  text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, maxLines: number, maxLength: number, style?: Phaser.Types.GameObjects.Text.TextStyle)
  {
    this.scene = scene;
    this.maxLines = maxLines;
    this.maxLength = maxLength;
    this.lines = new Array<string>();
    this.text = scene.add.text(x, y, "", style);
  }

  push(msg: string)
  {
    if (msg.length > this.maxLength)
      msg = msg.slice(0, this.maxLength - 3) + "...";
    this.lines.push(msg);
    if (this.lines.length >= this.maxLines)
      this.lines = this.lines.slice(1);
    this.text.setText(this.lines);
  }

  clear()
  {
    this.lines.length = 0;
    this.text.setText("");
  }

  destroy()
  {
    this.text?.destroy();
  }
}
