import { GameConstructData, GameMap } from "../utility/SharedConfig";
import { PlayerInput } from "../network/Interfaces";
import Matter, { Body, Composite, Engine} from "matter-js";
import { GameObject, GameObjectType, IObjectState } from "../gameobjects/GameObject";
import { GameObjectFactory } from "./Factory";
import { Player } from "../gameobjects/Player";
import { IAnimationModes } from "../animation/Animator";
import { EventQueue } from "../utility/EventQueue";
import EventEmitter from "eventemitter3";
import { IProjectileParams } from "../gameobjects/Projectile";
import { Pickup } from "../gameobjects/Pickup";
import { Constructors, MatterData, ObjectConstructData } from "../utility/Constructors";

type EventInput = { type: "input", input: PlayerInput };
type EventSpawn = { type: "spawnPlayer", id: number };
type EventDespawn = { type: "despawnPlayer", id: number };
type EventSpawnItem = { type: "spawnItem", pickup: Pickup };
type EventGameEnd = { type: "gameEnd" };

type TickEvents = EventInput | EventSpawn | EventDespawn | EventGameEnd | EventSpawnItem;

export interface IGameEventTypes
{
  frag: (id: number, author: number) => void,
  dead: (id: number) => void,
  destroy: (id: number) => void,
  spawn: (id: number) => void,
  despawn: (id: number) => void
}

export class GameEvents extends EventEmitter<IGameEventTypes> {}

export interface SnapObject
{
  id: number,
  type: GameObjectType,
  label: string,
  x?: number,
  y?: number,
  velX?: number,
  velY?: number,
  angle?: number,
  state?: IObjectState,
  anim?: {type: keyof IAnimationModes, now: number},
  proj?: IProjectileParams
}

export type Snapshot =
{
  tick: number;
  snaps: SnapObject[];
  idLast: number;
}

export enum GameModes
{
  ffa = "ffa",
  teams = "teams"
}

export interface GameParams
{
  duration: number,
  inverseFPS: number,
  numPlayers: number,
  respTime: number,
  mode: GameModes,
  numPlayerTeam?: number,
  teams?: Set<number>[],
  teamScores?: number[],
}

export class Simulation
{
  protected matter: MatterData;
  protected factory: GameObjectFactory;
  protected eventQueue: EventQueue<TickEvents>;
  protected params: GameParams;
  protected isConstructed: boolean;
  protected spawners: Matter.Vector[];
  readonly config: GameConstructData;
  readonly mapConfig: GameMap;
  eventsGame: GameEvents;

  constructor (mapConfig: GameMap, config: GameConstructData)
  {
    this.isConstructed = false;
    this.mapConfig = mapConfig;
    this.config = config;
    this.spawners = [];
    this.eventQueue = new EventQueue<TickEvents>(config.server.lookback);
    this.eventsGame = new GameEvents();
    this.initializeParams(mapConfig.worldConfig);
    Constructors.constructSimulation(mapConfig, config, this.eventsGame).then((matter) =>
    {
      this.matter = matter;
      this.factory = new GameObjectFactory(this.matter, config, this.eventsGame);
      this.isConstructed = true;
      this.setSpawners();
      this.addListeners();
      this.onConstructed();
    }).catch((reason: any) => console.log("failed to create match:", reason));
  }

  onConstructed(){};

  update(): boolean
  {
    if (!this.isActive())
      return false;
    this.matter.timer.updateDeltaTime();
    let isReady = this.matter.timer.checkTick();
    let isUpdated = isReady;
    while (isReady)
    {
      this.step();
      isReady = this.matter.timer.checkTick();
    }
    if (this.matter.tick % 30 === 0)
      this.cleanQueue();
    return isUpdated;
  }

  protected step()
  {
    const events = this.eventQueue.get(this.matter.tick);
    events?.forEach((event: TickEvents) => this.executeEvent(event));
    this.matter.dynamics.forEach((obj: GameObject) => {if (obj.update) obj.update();})
    Engine.update(this.matter.engine, this.matter.timer.fixedDelta);
    this.matter.tick++;
  }

  addEvent(tick: number, event: TickEvents)
  {
    this.eventQueue.add(tick, event);
  }

  cleanQueue()
  {
    this.eventQueue.clean(this.matter.tick);
  }

  spawnPlayer(id: number, reset: boolean)
  {
    const player = this.matter.dynamics.get(id) as Player;
    if (!player || this.spawners.length === 0)
      return ;
    this.eventsGame.emit("spawn", id);
    player.state.isInvulnerable = false;
    if (reset)
      player.reset();
  }

  despawnPlayer(id: number)
  {
    const player = this.matter.dynamics.get(id) as Player;
    if (!player)
      return ;
    const spawnPos = this.findSpawn(player);
    Body.setPosition(player.body, spawnPos);
    player.state.isReady = false;
    player.state.isInvulnerable = true;
    this.eventsGame.emit("despawn", id);
  }

  applyInput(input: PlayerInput)
  {
    const player = this.matter.dynamics.get(input.id) as Player;
    if (!player)
      return ;
    player.applyInput(input);
  }

  start()
  {
    this.unpause();
    this.eventQueue.add(this.params.duration, {type:"gameEnd"});
    this.matter.dynamics.forEach((obj: GameObject) =>
    {
      if (obj.type === GameObjectType.player)
      {
        const player = obj as Player;
        if (this.mapConfig.worldConfig.mode === GameModes.teams)
          this.addToTeams(player);
        Body.setPosition(obj.body, this.findSpawn(player));
      }
    });
    this.onStart();
  }

  protected onStart(){};

  pause()
  {
    this.matter.isActive = false;
  }

  unpause()
  {
    this.matter.isActive = true;
    this.matter.timer.refresh();
  }

  getTick(): number
  {
    return this.matter.tick;
  }

  isActive(): boolean
  {
    return this.isConstructed && this.matter.isActive;
  }

  exportState(): Snapshot
  {
    const snaps = Array.from(this.matter.dynamics, (pair:[number, GameObject]) =>
    {
      const obj = pair[1];
      const body: Body | undefined = obj.body;
      const anim: {type: keyof IAnimationModes, now: number} | undefined = obj.animator ? obj.animator.getSnap() : undefined;
      let snap: SnapObject = {id: obj.id, type: obj.type, label: obj.label, state: obj.state, anim: anim};
      if (body)
      {
        snap.x = body.position.x,
        snap.y = body.position.y,
        snap.velX = body.velocity.x,
        snap.velY = body.velocity.y,
        snap.angle = body.angle
      }
      if (obj.type === GameObjectType.projectile)
        snap.proj = obj.params;
      return snap;
    })
    return {tick:this.matter.tick, snaps: snaps, idLast: this.matter.idLast};
  }

  protected endGame()
  {
    this.matter.isActive = false;
  }

  destroy()
  {
    if (this.matter?.world)
      Composite.clear(this.matter.world, false, true);
    this.eventsGame?.removeAllListeners();
  }

  private addToTeams(player: Player)
  {
    let team = 0;
    if (this.params.teams![0].size >= this.params.numPlayerTeam!)
      team = 1;
    player.team = team;
    this.params.teams![team].add(player.id);
  }

  protected findSpawn(player: Player): Matter.Vector
  {
    let spawnerId: number = 0;
    if (player.team > -1)
      spawnerId = player.team % this.spawners.length;
    else
      spawnerId = this.matter.tick + player.id;
    spawnerId = spawnerId % this.spawners.length;
    return this.spawners[spawnerId];
  }

  private initializeParams(worldConfig: any)
  {
    const params: Partial<GameParams> = {};
    params.duration = this.config.server.fps * worldConfig.duration;
    params.mode = worldConfig.mode;
    params.numPlayers = worldConfig.numPlayers;
    params.inverseFPS = 1 / this.config.server.fps;
    if (worldConfig.mode === GameModes.teams)
    {
      params.teams = new Array<Set<number>>(2);
      params.teams[0] = new Set<number>();
      params.teams[1] = new Set<number>();
      params.teamScores = Array.from([0, 0]);
      params.numPlayerTeam = Math.trunc(worldConfig.numPlayers / 2);
    }
    this.params = params as GameParams;
  }

  private addListeners()
  {
    this.eventsGame.on("dead", (id: number) => this.playerDead(id));
    this.eventsGame.on("destroy", (id: number) => this.handleItemDestroy(id));
  }

  private executeEvent(event: TickEvents)
  {
    switch (event.type)
    {
      case "input":
        this.applyInput(event.input);
        break ;
      case "spawnPlayer":
        this.spawnPlayer(event.id, true);
        break ;
      case "despawnPlayer":
        this.despawnPlayer(event.id);
        break ;
      case "spawnItem":
        event.pickup.spawn();
        break ;
      case "gameEnd":
        this.endGame();
        break ;
    }
  }

  private playerDead(id: number)
  {
    this.eventQueue.add(this.matter.tick + this.mapConfig.worldConfig.playerRespawnTime,
      {type:"spawnPlayer", id: id});
    const heal = this.factory.create(GameObjectType.pickup, "potion_hp") as Pickup;
    const player = this.matter.dynamics.get(id) as Player;
    heal.setParams(player.body.position, false);
    heal.spawn();
    heal.jump(5);
    this.despawnPlayer(id);
  }

  private handleItemDestroy(id: number)
  {
    const gameObject = this.matter.dynamics.get(id);
    if (!gameObject)
      return ;
    if (gameObject.type !== GameObjectType.pickup || !(gameObject as Pickup).state.isRespawner)
    {
      this.factory.remove(gameObject);
      return ;
    }
    const pickup = gameObject as Pickup;
    pickup.despawn();
    this.addEvent(pickup.state.respawnDelay! + this.matter.tick, {type: "spawnItem", pickup});
  }

  private setSpawners()
  {
    this.mapConfig.worldConfig.objects.forEach((obj: ObjectConstructData) =>
    {
      if (obj.type === GameObjectType.spawnPoint)
        this.spawners.push({x: obj.x, y: obj.y});
    })
  }

  debugPlayerState()
  {
    const player = this.matter.dynamics.get(6) as Player;
    console.log("player", player.state, player.body.position, player.body.velocity);
  }

  debugJump()
  {
    const player = this.matter.dynamics.get(6) as Player;
    if (player.body.velocity.y === -20)
    {
      this.debugPlayerState();
    }
  }

  debugAnimator(id: number)
  {
    const player = this.matter.dynamics.get(id) as Player;
    console.log("anim", player.animator.debugGetState());
  }

  getLastId()
  {
    return this.matter.idLast;
  }
}

