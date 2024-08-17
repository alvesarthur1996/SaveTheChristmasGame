import { SoundOptions } from "../../utils/options";
import { Weapons } from "../../utils/weapons";
import BulletShoot from "../bulletShoot";

export default class SnowBuster extends BulletShoot {
    constructor(
        world: Phaser.Physics.Matter.World,
        x: number,
        y: number,
        texture: Phaser.Textures.Texture | string,
        bodyOptions: Phaser.Types.Physics.Matter.MatterBodyConfig,
        soundOptions: SoundOptions
    ) {
        super(world, x, y, texture, bodyOptions, soundOptions);
        this.setIgnoreGravity(true);
        this.setScale(0.25);
        this.setFriction(0);
        this.setName(Weapons.SnowBuster);
        this.setFixedRotation();
        this.damage = 1;

        this.anims.create({
            key: 'shoot',
            frames: this.anims.generateFrameNames('snow_buster_atlas', {
                prefix: 'snowball_',
                start: 1,
                end: 3,
            }),
            frameRate: 10,
            repeat: -1,
            yoyo: true
        });
    }
};
