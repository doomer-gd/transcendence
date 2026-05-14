import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class TestScene extends Scene
{
	background: Phaser.GameObjects.Image;
	player:		Phaser.Physics.Arcade.Sprite;
	cursors:	Phaser.Types.Input.Keyboard.CursorKeys | undefined;

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
		this.player = this.physics.add.sprite(700, 400, 'player');
		this.player.setCollideWorldBounds(true);
		this.cursors = this.input.keyboard?.createCursorKeys();
	}

	update(time: number, delta: number): void {
		if (this.cursors?.left.isDown)
		{
			this.player.setVelocityX(-100);
		}
		else if (this.cursors?.right.isDown)
		{
			this.player.setVelocityX(100);
		}
		else
		{
			this.player.setVelocityX(0);
		}
		if (this.cursors?.space.isDown)// && this.player.body?.touching.down)
		{
			this.player.setVelocityY(-300);
		}
	}



}
