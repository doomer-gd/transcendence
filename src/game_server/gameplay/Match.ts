import Matter, { Engine, World, Bodies, Body, Runner} from "matter-js";
import { Constructors, GameConstructData } from "@/game_common/utility/Constructors";
import { constructServerWorld, MatterData } from "../utils/WorldConstructor";
import * as GameServer from "."
import { GameEvents, GameMap } from "../network/MatchManager";
import { PlayerConfig } from "@/game_server/gameplay/Player";
import { Server } from "socket.io";

const fixedDelta: number = 1000/60;


export class Match {
  private matter: MatterData;
  readonly id: string;
  readonly characterConfig: PlayerConfig[];
  ioSock: Server<GameEvents, GameEvents>;
  isConstructed: boolean;
  playersMap: Map<string, GameServer.Player>;

  constructor(id: string, mapConfig: GameMap, characters: PlayerConfig[], io: Server) {
    this.id = id;
    this.isConstructed = false;
    this.ioSock = io;
    this.characterConfig = characters;
    constructServerWorld(mapConfig, this.matter, this.isConstructed);
  }

  startMatch() {
    this.matter.isActive = true;
  }

  update(){
    if (!this.matter.isActive)
      return ;
    Runner.tick(this.matter.runner,this.matter.engine, fixedDelta);
    this.matter.tick++;
    console.log("tick:", this.matter.tick);
  }

  addPlayer(playerId: string)
  {
    this.ioSock.to(playerId).emit("selectHero","");
    this.ioSock.once("selecthero", (label: string) =>
    {

    })
  };
  removePlayer(playerId: string)
  {

  };

  destroy(){ return };

}
