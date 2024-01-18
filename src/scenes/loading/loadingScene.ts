import { GameUtils } from "../../utils/constant";

export default class LoadingScene extends Phaser.Scene {
    constructor() {
        super({
            key: GameUtils.Scenes.Loading.Key
        })
    }
    init() {
        console.log("Current Scene", this.scene.key);
    }

    preload() {
        this.load.baseURL = "http://localhost:8080/static/"
        this.loadImages();
        this.loadSprites();
        // this.loadAudios();
        this.load.tilemapTiledJSON('candy_land', '/maps/candy_land/teste.json');
    }

    loadImages() {
        GameUtils.Images.forEach((item: any) => {
            this.load.image(item.key, item.path);
        });
    }

    loadAudios() {
        GameUtils.Audios.forEach((item: any) => {
            this.load.audio(item.key, item.path);
            console.log(item);
        });
    }

    loadSprites() {
        GameUtils.Sprites.forEach((item: any) => {
            this.load.spritesheet(item.spritesheet, item.spritesheet_path+'.png', item?.config);
            this.load.atlas(item.spritesheet+'_atlas', item.spritesheet_path+'.png', item.spritesheet_path+'.json');
        });
    }


    create() {
        this.add.image(0,0,'loading_img').setScale(0.5).setOrigin(0);
        // setTimeout(()=>{
            this.scene.start('game-controller');
        // }, 5000);
    }
};
