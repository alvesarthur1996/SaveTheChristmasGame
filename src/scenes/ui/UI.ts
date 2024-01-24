import Phaser from 'phaser'
import { sharedInstance as events } from '../eventCentre';
import GameController from '../../controllers/gameController';

export default class UI extends Phaser.Scene {
    private milkTankLabel!: Phaser.GameObjects.Text
    private milkTanks = 0;
    private lifeCounter = GameController.lifeCounter;
    private graphics!: Phaser.GameObjects.Graphics;
    private boss_graphics!: Phaser.GameObjects.Graphics;
    private GameController: GameController

    constructor() {
        super({ key: 'UI' });
    }

    init() {
        this.milkTanks = 0;
        this.GameController = new GameController();
    }

    create() {
        this.graphics = this.add.graphics();
        this.boss_graphics = this.add.graphics();
        this.setHealthBar(28)

        
        this.milkTankLabel = this.add.text(10, 10, 'Life Tank: 0', {
            fontSize: '32px'
        })
        events.on('life_tank_collected', this.milkTankCollected, this);
        events.on('health_changed', this.healthChanged, this);
        
        events.on('boss_arrived', this.setBossBar, this);
        events.on('boss_health_changed', this.setBossBar, this);


        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            events.off('life_tank_collected', this.milkTankCollected, this);
        })
    }


    private setHealthBar(value: number) {
        const height = 150;
        const currentLife = Phaser.Math.Clamp(value, 0, 28) / 28;
        const offsetLife = 200 - (height * (currentLife));

        this.graphics.clear();
        this.graphics.fillStyle(0x9c9c9c);
        this.graphics.fillRect(10, 50, 30, height)
        if (currentLife > 0) {
            this.graphics.fillStyle(0x88ff88);
            this.graphics.fillRect(10, offsetLife, 30, (height * currentLife));
        }
    }

    private healthChanged(value: number) {
        this.setHealthBar(value)
    }

    private milkTankCollected() {
        this.milkTanks++;
        this.milkTankLabel.text = `Life Tank: ${this.milkTanks}`
    }

    private setBossBar(value: number) {
        const height = 150;
        const currentLife = Phaser.Math.Clamp(value, 0, 28) / 28;
        const offsetLife = 200 - (height * (currentLife));

        this.boss_graphics.clear();
        this.boss_graphics.fillStyle(0x9c9c9c);
        this.boss_graphics.fillRect((this.scale.width - 40), 50, 30, height)
        if (currentLife > 0) {
            this.boss_graphics.fillStyle(0xff5555);
            this.boss_graphics.fillRect((this.scale.width - 40), offsetLife, 30, (height * currentLife));
        }
    }

    update(time: number, delta: number): void {
    }
};
