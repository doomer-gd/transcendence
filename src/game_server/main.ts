import { MatchManager } from "./network/MatchManager"

const showDelay = false;
const manager = new MatchManager();

export async function StartServer(): Promise<void>
{
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  let start = 1;
  let sum = 0;
  while (42 === 42)
  {
    const frame = manager.update();
    if (showDelay)
      printDelay(start, sum, frame);
    await sleep(0);
  }

  function printDelay(start: number, sum: number, frame: number)
  {
    sum += frame * 1000;
    process.stdout.write("\r\x1b[K");
    process.stdout.write((sum / start).toString().slice(0, 4));
    start++;
  }
}

StartServer();

