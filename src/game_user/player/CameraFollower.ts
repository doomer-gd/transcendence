import { DF_GAME_HEIGHT, DF_GAME_WIDTH } from "@/game_common/main/main";

export class CameraController
{
  sprite: Phaser.GameObjects.Sprite;
  camera: Phaser.Cameras.Scene2D.Camera;

  constructor (sprite: Phaser.GameObjects.Sprite, bounds: Phaser.Geom.Rectangle)
  {
    const config = {size: {height: DF_GAME_HEIGHT,width: DF_GAME_WIDTH}, deadzone: {height: 0, width: 120 }, lerp: 0.7};
    this.sprite = sprite;
    this.camera = sprite.scene.cameras.main.startFollow(sprite, true, config.lerp,config.lerp,0,-50);
    this.camera.setBounds(bounds.x + 1, bounds.y + 1, bounds.width - 1, bounds.height - 1);
    this.camera.setZoom(1.3);
    this.camera.setDeadzone(config.deadzone.width, config.deadzone.height);
  }

  destroy()
  {
    if (this.sprite && this.sprite.scene)
      this.sprite.scene.cameras?.main.stopFollow();
  }
}
