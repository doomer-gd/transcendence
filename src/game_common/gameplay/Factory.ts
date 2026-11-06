import { MatterData, ObjectConstructData } from "../utility/Constructors";
import { GameObject, GameObjectType } from "../gameobjects/GameObject";
import { GameConstructData } from "../utility/SharedConfig";
import { Player, PlayerConfig } from "../gameobjects/Player";
import { Composite } from "matter-js";
import { GameEvents } from "./Simulation";
import { IProjectileData, Projectile } from "../gameobjects/Projectile";
import { IPickupConfig, Pickup } from "../gameobjects/Pickup";

export class GameObjectFactory
{
  private matter: MatterData;
  private events: GameEvents;
  private constructorMap: Map<GameObjectType, (id:number, label: string) => GameObject | undefined>;
  private destructorMap: Map<GameObjectType, (obj: GameObject) => void>;
  readonly config: GameConstructData;

  constructor(matter: MatterData, config: GameConstructData, events: GameEvents)
  {
    this.matter = matter;
    this.config = config;
    this.events = events;
    this.defineMaps();
  }

  insert(id: number, type: GameObjectType, label: string): GameObject | undefined
  {
    if (this.matter.idObjectMap.get(id))
      return ;
    const constructorFunc = this.constructorMap.get(type)?.bind(this);
    if (!constructorFunc)
      return ;
    const gameObject = constructorFunc(id, label);
    if (gameObject)
    {
      this.matter.dynamics.set(id, gameObject);
      this.matter.idObjectMap.set(id, gameObject);
      this.addToWorld(gameObject);
    }
    return gameObject;
  };

  create(type: GameObjectType, label: string): GameObject | undefined
  {
    const constructorFunc = this.constructorMap.get(type)?.bind(this);
    if (!constructorFunc)
      return ;
    const gameObject = constructorFunc(this.matter.idLast, label);
    if (gameObject)
    {
      this.matter.dynamics.set(this.matter.idLast, gameObject);
      this.matter.idObjectMap.set(this.matter.idLast, gameObject);
      this.addToWorld(gameObject);
      this.matter.idLast++;
    }
    return gameObject;
  };

  remove(id: number | GameObject)
  {
    let gameObject: GameObject | undefined;
    if (typeof id === "number")
      gameObject = this.matter.dynamics.get(id);
    else
      gameObject = id;
    if (!gameObject)
      return ;
    this.removeFromWorld(gameObject);
    const destroy = this.destructorMap.get(gameObject.type)?.bind(this);
    if (!destroy)
      return ;
    destroy(gameObject);
  }

  //maybe an object pool here for speed and memory, probably unnecessary

  private addToWorld(gameObject: GameObject)
  {
    if (!gameObject.body)
      return ;
    const bodies = Composite.allBodies(this.matter.world);
    if (!bodies.includes(gameObject.body))
      Composite.add(this.matter.world, gameObject.body);
  }

  private removeFromWorld(gameObject: GameObject)
  {
    if (!gameObject.body)
      return ;
    gameObject.sprite = undefined;
    Composite.remove(this.matter.world, gameObject.body);
    this.matter.dynamics.delete(gameObject.id);
    this.matter.idObjectMap.delete(gameObject.id);
  }

  private defineMaps()
  {
    this.constructorMap = new Map<GameObjectType, (this: any, id:number, label: string) => GameObject>;
    this.constructorMap.set(GameObjectType.player, this.constructPlayer);
    this.constructorMap.set(GameObjectType.projectile, this.constructProjectile);
    this.constructorMap.set(GameObjectType.pickup, this.constructPickup);
    this.destructorMap = new Map<GameObjectType, (this: any, obj: GameObject) => void>;
    this.destructorMap.set(GameObjectType.player, this.destroyPlayer);
    this.destructorMap.set(GameObjectType.projectile, this.destroyProjectile);
    this.destructorMap.set(GameObjectType.pickup, this.destroyPickup);
  }

  private constructPlayer(id:number, label: string): GameObject | undefined
  {
    const playerConfig = this.config.characters.find((value: PlayerConfig) => value.label === label);
    if (!playerConfig)
      return ;
    const player = new Player(id, this.matter, playerConfig, this.events, this);
    return player;
  }

  private destroyPlayer(obj: GameObject)
  {
    const player = obj as Player;
    player.destroy();
  }

  private constructProjectile(id: number, label: string): GameObject | undefined
  {
    const config = this.config.gameObjects.find((obj: ObjectConstructData) => (obj.type === GameObjectType.projectile && obj.label === label));
    if (!config)
      return undefined;
    const projectile = new Projectile(id, config as IProjectileData, this.matter, this.events);
    return projectile;
  }

  private destroyProjectile(obj: GameObject)
  {
    const projectile = obj as Projectile;
    projectile.destroy();
  }

  private constructPickup(id: number, label: string): GameObject | undefined
  {
    const config = this.config.gameObjects.find((obj: ObjectConstructData) => (obj.type === GameObjectType.pickup && obj.label === label));
    if (!config)
      return undefined;
    const pickup = new Pickup(id, config as IPickupConfig, this.matter, this.events);
    return pickup;
  }

  private destroyPickup(obj: GameObject)
  {
    const pickup = obj as Pickup;
    pickup.destroy();
  }

}
