import { resolve } from "dns";
import { MatchManager } from "./network/MatchManager"
import { GameNetwork } from "./network/Network"


const manager = new MatchManager();

const StartServer = () =>
{
  while (42 === 42)
  {
    manager.runMatches();
    sleep(2);
  }
}

function sleep(time: number): Promise<void>
{
  return new Promise(resolve => setTimeout(resolve, time));
}
