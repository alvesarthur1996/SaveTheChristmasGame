import IBoss from "../../../contracts/boss";
import DefaultScene from "../../../scenes/defaultScene";
import { sharedInstance as events } from "../../../scenes/eventCentre";
import Boss, { BossWeapon } from "../../../utils/boss";
import GameEvents from "../../../utils/events";
import { callWeaponClassDinamically } from "../../../utils/functions";
import { Weapons } from "../../../utils/weapons";
import BulletShoot from "../../bulletShoot";
import StateMachine from "../../stateMachine";
import { CollisionSensors, TouchingDetection } from "../playerController";

const FACE_DEADZONE_PX = 40;

export default class BossController implements IBoss {
    protected stateMachine: StateMachine;
    protected scene: DefaultScene;
    protected player: Phaser.Physics.Matter.Sprite;
    protected sprite!: Phaser.Physics.Matter.Sprite;
    protected baseHealth = 28;
    protected health = this.baseHealth;
    protected invencibility = false;
    protected sensors!: CollisionSensors;
    protected isTouching!: TouchingDetection;
    public spawnPosition = { x: 0, y: 0 };
    public static shootDamage = 3;
    public static meleeDamage = 3;
    protected actionTime = 0;
    protected currentAction!: string;
    protected destroyed = false;

    protected weakness!: Weapons;

    protected weaponList: Array<BossWeapon> = [];
    protected currentWeapon!: BossWeapon;
    protected shoots: Array<BulletShoot> = [];

    constructor(scene: DefaultScene, player: Phaser.Physics.Matter.Sprite) {
        this.player = player;
        this.scene = scene;
        this.isTouching = { left: false, right: false, ground: false };

        this.scene.matter.world.on("beforeupdate", this.resetTouching, this);
        this.scene.events.on("update", this.update, this);
        this.scene.events.once("shutdown", this.destroy, this);
        this.scene.events.once("destroy", this.destroy, this);
    }

    public setSpritePosition(x: number, y: number): void {
        this.sprite.setPosition(x, y);
    }

    protected changeWeapon(weapon: BossWeapon) {
        if (this.weaponList.filter((i) => i == weapon).length)
            this.currentWeapon = weapon;

        this.shoots = [];
        for (let i = 0; i <= 96; i++) {
            const weapon = callWeaponClassDinamically(this.currentWeapon, {
                world: this.scene.matter.world,
                x: this.sprite.x,
                y: this.sprite.y,
                bodyOptions: {},
                soundOptions: this.scene.SoundOptions,
            });
            if (weapon) this.shoots.push(weapon);
        }
    }

    protected setHealth(value: number) {
        this.health = Phaser.Math.Clamp(value, 0, this.baseHealth);
        events.emit(GameEvents.BossHealthChanged, this.health);
        if (this.health == 0) {
            this.currentAction = "death";
        }
    }

    // Registers the collision callbacks for the boss body and its sensors.
    protected registerCollisions() {
        const objectA = [this.sensors.bottom, this.sensors.left, this.sensors.right, this.sprite];
        this.scene.matterCollision.addOnCollideStart({ objectA, callback: this.onSensorCollide, context: this });
        this.scene.matterCollision.addOnCollideActive({ objectA, callback: this.onSensorCollide, context: this });
    }

    // Extra damage taken from the boss weakness weapon.
    protected weaknessBonus = 4;

    // Whether the body counts as a wall/floor. Only solid, static geometry does.
    protected isSolidBody(body: any): boolean {
        return !body?.isSensor && (body?.isStatic || body?.gameObject instanceof Phaser.Physics.Matter.TileBody);
    }

    // Called when a player weapon hits the boss. Return true if the hit was consumed.
    protected onBulletHit(_bullet: BulletShoot, _bodyA: any): boolean {
        return false;
    }

    // For the boss, Mega Man is a sensor: contact is detected (the player handles its own
    // damage/knockback) but never resolved, so nobody gets pushed and it never counts as a wall.
    protected onSensorCollide({ bodyA, bodyB, pair }: any) {
        const other = bodyB?.gameObject;

        if (other?.name === "player") {
            if (pair) pair.isActive = false;
            return;
        }

        if (other instanceof BulletShoot) {
            // Ignore the boss' own bullets.
            if ((other as any).getData?.("owner") === this.sprite.name) return;
            if (this.onBulletHit(other, bodyA)) return;
            if (this.invencibility) return;

            let damage = other.damage;
            if (other.name == this.weakness) damage += this.weaknessBonus;
            this.startDamageFlash();
            this.setHealth(this.health - damage);
            return;
        }

        const solid = this.isSolidBody(bodyB);
        if (bodyA === this.sensors.left) {
            if (solid) this.isTouching.left = true;
        } else if (bodyA === this.sensors.right) {
            if (solid) this.isTouching.right = true;
        } else if (bodyA === this.sensors.bottom) {
            this.isTouching.ground = true;
        }
    }

    // Turns toward Mega Man, unless he is right on top of the boss (e.g. jumping over it),
    // where turning would make the boss flip under the player and become unavoidable.
    // `facesRightByDefault` tells which flipX value means "looking right" in the sprite sheet.
    protected facePlayer(facesRightByDefault = true) {
        const dx = this.player.x - this.sprite.x;
        if (Math.abs(dx) <= FACE_DEADZONE_PX) return;
        const left = dx < 0;
        this.sprite.flipX = facesRightByDefault ? left : !left;
    }

    // Direction (-1 left, 1 right) the sprite is currently moving toward.
    protected get facingDirection(): number {
        return this.facesRightByDefault ? (this.sprite.flipX ? -1 : 1) : (this.sprite.flipX ? 1 : -1);
    }
    protected facesRightByDefault = true;

    protected blockedByWall(direction: number): boolean {
        return Boolean(direction < 0 ? this.isTouching.left : this.isTouching.right);
    }

    // Solid rectangles (world space) the player must collide with, e.g. the Yeti's ice blocks.
    public getSolidBlocks(): Array<{ x: number; y: number; width: number; height: number }> {
        return [];
    }

    // Below ~35% health the boss enters its desperate phase.
    protected get desperate(): boolean {
        return this.health <= this.baseHealth * 0.35;
    }

    // Fading ghost of the current frame, used as a motion-trail effect.
    protected spawnAfterimage(tint: number, alpha = 0.55, duration = 280) {
        const ghost = this.scene.add
            .image(this.sprite.x, this.sprite.y, this.sprite.texture.key, this.sprite.frame.name)
            .setFlipX(this.sprite.flipX)
            .setScale(this.sprite.scaleX, this.sprite.scaleY)
            .setTint(tint)
            .setAlpha(alpha)
            .setDepth(this.sprite.depth - 0.1);
        this.scene.tweens.add({
            targets: ghost,
            alpha: 0,
            duration,
            onComplete: () => ghost.destroy(),
        });
    }

    // Hit feedback only: the current action keeps running while the boss flashes.
    protected startDamageFlash() {
        this.invencibility = true;
        const startColor = Phaser.Display.Color.ValueToColor(0xffffff);
        const endColor = Phaser.Display.Color.ValueToColor(0x999999);
        this.scene.tweens.addCounter({
            from: 0,
            to: 100,
            duration: 100,
            repeat: 8,
            yoyo: true,
            ease: Phaser.Math.Easing.Sine.InOut,
            onUpdate: (tween) => {
                if (this.destroyed) return;
                const c = Phaser.Display.Color.Interpolate.ColorWithColor(startColor, endColor, 100, tween.getValue());
                this.sprite.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
            },
            onComplete: () => {
                this.invencibility = false;
            },
        });
    }

    protected resetTouching() {
        this.isTouching = {
            ground: false,
            left: false,
            right: false,
        };
    }

    protected removeCollisionListeners() {
        const sensors = [
            this.sensors.bottom,
            this.sensors.left,
            this.sensors.right,
            this.sprite,
        ];
        this.scene.matterCollision.removeOnCollideStart({ objectA: sensors });
        this.scene.matterCollision.removeOnCollideActive({ objectA: sensors });
    }

    protected fightMode(delta: number) {
        if (!this.player) return;

        this.actionTime += delta;

        if (this.actionTime >= 2000) this.actionTime = 0;
        if (this.actionTime > 0) return;

        let random = Math.ceil(Math.random() * 80);
        if (random >= 0 && random < 45) {
            this.currentAction = "move";
        } else if (random >= 45 && random < 60) {
            if (this.currentAction == "jump")
                this.currentAction = "shoot";
            else
                this.currentAction = "jump";
        } else if (random >= 60 && random < 100) {
            this.currentAction = "shoot";
        }
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

    private introActive = false;
    private introLanding = false;
    private introLanded = false;
    private introCollisionMask = 0;
    private introLandingY = 0;

    // Pose held while the boss descends during the intro.
    protected introPose() {
        this.sprite.play("idle");
    }

    // Intro: the boss is not solid and slowly descends from the top of the screen,
    // becoming solid again near the floor until it touches the ground.
    public startIntro(landingY: number): void {
        this.introActive = true;
        this.introLanding = false;
        this.introLanded = false;
        this.introLandingY = landingY;
        this.invencibility = true;
        this.introCollisionMask = (this.sprite.body as MatterJS.BodyType).collisionFilter.mask;
        this.sprite.setCollidesWith(0);
        this.sprite.setIgnoreGravity(true);
        this.sprite.setVelocity(0, 0);
        this.introPose();
    }

    public isIntroLanded(): boolean {
        return this.introLanded;
    }

    public finishIntro(): void {
        this.introActive = false;
        this.invencibility = false;
        this.actionTime = 0;
    }

    private updateIntro(): void {
        if (this.introLanded) return;

        if (!this.introLanding && this.sprite.y >= this.introLandingY) {
            this.introLanding = true;
            this.sprite.setCollidesWith(this.introCollisionMask);
        }

        this.sprite.setVelocityX(0);
        this.sprite.setVelocityY(0.9);

        if (this.introLanding && this.isTouching.ground) {
            this.introLanded = true;
            this.sprite.setIgnoreGravity(false);
            this.sprite.setVelocity(0, 0);
            this.sprite.play("idle");
        }
    }

    update(_time: number, dt: number) {
        if (this.destroyed) return;
        if (this.introActive) {
            this.updateIntro();
            return;
        }
        this.stateMachine.update(dt);
        if (this.player) this.fightMode(dt);
    }
}
