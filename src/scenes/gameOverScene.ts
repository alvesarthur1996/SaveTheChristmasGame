export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'game-over' });
    }


    create() {
        const { width, height } = this.scale;
        this.add.text((width / 2), (height / 2), "GAME OVER", {
            fontSize: '55px',
            color: '#ff0000'
        }).setOrigin(0.5);

        const button = this.add.rectangle((width / 2), (height / 1.5), 150, 80, 0xffffff)
        .setInteractive()
        .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, ()=>{
            this.scene.start('TEST')
        });

        this.add.text(button.x, button.y, 'Play Again', {
            color: '#000000'
        }).setOrigin(0.5);
    }

    update(time: number, delta: number): void {

    }
};
