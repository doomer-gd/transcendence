import { Body, Collision, Composite, Engine, Events, World} from "matter-js";
import { constructServerWorld, MatterData } from "../utils/WorldConstructor";
import * as GameServer from "."
import { PlayerConfig } from "./Player";
import { GameNetwork } from "../network/Network";
import { ManagerEvents, PlayerInput, ServerSocket } from "../../game_common/network/Interfaces";
import EventEmitter from "eventemitter3";
import { Timer } from "../../game_common/gameplay/Timer";
import { GameConstructData } from "../network/MatchManager";
import { DF_FPS } from "../network/MatchManager"
import { DebugRender } from "../debug/Render";

interface MatchStatus
{
  readyPlayers: number,
  isConstructed: boolean,
  isStarted: boolean
}

export class Match {
  private matter: MatterData;
  private timer: Timer;
  readonly id: string;
  readonly characterConfig: PlayerConfig[];
  readonly mapConfig: any;
  network: GameNetwork;
  events: EventEmitter<ManagerEvents>;
  state: MatchStatus;
  playersMap: Map<string, GameServer.Player>;

  constructor(id: string, mapConfig: any, config: GameConstructData, network: GameNetwork, events: EventEmitter<ManagerEvents>) {
    this.id = id;
    this.state = {readyPlayers: 0, isConstructed: false, isStarted: false} as MatchStatus;
    this.network = network;
    this.events = events;
    this.playersMap = new Map<string, GameServer.Player>();
    this.timer = new Timer(1000 / (config.server.fps ?? DF_FPS));
    this.characterConfig = config.characters;
    this.mapConfig = mapConfig;
    constructServerWorld(mapConfig).then((value: MatterData) => {
      this.matter = value;
      this.state.isConstructed = true;
    });
  }

  startMatch()
  {
    this.matter.isActive = true;
    this.state.isStarted = true;
    console.log("match started");
    this.timer.refresh();
    this.network.ioSock.to(this.id).emit("gameReady");
  }

  update(){
    if (!this.state.isConstructed || !this.matter.isActive)
      return ;
    this.timer.updateDeltaTime();
    while (this.timer.checkTick())
    {
      Engine.update(this.matter.engine, this.timer.fixedDelta);
      this.playersMap.forEach((value: GameServer.Player, key: string)=>{
        this.network.ioSock.to(key).emit("snapShot", this.matter.tick, this.getDebugSnapshot());
      })
      this.matter.tick++;
    }
  }

  addPlayer(playerId: string)
  {
    this.network.ioSock.to(playerId).emit("requestHero");
    const socket = this.network.getSock(playerId);
    if (!socket)
      return ;
    socket.once("selectHero", (label: string) =>
    {
      const config = this.characterConfig.find((value) => value.label === label) as PlayerConfig;
      const player = new GameServer.Player(this.matter, config);
      this.playersMap.set(playerId, player);
      this.matter.idObjectMap.set(this.matter.idLast, player);
      this.matter.idLast++;
      this.addPlayerListen(socket, player);
      if (this.state.isStarted)
        socket.emit("gameReady");
    })
  };

  removePlayer(playerId: string)
  {
    const player = this.playersMap.get(playerId);
    if (!player)
      return ;
    this.matter.idObjectMap.delete(player.id);
    this.playersMap.delete(playerId);
  };

  addPlayerListen(socket: ServerSocket, player: GameServer.Player)
  {
    socket.on("input", (data: PlayerInput) => player.applyInput(data));
    socket.once("playerReady", () => {
      console.log("player ready recieved");
      this.spawnPlayer(player);
      player.stats.isReady = true;
      this.state.readyPlayers++;
      if (!this.state.isStarted &&
          (this.state.readyPlayers >= this.mapConfig.minPlayers))
        this.checkStartMatch();
    })
  }

  spawnPlayer(player: GameServer.Player)
  {
    Body.setPosition(player.body,{x: 500, y: 200}); //placeholder
    Composite.add(this.matter.world, player.body);
  }

  checkStartMatch()
  {
    if (this.state.isStarted)
      return ;
    let numReady: number = 0;
    this.playersMap.forEach((value: GameServer.Player) => {
      if(value.stats.isReady)
        numReady++;
      });
    this.state.readyPlayers = numReady;
    if (numReady >= this.mapConfig.minPlayers)
      this.startMatch();
  }

  pauseMatch()
  {
    this.matter.isActive = false;
  }

  unpauseMatch()
  {
    this.matter.isActive = true;
    this.timer.refresh();
  }

  getDebugSnapshot()
  {
    if (!this.matter?.world?.bodies)
      return [];

    return this.matter.world.bodies.map((body: any) => ({
      id: body.plugin?.gameObject?.id ?? body.id,
      label: body.label ?? "body",
      pos: {x: body.position.x, y: body.position.y},
      angle: body.angle,
      width: body.bounds.max.x - body.bounds.min.x,
      height: body.bounds.max.y - body.bounds.min.y,
      radius: body.circleRadius ?? 0,
      isStatic: Boolean(body.isStatic),
      isSensor: Boolean(body.isSensor),
      mask: body.collisionFilter.mask
    }));
  }

  destroy(){};

}
