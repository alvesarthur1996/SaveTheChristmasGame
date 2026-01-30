import IEnemy from "../../contracts/enemy";
import BulletShoot from "../bulletShoot";
import StateMachine from "../stateMachine";

type CollisionSensors = {
    left: MatterJS.BodyType;
    right: MatterJS.BodyType;
    bottom: MatterJS.BodyType;
};

export default abstract class EnemyController implements IEnemy {
    protected stateMachine!: StateMachine;
    protected sprite!: Phaser.Physics.Matter.Sprite;
    protected isPaused: boolean = false;
    public static damage: number = 1;
    public static collisionDamage: number = 2;
    protected baseHealth: number = 10;
    protected health: number = this.baseHealth;
    protected currentAction: string = 'idle';
    protected actionTime: number = 0;
    protected weakness: Array<BulletShoot> = [];
    protected weaknessBonus: number = 4;
    protected invencibility: boolean = false;
    protected sensors!: CollisionSensors;
    protected isTouching: { ground: boolean; left: boolean; right: boolean } = {
        ground: false,
        left: false,
        right: false,
    };
    protected destroyed = false;

    constructor(_scene: Phaser.Scene) {
        // Subclasses create `sprite` and `sensors`. We can't register listeners yet.
    }

    /**
     * Must be called by subclasses after `this.sprite` and `this.sensors` are created.
     */
    protected initPhysics(scene: Phaser.Scene) {
        scene.matter.world.on('beforeupdate', this.resetTouching, this);

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
    }

    protected setHealth(value: number) {
        this.health = Phaser.Math.Clamp(value, 0, this.baseHealth);
        if (this.health == 0) {
            this.currentAction = "death";
        }
    }

    protected onSensorCollide({ bodyA, bodyB, pair }) {

        if (bodyB.gameObject instanceof BulletShoot && !this.invencibility) {
            let damage = bodyB.gameObject.damage;
            if (this.weakness.includes(bodyB.gameObject.name)) {
                damage = damage + this.weaknessBonus;
            }

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

    protected resetTouching() {
        this.isTouching = {
            ground: false,
            left: false,
            right: false,
        };
    }

    protected removeCollisionListeners(scene: Phaser.Scene) {
        const sensors = [this.sensors.bottom, this.sensors.left, this.sensors.right, this.sprite];
        scene.matterCollision.removeOnCollideStart({ objectA: sensors });
        scene.matterCollision.removeOnCollideActive({ objectA: sensors });
    }

    update(time:number, dt: number): void {
        if (this.isPaused || this.destroyed) return;

    }

    destroy() {

    }

    pause(): void {
        this.isPaused = true;
        if (this.sprite) {
            this.sprite.setStatic(true);
            this.sprite.anims.pause();
        }
    }

    resume(): void {
        this.isPaused = false;
        if (this.sprite) {
            this.sprite.setStatic(false);
            this.sprite.anims.resume();
        }
    }
};
