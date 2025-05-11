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

    update(time: number, dt: number) {
        if (this.destroyed) return;
        this.stateMachine.update(dt);
        if (this.player) this.fightMode(dt);
    }
}
