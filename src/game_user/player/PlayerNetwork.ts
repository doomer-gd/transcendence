import { PlayerSocket } from "../../game_common/network/Interfaces";
import { io } from "socket.io-client";


export class PlayerNetwork
{
  sock: PlayerSocket;
  events: Phaser.Events.EventEmitter;
  isReady: boolean;

  constructor (events: Phaser.Events.EventEmitter)
  {
    this.events = events;
    this.sock = io("http://localhost:3000"); // placeholder
    this.isReady = false;
    this.setUpListen();
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
      this.sock.emit("playerReady");
    });
    this.sock.on("gameReady", () => {
      console.log("Starting game");
      this.isReady = true;
    })
    this.events.on('move', (dir: number) => {console.log('move'); this.sock.emit("input", {x: dir});});
    this.events.on('jump', () => this.sock.emit("input", {jump: true}));
    this.events.on('attack', (type: number) => this.sock.emit("input", {action: type}));
  }

}
