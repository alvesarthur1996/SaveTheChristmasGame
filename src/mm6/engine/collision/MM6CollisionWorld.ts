export interface MM6SolidRectangle {
    x: number;
    y: number;
    width: number;
    height: number;
}

export default interface MM6CollisionWorld {
    isSolidTile(tileX: number, tileY: number): boolean;
    getSolidRectangles?(): readonly MM6SolidRectangle[];
    getLadderRectangles?(): readonly MM6SolidRectangle[];
    setDynamicSolidProvider?(provider: (() => readonly MM6SolidRectangle[]) | undefined): void;
}
