import * as Phaser from 'phaser';
import { PlayerController } from "./PlayerController";
import { CameraController } from './CameraFollower';
import { Player } from '@/game_common/gameobjects/Player';
import { EntitySprite } from '../render/EntitySprite';

export class PlayerClient
{
  scene: Phaser.Scene;
  controller: PlayerController;
  camera: CameraController;
  player: Player;
  sprite: Phaser.GameObjects.Sprite;
  localId: number;

  constructor (entity: EntitySprite, bounds: Phaser.Geom.Rectangle)
  {
    this.scene = entity.sprite.scene;
    this.sprite = entity.sprite;
    this.controller = new PlayerController(this.scene, 'keymap');
    this.camera = new CameraController(this.sprite, bounds);
  }

  destroy()
  {
    this.controller.destroy();
    this.camera.destroy();
  }

}
