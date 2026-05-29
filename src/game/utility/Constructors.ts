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

  export function constructBodyByData(sprite: Phaser.Physics.Matter.Sprite, label: string)
  {
    const metaData = sprite.scene.cache.json.get(label);
    const hitbox = metaData.physics.hitbox;
    if (!hitbox)
      return ;
    const body = sprite.scene.matter.bodies.rectangle(sprite.getCenter().x, sprite.getCenter().y, hitbox.width, hitbox.height);
    sprite.setExistingBody(body);
  }

  export function constructSpriteFeet(sprite: Phaser.Physics.Matter.Sprite): Phaser.Physics.Matter.Sprite
  {
    const body = sprite.body as MatterJS.BodyType;
    const size = {x: body.bounds.max.x - body.bounds.min.x, y: body.bounds.max.y - body.bounds.min.y};
    const feet = sprite.scene.matter.bodies.rectangle(sprite.getCenter().x, sprite.getCenter().y + size.y / 2 + 5, size.x - 4, 10, {isSensor: true, label: 'feet'});
    const compound = sprite.scene.matter.body.create({ parts: [feet, body], inertia: Infinity, friction: 0, frictionAir: 0, restitution: 0 });
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
