import { IAnimationModes, IFrameData } from "../animation/Animator";
import { GameObjectType } from "../gameobjects/GameObject";
import { EPlayerActionTypes, G_AnimActionMap, PlayerConfig } from "../gameobjects/Player";
import { Hitbox, ObjectConstructData } from "./Constructors";
import { GameConstructData, GameMap } from "./SharedConfig";


export function parseMap(config: GameConstructData, map: GameMap, readMapConfig: any)
{
  map.worldConfig = readMapConfig;
  map.title = readMapConfig.title;
  map.worldConfig.objects.forEach((data: ObjectConstructData) =>
  {
    const baseConfig = config.gameObjects.find((conf: ObjectConstructData) =>
      conf.type === data.type && conf.label === data.label);
    if (baseConfig)
      Object.assign(data, structuredClone(baseConfig));
    applyScaleToObject(data, map.worldConfig.scale);
  })
  map.worldConfig.decor.forEach((decorItem: any) => applyScaleToObject(decorItem, map.worldConfig.scale));

  function applyScaleToObject(data: ObjectConstructData, scale: number)
  {
    data.x *= scale;
    data.y *= scale;
    if (data.width)
    {
      data.width *= scale;
      data.height *= scale;
    }
    if (data.type === GameObjectType.movingObstacle || data.type === GameObjectType.zone)
      scaleHitbox(data.hitbox, scale);
    if (data.type === GameObjectType.movingObstacle)
      data.params.points = scalePoints(data.params.points, scale);
  }

  function scaleHitbox(hitbox: Hitbox, scale: number)
  {
    hitbox.width *= scale;
    hitbox.height *= scale;
    hitbox.xOffset *= scale;
    hitbox.yOffset *= scale;
    hitbox.scale = scale;
  }

  function scalePoints(points: {x: number, y: number}[], scale: number)
  {
    const modified = Array.from(points, (point) =>
    {
      point.x *= scale;
      point.y *= scale;
      return point;
    })
    return modified;
  }
}

export function parseCharacter(config: PlayerConfig, readConfig: any)
{
  Object.assign(config, readConfig);
  config.animModes = {idle:{label: '', numFrames: 0, duration: 0, ticksPerFrame: 1, inverseTPF: 1}};
  config.durations = new Array<number>(EPlayerActionTypes.dead + 1);
  config.frames.forEach((frame: IFrameData) =>
  {
    createAnimData(config.animModes, frame);
    const action = G_AnimActionMap.get(frame.type) as number;
    if (action !== undefined)
      config.durations[action as number] = frame.duration;
    if (action === EPlayerActionTypes.ranged)
      config.durations[EPlayerActionTypes.block] = frame.duration;
  });
}

export function parseGameObject(config: ObjectConstructData, readConfig: any)
{
  Object.assign(config, readConfig);
  if (config.frames)
  {
    config.animModes = {idle:{label: '', numFrames: 0, duration: 0, ticksPerFrame: 1, inverseTPF: 1}};
    config.frames.forEach((frame: IFrameData) => createAnimData(config.animModes, frame));
  }
}

export function createAnimData(animModes: IAnimationModes, frame: IFrameData)
{
  animModes[frame.type] = {
    label: frame.label,
    numFrames: frame.numberFrames,
    duration: frame.duration,
    ticksPerFrame: frame.duration / frame.numberFrames,
    inverseTPF: frame.numberFrames / frame.duration
  }
}

export function cutFrames(scene: Phaser.Scene, labelAtlas: string, frame: IFrameData)
{
  scene.anims.create({
    key: frame.label,
    frames: scene.anims.generateFrameNames(labelAtlas,
      {
        prefix: frame.prefix,
        suffix: ".png",
        start: 0,
        end: frame.numberFrames - 1
      }),
    frameRate: frame.numberFrames / frame.duration,
    repeat: -1
  });
}
