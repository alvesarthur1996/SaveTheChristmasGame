import Phaser from 'phaser';
import StateMachine from "../stateMachine";
import { sharedInstance as events } from '../../scenes/eventCentre';
import ObstaclesController from '../obstacles/obsctaclesController';
import { Bodies } from 'matter';
import Scene from '../../scenes/scene';
import GameEvents from '../../utils/events';
import GameController from '../gameController';

export type Keys = {
    up: Phaser.Input.Keyboard.Key,
    down: Phaser.Input.Keyboard.Key,
    left: Phaser.Input.Keyboard.Key,
    right: Phaser.Input.Keyboard.Key,
    jump: Phaser.Input.Keyboard.Key,
    shoot: Phaser.Input.Keyboard.Key
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
    private scene: Phaser.Scene;
    private sprite!: Phaser.Physics.Matter.Sprite;
    private sensors!: CollisionSensors
    private obstacles: ObstaclesController;
    private stateMachine: StateMachine;
    private cursors!: Keys
    private destroyed = false;

    private isTouching: TouchingDetection;
    private speedY = 0;
    private health = 100;
    private invencibility = false;
    private lifeCounter = 3;

    private lastEnemy?: Phaser.Physics.Matter.Sprite

    constructor(scene: Scene, obstacles: ObstaclesController) {
        this.scene = scene;
        this.obstacles = obstacles;
        this.createSprite();
        this.createAnimations();
        this.stateMachine = new StateMachine(this, 'player');
        this.isTouching = { left: false, right: false, ground: false };
        this.cursors = this.scene.input.keyboard!.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            jump: Phaser.Input.Keyboard.KeyCodes.K,
            shoot: Phaser.Input.Keyboard.KeyCodes.L,
        });

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
        if (this.cursors.left.isDown || this.cursors.right.isDown)
            this.stateMachine.setState('move')
        else if (Phaser.Input.Keyboard.JustDown(this.cursors.jump))
            this.stateMachine.setState('jump');
    }

    private fallingOnEnter() {
        this.sprite.setFrame('jump');
    }
    private fallingOnUpdate(dt: number) {
        const speedX = 1.5;
        this.sprite.setFrame('jump');
        if (this.stateMachine.isCurrentState('falling'))
            // this.fallSpeedFactor(dt);

            if (this.cursors.left.isDown && !this.isTouching.left) {
                this.sprite.flipX = true;
                this.sprite.setVelocityX(-speedX);
            } else if (this.cursors.right.isDown && !this.isTouching.right) {
                this.sprite.flipX = false;
                this.sprite.setVelocityX(speedX);
            } else {
                this.sprite.setVelocityX(0);
            }
    }

    private moveOnEnter() {
        this.sprite.play('move');
    }
    private moveOnUpdate() {
        const speedX = 1.5;

        if (this.cursors.left.isDown && !this.isTouching.left) {
            this.sprite.flipX = true;
            this.sprite.setVelocityX(-speedX);
        } else if (this.cursors.right.isDown && !this.isTouching.right) {
            this.sprite.flipX = false;
            this.sprite.setVelocityX(speedX);
        } else {
            this.sprite.setVelocityX(0);
            this.stateMachine.setState('idle');
        }
        const shotTriggered = Phaser.Input.Keyboard.JustDown(this.cursors.shoot);
        if (shotTriggered)
            this.stateMachine.setState('move_shot');

        const velocity = this.sprite.getVelocity();
        if (velocity.y > 1.5)
            this.stateMachine.setState('falling');

        const jumpTriggered = Phaser.Input.Keyboard.JustDown(this.cursors.jump);

        if (jumpTriggered && this.isTouching.ground) {
            this.stateMachine.setState('jump');
        }
    }

    private moveShotOnEnter() {
        this.sprite.play('move_shot');
    }

    private moveShotOnUpdate() {
        const speedX = 1.5;

        if (this.stateMachine.isCurrentState('move_shot') && !this.cursors.shoot.isDown)
            this.stateMachine.setState('move');

        if (this.cursors.left.isDown) {
            this.sprite.flipX = true;
            this.sprite.setVelocityX(-speedX);
        } else if (this.cursors.right.isDown) {
            this.sprite.flipX = false;
            this.sprite.setVelocityX(speedX);
        } else {
            this.sprite.setVelocityX(0);
            this.stateMachine.setState('idle');
        }
        const jumpTriggered = Phaser.Input.Keyboard.JustDown(this.cursors.jump);

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
        this.sprite.setVelocityY(-5);
        this.speedY = -5;
    }
    private jumpOnUpdate(dt: number) {
        const speedX = 1.5;
        this.sprite.setFrame('jump');
        if (this.stateMachine.isCurrentState('jump'))
            // this.fallSpeedFactor(dt);

            if (this.cursors.left.isDown && !this.isTouching.left) {
                this.sprite.flipX = true;
                this.sprite.setVelocityX(-speedX);
            } else if (this.cursors.right.isDown && !this.isTouching.right) {
                this.sprite.flipX = false;
                this.sprite.setVelocityX(speedX);
            } else {
                this.sprite.setVelocityX(0);
            }
    }

    private spikeHitOnEnter() {
        this.stateMachine.setState('idle');
        this.setHealth(0);
    }

    private enemyHitOnEnter() {
        this.stateMachine.setState('idle');
        if (this.invencibility) return;

        this.invencibility = true

        if (this.lastEnemy) {
            if (this.sprite.x < this.lastEnemy.x)
                this.sprite.setVelocityX(-2.5);
            else
                this.sprite.setVelocityX(2.5);
        }
        this.sprite.setVelocityY(-2)

        this.setHealth(this.health - 10);

        const startColor = Phaser.Display.Color.ValueToColor(0xffffff)
        const endColor = Phaser.Display.Color.ValueToColor(0x888888)
        this.scene.tweens.addCounter({
            from: 0,
            to: 100,
            duration: 100,
            repeat: 10,
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
        if (this.cursors.up.isDown)
            this.sprite.setVelocityY(-2);
        else if (this.cursors.down.isDown)
            this.sprite.setVelocityY(2);
        else
            this.sprite.setVelocityY(0);

        const jumpTriggered = Phaser.Input.Keyboard.JustDown(this.cursors.jump);

        if (jumpTriggered)
            this.stateMachine.setState('jump');
    }

    private climbOnExit() {
        this.sprite.setIgnoreGravity(false)
    }


    private deathOnEnter() {
        this.sprite.play('death');
        this.sprite.setVelocity(0, 0).setIgnoreGravity(true);
        // events.emit(GameEvents.LifeLoss, -1);
        this.lifeCounter--;
        this.scene.time.delayedCall(2000, () => {
            this.scene.cameras.main.fade(250, 0, 0, 0);
            this.scene.cameras.main.once("camerafadeoutcomplete", () => {
                if (this.lifeCounter < 0)
                    this.scene.scene.start("game-over")
                else
                    this.scene.scene.restart()
            });
        });

        this.removeCollisionListeners();
    }

    private fallSpeedFactor(dt: number) {
        let currentSpeed = this.speedY + 0.25;
        console.log("SPEED: ", currentSpeed);
        if (currentSpeed > 8)
            currentSpeed = 8;
        this.speedY = currentSpeed;

        this.sprite.setVelocityY(this.speedY);
    }

    private setHealth(value: number) {
        this.health = Phaser.Math.Clamp(value, 0, 100);
        events.emit('health_changed', this.health)

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
            .setDepth(2)
            .setBounce(0)
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

        if (bodyB.label == 'ladder') {
            if (this.cursors.up.isDown && !this.stateMachine.isCurrentState('climb'))
                this.stateMachine.setState('climb');
            return;
        }

        if (bodyB.label.indexOf('camera_trigger') !== -1) {
            events.emit(bodyB.label);
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
        }

        this.obstaclesHandler(bodyB);



        const gameObject = bodyB.gameObject
        if (!gameObject) return;

        if (gameObject instanceof Phaser.Physics.Matter.TileBody) {
            if ((this.stateMachine.isCurrentState('jump') || this.stateMachine.isCurrentState('falling')))
                this.stateMachine.setState('idle');
            return
        }

        this.interactiveItemsHandler(gameObject);
    }

    private obstaclesHandler(body: any) {
        if (this.invencibility) {
            if (this.obstacles.is('pit', body)) {
                this.stateMachine.setState('spike_hit');
                return
            }
        }

        if (this.obstacles.is('camera_trigger', body)) {
            events.emit(body.label);
            return;
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
            case 'milk_tank':
                events.emit('milk_tank_collected');
                sprite.destroy();
                break;
            case 'small_health':
                const smallHp: number = sprite.getData('health') ?? 0;
                this.health = Phaser.Math.Clamp(this.health + smallHp, 0, 100);
                events.emit('health_changed', this.health);
                sprite.destroy();
                break;
            case 'big_health':
                const biglHp: number = sprite.getData('health') ?? 0;
                this.health = Phaser.Math.Clamp(this.health + biglHp, 0, 100);
                events.emit('health_changed', this.health)
                sprite.destroy();
                break;
        }
    }

    private removeCollisionListeners() {
        const sensors = [this.sensors.bottom, this.sensors.left, this.sensors.right, this.sprite];
        this.scene.matterCollision.removeOnCollideStart({ objectA: sensors });
        this.scene.matterCollision.removeOnCollideActive({ objectA: sensors });
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

    update(dt: number) {
        if (this.destroyed) return;
        this.stateMachine.update(dt);
    }

    public setSpritePosition(x: number, y: number): void {
        this.sprite.setPosition(x, y);
    }

    public getSprite(): Phaser.Physics.Matter.Sprite {
        return this.sprite;
    }
}