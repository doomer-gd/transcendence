import { randomUUID } from "crypto";
import { Match } from "../gameplay/Match";
import { PlayerConfig } from "@/game_common/gameobjects/Player";
import { readFileSync } from "fs";
import { GameNetwork } from "./Network";
import EventEmitter from "eventemitter3";
import {
  EPlayerGameStatus,
  IPlayerGameParams,
  ManagerEvents,
  PlayerMatchResult,
  PlayerProfile,
  ServerSocket,
} from "../../game_common/network/Interfaces";
import { ObjectConstructData } from "@/game_common/utility/Constructors";
import {
  DF_PORT,
  GameConstructData,
  GameMap,
} from "../../game_common/utility/SharedConfig";
import { GameResult, PUBLIC_FOLDER } from "../gameplay/ServerSimulation";
import { parsePlayerProfile } from "./PlayerProfile";
import * as Parsers from "@/game_common/utility/Parsers";

export class MatchManager {
  private network: GameNetwork;
  private matches: Map<string, Match>;
  private matchesPending: Map<string, Match>;
  private playerMatch: Map<string, string>;
  private playerSocket: Map<string, string>;
  private playerProfiles: Map<string, PlayerProfile>;
  private disconnectTimers: Map<string, ReturnType<typeof setTimeout>>;
  private config: GameConstructData;
  private queueJoin: Map<string, Map<string, string>>;
  private mapLabelList: string[];
  private mapIndex: number;
  events: EventEmitter<ManagerEvents>;

  constructor()
  {
    this.config = {maps: [], characters: [], gameObjects: [], server: {}, audio: []};
    this.readConfig();
    this.network = new GameNetwork(this.config.server.port ?? DF_PORT);
    this.matches = new Map<string, Match>();
    this.matchesPending = new Map<string, Match>();
    this.playerMatch = new Map<string, string>();
    this.playerSocket = new Map<string, string>();
    this.playerProfiles = new Map<string, PlayerProfile>();
    this.disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
    this.events = new EventEmitter<ManagerEvents>();
    this.queueJoin = new Map<string, Map<string, string>>();
    this.mapLabelList = this.config.maps.map((map: GameMap) => map.label);
    this.config.maps.forEach((map: GameMap) =>
      this.queueJoin.set(map.label, new Map<string, string>()));
    this.mapIndex = 0;
    this.updateAvailableMatches();
    this.addListeners();
  }

  createMatch(mapConfig: GameMap): Match
  {
    const matchId: string = randomUUID();
    const match = new Match(matchId, mapConfig, this.config, this.network, this.events);
    this.matches.set(matchId, match);
    return match;
  }

  destroyMatch(matchId: string)
  {
    const match = this.matches.get(matchId);
    if (!match)
      return;
    if (this.matchesPending.get(match.mapConfig.label) === match)
      this.matchesPending.delete(match.mapConfig.label);
    match.playersMap.forEach((localId, key: string) =>
    {
      this.playerMatch.delete(key);
      const status = this.getPlayerStatus(key);
      const socket = this.playerSocket.get(key);
      if (socket)
        this.network.ioSock.to(socket).emit("playerStatus", status);
    });
    match.destroy();
    this.matches.delete(matchId);
    this.updateAvailableMatches();
  }

  update(): number
  {
    let time = performance.now();
    this.updateAvailableMatches();
    this.matches.forEach((match: Match) => match.update());
    return performance.now() - time;
  }

  joinMatch(playerId: string, socket: ServerSocket, matchLabel: string,
    heroLabel: string): boolean
  {
    if (this.tryReconnect(playerId, socket))
      return true;
    const findHero = this.config.characters.find((config) => config.label === heroLabel);
    const queue = this.queueJoin.get(matchLabel);
    if (!queue || !findHero)
      return false;
    const match = this.matchesPending.get(matchLabel);
    if (!match || !match.state.isConstructed || !match.hasSlots())
    {
      if (!queue.has(playerId))
      {
        queue!.set(playerId, heroLabel);
        socket.emit("playerStatus", {state: EPlayerGameStatus.queue,
          hero: heroLabel, map: matchLabel});
      }
      return false;
    }
    this.addPlayerToMatch(playerId, socket.id, match, heroLabel);
    socket.emit("playerStatus", {state: EPlayerGameStatus.queue,
      hero: heroLabel, map: matchLabel});
    return true;
  }

  disconnect(playerId: string)
  {
    this.abandonMatch(playerId);
    const socketId = this.playerSocket.get(playerId);
    if (socketId)
      this.network.getSock(socketId)?.removeAllListeners();
    this.playerSocket.delete(playerId);
    this.playerProfiles.delete(playerId);
  }

  abandonMatch(playerId: string)
  {
    const match = this.leaveMatch(playerId);
    if (match)
      match.removePlayer(playerId);
    this.playerMatch.delete(playerId);
  }

  private leaveMatch(playerId: string): Match | undefined
  {
    this.queueJoin.forEach((map) => map.delete(playerId));
    const match = this.getMatchByPlayerId(playerId);
    if (match)
    {
      match.despawn(playerId);
      const socketId = this.playerSocket.get(playerId);
      if (socketId)
        this.network.leaveRoom(socketId, match.id);
      return match;
    }
    return undefined;
  }

  getPlayerStatus(playerId: string): IPlayerGameParams
  {
    let state: IPlayerGameParams = { state: EPlayerGameStatus.ready };
    const match = this.getMatchByPlayerId(playerId);
    if (match)
    {
      state.state = EPlayerGameStatus.game;
      state.hero = match.game.getPlayerHero(match.playersMap.get(playerId)!);
      state.map = match.mapConfig.label;
      if (!match.state.isStarted)
        state.state = EPlayerGameStatus.queue;
    }
    this.queueJoin.forEach((map, key: string) =>
    {
      const playerHero = map.get(playerId);
      if (playerHero)
      {
        state.state = EPlayerGameStatus.queue;
        state.hero = playerHero;
        state.map = key;
      }
    });
    return state;
  }

  private addPlayerToMatch(playerId: string, socketId: string, match: Match, heroLabel: string)
  {
    console.log(`${playerId} joining match ${(match.mapConfig.label, match.id)}`);
    match.addPlayer(playerId, socketId, heroLabel,
      this.playerProfiles.get(playerId) ?? parsePlayerProfile(undefined));
    this.playerMatch.set(playerId, match.id);
    this.playerSocket.set(playerId, socketId);
    this.network.joinRoom(socketId, match.id);
  }

  private tryReconnect(playerId: string, socket: ServerSocket): boolean
  {
    const existingMatch = this.getMatchByPlayerId(playerId);
    if (existingMatch && existingMatch.reconnectPlayer(playerId, socket.id))
    {
      this.clearDisconnectTimer(playerId);
      this.playerSocket.set(playerId, socket.id);
      this.network.joinRoom(socket.id, existingMatch.id);
      return true;
    }
    this.playerMatch.delete(playerId);
    return false;
  }

  private updateAvailableMatches()
  {
    if (this.config.maps.length === 0)
      return;
    this.matchesPending.forEach((match: Match) =>
    {
      if (match.state.isStarted)
        this.matchesPending.delete(match.mapConfig.label);
    });
    let checkedMaps = 0;
    while (checkedMaps < this.config.maps.length
      && this.matches.size < this.config.server.maxMatches)
    {
      const map = this.config.maps[this.mapIndex];
      if (!this.matchesPending.has(map.label))
      {
        const match = this.createMatch(map);
        console.log("added match", map.label);
        this.matchesPending.set(map.label, match);
      }
      this.mapIndex = (this.mapIndex + 1) % this.config.maps.length;
      checkedMaps++;
    }
  }

  private addListeners()
  {
    this.addMiddleware();
    this.events.on("worldConstructed", (id: string) =>
    {
      const match = this.matches.get(id) as Match;
      match.state.isConstructed = true;
      this.fillMatchFromQueue(match);
    });
    this.events.on("matchEnded", (id: string, result: GameResult) =>
    {
      this.sendResultToPlayers(id, result);
      this.destroyMatch(id);
      console.log("match ended", id);
    });
  }

  private addMiddleware()
  {
    this.network.ioSock.use((socket, next) =>
    {
      const playerToken = socket.handshake.auth?.playerToken;
      if (typeof playerToken !== "string" || playerToken.length === 0)
        return next(new Error("BAD_TOKEN"));
      const socketId = this.playerSocket.get(playerToken);
      let connected = false;
      if (socketId)
        connected = this.network.getSock(socketId)?.connected ?? false;
      if (this.playerProfiles.has(playerToken) && connected)
        return next(new Error("USER_EXISTS"));
      if (!this.playerProfiles.has(playerToken))
        this.playerSocket.set(playerToken, socket.id);
      socket.data.playerToken = playerToken;
      this.playerProfiles.set(playerToken, parsePlayerProfile(socket.handshake.auth));
      socket.on("requestMatches", () => socket.emit("matchList", this.mapLabelList));
      socket.on("requestStatus", () =>
        socket.emit("playerStatus", this.getPlayerStatus(playerToken)));
      socket.on("joinMatch", (matchId: string, hero: string) =>
        this.joinMatch(playerToken, socket, matchId, hero));
      socket.on("leaveMatch", () => this.leaveMatch(playerToken));
      socket.on("abandonMatch", () => this.abandonMatch(playerToken));
      socket.on("disconnect", () => this.scheduleDisconnect(playerToken, socket.id));
      next();
    });
  }

  private sendResultToPlayers(matchId: string, result: GameResult) {
    const match = this.matches.get(matchId);
    if (!match) return;
    match.playersMap.forEach((_localId, playerId: string) => {
      const socketId = this.playerSocket.get(playerId);
      if (!socketId) return;
      const playerResult: PlayerMatchResult = {
        ...result,
        players: result.players.map(({ id, ...stats }) => ({
          ...stats,
          ...match.getProfile(id),
          isSelf: id === playerId,
        })),
      };
      this.network.ioSock.to(socketId).emit("matchResult", playerResult);
    });
  }

  private fillMatchFromQueue(match: Match) {
    const queue = this.queueJoin.get(match.mapConfig.label) as Map<string, string>;
    while (queue.size > 0 && match.hasSlots())
    {
      const hero = queue.values().next().value as string;
      const playerId = queue.keys().next().value as string;
      const socketId = this.playerSocket.get(playerId);
      if (socketId)
        this.addPlayerToMatch(playerId, socketId, match, hero);
      queue.delete(playerId);
    }
  }

  private scheduleDisconnect(playerId: string, socketId: string) {
    this.leaveMatch(playerId);
    this.clearDisconnectTimer(playerId);
    this.disconnectTimers.set(playerId, setTimeout(() =>
    {
      if (this.playerSocket.get(playerId) === socketId)
        this.disconnect(playerId);
      this.disconnectTimers.delete(playerId);
    }, this.config.server.timeout));
  }

  private clearDisconnectTimer(playerId: string) {
    const timer = this.disconnectTimers.get(playerId);
    if (timer)
      clearTimeout(timer);
    this.disconnectTimers.delete(playerId);
  }

  private readConfig()
  {
    const configFileName = PUBLIC_FOLDER + "/config/config.json";
    var confString = readFileSync(configFileName, "utf-8");
    this.config = JSON.parse(confString) as GameConstructData;
    this.config.characters.forEach((char: PlayerConfig) =>
    {
      confString = readFileSync(PUBLIC_FOLDER + char.data.fileName, "utf-8");
      Parsers.parseCharacter(char, JSON.parse(confString));
    });
    this.config.gameObjects.forEach((obj: ObjectConstructData) =>
    {
      if (!obj.data)
        return;
      confString = readFileSync(PUBLIC_FOLDER + obj.data.fileName, "utf-8");
      Parsers.parseGameObject(obj, JSON.parse(confString));
    });
    //parse the maps last
    this.config.maps.forEach((map: GameMap) =>
    {
      confString = readFileSync(PUBLIC_FOLDER + map.data.fileName, "utf-8");
      Parsers.parseMap(this.config, map, JSON.parse(confString));
    });
    this.config.server.frameTime = 1000 / (this.config.server.fps ?? 60);
  }

  private getMatchByPlayerId(playerId: string): Match | undefined
  {
    const matchId = this.playerMatch.get(playerId);
    if (matchId === undefined)
      return undefined;
    return this.matches.get(matchId);
  }
}
