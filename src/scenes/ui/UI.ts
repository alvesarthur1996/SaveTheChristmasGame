import Phaser from 'phaser'
import { sharedInstance as events } from '../eventCentre';
import { Weapons } from '../../utils/weapons';
import GameEvents from '../../utils/events';

export default class UI extends Phaser.Scene {
    private milkTankLabel!: Phaser.GameObjects.Text
    private milkTanks = 0;
    private lifeCounter = 3;
    private graphics!: Phaser.GameObjects.Graphics;
    private weaponEnergyBar!: Phaser.GameObjects.Graphics;
    private boss_graphics!: Phaser.GameObjects.Graphics;
    private currentWeapon!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: 'UI' });
    }

    init() {
        this.milkTanks = 0;
    }

    create() {
        this.graphics = this.add.graphics();
        this.boss_graphics = this.add.graphics();
        this.weaponEnergyBar = this.add.graphics();
        this.currentWeapon = this.add.text(this.weaponEnergyBar.x, this.weaponEnergyBar.y, Weapons.SnowBuster);
        this.setHealthBar(28);


        this.milkTankLabel = this.add.text(10, 10, 'Life Tank: 0', {
            fontSize: '32px'
        })
        events.on('life_tank_collected', this.milkTankCollected, this);
        events.on('health_changed', this.healthChanged, this);

        events.on('boss_arrived', this.setBossBar, this);
        events.on('boss_health_changed', this.setBossBar, this);

        events.on('weapon_changed', this.setWeaponEnergyBar, this);
        events.on('weapon_energy_changed', this.weaponEnergyChanged, this);

        events.once(GameEvents.LifeLoss, () => { this.lifeCounter-= 1; }, this);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            events.off('life_tank_collected', this.milkTankCollected, this);
        })
    }


    private setWeaponEnergyBar({ weaponName, weaponEnergy }: { weaponName: Weapons, weaponEnergy: number | null }) {
        this.currentWeapon.destroy();
        this.currentWeapon = this.add.text(this.weaponEnergyBar.x, this.weaponEnergyBar.y, weaponName);
        if (weaponEnergy == null) {
            this.weaponEnergyBar.clear();
            return;
        }

        const height = 150;
        const currentEnergy = Phaser.Math.Clamp(weaponEnergy, 0, 28) / 28;
        const offsetLife = 200 - (height * (currentEnergy));
        this.weaponEnergyBar.clear();
        this.weaponEnergyBar.fillStyle(0x9c9c9c);
        this.weaponEnergyBar.fillRect(50, 50, 30, height)
        if (currentEnergy > 0) {
            this.weaponEnergyBar.fillStyle(0x5555ff);
            this.weaponEnergyBar.fillRect(50, offsetLife, 30, (height * currentEnergy));
        }
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

    private weaponEnergyChanged({ weaponName, weaponEnergy }: { weaponName: Weapons, weaponEnergy: number | null }) {
        this.setWeaponEnergyBar({ weaponName, weaponEnergy });
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
