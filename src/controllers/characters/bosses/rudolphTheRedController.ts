import IBoss from "../../../contracts/boss";
import DefaultScene from "../../../scenes/defaultScene";
import { sharedInstance as events } from "../../../scenes/eventCentre";
import Boss, { BossAtlas, BossWeapon } from "../../../utils/boss";
import { callWeaponClassDinamically } from "../../../utils/functions";
import { Weapons } from "../../../utils/weapons";
import BulletShoot from "../../bulletShoot";
import StateMachine from "../../stateMachine";
import IceBlock from "../../weapons/iceBlock";
import { CollisionSensors, TouchingDetection } from "../playerController";

export default class RudolphTheRedController implements IBoss {
    private stateMachine: StateMachine;
    private scene: DefaultScene
    private player: Phaser.Physics.Matter.Sprite;
    private sprite!: Phaser.Physics.Matter.Sprite;
    private baseHealth = 28;
    private health = this.baseHealth;
    private invencibility = false;
    private sensors!: CollisionSensors;
    private isTouching!: TouchingDetection;
    public spawnPosition = { x: 0, y: 0 };
    public static shootDamage = 2;
    public static meleeDamage = 4;
    private actionTime = 0;
    private currentAction!: string;
    private destroyed = false;


    private weakness: Weapons = Weapons.IceBlock;


    private weaponList: Array<BossWeapon> = [];
    private currentWeapon!: BossWeapon;
    private shoots: Array<BulletShoot> = [];



    constructor(scene: DefaultScene, player: Phaser.Physics.Matter.Sprite) {
        // super(scene, player);
        this.player = player;
        this.scene = scene;
        this.stateMachine = new StateMachine(this, Boss.RudolphTheRed)
        this.createSprite();
        this.createAnimations();
        this.isTouching = { left: false, right: false, ground: false };

        this.stateMachine
            .addState('idle', {
                onEnter: this.idleOnEnter
            })
            .addState('move', {
                onEnter: this.moveOnEnter,
                onUpdate: this.moveOnUpdate,
            })
            // .addState('jump', {
            //     onEnter: this.jumpOnEnter,
            //     onUpdate: this.jumpOnUpdate,
            // })
            // .addState('hit', {
            //     onEnter: this.hitOnEnter,
            // })
            .addState('shoot', {
                onEnter: this.shootOnEnter,
            })
            .addState('damage_taken', {
                onEnter: this.damageTakenOnEnter,
            })
            .addState('death', {
                onEnter: this.deathOnEnter
            })
            .setState('idle');

        this.scene.matter.world.on('beforeupdate', this.resetTouching, this);
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
        
        this.weaponList.push(BossWeapon.LaserBeam);
        this.changeWeapon(BossWeapon.LaserBeam);
    }

    private idleOnEnter() {
        this.sprite.play('idle');
    }

    private jumpOnEnter() {
        this.sprite.setFrame('jump');
        this.sprite.setVelocityY(-7);
    }
    private jumpOnUpdate() {
        this.sprite.setFrame('jump');
        let random = Math.ceil(Math.random() * 6);
        if (random < 2)
            this.sprite.flipX ? this.sprite.setVelocityX(-2) : this.sprite.setVelocityX(2);
        else
            this.sprite.flipX ? this.sprite.setVelocityX(-random) : this.sprite.setVelocityX(random);

        if (this.isTouching.ground)
            this.stateMachine.setState('idle');
    }
    private hitOnEnter() {
        this.sprite.play('hit');
    }
    private shootOnEnter() {
        this.sprite.play('shoot');
        if (this.player.x < this.sprite.x)
            this.sprite.flipX = false;
        else
            this.sprite.flipX = true;
        const shoot = this.shoots.find(shoot => !shoot.active);

        if (shoot) {
            setTimeout(() => {
                shoot.fire(this.sprite, true);
            }, 750);
        }
    }
    private moveOnEnter() {
        this.sprite.play('move');
    }
    private moveOnUpdate() {
        const speed = 3.75;
        !this.sprite.flipX ? this.sprite.setVelocityX(-speed) : this.sprite.setVelocityX(speed);
        if (this.isTouching.left || this.isTouching.right) {
            this.sprite.flipX = !this.sprite.flipX;
            this.stateMachine.setState('idle');
        }
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
            repeat: 11,
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
    private deathOnEnter() {
        this.scene.sound.play('death', { volume: 1 * (this.scene.SoundOptions.SFX / 10) });
        this.sprite.setVelocity(0, 0).setIgnoreGravity(true);
        this.destroy()
    }

    private createAnimations() {
        this.sprite.anims.create({
            key: 'move',
            frames: this.sprite.anims.generateFrameNames(BossAtlas.RudolphTheRed, {
                prefix: 'run_',
                start: 0,
                end: 4,
            }),
            frameRate: 10,
            yoyo: true,
            repeat: -1
        });
        this.sprite.anims.create({
            key: 'idle',
            frames: this.sprite.anims.generateFrameNames(BossAtlas.RudolphTheRed, {
                prefix: 'idle_',
                start: 0,
                end: 10,
            }),
            frameRate: 10,
            yoyo: true,
            repeat: -1
        });
        this.sprite.anims.create({
            key: 'shoot',
            frames: this.sprite.anims.generateFrameNames(BossAtlas.RudolphTheRed, {
                prefix: 'shoot_',
                start: 0,
                end: 11,
            }),
            frameRate: 10,
            yoyo: true,
        });
    }
    private createSprite() {
        const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules

        this.sprite = this.scene.matter.add.sprite(0, 0, Boss.RudolphTheRed, 'idle');

        const { width: w, height: h } = this.sprite;
        const mainBody = Bodies.rectangle(0, 3, w, h, { chamfer: { radius: 5 } });

        this.sensors = {
            bottom: Bodies.rectangle(0, h * 0.55, w * 0.55, 0.5, { isSensor: true }),
            left: Bodies.rectangle(-w * 0.55, 2, 2, h * 0.5, { isSensor: true }),
            right: Bodies.rectangle(w * 0.55, 2, 2, h * 0.5, { isSensor: true })
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
            .setName(Boss.RudolphTheRed)
            .setExistingBody(compoundBody)
            .setDepth(2)
            .setBounce(0)
            .setFriction(0.8, 0, 1)
            .setFixedRotation();
    }

    public setSpritePosition(x: number, y: number): void {
        this.sprite.setPosition(x, y);
    }

    private changeWeapon(weapon: BossWeapon) {
        if (this.weaponList.filter(i => i == weapon).length)
            this.currentWeapon = weapon;

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
    protected onSensorCollide({ bodyA, bodyB, pair }) {

        if (bodyB.gameObject instanceof BulletShoot && !this.invencibility) {
            let damage = bodyB.gameObject.damage;
            if (bodyB.gameObject.name == this.weakness) {
                damage = damage + 4;
            }
            this.stateMachine.setState('damage_taken');
            this.setHealth(this.health - damage);

            if (bodyB.gameObject instanceof IceBlock) {
                if (bodyA === this.sensors.left) {
                    this.isTouching.left = true;
                    if (pair && pair.separation > 0.5 && this.sprite.x) this.sprite.x += pair.separation - 0.5;
                } else if (bodyA === this.sensors.right) {
                    this.isTouching.right = true;
                    if (pair && pair.separation > 0.5 && this.sprite.x) this.sprite.x -= pair.separation - 0.5;
                }
            }

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
    protected setHealth(value: number) {
        this.health = Phaser.Math.Clamp(value, 0, this.baseHealth);
        events.emit('boss_health_changed', this.health);
        if (this.health == 0)
            this.stateMachine.setState('death');
    }
    protected resetTouching() {
        this.isTouching = {
            ground: false,
            left: false,
            right: false,
        };
    }

    protected removeCollisionListeners() {
        const sensors = [this.sensors.bottom, this.sensors.left, this.sensors.right, this.sprite];
        this.scene.matterCollision.removeOnCollideStart({ objectA: sensors });
        this.scene.matterCollision.removeOnCollideActive({ objectA: sensors });
    }
    private fightMode(delta: number) {
        if (!this.player) return;

        this.actionTime += delta;

        if (this.actionTime >= 2000)
            this.actionTime = 0;
        if (this.actionTime > 0) return;


        let random = Math.ceil(Math.random() * 80);
        if (random >= 0 && random < 45) {
            this.currentAction = 'move';
        } else if (random >= 45 && random < 60) {
            this.currentAction = 'idle';
        } else if ((random >= 60 && random < 100)) {
            this.currentAction = 'shoot';
        }
        this.stateMachine.setState(this.currentAction);
    }


    destroy() {
        this.destroyed = true;
        this.scene.events.off("update", this.update, this);
        this.scene.events.off("shutdown", this.destroy, this);
        this.scene.events.off("destroy", this.destroy, this);
        if (this.scene.matter.world) {
            this.scene.matter.world.off("beforeupdate", this.resetTouching, this);
        }

        this.removeCollisionListeners();

        this.sprite.destroy();
    }
    update(time: number, dt: number) {
        if (this.destroyed) return;
        this.stateMachine.update(dt);
        if (this.player)
            this.fightMode(dt);
    }
}
