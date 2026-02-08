export type AnimatedTilesHandle = {
  /** Stop updating tiles (doesn't revert indexes). */
  stop: () => void;
  /** Force a re-scan of tiles on the layer (useful if you edit the layer at runtime). */
  rescan: () => void;
};

export type StartAnimatedTilesOptions = {
  /** Timer resolution in ms. 16 ~= 60fps. Increase to reduce CPU. */
  tickMs?: number;
  /** Optional filter: only animate tiles that pass this predicate. */
  tileFilter?: (tile: Phaser.Tilemaps.Tile) => boolean;
};

/**
 * Standalone animated-tiles helper.
 *
 * Reads Tiled animation data from `tileset.tileData[localId].animation` (Tiled JSON export)
 * and swaps `tile.index` on a given dynamic tilemap layer.
 */
export function startAnimatedTilesOnLayer(
  scene: Phaser.Scene,
  map: Phaser.Tilemaps.Tilemap,
  layerName: string,
  options: StartAnimatedTilesOptions = {}
): AnimatedTilesHandle {
  const layer = map.getLayer(layerName)?.tilemapLayer;

  if (!layer) {
    throw new Error(`[animatedTiles] Layer not found: ${layerName}`);
  }

  const tickMs = options.tickMs ?? 16;

  type AnimDef = {
    baseGid: number;
    frames: { gid: number; duration: number }[];
    tiles: Phaser.Tilemaps.Tile[];
    frameIndex: number;
    nextMs: number;
  };

  const animDefs: AnimDef[] = [];

  const buildDefs = () => {
    animDefs.length = 0;

    for (const ts of map.tilesets) {
      const td = (ts as any).tileData as Record<string, any> | undefined;
      if (!td) continue;

      for (const k of Object.keys(td)) {
        const localId = Number(k);
        const tileInfo = td[k];
        const anim = tileInfo?.animation;
        if (!Array.isArray(anim) || anim.length === 0) continue;

        const baseGid = ts.firstgid + localId;
        const frames = anim.map((f: any) => ({
          gid: ts.firstgid + (f.tileid ?? 0),
          duration: Number(f.duration ?? 100),
        }));

        const tiles: Phaser.Tilemaps.Tile[] = [];
        layer.forEachTile((t) => {
          if (!t || t.index === -1) return;
          if (options.tileFilter && !options.tileFilter(t)) return;
          if (t.index === baseGid) tiles.push(t);
        });

        if (tiles.length === 0) continue;

        animDefs.push({
          baseGid,
          frames,
          tiles,
          frameIndex: 0,
          nextMs: frames[0].duration,
        });
      }
    }
  };

  buildDefs();

  if (animDefs.length === 0) {
    // No-op handle
    return {
      stop: () => void 0,
      rescan: () => void 0,
    };
  }

  const timer = scene.time.addEvent({
    delay: tickMs,
    loop: true,
    callback: () => {
      // Use Phaser's measured delta (ms)
      const dt = scene.game.loop.delta;

      for (const d of animDefs) {
        d.nextMs -= dt;
        if (d.nextMs > 0) continue;

        d.frameIndex = (d.frameIndex + 1) % d.frames.length;
        const f = d.frames[d.frameIndex];
        d.nextMs = f.duration;

        for (const t of d.tiles) {
          if (!t || t.index === -1) continue;
          t.index = f.gid;
        }
      }
    },
  });

  return {
    stop: () => {
      timer.remove(false);
    },
    rescan: () => {
      buildDefs();
    },
  };
}
