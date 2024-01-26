import Boss, { BossAtlas } from "../../utils/boss";
import Stages, { BossNames, LoadingStagesImages } from "../../utils/stages";

export default class LoadingStage extends Phaser.Scene {
    private sceneToLoad!: Stages | string;
    private imageFromStage!: LoadingStagesImages | string;
    private bossName!: BossNames | string;
    private bossSprite!: Phaser.GameObjects.Sprite;

    constructor() {
        super(Stages.LoadingStage);
    }


    init(data: any) {
        this.sceneToLoad = data.stage;
    }

    preload() {
        const imageIdx = Object.keys(LoadingStagesImages).indexOf(this.sceneToLoad);
        const bossName = Object.keys(BossNames).indexOf(this.sceneToLoad);
        this.imageFromStage = Object.values(LoadingStagesImages)[imageIdx];
        this.bossName = Object.values(BossNames)[bossName];
    }

    create() {
        this.cameras.main.fadeIn(500, 0, 0, 0);
        const { width, height } = this.scale;
        this.add.rectangle(0, 0, width, height, 0x000000);
        const loadingImage = this.add.image(width / 2, height / 2, this.imageFromStage).setOrigin(0.5).setScale(0).setAlpha(0);
        loadingImage.postFX.addVignette(0.5, 0.5, 0.85, 0.65);

        let scaleX = this.cameras.main.width / loadingImage.width;
        let scaleY = this.cameras.main.height / loadingImage.height;
        let scale = Math.max(scaleX, scaleY);


        const bossNameBox = this.add.rectangle(width / 1.2, height / 1.2, 300, 80, 0x111111, 0.75);
        const bossName = this.add.text(bossNameBox.x, bossNameBox.y, this.bossName, {
            fontFamily: 'GameFont',
            lineSpacing: 2.5
        }).setOrigin(0.5);



        const bossShow = this.add.rectangle(-width * 2, height / 2, width, 300, 0x000000).setOrigin(0.5);
        this.createBossSprite();

        this.tweens.chain({
            tweens: [
                {
                    targets: loadingImage,
                    duration: 1200,
                    scaleX: scale,
                    scaleY: scale,
                    alpha: 1,
                    ease: 'Power2'
                },
                {
                    targets: bossShow,
                    duration: 1200,
                    x: width / 2
                },
                {
                    targets: this.bossSprite,
                    duration: 1200,
                    x: bossShow.width / 2,
                    y: bossShow.y,
                    onActive: () => { this.bossSprite.setDepth(10); this.sound.play('boss_splash') },
                    onComplete: () => { this.bossSprite.play('intro') }
                },
                {
                    targets: this.bossSprite,
                    scale: 4,
                    duration: 2300,
                },
                {
                    targets: this.bossSprite,
                    scale: 3,
                    duration: 1100,
                    onComplete: () => {
                        this.cameras.main.fadeOut(500, 0, 0, 0);
                        this.cameras.main.on('camerafadeoutcomplete', () => {
                            this.scene.start(this.sceneToLoad);
                        })
                    }
                }
            ]
            // onComplete: () => {
            //     setTimeout(() => {
            //         this.cameras.main.fadeOut(1000, 0, 0, 0);
            //         const thisScene = this;
            //         this.cameras.main.on('camerafadeoutcomplete', function () {
            //             thisScene.scene.start(thisScene.sceneToLoad);
            //         });
            //     }, 1200)
            // }
        });



    }

    private createBossSprite() {
        switch (this.bossName) {
            case BossNames.CandyLand:
                this.bossSprite = this.add.sprite(this.scale.width * 2, this.scale.height / 2, BossAtlas.GingerMad);
                this.bossSprite.anims.create({
                    key: 'intro',
                    frames: this.bossSprite.anims.generateFrameNames(BossAtlas.GingerMad, {
                        prefix: 'hit_',
                        start: 1,
                        end: 3,
                    }),
                    frameRate: 18,
                    yoyo: true,
                    repeat: 3
                });
                break;
            case BossNames.MadFactory:
                this.bossSprite = this.add.sprite(this.scale.width * 2, this.scale.height / 2, BossAtlas.RudolphTheRed);
                this.bossSprite.anims.create({
                    key: 'intro',
                    frames: this.bossSprite.anims.generateFrameNames(BossAtlas.RudolphTheRed, {
                        prefix: 'idle_',
                        start: 0,
                        end: 11,
                    }),
                    frameRate: 18,
                    repeat: 3
                });
                break;
        }
        this.bossSprite?.setScale(3);
        return this.bossSprite;
    }

    update() { }
};
