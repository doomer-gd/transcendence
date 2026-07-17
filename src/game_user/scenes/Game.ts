import { Player } from '../player/Player';
import { Scene } from 'phaser';
import { Constructors } from '../../game_common/utility/Constructors';
import { EventBus } from '../../game_common/main/EventBus';
import { PlayerNetwork } from '../player/PlayerNetwork';
import { ObjectState } from '@/game_common/network/Interfaces';

export class GameScene extends Scene
{
	background: Phaser.GameObjects.Image;
	player:     Player;
  playerSprite: Phaser.Physics.Arcade.Sprite;
  map: Phaser.Tilemaps.Tilemap;
  network: PlayerNetwork;

	constructor ()
	{
		super('GameScene');
    this.network = new PlayerNetwork();
	}

	preload ()
	{
		this.load.image('background_dark', './assets/samples/bulkhead-wallsx1.png');
		this.load.image('player', './assets/samples/witch1.png');
		this.load.image('enemy', './assets/samples/vampire1.png');
    this.load.tilemapTiledJSON('cave', './assets/maps/cave.json');
    this.load.image('tiles', './assets/tiles/tileset1.png');
    this.load.image('lava-bg', './assets/tiles/lava-background.png');
    this.load.json('keymap', '../../config/keymap.json');
    this.load.json('wizard_data', './assets/animation/wizard_data.json');
    this.load.atlas('wizard_atlas', './assets/animation/wizard_atlas.png', './assets/animation/wizard_atlas.json');
	}

	create()
	{
    const back = this.add.image(0,0,'lava-bg').setOrigin(0,0);
    back.setScale(1024 / back.width, 768 / back.height);
    this.map = this.make.tilemap({key: 'cave'});
    const tileset = this.map.addTilesetImage('living_stone', 'tiles');
    this.map.createLayer('ground', tileset as Phaser.Tilemaps.Tileset);
    this.map.getObjectLayer('boxes')?.objects.forEach((obj) => Constructors.initTileBoxes(this, obj, 'ground'));
    if (this.matter.world.walls.bottom?.label)
       this.matter.world.walls.bottom.label = 'ground';
    this.player = new Player(this, 400, 300, 'wizard');
    EventBus.emit('current-scene-ready', this);
    this.network.sock.emit("playerReady");
    this.network.sock.on("snapShot", (tick: number, states: ObjectState[])=>{
      this.player.body.position = states[0].pos;
    })

	}

	update(time: number, delta: number): void
  {
    this.player.update();
  }

  changeScene ()
  {
    this.scene.start('GameOver');
  }

}
