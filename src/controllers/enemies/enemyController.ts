import IEnemy from "../../contracts/enemy";

export default abstract class EnemyController implements IEnemy {
    protected sprite!: Phaser.Physics.Matter.Sprite;
    protected isPaused: boolean = false;

    constructor(scene: Phaser.Scene) {
        
    };

    update(dt: number): void {
        if (this.isPaused) return;
    }

    destroy(): void {
        if (this.sprite) {
            this.sprite.destroy();
        }
    }

    pause(): void {
        this.isPaused = true;
        if (this.sprite) {
            this.sprite.setStatic(true);
            this.sprite.anims.pause();
        }
    }

    resume(): void {
        this.isPaused = false;
        if (this.sprite) {
            this.sprite.setStatic(false);
            this.sprite.anims.resume();
        }
    }
};
