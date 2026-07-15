import { randomUUID } from 'crypto';
import { Server } from 'socket.io';
import { Match } from '../gameplay/Match';
import { Timer } from './Timer';
import { PlayerConfig } from '@/game_server/gameplay/Player';
import { existsSync, readFileSync } from 'fs';
import { PUBLIC_FOLDER } from './GameServer';


export interface GameConstructData
{
  maps: GameMap[],
  characters:PlayerConfig[],
}

export interface GameMap
{
  label:string,
  fileName: string,
  worldConfig: any
}

export interface GameEvents
{
  joinMatch: (matchId: string) => void,
  selectHero: (label: string) => void,
  playerDied: (playerId: string) => void,
  playerSpawn: (playerId: string, data: any) => void
}

const frameTime: number = 1000/60;

export class MatchManager{
  ioSock: Server<GameEvents>;
  private matches: Map<string, Match>;
  private playerMatch: Map<string, string>;
  private timer: Timer;
  private config: GameConstructData;

  constructor (ioSock: Server)
  {
    this.ioSock = ioSock;
    this.matches = new Map<string, Match>();
    this.playerMatch = new Map<string, string>();
    this.timer = new Timer;
    this.readConfig();
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
  }

  createMatch(label: string)
  {
    const mapConfig = this.config.maps.find((value) => value.label === label);
    if (!mapConfig)
      return false;
    const matchId: string = randomUUID();
    const match = new Match(matchId, mapConfig, this.config.characters, this.ioSock);
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
    while (this.timer.checkTick(frameTime))
    {
      this.matches.forEach((value: Match) => {value.update()});
    }
  }

  joinPlayer(playerId: string, matchId: string, character: string): boolean
  {
    const match = this.matches.get(matchId);
    if (!match)
      return false;
    if (this.playerMatch.get(playerId))
      return false;
    match.addPlayer(playerId);
    this.playerMatch.set(playerId, matchId);
    return true;
  }

  disconnectPlayer(playerId: string)
  {
    const matchId = this.playerMatch.get(playerId);
    if (!matchId)
      return ;
    const match = this.matches.get(matchId);
    if (match)
      match.removePlayer(playerId);
    this.playerMatch.delete(playerId);
  }
}
