import { Body, Engine, Events} from "matter-js";


//Calls of collision with given body
export function onCollisionCallback(
  eventLabel: string,
  engine: Engine,
  body: Body,
  callback: (body: Body) => void)
  {
    Events.on(engine, eventLabel, (event: any) => {
      for (const pair of event.pairs)
      {
        if (pair.bodyA === body)
          callback(pair.bodyB);
        else if (pair.bodyB === body)
          callback(pair.bodyA);
      }
    })
  }

