import { SpawnCoordinates } from "../utils/types";

export default interface IBoss {
    spawnPosition: SpawnCoordinates;
    setSpritePosition: (x: number, y: number) => void;
    update: (time: number, dt: number) => void;
    destroy: () => void;
}