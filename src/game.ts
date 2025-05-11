import 'phaser';

import LoadingScene from './scenes/loading/loadingScene';
import UI from './scenes/ui/UI';
import GameOverScene from './scenes/gameOverScene';
import { PhaserMatterCollisionPlugin } from 'phaser-matter-collision-plugin'
import GameController from './controllers/gameController';
import MadFactoryStage from './scenes/stages/madFactoryStage';
import CandyLandStage from './scenes/stages/candyLandStage';
import GameTitle from './scenes/gameTitle';
import OptionsMenu from './scenes/optionsMenu';
import StageSelect from './scenes/stageSelect';
import LoadingStage from './scenes/loading/loadingStage';
import TitleScreen from './scenes/titleScreen';
import ColdMountainsStage from './scenes/stages/coldMountains';
import StageComplete from './scenes/stageComplete';
import { PauseMenu } from './scenes/ui/pauseMenu';
// import MainMenuScene from './scenes/menus/mainMenu';
// import PlayScene from './scenes/play/playScene';


// const ratio = Math.max(window.innerWidth / window.innerHeight, window.innerHeight / window.innerWidth)
const DEFAULT_WIDTH = 800
const DEFAULT_HEIGHT = 600 // any height you want


const matterCollision = {
  plugin: PhaserMatterCollisionPlugin,
  key: "matterCollision" as "matterCollision",
  mapping: "matterCollision" as "matterCollision"
};


declare module "phaser" {
  interface Scene {
    [matterCollision.mapping]: PhaserMatterCollisionPlugin;
  }
  /* eslint-disable @typescript-eslint/no-namespace */
  namespace Scenes {
    interface Systems {
      [matterCollision.key]: PhaserMatterCollisionPlugin;
    }
  }
}

const config: Phaser.Types.Core.GameConfig = {
  title: "Save the Christmas",
  type: Phaser.AUTO,
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  input: {
    keyboard: true,
    gamepad: true,
  },
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  fps: {
    min: 60,
    target: 60
  },
  scene: [
    LoadingScene,
    TitleScreen,
    GameTitle,
    OptionsMenu,
    StageSelect,
    LoadingStage,
    CandyLandStage,
    MadFactoryStage,
    ColdMountainsStage,
    GameController,
    UI,
    PauseMenu,
    GameOverScene,
    StageComplete
  ],
  plugins: {
    scene: [matterCollision]
  },
  physics: {
    default: 'matter',
    matter: {
      debug: true,
      gravity: {
        y: 0.75,
        x: 0
      }
    }
  },
  pixelArt: true,
};

export const Game = new Phaser.Game(config);
