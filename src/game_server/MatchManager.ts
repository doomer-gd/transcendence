import { randomUUID } from 'crypto';
import { Server } from 'socket.io';
import { Match } from './Match';
import { Player } from '@/game_user/player/Player';
import { Timer } from './Timer';


const frameTime: number = 1000/60;

export class MatchManager{
  ioSock: Server;
  private matches: Map<string, Match>;
  private playerMatch: Map<string , string>;
  private timer: Timer;

  constructor (ioSock: Server)
  {
    this.ioSock = ioSock;
    this.matches = new Map<string, Match>();
    this.playerMatch = new Map<string, string>();
    this.timer = new Timer;
  }

  createMatch()
  {
    const matchId: string = randomUUID();
    const match = new Match(matchId);
    this.matches.set(matchId, match);
  }

  destroyMatch(matchId: string)
  {
    const match = this.matches.get(matchId);
    if (!match)
      return ;
    match.players.forEach((player, key: string) => {this.playerMatch.delete(key)}, this);
    match.destroy();
    this.matches.delete(matchId);
    //set each player's matchId to 0
  }

  runMatches()
  {
    this.timer.updateDeltaTime();
    while (this.timer.checkTick(frameTime))
    {
      this.matches.forEach((match: Match) => {match.update()});
    }
  }

  joinPlayer(playerId: string, matchId: string): boolean
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
    if (!match)
    {
      this.playerMatch.delete(playerId);
      return ;
    }
    match.removePlayer(playerId);
    this.playerMatch.delete(playerId);
  }

}
