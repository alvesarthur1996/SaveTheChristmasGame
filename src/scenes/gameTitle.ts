export default class GameTitle extends Phaser.Scene {
    constructor() {
        super({ key: 'game-title' });
    }

    init() {

    }

    preload() {

    }

    create() {
        const { width, height } = this.scale;
        this.add.image(width / 2, height / 2, 'game_title').setScale(1.6);

        const title_plate = this.add.rectangle(width / 2, height / 2, 150 + 50, 400, 80, 0x000000)
            ;
        let text = this.add.text(title_plate.x / 2, title_plate.y / 2, "SAVE THE XMAS", {
            fontSize: '55px',
            color: '#000000',
            fontStyle: 'bold'
        });

ø


        const button = this.add.rectangle((width / 2), (height / 1.5), 150, 80, 0xffffff)
            .setInteractive()
            .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
            });

        this.add.text(button.x, button.y, 'Play Again', {
            color: '#000000'
        }).setOrigin(0.5);
    }
};











































