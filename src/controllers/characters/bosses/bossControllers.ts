import { sharedInstance as events } from "../../../scenes/eventCentre";
import Boss, { BossWeapon } from "../../../utils/boss";
import { callWeaponClassDinamically } from "../../../utils/functions";
import { Weapons } from "../../../utils/weapons";
import BulletShoot from "../../bulletShoot";
import StateMachine from "../../stateMachine";
import { CollisionSensors, TouchingDetection } from "../playerController";

export default class BossController {
    private stateMachine: StateMachine;
    private scene: Phaser.Scene
    private player: Phaser.Physics.Matter.Sprite;
    private sprite!: Phaser.Physics.Matter.Sprite;
    private baseHealth = 28;
    private health = this.baseHealth;
    private invencibility = false;
    private sensors!: CollisionSensors;
    private isTouching!: TouchingDetection;
    public spawnPosition = { x: 0, y: 0 };
    public static shootDamage = 5;
    public static meleeDamage = 4;
    private actionTime = 0;
    private currentAction!: string;
    private destroyed = false;


    private weakness!: Weapons;


    private weaponList: Array<BossWeapon> = [];
    private currentWeapon!: BossWeapon;
    private shoots: Array<BulletShoot> = [];



    constructor(scene: Phaser.Scene, player: Phaser.Physics.Matter.Sprite) {
        this.player = player;
        this.scene = scene;
        this.isTouching = { left: false, right: false, ground: false };
        this.sprite.flipX = true;

        this.scene.matter.world.on('beforeupdate', this.resetTouching, this);
        this.scene.events.on("update", this.update, this);
        this.scene.events.once("shutdown", this.destroy, this);
        this.scene.events.once("destroy", this.destroy, this);
    }

    public setSpritePosition(x: number, y: number): void {
        this.sprite.setPosition(x, y);
    }

    protected changeWeapon(weapon: BossWeapon) {
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

    // protected onSensorCollide({ bodyA, bodyB, pair }) {

    //     if (bodyB.gameObject instanceof BulletShoot && !this.invencibility) {
    //         let damage = bodyB.gameObject.damage;
    //         if (bodyB.gameObject.name == this.weakness)
    //             damage = damage + 4;

    //         this.stateMachine.setState('damage_taken');
    //         this.setHealth(this.health - damage);
    //         return;
    //     } else if (this.invencibility && bodyB.gameObject instanceof BulletShoot) {
    //         return;
    //     }

    //     if (bodyA === this.sensors.left) {
    //         this.isTouching.left = true;
    //         if (pair.separation > 0.5) this.sprite.x += pair.separation - 0.5;
    //     } else if (bodyA === this.sensors.right) {
    //         this.isTouching.right = true;
    //         if (pair.separation > 0.5) this.sprite.x -= pair.separation - 0.5;
    //     } else if (bodyA === this.sensors.bottom) {
    //         this.isTouching.ground = true;
    //     }

    //     if (bodyB?.gameObject instanceof Phaser.Physics.Matter.TileBody) {
    //         return;
    //     }
    // }

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

    protected fightMode(delta: number) {
        if (!this.player) return;

        this.actionTime += delta;

        if (this.actionTime >= 2000)
            this.actionTime = 0;
        if (this.actionTime > 0) return;


        let random = Math.ceil(Math.random() * 80);
        if (random >= 0 && random < 45) {
            this.currentAction = 'move';
        } else if (random >= 45 && random < 60) {
            if (this.currentAction == 'jump')
                this.currentAction = 'shoot';
            else
                this.currentAction = 'jump';
        } else if ((random >= 60 && random < 100)) {
            this.currentAction = 'shoot';
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

    update(time: number, dt: number) {
        if (this.destroyed) return;
        this.stateMachine.update(dt);
        if (this.player)
            this.fightMode(dt);
    }
}
