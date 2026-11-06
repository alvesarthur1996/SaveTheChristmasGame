import { Tilemaps } from "phaser";
import { collectedItems } from "../../utils/collectedItems";
import PlayerController from "../../controllers/characters/playerController";
import EnemyController from "../../controllers/enemies/enemyController";
import ObstaclesController from "../../controllers/obsctaclesController";
import Stages, { StageSlugs } from "../../utils/stages";
import { sharedInstance as events } from "../eventCentre";
import InteractionsController from "../../controllers/interactionsController";
import BossController from "../../controllers/characters/bosses/bossController";
import Boss from "../../utils/boss";
import { createBoss, getBossOverride, runBossIntro } from "../../utils/bossSelection";
import GameEvents, { HealthChange, WeaponEnergyChange } from "../../utils/events";
import DefaultScene from "../defaultScene";
import CameraController from "../../controllers/cameraController";
import WorldController from "../../controllers/worldController";
import { createParallaxImage } from "../../utils/functions";
import { startAnimatedTilesOnLayer } from "../../utils/animatedTiles";
import MM6TilemapCollisionWorld from "../../mm6/engine/collision/MM6TilemapCollisionWorld";
import BossDoorController from "../../controllers/bossDoorController";

// Test spawn in room_7 (the room before the boss corridor), enabled with `?spawn=room7`.
const ROOM_7_FORCED_SPAWN = { x: 1330, y: 776 };

export default class CandyLandStage extends DefaultScene {
    private playerController?: PlayerController;
    private bossController: any;
    private obstacles!: ObstaclesController;
    private interactions!: InteractionsController;
    private enemies!: Array<EnemyController>;
    private tile_size = 16;
    private gameCamera: CameraController;
    private movementWorld?: MM6TilemapCollisionWorld;
    private bossDoors: BossDoorController[] = [];
    private bossRoomShade?: Phaser.GameObjects.Rectangle;
    private doorCrossing: { door: BossDoorController; walkToX: number; holdUntilBoss: boolean } | null = null;

    constructor() {
        super(Stages.CandyLand);
        this.enemies = [];
        this.obstacles = new ObstaclesController();
        this.interactions = new InteractionsController();
        this.gameCamera = new CameraController();
    }

    init() {
        this.scene.launch('UI');
    }

    preload() {
        this.load.baseURL = 'http://localhost:8080/static/'
        this.load.tilemapTiledJSON(StageSlugs.CandyLand, 'maps/candy_land/candy_land.json');
    }

    create() {
        this.bossRoomShade = undefined;
        this.doorCrossing = null;
        this.bossDoors = [];
        /* Background Music */
        const bgm = this.sound.add(StageSlugs.CandyLand + '_stage', { loop: true, volume: 0.45 * (this.SoundOptions.BGM / 10) }); bgm.play();
        let sound = this.sound.get(StageSlugs.CandyLand + '_stage');
        events.on(GameEvents.SoundOptionsChanged, () => {
            if (bgm.isPlaying)
                bgm.setVolume(0.45 * (this.SoundOptions.BGM / 10));
        });
        
        /* Camera Setup */
        this.gameCamera.setSceneCamera(this.cameras.main);

        /* Map Setup */
        const mapTilesetKeys: string[] = ['tileset_candy', 'other_candy_blocks', 'tiles_test', 'new_candy_options', 'boss_doors'];
        const backgroundLayer: string = 'background';
        const tilemapLayers: string[] = ['room_1', 'room_2', 'room_3', 'room_4', 'room_5', 'room_6', 'room_7', 'boss_gate', 'boss_room'];
        const worldController = new WorldController(this, StageSlugs.CandyLand, mapTilesetKeys, this.tile_size);
        
        try {
            worldController.mountMap();
            worldController.getObjectLayer();

            // Collect boss attack markers (Tiled object layer: `boss_attacks`).
            // Expected: 10 objects named `candy_shower`.
            const bossAttacksLayer = worldController.getObjectLayer('boss_attacks');
            const candyShowerMarkers = (bossAttacksLayer?.objects ?? [])
                .filter(o => o.name === 'candy_shower')
                .map(o => ({
                    x: (o.x ?? 0) + ((o.width ?? 0) / 2),
                    y: (o.y ?? 0) + ((o.height ?? 0) / 2),
                    width: o.width ?? 0,
                    height: o.height ?? 0,
                }));

            // Canonical boss-special event: phase=markers
            events.emit(GameEvents.BossSpecialAttack, {
                boss: Boss.GingerMad,
                attack: 'candy_shower',
                phase: 'markers',
                markers: candyShowerMarkers,
            });

            const backgroundImage = worldController.getBackgroundImage();
            if (backgroundImage){
                createParallaxImage(this, 2, backgroundImage, 0.35, -80);
            }

            worldController.createLayers(tilemapLayers, backgroundLayer);

            const map = worldController.getMap();
            startAnimatedTilesOnLayer(this, map, backgroundLayer);
            const collisionLayers = tilemapLayers
                .map(layerName => worldController.getRoomLayers(layerName))
                .filter((layer): layer is Phaser.Tilemaps.TilemapLayer => layer !== null);
            const solidRectangles = (worldController.getObjectLayer()?.objects ?? [])
                .filter(object => object.name === 'wall')
                .map(object => ({
                    x: object.x ?? 0,
                    y: object.y ?? 0,
                    width: object.width ?? 0,
                    height: object.height ?? 0,
                }));
            const ladderRectangles = (worldController.getObjectLayer()?.objects ?? [])
                .filter(object => object.name === 'ladder')
                .map(object => ({
                    x: object.x ?? 0,
                    y: object.y ?? 0,
                    width: object.width ?? 0,
                    height: object.height ?? 0,
                }));
            this.movementWorld = new MM6TilemapCollisionWorld(
                collisionLayers,
                solidRectangles,
                ladderRectangles,
            );

            this.mountCameraSetup();

            this.gameCamera.setRoomBounds('room_1');
            this.handleObjects(worldController);
            this.createBossDoors(worldController);

  

            events.once('boss_room_trigger', () => {
                sound.destroy();
                const boss_battle = this.sound.add('boss_fight', { loop: true, volume: 0.45 * (this.SoundOptions.BGM / 10) }); boss_battle.play();
                events.on(GameEvents.SoundOptionsChanged, () => {
                    if (boss_battle.isPlaying)
                        boss_battle.setVolume(0.45 * (this.SoundOptions.BGM / 10));
                });
                sound = this.sound.get('boss_fight');
            });

            this.events.once('shutdown', () => {
                this.bossController = undefined;
                this.sound.removeAll();
            });

        } catch (err) {
            console.log("ERROR: ", err)
        }
    }

    private handleObjects(worldController: WorldController) {
        const objectLayer: Tilemaps.ObjectLayer | null = worldController.getObjectLayer();

        // Gate body is created from the `boss_gate_trigger` object, but it should only become solid
        // after the player activates `near_boss_respawn` (checkpoint inside the gate corridor).
        let bossGateBarrier: MatterJS.BodyType | null = null;

        objectLayer?.objects.forEach(object => {
            const { x = 0, y = 0, name, width = 0, height = 0 } = object;

            switch (name) {
                case 'spawn_zone':
                    if (!this.movementWorld) {
                        throw new Error('Candy Land collision world was not initialized.');
                    }
                    this.playerController = new PlayerController(this, this.obstacles, this.interactions, {
                        collisionWorld: this.movementWorld,
                    });
                    if (this.playerController.spawnPosition.x == 0 && this.playerController.spawnPosition.y == 0)
                        this.playerController.spawnPosition = { x, y };

                    if (new URLSearchParams(window.location.search).get('spawn') === 'room7') {
                        this.playerController.spawnPosition = ROOM_7_FORCED_SPAWN;
                        worldController.setRoomVisibliity('room_7', true);
                        worldController.showRoom('boss_gate');
                    }

                    this.playerController.setSpritePosition(this.playerController.spawnPosition.x, this.playerController.spawnPosition.y);
                    this.gameCamera.playerSpawnCamera(this.playerController.getSprite());
                    if (new URLSearchParams(window.location.search).get('spawn') === 'room7') {
                        this.gameCamera.setRoomBounds('room_7');
                    }
                    break;
                case 'spawn_zone_2':
                    const new_spawn: MatterJS.BodyType = this.matter.add.rectangle(x + (width / 2), y + (height / 2), width, height, {
                        isStatic: true,
                        isSensor: true,
                    });
                    this.interactions.add('new_spawn', new_spawn);
                    break;
                case 'near_boss_respawn':
                    const near_boss_respawn_sensor: MatterJS.BodyType = this.matter.add.rectangle(
                        x + (width / 2),
                        y + (height / 2),
                        width,
                        height,
                        {
                            isStatic: false,
                            isSensor: true,
                            label: 'near_boss_respawn'
                        }
                    );
                    this.interactions.add('camera_trigger', near_boss_respawn_sensor);
                    this.interactions.add('new_spawn', near_boss_respawn_sensor);

                    events.once('near_boss_respawn', () => {
                        localStorage.setItem('spawnPosition', JSON.stringify({ x: x + (width / 2), y: y + (height / 2) }));

                        worldController.showRoom('boss_gate');
                        this.gameCamera.setRoomBounds('boss_gate');

                        // After reaching the checkpoint marker inside the corridor, block the way back.
                        if (bossGateBarrier) {
                            setTimeout(() => {
                                bossGateBarrier!.isSensor = false;
                            }, 500);
                        }

                        setTimeout(() => { near_boss_respawn_sensor.isSensor = false; }, 500);
                        events.off('near_boss_respawn');
                    });
                    break;
                case 'room_2_trigger':
                    const trigger_cam: MatterJS.BodyType = this.matter.add.rectangle(x + (width / 2), y + (height / 2), width, height, {
                        isStatic: true,
                        isSensor: true,
                        label: 'room_2_camera_trigger'
                    });
                    this.interactions.add('camera_trigger', trigger_cam);
                    events.on('room_2_camera_trigger', () => {
                        worldController.setRoomVisibliity('room_2', true);
                        this.gameCamera.setRoomBounds('room_2');
                    });
                    break;
                case 'room_3_trigger':
                    const trigger_cam_3: MatterJS.BodyType = this.matter.add.rectangle(x + (width / 2), y + (height / 2), width, height, {
                        isStatic: true,
                        isSensor: true,
                        label: 'room_3_camera_trigger'
                    });
                    this.interactions.add('camera_trigger', trigger_cam_3);
                    events.on('room_3_camera_trigger', () => {
                        worldController.setRoomVisibliity('room_3', true);
                        this.gameCamera.setRoomBounds('room_3');
                    });
                    break;
                case 'room_4_trigger':
                    const trigger_cam_4: MatterJS.BodyType = this.matter.add.rectangle(x + (width / 2), y + (height / 2), width, height, {
                        isStatic: true,
                        isSensor: true,
                        label: 'room_4_camera_trigger'
                    });
                    this.interactions.add('camera_trigger', trigger_cam_4);
                    events.once('room_4_camera_trigger', () => {
                        worldController.setRoomVisibliity('room_4', true);
                        this.gameCamera.setRoomBounds('room_4');
                        setTimeout(() => { trigger_cam_4.isSensor = false; }, 500);
                        events.off('room_4_camera_trigger');
                    });
                    break;
                case 'room_5_trigger':
                    const trigger_cam_5: MatterJS.BodyType = this.matter.add.rectangle(x + (width / 2), y + (height / 2), width, height, {
                        isStatic: true,
                        isSensor: true,
                        label: 'room_5_camera_trigger'
                    });
                    this.interactions.add('camera_trigger', trigger_cam_5);
                    events.once('room_5_camera_trigger', () => {
                        worldController.setRoomVisibliity('room_5', true);
                        this.gameCamera.setRoomBounds('room_5');
                        setTimeout(() => { trigger_cam_5.isSensor = false; }, 500);
                        events.off('room_5_camera_trigger');
                    });
                    break;
                case 'room_6_trigger':
                    const trigger_cam_6: MatterJS.BodyType = this.matter.add.rectangle(x + (width / 2), y + (height / 2), width, height, {
                        isStatic: true,
                        isSensor: true,
                        label: 'room_6_camera_trigger'
                    });
                    this.interactions.add('camera_trigger', trigger_cam_6);
                    events.once('room_6_camera_trigger', () => {
                        worldController.setRoomVisibliity('room_6', true);
                        this.gameCamera.setRoomBounds('room_6');
                        setTimeout(() => { trigger_cam_6.isSensor = false; }, 500);
                        events.off('room_6_camera_trigger');
                    });
                    break;
                case 'room_7_trigger':
                    const trigger_cam_7: MatterJS.BodyType = this.matter.add.rectangle(x + (width / 2), y + (height / 2), width, height, {
                        isStatic: true,
                        isSensor: true,
                        label: 'room_7_camera_trigger'
                    });
                    this.interactions.add('camera_trigger', trigger_cam_7);
                    events.once('room_7_camera_trigger', () => {
                        worldController.setRoomVisibliity('room_7', true);
                        worldController.showRoom('boss_gate');
                        this.gameCamera.setRoomBounds('room_7');
                        setTimeout(() => { trigger_cam_7.isSensor = false; }, 500);
                        events.off('room_7_camera_trigger');
                    });
                    break;
                case 'boss_gate_trigger':
                    const boss_gate_cam: MatterJS.BodyType = this.matter.add.rectangle(
                        x + (width / 2),
                        y + (height / 2),
                        width,
                        height,
                        {
                            isStatic: true,
                            isSensor: true,
                            label: 'boss_gate_camera_trigger'
                        }
                    );
                    bossGateBarrier = boss_gate_cam;
                    this.interactions.add('camera_trigger', boss_gate_cam);

                    events.once('boss_gate_camera_trigger', () => {
                        // Passou o gate -> busca SEMPRE o marker `near_boss_respawn`.
                        const marker = objectLayer?.objects.find(o => o.name === 'near_boss_respawn');
                        const mx = (marker?.x ?? (x + (width / 2))) + ((marker?.width ?? 0) / 2);
                        const my = (marker?.y ?? (y + (height / 2))) + ((marker?.height ?? 0) / 2);
                        localStorage.setItem('spawnPosition', JSON.stringify({ x: mx, y: my }));

                        worldController.showRoom('boss_gate');
                        this.gameCamera.setRoomBounds('boss_gate');

                        // Emite evento para lógica de entrar na área do boss (sem precisar tocar no marker)
                        events.emit('near_boss_respawn');

                        setTimeout(() => { boss_gate_cam.isSensor = false; }, 500);
                        events.off('boss_gate_camera_trigger');
                    });
                    break;
                case 'boss_room_trigger':
                    const trigger_cam_boss: MatterJS.BodyType = this.matter.add.rectangle(x + (width / 2), y + (height / 2), width, height, {
                        isStatic: true,
                        isSensor: true,
                        label: 'boss_room_trigger'
                    });
                    this.interactions.add('camera_trigger', trigger_cam_boss);
                    events.once('boss_room_trigger', () => {
                        worldController.showRoom('boss_room');
                        this.gameCamera.setRoomBounds('boss_room');
                        setTimeout(() => { trigger_cam_boss.isSensor = false; }, 500);
                        events.off('boss_room_trigger');

                        setTimeout(() => {
                            if (this.bossController) return;
                            const bossKind = getBossOverride() ?? Boss.GingerMad;
                            const boss = createBoss(bossKind, this, this.playerController!.getSprite());
                            this.bossController = boss;
                            this.bossController.setSpritePosition(x + 220, 548);
                            this.bossController.startIntro(y + 50);
                            events.emit(GameEvents.BossArrived, 0)

                            // Re-send boss attack markers now that the boss is alive and listening.
                            // (EventEmitter doesn't buffer events emitted earlier in `create()`.)
                            const bossAttacksLayer = worldController.getObjectLayer('boss_attacks');
                            const candyShowerMarkers = (bossAttacksLayer?.objects ?? [])
                                .filter(o => o.name === 'candy_shower')
                                .map(o => ({
                                    x: (o.x ?? 0) + ((o.width ?? 0) / 2),
                                    y: (o.y ?? 0) + ((o.height ?? 0) / 2),
                                    width: o.width ?? 0,
                                    height: o.height ?? 0,
                                }));

                            events.emit(GameEvents.BossSpecialAttack, {
                                boss: Boss.GingerMad,
                                attack: 'candy_shower',
                                phase: 'markers',
                                markers: candyShowerMarkers,
                            });

                            console.log("Boss activation");
                            this.waitBossLanding(boss);
                        }, 1800);
                    });
                    break;
                case 'weapon_energy':
                    const weapon_energy = this.matter.add.sprite(x + (width / 2), y + (height / 2), 'weapon_energy', undefined, {
                        isStatic: true,
                        isSensor: true
                    });
                    weapon_energy.setData('type', 'weapon_energy');
                    weapon_energy.setData('weapon_energy', WeaponEnergyChange.SmallEnergy);
                    break;
                case 'big_weapon_energy':
                    const big_weapon_energy = this.matter.add.sprite(x + (width / 2), y + (height / 2), 'weapon_energy', undefined, {
                        isStatic: true,
                        isSensor: true
                    });
                    big_weapon_energy.setScale(1.5);
                    big_weapon_energy.setData('type', 'weapon_energy');
                    big_weapon_energy.setData('weapon_energy', WeaponEnergyChange.BigEnergy);
                    break;
                case 'small_health':
                    const small_health = this.matter.add.sprite(x + (width / 2), y + (height / 2), 'small_health', undefined, {
                        isStatic: true,
                        isSensor: true
                    });
                    small_health.setData('type', 'small_health');
                    small_health.setData('health', HealthChange.SmallHealth);
                    break;
                case 'big_health':
                    const big_health = this.matter.add.sprite(x + (width / 2), y + (height / 2), 'big_health', undefined, {
                        isStatic: true,
                        isSensor: true
                    });
                    big_health.setData('type', 'big_health');
                    big_health.setData('health', HealthChange.BigHealth);
                    break;
                case 'life_tank':
                    const tankId = `${this.scene.key}:${object.id}`;
                    if (collectedItems.isCollected(tankId)) break;
                    const life_tank = this.matter.add.sprite(x + (width / 2), y + (height / 2), 'life_tank', undefined, {
                        isStatic: true,
                        isSensor: true
                    });
                    life_tank.setData('type', 'life_tank');
                    life_tank.setData('pickupId', tankId);
                    break;
                case 'ladder':
                    this.matter.add.rectangle(x + (width / 2), y + (height / 2), width, height, {
                        isStatic: true,
                        isSensor: true,
                        label: 'ladder'
                    });
                    break;
                case 'wall':
                    this.matter.add.rectangle(x + (width / 2), y + (height / 2), width, height, {
                        isStatic: true,
                    });
                    break;
                case 'spike':
                    const spike = this.matter.add.rectangle(x + (width / 2), y + (height / 2), width, height, {
                        isStatic: true,
                        isSensor: true,
                    });
                    this.obstacles.add('spike', spike);
                    break;
                case 'pit':
                    const pit = this.matter.add.rectangle(x + (width / 2), y + (height / 2), width, height, {
                        isStatic: true,
                        isSensor: true,
                    });
                    this.obstacles.add('pit', pit);
                    break;

            }
        });
    }

    private createBossDoors(worldController: WorldController) {
        const layer = worldController.getRoomLayers('boss_gate');
        this.bossDoors = [];
        if (!layer || !this.movementWorld) return;

        const doorColumns = [
            { tileX: 96, walkDistance: 72, holdUntilBoss: false },
            { tileX: 119, walkDistance: 72, holdUntilBoss: true },
        ];
        const firstRow = 40;
        const tileCount = 5;
        this.bossDoors = [];

        doorColumns.forEach(({ tileX, walkDistance, holdUntilBoss }) => {
            const tile = layer.getTileAt(tileX, firstRow);
            if (!tile) return;

            const door: BossDoorController = new BossDoorController(this, {
                layer,
                tileX,
                tileY: firstRow,
                tileCount,
                tileIndex: tile.index,
                tileSize: this.tile_size,
                direction: 1,
                onOpening: () => {
                    if (holdUntilBoss) this.fadeBossRoom(true, 2200);
                    this.doorCrossing = {
                        door,
                        walkToX: (tileX + 0.5) * this.tile_size + walkDistance,
                        holdUntilBoss,
                    };
                    this.playerController?.setScriptedInput({ right: true });
                },
            }, () => {
                const sprite = this.playerController?.getSprite();
                return sprite ? { x: sprite.x, y: sprite.y } : null;
            });

            this.bossDoors.push(door);
            this.movementWorld!.addDynamicSolidProvider(() => door.getSolids());
        });
    }

    // Forced walk through a door: the player stops past it and control returns
    // once the door is sealed (or, for the boss door, once the boss has spawned).
    private updateDoorCrossing() {
        const crossing = this.doorCrossing;
        const sprite = this.playerController?.getSprite();
        if (!crossing || !sprite) return;

        if (sprite.x >= crossing.walkToX) {
            this.playerController!.setScriptedInput({});
        }
        if (!crossing.holdUntilBoss && crossing.door.isSealed()) {
            this.releaseDoorCrossing();
        }
    }

    private releaseDoorCrossing() {
        this.doorCrossing = null;
        this.playerController?.setScriptedInput(null);
    }

    // Boss intro: wait for the landing, fill the boss bar one unit at a time,
    // then give control back to the player.
    private waitBossLanding(boss: BossController) {
        runBossIntro(this, boss, {
            prepare: (start) => this.fadeBossRoom(false, 1800, start),
            onFinish: () => this.releaseDoorCrossing(),
        });
    }

    // Dark overlay above the map/background (depth 0) and below the characters (depth 2).
    private fadeBossRoom(dark: boolean, duration: number, onComplete?: () => void) {
        if (!this.bossRoomShade) {
            this.bossRoomShade = this.add.rectangle(-50000, -50000, 100000, 100000, 0x000000, 1)
                .setOrigin(0, 0)
                .setAlpha(0)
                .setDepth(1);
        }
        this.tweens.add({
            targets: this.bossRoomShade,
            alpha: dark ? 0.8 : 0,
            duration,
            onComplete,
        });
    }

    private mountCameraSetup() {
        // e.g this means the coordinates from top left; 
        // For X, we say is starting at tile 0;
        // For Y, since we have 18 tiles, I start from 15 to sum with 18 from view
        // then my Y ends on the limit of room_1 (tile 33)

        this.gameCamera.setRoomCamera('room_1', 0, 16, 48, 14);
        this.gameCamera.setRoomCamera('room_2', 48, 12, 24, 22);
        this.gameCamera.setRoomCamera('room_3', 45, -5, 27, 10);
        this.gameCamera.setRoomCamera('room_4', 70, -5, 42, 10);
        this.gameCamera.setRoomCamera('room_5', 112, -5, 28, 39);
        this.gameCamera.setRoomCamera('room_6', 72, 15, 40, 19);
        this.gameCamera.setRoomCamera('room_7', 72, 34, 25, 18);
        this.gameCamera.setRoomCamera('boss_gate', 96, 34, 23, 18);
        this.gameCamera.setRoomCamera('boss_room', 119, 34, 23, 18);
    };

    update(time: number, delta: number): void {
        this.playerController?.update(time, delta);
        this.bossDoors.forEach(door => door.update());
        this.updateDoorCrossing();
        this.bossController?.update(time, delta);
    }
};
