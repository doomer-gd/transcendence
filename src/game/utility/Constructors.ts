import { IPlayerStats } from "../player/Player";

export namespace Constructors
{
  export function initTileBoxes(scene: Phaser.Scene, obj: any, label_: string): void
  {
    const x = obj.x + obj.width / 2
    const y = obj.y + obj.height / 2
    scene.matter.add.rectangle(
      x,
      y,
      obj.width,
      obj.height,
      {
        isStatic: true,
        label: label_
      },
    )
  }
  export function constructSpriteFeet(scene: Phaser.Scene, labelSprite: string, x: number, y: number): Phaser.Physics.Matter.Sprite
  {
    let sprite: Phaser.Physics.Matter.Sprite;

    sprite = scene.matter.add.sprite(x, y, labelSprite);
    const body =  sprite.body as MatterJS.BodyType;
    const feet = scene.matter.bodies.rectangle(x, y + sprite.height / 2 + 5, sprite.width, 10, {isSensor: true, label: 'feet'});
    const compound = scene.matter.body.create({ parts: [feet, body], inertia: Infinity, friction: 0, frictionAir: 0, restitution: 0 });
    sprite.setExistingBody(compound);
    sprite.setOrigin(0.5, 0.5);
    return sprite;
  }

  export function getPlaceholderStats (scene: Phaser.Scene): IPlayerStats
  {
    let stats: IPlayerStats = {
      speedBase: 5,
      canMove: true,
      canFly: true,
      airDamping: 0.3,
      InputVelocity: 0,
      speedCurrent: 7,
      hp: 10,
      jumpForce: (scene.matter.getConfig().gravity?.y || 600) * 0.1,
      isOnGround: false,
      groundContacts: 0,
      facing: 1
    }
    return stats;
  }
}
