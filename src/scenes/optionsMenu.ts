import * as fs from 'fs';
import Stages from "../utils/stages";
import JoystickProvider, { GamepadInput } from '../controllers/joystick/joystickProvider';
import KeyboardProvider from '../controllers/joystick/keyboardProvider';
import InputHandler from '../controllers/joystick/InputHandler';


export default class OptionsMenu extends Phaser.Scene {
    private buttons: Phaser.GameObjects.Text[] = [];
    private selectedButton: number = 0;
    private selector!: any;

    private controller!: JoystickProvider;
private keyboard!: KeyboardProvider;
private inputHandler!: InputHandler;



    constructor() {
        super({ key: Stages.OptionsMenu });
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
        this.load.json('config', '../../game_settings.json');
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

    private confirmSelection() {
        const button = this.buttons[this.selectedButton];
        button.emit('selected');
    }

    create() {
        const { width, height } = this.scale;
        let data = this.cache.json.get('config');
        data.teste = "F Total";
        this.cache.json.add('config', data);
        console.log(this.cache.json.get('config'));
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000).setOrigin(0.5);

        const Options = this.add.text(width / 2, 100, "Options", {
            fontFamily: "GameFont",
            fontSize: "22px",
            fontStyle: 'bold'
        }).setOrigin(0.5);


        const returnBtn = this.add.text(50, 50, '← Back', {
            color: '#fff',
            fontFamily: 'GameFont',
            fontSize: '12px',
        }).setOrigin(0);

        const firstOption = this.add.text(Options.x, Options.y + 100, 'Teste', {
            color: '#fff',
            fontFamily: 'GameFont',
            fontSize: '14px',
        }).setOrigin(0.5);

        returnBtn.on('selected', () => {
            if (this.scene.isPaused(Stages.MainMenu))
                this.scene.resume(Stages.MainMenu);
            else
                this.scene.launch(Stages.MainMenu)

            this.scene.pause(Stages.OptionsMenu);
            this.scene.bringToTop(Stages.MainMenu);
        });

        this.buttons.push(returnBtn);
        this.buttons.push(firstOption);

        this.selector = this.add.text(returnBtn.x - 30, returnBtn.y, ">", {
            fontFamily: "GameFont"
        }).setVisible(true);


        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            returnBtn.off('selected');
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

        if (this.inputHandler.isJustDown('up')) {
            this.sound.play('cursor_move');

            this.selectNextButton(-1)
        }
        else if (this.inputHandler.isJustDown('down')) {
            this.sound.play('cursor_move');

            this.selectNextButton(1)
        }
        else if (this.inputHandler.isJustDown('A')) {
            this.sound.play('cursor_move');
            this.confirmSelection()
        }
    }
};











































