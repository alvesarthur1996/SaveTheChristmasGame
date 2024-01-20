import 'phaser';

import LoadingScene from './scenes/loading/loadingScene';
import GameScene from './scenes/gameScene';
import UI from './scenes/ui/UI';
import GameOverScene from './scenes/gameOverScene';
import { PhaserMatterCollisionPlugin } from 'phaser-matter-collision-plugin'
import GameController from './controllers/gameController';
import MadFactoryStage from './scenes/stages/madFactoryStage';
import CandyLandStage from './scenes/stages/candyLandStage';
// import MainMenuScene from './scenes/menus/mainMenu';
// import PlayScene from './scenes/play/playScene';


// const ratio = Math.max(window.innerWidth / window.innerHeight, window.innerHeight / window.innerWidth)
const DEFAULT_HEIGHT = 600 // any height you want
const DEFAULT_WIDTH = 800


const pluginConfig = {
  plugin: PhaserMatterCollisionPlugin,
  key: "matterCollision" as "matterCollision",
  mapping: "matterCollision" as "matterCollision"
};

declare module "phaser" {
  interface Scene {
    [pluginConfig.mapping]: PhaserMatterCollisionPlugin;
  }
  /* eslint-disable @typescript-eslint/no-namespace */
  namespace Scenes {
    interface Systems {
      [pluginConfig.key]: PhaserMatterCollisionPlugin;
    }
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  mode: Phaser.Scale.CENTER_HORIZONTALLY,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  fps: {
    min: 60
  },
  scene: [
    LoadingScene,
    CandyLandStage,
    GameController,
    UI,
    GameOverScene
  ],
  plugins: {
    scene: [pluginConfig]
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: {
        y: 0.75
      }
    }
  },
  pixelArt: true,
};

export const Game = new Phaser.Game(config);
