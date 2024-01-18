import IEnemy from "../../contracts/enemy";

export default abstract class EnemyController implements IEnemy {
    protected sprite: Phaser.Physics.Matter.Sprite;

    constructor(scene: Phaser.Scene, sprite: Phaser.Physics.Matter.Sprite) {
        this.sprite = sprite;
    };

    update(dt: number): void {

    }

    destroy(): void {

    }

};
