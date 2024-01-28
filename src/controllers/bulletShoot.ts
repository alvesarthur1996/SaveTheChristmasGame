export default abstract class BulletShoot extends Phaser.Physics.Matter.Sprite {
    public lifespan: number = 0;
    public damage = 1;
    public speed = 4;
    public consume = 1;

    constructor(
        world: Phaser.Physics.Matter.World,
        x: number,
        y: number,
        texture: Phaser.Textures.Texture | string,
        bodyOptions: Phaser.Types.Physics.Matter.MatterBodyConfig
    ) {
        super(world, x, y, texture, undefined, { plugin: bodyOptions });
        this.setFrictionAir(0);
        this.setActive(false);
        this.setVisible(false);
        this.setData('type', 'shoot');
        this.setSensor(true);

        this.scene.add.existing(this);
        this.world.remove([this.body], true);

        this.scene.matterCollision.addOnCollideStart({
            objectA: [this],
            callback: this.onCollideCallback,
            context: this
        });
    }

    protected onCollideCallback({ bodyA, bodyB, pair }) {
        if (bodyB?.gameObject instanceof Phaser.Physics.Matter.TileBody) {
            return;
        }

        if (bodyB?.gameObject instanceof BulletShoot) {
            return;
        }

        if (bodyB?.gameObject) {
            const type = bodyB?.gameObject.getData('type') ?? null;
            if (type == 'boss')
                this.setActive(false);
            this.setVisible(false);
            this.world.remove([this.body], true);
            return;
        }
    }

    fire(charSprite: Phaser.Physics.Matter.Sprite) {
        this.scene.sound.play('snow_buster', {
            volume: 0.3
        });
        this.play('shoot');
        this.world.add([this.body]);
        this.flipX = charSprite.flipX;

        let getX = charSprite.x + (this.flipX ? -(charSprite.width / 2) : (charSprite.width / 2));

        this.setPosition(getX, charSprite.y);
        this.setActive(true);
        this.setVisible(true);
        this.setRotation(charSprite.angle);
        this.setVelocityX((this.flipX ? -1 : 1) * this.speed * Math.cos(charSprite.angle));
        // this.setVelocityY(speed * Math.sin(angle));

        this.lifespan = 1000;
    }

    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);

        this.lifespan -= delta;

        if (this.lifespan <= 0) {
            this.setActive(false);
            this.setVisible(false);
            this.world.remove([this.body], true);
        }
    }
};
