import { randomUUID } from 'crypto';
import { Match } from '../gameplay/Match';
import { Hitbox, PlayerConfig } from '../gameplay/Player';
import { existsSync, readFileSync } from 'fs';
import { GameNetwork } from './Network';
import path from 'path';
import EventEmitter from 'eventemitter3';
import { ManagerEvents, MatchData, ServerSocket } from '../../game_common/network/Interfaces';

export const DF_PORT: number = 3000;
export const DF_FPS: number = 60;
export const PUBLIC_FOLDER = path.resolve("./public");

export interface GameConstructData
{
  maps: GameMap[],
  characters:PlayerConfig[],
  server: any
}

export interface GameMap
{
  label:string,
  fileName: string,
  worldConfig: any
}

export class MatchManager{
  private network: GameNetwork;
  private matches: Map<string, Match>;
  private playerMatch: Map<string, string>;
  private config: GameConstructData;
  events: EventEmitter<ManagerEvents>;

  constructor ()
  {
    this.config = {maps: [], characters: [], server: {}};
    this.readConfig();
    this.network = new GameNetwork(this.config.server.port ?? DF_PORT);
    this.matches = new Map<string, Match>();
    this.playerMatch = new Map<string, string>();
    this.createMatch("cave"); // placeholder
    this.network.ioSock.on("connect", (socket: ServerSocket) =>{
      socket.on("requestMatches", () => this.sendMatchList(socket));
      socket.on("joinMatch", (matchId: string) => this.joinMatch(socket.id, matchId));
      socket.on("leaveMatch", () => this.leaveMatch(socket.id));
      socket.on("disconnect", () => this.leaveMatch(socket.id));
    })
    console.log("manager");
    //EventBus.emit("gameServerReady");
  }

  createMatch(label: string)
  {
    const mapConfig = this.config.maps.find((value) => value.label === label);
    if (!mapConfig)
      return false;
    const matchId: string = randomUUID();
    const match = new Match(matchId, mapConfig.worldConfig, this.config, this.network, this.events);
    this.matches.set(matchId, match);
  }

  destroyMatch(matchId: string)
  {
    const match = this.matches.get(matchId);
    if (!match)
      return ;
    match.playersMap.forEach((player, key: string) => this.playerMatch.delete(key));
    match.destroy();
    this.matches.delete(matchId);
  }

  runMatches()
  {
    this.matches.forEach((value: Match) => {value.update()});
  }

  joinMatch(playerId: string, matchId: string): boolean
  {
    const match = this.matches.get(matchId);
    if (!match || !match.state.isConstructed)
    {
      console.log("join failed");
      return false;
    }
    if (this.playerMatch.get(playerId))
      return false;
    match.addPlayer(playerId);
    this.playerMatch.set(playerId, matchId);
    this.network.joinRoom(playerId, matchId);
    return true;
  }

  leaveMatch(playerId: string)
  {
    const matchId = this.playerMatch.get(playerId);
    if (!matchId)
      return ;
    const match = this.matches.get(matchId);
    if (match){
      match.removePlayer(playerId);
      this.network.leaveRoom(playerId, matchId);
    }
    this.playerMatch.delete(playerId);
  }

  sendMatchList(sock: ServerSocket)
  {
    function converter(match: Match): MatchData{
      return {
        id: match.id,
        plCur: match.playersMap.size,
        plMax: match.mapConfig.playerMax ?? 10,
        isReady: match.state.isConstructed
      }
    }
    const matches: MatchData[] = Array.from(this.matches.values(), (value: Match) => converter(value));
    sock.emit("matchList", matches);
  }

  private readConfig()
  {
    const configFileName = PUBLIC_FOLDER + "/config/config.json";
    if (!existsSync(configFileName))
      throw new Error("Couldn't read game config file.")
    var confString = readFileSync(configFileName, "utf-8");
    this.config = JSON.parse(confString) as GameConstructData;
    this.config.maps.forEach((map: GameMap) =>
    {
      if (!existsSync(PUBLIC_FOLDER + map.fileName))
        return ;
      confString = readFileSync(PUBLIC_FOLDER + map.fileName, "utf-8");
      map.worldConfig = JSON.parse(confString);
    })
    this.config.characters.forEach((char: PlayerConfig) =>
    {
      if (!existsSync(PUBLIC_FOLDER + char.fileName))
        return ;
      confString = readFileSync(PUBLIC_FOLDER + char.fileName, "utf-8");
      const charConf = JSON.parse(confString);
      char.frames = charConf.frames;
      char.hitbox = charConf.gameplay.hitbox as Hitbox;
    })
    this.config.server = this.config.server;
    this.config.server.frameTime = 1000 / (this.config.server.fps ?? 60);
  }
}
