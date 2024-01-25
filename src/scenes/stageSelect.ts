import Boss from "../utils/boss";
import Stages, { BossNames } from "../utils/stages";

export default class StageSelect extends Phaser.Scene {
    private buttons: Phaser.GameObjects.Text[] = [];
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private selectedButton: number = 0;
    private selector!: any;
    private bossContainer!: Phaser.GameObjects.Container;
    private bossOptions = [
        [Stages.CandyLand, Stages.CandyLand, Stages.MadFactory],
        [Stages.MainMenu, "", Stages.MainMenu],
        [Stages.OptionsMenu, Stages.OptionsMenu, Stages.OptionsMenu],
    ];

    private selectedBossIndex = { x: 1, y: 1 };


    constructor() {
        super({ key: Stages.SelectStage });
    }

    init() {
        this.cursors = this.input.keyboard!.createCursorKeys();
    }

    preload() {

    }


    private confirmSelection() {
        const currentScene = this.scene;
        const SelectedStage = this.bossOptions[this.selectedBossIndex.y][this.selectedBossIndex.x];
        console.log(SelectedStage);
        if (!SelectedStage) return;

        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', function () {
            currentScene.stop(Stages.SelectStage);
            currentScene.start(SelectedStage);
        });
    }

    create() {
        const { width, height } = this.scale;
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000).setOrigin(0.5);

        this.bossContainer = this.createBossMenu();

    }

    private createBossMenu() {
        this.cameras.main.fadeIn(250, 0, 0, 0);
        this.children.removeAll();

        const bossMenuContainer = this.add.container(0, 0);

        const background = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 1.875, 'stage_select',);
        let scaleX = this.cameras.main.width / background.width;
        let scaleY = this.cameras.main.height / background.height;
        let scale = Math.max(scaleX, scaleY);

        background.setScale(scale).setScrollFactor(0).setOrigin(0.5).setDepth(9);


        for (let y = 0; y < this.bossOptions.length; y++) {
            for (let x = 0; x < this.bossOptions[y].length; x++) {
                const avatar = this.getBossAvatar(this.bossOptions[y][x]);
                if (avatar) {
                    const bossImage = this.add.image(151 + x * 250, 95 + y * 200, avatar);
                    bossImage.setScale(1.75).setDepth(3);
                    bossMenuContainer.add(bossImage);
                    const bossName = Object.keys(BossNames).indexOf(this.bossOptions[y][x]);
                    this.add.text(151 + x * 250, 195 + y * 200, Object.values(BossNames)[bossName], {
                        fontFamily: 'GameFont',
                        fontSize: '13px',
                        fontStyle: 'bold'
                    }).setOrigin(0.5)
                }
            }
        }

        bossMenuContainer.add(background);

        this.selector = this.add.image(151 + this.selectedBossIndex.x * 250, 95 + this.selectedBossIndex.y * 200, 'stage_select_cursor')
            .setScale(scale)
            .setDepth(10);
        this.tweens.add({
            targets: this.selector,
            alpha: 0, // Set alpha to 0 for a complete flash (1 is fully visible, 0 is fully transparent)
            duration: 500, // Duration for each half of the flash
            repeat: -1, // Number of times to repeat (1 repeat means a total of 2 flashes)
            ease: 'Linear',
            onComplete: function () {
                this.selector.setAlpha(1); // Ensure the item's alpha is set back to 1 in case of any rounding errors
            }

        })
        bossMenuContainer.add(this.selector);

        return bossMenuContainer;
    }

    private selectBoss(deltaX: number, deltaY: number) {
        // Move the cursor based on the given delta values
        this.selectedBossIndex.x = Phaser.Math.Clamp(this.selectedBossIndex.x + deltaX, 0, this.bossOptions[0].length - 1);
        this.selectedBossIndex.y = Phaser.Math.Clamp(this.selectedBossIndex.y + deltaY, 0, this.bossOptions.length - 1);

        // Update cursor position
        this.selector.x = 152 + this.selectedBossIndex.x * 250;
        this.selector.y = 93 + this.selectedBossIndex.y * 201;

        // Update boss option text colors
        this.bossContainer.getAll().forEach((item, y) => {
            if (item instanceof Phaser.GameObjects.Container) {
                item.getAll().forEach((bossOption, x) => {
                    console.log(bossOption);
                });
            }
        });
    }

    private getBossAvatar(Boss: Stages | string) {
        switch (Boss) {
            case Stages.CandyLand:
                return 'ginger_mad_avatar';
            case Stages.MadFactory:
                return 'rudolph_avatar';
            default:
                return 'santa_avatar';
        }
    }

    update() {
        const upJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up!)
        const downJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.down!)
        const leftJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.left!)
        const rightJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.right!)
        const spaceJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.space!)

        if (upJustPressed) {
            this.selectBoss(0, -1)
        }
        else if (downJustPressed) {
            this.selectBoss(0, 1)
        }
        else if (leftJustPressed) {
            this.selectBoss(-1, 0)
        }
        else if (rightJustPressed) {
            this.selectBoss(1, 0)
        }
        else if (spaceJustPressed) {
            this.confirmSelection()
        }
    }
};











































