import { GameNetwork } from "../network/Network";
import {
  AnnounceEvent,
  ManagerEvents,
  PlayerInput,
  PlayerProfile,
  ServerSocket,
} from "../../game_common/network/Interfaces";
import EventEmitter from "eventemitter3";
import {
  DF_USERNAME,
  GameConstructData,
  GameMap,
} from "@/game_common/utility/SharedConfig";
import { ServerSimulation } from "./ServerSimulation";
import { Snapshot } from "@/game_common/gameplay/Simulation";

interface MatchStatus {
  readyPlayers: number;
  isConstructed: boolean;
  isStarted: boolean;
}

export class Match {
  readonly id: string;
  game: ServerSimulation;
  network: GameNetwork;
  events: EventEmitter<ManagerEvents>;
  state: MatchStatus;
  playersMap: Map<string, number>;
  playerProfiles: Map<string, PlayerProfile>;
  nickList: Array<[string, number]>;
  private playerSockets: Map<string, string>;
  config: GameConstructData;
  mapConfig: GameMap;

  constructor(id: string, mapConfig: GameMap, config: GameConstructData, network: GameNetwork,
    events: EventEmitter<ManagerEvents>)
  {
    this.id = id;
    this.config = config;
    this.mapConfig = mapConfig;
    this.state = {readyPlayers: 0, isConstructed: false, isStarted: false} as MatchStatus;
    this.network = network;
    this.events = events;
    this.playersMap = new Map<string, number>();
    this.playerProfiles = new Map<string, PlayerProfile>();
    this.playerSockets = new Map<string, string>();
    this.game = new ServerSimulation(id, mapConfig, config, events);
  }

  startMatch()
  {
    console.log("match started label:", this.mapConfig.label, "id:", this.id)
    this.state.isStarted = true;
    this.game.start();
    this.nickList = Array.from(this.playersMap.entries()).map(
      ([playerId, localId]) =>
        [this.getUsername(playerId), localId] as [string, number],
    );
    this.network.ioSock.to(this.id).emit("gameReady", this.gameReadyExport(), this.nickList);
    this.network.ioSock.to(this.id).emit("announce", { type: "start" });
    this.events.on("frag", (id: number, author: number) =>
      this.callbackOnFrag(id, author),
    );
  }

  update()
  {
    if (!this.state.isConstructed || !this.game.isActive())
      return;
    let isUpdated = this.game.update();
    if (isUpdated && this.game.getTick() % 2 === 0)
      this.network.ioSock.to(this.id).emit("snapShot", this.game.exportState());
  }

  addPlayer(playerId: string, socketId: string, heroLabel: string, profile: PlayerProfile)
  {
    const socket = this.network.getSock(socketId);
    if (!socket)
      return;
    socket.emit("joinStatus", 0);
    const localId = this.game.addPlayer(heroLabel, playerId);
    this.playersMap.set(playerId, localId);
    this.playerProfiles.set(playerId, profile);
    this.playerSockets.set(playerId, socketId);
    this.addPlayerListen(socket, localId);
    this.game.spawnPlayer(localId, false);
  }

  reconnectPlayer(playerId: string, socketId: string): boolean
  {
    const localId = this.playersMap.get(playerId);
    const socket = this.network.getSock(socketId);
    if (localId === undefined || !socket)
      return false;
    const previousSocketId = this.playerSockets.get(playerId);
    const previousSocket = previousSocketId ? this.network.getSock(previousSocketId) : undefined;
    previousSocket?.removeAllListeners("input");
    previousSocket?.removeAllListeners("playerLoading");
    previousSocket?.removeAllListeners("playerReady");
    socket.removeAllListeners("input");
    socket.removeAllListeners("playerLoading");
    socket.removeAllListeners("playerReady");
    this.playerSockets.set(playerId, socketId);
    this.addPlayerListen(socket, localId);
    this.game.spawnPlayer(localId, false);
    socket.emit("joinStatus", 0);
    this.network.ioSock.to(this.id).emit("announce", { type: "recon", data: { id: localId } });
    return true;
  }

  removePlayer(playerId: string)
  {
    const player = this.playersMap.get(playerId);
    if (!player)
      return;
    const socketId = this.playerSockets.get(playerId);
    if (socketId)
    {
      const socket = this.network.getSock(socketId);
      socket?.removeAllListeners("input");
      socket?.removeAllListeners("playerReady");
      socket?.removeAllListeners("playerLoading");
    }
    if (!this.game.isActive())
      this.game.removePlayer(player);
    this.playersMap.delete(playerId);
    this.playerSockets.delete(playerId);
    this.network.ioSock.to(this.id).emit("announce", { type: "abandoned", data: { id: player } });
  }

  despawn(playerId: string)
  {
    const localId = this.playersMap.get(playerId);
    if (localId === undefined)
      return;
    this.game.despawnPlayer(localId);
    this.network.ioSock.to(this.id).emit("announce", { type: "left", data: { id: localId } });
  }

  private addPlayerListen(socket: ServerSocket, localId: number)
  {
    socket.once("playerLoading", () =>
    {
      socket.emit("playerInfo", this.game.exportState(), localId);
      socket.once("playerReady", () =>
      {
        socket.on("input", (tick: number, data: PlayerInput) =>
        {
          data.id = localId;
          this.game.addEvent(tick, { type: "input", input: data });
        });
        this.game.setPlayerReady(localId, true);
        this.checkStartMatch(socket);
      });
    });
  }

  private checkStartMatch(socket: ServerSocket): boolean
  {
    if (this.state.isStarted)
    {
      socket.emit("gameReady", this.gameReadyExport(), this.nickList);
      socket.emit("scores", this.game.exportScore());
      return true;
    }
    let numReady = this.game.countReadyPlayers();
    if (numReady >= this.game.mapConfig.worldConfig.numPlayers)
    {
      this.startMatch();
      return true;
    }
    return false;
  }

  private callbackOnFrag(id: number, author: number)
  {
    let message: AnnounceEvent;
    if (author === 0) message = { type: "dead", data: { id: id } };
    else message = { type: "frag", data: { id: id, author: author } };
    this.network.ioSock.to(this.id).emit("announce", message);
    this.network.ioSock.to(this.id).emit("scores", this.game.exportScore());
  }

  pauseMatch()
  {
    this.game.pause();
    this.network.ioSock
      .to(this.id)
      .emit("gamePause", this.game.getTick(), true);
  }

  unpauseMatch()
  {
    this.game.unpause();
    this.network.ioSock.to(this.id).emit("gamePause", this.game.getTick(), false);
  }

  destroy()
  {
    this.playerSockets.forEach((socketId) =>
    {
      const socket = this.network.getSock(socketId);
      socket?.removeAllListeners("input");
      socket?.removeAllListeners("playerReady");
      this.network.leaveRoom(socketId, this.id);
    });
    this.playersMap.clear();
    this.playerSockets.clear();
    this.game.destroy();
  }

  getProfile(playerId: string): PlayerProfile
  {
    return (
      this.playerProfiles.get(playerId) ?? {
        userId: null,
        username: DF_USERNAME,
      });
  }

  private getUsername(playerId: string): string
  {
    return this.getProfile(playerId).username;
  }

  hasSlots()
  {
    return this.playersMap.size < this.mapConfig.worldConfig.numPlayers;
  }

  private gameReadyExport(): Snapshot
  {
    const gameState = this.game.exportState();
    gameState.tick = this.game.getTick() + this.config.server.lookahead - 1;
    return gameState;
  }
}
