import { Weapons, WeaponsAtlas } from "../../utils/weapons";
import BulletShoot from "../bulletShoot";

export default class LaserBeam extends BulletShoot {
    constructor(
        world: Phaser.Physics.Matter.World,
        x: number,
        y: number,
        texture: Phaser.Textures.Texture | string,
        bodyOptions: Phaser.Types.Physics.Matter.MatterBodyConfig
    ) {
        super(world, x, y, texture, bodyOptions);
        this.setIgnoreGravity(true);
        this.setScale(0.7);
        this.setFriction(0);
        this.setFixedRotation()
        this.setName(Weapons.LaserBeam);
        this.damage = 2;
        this.speed = 5.1;
        this.consume = 2;
        
        this.anims.create({
            key: 'shoot',
            frames: this.anims.generateFrameNames(WeaponsAtlas.LaserBeam, {
                prefix: 'laser_beam_',
                start: 0,
                end: 8,
            }),
            frameRate: 10,
        });
    }

    fire(charSprite: Phaser.Physics.Matter.Sprite, flipped: boolean = false) {
        this.play('shoot');
        this.scene.sound.play('laser_beam', {
            volume: 0.3
        });
        this.world.add([this.body]);
        if (flipped)
            this.flipX = !charSprite.flipX;
        else
            this.flipX = charSprite.flipX;

        let getX = charSprite.x + (this.flipX ? -(charSprite.width / 1.2) : (charSprite.width / 1.2));

        this.setPosition(getX, charSprite.y * 0.99);
        this.setActive(true);
        this.setVisible(true);
        this.setVelocityX((this.flipX ? -1 : 1) * this.speed * Math.cos(charSprite.angle));

        this.lifespan = 1500;
    }
};
