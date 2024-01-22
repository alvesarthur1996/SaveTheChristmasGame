import { Weapons, WeaponsAtlas } from "../../utils/weapons";
import BulletShoot from "../bulletShoot";

export default class CandyBoomerang extends BulletShoot {
    constructor(
        world: Phaser.Physics.Matter.World,
        x: number,
        y: number,
        texture: Phaser.Textures.Texture | string,
        bodyOptions: Phaser.Types.Physics.Matter.MatterBodyConfig
    ) {
        super(world, x, y, texture, bodyOptions);
        this.setIgnoreGravity(true);
        this.setScale(0.5);
        this.setFriction(0);
        this.setFixedRotation()
        this.setName(Weapons.CandyBoomerang);
        this.damage = 2;
        this.speed = 3.5;

        this.anims.create({
            key: 'shoot',
            frames: [{
                key: WeaponsAtlas.CandyBoomerang,
            }],
            frameRate: 10,
            repeat: -1,
        });
    }

    fire(charSprite: Phaser.Physics.Matter.Sprite) {
        this.play('shoot');
        this.world.add([this.body]);
        this.flipX = charSprite.flipX;

        let getX = charSprite.x + (this.flipX ? -(charSprite.width / 1.8) : (charSprite.width / 1.8));

        this.setPosition(getX, charSprite.y);
        this.setActive(true);
        this.setVisible(true);
        this.setRotation(charSprite.angle + (charSprite.flipX ? - 2 : + 2));
        this.setVelocityX((this.flipX ? -1 : 1) * this.speed * Math.cos(charSprite.angle));
        this.setAngularVelocity((this.flipX ? -0.3 : 0.3))
        this.setIgnoreGravity(false);
        this.setVelocityY(-5);

        this.lifespan = 1000;
    }
};
