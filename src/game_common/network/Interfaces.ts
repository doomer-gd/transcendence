import { Server, Socket } from "socket.io";
import { Socket as ClientSocket } from "socket.io-client";
import { Snapshot } from "../gameplay/Simulation";
import { EPlayerActionTypes } from "../gameobjects/Player";
import { GameResult, PlayerResult } from "@/game_server/gameplay/ServerSimulation";

export interface PlayerInput {
  id: number;
  x?: number;
  jump?: boolean;
  action?: EPlayerActionTypes;
}

export interface ObjectState {
  id: number;
  x: number;
  y: number;
  [key: string]: any;
}

export interface MatchData {
  id: string;
  plCur: number;
  plMax: number;
  isReady: boolean;
}

export enum EPlayerGameStatus {
  offline,
  connectingServer,
  game,
  queue,
  ready,
}

export interface IPlayerGameParams {
  state: EPlayerGameStatus;
  hero?: string;
  map?: string;
}

type AnnounceFrag = { type: "frag"; data: { id: number; author: number } };
type AnnounceDead = { type: "dead"; data: { id: number } };
type AnnounceLeft = { type: "left"; data: { id: number } };
type AnnounceReconnected = { type: "recon"; data: { id: number } };
type AnnounceAbandoned = { type: "abandoned"; data: { id: number } };
type AnnounceStart = { type: "start" };
type AnnounceEnd = { type: "end" };

export type AnnounceEvent =
  | AnnounceDead
  | AnnounceFrag
  | AnnounceStart
  | AnnounceEnd
  | AnnounceLeft
  | AnnounceAbandoned
  | AnnounceReconnected;

// PlayerResult.id is the player's login token, so clients get an isSelf flag instead.
export interface PlayerProfile {
  userId: string | null;
  username: string;
}

export interface PlayerMatchResult extends Omit<GameResult, "players"> {
  players: Array<
    Omit<PlayerResult, "id"> & PlayerProfile & { isSelf: boolean }
  >;
}

export interface GameServerEvents {
  gameReady: (snap: Snapshot, nickList: [string, number][]) => void;
  joinStatus: (status: number) => void;
  playerStatus: (status: IPlayerGameParams) => void;
  playerInfo: (snap: Snapshot, id: number) => void;
  playerSpawn: (playerId: string, data: any) => void;
  snapShot: (snapshot: Snapshot) => void;
  matchList: (maps: string[]) => void;
  gamePause: (tick: number, isPaused: boolean) => void;
  announce: (event: AnnounceEvent) => void;
  scores: (scores: [number, number, number][]) => void;
  matchResult: (result: PlayerMatchResult) => void;
}

export interface GameClientEvents {
  selectHero: (label: string) => void;
  input: (tick: number, data: PlayerInput) => void;
  playerLoading: () => void;
  playerReady: () => void;
  requestMatches: () => void;
  requestStatus: () => void;
  joinMatch: (map: string, hero: string) => void;
  leaveMatch: () => void;
  abandonMatch: () => void;
}

export interface ManagerEvents {
  worldConstructed: (id: string) => void;
  matchReady: (id: string) => void;
  matchEnded: (id: string, result: GameResult) => void;
  frag: (id: number, author: number) => void;
}

export type GameServer = Server<GameClientEvents, GameServerEvents>;
export type ServerSocket = Socket<GameClientEvents, GameServerEvents>;
export type PlayerSocket = ClientSocket<GameServerEvents, GameClientEvents>;
