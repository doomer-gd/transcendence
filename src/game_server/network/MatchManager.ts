import { randomUUID } from 'crypto';
import { Match } from '../gameplay/Match';
import { Timer } from './Timer';
import { PlayerConfig } from '@/game_server/gameplay/Player';
import { existsSync, readFileSync } from 'fs';
import { GameNetwork } from './Network';
import path from 'path';
import EventEmitter from 'eventemitter3';
import { MatchData, ServerSocket } from '@/game_common/network/Interfaces';

const DF_PORT: number = 3000;
const DF_FRAME_TIME: number = 1000/60;
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
  private timer: Timer;
  private config: GameConstructData;
  events: EventEmitter;

  constructor ()
  {
    this.config = {maps: [], characters: [], server: {}};
    this.readConfig();
    this.network = new GameNetwork(this.config.server.port ?? DF_PORT);
    this.matches = new Map<string, Match>();
    this.playerMatch = new Map<string, string>();
    this.timer = new Timer(this.config.server.frameTime ?? DF_FRAME_TIME);
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
    console.log(mapConfig);
    if (!mapConfig)
      return false;
    const matchId: string = randomUUID();
    const match = new Match(matchId, mapConfig.worldConfig, this.config.characters, this.network);
    this.matches.set(matchId, match);
  }

  destroyMatch(matchId: string)
  {
    const match = this.matches.get(matchId);
    if (!match)
      return ;
    match.playersMap.forEach((player, key: string) => {this.playerMatch.delete(key)}, this);
    match.destroy();
    this.matches.delete(matchId);
    //set each player's matchId to 0
  }

  runMatches()
  {
    this.timer.updateDeltaTime();
    while (this.timer.checkTick())
    {
      this.matches.forEach((value: Match) => {value.update(this.timer.fixedDelta)});
    }
  }

  joinMatch(playerId: string, matchId: string): boolean
  {
    const match = this.matches.get(matchId);
    if (!match)
      return false;
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
    const meta = JSON.parse(confString);
    meta.maps.forEach((label: string, fileName:string) =>
    {
      if (!existsSync(PUBLIC_FOLDER + fileName))
        return ;
      confString = readFileSync(PUBLIC_FOLDER + fileName, "utf-8");
      this.config.maps.push(JSON.parse(confString));
    })
    meta.characters.forEach((label: string, fileName:string) =>
    {
      if (!existsSync(PUBLIC_FOLDER + fileName))
        return ;
      confString = readFileSync(PUBLIC_FOLDER + fileName, "utf-8");
      this.config.characters.push(JSON.parse(confString));
    })
    this.config.server = meta.server;
    this.config.server.frameTime = 1000 / (this.config.server.fps ?? 60);
    console.log("maps:", this.config.maps.length);
    console.log("chars:", this.config.characters.length);
  }
}
