import { Player } from '../player/Player';
import { Scene } from 'phaser';

export class TestScene extends Scene
{
	background: Phaser.GameObjects.Image;
	player:     Player;
  playerSprite: Phaser.Physics.Arcade.Sprite;

	constructor ()
	{
		super('TestScene');
	}

	preload ()
	{
		this.load.image('background_dark', './assets/samples/bulkhead-wallsx1.png');
		this.load.image('player', './assets/samples/witch1.png');
		this.load.image('enemy', './assets/samples/vampire1.png');
	}

	create()
	{
		this.background = this.add.image(500, 300 , 'background_dark');
		this.background.setScale(2);
    if (this.matter.world.walls.bottom?.label)
       this.matter.world.walls.bottom.label = 'ground';
    this.player = new Player(this, 400, 300);
	}

	update(time: number, delta: number): void {}



}
