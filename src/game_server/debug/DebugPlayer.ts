
import { io, Socket } from "socket.io-client";
import { PlayerController } from "../../game_user/player/PlayerController";
import { AUTO, Game } from "phaser";


export class DebugPlayer extends Phaser.Events.EventEmitter
{
  scene: Phaser.Scene;
  controller: PlayerController;
  sock: Socket;

  constructor ()
  {
    super();
    const game = new Game({type: AUTO,
      parent: 'game-container',
      backgroundColor: '#028af8',
      scene: {preload: function() {},create: function() {}, update: function() {}}
    });
    this.scene = game.scene.getAt(0);
    this.scene.load.json('keymap', '../../config/keymap.json');
    this.controller = new PlayerController(this.scene, this, 'keymap');

    this.on('move', (dir: number) => {console.log('move'); this.sock.emit("input", {x: dir});});
    this.on('jump', () => this.sock.emit("input", {jump: true}));
    this.on('attack', (type: number) => this.sock.emit("input", {action: type}));
    console.log("Player constructed");
  }

}
