import { Server, Socket } from "socket.io";
import { Socket as ClientSocket } from "socket.io-client";

export interface PlayerInput
{
  x?: number,
  jump?: boolean,
  action?: number
}

export interface ObjectState {
  id: number,
  pos: {x: number, y: number},
  [key: string]: any
}

export interface MatchData {
  id: string,
  plCur: number,
  plMax: number,
  isReady: boolean
}

export interface GameServerEvents
{
  gameReady: () => void,
  requestHero: () => void,
  playerDied: (playerId: string) => void,
  playerSpawn: (playerId: string, data: any) => void,
  snapShot: (tick: number, items: ObjectState[]) => void,
  matchList: (matches: MatchData[]) => void
}

export interface GameClientEvents
{
  selectHero: (label: string) => void,
  input: (data: PlayerInput) => void,
  playerReady: () => void,
  requestMatches: () => void,
  joinMatch: (matchId: string) => void,
  leaveMatch: () => void
}

export interface ManagerEvents
{
  matchReady: (id: string) => void,
  matchEnded: (id: string) => void
}

export type GameServer = Server<GameClientEvents, GameServerEvents>;
export type ServerSocket = Socket<GameClientEvents, GameServerEvents>;
export type PlayerSocket = ClientSocket<GameServerEvents, GameClientEvents>;
