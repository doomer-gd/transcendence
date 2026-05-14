import { Scene } from 'phaser'
import { KeyboardEvent } from 'react';

interface KeyMap
{
	UP: Phaser.Input.Keyboard.Key | undefined,
	DOWN: Phaser.Input.Keyboard.Key | undefined,
	LEFT: Phaser.Input.Keyboard.Key | undefined,
	RIGHT: Phaser.Input.Keyboard.Key | undefined,
	JUMP: Phaser.Input.Keyboard.Key | undefined,
	ATTACK: Phaser.Input.Keyboard.Key | undefined
}


export class Control
{
  private keyMap: KeyMap;
  private scene: Phaser.Scene;
  private velocity: Phaser.Types.Math.Vector2Like;

  constructor (scene_: Phaser.Scene, keyMapName: string)
  {
    this.scene = scene_;
    const keyConfig = JSON.parse(keyMapName);

    this.scene.input.keyboard?.on('keydown-' + this.keyMap.LEFT, this.handleMoveKey, this);
    this.scene.input.keyboard?.on('keydown-' + this.keyMap.UP, this.handleMoveKey, this);

  }

  convertKeys( keyConfig: any )
  {
    this.keyMap = {
        UP: this.scene.input.keyboard?.addKey(keyConfig.UP?.toUpperCase() || 'W'),
        DOWN: this.scene.input.keyboard?.addKey(keyConfig.DOWN?.toUpperCase() || 'S'),
        LEFT: this.scene.input.keyboard?.addKey(keyConfig.LEFT?.toUpperCase() || 'A'),
        RIGHT: this.scene.input.keyboard?.addKey(keyConfig.RIGHT?.toUpperCase() || 'D'),
        JUMP: this.scene.input.keyboard?.addKey(keyConfig.JUMP?.toUpperCase() || 'SPACE'),
        ATTACK: this.scene.input.keyboard?.addKey(keyConfig.ATTACK?.toUpperCase() || 'F')
    }

  }
  handleMoveKey(keyPressed: Phaser.Input.Keyboard.Key)
  {
    if (keyPressed === this.keyMap.LEFT)
      this.velocity.x = -1;

  };




}
