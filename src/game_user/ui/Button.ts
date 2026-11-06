const FONT_SIZE = 0.2;
const B_ICON_SHARE = 0.6;

export class MenuButton
{
  scene: Phaser.Scene;
  image: Phaser.GameObjects.Image;
  text?: Phaser.GameObjects.BitmapText;
  overlay?: Phaser.GameObjects.Image;
  center: {x: number, y: number};
  private isVisible: boolean;
  private boundCallbackDown?: () => void;
  private boundCallbackUp?: () => void;

  constructor (scene: Phaser.Scene, label: string, width: number, font?: string, fontColor?: number)
  {
    this.scene = scene;
    this.image = scene.add.image(0, -1000, label).setInteractive();
    const scale = width / this.image.width;
    this.image.setScale(width / this.image.width);
    this.image.width *= scale;
    this.image.height *= scale;
    this.center = {x: 0, y: -1000};
    if (font !== undefined && fontColor !== undefined)
    {
      this.text = scene.add.bitmapText(0, -1000, font, "AAAA", this.image.height * FONT_SIZE);
      this.text.setTint(fontColor);
    }
    this.isVisible = true;
  }

  setPosition(x: number, y: number)
  {
    this.center = {x: x, y: y};
    this.image.setPosition(x, y);
    this.text?.setPosition(x - this.text.width / 2, y - this.text.height / 2);
    this.overlay?.setPosition(x, y);
  }

  setText(text: string)
  {
    const normalized = text.normalize('NFC');
    this.text?.setText(normalized);
    this.text?.setPosition(this.center.x - this.text.width / 2, this.text.y);
  }

  setVisible(isVisible: boolean)
  {
    if (this.isVisible === isVisible)
      return ;
    this.isVisible = isVisible;
    if (isVisible)
      this.center.y -= 1000;
    else
      this.center.y += 1000;
    this.setPosition(this.center.x, this.center.y);
  }

  setOverlay(textureLabel: string, frameLabel?: string)
  {
    this.overlay = this.scene.add.image(0, -1000, textureLabel, frameLabel);
    const scale =  B_ICON_SHARE * this.image.width / this.overlay.width;
    this.overlay.setScale(scale);
    this.overlay.setSize(this.overlay.width * scale, this.overlay.height * scale);
  }

  setCallback(downCallback: () => void, context?: any, upCallback?: () => void)
  {
    this.image.off("pointerdown");
    this.image.off("pointerup");
    this.boundCallbackDown = downCallback.bind(context);
    this.image.on("pointerdown", this.boundCallbackDown);
    if (upCallback)
    {
      this.boundCallbackUp = upCallback.bind(context);
      this.image.on("pointerup", this.boundCallbackUp);
    }
  }

  destroy()
  {
    this.image.off("pointerdown");
    this.image.off("pointerup");
    this.image?.destroy();
    this.text?.destroy();
    this.overlay?.destroy();
  }
}
