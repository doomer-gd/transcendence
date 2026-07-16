import { Server, Socket } from "socket.io";
import { Socket as ClientSocket } from "socket.io-client";

export interface PlayerInput
{
  x?: number,
  jump?: boolean,
  action?: number
}

export interface GameServerEvents
{
  gameReady: () => void,
  requestHero: () => void,
  playerDied: (playerId: string) => void,
  playerSpawn: (playerId: string, data: any) => void
}

export interface GameClientEvents
{
  selectHero: (label: string) => void,
  input: (data: PlayerInput) => void,
  playerReady: () => void
}

export type GameServer = Server<GameClientEvents, GameServerEvents>;
export type ServerSocket = Socket<GameClientEvents, GameServerEvents>;
export type PlayerSocket = ClientSocket<GameServerEvents, GameClientEvents>;
