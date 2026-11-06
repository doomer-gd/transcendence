import { IFrameData } from "@/game_common/animation/Animator";
import { GameObjectType } from "@/game_common/gameobjects/GameObject";
import { GameConstructData, GameMap } from "@/game_common/utility/SharedConfig";

interface DecorData
{
  label: string,
  type: string,
  x: number,
  y: number
}

export function addDecor(scene: Phaser.Scene, mapConfig: GameMap, config: GameConstructData)
{
  const decorItems = mapConfig.worldConfig.decor as DecorData[];
  decorItems.forEach((item: DecorData) =>
  {
    const objectConfig = config.gameObjects.find((obj) => obj.type === GameObjectType.decor && obj.label === item.label);
    if (!objectConfig)
      return ;
    if (item.type === "anim")
    {
    }
  })

  function cutFrames(scene: Phaser.Scene, label: string, frame: IFrameData)
  {
    scene.anims.create({
          key: frame.label,
          frames: scene.anims.generateFrameNames(label, {prefix: frame.prefix,
            suffix: ".png", start: 0, end: frame.numberFrames - 1}),
          frameRate: frame.duration,
          repeat: -1
        });
  }
}
