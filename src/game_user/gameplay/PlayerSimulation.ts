import { Simulation, SnapObject, Snapshot } from "@/game_common/gameplay/Simulation";
import { PlayerInput } from "@/game_common/network/Interfaces";
import { GameObject, GameObjectType } from "@/game_common/gameobjects/GameObject";
import { GameConstructData, GameMap } from "../../game_common/utility/SharedConfig";
import { Body} from "matter-js";
import { RetroQueue } from "@/game_common/utility/RetroQueue";
import { Animator } from "@/game_common/animation/Animator";

interface SnapState
{
  snap: Snapshot,
  tickTimes: RetroQueue<number>
  lookahead: number,
  lastCorrected: number,
  speedFactor: number,
  isApplied: boolean,
}

const DF_CORRECTION_FRAMES = 10;
const DF_CORRECTION_FACTOR = 0.1 / DF_CORRECTION_FRAMES;

export class PlayerSimulation extends Simulation
{
  private lastInput: PlayerInput;
  private eventsScene?: Phaser.Events.EventEmitter;
  private snaps: SnapState;

  constructor(mapConfig: GameMap, config: GameConstructData, events?: Phaser.Events.EventEmitter)
  {
    super(mapConfig, config);
    this.eventsScene = events;
    this.lastInput = {id:0};
    const size = config.server.lookback;
    this.snaps = {isApplied: true, lookahead: this.config.server.lookahead / 2, snap: {tick:0, snaps: [], idLast: 0}, tickTimes: new RetroQueue<number>(size), lastCorrected: 0, speedFactor: 1};
    this.setAudioEventsListener();
  }

  override onConstructed(): void
  {
    this.eventsScene?.emit("worldConstructed");
  }

  addInput(input: PlayerInput)
  {
    this.lastInput.id = input.id;
    if (input.x !== undefined)
      this.lastInput.x = input.x;
    if (input.jump !== undefined)
      this.lastInput.jump = input.jump;
    if (input.action !== undefined)
      this.lastInput.action = input.action;
  }

  getInput(): PlayerInput | undefined
  {
    const input = this.lastInput;
    this.lastInput = {id:0};
    if (input.x !== undefined || input.jump !== undefined || input.action !== undefined)
      return input;
    return undefined;
  }

  setLastSnap(snapshot: Snapshot)
  {
    if (this.snaps.snap.tick > snapshot.tick)
      return ;
    this.snaps.tickTimes.push(snapshot.tick, performance.now());
    this.snaps.snap = snapshot;
    this.snaps.isApplied = false;
  }

  reconcile()
  {
    if (this.snaps.isApplied)
      return ;
    let lookahead = this.snaps.lookahead;
    let currentTick = this.matter.tick;
    let targetTick = this.snaps.snap.tick + lookahead;
    if (Math.abs(currentTick - targetTick) > lookahead)
      currentTick = targetTick;
    this.matter.tick = this.snaps.snap.tick;
    this.importSnapshot(this.snaps.snap);
    while (this.matter.tick < currentTick)
      this.step();
    this.snaps.isApplied = true;
    if (this.snaps.lastCorrected + this.config.server.lookback < targetTick)
      this.updateDelta(targetTick);
  }

  private updateDelta(targetTick: number)
  {
    this.snaps.lastCorrected = this.matter.tick;
    const front = this.snaps.tickTimes.front();
    const back  = this.snaps.tickTimes.back();
    if (front![0] <= back![0])
      return ;
    let delta = (front![1] - back![1]) / (front![0] - back![0]);
    const error = this.matter.tick - targetTick;
    const lookback = this.config.server.lookback;
    delta *= (lookback + error) / lookback;
    this.matter.timer.setDelay(delta);
  }

  importSnapshot(snapshot: Snapshot)
  {
    //adding missing items
    for (const item of snapshot.snaps)
    {
      let gameObject = this.matter.dynamics.get(item.id);
      if (gameObject && (gameObject.type !== item.type || gameObject.label !== item.label))
      {
        this.factory.remove(item.id);
        gameObject = undefined;
      }
      if (!gameObject)
      {
        gameObject = this.factory.insert(item.id, item.type, item.label);
        this.eventsGame.emit("spawn", item.id);
      }
      if (!gameObject)
        continue ;
      this.applySnap(gameObject, item);
      gameObject.lastTick = snapshot.tick;
    }
    //removing items that weren't in the snapshot
    for (const obj of this.matter.dynamics.values())
    {
      if (obj.lastTick !== snapshot.tick)
        this.factory.remove(obj);
    }
    this.matter.idLast = snapshot.idLast;
  }

  private applySnap(obj: GameObject, snap: SnapObject)
  {
    if (obj.body)
    {
      Body.setPosition(obj.body, {x: snap.x!, y: snap.y!});
      Body.setVelocity(obj.body, {x: snap.velX!, y: snap.velY!});
      Body.setAngle(obj.body, snap.angle!);
    }
    Object.assign(obj.state, snap.state);
    if (snap.anim)
      (obj.animator as Animator).setAnim(snap.anim.type, snap.anim.now);
    if (snap.proj)
      Object.assign(obj.params, snap.proj);
  }

  private setAudioEventsListener()
  {
    this.eventsGame?.on("destroy", (id) => this.eventsScene?.emit("soundOnDestroy", id));
  }

  getObjectMap(): Map<number, GameObject>
  {
    return this.matter.dynamics;
  }

  setTick(tick: number)
  {
    this.matter.tick = tick;
    this.snaps.lastCorrected = tick;
  }

  getTimeRemaining(): number
  {
    return Math.ceil((this.params.duration - this.matter.tick) * this.params.inverseFPS);
  }

  refreshTimer()
  {
    this.matter.timer.refresh();
  }

  debugMatter()
  {
    return this.matter;
  }

  offlineAddPlayer(label: string): GameObject | undefined
  {
    return this.factory.create(GameObjectType.player, label);
  }

  override endGame()
  {
    this.matter.isActive = false;
    this.eventsScene?.emit("endGame");
  }
}
