import { Weapons, WeaponsAtlas } from "../../utils/weapons";
import BulletShoot from "../bulletShoot";

export default class IceBlock extends BulletShoot {
    constructor(
        world: Phaser.Physics.Matter.World,
        x: number,
        y: number,
        texture: Phaser.Textures.Texture | string,
        bodyOptions: Phaser.Types.Physics.Matter.MatterBodyConfig
    ) {
        super(world, x, y, texture, bodyOptions);
        this.setIgnoreGravity(true);
        this.setScale(1);
        this.setFriction(0);
        this.setName(Weapons.IceBlock);
        this.setSensor(false);
        this.setStatic(true);
        this.setFixedRotation();
        this.damage = 2;

        this.anims.create({
            key: 'shoot',
            frames: [{
                key: WeaponsAtlas.IceBlock,
            }],
            frameRate: 10,
            repeat: -1,
            yoyo: true
        });
    }

    protected onCollideCallback({ bodyA, bodyB, pair }) {
        if (bodyB?.gameObject instanceof Phaser.Physics.Matter.TileBody) {
            return;
        }

        if (bodyB?.gameObject instanceof BulletShoot) {
            return;
        }

        if (bodyB.gameObject && bodyB.gameObject.name == 'player')
            return;


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
        // fire(x: number, y: number, angle: number, speed: number, spriteFlipped: boolean = false) {
        this.play('shoot');
        this.world.add([this.body]);
        this.flipX = charSprite.flipX;

        let getX = charSprite.x + (this.flipX ? -(charSprite.width * 2) : (charSprite.width * 2));

        this.setPosition(getX, charSprite.y);
        this.setActive(true);
        this.setVisible(true);
        this.setRotation(charSprite.angle);
        // this.setVelocityX((this.flipX ? -1 : 1) * this.speed * Math.cos(charSprite.angle));
        // this.setVelocityY(speed * Math.sin(angle));

        this.lifespan = 5000;
    }
};
