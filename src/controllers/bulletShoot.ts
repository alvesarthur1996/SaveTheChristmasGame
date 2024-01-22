export default abstract class BulletShoot extends Phaser.Physics.Matter.Sprite {
    public lifespan: number = 0;
    public damage = 1;
    public speed = 5;

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
        this.setData('type', 'shoot');
        this.setSensor(true);

        this.scene.add.existing(this);
        this.world.remove([this.body], true);

        const self = this;
        this.scene.matterCollision.addOnCollideStart({
            objectA: [this],
            callback: function ({ bodyA, bodyB, pair }) {
                if (bodyB?.gameObject instanceof Phaser.Physics.Matter.TileBody) {
                    return;
                }
                if (bodyB?.gameObject) {
                    const type = bodyB?.gameObject.getData('type') ?? null;
                    if (type == 'boss')
                        self.setActive(false).setVisible(false)
                    self.setActive(false);
                    self.setVisible(false);
                    self.world.remove([self.body], true);
                    return;
                }
            },
            context: this
        });
    }

    fire(charSprite: Phaser.Physics.Matter.Sprite) {
        // fire(x: number, y: number, angle: number, speed: number, spriteFlipped: boolean = false) {
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
