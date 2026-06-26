import Matter, { Engine, World, Bodies, Body, Runner} from "matter-js";

class PlayerPlaceHolder {};

const fixedDelta: number = 1000/60;

export class Match {

  private engine: Engine;
  private world: World;
  private runner: Runner;
  private isActive: boolean;
  private deltaRemainder: number;
  tick: number;
  id: number;
  players: Map<string, PlayerPlaceHolder>;

  constructor(id: number) {
    this.id = id;
    this.engine = Engine.create({
      gravity: { y: 3, x: 0 }
      });
    this.world = this.engine.world;
    this.runner = Runner.create();
    this.players = new Map<string, PlayerPlaceHolder>();
    this.isActive = false;
    this.tick = 0;
    this.deltaRemainder = 0;
  }

  StartMatch() {
    this.isActive = true;
  }

  Update(dt: number){
    dt += this.deltaRemainder;
    while (dt > fixedDelta && this.isActive)
    {
      Runner.tick(this.runner,this.engine, fixedDelta);
      this.tick++;
      dt -= fixedDelta;
      console.log("tick:", this.tick);
    }
    this.deltaRemainder = dt;
  }

}
