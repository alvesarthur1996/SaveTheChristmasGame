import BulletShoot from "../controllers/bulletShoot";
import CandyBoomerang from "../controllers/weapons/candyBoomerang";
import IceBlock from "../controllers/weapons/iceBlock";
import LaserBeam from "../controllers/weapons/laserBeam";
import SnowBuster from "../controllers/weapons/snowBuster"
import DefaultScene from "../scenes/defaultScene";
import { BossWeapon } from "./boss";
import { SoundOptions } from "./options";
import { Weapons, WeaponsAtlas } from "./weapons"

export type BulletShootConfig = {
    world: Phaser.Physics.Matter.World,
    x: number,
    y: number,
    bodyOptions: Phaser.Types.Physics.Matter.MatterBodyConfig
    soundOptions: SoundOptions
}


export function callWeaponClassDinamically(classname: Weapons | BossWeapon, data: BulletShootConfig): BulletShoot | undefined {
    switch (classname) {
        case Weapons.SnowBuster:
            return new SnowBuster(data.world, data.x, data.y, WeaponsAtlas.SnowBuster, data.bodyOptions, data.soundOptions);
        case Weapons.CandyBoomerang:
            return new CandyBoomerang(data.world, data.x, data.y, WeaponsAtlas.CandyBoomerang, data.bodyOptions, data.soundOptions);
        case Weapons.LaserBeam:
            return new LaserBeam(data.world, data.x, data.y, WeaponsAtlas.LaserBeam, data.bodyOptions, data.soundOptions);
        case Weapons.IceBlock:
            return new IceBlock(data.world, data.x, data.y, WeaponsAtlas.IceBlock, data.bodyOptions, data.soundOptions);
    }
}


export function createParallaxImage(scene: DefaultScene, count: number, image: object, scrollFactor: number, offsetY: number = 0, offsetX: number = 0) {
    let x = image.x + offsetX;
    console.log(x)
    for (let i = 1; i <= count; i++) {
        const img = scene.add.image(x, image.y + offsetY, image.name)
            .setOrigin(0, 0)
            .setScrollFactor(scrollFactor);
        x += img.width;
    }
}