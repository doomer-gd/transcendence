import { GameObject, Transform } from "@/game_server/gameplay/GameObject";
import { Body } from "matter-js";
import { IPlayerStats } from "@/game_user/player/Player";
import { EventEmitter } from 'eventemitter3'
import { Constructors } from "../../game_common/utility/Constructors";
import { MoverSimple } from "@/game_common/gameplay/Mover";
import { MatterData } from "../utils/WorldConstructor";
import { PlayerInput } from "@/game_common/network/Interfaces";

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
  stats: IPlayerStats;
  body: Body;
  matter: MatterData;
  controller: MoverSimple; //playermover class

  constructor(id: number, config: PlayerConfig, matter: MatterData)
  {
    super(id,{x:0, y:0}, config.label);
    this.stats = config.stats ?? Constructors.getPlaceholderStats();
    this.matter = matter;
    this.events = new EventEmitter;
    this.body = Constructors.constructBodyWithFeet(config.hitbox);
    this.body.plugin.gameObject = this;
    this.controller = new MoverSimple(this.body, this.stats, this.matter.engine, this.events);
  }

  applyInput(input: PlayerInput)
  {
    if (input.x)
      this.controller.movePlayer(input.x);
    if (input.jump)
      this.controller.jumpPlayer();
    if (input.action)
      this.controller.actionPlayer(input.action);
  }
}
