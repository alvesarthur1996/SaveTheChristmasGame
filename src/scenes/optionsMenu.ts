import Stages from "../utils/stages";

export default class OptionsMenu extends Phaser.Scene {
    private buttons: Phaser.GameObjects.Text[] = [];
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private selectedButton: number = 0;
    private selector!: any;



    constructor() {
        super({ key: Stages.OptionsMenu });
    }

    init() {
        this.cursors = this.input.keyboard!.createCursorKeys();
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

        // const startGame = this.add.text(80, height / 1.4, 'Start Game', {
        //     color: '#fff',
        //     fontFamily: 'GameFont',
        //     fontSize: '14px',
        // }).setOrigin(0);

        // const options = this.add.text(80, height / 1.25, 'Options', {
        //     color: '#fff',
        //     fontFamily: 'GameFont',
        //     fontSize: '14px',
        // }).setOrigin(0);

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

    update() {
        const upJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up!)
        const downJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.down!)
        const spaceJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.space!)

        if (upJustPressed) {
            this.selectNextButton(-1)
        }
        else if (downJustPressed) {
            this.selectNextButton(1)
        }
        else if (spaceJustPressed) {
            this.confirmSelection()
            console.log(this.selectedButton, this.buttons[this.selectedButton]);
        }
    }
};











































