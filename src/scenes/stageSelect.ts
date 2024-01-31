import InputHandler from "../controllers/joystick/InputHandler";
import JoystickProvider, { GamepadInput } from "../controllers/joystick/joystickProvider";
import KeyboardProvider from "../controllers/joystick/keyboardProvider";
import Boss from "../utils/boss";
import Stages, { BossNames } from "../utils/stages";

export default class StageSelect extends Phaser.Scene {
    private buttons: Phaser.GameObjects.Text[] = [];
    
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private controller!: JoystickProvider;
    private keyboard!: KeyboardProvider;
    private inputHandler!: InputHandler;

    private selectedButton: number = 0;
    private selector!: any;
    private bossContainer!: Phaser.GameObjects.Container;
    private bossOptions = [
        [Stages.CandyLand, Stages.FrostyVal, Stages.WinterForest],
        [Stages.MadFactory, "", Stages.Rolandia],
        [Stages.ColdMountains, Stages.BadBoyCity, Stages.TheCave],
    ];

    private selectedBossIndex = { x: 1, y: 1 };


    constructor() {
        super({ key: Stages.SelectStage });
    }

    init() {
        this.controller = new JoystickProvider(this, 0);
        this.keyboard = new KeyboardProvider(this);
        this.inputHandler = new InputHandler(this, {
            'A': [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.K),
                this.controller.getInput(GamepadInput.A)
            ],
            'left': [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.A),
                this.controller.getInput(GamepadInput.Left)
            ],
            'right': [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.D),
                this.controller.getInput(GamepadInput.Right),
            ],
            'up': [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.W),
                this.controller.getInput(GamepadInput.Up),
            ],
            'down': [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.S),
                this.controller.getInput(GamepadInput.Down),
            ],
            'X': [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.L),
                this.controller.getInput(GamepadInput.X)
            ],
            'R1': [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.P),
                this.controller.getInput(GamepadInput.RB)
            ],
            'Start': [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.ENTER),
                this.controller.getInput(GamepadInput.Start)
            ]
        });
    }

    preload() {

    }


    private confirmSelection() {
        const currentScene = this.scene;
        const SelectedStage = this.bossOptions[this.selectedBossIndex.y][this.selectedBossIndex.x];
        if (!SelectedStage) return;

        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', function () {
            let sound = currentScene.scene.sound.get('select_stage');
            sound.destroy();
            currentScene.stop(Stages.SelectStage);
            currentScene.start(Stages.LoadingStage, {
                stage: SelectedStage
            });
        });
    }

    create() {
        this.sound.play('select_stage', {
            loop: true,
            volume: 0.45,
        });

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
                    const bossImage = this.add.image(151 + x * 250, 98 + y * 200, avatar);
                    bossImage.setScale(avatar == 'santa_avatar' ? 1.7 : 0.22).setDepth(3);
                    bossMenuContainer.add(bossImage);
                    const bossName = Object.keys(BossNames).indexOf(this.bossOptions[y][x]);
                    this.add.text(151 + x * 250, 187 + y * 200, Object.values(BossNames)[bossName], {
                        fontFamily: 'GameFont',
                        fontSize: '13px',
                        fontStyle: 'bold',
                        lineSpacing: 2.5
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
        this.sound.play('cursor_move');
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
                return 'elf_avatar';
            case Stages.WinterForest:
                return 'rudolph_avatar';
            case Stages.FrostyVal:
                return 'frosty_avatar';
            case Stages.ColdMountains:
                return 'yeti_avatar';
            case Stages.Rolandia:
                return 'jack_avatar';
            case Stages.BadBoyCity:
                return 'bad_boy_avatar';
            case Stages.TheCave:
                return 'greedy_green_avatar';
            default:
                return 'santa_avatar';
        }
    }

    update(time: number, delta: number) {
        this.controller.update(time, delta);
        this.keyboard.update(time, delta);


        if (this.inputHandler.isJustDown('up')) { 
            this.selectBoss(0, -1)
        }
        else if (this.inputHandler.isJustDown('down')) { 
            this.selectBoss(0, 1)
        }
        else if (this.inputHandler.isJustDown('left')) { 
            this.selectBoss(-1, 0)
        }
        else if (this.inputHandler.isJustDown('right')) { 
            this.selectBoss(1, 0)
        }
        else if (this.inputHandler.isJustDown('A') || this.inputHandler.isJustDown('Start')) { 
            this.confirmSelection()
        }
    }
};











































