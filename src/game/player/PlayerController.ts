import * as Phaser from 'phaser';


interface KeyMap
{
	UP: Phaser.Input.Keyboard.Key | undefined,
	DOWN: Phaser.Input.Keyboard.Key | undefined,
	LEFT: Phaser.Input.Keyboard.Key | undefined,
	RIGHT: Phaser.Input.Keyboard.Key | undefined,
	JUMP: Phaser.Input.Keyboard.Key | undefined,
	ATTACK: Phaser.Input.Keyboard.Key | undefined
}


export class PlayerController extends Phaser.Events.EventEmitter
{
  private keyMap: KeyMap;
  private scene: Phaser.Scene;
  private player: Phaser.Events.EventEmitter;

  constructor (scene: Phaser.Scene, player: Phaser.Events.EventEmitter, keyMapName: string)
  {
    super();
    this.scene = scene;
    this.player = player;
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
        ATTACK: this.scene.input.keyboard?.addKey(keyConfig.ATTACK?.toUpperCase() || 'F')
    }
  }

  setUpListen ()
  {
    this.keyMap.LEFT?.on('down', this.handleMoveKeyDown, this);
    this.keyMap.RIGHT?.on('down', this.handleMoveKeyDown, this);
    this.keyMap.JUMP?.on('down', this.handleMoveKeyDown, this);
    this.keyMap.ATTACK?.on('down', () => {this.player.emit("attack", 1);});
    this.keyMap.LEFT?.on('up', this.handleMoveKeyUp, this);
    this.keyMap.RIGHT?.on('up', this.handleMoveKeyUp, this);
  }

  handleMoveKeyDown(keyPressed: Phaser.Input.Keyboard.Key)
  {
    switch (keyPressed){
      case this.keyMap.LEFT:
        this.player.emit('move', -1);
        break;
      case this.keyMap.RIGHT:
        this.player.emit('move', 1);
        break;
      case this.keyMap.JUMP:
        this.player.emit('jump');
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
    this.player.emit('move', vector);
  }

  destroy ()
  {
    this.scene.input.keyboard?.removeAllKeys();
    this.removeAllListeners();
  }

}
