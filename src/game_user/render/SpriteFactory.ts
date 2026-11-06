import { GameObject, GameObjectType, GameObjectTypesArray } from "@/game_common/gameobjects/GameObject";
import { Player, PlayerConfig } from "@/game_common/gameobjects/Player";
import { ObjectConstructData } from "@/game_common/utility/Constructors";
import { GameConstructData } from "@/game_common/utility/SharedConfig";
import { IAnimationData, IFrameData, IAnimationModes } from "@/game_common/animation/Animator";
import { HealthBar } from "../ui/HealthBar";
import { EntitySprite } from "./EntitySprite";
import { NickNameBar } from "../ui/Nickname";
import { IProjectileData, Projectile } from "@/game_common/gameobjects/Projectile";
import { IPickupConfig, Pickup } from "@/game_common/gameobjects/Pickup";
import { Zone } from "@/game_common/gameobjects/Zone";


export class SpriteFactory
{
  private scene: Phaser.Scene;
  private config: GameConstructData;
  private constructors: Map<string, Map<string, ObjectConstructData>>;
  private spriteMap: Map<number, EntitySprite>;

  constructor(scene: Phaser.Scene, config: GameConstructData)
  {
    this.scene = scene;
    this.config = config;
    this.spriteMap = new Map<number, EntitySprite>();
    this.constructors = new Map<string, Map<string, ObjectConstructData>>();
    for (const type of GameObjectTypesArray){
      this.constructors.set(type, new Map<string, ObjectConstructData>());
    }
    this.config.gameObjects.forEach((objectConfig: ObjectConstructData) =>
      this.constructors.get(objectConfig.type)?.set(objectConfig.label, objectConfig));
  }

  insert(obj: GameObject): EntitySprite
  {
    switch (obj.type)
    {
      case GameObjectType.player:
        return this.createPlayer(obj as Player);
      case GameObjectType.projectile:
        return this.createProjectile(obj as Projectile);
      case GameObjectType.pickup:
        return this.createPickup(obj as Pickup);
      case GameObjectType.zone:
        return this.createZone(obj);
      default:
        return this.createGeneric(obj);
    }
  }

  remove(id: number)
  {
    const entity = this.spriteMap.get(id);
    if (!entity)
      return ;
    if (entity.parent?.sprite === entity)
      entity.parent.sprite = undefined;
    entity.destroy();// should go into a pool instead
    this.spriteMap.delete(id);
  }

  getSprite(id: number): EntitySprite | undefined
  {
    return this.spriteMap.get(id);
  }

  getSpriteMap()
  {
    return this.spriteMap;
  }

  clear()
  {
    this.spriteMap.forEach((entity) => {
      if (entity.parent?.sprite === entity)
        entity.parent.sprite = undefined;
      entity.destroy();
    });
    this.spriteMap.clear();
  }

  private createPlayer(obj: Player): EntitySprite
  {
    const playerData = this.config.characters.find((player: PlayerConfig) => player.label === obj.label) as PlayerConfig;
    const sprite = this.scene.add.sprite(-1000, -1000, playerData.image.label);
    const health = new HealthBar(sprite, playerData.hitbox.height / 2 + 5, obj);
    const nick = new NickNameBar(sprite, playerData.hitbox.height / 2 + 10, 'john doe', obj);
    const entity = new EntitySprite(sprite, obj, playerData.hitbox);
    entity.health = health;
    entity.nick = nick;
    this.spriteMap.set(obj.id, entity);
    obj.sprite = entity;
    return entity;
  }

  private createProjectile(obj: Projectile): EntitySprite
  {
    const objData = this.constructors.get(obj.type)?.get(obj.label) as IProjectileData;
    const frame = this.scene.anims.get(objData.frames[0].label).frames[0];
    const sprite = this.scene.add.sprite(-1000, -1000, frame.textureKey, 0);
    const entity = new EntitySprite(sprite, obj, objData!.hitbox);
    obj.sprite = entity;
    this.spriteMap.set(obj.id, entity);
    return entity;
  }

  private createPickup(obj: Pickup): EntitySprite
  {
    const config = this.constructors.get(obj.type)?.get(obj.label) as IPickupConfig;
    const sprite = this.scene.add.sprite(-1000, -1000, config.atlas.label, config.label);
    const entity = new EntitySprite(sprite, obj, config.hitbox);
    obj.sprite = entity;
    this.spriteMap.set(obj.id, entity);
    return entity;
  }

  private createGeneric(obj: GameObject)
  {
    const objData = this.constructors.get(obj.type)?.get(obj.label);
    const sprite = this.scene.add.sprite(-1000, -1000, objData?.image.label);
    let hitbox = objData?.hitbox;
    if (obj.hitbox)
      hitbox = obj.hitbox;
    const entity = new EntitySprite(sprite, obj, hitbox!);
    obj.sprite = entity;
    this.spriteMap.set(obj.id, entity);
    return entity;
  }

  private createZone(obj: GameObject)
  {
    const zone = obj as Zone;
    const sprite = this.scene.add.sprite(-1000, -1000, '');
    const entity = new EntitySprite(sprite, zone, zone.hitbox);
    obj.sprite = entity;
    this.spriteMap.set(obj.id, entity);
    return entity;
  }

}
