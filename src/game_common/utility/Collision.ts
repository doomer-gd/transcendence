export namespace Colliders{

  export function onCollisionCallback(
    eventLabel: string,
    scene: Phaser.Scene,
    body: MatterJS.BodyType,
    callback: (body: MatterJS.BodyType, context?: Phaser.GameObjects.GameObject) => void
  )
    {
      scene.matter.world.on(eventLabel, (event: any) => checkCallback(event));

      function checkCallback(data: any)
      {
        for (const pair of data.pairs)
        {
          if (pair.bodyA === body)
            callback(pair.bodyB, pair.bodyB.gameObject);
          else if (pair.bodyB === body)
            callback(pair.bodyA, pair.bodyA.gameObject);
        }
      }
    }
  }
