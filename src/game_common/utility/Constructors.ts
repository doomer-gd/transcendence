import { IPlayerStats } from "../../game_user/player/Player";
import { Bodies, Body, BodyType } from "matter";
import { Hitbox } from "../../game_server/gameplay/Player";

export interface GameConstructData
{
  id: number,
  x: number,
  y: number,
  label: string,
  type: GameObjectType,
  width?: number,
  height?: number,
  radius?: number,
  physicsProps?: any,
  [key:string]: any
}

export const enum GameObjectType
{
  player,
  staticObstacle,
  spawnPoint,
  movingObstacle,
  trigger,
  projectile
}

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

  export function constructBodyWithFeet(hitbox: Hitbox): Body
  {
    const body = Bodies.rectangle(0, 0, hitbox.width, hitbox.height, hitbox.options);
    const size = {x: body.bounds.max.x - body.bounds.min.x, y: body.bounds.max.y - body.bounds.min.y};
    const feet = Bodies.rectangle(0, size.y / 2 + hitbox.feetHeight, size.x - 2, hitbox.feetHeight, {isSensor: true, label: 'feet'});
    const compound = Body.create({ parts: [body, feet], ...hitbox.options });
    return compound;
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

  export function getPlaceholderStats (): IPlayerStats
  {
    let stats: IPlayerStats = {
      speedBase: 5,
      canMove: true,
      canFly: true,
      airDamping: 0.3,
      InputVelocity: 0,
      speedCurrent: 7,
      hp: 10,
      jumpForce: 60,
      isOnGround: false,
      groundContacts: 0,
      facing: 1
    }
    return stats;
  }

  export function getWolrdObjects(worldConfig: any): GameConstructData[]
  {
    const layers = worldConfig.layers;
    const worldObjects = layers.filter((obj: any) => { return obj.type === "objectgroup"});
    return worldObjects;
  }
}
