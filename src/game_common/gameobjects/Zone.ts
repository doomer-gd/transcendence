import { GameObject, GameObjectType } from "./GameObject";
import Matter, { Bodies, Body, Composite } from "matter-js";
import { GameEvents } from "../gameplay/Simulation";
import { CollisionMasks, CollisionTypes, Hitbox, MatterData, ObjectConstructData } from "../utility/Constructors";
import { Player } from "./Player";
import * as Colliders from "../utility/Collision";

const DF_ZONE_FACTOR = 1 / 10;

export enum EZoneType
{
  deadly = "deadly",
  heal = "heal",
  energy = "energy"
}

export interface IZonePorfile
{
  type: EZoneType;
  factor: number;
}

export interface IZoneConfig extends ObjectConstructData
{
  hitbox:   Hitbox;
  profile:  IZonePorfile;
}

export class Zone extends GameObject
{
  matter:   MatterData;
  events:   GameEvents;
  hitbox:   Hitbox;
  body?:     Body;
  contacts: Map<GameObject, boolean>;
  contactBodies:  Map<GameObject, Set<Body>>;
  profile:  IZonePorfile;
  callback: (target: GameObject) => void;

  constructor(id: number, label: string, matter: MatterData, events: GameEvents)
  {
    super(id, GameObjectType.zone, label);
    this.matter = matter;
    this.events = events;
    this.contacts = new Map<GameObject, boolean>();
  }

  update()
  {
    this.contacts.forEach((isHit: boolean, target: GameObject) =>
    {
      if (!isHit)
        this.callback(target);
    });
  }

  spawn(config: IZoneConfig)
  {
    this.body = Bodies.rectangle(config.x + config.hitbox.width / 2, config.y + config.hitbox.height / 2,
      config.hitbox.width, config.hitbox.height,
      {isStatic: true, isSensor: true,
      collisionFilter: {category: CollisionTypes.solid, mask: CollisionMasks.solid}});
    this.hitbox = config.hitbox;
    this.setProfile(config.profile);
    this.addListeners();
  }

  destroy(){};

  private addListeners()
  {
    Colliders.onCollisionCallback('collisionStart', this.matter.engine, this.body!, this.registerContact.bind(this));
    Colliders.onCollisionCallback('collisionEnd', this.matter.engine, this.body!, this.unregisterContact.bind(this));
  }

  private registerContact(body: Body)
  {
    if (!body.parent.plugin.gameObject || body.parent.label === 'ground')
      return ;
    const gameObject = body.parent.plugin.gameObject;
    if (!this.contacts.has(gameObject))
      this.contacts.set(gameObject, false);
  }

  private unregisterContact(body: Body)
  {
    if (!body.parent.plugin.gameObject || body.parent.label === 'ground' || body.label === 'feet')
      return ;
    const gameObject = body.parent.plugin.gameObject;
    this.contacts.delete(gameObject);
  }

  private setProfile(profile: IZonePorfile)
  {
    switch(profile.type)
    {
      case EZoneType.deadly:
        this.callback = this.callbackDeadly.bind(this);
        break ;
      case EZoneType.heal:
        this.callback = this.callbackHealing.bind(this);
        break ;
      case EZoneType.energy:
        this.callback = this.callbackEnergy.bind(this);
        break ;
    }
    this.profile = profile;
  }

  private callbackDeadly(target: GameObject)
  {
    if (target.type === GameObjectType.player)
    {
      const player = target as Player;
      player.die(player.state.lastHit[0]);
    }
    else
      this.events.emit("destroy", target.id);
    this.contacts.set(target, true);
  }

  private callbackHealing(target: GameObject)
  {
    if (target.type !== GameObjectType.player)
      return ;
    (target as Player).heal(this.profile.factor);
  }

  private callbackEnergy(target: GameObject)
  {
    if (target.type !== GameObjectType.player)
      return ;
    (target as Player).restoreEnergy(this.profile.factor);
  }
}
