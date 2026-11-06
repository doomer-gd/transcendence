
export interface Transform
{
  x: number,
  y: number
}

export const enum GameObjectType
{
  player = "player",
  staticObstacle = "staticObstacle",
  spawnPoint = "spawnPoint",
  movingObstacle = "movingObstacle",
  projectile = "projectile",
  pickup = "pickup",
  zone = "zone",
  decor = "decor"
}

export interface IObjectState
{
  hp: number,
  facing: number
}

export const GameObjectTypesArray: Array<string> = [
  GameObjectType.player,
  GameObjectType.staticObstacle,
  GameObjectType.spawnPoint,
  GameObjectType.movingObstacle,
  GameObjectType.projectile,
  GameObjectType.pickup,
  GameObjectType.zone,
  GameObjectType.decor ]

export class GameObject
{
  id: number;
  type: GameObjectType;
  label: string;
  lastTick: number;
  state: IObjectState;
  [key: string]: any;

  constructor (id: number, type: GameObjectType, label: string)
  {
    this.id = id;
    this.type = type;
    this.label = label;
    this.lastTick = 0;
    this.state = {hp: 100, facing: 1};
  }

}
