import IBoss from "../../../contracts/boss";
import DefaultScene from "../../../scenes/defaultScene";
import { sharedInstance as events } from "../../../scenes/eventCentre";
import Boss, { BossWeapon } from "../../../utils/boss";
import { callWeaponClassDinamically } from "../../../utils/functions";
import Stages from "../../../utils/stages";
import { Weapons } from "../../../utils/weapons";
import BulletShoot from "../../bulletShoot";
import StateMachine from "../../stateMachine";
import { CollisionSensors, TouchingDetection } from "../playerController";
import GameEvents from '../../../utils/events';

export default class GingerMadController implements IBoss {
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
    public static shootDamage = 5;
    public static meleeDamage = 2;
    private actionTime = 0;
    private currentAction!: string;
    private destroyed = false;

    private weakness: Weapons = Weapons.CandyBoomerang;

    private weaponList: Array<BossWeapon> = [];
    private currentWeapon!: BossWeapon;
    private shoots: Array<BulletShoot> = [];

    // Candy Shower special attack
    private candyShowerMarkers: Array<{ x: number; y: number }> = [];
    private candyShowerInProgress = false;
    private candyShowerEventHandler?: (payload: any) => void;
    private candyShowerTimer?: Phaser.Time.TimerEvent;

    // Candy Shower special attack runtime
    private candyShowerTargetX?: number;
    private candyShowerAttackIndices: number[] = [];
    private candyShowerWalking = false;

    constructor(scene: DefaultScene, player: Phaser.Physics.Matter.Sprite) {
        // super(scene, player);
        this.player = player;
        this.scene = scene;
        this.stateMachine = new StateMachine(this, Boss.GingerMad)
        this.createSprite();
        this.createAnimations();
        this.isTouching = { left: false, right: false, ground: false };
        this.sprite.flipX = true;

        this.stateMachine
            .addState('idle', {
                onEnter: this.idleOnEnter
            })
            .addState('move', {
                onEnter: this.moveOnEnter,
                onUpdate: this.moveOnUpdate,
            })
            // .addState('trample', {
            //     onEnter: this.trampleOnEnter,
            //     onUpdate: this.trampleOnUpdate,
            // })
            .addState('jump', {
                onEnter: this.jumpOnEnter,
                onUpdate: this.jumpOnUpdate,
            })
            .addState('hit', {
                onEnter: this.hitOnEnter,
            })
            .addState('shoot', {
                onEnter: this.shootOnEnter,
            })
            .addState('damage_taken', {
                onEnter: this.damageTakenOnEnter,
            })
            .addState('death', {
                onEnter: this.deathOnEnter
            })
            .addState('candy_shower', {
                onEnter: this.candyShowerOnEnter,
                onUpdate: this.candyShowerOnUpdate,
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

        this.weaponList.push(BossWeapon.CandyBoomerang);
        this.changeWeapon(BossWeapon.CandyBoomerang);

        // Markers provided by the stage via the canonical BossSpecialAttack event.
        this.candyShowerEventHandler = (payload: any) => {
            if (!payload) return;
            if (payload.boss !== Boss.GingerMad) return;
            if (payload.attack !== 'candy_shower') return;
            if (payload.phase !== 'markers') return;

            if (Array.isArray(payload.markers)) {
                // store only the position; markers are already centered by the stage
                this.candyShowerMarkers = payload.markers.map((m: any) => ({ x: m.x, y: m.y }));
            }
        };
        events.on(GameEvents.BossSpecialAttack, this.candyShowerEventHandler);
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
        this.sprite.play('hit');
        if (this.player.x < this.sprite.x)
            this.sprite.flipX = true;
        else
            this.sprite.flipX = false;
        const shoot = this.shoots.find(shoot => !shoot.active);
        if (shoot) {
            // tag owner so we can ignore self-collisions
            (shoot as any).setData?.('owner', Boss.GingerMad);
            shoot.fire(this.sprite);
        }
    }
    private moveOnEnter() {
        this.sprite.play('move');
    }
    private moveOnUpdate() {
        this.sprite.flipX ? this.sprite.setVelocityX(-2) : this.sprite.setVelocityX(2);
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
    private deathOnEnter() {
        this.scene.sound.play('death', { volume: 1 * (this.scene.SoundOptions.SFX / 10) });
        this.sprite.setVelocity(0, 0).setIgnoreGravity(true);
        this.destroy()

        this.scene.on_stage_complete(Stages.CandyLand, BossWeapon.CandyBoomerang);
    }

    private createAnimations() {
        this.sprite.anims.create({
            key: 'move',
            frames: this.sprite.anims.generateFrameNames('gingermad_atlas', {
                prefix: 'run_',
                start: 1,
                end: 4,
            }),
            frameRate: 10,
            yoyo: true,
            repeat: -1
        });
        this.sprite.anims.create({
            key: 'idle',
            frames: this.sprite.anims.generateFrameNames('gingermad_atlas', {
                prefix: 'idle_',
                frames: [1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            }),
            frameRate: 10,
            yoyo: true,
            repeat: -1
        });
        this.sprite.anims.create({
            key: 'hit',
            frames: this.sprite.anims.generateFrameNames('gingermad_atlas', {
                prefix: 'hit_',
                start: 1,
                end: 3,
            }),
            frameRate: 10,
            yoyo: true,
        });
        this.sprite.anims.create({
            key: 'jump',
            frames: this.sprite.anims.generateFrameNames('gingermad_atlas', {
                frames: [0]
            }),
            frameRate: 1,
            yoyo: true,
            repeat: -1
        });
    }
    private createSprite() {
        const { Body, Bodies } = Phaser.Physics.Matter.Matter; // Native Matter modules

        this.sprite = this.scene.matter.add.sprite(0, 0, 'gingermad_atlas', 'idle');

        const { width: w, height: h } = this.sprite;
        const mainBody = Bodies.rectangle(0, 3, w * 0.6, h * 0.7, { chamfer: { radius: 5 } });

        this.sensors = {
            bottom: Bodies.rectangle(0, h * 0.45, w * 0.55, 0.5, { isSensor: true }),
            left: Bodies.rectangle(-w * 0.35, 2, 2, h * 0.5, { isSensor: true }),
            right: Bodies.rectangle(w * 0.35, 2, 2, h * 0.5, { isSensor: true })
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
            .setName(Boss.GingerMad)
            .setExistingBody(compoundBody)
            .setDepth(2)
            .setBounce(0)
            .setFriction(0.8, 0, 1)
            .setFixedRotation();
    }

    private candyShowerOnEnter() {

        events.emit(GameEvents.BossSpecialAttack, { boss: Boss.GingerMad, attack: 'candy_shower', phase: 'start' });

        if (this.candyShowerInProgress) return;
        this.candyShowerInProgress = true;

        this.sprite.setVelocityX(0);
        this.sprite.play('hit');

        // reset per-run state
        this.candyShowerTimer?.remove(false);
        this.candyShowerTargetX = undefined;
        this.candyShowerAttackIndices = [];
        this.candyShowerWalking = false;

        if (!this.candyShowerMarkers || this.candyShowerMarkers.length < 10) {
            console.warn('[GingerMad] candy_shower: missing markers (need 10). Current:', this.candyShowerMarkers?.length ?? 0);
            this.candyShowerInProgress = false;
            this.stateMachine.setState('idle');
            events.emit(GameEvents.BossSpecialAttack, { boss: Boss.GingerMad, attack: 'candy_shower', phase: 'end', reason: 'missing_markers' });
            return;
        }

        const attackEven = Phaser.Math.RND.pick([true, false]);
        this.candyShowerAttackIndices = (attackEven ? [0, 2, 4, 6, 8] : [1, 3, 5, 7, 9]).slice();
        Phaser.Utils.Array.Shuffle(this.candyShowerAttackIndices);

        const safeIndices = attackEven ? [1, 3, 5, 7, 9] : [0, 2, 4, 6, 8];

        // nearest safe spot by X distance
        let safeIndex = safeIndices[0];
        let bestDist = Number.POSITIVE_INFINITY;
        for (const idx of safeIndices) {
            const m = this.candyShowerMarkers[idx];
            if (!m) continue;
            const d = Math.abs(m.x - this.sprite.x);
            if (d < bestDist) {
                bestDist = d;
                safeIndex = idx;
            }
        }

        const safeMarker = this.candyShowerMarkers[safeIndex];
        if (!safeMarker) {
            console.warn('[GingerMad] candy_shower: safe marker not found for index', safeIndex);
            this.candyShowerInProgress = false;
            this.stateMachine.setState('idle');
            events.emit(GameEvents.BossSpecialAttack, { boss: Boss.GingerMad, attack: 'candy_shower', phase: 'end', reason: 'missing_safe_marker' });
            return;
        }

        this.candyShowerTargetX = safeMarker.x;
        this.candyShowerWalking = true;
        this.sprite.flipX = this.candyShowerTargetX < this.sprite.x;
        this.sprite.play('move');
    }

    private candyShowerOnUpdate() {
        if (!this.candyShowerInProgress) return;
        if (this.candyShowerTimer) return; // already raining
        if (!this.candyShowerWalking) return;
        if (this.candyShowerTargetX === undefined) return;

        const targetX = this.candyShowerTargetX;
        const reachThreshold = 8;
        const walkSpeed = 2;

        const dx = targetX - this.sprite.x;
        if (Math.abs(dx) <= reachThreshold) {
            this.sprite.setVelocityX(0);
            this.sprite.play('hit');
            this.candyShowerWalking = false;

            const spawnFallingBoomerangAt = (x: number, y: number) => {
                const shoot = this.shoots.find(s => !s.active);
                if (!shoot) return;

                shoot.setPosition(x, y);
                shoot.setActive(true);
                shoot.setVisible(true);

                // tag owner so we can ignore self-collisions
                (shoot as any).setData?.('owner', Boss.GingerMad);

                (shoot as any).world?.add?.([(shoot as any).body]);
                (shoot as any).setIgnoreGravity?.(false);
                ;(shoot as any).setVelocityX?.(0);
                ;(shoot as any).setVelocityY?.(2);
                (shoot as any).anims?.play?.('shoot', true);
                ;(shoot as any).lifespan = 2200;
            };

            let step = 0;
            const attackIndices = this.candyShowerAttackIndices;
            this.candyShowerTimer = this.scene.time.addEvent({
                delay: 280,
                repeat: attackIndices.length - 1,
                callback: () => {
                    if (this.destroyed) return;
                    this.sprite.play('hit');

                    const markerIndex = attackIndices[step];
                    const marker = this.candyShowerMarkers[markerIndex];
                    if (marker) spawnFallingBoomerangAt(marker.x, marker.y);

                    step += 1;

                    if (step >= attackIndices.length) {
                        this.candyShowerInProgress = false;
                        this.candyShowerTimer = undefined;
                        events.emit(GameEvents.BossSpecialAttack, { boss: Boss.GingerMad, attack: 'candy_shower', phase: 'end' });
                        this.stateMachine.setState('idle');
                    }
                },
            });

            return;
        }

        this.sprite.flipX = dx < 0;
        this.sprite.setVelocityX(dx < 0 ? -walkSpeed : walkSpeed);
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
        // Ignore collisions of the boss with its own bullets.
        const bulletObj = bodyB?.gameObject;
        if (bulletObj instanceof BulletShoot) {
            const owner = (bulletObj as any).getData?.('owner');
            if (owner === Boss.GingerMad) {
                return;
            }
        }

        if (bodyB.gameObject instanceof BulletShoot && !this.invencibility) {
            let damage = bodyB.gameObject.damage;
            if (bodyB.gameObject.name == this.weakness)
                damage = damage + 4;

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
    protected setHealth(value: number) {
        this.health = Phaser.Math.Clamp(value, 0, this.baseHealth);
        events.emit(GameEvents.BossHealthChanged, this.health);
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

        let random = Phaser.Math.RND.between(0, 80);

        if (this.health > 10) {
            if (random >= 0 && random < 40) {
                this.currentAction = 'move';
            } else if (random >= 40 && random < 60) {
                if (this.currentAction == 'jump')
                    this.currentAction = 'shoot';
                else
                    this.currentAction = 'jump';
            } else if ((random >= 60 && random < 78)) {
                this.currentAction = 'shoot';
            } else {
                this.currentAction = 'candy_shower';
            }
        } else {
            if (random >= 0 && random < 40) {
                this.currentAction = 'candy_shower';
            } else if (random >= 40 && random < 60) {
                if (this.currentAction == 'jump')
                    this.currentAction = 'shoot';
                else
                    this.currentAction = 'jump';
            } else if ((random >= 60 && random < 78)) {
                this.currentAction = 'shoot';
            } else {
                this.currentAction = 'move';
            }
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

        this.candyShowerTimer?.remove(false);
        this.candyShowerTimer = undefined;
        this.candyShowerWalking = false;
        this.candyShowerTargetX = undefined;
        this.candyShowerAttackIndices = [];

        if (this.candyShowerEventHandler) {
            events.off(GameEvents.BossSpecialAttack, this.candyShowerEventHandler);
            this.candyShowerEventHandler = undefined;
        }

        this.removeCollisionListeners();
        this.sprite.destroy();
    }
    update(_time: number, dt: number) {
        if (this.destroyed) return;
        this.stateMachine.update(dt);
        if (this.player)
            this.fightMode(dt);
    }
}
