import DefaultScene from "./defaultScene";
import Stages from "../utils/stages";
import { Weapons } from "../utils/weapons";
import ObstaclesController from '../controllers/obsctaclesController';
import InteractionsController from '../controllers/interactionsController';
import PlayerController from '../controllers/characters/playerController';

export default class StageComplete extends DefaultScene {
    private currentWeapon!: Weapons;
    private player!: PlayerController;
    private obstacles!: ObstaclesController;
    private interactions!: InteractionsController;

    constructor() {
        super({ key: Stages.StageComplete });
    }

    init(data: { weapon: Weapons }) {
        this.currentWeapon = data.weapon || Weapons.LaserBeam;
    }

    create() {
        const { width, height } = this.scale;

        this.cameras.main.fadeIn(250, 0, 0, 0);
        this.children.removeAll();

        // Add black background
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000).setOrigin(0.5);

        // Platform dimensions and position
        const platformY = height / 1.75;
        const platformWidth = width / 3;
        const platformHeight = 40;
        const platformX = width / 4.5;

        // Create a sprite-based platform that will work with collision detection        
        // Create platform with a custom label for StageComplete scene
        const platform = this.matter.add.rectangle(
            platformX,
            platformY,
            platformWidth,
            platformHeight,
            {
                isStatic: true,
                friction: 1,
                label: 'stage_complete_ground',
                // Add custom property to identify this type of ground
                collisionFilter: {
                    group: 0,
                    category: 0x0002,
                    mask: 0xFFFFFFFF
                }
            }
        );

        // Create boundaries
        const boundaryHeight = 160;
        const boundaryWidth = 40;

        const boundaryProperties = {
            isStatic: true,
            friction: 0.5,
            label: 'boundary'
        };

        // Left boundary
        this.matter.add.rectangle(
            platformX - platformWidth / 2,
            platformY - boundaryHeight / 2,
            boundaryWidth,
            boundaryHeight,
            boundaryProperties
        );

        // Right boundary
        this.matter.add.rectangle(
            platformX + platformWidth / 2,
            platformY - boundaryHeight / 2,
            boundaryWidth,
            boundaryHeight,
            boundaryProperties
        );

        // Initialize controllers
        this.obstacles = new ObstaclesController();
        this.interactions = new InteractionsController();        // Create player
        this.player = new PlayerController(this, this.obstacles, this.interactions);
        this.player.setSpritePosition(platformX, platformY - platformHeight * 2); // Position player above platform
        this.player.setWeapon(this.currentWeapon);
        // Enable debug for collision visualization (remove in production)
        this.matter.world.createDebugGraphic();
        this.matter.world.drawDebug = true;

        // Add weapon acquisition image
        const santaImg: Phaser.GameObjects.Image = this.add.image(width / 2, height / 2, 'you_got_a_new_weapon').setScale(0.33);
        santaImg.setOrigin(0, 0.5);
        santaImg.postFX.addVignette(0.675, 0.5, 0.4);

        // Show text animations
        this.textYouGotNewWeapon(height);

        // Show weapon name after delay
        setTimeout(() => {
            const weaponW = width / 4.5; // Platform X position matches this
            const weaponH = height / 1.5;
            this.loadWeaponName(weaponH, weaponW);
        }, 2500);
    }

    update(time: number, delta: number): void {
        if (this.player) {
            this.player.update(time, delta);
        }
    }

    private textYouGotNewWeapon(screenH: number) {
        const text = this.add.text(180, (screenH / 1.9) - 160, "You got a new Weapon", {
            fontFamily: "GameFont",
            fontSize: "12px",
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5, 0.5);

        const textWidth = text.width;
        const textHeight = text.height;

        const revealRect = this.add.rectangle(
            text.x - textWidth / 2,
            text.y - textHeight / 2,
            0,
            textHeight,
            0xffffff
        ).setOrigin(0, 0).setAlpha(0);

        const mask = revealRect.createGeometryMask();
        text.setMask(mask);

        this.tweens.add({
            targets: revealRect,
            width: textWidth,
            alpha: 0,
            duration: 1500,
            ease: 'Linear',
            onComplete: () => {
                text.clearMask();
            }
        });
    }

    private loadWeaponName(screenH: number, screenW: number) {
        const text = this.add.text(screenW, screenH, this.splitByCapitalLetters(this.currentWeapon), {
            fontFamily: "GameFont",
            fontSize: "12px",
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5, 0.5);

        text.alpha = 0;

        this.tweens.add({
            targets: text,
            alpha: { from: 0, to: 1 },
            duration: 1500,
            ease: 'Linear',
            onComplete: () => {
                setTimeout(() => {
                    this.returnToStageSelection();
                }, 5000);
            }
        });
    }

    private splitByCapitalLetters(str: string) {
        return str.replace(/([A-Z])/g, ' $1').trim();
    }

    private returnToStageSelection() {
        const currentScene = this.scene;
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', function () {
            currentScene.stop(Stages.StageComplete);
            currentScene.start(Stages.SelectStage);
        });
    }
}