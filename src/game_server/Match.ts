import Matter, { Engine, World, Bodies, Body, Runner} from "matter-js";

class PlayerPlaceHolder {};

const fixedDelta: number = 1000/60;

export class Match {

  private engine: Engine;
  private world: World;
  private runner: Runner;
  private isActive: boolean;
  tick: number;
  id: string;
  players: Map<string, PlayerPlaceHolder>;

  constructor(id: string) {
    this.id = id;
    this.engine = Engine.create({
      gravity: { y: 3, x: 0 }
      });
    this.world = this.engine.world;
    this.constructWorld();
    this.runner = Runner.create();
    this.players = new Map<string, PlayerPlaceHolder>();
    this.isActive = false;
    this.tick = 0;
  }

  startMatch() {
    this.isActive = true;
  }

  update(){
    if (!this.isActive)
      return ;
    Runner.tick(this.runner,this.engine, fixedDelta);
    this.tick++;
    console.log("tick:", this.tick);
  }

  private constructWorld(){

  }

  addPlayer(playerId: string){};
  removePlayer(playerId: string){};

  destroy(){ return };

}
