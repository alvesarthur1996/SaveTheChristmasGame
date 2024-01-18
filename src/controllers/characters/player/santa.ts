export default class SantaClaus {
    gameInstance: Phaser.Scene;
    charSprites: Phaser.Physics.Matter.Sprite;
    lookingBack: boolean;
    touchingGround: boolean;
    speedY: number;
    jumpSpeed: number;

    constructor(game: Phaser.Scene) {
        this.gameInstance = game;
        this.charSprites = null;
        this.lookingBack = false;
        this.touchingGround = true;
        this.speedY = 12;
        this.jumpSpeed = -4.875;
    }

    sprites() {
        const { width, height } = this.gameInstance.scale;
        const hitbox = '40 14 14 14 14 40 40 40';
        this.charSprites = this.gameInstance.matter.add.sprite(width / 2, height / 2, 'santa_claus', 'idle_1', {
            shape: {
                type: 'fromVerts',
                verts: hitbox
            }
        }).setPosition(0, -600);
        // this.charSprites.setFrictionAir(0);
        this.charSprites.setFixedRotation();
        // this.gameInstance.cameras.main.startFollow(this.charSprites);
        
    }

    movements(delta_time_in_sec: integer) {
        let keyboard: Phaser.Input.Keyboard.KeyboardPlugin = this.gameInstance.input.keyboard?.addKeys("W, A, S, D, L, K");
        const speed = 1.375;

        if (!this.touchingGround) {
            this.charSprites.setFrame('jump');
            this._changeCurrentSpeedY(delta_time_in_sec)


            if (keyboard.D.isDown === true) {
                this.lookingBack = false;
                this.charSprites?.setVelocityX(speed);
                this.charSprites?.setFlipX(this.lookingBack);
            } else if (keyboard.A.isDown === true) {
                this.lookingBack = true;
                this.charSprites?.setVelocityX(-speed);
                this.charSprites?.setFlipX(this.lookingBack);
                this.charSprites?.setFlipX(this.lookingBack);
            }

        } else {
            if (keyboard.D.isDown === true) {
                this.lookingBack = false;
                this.charSprites?.setVelocityX(speed)
                this.charSprites?.setFlipX(this.lookingBack);
                if (Phaser.Input.Keyboard.JustDown(keyboard.K)) {
                    this.charSprites?.setFrame('jump');
                    this.charSprites?.setVelocityY(this.jumpSpeed);
                    this.touchingGround = false;
                    if (keyboard.L.isDown === true)
                        this.charSprites?.setFrame('jump_shoot');
                }
                if (keyboard.L.isDown === true)
                    this.charSprites?.play('move_shot', true);
                else
                    this.charSprites?.play('move', true);
            } else if (keyboard.A.isDown === true) {
                this.lookingBack = true;
                this.charSprites?.setVelocityX(-speed)
                this.charSprites?.setFlipX(this.lookingBack);
                if (Phaser.Input.Keyboard.JustDown(keyboard.K)) {
                    this.charSprites?.setFrame('jump');
                    this.charSprites?.setVelocityY(this.jumpSpeed);
                    this.touchingGround = false;
                    if (keyboard.L.isDown === true)
                        this.charSprites?.setFrame('jump_shoot');
                }
                if (keyboard.L.idsDown === true)
                    this.charSprites?.play('move_shot', true);
                else
                    this.charSprites?.play('move', true);
            } else if (Phaser.Input.Keyboard.JustDown(keyboard.K)) {
                this.charSprites?.setFrame('jump');
                this.charSprites?.setVelocityY(this.jumpSpeed);
                this.touchingGround = false;
                if (keyboard.L.isDown === true)
                    this.charSprites?.setFrame('jump_shoot');
            } else {
                this.charSprites?.play('idle', true).setFlipX(this.lookingBack);
                this.charSprites.setVelocity(0, 0);
            }
        }
    }

    _changeCurrentSpeedY(delta_time_in_sec: number) {
        let currentSpeed = this.speedY + (15 * delta_time_in_sec);
        if (currentSpeed > 12)
            currentSpeed = 12;
        this.speedY = currentSpeed;

        this.charSprites.setVelocityY(this.speedY);
        console.log(this.charSprites.getVelocity())

    }

    _createAnimations() {
        this.gameInstance.anims.create({
            key: 'move',
            frames: this.gameInstance.anims.generateFrameNames('santa_claus_atlas', {
                prefix: 'run_',
                start: 1,
                end: 3,
            }),
            frameRate: 10,
            repeat: -1,
            yoyo: true
        });
        this.gameInstance.anims.create({
            key: 'move_shot',
            frames: this.gameInstance.anims.generateFrameNames('santa_claus_atlas', {
                prefix: 'run_shot_',
                start: 1,
                end: 3,
            }),
            frameRate: 10,
            repeat: -1,

        });
        this.gameInstance.anims.create({
            key: 'jump',
            frames: this.gameInstance.anims.generateFrameNames('santa_claus_atlas', {
                frames: [0]
            }),
            frameRate: 1,
        });
        this.gameInstance.anims.create({
            key: 'idle',
            frames: this.gameInstance.anims.generateFrameNames('santa_claus_atlas', {
                prefix: 'idle_',
                frames: [1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            }),
            frameRate: 10,
            repeat: -1
        });
    }

    init() {
        this.sprites();
        this._createAnimations();
        this.movements();
    }
};
