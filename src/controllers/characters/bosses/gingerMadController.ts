import DefaultScene from "../../../scenes/defaultScene";
import { sharedInstance as events } from "../../../scenes/eventCentre";
import Boss, { BossWeapon } from "../../../utils/boss";
import Stages from "../../../utils/stages";
import { Weapons } from "../../../utils/weapons";
import StateMachine from "../../stateMachine";
import GameEvents from '../../../utils/events';
import BossController from "./bossController";

const SHOOT_RECOVERY_MS = 500;

export default class GingerMadController extends BossController {
    public spawnPosition = { x: 0, y: 0 };
    public static shootDamage = 5;
    public static meleeDamage = 2;

    protected weakness: Weapons = Weapons.CandyBoomerang;

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
        super(scene, player);
        this.stateMachine = new StateMachine(this, Boss.GingerMad)
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
            .addState('death', {
                onEnter: this.deathOnEnter
            })
            .addState('candy_shower', {
                onEnter: this.candyShowerOnEnter,
                onUpdate: this.candyShowerOnUpdate,
            })
            .setState('idle');

        this.registerCollisions();

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
        this.sprite.setVelocityX(0);
        this.sprite.play('idle');
    }
    private jumpOnEnter() {
        this.facePlayer();
        this.sprite.setFrame('jump');
        this.sprite.setVelocityY(-7);
    }
    private jumpOnUpdate() {
        this.sprite.setFrame('jump');
        const direction = this.sprite.flipX ? -1 : 1;
        const blocked = direction < 0 ? this.isTouching.left : this.isTouching.right;
        this.sprite.setVelocityX(blocked ? 0 : direction * 3);

        if (this.isTouching.ground)
            this.stateMachine.setState('idle');
    }
    private hitOnEnter() {
        this.sprite.play('hit');
    }
    private shootOnEnter() {
        this.sprite.setVelocityX(0);
        this.sprite.play('hit');
        this.facePlayer();
        const shoot = this.shoots.find(shoot => !shoot.active);
        if (shoot) {
            // tag owner so we can ignore self-collisions
            (shoot as any).setData?.('owner', Boss.GingerMad);
            shoot.fire(this.sprite);
        }

        // A shot is a single action: go back to idle shortly after firing.
        this.scene.time.delayedCall(SHOOT_RECOVERY_MS, () => {
            if (!this.destroyed && this.stateMachine.isCurrentState('shoot'))
                this.stateMachine.setState('idle');
        });
    }
    private moveOnEnter() {
        this.facePlayer();
        this.sprite.play('move');
    }
    private moveOnUpdate() {
        const direction = this.facingDirection;
        if (this.blockedByWall(direction)) {
            this.sprite.setVelocityX(0);
            this.stateMachine.setState('idle');
            return;
        }
        this.sprite.setVelocityX(direction * 2);
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
        if (this.desperate) this.scene.cameras.main.shake(450, 0.006);
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
                    if (marker) {
                        spawnFallingBoomerangAt(marker.x, marker.y);
                        if (this.desperate) this.scene.cameras.main.shake(140, 0.004);
                    }

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

    protected setHealth(value: number) {
        this.health = Phaser.Math.Clamp(value, 0, this.baseHealth);
        events.emit(GameEvents.BossHealthChanged, this.health);
        if (this.health == 0)
            this.stateMachine.setState('death');
    }
    protected fightMode(delta: number) {
        if (!this.player) return;

        // The candy shower is a committed attack: nothing else may start until it ends.
        if (this.candyShowerInProgress) return;

        this.actionTime += delta;

        if (this.actionTime >= 2000)
            this.actionTime = 0;
        if (this.actionTime > 0) return;

        let random = Phaser.Math.RND.between(0, 80);
        let action: string;

        if (this.health > 10) {
            if (random >= 0 && random < 40) {
                action = 'move';
            } else if (random >= 40 && random < 60) {
                action = this.currentAction == 'jump' ? 'shoot' : 'jump';
            } else if ((random >= 60 && random < 78)) {
                action = 'shoot';
            } else {
                action = 'candy_shower';
            }
        } else {
            if (random >= 0 && random < 40) {
                action = 'candy_shower';
            } else if (random >= 40 && random < 60) {
                action = this.currentAction == 'jump' ? 'shoot' : 'jump';
            } else if ((random >= 60 && random < 78)) {
                action = 'shoot';
            } else {
                action = 'move';
            }
        }

        // Never shoot twice in a row.
        if (action === 'shoot' && this.currentAction === 'shoot')
            action = 'move';

        this.currentAction = action;
        this.stateMachine.setState(this.currentAction);
    }


    destroy() {
        this.candyShowerTimer?.remove(false);
        this.candyShowerTimer = undefined;
        this.candyShowerWalking = false;
        this.candyShowerTargetX = undefined;
        this.candyShowerAttackIndices = [];

        if (this.candyShowerEventHandler) {
            events.off(GameEvents.BossSpecialAttack, this.candyShowerEventHandler);
            this.candyShowerEventHandler = undefined;
        }

        super.destroy();
    }
    protected introPose() {
        this.sprite.setFrame('jump');
    }
}
