import React from 'react';
import ReactDOM from 'react-dom/client';
import { useRef } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { MainMenu } from './scenes/MainMenu';

function App()
{
    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);

    const changeScene = () => {
      if(phaserRef.current)
      {
          const scene = phaserRef.current.scene as MainMenu;

          if (phaserRef.current.scene)
          {
              scene.startGame();
          }
      }
    }
    // Event emitted from the PhaserGame component

    return (
        <div id="app">
            <PhaserGame ref={phaserRef} />
        </div>
    )
}

ReactDOM.createRoot(document.getElementById('root')!).render(

        <App />
)
