import { Scene } from 'phaser';
import GameEvents from '../../utils/events';
import PlayerController from '../../controllers/characters/playerController';
import { sharedInstance as events } from '../../scenes/eventCentre';

export class PauseMenu extends Scene {
    private pauseGroup!: Phaser.GameObjects.Group;
    private playerController?: PlayerController;
    private useLifeTankButton!: Phaser.GameObjects.Text;
    private readonly maxHealth = 28;

    constructor() {
        super({ key: 'PauseMenu' });
    }

    create() {
        this.pauseGroup = this.add.group();

        // Get player controller from active game scene
        const activeScene = this.scene.manager.getScenes(true).find(scene =>
            scene.scene.key !== 'PauseMenu' && scene.scene.key !== 'UI'
        );
        if (activeScene) {
            // @ts-ignore - We know this exists in our game scenes
            this.playerController = activeScene.playerController;
        }

        // Semi-transparent background
        const overlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.7);
        overlay.setOrigin(0);
        this.pauseGroup.add(overlay);

        // Create menu container
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        // Title
        const title = this.add.text(centerX, centerY - 100, 'PAUSE', {
            fontSize: '32px',
            color: '#ffffff',
            fontFamily: 'GameFont'
        }).setOrigin(0.5);
        this.pauseGroup.add(title);

        // Current Health
        const healthText = this.add.text(centerX, centerY - 40,
            `HEALTH: ${this.playerController?.getHealth() ?? 0}/${this.maxHealth}`, {
            fontSize: '16px',
            color: '#ffffff',
            fontFamily: 'GameFont'
        }).setOrigin(0.5);
        this.pauseGroup.add(healthText);

        // Life Tank Count
        const lifeTankText = this.add.text(centerX, centerY,
            `LIFE TANKS: ${this.playerController?.getLifeTanks() ?? 0}`, {
            fontSize: '16px',
            color: '#ffffff',
            fontFamily: 'GameFont'
        }).setOrigin(0.5);
        this.pauseGroup.add(lifeTankText);

        // Use Life Tank Button
        const hasLifeTanks = (this.playerController?.getLifeTanks() ?? 0) > 0 &&
            (this.playerController?.getHealth() ?? 28) < 28;
        this.useLifeTankButton = this.add.text(centerX, centerY + 40, 'USE LIFE TANK', {
            fontSize: '16px',
            color: hasLifeTanks ? '#ffffff' : '#666666',
            fontFamily: 'GameFont'
        }).setOrigin(0.5);

        if (hasLifeTanks) {
            this.useLifeTankButton
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => this.useLifeTank())
                .on('pointerover', () => this.useLifeTankButton.setColor('#ffff00'))
                .on('pointerout', () => this.useLifeTankButton.setColor('#ffffff'));
        }
        this.pauseGroup.add(this.useLifeTankButton);

        // Resume Button
        const resumeButton = this.add.text(centerX, centerY + 80, 'RESUME', {
            fontSize: '16px',
            color: '#ffffff',
            fontFamily: 'GameFont'
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.resumeGame())
            .on('pointerover', () => resumeButton.setColor('#ffff00'))
            .on('pointerout', () => resumeButton.setColor('#ffffff'));
        this.pauseGroup.add(resumeButton);

        // Listen for events
        this.events.on('wake', this.onWake, this);

        // Listen for health and life tank changes
        this.game.events.on(GameEvents.LifeTankUsed, this.updateUI, this);
        this.game.events.on(GameEvents.HealthChanged, this.updateUI, this);
    }

    private updateUI() {
        if (!this.playerController) return;

        // Update health text
        const healthText = this.pauseGroup.getChildren()[2] as Phaser.GameObjects.Text;
        healthText.setText(`HEALTH: ${this.playerController.getHealth()}/${this.maxHealth}`);

        // Update life tank text
        const lifeTankText = this.pauseGroup.getChildren()[3] as Phaser.GameObjects.Text;
        lifeTankText.setText(`LIFE TANKS: ${this.playerController.getLifeTanks()}`);

        // Update use life tank button state
        const hasLifeTanks = this.playerController.getLifeTanks() > 0 && this.playerController.getHealth() < 28;
        this.useLifeTankButton.setColor(hasLifeTanks ? '#ffffff' : '#666666');
        if (hasLifeTanks) {
            this.useLifeTankButton.setInteractive({ useHandCursor: true });
        } else {
            this.useLifeTankButton.disableInteractive();
        }
    }

    private useLifeTank() {
        if (this.playerController?.useLifeTank()) {
            this.updateUI();
        }
    }

    private onWake() {
        // Re-fetch player controller and update UI when scene wakes
        const activeScene = this.scene.manager.getScenes(true).find(scene =>
            scene.scene.key !== 'PauseMenu' && scene.scene.key !== 'UI'
        );
        if (activeScene) {
            // @ts-ignore - We know this exists in our game scenes
            this.playerController = activeScene.playerController;
            this.updateUI();
        }
    }

    private resumeGame() {
        this.scene.sleep();
        this.scene.get('Stage')?.scene.resume();
        events.emit(GameEvents.GameResumed);
    }

    shutdown() {
        // Clean up event listeners
        this.events.off('wake');
        this.game.events.off(GameEvents.LifeTankUsed, this.updateUI, this);
        this.game.events.off(GameEvents.HealthChanged, this.updateUI, this);
    }
}
