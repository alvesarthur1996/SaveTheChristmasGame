import Phaser, { Textures } from 'phaser';
import StateMachine from "../stateMachine";
import { sharedInstance as events } from '../../scenes/eventCentre';
import ObstaclesController from '../obsctaclesController';
import { Bodies } from 'matter';
import Scene from '../../scenes/scene';
import GameEvents from '../../utils/events';
import InteractionsController from '../interactionsController';
import { Weapons } from '../../utils/weapons';
import BulletShoot from '../bulletShoot';
import { callWeaponClassDinamically, weaponIsAvailable } from '../../utils/functions';
import Boss, { BossWeapon } from '../../utils/boss';
import GingerMadController from './bosses/gingerMadController';
import RudolphTheRedController from './bosses/rudolphTheRedController';
import JoystickProvider, { GamepadInput } from '../joystick/joystickProvider';
import KeyboardProvider from '../joystick/keyboardProvider';
import InputHandler from '../joystick/InputHandler';
import DefaultScene from '../../scenes/defaultScene';
import YetiController from './bosses/yetiController';
import Stages from '../../utils/stages';
import UI from '../../scenes/ui/UI';

export type Keys = {
    up: Phaser.Input.Keyboard.Key,
    down: Phaser.Input.Keyboard.Key,
    left: Phaser.Input.Keyboard.Key,
    right: Phaser.Input.Keyboard.Key,
    jump: Phaser.Input.Keyboard.Key,
    shoot: Phaser.Input.Keyboard.Key,
    change_weapon: Phaser.Input.Keyboard.Key,
};

export type TouchingDetection = {
    left: Boolean,
    right: Boolean,
    ground: Boolean,
}

export type CollisionSensors = {
    left: Bodies,
    right: Bodies,
    bottom: Bodies,
}

export default class PlayerController {
    private scene: DefaultScene;
    private sprite!: Phaser.Physics.Matter.Sprite;
    private sensors!: CollisionSensors
    private obstacles: ObstaclesController;
    private interactions: InteractionsController;
    private stateMachine: StateMachine;
    private destroyed = false;

    private controller!: JoystickProvider;
    private keyboard!: KeyboardProvider;
    private inputHandler!: InputHandler;

    private isTouching: TouchingDetection;
    private speedY = 0;
    private health = 28;
    private invencibility = false;
    public spawnPosition = { x: 0, y: 0 };
    private lifeCounter = 3;
    private lifeTanks: number = 0;

    private weaponList: Map<Weapons, number | null> = new Map();
    private currentWeapon: Weapons = Weapons.SnowBuster;
    private currentWeaponEnergy: null | number = null;
    private shoots: Array<BulletShoot> = [];

    private lastEnemy?: Phaser.Physics.Matter.Sprite
    private lastEnemyDamage?: number;

    private inputEnabled = true;

    constructor(scene: DefaultScene, obstacles: ObstaclesController, interactions: InteractionsController) {
        this.scene = scene;
        this.obstacles = obstacles;
        this.interactions = interactions;
        this.createSprite();
        this.createAnimations();
        this.stateMachine = new StateMachine(this, 'player');
        this.isTouching = { left: false, right: false, ground: false };

        const storedLife: string = localStorage.getItem('lifeCounter') ?? String(this.lifeCounter);
        this.lifeCounter = parseInt(storedLife);
        console.log('Life: ' + this.lifeCounter);
        /** Start Joystick and Keyboard */
        this.startControllers(scene);

        let spawnPosition: any = localStorage.getItem('spawnPosition');
        if (spawnPosition) {
            spawnPosition = JSON.parse(spawnPosition);
            this.spawnPosition = { x: spawnPosition.x, y: spawnPosition.y };
        }

        this.stateMachine
            .addState('idle', {
                onEnter: this.idleOnEnter,
                onUpdate: this.idleOnUpdate
            })
            .addState('falling', {
                onEnter: this.fallingOnEnter,
                onUpdate: this.fallingOnUpdate,
            })
            .addState('move', {
                onEnter: this.moveOnEnter,
                onUpdate: this.moveOnUpdate,
            })
            .addState('climb', {
                onEnter: this.climbOnEnter,
                onUpdate: this.climbOnUpdate,
                onExit: this.climbOnExit,
            })
            .addState('move_shot', {
                onEnter: this.moveShotOnEnter,
                onUpdate: this.moveShotOnUpdate,
                onExit: this.moveShotOnExit,
            })
            .addState('shoot', {
                onEnter: this.shootOnEnter,
                // onUpdate: this.shootOnUpdate,
                onExit: this.shootOnExit,
            })
            .addState('jump', {
                onEnter: this.jumpOnEnter,
                onUpdate: this.jumpOnUpdate,
            })
            .addState('enemy_hit', {
                onEnter: this.enemyHitOnEnter,
            })
            .addState('spike_hit', {
                onEnter: this.spikeHitOnEnter
            })
            .addState('death', {
                onEnter: this.deathOnEnter
            })
            .setState('idle');

        this.weaponList.set(Weapons.SnowBuster, null);

        Object.keys(Weapons)
            .filter(key => isNaN(Number(key)))
            .forEach((element: any) => {
                const weapon = Weapons[element as keyof typeof Weapons];

                if (weapon === Weapons.SnowBuster) {
                    return;
                }

                if (weaponIsAvailable(scene, weapon)) {
                    this.weaponList.set(element, 28);
                }
            });

        this.changeWeapon(Weapons.SnowBuster);


        this.scene.matter.world.on("beforeupdate", this.resetTouching, this);
        scene.matterCollision.addOnCollideStart({
            objectA: [this.sensors.bottom, this.sensors.left, this.sensors.right, this.sprite],
            callback: this.onSensorCollide,
            context: this
        });
        scene.matterCollision.addOnCollideActive({
            objectA: [this.sensors.bottom, this.sensors.left, this.sensors.right, this.sprite],
            callback: this.onSensorCollide,
            context: this
        });
        this.scene.events.on("update", this.update, this);
        this.scene.events.once("shutdown", this.destroy, this);
        this.scene.events.once("destroy", this.destroy, this);
    }

    private idleOnEnter() {
        this.sprite.play('idle');
    }
    private idleOnUpdate() {
        const velocity = this.sprite.getVelocity();

        if (this.inputHandler.isDown('left') || this.inputHandler.isDown('right'))
            this.stateMachine.setState('move')
        else if (this.inputHandler.isJustDown('A'))
            this.stateMachine.setState('jump');
        else if (this.inputHandler.isJustDown('X'))
            this.stateMachine.setState('shoot');
        else if (velocity.y >= 1.2)
            this.stateMachine.setState('falling');
    }

    private fallingOnEnter() {
        this.sprite.setFrame('jump');
    }
    private fallingOnUpdate(dt: number) {
        const speedX = 1.5;
        this.sprite.setFrame('jump');
        if (this.stateMachine.isCurrentState('falling'))
            // this.fallSpeedFactor(dt);

            if (this.inputHandler.isDown('left') && !this.isTouching.left) {
                this.sprite.flipX = true;
                this.sprite.setVelocityX(-speedX);
            } else if (this.inputHandler.isDown('right') && !this.isTouching.right) {
                this.sprite.flipX = false;
                this.sprite.setVelocityX(speedX);
            } else {
                this.sprite.setVelocityX(0);
            }

        const shotTriggered = this.inputHandler.isJustDown('X');
        if (shotTriggered) {
            this.sprite.setFrame('jump_shot');
            const shoot = this.shoots.find(shoot => !shoot.active);

            if (shoot && this.currentWeaponEnergy !== null && this.currentWeaponEnergy >= 1) {
                shoot.fire(this.sprite);
                this.currentWeaponEnergy = Phaser.Math.Clamp(this.currentWeaponEnergy - shoot.consume, 0, 28);
                events.emit(GameEvents.WeaponEnergyChanged, { weaponName: this.currentWeapon, weaponEnergy: this.currentWeaponEnergy });
            } else if (shoot && this.currentWeaponEnergy == null) {
                shoot.fire(this.sprite);
            }
            this.sprite.setFrame('jump');
        }
    }

    private moveOnEnter() {
        this.sprite.play('move');
    }
    private moveOnUpdate() {
        const speedX = 1.5;

        if (this.inputHandler.isDown('left') && !this.isTouching.left) {
            this.sprite.flipX = true;
            this.sprite.setVelocityX(-speedX);
        } else if (this.inputHandler.isDown('right') && !this.isTouching.right) {
            this.sprite.flipX = false;
            this.sprite.setVelocityX(speedX);
        } else {
            this.sprite.setVelocityX(0);
            this.stateMachine.setState('idle');
        }
        const shotTriggered = this.inputHandler.isJustDown('X');
        if (shotTriggered)
            this.stateMachine.setState('move_shot');

        const velocity = this.sprite.getVelocity();
        if (velocity.y > 1.5)
            this.stateMachine.setState('falling');

        const jumpTriggered = this.inputHandler.isJustDown('A');

        if (jumpTriggered && this.isTouching.ground) {
            this.stateMachine.setState('jump');
        }
    }

    private moveShotOnEnter() {
        this.sprite.play('move_shot');
        const shoot = this.shoots.find(shoot => !shoot.active);

        if (shoot && this.currentWeaponEnergy !== null && this.currentWeaponEnergy >= 1) {
            shoot.fire(this.sprite);
            this.currentWeaponEnergy = Phaser.Math.Clamp(this.currentWeaponEnergy - shoot.consume, 0, 28);
            events.emit(GameEvents.WeaponEnergyChanged, { weaponName: this.currentWeapon, weaponEnergy: this.currentWeaponEnergy });
        } else if (shoot && this.currentWeaponEnergy == null) {
            shoot.fire(this.sprite);
        }
    }

    private moveShotOnUpdate() {
        const speedX = 1.5;

        if (this.stateMachine.isCurrentState('move_shot') && !this.inputHandler.isJustDown('X'))
            this.stateMachine.setState('move');

        if (this.inputHandler.isDown('left')) {
            this.sprite.flipX = true;
            this.sprite.setVelocityX(-speedX);
        } else if (this.inputHandler.isDown('right')) {
            this.sprite.flipX = false;
            this.sprite.setVelocityX(speedX);
        } else {
            this.sprite.setVelocityX(0);
            this.stateMachine.setState('idle');
        }

        const jumpTriggered = this.inputHandler.isJustDown('A');

        if (jumpTriggered) {
            this.stateMachine.setState('jump');
        }
    }
    private moveShotOnExit() {
        this.sprite.on('animationcomplete', () => {
            this.sprite.stop();
        });
    }

    private jumpOnEnter() {
        if (!this.isTouching.ground) return;
        this.sprite.setFrame('jump');
        this.speedY = -2.3;
        this.sprite.setVelocityY(this.speedY);
    }

    private jumpOnUpdate(dt: number) {
        const speedX = 1.5;
        this.sprite.setFrame('jump');
        if (this.inputHandler.isDown('A') && !this.inputHandler.isJustDown('A')) {
            if (this.speedY <= -2.1 && this.speedY >= -5.25) {
                this.speedY -= 0.375;
                // Or this.speedY -= (dt/50);
            } else {
                this.speedY += 0.375;
                // Or this.speedY += (dt/50);
                this.stateMachine.setState('falling');
            }
            this.sprite.setVelocityY(this.speedY);
        }

        if (this.inputHandler.isDown('left') && !this.isTouching.left) {
            this.sprite.flipX = true;
            this.sprite.setVelocityX(-speedX);
        } else if (this.inputHandler.isDown('right') && !this.isTouching.right) {
            this.sprite.flipX = false;
            this.sprite.setVelocityX(speedX);
        } else {
            this.sprite.setVelocityX(0);
        }

        const shotTriggered = this.inputHandler.isJustDown('X');
        if (shotTriggered) {
            this.sprite.setFrame('jump_shot');
            const shoot = this.shoots.find(shoot => !shoot.active);

            if (shoot && this.currentWeaponEnergy !== null && this.currentWeaponEnergy >= 1) {
                shoot.fire(this.sprite);
                this.currentWeaponEnergy = Phaser.Math.Clamp(this.currentWeaponEnergy - shoot.consume, 0, 28);
                events.emit(GameEvents.WeaponEnergyChanged, { weaponName: this.currentWeapon, weaponEnergy: this.currentWeaponEnergy });
            } else if (shoot && this.currentWeaponEnergy == null) {
                shoot.fire(this.sprite);
            }
            this.sprite.setFrame('jump');
        }
    }

    private shootOnEnter() {
        const shoot = this.shoots.find(shoot => !shoot.active);

        if (shoot && this.currentWeaponEnergy !== null && this.currentWeaponEnergy >= 1) {
            shoot.fire(this.sprite);
            this.stateMachine.setState('idle');
            this.currentWeaponEnergy = Phaser.Math.Clamp(this.currentWeaponEnergy - shoot.consume, 0, 28);
            events.emit(GameEvents.WeaponEnergyChanged, { weaponName: this.currentWeapon, weaponEnergy: this.currentWeaponEnergy });
        } else if (shoot && this.currentWeaponEnergy == null) {
            shoot.fire(this.sprite);
            this.stateMachine.setState('idle');
        } else {
            this.stateMachine.setState('idle');
        }
    }
    private shootOnUpdate(dt: number) {

    }
    private shootOnExit() {
        // this.stateMachine.setState('idle');
    }


    private spikeHitOnEnter() {
        this.stateMachine.setState('idle');
        this.setHealth(0);
    }

    private enemyHitOnEnter() {
        if (this.invencibility) return;

        this.invencibility = true
        this.stateMachine.setState('idle');

        if (this.lastEnemy) {
            if (this.sprite.x < this.lastEnemy.x)
                this.sprite.setVelocityX(-4.5);
            else
                this.sprite.setVelocityX(4.5);
        }
        this.sprite.setVelocityY(-2)
        this.setHealth(this.health - (this.lastEnemyDamage ?? 3));

        const startColor = Phaser.Display.Color.ValueToColor(0xffffff)
        const endColor = Phaser.Display.Color.ValueToColor(0x888888)
        this.scene.tweens.addCounter({
            from: 0,
            to: 100,
            duration: 100,
            repeat: 8,
            yoyo: true,
            ease: Phaser.Math.Easing.Sine.InOut,
            onUpdate: tween => {
                const value = tween.getValue();
                const colorObject = Phaser.Display.Color.Interpolate.ColorWithColor(startColor, endColor, 100, value)

                const color = Phaser.Display.Color.GetColor(
                    colorObject.r,
                    colorObject.g,
                    colorObject.b,
                )

                this.sprite.setTint(color);
            },
            onComplete: () => { this.invencibility = false }
        });
    }

    private climbOnEnter() {
        this.sprite.play('idle');
        this.sprite.setVelocityX(0);
        this.sprite.setIgnoreGravity(true)
    }
    private climbOnUpdate(dt) {
        if (this.inputHandler.isDown('up'))
            this.sprite.setVelocityY(-2);
        else if (this.inputHandler.isDown('down'))
            this.sprite.setVelocityY(2);
        else
            this.sprite.setVelocityY(0);

        const jumpTriggered = this.inputHandler.isJustDown('A');

        if (jumpTriggered)
            this.stateMachine.setState('jump');
    }
    private climbOnExit() {
        this.sprite.setIgnoreGravity(false)
    }

    private deathOnEnter() {
        this.sprite.play('death');
        this.scene.sound.play('death', { volume: 1 * (this.scene.SoundOptions.SFX / 10) })
        this.sprite.setVelocity(0, 0).setIgnoreGravity(true);

        if (!this.destroyed) {
            this.destroyed = true;
            events.emit(GameEvents.LifeLoss);

            this.scene.time.delayedCall(2000, () => {
                this.scene.cameras.main.fade(250, 0, 0, 0);
                this.scene.cameras.main.once("camerafadeoutcomplete", () => {
                    if (this.lifeCounter > 0) {
                        this.lifeCounter -= 1;
                        localStorage.setItem('lifeCounter', `${this.lifeCounter}`);
                        this.scene.scene.restart();
                    } else {
                        this.spawnPosition = { x: 0, y: 0 };
                        this.scene.scene.stop(this.scene.name);
                        this.scene.scene.stop('UI');
                        this.scene.scene.start(Stages.SelectStage);
                        localStorage.setItem('lifeCounter', '3');
                        localStorage.setItem('spawnPosition', JSON.stringify({ x: 0, y: 0 }));
                    }
                });
            });
        }

        this.removeCollisionListeners();
    }

    private fallSpeedFactor(dt: number) {
        let currentSpeed = this.speedY + 0.25;
        if (currentSpeed > 8)
            currentSpeed = 8;
        this.speedY = currentSpeed;

        this.sprite.setVelocityY(this.speedY);
    }

    private setHealth(value: number) {
        this.health = Phaser.Math.Clamp(value, 0, 28);
        events.emit(GameEvents.HealthChanged, this.health)

        if (this.health == 0)
            this.stateMachine.setState('death');
    }

    private createAnimations() {
        this.sprite.anims.create({
            key: 'move',
            frames: this.sprite.anims.generateFrameNames('santa_claus_atlas', {
                prefix: 'run_',
                start: 1,
                end: 3,
            }),
            frameRate: 10,
            repeat: -1,
            yoyo: true
        });
        this.sprite.anims.create({
            key: 'move_shot',
            frames: this.sprite.anims.generateFrameNames('santa_claus_atlas', {
                prefix: 'run_shot_',
                start: 1,
                end: 3,
            }),
            frameRate: 10,
            repeat: -1,
            yoyo: true

        });
        this.sprite.anims.create({
            key: 'death',
            frames: this.sprite.anims.generateFrameNames('santa_claus_atlas', {
                prefix: 'death_',
                start: 1,
                end: 8,
            }),
            frameRate: 10,
        });
        this.sprite.anims.create({
            key: 'jump',
            frames: this.sprite.anims.generateFrameNames('santa_claus_atlas', {
                frames: [0]
            }),
            frameRate: 1,
        });
        this.sprite.anims.create({
            key: 'idle',
            frames: this.sprite.anims.generateFrameNames('santa_claus_atlas', {
                prefix: 'idle_',
                frames: [1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            }),
            frameRate: 10,
            repeat: -1
        });
    }

    private createSprite() {
        const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules

        this.sprite = this.scene.matter.add.sprite(0, 0, 'santa_claus', 'idle');

        const { width: w, height: h } = this.sprite;
        const mainBody = Bodies.rectangle(0, 0, w * 0.6, h * 0.7, { chamfer: { radius: 1 } });

        this.sensors = {
            bottom: Bodies.rectangle(0, h * 0.35, w * 0.55, 2, { isSensor: true }),
            left: Bodies.rectangle(-w * 0.35, 0, 2, h * 0.5, { isSensor: true }),
            right: Bodies.rectangle(w * 0.35, 0, 2, h * 0.5, { isSensor: true })
        };
        const compoundBody = Body.create({
            parts: [mainBody, this.sensors.bottom, this.sensors.left, this.sensors.right],
            frictionStatic: 0,
            frictionAir: 0.02,
            friction: 0.1,
            // The offset here allows us to control where the sprite is placed relative to the
            // matter body's x and y - here we want the sprite centered over the matter body.
            render: { sprite: { xOffset: 0.5, yOffset: 0.5 } },
        });

        this.sprite
            .setExistingBody(compoundBody)
            .setName('player')
            .setDepth(2)
            .setBounce(0)
            .setFriction(1)
            .setFixedRotation();
    }

    private resetTouching() {
        this.isTouching = {
            ground: false,
            left: false,
            right: false,
        };
    }

    private onSensorCollide({ bodyA, bodyB, pair }) {
        const hasAnyStageInteraction = this.stageInteractionHandler(bodyB);
        if (hasAnyStageInteraction) return;

        if (this.invencibility && (Object.values(Boss).includes(bodyB.gameObject?.name) || Object.values(BossWeapon).includes(bodyB.gameObject?.name))) {
            return;
        }

        if (bodyA === this.sensors.left) {
            this.isTouching.left = true;
            if (pair.separation > 0.5) this.sprite.x += pair.separation - 0.5;
        } else if (bodyA === this.sensors.right) {
            this.isTouching.right = true;
            if (pair.separation > 0.5) this.sprite.x -= pair.separation - 0.5;
        } else if (bodyA === this.sensors.bottom) {
            this.isTouching.ground = true;
            // If we're in jump or falling state and hit ground, go to idle
            if ((this.stateMachine.isCurrentState('jump') || this.stateMachine.isCurrentState('falling'))) {
                if (bodyB.label === 'stage_complete_ground' || bodyB.gameObject instanceof Phaser.Physics.Matter.TileBody) {
                    this.stateMachine.setState('idle');
                }
            }
        }

        this.obstaclesHandler(bodyB);

        const gameObject = bodyB.gameObject;
        if (!gameObject) return;

        if (gameObject instanceof Phaser.Physics.Matter.TileBody) {
            return;
        }

        if (gameObject.name == Weapons.IceBlock) {
            return;
        }

        if (gameObject.getData('type') == 'boss' || Object.keys(BossWeapon).includes(gameObject.name)) {
            this.handleBossCollision(gameObject);
        }

        this.interactiveItemsHandler(gameObject);
    }

    private stageInteractionHandler(body: any) {
        if (body.label == 'ladder') {
            if (this.inputHandler.isDown('up') && !this.stateMachine.isCurrentState('climb')) {
                this.stateMachine.setState('climb');
            }
            return true;
        }

        if (this.interactions.is('camera_trigger', body)) {
            events.emit(body.label);
            return true;
        }

        if (this.interactions.is('new_spawn', body)) {
            localStorage.setItem("spawnPosition", JSON.stringify(body.position));
            return true;
        }

        if (this.interactions.is('boss_near_spawn', body)) {
            localStorage.setItem("spawnPosition", JSON.stringify(body.position));
            events.emit('boss_near_spawn');
            return true;
        }

    }

    private obstaclesHandler(body: any) {
        if (this.invencibility) {
            if (this.obstacles.is('pit', body)) {
                this.stateMachine.setState('spike_hit');
                return
            }
        }

        if (this.obstacles.is('spike', body) || this.obstacles.is('pit', body) || this.obstacles.is('lethal', body)) {
            this.stateMachine.setState('spike_hit');
            return
        }
        if (this.obstacles.is('met_enemy', body)) {
            this.lastEnemy = body.gameObject;
            this.stateMachine.setState('enemy_hit');
            return
        }
    }


    private interactiveItemsHandler(gameObject: Phaser.Physics.Matter.Sprite) {
        const sprite = gameObject as Phaser.Physics.Matter.Sprite
        const type = sprite.getData('type');

        switch (type) {
            case 'life_tank':
                this.lifeTanks++;
                events.emit(GameEvents.CollectLifeTank);
                sprite.destroy();
                break;
            case 'small_health':
                const smallHp: number = sprite.getData('health') ?? 0;
                this.health = Phaser.Math.Clamp(this.health + smallHp, 0, 28);
                events.emit(GameEvents.HealthChanged, this.health);
                sprite.destroy();
                break;
            case 'big_health':
                const biglHp: number = sprite.getData('health') ?? 0;
                this.health = Phaser.Math.Clamp(this.health + biglHp, 0, 28);
                events.emit(GameEvents.HealthChanged, this.health)
                sprite.destroy();
                break;
        }
    }


    private handleBossCollision(gameObject: Phaser.Physics.Matter.Sprite) {
        if (Boss.GingerMad == gameObject.name) {
            this.lastEnemyDamage = GingerMadController.meleeDamage;
        }
        else if (BossWeapon.CandyBoomerang == gameObject.name) {
            this.lastEnemyDamage = GingerMadController.shootDamage;
        }
        else if (Boss.RudolphTheRed == gameObject.name) {
            this.lastEnemyDamage = RudolphTheRedController.meleeDamage;
            this.sprite.setVelocityY(-8);
        }
        else if (BossWeapon.LaserBeam == gameObject.name) {
            this.lastEnemyDamage = RudolphTheRedController.shootDamage;
        }
        else if (Boss.Yeti == gameObject.name) {
            this.lastEnemyDamage = YetiController.meleeDamage;
            this.sprite.setVelocityY(-8);
        }
        else if (BossWeapon.IceBlock == gameObject.name) {
            // this.lastEnemyDamage = YetiController.shootDamage;
        }

        this.lastEnemy = gameObject;
        this.stateMachine.setState('enemy_hit');
    }

    private removeCollisionListeners() {
        const sensors = [this.sensors.bottom, this.sensors.left, this.sensors.right, this.sprite.body];
        // @ts-ignore - Type mismatch in matter-js collision system
        this.scene.matterCollision.removeOnCollideStart({ objectA: sensors });
        // @ts-ignore - Type mismatch in matter-js collision system
        this.scene.matterCollision.removeOnCollideActive({ objectA: sensors });
    }

    private changeWeapon(weapon: Weapons) {
        this.currentWeapon = weapon;

        this.shoots.forEach(item => item.destroy());
        this.shoots = [];

        for (let i = 0; i <= 64; i++) {
            const weapon = callWeaponClassDinamically(this.currentWeapon, {
                world: this.scene.matter.world,
                x: this.sprite.x,
                y: this.sprite.y,
                bodyOptions: {},
                soundOptions: this.scene.SoundOptions
            });
            if (weapon) this.shoots.push(weapon);
        }
    }

    private handleChangeCurrentWeapon() {
        const currentWeaponShoots: number | null = this.currentWeaponEnergy;
        if (this.weaponList.size <= 1)
            return;

        this.weaponList.delete(this.currentWeapon);

        const nextWeapon = this.weaponList.entries().next();
        const { value }: IteratorResult<[Weapons, number | null], any> = nextWeapon;
        const weaponName: Weapons = value[0];
        const weaponEnergy: number | null = value[1];
        this.weaponList.set(this.currentWeapon, currentWeaponShoots);
        this.currentWeaponEnergy = weaponEnergy;

        events.emit(GameEvents.WeaponChanged, { weaponName, weaponEnergy });
        this.changeWeapon(weaponName);
    }

    private startControllers(scene: Phaser.Scene) {
        this.controller = new JoystickProvider(scene, 0);
        this.keyboard = new KeyboardProvider(scene);
        this.inputHandler = this.inputHandler = new InputHandler(scene, {
            'A': [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.K),
                this.controller.getInput(GamepadInput.A)
            ],
            'left': [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.A),
                this.controller.getInput(GamepadInput.Left)
            ],
            'right': [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.D),
                this.controller.getInput(GamepadInput.Right),
            ],
            'up': [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.W),
                this.controller.getInput(GamepadInput.Up),
            ],
            'down': [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.S),
                this.controller.getInput(GamepadInput.Down),
            ],
            'X': [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.L),
                this.controller.getInput(GamepadInput.X)
            ],
            'R1': [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.P),
                this.controller.getInput(GamepadInput.RB)
            ],
            'Start': [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.ENTER),
                this.controller.getInput(GamepadInput.Start)
            ]
        });
    }

    public setSpritePosition(x: number, y: number): void {
        this.sprite.setPosition(x, y);
    }

    public getSprite(): Phaser.Physics.Matter.Sprite {
        return this.sprite;
    }


    public setWeapon(weapon: Weapons): void {
        this.changeWeapon(weapon);
    }

    public disableInput(): void {
        this.inputEnabled = false;
    }

    public enableInput(): void {
        this.inputEnabled = true;
    }

    public getHealth(): number {
        return this.health;
    }

    public getLifeTankCount(): number {
        return this.lifeCounter;
    }

    public getLifeTanks(): number {
        return this.lifeTanks;
    }

    public useLifeTank(): boolean {
        if (this.lifeTanks > 0 && this.health < 28) {
            this.lifeTanks--;
            this.health = 28; // Full health
            events.emit(GameEvents.HealthChanged, this.health);
            events.emit(GameEvents.LifeTankUsed);
            return true;
        }
        return false;
    }

    update(time: number, delta: number): void {
        if (!this.inputEnabled) return;
        this.controller.update(time, delta);
        this.keyboard.update(time, delta);

        if (this.destroyed) return;
        this.stateMachine.update(delta);

        if (this.inputHandler.isJustDown('R1')) {
            this.handleChangeCurrentWeapon();
        }

        if (this.inputHandler.isJustDown('Start') && this.scene.scene.key !== Stages.StageComplete) {
            this.scene.togglePause();
        }
    }

    destroy() {
        this.destroyed = true;

        // Event listeners
        this.scene.events.off("update", this.update, this);
        this.scene.events.off("shutdown", this.destroy, this);
        this.scene.events.off("destroy", this.destroy, this);
        if (this.scene.matter.world) {
            this.scene.matter.world.off("beforeupdate", this.resetTouching, this);
        }

        this.removeCollisionListeners();

        this.sprite.destroy();
    }
}