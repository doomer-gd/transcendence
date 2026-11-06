import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import StartGame from '../game_common/main/main';
import { EventBus } from '../game_common/main/EventBus';

export interface IRefPhaserGame
{
  game: Phaser.Game | null;
  scene: Phaser.Scene | null;
}

interface IProps
{
  //this is called on scene change
    currentActiveScene?: (scene_instance: Phaser.Scene) => void
}

export const PhaserGame = forwardRef<IRefPhaserGame, IProps>(function PhaserGame({ currentActiveScene }, ref)
{
  const game = useRef<Phaser.Game | null>(null!);

  useLayoutEffect(() =>
  {
      if (game.current === null)
      {
          game.current = StartGame("game-container");
          if (typeof ref === 'function')
          {
              ref({ game: game.current, scene: null });
          } else if (ref)
          {
              ref.current = { game: game.current, scene: null };
          }

      }

      return () =>
      {
          if (game.current)
          {
              game.current.destroy(true);
              if (game.current !== null)
              {
                  game.current = null;
              }
          }
      }
  }, [ref]);

  useEffect(() =>
  {
      let currentScene: Phaser.Scene | null = null;
      const pauseScene = () =>
      {
          if (!currentScene)
              return;
          currentScene.scene.pause();
      };
      const resumeScene = () =>
      {
          if (!currentScene)
              return;
          currentScene.scene.resume();
      };
      const handleVisibilityChange = () =>
      {
          if (document.visibilityState === 'hidden')
              pauseScene();
          else
              resumeScene();
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      const handleSceneReady = (scene_instance: Phaser.Scene) =>
      {
          currentScene = scene_instance;
          if (currentActiveScene && typeof currentActiveScene === 'function')
          {
              currentActiveScene(scene_instance);
          }
          if (typeof ref === 'function')
          {
              ref({ game: game.current, scene: scene_instance });
          } else if (ref)
          {
              ref.current = { game: game.current, scene: scene_instance };
          }
      };
      EventBus.on('current-scene-ready', handleSceneReady);
      return () =>
      {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          EventBus.removeListener('current-scene-ready', handleSceneReady);
      }
  }, [currentActiveScene, ref]);

  return (
      <div id="game-container"></div>
  );

});
