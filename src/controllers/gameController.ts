import { sharedInstance as events } from "../scenes/eventCentre";
import GameEvents from "../utils/events";

export default class GameController extends Phaser.Scene {
    public lifeCounter: number = 3;
    public lifeTanks: number = 0;

    constructor() {
        super('game-controller');
    }

    init() {
        this.scene.launch('MadFactory', {
            context: this
        });
    }

    create(){
        events.once(GameEvents.LifeGain, () => {
            this.lifeCounter++;
        }, this);
        events.once(GameEvents.LifeLoss, () => {
            this.lifeCounter--;
        }, this);
        events.once(GameEvents.CollectLifeTank, () => {
            this.lifeTanks++;
        }, this);
        events.once(GameEvents.UseLifeTank, () => {
            this.lifeTanks--;
        }, this);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            events.off(GameEvents.LifeLoss);
        })
    }

    update(time: number, delta: number): void {
        console.log(this.lifeCounter);
    }
};
