import { Enemy, EnemyAtlas } from "../../utils/enemies";
import StateMachine from "../stateMachine";
import EnemyController from "./enemyController";


export default class MetController extends EnemyController {
    private scene: Phaser.Scene;
    private spawnPosition: { x: number; y: number };


    constructor(scene: Phaser.Scene, position: { x: number; y: number }) {
        super(scene);
        this.scene = scene;
        this.stateMachine = new StateMachine(this, Enemy.Met);
        this.spawnPosition = position;
        this._createSprite();
        this._createAnimations();

        // Register base enemy collision/sensor handlers now that sprite + sensors exist.
        this.initPhysics(scene);

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
            .addState('death', {
                onEnter: this.deathOnEnter
            })
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
        this.sprite.play('move');
        this.sprite.flipX = false;
    }
    private moveRightOnEnter() {
        this.sprite.play('move');
        this.sprite.flipX = true;
    }
    private moveLeftOnUpdate(dt: number) {
        this.sprite.setVelocityX(-0.4);
    }
    private moveRightOnUpdate(dt: number) {
        this.actionTime += dt;
        this.sprite.setVelocityX(0.4);
    }
    private deathOnEnter() {
        this.destroy();
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
            frameRate: 10,
            yoyo: true,
            repeat: -1
        });
    }

    private _createSprite() {
        // Native Matter modules (cast to any to avoid Phaser typing mismatch in this project)
        const matterLib = (Phaser.Physics.Matter as any).Matter;
        const { Body, Bodies } = matterLib;

        // Treat spawnPosition as world coordinates for the Matter body's center.
        // (Matches Phaser's default origin 0.5/0.5 and what you pass from code like {x:200,y:200}).
        this.sprite = this.scene.matter.add.sprite(0.5, 0.5, EnemyAtlas.Met, 'idle');

        const { width: w, height: h } = this.sprite;

        const mainBody = Bodies.rectangle(0, 0, w * 0.6, h * 0.7, { chamfer: { radius: 1 } });

        this.sensors = {
            bottom: Bodies.rectangle(0, h * 0.35, w * 0.55, 2, { isSensor: true }),
            left: Bodies.rectangle(-w * 0.35, 0, 2, h * 0.5, { isSensor: true }),
            right: Bodies.rectangle(w * 0.35, 0, 2, h * 0.5, { isSensor: true })
        };
        const compoundBody = Body.create({
            parts: [mainBody, this.sensors.bottom, this.sensors.left, this.sensors.right],
            frictionStatic: 0,
            frictionAir: 0.02,
            friction: 0.1,
            render: { sprite: { xOffset: 0.5, yOffset: 0.5 } },
        });

        this.sprite
            .setData('type', 'enemy') //enemy or enemy_projectile
            .setName(Enemy.Met)
            .setExistingBody(compoundBody)
            .setDepth(2)
            .setBounce(0)
            .setFriction(0.8, 0, 1)
            .setFixedRotation();

        // Some Matter body setups can reset the game object's position.
        // Force the intended spawn position after attaching the body.
        this.sprite.setPosition(this.spawnPosition.x, this.spawnPosition.y);
    }


    private fightMode(delta: number) {
        if(this.currentAction === 'death') {
            this.stateMachine.setState('death');
            return;
        };

        let candidateAction: string = '';
        this.actionTime += delta;

        if (this.actionTime >= 500)
            this.actionTime = 0;
        if (this.actionTime > 0) return;

        if (!this.isTouching.ground) return;


        let random = Phaser.Math.RND.between(0, 100);
        if (!candidateAction) {
            if (random >= 0 && random < 50) {
                candidateAction = 'move_right';
            } else if (random >= 50 && random < 100) {
                candidateAction = 'move_left';
            }
        } else {
            this.currentAction == 'move_left' ? this.currentAction = 'move_right' : this.currentAction = 'move_left';
        }

        if (this.isTouching.left) {
            candidateAction = 'move_right';
        } else if (this.isTouching.right) {
            candidateAction = 'move_left';
        }

        if (candidateAction !== this.currentAction) {
            this.currentAction = candidateAction;
        }

        this.stateMachine.setState(this.currentAction);
    }

    private enemyIsOnScreen(): boolean {
        const camera = this.scene.cameras.main;
        const bounds = this.sprite.getBounds();
        return Phaser.Geom.Intersects.RectangleToRectangle(bounds, camera.worldView);
    }

    destroy() {
        this.destroyed = true;
        this.scene.events.off("update", this.update, this);
        this.scene.events.off("shutdown", this.destroy, this);
        this.scene.events.off("destroy", this.destroy, this);
        if (this.scene.matter.world) {
            this.scene.matter.world.off("beforeupdate", this.resetTouching, this);
        }

        this.removeCollisionListeners(this.scene);

        this.sprite.destroy();
    }

    update(time: number, dt: number) {
        if (this.isPaused || this.destroyed) return;

        const onScreen = this.enemyIsOnScreen();
        
        if (!onScreen) {
            this.destroy();
            console.log("Met destroyed offscreen");
            return;
        }
        console.log("Met Update: "+this.health);

        this.stateMachine.update(dt);
        this.fightMode(dt);
    }
}
