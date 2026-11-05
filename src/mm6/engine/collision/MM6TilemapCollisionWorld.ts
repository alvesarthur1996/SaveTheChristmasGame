import MM6CollisionWorld from './MM6CollisionWorld.js';
import type { MM6SolidRectangle } from './MM6CollisionWorld.js';

export interface MM6TileCollisionLayer {
    getTileAt(tileX: number, tileY: number): { collides: boolean } | null;
}

export default class MM6TilemapCollisionWorld implements MM6CollisionWorld {
    private readonly solidRectangles: readonly MM6SolidRectangle[];
    private readonly ladderRectangles: readonly MM6SolidRectangle[];
    private dynamicSolidProvider?: () => readonly MM6SolidRectangle[];

    constructor(
        private readonly layers: readonly MM6TileCollisionLayer[],
        solidRectangles: readonly MM6SolidRectangle[],
        ladderRectangles: readonly MM6SolidRectangle[] = [],
    ) {
        for (const rectangle of [...solidRectangles, ...ladderRectangles]) {
            if (![rectangle.x, rectangle.y, rectangle.width, rectangle.height].every(Number.isFinite)
                || rectangle.width <= 0
                || rectangle.height <= 0) {
                throw new RangeError('Solid rectangles must have finite coordinates and positive dimensions.');
            }
        }

        this.solidRectangles = solidRectangles.map(rectangle => ({ ...rectangle }));
        this.ladderRectangles = ladderRectangles.map(rectangle => ({ ...rectangle }));
    }

    getLadderRectangles(): readonly MM6SolidRectangle[] {
        return this.ladderRectangles;
    }

    isSolidTile(tileX: number, tileY: number): boolean {
        return this.layers.some(layer => layer.getTileAt(tileX, tileY)?.collides === true);
    }

    getSolidRectangles(): readonly MM6SolidRectangle[] {
        if (!this.dynamicSolidProvider) {
            return this.solidRectangles;
        }
        return [...this.solidRectangles, ...this.dynamicSolidProvider()];
    }

    setDynamicSolidProvider(provider: (() => readonly MM6SolidRectangle[]) | undefined): void {
        this.dynamicSolidProvider = provider;
    }
}
