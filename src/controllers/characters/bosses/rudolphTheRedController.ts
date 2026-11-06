import DefaultScene from "../../../scenes/defaultScene";
import { sharedInstance as events } from "../../../scenes/eventCentre";
import Boss, { BossAtlas, BossWeapon } from "../../../utils/boss";
import GameEvents from '../../../utils/events';
import { Weapons } from "../../../utils/weapons";
import StateMachine from "../../stateMachine";
import BossController from "./bossController";

export default class RudolphTheRedController extends BossController {
    public spawnPosition = { x: 0, y: 0 };
    public static shootDamage = 2;
    public static meleeDamage = 4;

    protected weakness: Weapons = Weapons.IceBlock;
    // Rudolph's sprite sheet looks left when not flipped.
    protected facesRightByDefault = false;

    constructor(scene: DefaultScene, player: Phaser.Physics.Matter.Sprite) {
        super(scene, player);
        this.stateMachine = new StateMachine(this, Boss.RudolphTheRed)
        this.createSprite();
        this.createAnimations();

        this.stateMachine
            .addState('idle', {
                onEnter: this.idleOnEnter
            })
            .addState('move', {
                onEnter: this.moveOnEnter,
                onUpdate: this.moveOnUpdate,
            })
            .addState('shoot', {
                onEnter: this.shootOnEnter,
            })
            .addState('z_flight', {
                onEnter: this.zFlightOnEnter,
                onUpdate: this.zFlightOnUpdate,
            })
            .addState('death', {
                onEnter: this.deathOnEnter
            })
            .setState('idle');

        this.registerCollisions();

        this.weaponList.push(BossWeapon.LaserBeam);
        this.changeWeapon(BossWeapon.LaserBeam);
    }

    private idleOnEnter() {
        this.sprite.play('idle');
    }

    private shootOnEnter() {
        this.sprite.play('shoot');
        this.facePlayer(false);
        const shoot = this.shoots.find(shoot => !shoot.active);

        if (shoot) {
            // The laser leaves the cannon at a specific frame of the animation.
            // Rudolph's sprite looks left when not flipped, so the laser direction is inverted.
            this.scene.time.delayedCall(750, () => {
                if (!this.destroyed && this.stateMachine.isCurrentState('shoot'))
                    (shoot as any).fire(this.sprite, true);
            });
        }
    }
    private zWaypoints: Array<{ x: number; y: number }> = [];
    private zIndex = 0;
    private zTrailTimer = 0;
    private zActive = false;

    // Desperate move: Rudolph takes off and flies a Z across the room (top, diagonal, bottom),
    // leaving a red trail. His body is a sensor while flying, so he crosses walls and the player
    // can still be hit by contact.
    private zFlightOnEnter() {
        const view = this.scene.cameras.main.worldView;
        const left = view.x + 70;
        const right = view.right - 70;
        const floorY = this.sprite.y;
        const top = Math.max(view.y + 70, floorY - 220);

        this.zWaypoints = [
            { x: left, y: top },
            { x: right, y: top },
            { x: left, y: floorY },
            { x: right, y: floorY },
        ];
        this.zIndex = 0;
        this.zTrailTimer = 0;
        this.zActive = true;

        this.sprite.play('move');
        this.setBodySensor(true);
        this.sprite.setIgnoreGravity(true);
        this.sprite.setVelocity(0, 0);
        this.sprite.setTint(0xff5555);
        this.scene.cameras.main.shake(250, 0.004);
    }

    private zFlightOnUpdate(delta: number) {
        const target = this.zWaypoints[this.zIndex];
        const dx = target.x - this.sprite.x;
        const dy = target.y - this.sprite.y;
        const dist = Math.hypot(dx, dy);
        const speed = 5.5;

        this.zTrailTimer += delta;
        if (this.zTrailTimer >= 35) {
            this.zTrailTimer = 0;
            this.spawnAfterimage(0xff3333);
        }

        if (dist <= speed) {
            this.zIndex++;
            if (this.zIndex >= this.zWaypoints.length) {
                this.endZFlight();
                return;
            }
            return;
        }

        this.sprite.flipX = dx > 0;
        this.sprite.setVelocity((dx / dist) * speed, (dy / dist) * speed);
    }

    // Matter checks `isSensor` per part, so the solid main part (index 1) must be toggled too.
    private setBodySensor(value: boolean) {
        const body = this.sprite.body as any;
        body.isSensor = value;
        body.parts[1].isSensor = value;
    }

    // Lifts the boss out of any solid geometry it ended up inside while flying as a sensor.
    private unstickFromSolids() {
        const { Query } = Phaser.Physics.Matter.Matter as any;
        const main = (this.sprite.body as any).parts[1];
        const solids = (this.scene.matter.world as any).getAllBodies().filter((b: any) =>
            b.isStatic && !b.isSensor && b.parent === b && b !== main);
        for (let i = 0; i < 80; i++) {
            const hit = Query.region(solids, main.bounds).length > 0;
            if (!hit) return;
            this.sprite.setPosition(this.sprite.x, this.sprite.y - 4);
        }
    }

    private endZFlight() {
        this.zActive = false;
        this.unstickFromSolids();
        this.setBodySensor(false);
        this.sprite.setIgnoreGravity(false);
        this.sprite.setVelocity(0, 0);
        this.sprite.clearTint();
        this.actionTime = 0;
        this.stateMachine.setState('idle');
    }

    private moveOnEnter() {
        this.facePlayer(false);
        this.sprite.play('move');
    }
    private moveOnUpdate() {
        const direction = this.facingDirection;
        if (this.blockedByWall(direction)) {
            this.sprite.setVelocityX(0);
            this.stateMachine.setState('idle');
            return;
        }
        this.sprite.setVelocityX(direction * 3.25);
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

    protected setHealth(value: number) {
        this.health = Phaser.Math.Clamp(value, 0, this.baseHealth);
        events.emit(GameEvents.BossHealthChanged, this.health);
        if (this.health == 0)
            this.stateMachine.setState('death');
    }
    protected fightMode(delta: number) {
        if (!this.player) return;
        if (this.zActive) return;

        this.actionTime += delta;

        if (this.actionTime >= 2250)
            this.actionTime = 0;
        if (this.actionTime > 0) return;

        let random = Phaser.Math.RND.between(0, 80);
        if (this.desperate && this.currentAction !== 'z_flight' && random >= 55) {
            this.currentAction = 'z_flight';
        } else if (random >= 0 && random < 45) {
            this.currentAction = 'move';
        } else if (random >= 45 && random < 60) {
            this.currentAction = 'idle';
        } else if ((random >= 60 && random < 100)) {
            if (!this.stateMachine.isCurrentState('shoot'))
                this.currentAction = 'shoot';
            else
                this.currentAction = 'idle';
        }
        this.stateMachine.setState(this.currentAction);
    }
}
