import { EPlayerActionTypes } from '@/game_common/gameobjects/Player';
import * as Phaser from 'phaser';


interface KeyMap
{
	UP: Phaser.Input.Keyboard.Key | undefined,
	DOWN: Phaser.Input.Keyboard.Key | undefined,
	LEFT: Phaser.Input.Keyboard.Key | undefined,
	RIGHT: Phaser.Input.Keyboard.Key | undefined,
	JUMP: Phaser.Input.Keyboard.Key | undefined,
	ATTACK: Phaser.Input.Keyboard.Key | undefined
	SPECIAL: Phaser.Input.Keyboard.Key | undefined
	SECONDARY: Phaser.Input.Keyboard.Key | undefined
	DODGE: Phaser.Input.Keyboard.Key | undefined
  SCORES: Phaser.Input.Keyboard.Key | undefined
}

export interface InputEvents
{
  move: (dir: number) => void,
  jump: () => void,
  action: (type: number) => void
}


export class PlayerController extends Phaser.Events.EventEmitter
{
  private keyMap: KeyMap;
  private scene: Phaser.Scene;
  private events: Phaser.Events.EventEmitter;

  constructor (scene: Phaser.Scene, keyMapName: string)
  {
    super();
    this.scene = scene;
    this.events = scene.events;
    const keyConfig = this.scene.cache.json.get(keyMapName);
    this.convertKeys(keyConfig);
    this.setUpListen();
  }

  convertKeys( keyConfig: any )
  {
    this.keyMap = {
        UP: this.scene.input.keyboard?.addKey(keyConfig.UP?.toUpperCase() || 'W'),
        DOWN: this.scene.input.keyboard?.addKey(keyConfig.DOWN?.toUpperCase() || 'S'),
        LEFT: this.scene.input.keyboard?.addKey(keyConfig.LEFT?.toUpperCase() || 'A'),
        RIGHT: this.scene.input.keyboard?.addKey(keyConfig.RIGHT?.toUpperCase() || 'D'),
        JUMP: this.scene.input.keyboard?.addKey(keyConfig.JUMP?.toUpperCase() || 'SPACE'),
        ATTACK: this.scene.input.keyboard?.addKey(keyConfig.ATTACK?.toUpperCase() || 'F'),
        SECONDARY: this.scene.input.keyboard?.addKey(keyConfig.SECONDARY?.toUpperCase() || 'E'),
        SPECIAL: this.scene.input.keyboard?.addKey(keyConfig.SPECIAL?.toUpperCase() || 'R'),
        DODGE: this.scene.input.keyboard?.addKey(keyConfig.DODGE?.toUpperCase() || 'SHIFT'),
        SCORES: this.scene.input.keyboard?.addKey(keyConfig.SCORES?.toUpperCase() || 'TAB')
    }
  }

  setUpListen ()
  {
    this.keyMap.LEFT?.on('down', this.handleMoveKeyDown, this);
    this.keyMap.RIGHT?.on('down', this.handleMoveKeyDown, this);
    this.keyMap.JUMP?.on('down', this.handleMoveKeyDown, this);
    this.keyMap.LEFT?.on('up', this.handleMoveKeyUp, this);
    this.keyMap.RIGHT?.on('up', this.handleMoveKeyUp, this);
    this.keyMap.ATTACK?.on('down', () => this.events.emit("action", EPlayerActionTypes.melee));
    this.keyMap.SPECIAL?.on('down', () => this.events.emit("action", EPlayerActionTypes.special));
    this.keyMap.SECONDARY?.on('down', () => this.events.emit("action", EPlayerActionTypes.secondary));
    this.keyMap.DODGE?.on('down', () => this.events.emit("action", EPlayerActionTypes.dodge));
    this.keyMap.SCORES?.on('down', () => this.events.emit("scoresVisible", true));
    this.keyMap.SCORES?.on('up', () => this.events.emit("scoresVisible", false));
  }

  handleMoveKeyDown(keyPressed: Phaser.Input.Keyboard.Key)
  {
    switch (keyPressed){
      case this.keyMap.LEFT:
        this.events.emit('move', -1);
        break;
      case this.keyMap.RIGHT:
        this.events.emit('move', 1);
        break;
      case this.keyMap.JUMP:
        this.events.emit('jump');
        break;
    }
  };

  handleMoveKeyUp()
  {
    let vector: number = 0;

    if (this.keyMap.LEFT?.isDown)
      vector = -1;
    if (this.keyMap.RIGHT?.isDown)
      vector = 1;
    this.events.emit('move', vector);
  }

  destroy ()
  {
    this.scene.input.keyboard?.removeAllKeys();
    this.removeAllListeners();
  }

}
