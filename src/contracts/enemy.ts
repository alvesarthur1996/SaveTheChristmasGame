export default interface IEnemy {
    update(dt: number): void;
    destroy(): void;
    pause(): void;
    resume(): void;
}