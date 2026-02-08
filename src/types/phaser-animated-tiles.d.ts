declare module 'phaser-animated-tiles/src/plugin/main.js' {
  export default class AnimatedTiles extends Phaser.Plugins.ScenePlugin {
    init(map: Phaser.Tilemaps.Tilemap): void;
    resume(layerIndex?: number | null, mapIndex?: number | null): void;
    pause(layerIndex?: number | null, mapIndex?: number | null): void;
    setRate(rate: number, gid?: number | null, map?: number | null): void;
    resetRates(mapIndex?: number | null): void;

    /** Re-scan tilemap/layers and (re)attach animated tile instances. */
    updateAnimatedTiles?(): void;
  }
}
