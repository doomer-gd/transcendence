import { resolve } from "dns";
import { MatchManager } from "./network/MatchManager"
import { GameNetwork } from "./network/Network"


const manager = new MatchManager();
const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time));

export async function StartServer(): Promise<void>
{
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  while (42 === 42)
  {
    manager.runMatches();
    await sleep(10);
  }
}

StartServer();

