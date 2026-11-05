import { Scene, Tilemaps } from "phaser";
import type { MM6SolidRectangle } from "../mm6/engine/collision/MM6CollisionWorld";

type DoorState = 'closed' | 'opening' | 'open' | 'closing' | 'sealed';

export interface BossDoorOptions {
    layer: Tilemaps.TilemapLayer;
    tileX: number;
    tileY: number;
    tileCount: number;
    tileIndex: number;
    tileSize: number;
    // Side the player is expected to cross towards (1 = right).
    direction: 1 | -1;
    onOpening?: () => void;
}

const STEP_DELAY_MS = 110;
const APPROACH_DISTANCE = 30;
const LEAVE_DISTANCE = 64;

/**
 * Mega Man style boss door: solid while closed, opens tile by tile when the
 * player touches it and closes (sealing the way) once the player passed through.
 */
export default class BossDoorController {
    private state: DoorState = 'closed';
    private visibleTiles: number;
    private timer?: Phaser.Time.TimerEvent;

    constructor(
        private readonly scene: Scene,
        private readonly options: BossDoorOptions,
        private readonly getPlayerPosition: () => { x: number; y: number } | null,
    ) {
        this.visibleTiles = options.tileCount;
    }

    private get centerX(): number {
        return (this.options.tileX + 0.5) * this.options.tileSize;
    }

    isSealed(): boolean {
        return this.state === 'sealed';
    }

    getSolids(): readonly MM6SolidRectangle[] {
        if (this.state === 'open') return [];
        const { tileX, tileY, tileSize, tileCount } = this.options;
        return [{ x: tileX * tileSize, y: tileY * tileSize, width: tileSize, height: tileCount * tileSize }];
    }

    update(): void {
        const player = this.getPlayerPosition();
        if (!player || this.state === 'sealed') return;

        const { tileY, tileSize, tileCount, direction } = this.options;
        const top = tileY * tileSize;
        const bottom = top + tileCount * tileSize;
        const dx = player.x - this.centerX;
        const alignedVertically = player.y > top - tileSize && player.y < bottom + tileSize;

        if (this.state === 'open' || this.state === 'opening') {
            if (dx * direction > LEAVE_DISTANCE) {
                this.close(true);
            } else if (dx * direction < -LEAVE_DISTANCE) {
                this.close(false);
            }
            return;
        }

        if (this.state !== 'closed') return;

        // Respawning beyond the door leaves it permanently closed.
        if (alignedVertically && dx * direction >= APPROACH_DISTANCE) {
            this.state = 'sealed';
        } else if (alignedVertically && Math.abs(dx) < APPROACH_DISTANCE) {
            this.open();
        }
    }

    private open(): void {
        this.state = 'opening';
        this.options.onOpening?.();
        this.runSteps(() => {
            this.visibleTiles--;
            this.setTile(this.visibleTiles, false);
            return this.visibleTiles === 0;
        }, () => { this.state = 'open'; });
    }

    private close(sealAfter: boolean): void {
        this.state = 'closing';
        this.runSteps(() => {
            this.setTile(this.visibleTiles, true);
            this.visibleTiles++;
            return this.visibleTiles === this.options.tileCount;
        }, () => { this.state = sealAfter ? 'sealed' : 'closed'; });
    }

    // Tiles disappear from the bottom up and return from the top down.
    private runSteps(step: () => boolean, onDone: () => void): void {
        this.timer?.remove(false);
        this.timer = this.scene.time.addEvent({
            delay: STEP_DELAY_MS,
            loop: true,
            callback: () => {
                if (step()) {
                    this.timer?.remove(false);
                    onDone();
                }
            },
        });
    }

    private setTile(index: number, visible: boolean): void {
        const { layer, tileX, tileY, tileIndex } = this.options;
        if (visible) {
            layer.putTileAt(tileIndex, tileX, tileY + index);
        } else {
            layer.removeTileAt(tileX, tileY + index);
        }
    }
}
