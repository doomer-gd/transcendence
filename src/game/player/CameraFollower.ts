

export class CameraController
{
  sprite: Phaser.Physics.Matter.Sprite;
  camera: Phaser.Cameras.Scene2D.Camera;

  constructor (sprite: Phaser.Physics.Matter.Sprite, configLabel: string)
  {
    const config = sprite.scene.cache.json.get(configLabel).camera;
    this.sprite = sprite;
    this.camera = sprite.scene.cameras.main.startFollow(sprite, true, config.lerp.x, config.lerp.y);
    this.camera.setBounds(0, 0, 1024, 768);
    this.camera.setZoom(1.5);
    this.camera.setDeadzone(config.deadzone.width, config.deadzone.height);
  }

}
