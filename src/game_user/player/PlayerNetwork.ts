import { PlayerSocket } from "@/game_common/network/Interfaces";
import { io } from "socket.io-client";


export class PlayerNetwork
{
  sock: PlayerSocket;
  isReady: boolean;

  constructor ()
  {
    this.sock = io("http://localhost:3000"); // placeholder
    this.isReady = false;
  };

  connect(address: string)
  {
    if (this.sock)
      this.sock.disconnect();
    this.sock = io(address);
  }

  setUpListen()
  {
    this.sock.on("requestHero", () => {
      this.sock.emit("selectHero", "wizard"); //placeholder
    });
    this.sock.on("gameReady", () => {
      console.log("Starting game");
      this.isReady = true;
    })
  }

}
