import { Tilemaps } from "phaser";
import PlayerController from "../../controllers/characters/playerController";
// EnemyController import removed: CandyLand currently has no enemies
import ObstaclesController from "../../controllers/obsctaclesController";
import Stages, { StageSlugs } from "../../utils/stages";
import { sharedInstance as events } from "../eventCentre";
import InteractionsController from "../../controllers/interactionsController";
import GingerMadController from "../../controllers/characters/bosses/gingerMadController";
import Boss from "../../utils/boss";
import GameEvents, { HealthChange, WeaponEnergyChange } from "../../utils/events";
import DefaultScene from "../defaultScene";
import CameraController from "../../controllers/cameraController";
import WorldController from "../../controllers/worldController";
import { createParallaxImage } from "../../utils/functions";
import { startAnimatedTilesOnLayer } from "../../utils/animatedTiles";
import { getAssetBaseUrl } from '../../utils/runtimeConfig';

export default class CandyLandStage extends DefaultScene {
    public playerController?: PlayerController;
    private bossController: any;
    private obstacles!: ObstaclesController;
    private interactions!: InteractionsController;
    // enemies array reserved for future enemies; currently unused in CandyLandStage
    // private enemies!: Array<EnemyController>;
    private tile_size = 16;
    private gameCamera: CameraController;

    constructor() {
        super(Stages.CandyLand);
        this.obstacles = new ObstaclesController();
        this.interactions = new InteractionsController();
        this.gameCamera = new CameraController();
    }

    init() {
        this.scene.launch('UI');
    }

    preload() {
        // Use runtime-configured base URL so Electron builds can use relative paths
        this.load.baseURL = getAssetBaseUrl();
        this.load.tilemapTiledJSON(StageSlugs.CandyLand, 'maps/candy_land/candy_land.json');
    }

    create() {
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

            this.mountCameraSetup();

            this.gameCamera.setRoomBounds('room_1');
            this.handleObjects(worldController);

  

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
                    this.playerController = new PlayerController(this, this.obstacles, this.interactions);
                    if (this.playerController.spawnPosition.x == 0 && this.playerController.spawnPosition.y == 0)
                        this.playerController.spawnPosition = { x, y };

                    this.playerController.setSpritePosition(this.playerController.spawnPosition.x, this.playerController.spawnPosition.y);
                    this.gameCamera.playerSpawnCamera(this.playerController.getSprite());
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
                            // Test Spawn: {"x":1405.83035,"y":711.99965}
                            let gingerMad = new GingerMadController(this, this.playerController!.getSprite());
                            // let gingerMad = new RudolphTheRedController(this, this.playerController!.getSprite());
                            // let gingerMad = new YetiController(this, this.playerController!.getSprite());
                            this.bossController = gingerMad;
                            this.bossController.setSpritePosition(x + 220, y + 50);
                            events.emit(GameEvents.BossArrived, 28)

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
                        }, 2000);
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
                    const life_tank = this.matter.add.sprite(x + (width / 2), y + (height / 2), 'life_tank', undefined, {
                        isStatic: true,
                        isSensor: true
                    });
                    life_tank.setData('type', 'life_tank');
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
        this.bossController?.update(time, delta);
    }
};
