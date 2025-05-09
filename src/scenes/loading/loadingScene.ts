import { GameUtils } from "../../utils/constant";
import { loadGameState } from "../../utils/gameState";
import { loadOptions } from "../../utils/options";
import Stages from "../../utils/stages";
export default class LoadingScene extends Phaser.Scene {
    constructor() {
        super({
            key: GameUtils.Scenes.Loading.Key
        })
    }
    init() {

    }

    preload() {
        loadOptions()
            .then((options) => {
                this.cache.json.add('config', options);
            })

        loadGameState()
            .then((options) => {
                this.cache.json.add('gameState', options);
            });

        this.load.baseURL = "http://localhost:8080/static/"
        this.loadImages();
        this.loadSprites();
        this.loadAudios();

        // this.load.tilemapTiledJSON('mad_factory', 'maps/mad_factory/mad_factory.json');
    }

    loadImages() {
        GameUtils.Images.forEach((item: any) => {
            this.load.image(item.key, item.path);
        });
    }

    loadAudios() {
        GameUtils.Audios.forEach((item: any) => {
            this.load.audio(item.key, item.path);
        });
    }

    loadSprites() {
        GameUtils.Sprites.forEach((item: any) => {
            this.load.spritesheet(item.spritesheet, item.spritesheet_path + '.png', item?.config);
            this.load.atlas(item.spritesheet + '_atlas', item.spritesheet_path + '.png', item.spritesheet_path + '.json');
        });

        GameUtils.Weapons.forEach((item: any) => {
            this.load.spritesheet(item.spritesheet, item.spritesheet_path + '.png', item?.config);
            this.load.atlas(item.spritesheet + '_atlas', item.spritesheet_path + '.png', item.spritesheet_path + '.json');
        });
    }


    create() {
        const { width, height } = this.scale;

        this.add.image(width / 2, height / 2, 'avalon_logo').setScale(1);
        this.add.text(width / 2, (height / 1.9) + 50, "Avalon Games", {
            fontFamily: "GameFont",
            fontSize: "12px",
            fontStyle: 'bold'
        }).setOrigin(0.5, 0)

        this.cameras.main.fadeIn(1000, 0, 0, 0);

        setTimeout(() => {
            this.cameras.main.fadeOut(1000, 0, 0, 0, (camera: any, progress: any) => {
                if (progress === 1) {
                    this.scene.start(Stages.TitleScreen);
                    // this.scene.start(Stages.StageComplete);
                    // this.scene.start(Stages.SelectStage);
                    // this.scene.start(Stages.ColdMountains);
                }
            });
            // }, 400);
        }, 5000);
    }
};
