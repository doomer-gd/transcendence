

export class ScoreMap
{
  private scores: Map<number, [number, number]>;
  private array: Array<[number, number, number]>;

  constructor()
  {
    this.scores = new Map<number, [number, number]>();
    this.array = new Array<[number, number, number]>();
  }

  get(id: number): [number, number] | undefined
  {
    return this.scores.get(id);
  }

  has(id: number): boolean
  {
    return this.scores.has(id);
  }

  set(id: number, score: [number, number]): void
  {
    const existing = this.array.find((player) => player[0] === id);
    if (!existing)
      this.array.push([id, score[0], score[1]]);
    else
    {
      existing[1] = score[0];
      existing[2] = score[1];
    }
    this.scores.set(id, score);
    this.array.sort((a, b) => b[1] - a[1] || a[2] - b[2]);
  }

  delete(id: number): boolean
  {
    const existed = this.scores.delete(id);
    if (existed)
      this.array = this.array.filter(([playerId]) => playerId !== id);
    return existed;
  }

  clear(): void
  {
    this.scores.clear();
    this.array.length = 0;
  }

  getValues(): Array<[number, number, number]>
  {
    return this.array;
  }

  hasWinner(): boolean
  {
    if (this.array.length === 1)
      return true;
    if (this.array.length > 1 && this.array[0][1] > this.array[1][1])
      return true;
    return false;
  }
}
