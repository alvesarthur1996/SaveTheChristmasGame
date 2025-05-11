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

    // Configuration constants
    private static readonly PLATFORM_CONFIG = {
        WIDTH_RATIO: 3,      // platform width will be screen width / this value
        HEIGHT: 40,
        Y_RATIO: 1.75,      // platform Y position will be screen height / this value
        X_RATIO: 4.5        // platform X position will be screen width / this value
    };

    private static readonly BOUNDARY_CONFIG = {
        WIDTH: 40,
        HEIGHT: 160,
        FRICTION: 0.5
    };

    private static readonly ANIMATION_DELAYS = {
        WEAPON_NAME_DISPLAY: 2500,
        RETURN_TO_STAGE: 5000,
        FADE_IN: 250,
        TEXT_REVEAL: 1500
    };

    constructor() {
        super({ key: Stages.StageComplete });
    }

    init(data: { weapon: Weapons }) {
        this.currentWeapon = data.weapon || Weapons.LaserBeam;
    }

    create() {
        const { width, height } = this.scale;
        this.setupSceneBase(width, height);

        const platform = this.createPlatform(width, height);
        this.createBoundaries(platform);
        this.setupPlayer(platform);
        this.setupWeaponAcquisitionUI(width, height);
    }

    update(time: number, delta: number): void {
        if (this.player) {
            this.player.update(time, delta);
        }
    }
    private setupSceneBase(width: number, height: number): void {
        this.cameras.main.fadeIn(StageComplete.ANIMATION_DELAYS.FADE_IN, 0, 0, 0);
        this.children.removeAll();
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000).setOrigin(0.5);
    }

    private createPlatform(width: number, height: number) {
        const platformY = height / StageComplete.PLATFORM_CONFIG.Y_RATIO;
        const platformWidth = width / StageComplete.PLATFORM_CONFIG.WIDTH_RATIO;
        const platformX = width / StageComplete.PLATFORM_CONFIG.X_RATIO;

        return this.matter.add.rectangle(
            platformX,
            platformY,
            platformWidth,
            StageComplete.PLATFORM_CONFIG.HEIGHT,
            {
                isStatic: true,
                friction: 1,
                label: 'stage_complete_ground',
                collisionFilter: {
                    group: 0,
                    category: 0x0002,
                    mask: 0xFFFFFFFF
                }
            }
        );
    }

    private createBoundaries(platform: MatterJS.BodyType): void {
        const boundaryProperties = {
            isStatic: true,
            friction: StageComplete.BOUNDARY_CONFIG.FRICTION,
            label: 'boundary'
        };

        const platformBounds = platform.bounds;
        const boundaryY = platformBounds.min.y - StageComplete.BOUNDARY_CONFIG.HEIGHT / 2;

        // Left boundary
        this.matter.add.rectangle(
            platformBounds.min.x,
            boundaryY,
            StageComplete.BOUNDARY_CONFIG.WIDTH,
            StageComplete.BOUNDARY_CONFIG.HEIGHT,
            boundaryProperties
        );

        // Right boundary
        this.matter.add.rectangle(
            platformBounds.max.x,
            boundaryY,
            StageComplete.BOUNDARY_CONFIG.WIDTH,
            StageComplete.BOUNDARY_CONFIG.HEIGHT,
            boundaryProperties
        );
    }

    private setupPlayer(platform: MatterJS.BodyType): void {
        this.obstacles = new ObstaclesController();
        this.interactions = new InteractionsController();

        this.player = new PlayerController(this, this.obstacles, this.interactions);
        this.player.setSpritePosition(
            platform.bounds.min.x + (platform.bounds.max.x - platform.bounds.min.x) / 2,
            platform.bounds.min.y - StageComplete.PLATFORM_CONFIG.HEIGHT * 2
        );
        this.player.setWeapon(this.currentWeapon);

        // // Debug visualization (remove in production)
        // this.matter.world.createDebugGraphic();
        // this.matter.world.drawDebug = true;
    }

    private setupWeaponAcquisitionUI(width: number, height: number): void {
        const santaImg = this.add.image(width / 2, height / 2, 'you_got_a_new_weapon')
            .setScale(0.33)
            .setOrigin(0, 0.5);
        santaImg.postFX.addVignette(0.675, 0.5, 0.4);

        this.textYouGotNewWeapon(height);

        setTimeout(() => {
            const weaponW = width / StageComplete.PLATFORM_CONFIG.X_RATIO;
            const weaponH = height / 1.5;
            this.loadWeaponName(weaponH, weaponW);
        }, StageComplete.ANIMATION_DELAYS.WEAPON_NAME_DISPLAY);
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
        this.cameras.main.fadeOut(StageComplete.ANIMATION_DELAYS.FADE_IN, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            currentScene.stop(Stages.StageComplete);
            currentScene.start(Stages.SelectStage);
        });
    }
}