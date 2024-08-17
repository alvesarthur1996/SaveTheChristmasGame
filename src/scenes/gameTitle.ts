import InputHandler from "../controllers/joystick/InputHandler";
import JoystickProvider, { GamepadInput } from "../controllers/joystick/joystickProvider";
import KeyboardProvider from "../controllers/joystick/keyboardProvider";
import Stages from "../utils/stages";
import DefaultScene from "./defaultScene";

export default class GameTitle extends DefaultScene {
    private buttons: Phaser.GameObjects.Text[] = [];
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private selectedButton: number = 0;
    private selector!: any;
    private controller!: JoystickProvider;
    private keyboard!: KeyboardProvider;
    private inputHandler!: InputHandler;

    private gameStarting = false;



    constructor() {
        super({ key: Stages.MainMenu });
    }

    init() {
        this.load_options();
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

    private selectButton(index: number) {
        const button = this.buttons[index]

        this.selector.x = button.x - 30;
        this.selector.y = button.y;

        this.selectedButton = index;
    }

    private selectNextButton(change: number = 1) {
        let index = this.selectedButton + change
        // wrap the index to the front or end of array
        if (index >= this.buttons.length) {
            index = 0
        }
        else if (index < 0) {
            index = this.buttons.length - 1
        }
        this.selectButton(index)
    }

    confirmSelection() {
        const button = this.buttons[this.selectedButton];
        button.emit('selected');
    }

    create() {
        const { width, height } = this.scale;
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000).setOrigin(0.5);
        const bgm = this.sound.play('main_menu', {
            loop: true,
            volume: (0.6 * (this.SoundOptions.BGM / 10))
        });

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



        const startGame = this.add.text(80, height / 1.4, 'Start Game', {
            color: '#fff',
            fontFamily: 'GameFont',
            fontSize: '14px',
        }).setOrigin(0);

        const options = this.add.text(80, height / 1.25, 'Options', {
            color: '#fff',
            fontFamily: 'GameFont',
            fontSize: '14px',
        }).setOrigin(0);

        startGame.on('selected', () => {
            const currentScene = this.scene;
            this.gameStarting = true;
            this.tweens.add({
                targets: this.selector,
                alpha: 0, // Set alpha to 0 for a complete flash (1 is fully visible, 0 is fully transparent)
                duration: 250, // Duration for each half of the flash
                repeat: 6, // Number of times to repeat (1 repeat means a total of 2 flashes)
                ease: 'Linear',
                onComplete: function () {
                    currentScene.scene.cameras.main.fade(250, 0, 0, 0);
                    currentScene.scene.cameras.main.once("camerafadeoutcomplete", () => {
                        let sound = currentScene.scene.sound.get('main_menu');
                        sound.destroy();
                        currentScene.stop(Stages.MainMenu);
                        currentScene.stop(Stages.OptionsMenu);
                        currentScene.start(Stages.SelectStage);
                    });
                }
            })
        });

        options.on('selected', () => {
            if (this.scene.isPaused(Stages.OptionsMenu))
                this.scene.resume(Stages.OptionsMenu);
            else
                this.scene.launch(Stages.OptionsMenu);

            this.scene.pause(Stages.MainMenu);
            this.scene.bringToTop(Stages.OptionsMenu);
        });

        this.buttons.push(startGame);
        this.buttons.push(options);

        this.selector = this.add.text(startGame.x - 30, startGame.y, ">", {
            fontFamily: "GameFont"
        }).setVisible(true);


        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            startGame.off('selected');
            options.off('selected');
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

        if (this.inputHandler.isJustDown('up') && !this.gameStarting) {
            this.sound.play('cursor_move', {
                volume: 1 * (this.SoundOptions.SFX / 10)
            });
            this.selectNextButton(-1)
        }
        else if (this.inputHandler.isJustDown('down') && !this.gameStarting) {
            this.sound.play('cursor_move', {
                volume: 1 * (this.SoundOptions.SFX / 10)
            });
            this.selectNextButton(1)
        }
        else if ((this.inputHandler.isJustDown('A') || this.inputHandler.isJustDown('Start')) && !this.gameStarting) {
            this.sound.play('cursor_move', {
                volume: 1 * (this.SoundOptions.SFX / 10)
            });
            this.confirmSelection()
        }
    }
};











































