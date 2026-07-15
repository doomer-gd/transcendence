import { GameObject, Transform } from "@/game_server/gameplay/GameObject";
import { Body } from "matter";
import { IPlayerStats } from "@/game_user/player/Player";
import { EventEmitter } from 'eventemitter3'
import { Constructors } from "../../game_common/utility/Constructors";

export interface Hitbox
{
  height: number,
  width: number,
  xOffset: number,
  yOffset: number,
  feetHeight: number,
  options?: any
}

export interface PlayerConfig
{
  label: string,
  fileName: string,
  frames: any[],
  hitbox: Hitbox,
  stats?: IPlayerStats
}

export class Player extends GameObject
{
  events: EventEmitter;
  controller: any; //playermover class
  stats: IPlayerStats;

  constructor(id: number, config: PlayerConfig)
  {
    const body: Body = Constructors.constructBodyWithFeet(config.hitbox);
    super(id,{x:0, y:0}, config.label, body);
    this.stats = config.stats ?? Constructors.getPlaceholderStats();
  }
}
