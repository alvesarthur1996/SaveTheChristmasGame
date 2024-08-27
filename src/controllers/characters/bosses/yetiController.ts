import DefaultScene from "../../../scenes/defaultScene";
import Boss, { BossAtlas, BossWeapon } from "../../../utils/boss";
import { Weapons } from "../../../utils/weapons";
import BulletShoot from "../../bulletShoot";
import StateMachine from "../../stateMachine";
import IceBlock from "../../weapons/iceBlock";
import { sharedInstance as events } from "../../../scenes/eventCentre";
import BossController from "./bossController";

export default class YetiController extends BossController {
    public spawnPosition = { x: 0, y: 0 };
    public static shootDamage = 2;
    public static meleeDamage = 4;

    protected weakness: Weapons = Weapons.CandyBoomerang;

    constructor(scene: DefaultScene, player: Phaser.Physics.Matter.Sprite) {
        super(scene, player);
        this.stateMachine = new StateMachine(this, Boss.Yeti)

        this.createSprite();
        this.createAnimations();
        this.sprite.flipX = true;

        this.stateMachine
            .addState('idle', {
                onEnter: this.idleOnEnter
            })
            .addState('move', {
                onEnter: this.moveOnEnter,
                onUpdate: this.moveOnUpdate,
            })
            .addState('jump', {
                onEnter: this.jumpOnEnter,
                onUpdate: this.jumpOnUpdate,
            })
            .addState('jump_on_block', {
                onEnter: this.jumpOnBlockEnter,
                onUpdate: this.jumpOnBlockUpdate,
            })
            .addState('attack', {
                onEnter: this.attackOnEnter,
            })
            .addState('throw', {
                onEnter: this.shootOnEnter,
            })
            .addState('damage_taken', {
                onEnter: this.damageTakenOnEnter,
            })
            .addState('death', {
                onEnter: this.deathOnEnter
            })
            .setState('idle');

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

        this.weaponList.push(BossWeapon.IceBlock);
        this.changeWeapon(BossWeapon.IceBlock);
    }

    protected onSensorCollide({ bodyA, bodyB, pair }) {

        if (bodyB.gameObject instanceof BulletShoot && !this.invencibility) {
            let damage = bodyB.gameObject.damage;
            if (bodyB.gameObject instanceof IceBlock) {
                if (bodyA === this.sensors.left) {
                    this.isTouching.left = true;
                    if (pair && pair.separation > 0.5 && this.sprite.x) this.sprite.x += pair.separation - 0.5;
                } else if (bodyA === this.sensors.right) {
                    this.isTouching.right = true;
                    if (pair && pair.separation > 0.5 && this.sprite.x) this.sprite.x -= pair.separation - 0.5;
                } else if (bodyA === this.sensors.bottom) {
                    this.isTouching.ground = true;
                }
                return;
            }

            if (bodyB.gameObject.name == this.weakness) {
                damage = damage + 3;
            }
            this.stateMachine.setState('damage_taken');
            this.setHealth(this.health - damage);
            return;
        } else if (this.invencibility && bodyB.gameObject instanceof BulletShoot) {
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

        if (bodyB?.gameObject instanceof Phaser.Physics.Matter.TileBody) {
            return;
        }
    }
    protected fightMode(delta: number) {
        if (!this.player) return;

        if (this.currentAction === 'death' && !this.stateMachine.isCurrentState('death')) {
            this.stateMachine.setState(this.currentAction);
            return;
        } else if (this.currentAction === 'death' && this.stateMachine.isCurrentState('death')) {
            return;
        }

        this.actionTime += delta;

        switch (this.currentAction) {
            case 'move':
                if (this.actionTime >= 3200)
                    this.actionTime = 0;
                if (this.actionTime > 0) return;
                break;
            case 'idle':
                if (this.actionTime >= 1200)
                    this.actionTime = 0;
                if (this.actionTime > 0) return;
                break;
            case 'throw':
                if (this.actionTime >= 200)
                    this.actionTime = 0;
                if (this.actionTime > 0) return;
                break;
            case 'jump_on_block':
                if (this.actionTime >= 500)
                    this.actionTime = 0;
                if (this.actionTime > 0) return;
                break;
            default:
                if (this.actionTime >= 2000)
                    this.actionTime = 0;
                if (this.actionTime > 0) return;
                break;
        }

        let random = Phaser.Math.RND.between(0, 100);

        if (this.currentAction == 'throw' && this.stateMachine.isCurrentState('throw')) {
            this.currentAction = 'jump_on_block';
            this.stateMachine.setState(this.currentAction);
            return;
        }

        if (random >= 0 && random < 45) {
            this.currentAction = 'move';
        } else if (random >= 45 && random < 60) {
            this.currentAction = 'idle';
        } else if (random >= 60) {
            if (!this.stateMachine.isCurrentState('throw')) {
                this.currentAction = 'throw';
            } else {
                this.currentAction = 'jump_on_block';
            }
        }
        this.stateMachine.setState(this.currentAction);
    }

    private createSprite() {
        const { Body, Bodies } = Phaser.Physics.Matter.Matter;

        this.sprite = this.scene.matter.add.sprite(0, 0, Boss.Yeti);

        const { width: w, height: h } = this.sprite;
        const mainBody = Bodies.rectangle(1, 1, w * 0.5, h * 0.85, { chamfer: { radius: 4 } });

        this.sensors = {
            bottom: Bodies.rectangle(0, h * 0.85 * 0.55, w * 0.55, 0.5, { isSensor: true }),
            left: Bodies.rectangle(-w * 0.55 * 0.55, 2, 2, h * 0.5, { isSensor: true }),
            right: Bodies.rectangle(w * 0.55 * 0.55, 2, 2, h * 0.5, { isSensor: true })
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
            .setData('type', 'boss')
            .setName(Boss.Yeti)
            .setExistingBody(compoundBody)
            .setDepth(2)
            .setBounce(0)
            .setScale(1.1)
            .setFriction(0.8, 0, 1)
            .setFixedRotation();
    }
    private createAnimations() {
        this.sprite.anims.create({
            key: 'move',
            frames: this.sprite.anims.generateFrameNames(BossAtlas.Yeti, {
                prefix: 'yeti_run-',
                start: 0,
                end: 5,
            }),
            frameRate: 10,
            yoyo: true,
            repeat: -1
        });
        this.sprite.anims.create({
            key: 'idle',
            frames: this.sprite.anims.generateFrameNames(BossAtlas.Yeti, {
                prefix: 'yeti_idle-',
                start: 0,
                end: 3,
            }),
            frameRate: 10,
            yoyo: true,
            repeat: -1
        });
        this.sprite.anims.create({
            key: 'jump',
            frames: this.sprite.anims.generateFrameNames(BossAtlas.Yeti, {
                prefix: 'yeti_jump-',
                start: 0,
                end: 7,
            }),
            frameRate: 10,
            yoyo: true,
            repeat: -1
        });
        this.sprite.anims.create({
            key: 'attack',
            frames: this.sprite.anims.generateFrameNames(BossAtlas.Yeti, {
                prefix: 'yeti_attack-',
                start: 0,
                end: 5,
            }),
            frameRate: 10,
            yoyo: true,
        });
        this.sprite.anims.create({
            key: 'death',
            frames: this.sprite.anims.generateFrameNames(BossAtlas.Yeti, {
                prefix: 'yeti_death-',
                start: 0,
                end: 7,
            }),
            frameRate: 10,
        });
        this.sprite.anims.create({
            key: 'throw',
            frames: this.sprite.anims.generateFrameNames(BossAtlas.Yeti, {
                prefix: 'yeti_throw-',
                start: 0,
                end: 3,
            }),
            frameRate: 10,
            // yoyo: true,
        });
    }

    /* Character states */
    private idleOnEnter() {
        this.sprite.play('idle');
    }

    private moveOnEnter() {
        this.sprite.play('move');
    }
    private moveOnUpdate() {
        const speed = 2.25;
        this.sprite.flipX ? this.sprite.setVelocityX(-speed) : this.sprite.setVelocityX(speed);
        if (this.isTouching.left || this.isTouching.right) {
            this.sprite.flipX = !this.sprite.flipX;
            this.stateMachine.setState('idle');
        }
    }

    private jumpOnEnter() {
        this.sprite.setFrame('jump');
        this.sprite.setVelocityY(-6);
    }
    private jumpOnUpdate() {
        this.sprite.setFrame('jump');
        // let random = Math.ceil(Math.random() * 6);
        const random = 4;
        if (random < 2)
            this.sprite.flipX ? this.sprite.setVelocityX(-2) : this.sprite.setVelocityX(2);
        else
            this.sprite.flipX ? this.sprite.setVelocityX(-random) : this.sprite.setVelocityX(random);

        if (this.isTouching.ground)
            this.stateMachine.setState('idle');
    }

    private jumpOnBlockEnter() {
        this.sprite.setFrame('jump');
        this.sprite.setVelocityY(-3.7);
    }
    private jumpOnBlockUpdate() {
        this.sprite.setFrame('jump');
        this.sprite.flipX ? this.sprite.setVelocityX(-2) : this.sprite.setVelocityX(2);

        if (this.isTouching.ground)
            this.stateMachine.setState('idle');
    }

    private deathOnEnter() {
        this.scene.sound.play('death', { volume: 1 * (this.scene.SoundOptions.SFX / 10) });
        this.sprite.play('death');
        this.sprite.setVelocity(0, 0);
        // .setIgnoreGravity(true);
        setTimeout(() => {
            this.destroy();
        }, 1000);
    }

    private damageTakenOnEnter() {
        this.invencibility = true
        this.stateMachine.setState(this.currentAction);
        const startColor = Phaser.Display.Color.ValueToColor(0xffffff)
        const endColor = Phaser.Display.Color.ValueToColor(0x999999)
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

    private shootOnEnter() {
        this.sprite.play('throw');
        if (this.player.x < this.sprite.x)
            this.sprite.flipX = true;
        else
            this.sprite.flipX = false;
        const shoot = this.shoots.find(shoot => !shoot.active);

        if (shoot) {
            shoot.fire(this.sprite);
        }
    }
    private attackOnEnter() {
        this.sprite.play('attack');
        if (this.player.x < this.sprite.x)
            this.sprite.flipX = true;
        else
            this.sprite.flipX = false;
    }
};
