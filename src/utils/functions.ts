import BulletShoot from "../controllers/bulletShoot";
import CandyBoomerang from "../controllers/weapons/candyBoomerang";
import SnowBuster from "../controllers/weapons/snowBuster"
import { BossWeapon } from "./boss";
import { Weapons, WeaponsAtlas } from "./weapons"

export type BulletShootConfig = {
    world: Phaser.Physics.Matter.World,
    x: number,
    y: number,
    bodyOptions: Phaser.Types.Physics.Matter.MatterBodyConfig
}


export function callWeaponClassDinamically(classname: Weapons|BossWeapon, data: BulletShootConfig): BulletShoot | undefined {
    switch (classname) {
        case Weapons.SnowBuster:
            return new SnowBuster(data.world, data.x, data.y, WeaponsAtlas.SnowBuster, data.bodyOptions);
        case Weapons.CandyBoomerang:
            return new CandyBoomerang(data.world, data.x, data.y, WeaponsAtlas.CandyBoomerang, data.bodyOptions);
    }
}