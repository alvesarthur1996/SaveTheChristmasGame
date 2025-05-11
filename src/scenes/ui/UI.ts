import Phaser from 'phaser'
import { sharedInstance as events } from '../eventCentre';
import { Weapons } from '../../utils/weapons';
import GameEvents from '../../utils/events';
import PlayerController from '../../controllers/characters/playerController';

export default class UI extends Phaser.Scene {
    private lifeTankLabel!: Phaser.GameObjects.Text;
    private playerController?: PlayerController;
    private currentWeapon!: Phaser.GameObjects.Text;

    private bossEnergyBar!: Phaser.GameObjects.Image;
    private energyBar!: Phaser.GameObjects.Image;
    private weaponEnergyBar!: Phaser.GameObjects.Image;

    constructor() {
        super({ key: 'UI' });
    }

    create() {
        // Get reference to the player controller
        const activeScene = this.scene.manager.getScenes(true).find(scene =>
            scene.scene.key !== 'UI'
        );
        if (activeScene) {
            // @ts-ignore - We know this exists in our game scenes
            this.playerController = activeScene.playerController;
        }

        // Initialize UI elements
        this.currentWeapon = this.add.text(5, 5, Weapons.SnowBuster);
        this.setHealthBar(28);

        // Setup UI elements
        this.lifeTankLabel = this.add.text(300, 10, `Life Tanks: ${this.playerController?.getLifeTanks() ?? 0}`, {
            fontSize: '32px'
        });

        // Event listeners for game state
        events.on(GameEvents.CollectLifeTank, this.updateLifeTanks, this);
        events.on(GameEvents.LifeTankUsed, this.updateLifeTanks, this);
        events.on(GameEvents.HealthChanged, this.healthChanged, this);
        events.on(GameEvents.BossArrived, this.setBossBar, this);
        events.on(GameEvents.BossHealthChanged, this.setBossBar, this);
        events.on(GameEvents.WeaponChanged, this.setWeaponEnergyBar, this);
        events.on(GameEvents.WeaponEnergyChanged, this.weaponEnergyChanged, this);

        // Add pause/resume event handlers
        events.on(GameEvents.GamePaused, this.handlePause, this);
        events.on(GameEvents.GameResumed, this.handleResume, this);

        // Cleanup on shutdown
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            events.off(GameEvents.CollectLifeTank, this.updateLifeTanks, this);
            events.off(GameEvents.LifeTankUsed, this.updateLifeTanks, this);
            events.off(GameEvents.HealthChanged, this.healthChanged, this);
            events.off(GameEvents.BossArrived, this.setBossBar, this);
            events.off(GameEvents.BossHealthChanged, this.setBossBar, this);
            events.off(GameEvents.WeaponChanged, this.setWeaponEnergyBar, this);
            events.off(GameEvents.WeaponEnergyChanged, this.weaponEnergyChanged, this);
            events.off(GameEvents.GamePaused, this.handlePause, this);
            events.off(GameEvents.GameResumed, this.handleResume, this);
        });
    }

    private handlePause(): void {
        // Pause any UI animations or tweens
        this.tweens.pauseAll();
    }

    private handleResume(): void {
        // Resume UI animations or tweens
        this.tweens.resumeAll();
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

    private updateLifeTanks() {
        if (this.playerController) {
            this.lifeTankLabel.text = `Life Tanks: ${this.playerController.getLifeTanks()}`
        }
    }

    private setBossBar(value: number) {
        const currentLife = Phaser.Math.Clamp(value, 0, 28);

        if (this.bossEnergyBar)
            this.bossEnergyBar.destroy();

        this.bossEnergyBar = this.add.image((this.scale.width - 20), 100, 'energy_bar_atlas', 'energy_bar_' + currentLife);
        this.bossEnergyBar.setTint(0xF08080)
        this.bossEnergyBar.setScale(2.5);
    }
}
