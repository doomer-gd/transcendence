export class Timer
{
  private lastUpdateTime: number;
  private currentTime: number;
  private accumulated: number;
  readonly fixedDelta: number;

  constructor (fixedDelta: number)
  {
    this.fixedDelta = fixedDelta;
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
    if (this.fixedDelta > this.accumulated)
      return false;
    this.accumulated -= this.fixedDelta;
    return true;
  }
}
