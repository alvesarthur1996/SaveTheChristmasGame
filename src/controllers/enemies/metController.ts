import StateMachine from "../stateMachine";
import EnemyController from "./enemyController";

export default class MetController extends EnemyController{
    private stateMachine: StateMachine;
    private scene: Phaser.Scene;
    private moveTime = 0;
    private life = 30;

    constructor(scene: Phaser.Scene, sprite: Phaser.Physics.Matter.Sprite) {
        super(scene, sprite);
        this.sprite = sprite;
        this.scene = scene;
        this.stateMachine = new StateMachine(this, 'met_enemy')
        this._createAnimations();

        this.stateMachine
            .addState('idle', {
                onEnter: this.idleOnEnter
            })
            .addState('move_left', {
                onEnter: this.moveLeftOnEnter,
                onUpdate: this.moveLeftOnUpdate,
            })
            .addState('move_right', {
                onEnter: this.moveRightOnEnter,
                onUpdate: this.moveRightOnUpdate,
            })
            .addState('dead')
            .setState('idle');
    }

    private idleOnEnter() {
        this.sprite.setFrame('idle');
        const r = Phaser.Math.Between(0, 100);
        if (r < 50)
            this.stateMachine.setState('move_left')
        else
            this.stateMachine.setState('move_right')
    }

    private moveLeftOnEnter() {
        this.moveTime = 0;
        this.sprite.play('move');
        this.sprite.flipX = false;
    }
    private moveRightOnEnter() {
        this.moveTime = 0;
        this.sprite.play('move');
        this.sprite.flipX = true;
    }
    private moveLeftOnUpdate(dt: number) {
        this.moveTime += dt;
        this.sprite.setVelocityX(-1.4);
        if (this.moveTime > 1500)
            this.stateMachine.setState('move_right')
    }
    private moveRightOnUpdate(dt: number) {
        this.moveTime += dt;
        this.sprite.setVelocityX(1.4);
        if (this.moveTime > 1500)
            this.stateMachine.setState('move_left')
    }


    private _createAnimations() {
        this.sprite.anims.create({
            key: 'move',
            frames: this.sprite.anims.generateFrameNames('met_atlas', {
                prefix: 'walk-',
                suffix: '.png',
                start: 1,
                end: 3,
            }),
            frameRate:10,
            yoyo: true,
            repeat: -1
        });
    }

    destroy()
    {
        // events.off('enemy_dead', this.enemyDeadHandler, this);
    }

    update(dt: number)
    {
        this.stateMachine.update(dt);
    }
}
