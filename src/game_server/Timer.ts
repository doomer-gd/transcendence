export class Timer
{
  private lastUpdateTime: number;
  private currentTime: number;
  private accumulated: number;

  constructor ()
  {
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

  checkTick(dt: number): boolean
  {
    if (dt > this.accumulated)
      return false;
    this.accumulated -= dt;
    return true;
  }
}
