
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
  private velocity: Phaser.Types.Math.Vector2Like;

  constructor (scene_: Phaser.Scene, keyMapName: string)
  {
    super();
    this.scene = scene_;
    const keyConfig = JSON.parse(keyMapName);
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
    this.keyMap.LEFT?.on('up', this.handleMoveKeyUp, this);
    this.keyMap.RIGHT?.on('up', this.handleMoveKeyUp, this);
  }

  handleMoveKeyDown(keyPressed: Phaser.Input.Keyboard.Key)
  {
    switch (keyPressed){
      case this.keyMap.LEFT:
        this.velocity.x += -1;
        this.emit('move', this.velocity.x);
        break;
      case this.keyMap.RIGHT:
        this.velocity.x += 1;
        this.emit('move', this.velocity.x);
        break;
      case this.keyMap.JUMP:
        this.emit('jump');
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
    this.emit('move', vector);
  }

  destroy ()
  {
    this.scene.input.keyboard?.removeAllKeys();
    this.removeAllListeners();
  }

}
