import { GameUtils } from "../../utils/constant";
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
            this.load.spritesheet(item.spritesheet, item.spritesheet_path+'.png', item?.config);
            this.load.atlas(item.spritesheet+'_atlas', item.spritesheet_path+'.png', item.spritesheet_path+'.json');
        });
       
        GameUtils.Weapons.forEach((item: any) => {
            this.load.spritesheet(item.spritesheet, item.spritesheet_path+'.png', item?.config);
            this.load.atlas(item.spritesheet+'_atlas', item.spritesheet_path+'.png', item.spritesheet_path+'.json');
        });
    }


    create() {
        this.add.image(0,0,'loading_img');
        // setTimeout(()=>{
            // this.scene.start(Stages.CandyLand);
            this.scene.start('game-title');
        // }, 5000);
    }
};
