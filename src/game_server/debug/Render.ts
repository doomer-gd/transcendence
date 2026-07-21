import { Render, Engine } from "matter-js";

export class DebugRender
{
  render?: Render;

  constructor(engine: Engine){
    if (typeof document === "undefined")
      return;

    const container = document.getElementById("root") as HTMLElement | null;
    if (!container)
      return;

    this.render = Render.create({
      element: container,
      engine,
      options: {
        width: 1024,
        height: 768,

        wireframes: false,
        background: "#2a2929",

        showBounds: true,
        showVelocity: true,
        showCollisions: true,
        showAxes: true,
        showAngleIndicator: true,
        showIds: true,
        showSleeping: true
      }
    });
    Render.run(this.render);
  }
}
