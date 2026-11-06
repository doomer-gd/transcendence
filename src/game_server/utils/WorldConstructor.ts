import { CollisionMasks, CollisionTypes, Constructors, ObjectConstructData} from "../../game_common/utility/Constructors";
import { Engine, World, Bodies, Body, Composite } from "matter-js";
import { Timer } from "@/game_common/gameplay/Timer";
import { DF_FPS, DF_LOOKAHEAD, GameConstructData } from "../../game_common/utility/SharedConfig";
import { GameObject, GameObjectType } from "@/game_common/gameobjects/GameObject";

export interface MatterData
{
  engine: Engine,
  world: World,
  dynamics: Map<number, GameObject>,
  timer: Timer,
  tick: number,
  lookahead: number,
  idObjectMap: Map<number, GameObject>,
  isActive: boolean,
  idLast: number
}

export const mapTypeConstructor = new Map<GameObjectType, (arg: ObjectConstructData, id:number) => GameObject>(
[
  [GameObjectType.staticObstacle, addStaticObject]
])

export async function constructWorld(worldConfig: any, config: GameConstructData): Promise<MatterData>
{
  var matter = initializeMatter(worldConfig, config);
  const constructs = Constructors.getWolrdObjects(worldConfig);
  constructs.forEach((obj: ObjectConstructData) => {
    const construtorFunc = mapTypeConstructor.get(obj.type);
    if (!construtorFunc)
      return;
    let newObject = construtorFunc(obj, matter.idLast);
    if (newObject.body)
      Composite.add(matter.world, newObject.body);
    matter.idObjectMap.set(matter.idLast, newObject);
    matter.idLast++;
  });
  return matter;
}

export function initializeMatter(worldConfig: any, config: GameConstructData): MatterData
{
  const partMatter: Partial<MatterData> = {};
  partMatter.engine = Engine.create(worldConfig.physics ?? { gravity: { y: 3, x: 0 } });
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


export function addStaticObject(config: ObjectConstructData, id: number)
{
  let body: Body | undefined = undefined;
  if (config.radius)
    body = Bodies.circle(config.x + config.radius / 2, config.y + config.radius / 2, config.radius, {isStatic: true, ...config.physicsProps});
  if (config.width && config.height)
    body = Bodies.rectangle(config.x + config.width / 2, config.y + config.height / 2, config.width, config.height, {isStatic: true,render:{fillStyle: "#7ca3b6",strokeStyle: "#1cb748"}, ...config.physicsProps});
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


