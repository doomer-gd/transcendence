import { Bodies, Body, Composite, Engine, World } from "matter-js";
import { GameObject, GameObjectType } from "../gameobjects/GameObject";
import { DF_FPS, DF_LOOKAHEAD, GameConstructData, GameMap } from "./SharedConfig";
import { GameEvents } from "../gameplay/Simulation";
import { Timer } from "../gameplay/Timer";
import { IPlatformConfig, MovingPlatform } from "../gameobjects/Platform";
import { IZoneConfig, Zone } from "../gameobjects/Zone";
import { IPickupConfig, Pickup } from "../gameobjects/Pickup";

export interface ObjectConstructData
{
  label: string,
  type: GameObjectType,
  x: number,
  y: number,
  [key:string]: any
}

export interface MatterData
{
  engine: Engine,
  world: World,
  dynamics: Map<number, GameObject>,
  timer: Timer,
  tick: number,
  lookahead: number,
  idObjectMap: Map<number, GameObject>,
  idLast: number,
  gravity: number,
  isActive: boolean
}

export interface Hitbox
{
  height: number,
  width: number,
  xOffset: number,
  yOffset: number,
  feetHeight: number,
  scale: number,
  options?: any
}

export enum CollisionTypes
{
  player = 0x0001,
  solid = 0x0002,
  attack = 0x0004,
  projectile = 0x0008,
  pickup = 0x0010
}

export enum CollisionMasks
{
  player = CollisionTypes.solid | CollisionTypes.attack | CollisionTypes.projectile,
  solid = CollisionTypes.player | CollisionTypes.projectile | CollisionTypes.pickup,
  attack = CollisionTypes.player,
  projectile = CollisionTypes.player | CollisionTypes.solid,
  pickup = CollisionTypes.solid
}

export namespace Constructors
{
  export function constructBodyWithFeet(hitbox: Hitbox, mass: number): Body
  {
    const collisionOpts = hitbox.options?.collisionFilter ?? {category: CollisionTypes.player, mask: CollisionMasks.player};
    const body = Bodies.rectangle(0, 0, hitbox.width, hitbox.height, {...hitbox.options, render:{fillStyle: "#c2bd30",strokeStyle: "#211cb7"}, collisionFilter: collisionOpts, label: 'torso'});
    const feet = Bodies.rectangle(0, hitbox.height / 2 + hitbox.feetHeight / 2 + 2, hitbox.width - 14, hitbox.feetHeight, {...hitbox.options, isSensor: true, label: 'feet', render:{fillStyle: "#E53935",strokeStyle: "#1cb748"}, collisionFilter: collisionOpts});
    const compound = Body.create({ parts: [body, feet], ...hitbox.options, collisionFilter: collisionOpts });
    compound.mass = mass;
    compound.inverseMass = 1 / mass;
    return compound;
  }

  export async function constructSimulation(mapConfig: GameMap, config: GameConstructData, events: GameEvents)
  {
    const matter = initializeMatter(mapConfig.worldConfig, config);
    const constructData = mapConfig.worldConfig.objects;
    constructData.forEach((data: ObjectConstructData) =>
    {
      const newObject = objectConstructor(matter.idLast, data, matter, events, mapConfig);
      if (!newObject)
        return ;
      if (newObject.body)
        Composite.add(matter.world, newObject.body);
      matter.idObjectMap.set(matter.idLast, newObject);
      matter.idLast++;
    })
    return matter;

    function initializeMatter(worldConfig: any, config: GameConstructData): MatterData
    {
      const partMatter: Partial<MatterData> = {};
      partMatter.engine = Engine.create({gravity: {x: 0, y: 0}});
      partMatter.gravity = worldConfig.physics.gravity;
      partMatter.world = partMatter.engine.world;
      partMatter.tick = 0;
      partMatter.isActive = false;
      partMatter.idLast = 0;
      partMatter.idObjectMap = new Map<number, GameObject>;
      partMatter.timer = new Timer(1000 / (config.server.fps ?? DF_FPS));
      partMatter.dynamics = new Map<number, GameObject>;
      partMatter.lookahead = config.server.lookahead ?? DF_LOOKAHEAD;
      if (!worldConfig.minPlayers)
        worldConfig = {...worldConfig, minPlayers: 1};
      return partMatter as MatterData;
    }

    function objectConstructor(id: number, config: ObjectConstructData, matter: MatterData, events: GameEvents, mapConfig: GameMap): GameObject | undefined
    {
      switch(config.type)
      {
        case GameObjectType.staticObstacle:
          return addStaticObject(id, config);
        case GameObjectType.movingObstacle:
          return addMovingObstacle(id, config, matter, events);
        case GameObjectType.zone:
          return addZone(id, config, matter, events);
        case GameObjectType.pickup:
          return addPickup(id, config, matter, events, mapConfig);
        default:
          return undefined;
      }
    }

    function addStaticObject(id: number, config: ObjectConstructData)
    {
      let body: Body | undefined = undefined;
      if (config.radius)
        body = Bodies.circle(config.x + config.radius / 2, config.y + config.radius / 2, config.radius, {isStatic: true, ...config.physicsProps});
      else if (config.width && config.height)
        body = Bodies.rectangle((config.x + config.width / 2), (config.y + config.height / 2), config.width, config.height, {isStatic: true,render:{fillStyle: "#7ca3b6",strokeStyle: "#1cb748"}, ...config.physicsProps});
      const gameobject = new GameObject(id, config.type, config.label);
      if (body)
      {
        gameobject.body = body;
        body.plugin.gameObject = gameobject;
        body.collisionFilter = {category: CollisionTypes.solid, mask: CollisionMasks.solid};
        body.label = 'ground';
      }
      return gameobject;
    }

    function addMovingObstacle(id: number, config: ObjectConstructData, matter: MatterData, events: GameEvents)
    {
      const configObstacle = config as IPlatformConfig;
      const obstacle = new MovingPlatform(id, configObstacle, matter, events);
      obstacle.launch(configObstacle.params);
      matter.dynamics.set(id, obstacle);
      return obstacle;
    }

    function addZone(id: number, config: ObjectConstructData, matter: MatterData, events: GameEvents)
    {
      const configZone = config as IZoneConfig;
      const zone = new Zone(id, config.label, matter, events);
      zone.spawn(configZone);
      matter.dynamics.set(id, zone);
      return zone;
    }

    function addPickup(id: number, config: ObjectConstructData, matter: MatterData, events: GameEvents, mapConfig: GameMap)
    {
      const pickup = new Pickup(id, config as IPickupConfig, matter, events);
      pickup.setParams({x: config.x, y: config.y}, true, mapConfig.worldConfig.itemRespawnTime);
      pickup.spawn();
      matter.dynamics.set(id, pickup);
      return pickup;
    }
  }

}
