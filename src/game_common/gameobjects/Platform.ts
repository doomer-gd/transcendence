import Matter, { Bodies, Body, Composite } from "matter-js";
import { GameObject, GameObjectType, IObjectState } from "./GameObject";
import { CollisionMasks, CollisionTypes, Hitbox, MatterData, ObjectConstructData } from "../utility/Constructors";
import { IFile } from "../utility/SharedConfig";
import { GameEvents } from "../gameplay/Simulation";


export interface IPlatformConfig extends ObjectConstructData
{
  hitbox: Hitbox,
  image:  IFile,
  data:   IFile,
  params: IPlatformState
}

export interface IPlatformState extends IObjectState
{
  points:           Matter.Vector[];
  velocity:         Matter.Vector;
  periodTicks:      number;
  endTick:          number;
  isYoyo:           boolean;
  forward:          boolean;
}



export class MovingPlatform extends GameObject
{
  matter:       MatterData;
  events:       GameEvents;
  body:         Body;
  hitbox:       Hitbox;
  state:        IPlatformState;



  constructor(id: number, config: IPlatformConfig, matter: MatterData, events: GameEvents)
  {
    super(id, GameObjectType.movingObstacle, config.label);
    this.hitbox = config.hitbox;
    this.matter = matter;
    this.events = events;
    this.body = Bodies.rectangle(-1000, -1000, this.hitbox.width, this.hitbox.height, {...this.hitbox.options,
      collisionFilter: {category: CollisionTypes.solid, mask: CollisionMasks.solid}, label: 'ground', isStatic: true});
    this.state = {hp: 1, facing: 1, points: [], isYoyo: false, periodTicks: 1, endTick: 1, forward: true, velocity: {x: 0, y: 0}};
    this.body.plugin.gameObject = this;
  }

  launch(params: IPlatformState)
  {
    if (params.periodTicks <= 0 || params.points.length !== 2)
      return ;
    this.state.points = params.points;
    this.state.periodTicks = params.periodTicks;
    this.state.isYoyo = params.isYoyo;
    const direction = Matter.Vector.sub(params.points[1], params.points[0]);
    this.state.velocity = Matter.Vector.div(direction, params.periodTicks);
    this.state.endTick = this.matter.tick + this.state.periodTicks;
    Body.setPosition(this.body, params.points[0]);
  }

  update()
  {
    if (this.matter.tick < this.state.endTick)
    {
      Body.setPosition(this.body, Matter.Vector.add(this.body.position, this.state.velocity));
      return;
    }
    if (!this.state.isYoyo)
    {
      this.events.emit("destroy", this.id);
      return ;
    }
    this.state.velocity = Matter.Vector.mult(this.state.velocity, -1);
    this.state.endTick = this.matter.tick + this.state.periodTicks;
    if (this.state.forward)
      Body.setPosition(this.body, this.state.points[1]);
    else
      Body.setPosition(this.body, this.state.points[0]);
    this.state.forward = this.state.forward !== true;
  }

  destroy()
  {
    Composite.remove(this.matter.world, this.body);
  }
}
