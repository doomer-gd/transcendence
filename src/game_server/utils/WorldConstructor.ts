import * as GameServer from "@/game_server/gameplay";
import { Constructors, GameConstructData, GameObjectType } from "@/game_common/utility/Constructors";
import { Engine, World, Bodies, Body, Composite } from "matter-js";
export interface MatterData
{
  engine: Engine,
  world: World,
  tick: number,
  idObjectMap: Map<number, GameServer.GameObject>,
  isActive: boolean,
  idLast: number
}

const mapTypeConstructor = new Map<GameObjectType, (arg: GameConstructData, id:number) => GameServer.GameObject>(
[
  [GameObjectType.staticObstacle, addStaticObject]
])

export async function constructServerWorld(worldConfig: any, matter: MatterData, isDone: boolean)
{
  console.log("world construction");
  initializeMatter(worldConfig, matter);
  const constructs = Constructors.getWolrdObjects(worldConfig);
  constructs.forEach((obj: GameConstructData) => {
    const construtorFunc = mapTypeConstructor.get(obj.type);
    if (!construtorFunc)
      return;
    let newObject = construtorFunc(obj, matter.idLast);
    if (newObject.body)
      Composite.add(matter.world, newObject.body);
    matter.idObjectMap.set(matter.idLast, newObject);
    matter.idLast++;
  })
  isDone = true;
  console.log("match created");
}

function initializeMatter(worldConfig: any, matter: MatterData)
{
  matter.engine = Engine.create(worldConfig.physics ?? { gravity: { y: 3, x: 0 } });
  matter.world = matter.engine.world;
  matter.tick = 0;
  matter.isActive = false;
  matter.idLast = 0;
  if (!worldConfig.minPlayers)
    worldConfig.minPlayers = 1;
}


function addStaticObject(config: GameConstructData, id: number)
{
  var body: Body | undefined = undefined;
  if (config.radius)
    body = Bodies.circle(config.x, config.y, config.radius, config.physicsProps);
  if (config.width && config.height)
    body = Bodies.rectangle(config.x, config.y, config.width, config.height, config.physicsProps);
  const gameobject= new GameServer.GameObject(id, {x: config.x, y: config.y}, config.label, body);
  if (body)
  {
    body.plugin.gameObject = gameobject;
    body.label = 'ground';
  }
  return gameobject;
}


