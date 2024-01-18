import Phaser from 'phaser'
import { sharedInstance as events } from '../eventCentre';
import GameController from '../../controllers/gameController';

export default class UI extends Phaser.Scene {
    private milkTankLabel!: Phaser.GameObjects.Text
    private milkTanks = 0;
    private lifeCounter = GameController.lifeCounter;
    private graphics!: Phaser.GameObjects.Graphics;
    private GameController: GameController

    constructor() {
        super({ key: 'UI' });
    }

    init() {
        this.milkTanks = GameController.lifeTanks;
        this.GameController = new GameController();
    }

    create() {
        this.graphics = this.add.graphics();
        this.setHealthBar(100)

        this.milkTankLabel = this.add.text(10, 10, 'Milk Tank: 0', {
            fontSize: '32px'
        })
        events.on('milk_tank_collected', this.milkTankCollected, this);
        events.on('health_changed', this.healthChanged, this);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            events.off('milk_tank_collected', this.milkTankCollected, this);
        })
    }


    private setHealthBar(value: number) {
        const height = 150;
        const currentLife = Phaser.Math.Clamp(value, 0, 100) / 100;
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
        this.milkTankLabel.text = `Milk Tank: ${this.milkTanks}`
    }

    update(time: number, delta: number): void {
    }
};
