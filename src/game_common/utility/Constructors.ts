import { IPlayerStats } from "../../game_user/player/Player";
import { Bodies, Body } from "matter-js";

export interface ObjectConstructData
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

export interface Hitbox
{
  height: number,
  width: number,
  xOffset: number,
  yOffset: number,
  feetHeight: number,
  options?: any
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

export enum CollisionTypes
{
  player = 0x0001,
  solid = 0x0002
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
    const collisionOpts = hitbox.options?.collisionFilter ?? {category: CollisionTypes.player, mask: CollisionTypes.solid};
    const body = Bodies.rectangle(0, 0, hitbox.width, hitbox.height, hitbox.options);
    const size = {x: body.bounds.max.x - body.bounds.min.x, y: body.bounds.max.y - body.bounds.min.y};
    const feet = Bodies.rectangle(0, size.y / 2 + hitbox.feetHeight / 2, size.x - 2, hitbox.feetHeight, {isSensor: true, label: 'feet'});
    body.collisionFilter = collisionOpts;
    feet.collisionFilter = collisionOpts;
    const compound = Body.create({ parts: [body, feet], ...hitbox.options });
    return compound;
  }

  export function constructPhaserBody(scene: Phaser.Scene, hitbox: Hitbox): MatterJS.BodyType
  {
    const body = scene.matter.bodies.rectangle(0, 0, hitbox.width, hitbox.height, hitbox.options)
    const size = {x: body.bounds.max.x - body.bounds.min.x, y: body.bounds.max.y - body.bounds.min.y};
    const feet = scene.matter.bodies.rectangle(0, size.y / 2 + hitbox.feetHeight / 2, size.x - 2, hitbox.feetHeight, {isSensor: true, label: 'feet'});
    const compound = scene.matter.body.create({ parts: [body, feet], ...hitbox.options});
    return compound;
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
      jumpForce: 0.3,
      isOnGround: false,
      groundContacts: 0,
      facing: 1,
      isReady: false
    }
    return stats;
  }

  export function getWolrdObjects(worldConfig: any): ObjectConstructData[]
  {
    const layers = worldConfig.layers;
    const worldObjects = layers.filter((obj: any) => { return obj.type === "objectgroup"})[0].objects;
    return worldObjects;
  }
}
