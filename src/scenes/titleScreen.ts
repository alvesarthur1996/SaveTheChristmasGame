import InputHandler from "../controllers/joystick/InputHandler";
import JoystickProvider, { GamepadInput } from "../controllers/joystick/joystickProvider";
import KeyboardProvider from "../controllers/joystick/keyboardProvider";
import Stages from "../utils/stages";

export default class TitleScreen extends Phaser.Scene {
    private buttons: Phaser.GameObjects.Text[] = [];
    private selector!: any;
    private selectedButton: number = 0;
    private inputHandler!: InputHandler;
    private controller!: JoystickProvider;
    private keyboard!: KeyboardProvider;



    constructor() {
        super({ key: Stages.TitleScreen });
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

    create() {
        const { width, height } = this.scale;
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000).setOrigin(0.5);
        // const bgm = this.sound.play('main_menu', {
        //     loop: true,
        //     volume: 0.6
        // });

        let bg = this.add.image(width / 2, height / 3.4, 'game_title',).setScale(0.85);
        bg.postFX.addVignette(0.5, 0.675, 0.3);
        const gameTitle = this.add.text(width - 200, height / 1.7, "Save the Xmas", {
            fontFamily: "GameFont",
            fontSize: "22px",
            fontStyle: 'bold'
        }).setOrigin(0.5);
        const version = this.add.text(gameTitle.x + 140, gameTitle.y + 20, 'v0.0.1', {
            fontFamily: 'GameFont',
            fontSize: "8px",
        }).setOrigin(0.5);



        const startGame = this.add.text(80, height / 1.4, 'Press A twice or Enter to Start', {
            color: '#fff',
            fontFamily: 'GameFont',
            fontSize: '14px',
        }).setOrigin(0).setAlpha(0);


        this.tweens.add({
            targets: startGame,
            duration: 350,
            yoyo: true,
            repeat: -1,
            alpha: 1,
        });


        this.add.text(width / 2, height - 15, '© Avalon Games, 2024', {
            color: '#fff',
            fontFamily: 'GameFont',
            fontSize: '8px',
        }).setOrigin(0.5);

    }

    update(time: number, delta: number) {
        this.controller.update(time, delta);
        this.keyboard.update(time, delta);

        if (this.inputHandler.isJustDown('A') || this.inputHandler.isJustDown('Start')) {
            this.scene.start(Stages.MainMenu);
        }
    }
};











































