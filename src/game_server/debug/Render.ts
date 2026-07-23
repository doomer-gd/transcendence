import { Body, Render } from "matter-js";
import { constructServerWorld, MatterData } from "../utils/WorldConstructor";
import { io, Socket } from "socket.io-client";

export class DebugRender
{
  render: Render;
  matter: MatterData;
  sock: Socket;
  config: any;

  constructor(container: HTMLElement){
    if (typeof document === "undefined")
      return;

    this.init(container).catch((error) => {
      console.error("DebugRender initialization failed:", error);
    });
  }

  private async init(container: HTMLElement)
  {
    await this.readConfig();

    this.matter = await constructServerWorld(this.config.maps[0].worldConfig);
    this.sock = io("http://localhost:3000");
    this.sock.on("requestHero", () => {
      this.sock.emit("selectHero", "wizard"); //placeholder
      this.sock.emit("playerReady");
    });
    this.sock.on("gameReady", () => {
      console.log("Starting game");
    })

    this.render = Render.create({
      element: container,
      engine: this.matter.engine,
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
    this.sock.emit("requestMatches");
    this.sock.once("matchList", (data: any) => this.sock.emit("joinMatch", data[0].id));

    this.sock.on("snapShot", (_tick: number, snap: any[]) =>{
      console.log("snap", snap);
      snap.forEach((obj: any) => {
        console.log("object", obj);
        Body.setPosition(this.matter.idObjectMap.get(obj.id)?.body, obj.pos);
      });
    });
  }

  private async readConfig()
  {
    const response = await fetch("/config/config.json");
    if (!response.ok)
      throw new Error("Failed to load /config/config.json");

    this.config = await response.json();

    await Promise.all(this.config.maps.map(async (value: any) => {
      const mapResponse = await fetch(value.fileName);
      if (!mapResponse.ok)
        throw new Error(`Failed to load map config: ${value.fileName}`);
      value.worldConfig = await mapResponse.json();
    }));

    await Promise.all(this.config.characters.map(async (value: any) => {
      const charResponse = await fetch(value.fileName);
      if (!charResponse.ok)
        throw new Error(`Failed to load character config: ${value.fileName}`);
      const result = await charResponse.json();
      value.frames = result.frames;
      value.hitbox = result.gameplay?.hitbox;
    }));
  }

  destroy()
  {
  }

}
