
export class Queue <T>
{
  private cells: T[][];
  readonly size: number;
  private index: number;
  private tick: number;

  constructor(size: number)
  {
    this.size = size;
    this.index = 0;
    this.tick = 0;
    this.cells = new Array<Array<T>>(this.size);
    for (let i = 0; i < this.size; i++)
      this.cells[i] = new Array<T>();
  }

  private convertTick(tick: number): number
  {
    tick -= this.tick;
    if (tick >= this.size || tick < 0)
      return -1;
    tick += this.index;
    if (tick >= this.size)
      tick -= this.size;
    return tick;
  }

  push(tick: number, element: T)
  {
    tick = this.convertTick(tick);
    if (tick < 0)
      return ;
    this.cells[tick].push(element);
  }

  pop(): T[]
  {
    const elements = Array.from(this.cells[this.index]);
    this.cells[this.index] = [];
    this.index++;
    if (this.index >= this.size)
      this.index -= this.size;
    this.tick++;
    return elements;
  }

  getElement(tick: number): T[]
  {
    tick = this.convertTick(tick);
    if (tick < 0)
      return [];
    return this.cells[tick];
  }

  debugTick()
  {
    return this.tick;
  }
}
