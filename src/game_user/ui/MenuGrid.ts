import { UI } from "../scenes/Preloader";


const MG_GAP_X = 0.2;
const MG_GAP_Y = 0.1;
const MG_TITLE_GAP = 5;

export class MenuGrid
{
  scene: Phaser.Scene;
  private backgrounds: Phaser.GameObjects.Image[];
  private overlay?: Phaser.GameObjects.Sprite[];
  private overlayOffsets?: {x: number, y: number}[];
  private titles?: Phaser.GameObjects.BitmapText[];
  private sizeItem: {w: number, h: number};
  private sizeGrid: {x: number, y: number};
  private gaps: {x: number, y: number};
  private midOfGrid: {x: number, y: number};
  private center: {x: number, y: number};
  private isOn: boolean;
  private isInteractive: boolean;
  private callbackOnClick?: (index: number) => void;

  constructor(scene: Phaser.Scene, backLabel: string, widthItem: number, sizeGrid: {x: number, y: number}, center: {x: number, y: number})
  {
    this.scene = scene;
    this.backgrounds = [];
    this.sizeGrid = sizeGrid;
    this.isOn = true;
    this.isInteractive = true;
    const imageSample = scene.add.image(0, 0, backLabel);
    const scale = widthItem / imageSample.width;
    imageSample.setScale(scale);
    imageSample.width *= scale;
    imageSample.height *= scale;
    this.sizeItem = {w: imageSample.width, h: imageSample.height};
    imageSample.destroy();
    this.gaps = {x: this.sizeItem.w * (MG_GAP_X + 1), y: this.sizeItem.h * (MG_GAP_Y + 1)};
    if (this.sizeGrid.x % 2 === 0)
      center.x += (this.gaps.x) / 2;
    if (this.sizeGrid.y % 2 === 0)
      center.y += (this.gaps.y) / 2;
    this.center = center;
    this.midOfGrid = {x: Math.floor(sizeGrid.x / 2), y: Math.floor(sizeGrid.y / 2)};
    this.backgrounds = Array.from({length: sizeGrid.x * sizeGrid.y}, () => this.scene.add.image(-1000, -1000, backLabel).setScale(scale).setInteractive());
    this.placeImages();
  }

  setTitles(titles: string[], size: number)
  {
    if (this.titles)
      this.titles.forEach((text) => text.destroy());
    this.titles = Array.from({length: titles.length}, (_, index) =>
      this.scene.add.bitmapText(-1000, -1000, UI.font, titles[index], size, 1).setTint(UI.color_main));
    this.placeTitles();
  }

  setSprites(animations: Phaser.Animations.Animation[] = [], scale = 1, offsets?: {x: number, y: number}[])
  {
    if (this.overlay)
      this.overlay.forEach((item) => item.destroy());
    this.overlay = animations.map((animation: Phaser.Animations.Animation) => {
      const frame = animation.frames[0];
      return this.scene.add.sprite(-1000, -1000, frame.textureKey, frame.frame.name)
        .setScale(scale)
        .play({key: animation.key, frameRate: 10});
    });
    this.overlayOffsets = offsets;
    this.placeOverlay();
  }

  setImages(imageLabels: string[])
  {
    if (this.overlay)
      this.overlay.forEach((item) => item.destroy());
    this.overlay = Array.from(imageLabels, (image: string, index: number) =>
      this.scene.add.sprite(-1000, -1000, image));
    const scale = this.sizeItem.w / this.overlay[0].width;
    this.overlay.forEach((image) => image.setScale(scale));
    this.overlayOffsets = Array(imageLabels.length).fill({x:0,y:0});
    this.placeOverlay();
  }

  setVisible(visible: boolean)
  {
    if (this.isOn !== visible)
      this.toggle();
  }

  toggle()
  {
    if (this.isOn)
      this.center.y -= 1000;
    else
      this.center.y += 1000;
    this.isOn = (this.isOn !== true);
    this.refresh();
  }

  setInteractive(isInteractive: boolean)
  {
    if (isInteractive === this.isInteractive)
      return ;
    this.isInteractive = isInteractive;
    if (this.isInteractive)
    {
      this.backgrounds.forEach((image, index) => {
        image.setInteractive();
        if (this.callbackOnClick)
          image.on('pointerdown', () => this.callbackOnClick!(index));
      });
    }
    else
    {
      this.backgrounds.forEach((image) => image.removeAllListeners().disableInteractive());
    }
  }

  setCallbackOnClick(callback: (index: number) => void, context?: any)
  {
    if (this.callbackOnClick)
      this.backgrounds.forEach((item, index) => item.off('pointerdown', () => this.callbackOnClick!(index)));
    this.callbackOnClick = callback.bind(context);
    this.backgrounds.forEach((item, index) => item.on('pointerdown', () => this.callbackOnClick!(index)));
  }

  stealItem(index: number, pos: {x: number, y: number})
  {
    if (index < 0 || index >= this.backgrounds.length)
      return ;
    this.setVisible(false);
    this.backgrounds[index].setPosition(pos.x, pos.y);
    if (this.titles)
    {
      const item = this.titles[index];
      item.setPosition(pos.x - item.width / 2, pos.y + this.sizeItem.h / 2 + MG_TITLE_GAP);
    }
    if (this.overlay)
      this.overlay[index].setPosition(pos.x + this.overlayOffsets![index].x, pos.y + this.overlayOffsets![index].y);
  }

  getSize(): {x: number, y: number}
  {
    return {x: this.sizeItem.w, y: this.sizeItem.h};
  }

  private refresh()
  {
    this.placeImages();
    this.placeOverlay();
    this.placeTitles();
  }

  private placeImages()
  {
    this.doForGrid((row: number, col: number) =>
    {
      const index = row * this.sizeGrid.x + col;
      const pos = {x: this.center.x + (col - this.midOfGrid.x) * this.gaps.x,
        y: this.center.y + (row - this.midOfGrid.y) * this.gaps.y};
      this.backgrounds[index].setPosition(pos.x, pos.y);
    });
  }

  private placeOverlay()
  {
    if (!this.overlay || !this.overlayOffsets)
      return ;
    this.doForGrid((row: number, col: number) =>
    {
      const index = row * this.sizeGrid.x + col;
      if (index >= this.overlay!.length || index >= this.overlayOffsets!.length)
        return ;
      const pos = { x: this.center.x + (col - this.midOfGrid.x) * this.gaps.x + this.overlayOffsets![index].x,
                    y: this.center.y + (row - this.midOfGrid.y) * this.gaps.y + this.overlayOffsets![index].y};
      this.overlay![index].setPosition(pos.x, pos.y);
    });
  }

  private placeTitles()
  {
    if (!this.titles)
      return ;
    this.doForGrid((row: number, col: number) =>
    {
      const index = row * this.sizeGrid.x + col;
      if (index >= this.titles!.length)
        return ;
      const pos = { x: this.center.x + (col - this.midOfGrid.x) * this.gaps.x,
                    y: this.center.y + (row - this.midOfGrid.y) * this.gaps.y + MG_TITLE_GAP};
      const item = this.titles![index];
      item.setPosition(pos.x - item.width / 2, pos.y + this.sizeItem.h / 2);
    });
  }

  private doForGrid(callback: (row: number, col: number) => void)
  {
    for (let row = 0; row < this.sizeGrid.y; row++)
    {
      for (let col = 0; col < this.sizeGrid.x; col++)
      {
        callback(row, col);
      }
    }
  }
}
