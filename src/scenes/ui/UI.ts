import Phaser from 'phaser'
import { sharedInstance as events } from '../eventCentre';
import { Weapons } from '../../utils/weapons';
import GameEvents from '../../utils/events';

export default class UI extends Phaser.Scene {
    private milkTankLabel!: Phaser.GameObjects.Text
    private milkTanks = 0;
    private lifeCounter = 3;
    private currentWeapon!: Phaser.GameObjects.Text;

    private bossEnergyBar!: Phaser.GameObjects.Image;
    private energyBar!: Phaser.GameObjects.Image;
    private weaponEnergyBar!: Phaser.GameObjects.Image;

    constructor() {
        super({ key: 'UI' });
    }

    init() {
        this.milkTanks = 0;
    }

    create() {
        this.graphics = this.add.graphics();
        this.boss_graphics = this.add.graphics();
        this.currentWeapon = this.add.text(5, 5, Weapons.SnowBuster);
        this.setHealthBar(28);

        this.milkTankLabel = this.add.text(300, 10, 'Life Tank: 0', {
            fontSize: '32px'
        })
        events.on('life_tank_collected', this.milkTankCollected, this);
        events.on('health_changed', this.healthChanged, this);

        events.on('boss_arrived', this.setBossBar, this);
        events.on('boss_health_changed', this.setBossBar, this);

        events.on('weapon_changed', this.setWeaponEnergyBar, this);
        events.on('weapon_energy_changed', this.weaponEnergyChanged, this);

        events.once(GameEvents.LifeLoss, () => { this.lifeCounter -= 1; }, this);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            events.off('life_tank_collected', this.milkTankCollected, this);
        })
    }

    private setWeaponEnergyBar({ weaponName, weaponEnergy }: { weaponName: Weapons, weaponEnergy: number | null }) {
        this.currentWeapon.destroy();

        this.currentWeapon = this.add.text(5, 5, weaponName);
        if (weaponEnergy == null) {
            if (this.weaponEnergyBar)
                this.weaponEnergyBar.destroy();
            return;
        }

        const currentLife = Phaser.Math.Clamp(weaponEnergy, 0, 28);

        if (this.weaponEnergyBar)
            this.weaponEnergyBar.destroy();

        this.weaponEnergyBar = this.add.image(40, 100, 'energy_bar_atlas', 'energy_bar_' + currentLife);
        this.weaponEnergyBar.setTint(0x5555ff)
        this.weaponEnergyBar.setScale(2.5);
    }

    private setHealthBar(value: number) {
        const currentLife = Phaser.Math.Clamp(value, 0, 28);

        if (this.energyBar)
            this.energyBar.destroy();

        this.energyBar = this.add.image(20, 100, 'energy_bar_atlas', 'energy_bar_' + currentLife);
        this.energyBar.setScale(2.5);
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
        const currentLife = Phaser.Math.Clamp(value, 0, 28);

        if (this.bossEnergyBar)
            this.bossEnergyBar.destroy();

        this.bossEnergyBar = this.add.image((this.scale.width - 20), 100, 'energy_bar_atlas', 'energy_bar_' + currentLife);
        this.bossEnergyBar.setTint(0xF08080)
        this.bossEnergyBar.setScale(2.5);


        // const height = 150;
        // const currentLife = Phaser.Math.Clamp(value, 0, 28) / 28;
        // const offsetLife = 200 - (height * (currentLife));

        // this.boss_graphics.clear();
        // this.boss_graphics.fillStyle(0x9c9c9c);
        // this.boss_graphics.fillRect((this.scale.width - 40), 50, 30, height)
        // if (currentLife > 0) {
        //     this.boss_graphics.fillStyle(0xff5555);
        //     this.boss_graphics.fillRect((this.scale.width - 40), offsetLife, 30, (height * currentLife));
        // }
    }

    update(time: number, delta: number): void {

    }
};
