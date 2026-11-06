

export class EventQueue<T>
{
  private keys: Array<number>;
  private map: Map<number, T[]>;
  private memoryLimit: number;

  constructor(memoryLimit: number)
  {
    this.memoryLimit = memoryLimit;
    this.keys = new Array<number>();
    this.map = new Map<number, T[]>();
  }

  add(key: number, value: T)
  {
    const slot = this.map.get(key);
    if (slot !== undefined)
      slot.push(value);
    else
    {
      this.keys.push(key);
      this.map.set(key, [value]);
    }
  }

  get(key: number)
  {
    return this.map.get(key);
  }

  clean(now: number)
  {
    now -= this.memoryLimit;
    if (this.keys.length === 0)
      return ;
    let index = 0;
    while (this.keys[index] < now)
    {
      this.map.delete(this.keys[index]);
      index++;
    }
    this.keys.splice(0, index);
  }



}
