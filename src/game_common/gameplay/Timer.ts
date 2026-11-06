export class Timer
{
  private lastUpdateTime: number;
  private currentTime: number;
  private accumulated: number;
  readonly fixedDelta: number;
  public delta: number;

  constructor (fixedDelta: number)
  {
    this.fixedDelta = fixedDelta;
    this.delta = fixedDelta;
    this.refresh();
  }

  refresh()
  {
    this.currentTime = performance.now();
    this.lastUpdateTime = this.currentTime;
    this.accumulated = 0;
  }

  updateDeltaTime()
  {
    this.currentTime = performance.now();
    this.accumulated += this.currentTime - this.lastUpdateTime;
    this.lastUpdateTime = this.currentTime;
  };

  checkTick(): boolean
  {
    if (this.delta > this.accumulated)
      return false;
    this.accumulated -= this.delta;
    return true;
  }

  setDelay(delay: number)
  {
    this.delta = delay;
  }
}
