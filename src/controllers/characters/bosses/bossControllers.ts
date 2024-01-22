import { Weapons } from "../../../utils/weapons";
import BulletShoot from "../../bulletShoot";
import StateMachine from "../../stateMachine";
import { CollisionSensors, TouchingDetection } from "../playerController";

export default class BossController {
    protected stateMachine: StateMachine|undefined;
    protected scene: Phaser.Scene
    protected sprite!: Phaser.Physics.Matter.Sprite;
    protected speedY = 0;
    protected baseHealth = 28;
    protected health = this.baseHealth;
    protected invencibility = false;
    protected sensors!: CollisionSensors;
    protected isTouching!: TouchingDetection;
    public spawnPosition = { x: 0, y: 0 };

    public weakness: Weapons = Weapons.SnowBuster;


    private weaponList: Array<Weapons> = [];
    protected currentWeapon!: Weapons;
    private shoots: Array<BulletShoot> = [];



    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.createSprite();
        this.createAnimations();
        this.isTouching = { left: false, right: false, ground: false };

        this.scene.matter.world.on('beforeupdate', this.resetTouching);
        
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


    public setSpritePosition(x: number, y: number): void {
        this.sprite.setPosition(x, y);
    }


    private onSensorCollide({ bodyA, bodyB, pair }) {

        if (bodyB.gameObject instanceof BulletShoot && !this.invencibility) {
            let damage = bodyB.gameObject.damage;
            if (bodyB.gameObject.name == this.weakness)
                damage = damage * 3;

            this.stateMachine!.setState('damage_taken');
            this.setHealth(this.health - damage);
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

    private setHealth(value: number) {
        this.health = Phaser.Math.Clamp(value, 0, this.baseHealth);

        if (this.health == 0)
            this.stateMachine!.setState('death');
    }

    private resetTouching() {
        this.isTouching = {
            ground: false,
            left: false,
            right: false,
        };
    }

    destroy() {
        // events.off('enemy_dead', this.enemyDeadHandler, this);
    }

    update(dt: number) {
        this.stateMachine!.update(dt);
    }
}
