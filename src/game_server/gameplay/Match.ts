import Matter, { Engine, World, Bodies, Body, Runner} from "matter-js";
import { Constructors, GameConstructData } from "@/game_common/utility/Constructors";
import { constructServerWorld, MatterData } from "../utils/WorldConstructor";
import * as GameServer from "."
import { GameEvents, GameMap } from "../network/MatchManager";
import { PlayerConfig } from "@/game_server/gameplay/Player";
import { Server } from "socket.io";
import { GameNetwork } from "../network/Network";
import { PlayerInput, ServerSocket } from "@/game_common/network/Interfaces";

const fixedDelta: number = 1000/60;

interface MatchStatus
{
  readyPlayers: number,
  isConstructed: boolean,
  isStarted: boolean
}


export class Match {
  private matter: MatterData;
  readonly id: string;
  readonly characterConfig: PlayerConfig[];
  readonly mapConfig: any;
  network: GameNetwork;
  state: MatchStatus;
  playersMap: Map<string, GameServer.Player>;

  constructor(id: string, mapConfig: any, characters: PlayerConfig[], network: GameNetwork) {
    this.id = id;
    this.state.isConstructed = false;
    this.state.isStarted = false;
    this.state.readyPlayers = 0;
    this.network = network;
    this.characterConfig = characters;
    this.mapConfig = mapConfig;
    constructServerWorld(mapConfig, this.matter, this.state.isConstructed);
  }

  startMatch()
  {
    this.matter.isActive = true;
    this.state.isStarted = true;
    this.network.ioSock.to(this.id).emit("gameReady");
  }

  update(deltaTime: number){
    if (!this.matter.isActive)
      return ;
    Engine.update(this.matter.engine, deltaTime);
    this.matter.tick++;
    console.log("tick:", this.matter.tick);
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
      const player = new GameServer.Player(this.matter.idLast, config, this.matter);
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
    despawnPlayer(player);
    this.matter.idObjectMap.delete(player.id);
    this.playersMap.delete(playerId);
  };

  addPlayerListen(socket: ServerSocket, player: GameServer.Player)
  {
    socket.on("input", (data: PlayerInput) => player.applyInput(data));
    socket.on("playerReady", () => {
      player.stats.isReady = true;
      this.state.readyPlayers++;
      if (this.state.readyPlayers >= this.mapConfig.minPlayers)
        this.checkStartMatch();
    })
  }

  checkStartMatch()
  {
    let numReady: number = 0;
    this.playersMap.forEach((value: GameServer.Player) => {
      if(value.stats.isReady)
        numReady++;
      });
    this.state.readyPlayers = numReady;
    if (numReady >= this.mapConfig.minPlayers)
      this.startMatch();
  }

  destroy(){};

}
