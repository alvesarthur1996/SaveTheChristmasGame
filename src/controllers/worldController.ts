interface RoomLayer {
    layer: Phaser.Tilemaps.TilemapLayer | null;
}

type TileFlipSnapshot = { tile: Phaser.Tilemaps.Tile; flipX: boolean; flipY: boolean };


export default class WorldController {
    private stageSlug!: string;
    private phaserInstance!: Phaser.Scene;
    private tileSize: number = 16;
    private stageTilesetKeys: string[];
    private mapTileset!: Phaser.Tilemaps.Tilemap;

    private stageRooms!: Map<string, RoomLayer>;

    constructor(phaserInstance: Phaser.Scene, stageSlug: string, stageTilesetKeys: string[], tileSize?: number) {
        this.phaserInstance = phaserInstance;
        this.stageSlug = stageSlug;
        this.stageTilesetKeys = stageTilesetKeys;

        if (tileSize) {
            this.tileSize = tileSize;
        }
    }

    /**
     * Mount map tileset for the current stage.
     * 
     * @returns Phaser.Tilemaps.Tilemap
     */
    public mountMap(): Phaser.Tilemaps.Tilemap {
        const map = this.phaserInstance.make.tilemap({ key: this.stageSlug, tileWidth: this.tileSize, tileHeight: this.tileSize });

        this.stageTilesetKeys.forEach(tilesetKey => {
            map.addTilesetImage(tilesetKey, tilesetKey);
        });

        this.mapTileset = map;

        return this.mapTileset;
    }

    /**
     * Exposes the mounted Tilemap instance.
     * Needed by systems/plugins (e.g. Tiled Animated Tiles) that must read tileset animation metadata.
     */
    public getMap(): Phaser.Tilemaps.Tilemap {
        if (!this.mapTileset) {
            throw new Error('Map tileset is not mounted. Call mountMap() before getMap().');
        }
        return this.mapTileset;
    }

    public getObjectLayer(layerName: string = 'objects'): Phaser.Tilemaps.ObjectLayer | null {
        if (!this.mapTileset) {
            console.warn('Map tileset is not mounted. Call mountMap() before accessing object layers.');
            return null;
        }

        const objectLayer = this.mapTileset.getObjectLayer(layerName);
        return objectLayer || null;
    }

    public getBackgroundImage(): object | null {
        const backgroundImage = this.mapTileset.images[0];
        if (backgroundImage) {
            backgroundImage.name = this.stageSlug + '_background_image';
            return backgroundImage;
        }
        return null;
    }

    public createLayers(roomNames: string[], backgroundName: string | null = null): void {
        if (!this.mapTileset) {
            throw new Error('Map tileset is not mounted. Call mountMap() before createLayers().');
        }

        if (backgroundName) {
            this.mapTileset.createLayer(backgroundName, this.stageTilesetKeys, 0, 0);
            // backgroundLayer!.setDepth(-10);
        }

        this.stageRooms = new Map<string, RoomLayer>();

        roomNames.forEach(roomName => {
            const layer = this.mapTileset.createLayer(roomName, this.stageTilesetKeys, 0, 0);
            //layer?.setDepth(1);

            if (!layer) {
                console.warn(`[WorldController] Tilemap layer not found: "${roomName}"`);
                this.stageRooms.set(roomName, { layer: null });
                return;
            }

            layer.setCollisionByProperty({ collision: true });
            this.stageRooms.set(roomName, { layer });
        });
        
        this.convertTilemapLayers();
    }

    private convertTilemapLayers(): void {
        this.stageRooms.forEach((roomLayer, roomName) => {
            if (!roomLayer.layer) return;
            this.safelyConvertTilemapLayer(roomLayer.layer, roomName);
        });
    }

    private safelyConvertTilemapLayer(layer: Phaser.Tilemaps.TilemapLayer, roomName: string): void {
        const flippedTiles: TileFlipSnapshot[] = [];

        // Workaround for Phaser/MatterTileBody flip bug:
        // temporarily clear flipX/flipY before convertTilemapLayer, then restore.
        layer.forEachTile((tile) => {
            if (!tile) return;
            if (tile.index === -1) return;

            if (tile.flipX || tile.flipY) {
                flippedTiles.push({ tile, flipX: tile.flipX, flipY: tile.flipY });
                tile.flipX = false;
                tile.flipY = false;
            }
        });

        try {
            this.phaserInstance.matter.world.convertTilemapLayer(layer);
        } catch (err) {
            console.error(`[WorldController] convertTilemapLayer failed for "${roomName}"`, err);
            throw err;
        } finally {
            for (const { tile, flipX, flipY } of flippedTiles) {
                tile.flipX = flipX;
                tile.flipY = flipY;
            }
        }
    }
    
    public getRoomLayers(roomName: string): Phaser.Tilemaps.TilemapLayer | null {
        const roomLayer = this.stageRooms.get(roomName);
        return roomLayer ? roomLayer.layer : null;
    }

    /**
     * Mostra uma sala sem esconder as demais (útil para transições entre rooms onde a anterior deve permanecer ativa).
     */
    public showRoom(roomName: string): void {
        this.setRoomVisibliity(roomName, true, false);
    }

    public setRoomVisibliity(roomName: string, visible: boolean, hideAllOtherRooms: boolean = false): void {
        const roomLayer = this.stageRooms.get(roomName);
        if (roomLayer && roomLayer.layer) {
            roomLayer.layer.setVisible(visible);
        }
        
        if(hideAllOtherRooms){
            this.stageRooms.forEach((layer, name) => {
                if(name !== roomName && layer.layer){
                    layer.layer.setVisible(!visible);
                }
            });
        }
    }
}