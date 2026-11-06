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
            .addState('stomp', {
                onEnter: this.stompOnEnter,
                onUpdate: this.stompOnUpdate,
            })
            .addState('dash', {
                onEnter: this.dashOnEnter,
                onUpdate: this.dashOnUpdate,
            })
            .addState('rampage', {
                onEnter: this.rampageOnEnter,
                onUpdate: this.rampageOnUpdate,
            })
            .addState('death', {
                onEnter: this.deathOnEnter
            })
            .setState('idle');

        this.registerCollisions();

        this.weaponList.push(BossWeapon.IceBlock);
        this.changeWeapon(BossWeapon.IceBlock);
    }

    protected weaknessBonus = 3;

    // The block the Yeti is currently standing on (null when none).
    private standingBlock: IceBlock | null = null;

    protected resetTouching() {
        super.resetTouching();
        this.standingBlock = null;
    }

    // The Yeti's own ice blocks act as solid geometry: no damage, they just block him.
    protected onBulletHit(bullet: BulletShoot, bodyA: any): boolean {
        if (!(bullet instanceof IceBlock)) return false;
        if (bodyA === this.sensors.left) this.isTouching.left = true;
        else if (bodyA === this.sensors.right) this.isTouching.right = true;
        else if (bodyA === this.sensors.bottom) {
            this.isTouching.ground = true;
            this.standingBlock = bullet;
        }
        return true;
    }

    // Active ice blocks, as solids for the player to stand on / be trapped by.
    public getSolidBlocks() {
        return this.shoots
            .filter(shoot => shoot.active && shoot.visible)
            .map(shoot => {
                const { min, max } = (shoot.body as MatterJS.BodyType).bounds;
                return { x: min.x, y: min.y, width: max.x - min.x, height: max.y - min.y };
            });
    }

    // Standing on a block with Mega Man right below: 50% chance to smash it and drop straight
    // down. The roll happens once per block, otherwise the 50% would be re-rolled every frame.
    private stompRolledFor: IceBlock | null = null;
    private shouldStomp(): boolean {
        const block = this.standingBlock;
        if (!block) {
            this.stompRolledFor = null;
            return false;
        }
        const below = Math.abs(this.player.x - this.sprite.x) < 48 && this.player.y > this.sprite.y;
        if (!below || this.stompRolledFor === block) return false;
        this.stompRolledFor = block;
        return Phaser.Math.RND.frac() < 0.5;
    }

    private stompTime = 0;
    private stompOnEnter() {
        const block = this.standingBlock;
        if (block) {
            block.setActive(false).setVisible(false);
            (block as any).world.remove([block.body], true);
            this.standingBlock = null;
        }
        this.stompTime = 0;
        this.sprite.setFrame('jump');
        this.sprite.setVelocity(0, 8);
    }
    private stompOnUpdate(delta: number) {
        this.stompTime += delta;
        this.sprite.setVelocityX(0);
        if (this.stompTime > 80 && this.isTouching.ground) {
            this.scene.cameras.main.shake(160, 0.004);
            this.stateMachine.setState('idle');
        }
    }

    // Short hop back, a brief tell, then a charge straight at Mega Man.
    // Slow enough to be jumped over.
    private dashPhase: 'back' | 'tell' | 'run' = 'back';
    private dashTime = 0;
    private dashTrail = 0;
    private dashOnEnter() {
        this.facePlayer();
        this.dashPhase = 'back';
        this.dashTime = 0;
        this.sprite.setFrame('jump');
        this.sprite.setVelocityY(-2.5);
    }
    private dashOnUpdate(delta: number) {
        this.dashTime += delta;
        const direction = this.facingDirection;

        if (this.dashPhase === 'back') {
            this.sprite.setVelocityX(this.blockedByWall(-direction) ? 0 : -direction * 2);
            if (this.dashTime >= 300 && this.isTouching.ground) {
                this.dashPhase = 'tell';
                this.dashTime = 0;
                this.sprite.setVelocityX(0);
                this.sprite.play('attack');
            }
        } else if (this.dashPhase === 'tell') {
            this.sprite.setVelocityX(0);
            if (this.dashTime >= 350) {
                this.facePlayer();
                this.dashPhase = 'run';
                this.dashTime = 0;
                this.sprite.play('move');
            }
        } else {
            this.smashBlocksAhead(direction);
            if (this.blockedByWall(direction) || this.dashTime >= 1100) {
                this.sprite.setVelocityX(0);
                this.stateMachine.setState('idle');
                return;
            }
            this.sprite.setVelocityX(direction * 3);
            this.dashTrail += delta;
            if (this.dashTrail >= 70) {
                this.dashTrail = 0;
                this.spawnAfterimage(0x99ddff, 0.4, 220);
            }
        }
    }

    // Desperate move: roar, high jump, shockwave on landing (stuns a grounded Mega Man for
    // 2s, no damage), then charge from wall to wall while he is vulnerable.
    private rampageActive = false;
    private rampagePhase: 'roar' | 'air' | 'recover' | 'charge' = 'roar';
    private rampageTime = 0;
    private rampageWalls = 0;
    private rampageTrail = 0;
    private rampageOnEnter() {
        this.facePlayer();
        this.rampageActive = true;
        this.rampagePhase = 'roar';
        this.rampageTime = 0;
        this.rampageWalls = 0;
        this.sprite.setVelocityX(0);
        this.sprite.play('attack');
        this.sprite.setTint(0x99ddff);
        this.scene.cameras.main.shake(700, 0.005);
    }
    private rampageOnUpdate(delta: number) {
        this.rampageTime += delta;

        if (this.rampagePhase === 'roar') {
            this.sprite.setVelocityX(0);
            if (this.rampageTime >= 800) {
                this.rampagePhase = 'air';
                this.rampageTime = 0;
                this.sprite.setFrame('jump');
                this.sprite.setVelocityY(-10);
            }
        } else if (this.rampagePhase === 'air') {
            this.sprite.setFrame('jump');
            this.sprite.setVelocityX(0);
            if (this.rampageTime > 150 && this.isTouching.ground) {
                this.scene.cameras.main.shake(500, 0.008);
                const player = (this.scene as any).playerController;
                if (player?.isGrounded()) player.applyPush(this.sprite.x, 120, 0.3);
                this.rampagePhase = 'recover';
                this.rampageTime = 0;
                this.sprite.play('attack');
            }
        } else if (this.rampagePhase === 'recover') {
            this.sprite.setVelocityX(0);
            if (this.rampageTime >= 500) {
                this.facePlayer();
                this.rampagePhase = 'charge';
                this.rampageTime = 0;
                this.sprite.play('move');
            }
        } else {
            const direction = this.facingDirection;
            this.smashBlocksAhead(direction);
            if (this.rampageTime > 200 && this.blockedByWall(direction)) {
                this.rampageWalls++;
                this.scene.cameras.main.shake(250, 0.006);
                if (this.rampageWalls >= 2) {
                    this.endRampage();
                    return;
                }
                this.sprite.flipX = !this.sprite.flipX;
                this.sprite.setVelocityX(0);
                this.rampageTime = 0;
                return;
            }
            this.sprite.setVelocityX(direction * 4);
            this.rampageTrail += delta;
            if (this.rampageTrail >= 50) {
                this.rampageTrail = 0;
                this.spawnAfterimage(0x66ccff, 0.5, 250);
            }
        }
    }
    // During the charge, ice blocks in his path (or underfoot) shatter instead of stopping him.
    private smashBlocksAhead(direction: number) {
        let smashed = false;
        for (const shoot of this.shoots) {
            if (!shoot.active || !shoot.visible) continue;
            const dx = (shoot.x - this.sprite.x) * direction;
            if (dx < -40 || dx > 60 || Math.abs(shoot.y - this.sprite.y) > 70) continue;
            shoot.setActive(false).setVisible(false);
            (shoot as any).world.remove([shoot.body], true);
            smashed = true;
        }
        // Only forget the touching flags when a block was removed; otherwise real walls would never register.
        if (smashed) {
            this.isTouching.left = false;
            this.isTouching.right = false;
            this.standingBlock = null;
        }
    }

    private endRampage() {
        this.rampageActive = false;
        this.sprite.setVelocityX(0);
        this.sprite.clearTint();
        this.actionTime = 0;
        this.currentAction = 'idle';
        this.stateMachine.setState('idle');
    }

    protected fightMode(delta: number) {
        if (!this.player) return;
        if (this.rampageActive) return;

        if (this.currentAction === 'death' && !this.stateMachine.isCurrentState('death')) {
            this.stateMachine.setState(this.currentAction);
            return;
        } else if (this.currentAction === 'death' && this.stateMachine.isCurrentState('death')) {
            return;
        }

        if (this.currentAction !== 'stomp' && this.shouldStomp()) {
            this.currentAction = 'stomp';
            this.stateMachine.setState('stomp');
            return;
        }
        if (this.currentAction === 'stomp' && this.stateMachine.isCurrentState('stomp')) return;
        // The block jump runs to completion on its own.
        if (this.stateMachine.isCurrentState('jump_on_block')) return;

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

        // Block building (throw + jump on it) is his signature, so it gets the biggest share.
        if (this.desperate && this.currentAction !== 'rampage' && random >= 85) {
            this.currentAction = 'rampage';
        } else if (random < 20) {
            this.currentAction = 'move';
        } else if (random < 30) {
            this.currentAction = 'dash';
        } else if (random < 40) {
            this.currentAction = 'idle';
        } else {
            this.currentAction = 'throw';
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
        this.sprite.setVelocityX(0);
        this.sprite.play('idle');
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
        this.sprite.setVelocityX(direction * 2.25);
    }

    private jumpOnEnter() {
        this.facePlayer();
        this.sprite.setFrame('jump');
        this.sprite.setVelocityY(-6);
    }
    private jumpOnUpdate() {
        this.sprite.setFrame('jump');
        const direction = this.facingDirection;
        this.sprite.setVelocityX(this.blockedByWall(direction) ? 0 : direction * 4);

        if (this.isTouching.ground)
            this.stateMachine.setState('idle');
    }

    // Precise hop onto the block he just made: jump straight up until his feet clear the block
    // top, then steer over its centre and land on it.
    private targetBlock: IceBlock | null = null;
    private blockJumpTime = 0;
    private jumpOnBlockEnter() {
        this.blockJumpTime = 0;
        this.sprite.setFrame('jump');
        if (!this.targetBlock || !this.targetBlock.active) {
            this.endBlockJump();
            return;
        }
        this.sprite.setVelocity(0, -5.5);
    }
    private jumpOnBlockUpdate(delta: number) {
        const block = this.targetBlock;
        if (!block || !block.active || !block.visible) {
            this.endBlockJump();
            return;
        }
        this.blockJumpTime += delta;
        this.sprite.setFrame('jump');

        const blockTop = block.y - block.displayHeight / 2;
        const feet = this.sprite.y + this.sprite.height * 0.425;
        const dx = block.x - this.sprite.x;
        const cleared = feet < blockTop - 2;
        const vx = cleared ? Phaser.Math.Clamp(dx * 0.2, -3, 3) : 0;
        this.sprite.setVelocityX(Math.abs(dx) < 1 ? 0 : vx);

        const landed = this.standingBlock === block;
        if ((landed && this.blockJumpTime > 120) || this.blockJumpTime > 1600) {
            this.endBlockJump();
        }
    }
    private endBlockJump() {
        this.sprite.setVelocityX(0);
        this.targetBlock = null;
        this.actionTime = 0;
        this.currentAction = 'idle';
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

    private shootOnEnter() {
        this.sprite.setVelocityX(0);
        this.sprite.play('throw');
        this.facePlayer();
        this.targetBlock = null;
        const shoot = this.shoots.find(shoot => !shoot.active);

        if (shoot) {
            shoot.fire(this.sprite);
            this.targetBlock = shoot as IceBlock;
        }
    }
    private attackOnEnter() {
        this.sprite.setVelocityX(0);
        this.sprite.play('attack');
        this.facePlayer();
    }
};
