import * as GameServer from "../gameplay";
import { Constructors, GameConstructData, GameObjectType } from "../../game_common/utility/Constructors";
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

export async function constructServerWorld(worldConfig: any): Promise<MatterData>
{
  var matter = initializeMatter(worldConfig);
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
  console.log("match created");
  return matter;
}

function initializeMatter(worldConfig: any): MatterData
{
  const partMatter: Partial<MatterData> = {};
  partMatter.engine = Engine.create(worldConfig.physics ?? { gravity: { y: 3, x: 0 } });
  partMatter.world = partMatter.engine.world;
  partMatter.tick = 0;
  partMatter.isActive = false;
  partMatter.idLast = 0;
  partMatter.idObjectMap = new Map<number, GameServer.GameObject>;
  if (!worldConfig.minPlayers)
    worldConfig.minPlayers = 1;
  return partMatter as MatterData;
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


