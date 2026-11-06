import type { PlayerConfig } from "../gameobjects/Player";
import type { ObjectConstructData } from "./Constructors";

export const DF_PORT: number = 3000;
export const DF_USERNAME: string = "Guest";
export const DF_FPS: number = 60;
export const DF_LOOKAHEAD: number = 10;
export const DF_LOOKBACK: number = 60;

export interface IFile {
  label: string;
  fileName: string;
}

export interface GameMap
{
  label:string,
  title: {lang: string, title: string}[],
  data: IFile,
  mapImage: IFile,
  background: IFile,
  backLayers: IFile[],
  thumb: IFile,
  worldConfig: any
}

export interface GameConstructData {
  maps: GameMap[];
  characters: PlayerConfig[];
  gameObjects: ObjectConstructData[];
  audio: IFile[];
  server: any;
}
