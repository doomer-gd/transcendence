

export class RetroQueue<T>
{
  private data: Map<number, T>;
  private keyArray: Array<number>;
  private readonly maxSize: number;

  constructor(size: number)
  {
    this.maxSize = size;
    this.data = new Map<number, T>();
    this.keyArray = new Array<number>();
  }

  push(tick: number, item: T)
  {
    if (this.keyArray.length > 0 && this.keyArray[this.keyArray.length - 1] > tick)
      return ;
    if (!this.data.has(tick))
      this.keyArray.push(tick);
    this.data.set(tick, item);
    if (this.keyArray.length > this.maxSize)
      this.clearLast();
  }

  get(tick: number): T | undefined
  {
    return this.data.get(tick);
  }

  back(): [number, T] | undefined
  {
    if (this.keyArray.length === 0)
      return undefined;
    let value = this.data.get(this.keyArray[0]);
    return [this.keyArray[0], value!];
  }

  front(): [number, T] | undefined
  {
    if (this.keyArray.length === 0)
      return undefined;
    let key = this.keyArray[this.keyArray.length - 1];
    return [key, this.data.get(key)!];
  }

  clearBefore(tick: number)
  {
    while (this.keyArray.length > 0 && this.keyArray[0] < tick)
      this.clearLast();
  }

  size(): number
  {
    return this.keyArray.length;
  }

  debugArray()
  {
    return [this.keyArray[0], this.data];
  }

  private clearLast()
  {
    if (this.keyArray.length === 0)
      return ;
    let key = this.keyArray.shift();
    this.data.delete(key!);
  }
}
