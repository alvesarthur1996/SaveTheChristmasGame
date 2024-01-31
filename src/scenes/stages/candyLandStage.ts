import { Tilemaps } from "phaser";
import PlayerController from "../../controllers/characters/playerController";
import EnemyController from "../../controllers/enemies/enemyController";
import ObstaclesController from "../../controllers/obsctaclesController";
import Stages from "../../utils/stages";
import { sharedInstance as events } from "../eventCentre";
import InteractionsController from "../../controllers/interactionsController";
import GingerMadController from "../../controllers/characters/bosses/gingerMadController";
import { HealthChange } from "../../utils/events";

export default class CandyLandStage extends Phaser.Scene {
    private playerController?: PlayerController;
    private bossController: any;
    private obstacles!: ObstaclesController;
    private interactions!: InteractionsController;
    private enemies!: Array<EnemyController>;
    private tile_size = 16;
    private room_cameras: any = {};
    private stage: any = {};
    constructor() {
        super(Stages.CandyLand);
        this.enemies = [];
        this.obstacles = new ObstaclesController();
        this.interactions = new InteractionsController();
    }

    init() {
        this.scene.launch('UI');
    }

    preload() {
        this.load.baseURL = 'http://localhost:8080/static/'
        this.load.tilemapTiledJSON('candy_land', 'maps/candy_land/candy_land.json');
        this.load.image('bg', 'maps/candy_land/background.jpeg')
    }

    create() {
        this.sound.play('candy_land_stage', { loop: true, volume: 0.45 });
        let sound = this.sound.get('candy_land_stage');
        try {
            const map = this.mountMap();
            const objectLayer: Tilemaps.ObjectLayer | null = map.getObjectLayer('objects');

            map.createLayer('background', ['tileset_candy', 'other_candy_blocks', 'tiles_test', 'new_candy_options'])?.setVisible(true);
            this.stage.room_1 = map.createLayer('room_1', ['tileset_candy', 'other_candy_blocks', 'tiles_test'])?.setVisible(true);
            this.stage.room_2 = map.createLayer('room_2', ['tileset_candy', 'other_candy_blocks', 'tiles_test', 'new_candy_options'])?.setVisible(true);
            this.stage.room_3 = map.createLayer('room_3', ['tileset_candy', 'other_candy_blocks', 'tiles_test', 'new_candy_options'])?.setVisible(true);
            this.stage.room_4 = map.createLayer('room_4', ['tileset_candy', 'other_candy_blocks', 'tiles_test', 'new_candy_options']);
            this.stage.room_5 = map.createLayer('room_5', ['tileset_candy', 'other_candy_blocks', 'tiles_test', 'new_candy_options'])?.setVisible(true);
            this.stage.room_6 = map.createLayer('room_6', ['tileset_candy', 'other_candy_blocks', 'tiles_test', 'new_candy_options'])?.setVisible(true);
            this.stage.boss = map.createLayer('boss_room', ['tileset_candy', 'other_candy_blocks', 'tiles_test', 'new_candy_options'])?.setVisible(true);

            this.stage.room_1.setCollisionByProperty({ collision: true });
            this.stage.room_2.setCollisionByProperty({ collision: true });
            this.stage.room_3!.setCollisionByProperty({ collision: true });
            this.stage.room_4!.setCollisionByProperty({ collision: true });
            this.stage.room_5!.setCollisionByProperty({ collision: true });
            this.stage.room_6!.setCollisionByProperty({ collision: true });
            this.stage.boss!.setCollisionByProperty({ collision: true });
            this.mountCameraSetup();

            this.cameras.main.setBounds(this.room_cameras.room_1.x, this.room_cameras.room_1.y, this.room_cameras.room_1.width, this.room_cameras.room_1.height);
            this.handleObjects(objectLayer);

            this.matter.world.convertTilemapLayer(this.stage.room_1)
            this.matter.world.convertTilemapLayer(this.stage.room_2)
            this.matter.world.convertTilemapLayer(this.stage.room_3)
            this.matter.world.convertTilemapLayer(this.stage.room_4);
            this.matter.world.convertTilemapLayer(this.stage.room_5);
            this.matter.world.convertTilemapLayer(this.stage.room_6);
            this.matter.world.convertTilemapLayer(this.stage.boss);

            // events.once('boss_arrived', () => {
            events.once('room_boss_camera_trigger', () => {
                sound.destroy();
                this.sound.play('boss_fight', { loop: true, volume: 0.45 });
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
    private mountMap(): Tilemaps.Tilemap {
        const map = this.make.tilemap({ key: 'candy_land', tileWidth: 16, tileHeight: 16 });
        map.addTilesetImage('tileset_candy', 'tileset_candy');
        map.addTilesetImage('tiles_test', 'tiles_test');
        map.addTilesetImage('other_candy_blocks', 'other_candy_blocks');
        map.addTilesetImage('new_candy_options', 'new_candy_options');
        return map;
    }

    private handleObjects(objectLayer: Tilemaps.ObjectLayer | null) {
        objectLayer?.objects.forEach(object => {
            const { x = 0, y = 0, name, width = 0, height = 0 } = object;

            switch (name) {
                case 'spawn_zone':
                    this.playerController = new PlayerController(this, this.obstacles, this.interactions);
                    if (this.playerController.spawnPosition.x == 0 && this.playerController.spawnPosition.y == 0)
                        this.playerController.spawnPosition = { x, y };

                    this.playerController.setSpritePosition(this.playerController.spawnPosition.x, this.playerController.spawnPosition.y);
                    this.cameras.main.startFollow(this.playerController.getSprite(), true, 0.5, 0.5);
                    this.cameras.main.zoom = 2.1
                    break;
                case 'spawn_zone_2':
                case 'boss_spawn':
                    const new_spawn: MatterJS.BodyType = this.matter.add.rectangle(x + (width / 2), y + (height / 2), width, height, {
                        isStatic: true,
                        isSensor: true,
                    });
                    this.interactions.add('new_spawn', new_spawn);
                    break;
                case 'room_2_trigger':
                    const trigger_cam: MatterJS.BodyType = this.matter.add.rectangle(x + (width / 2), y + (height / 2), width, height, {
                        isStatic: true,
                        isSensor: true,
                        label: 'room_2_camera_trigger'
                    });
                    this.interactions.add('camera_trigger', trigger_cam);
                    events.on('room_2_camera_trigger', () => {
                        this.stage.room_2!.setVisible(true);
                        this.cameras.main.setBounds(this.room_cameras.room_2.x, this.room_cameras.room_2.y, this.room_cameras.room_2.width, this.room_cameras.room_2.height);
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
                        this.stage.room_3!.setVisible(true);
                        this.cameras.main.setBounds(this.room_cameras.room_3.x, this.room_cameras.room_3.y, this.room_cameras.room_3.width, this.room_cameras.room_3.height);
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
                        this.stage.room_3!.setVisible(true);
                        this.cameras.main.setBounds(this.room_cameras.room_4.x, this.room_cameras.room_4.y, this.room_cameras.room_4.width, this.room_cameras.room_4.height);
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
                        this.stage.room_5!.setVisible(true);
                        this.cameras.main.setBounds(this.room_cameras.room_5.x, this.room_cameras.room_5.y, this.room_cameras.room_5.width, this.room_cameras.room_5.height);
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
                        this.stage.room_6!.setVisible(true);
                        this.cameras.main.setBounds(this.room_cameras.room_6.x, this.room_cameras.room_6.y, this.room_cameras.room_6.width, this.room_cameras.room_6.height);
                        setTimeout(() => { trigger_cam_6.isSensor = false; }, 500);
                        events.off('room_6_camera_trigger');
                    });
                    break;
                case 'boss_room':
                    const trigger_cam_boss: MatterJS.BodyType = this.matter.add.rectangle(x + (width / 2), y + (height / 2), width, height, {
                        isStatic: true,
                        isSensor: true,
                        label: 'room_boss_camera_trigger'
                    });
                    this.interactions.add('camera_trigger', trigger_cam_boss);
                    events.once('room_boss_camera_trigger', () => {
                        this.stage.boss!.setVisible(true);
                        this.cameras.main.setBounds(this.room_cameras.boss.x, this.room_cameras.boss.y, this.room_cameras.boss.width, this.room_cameras.boss.height);
                        setTimeout(() => { trigger_cam_boss.isSensor = false; }, 500);
                        events.off('room_boss_camera_trigger');
                        this.stage.room_1.setVisible(false);
                        this.stage.room_2.setVisible(false);
                        this.stage.room_3.setVisible(false);
                        this.stage.room_4.setVisible(false);
                        this.stage.room_6.setVisible(false);

                        setTimeout(() => {
                            if (this.bossController) return;
                            let gingerMad = new GingerMadController(this, this.playerController!.getSprite());
                            // let gingerMad = new RudolphTheRedController(this, this.playerController!.getSprite());
                            this.bossController = gingerMad;
                            this.bossController.setSpritePosition(x + 220, y + 50);
                            events.emit('boss_arrived', 28)
                            console.log("Boss activation");
                        }, 2000);
                    });
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
        this.room_cameras.room_1 = {
            x: 0 * this.tile_size,
            y: 14 * this.tile_size,
            width: 48 * this.tile_size,
            height: 14 * this.tile_size
        };
        this.room_cameras.room_2 = {
            x: 48 * this.tile_size,
            y: 11 * this.tile_size,
            width: 24 * this.tile_size,
            height: 22 * this.tile_size
        };
        this.room_cameras.room_3 = {
            x: 45 * this.tile_size,
            y: -5 * this.tile_size,
            width: 27 * this.tile_size,
            height: 40 * this.tile_size
        };
        this.room_cameras.room_4 = {
            x: 70 * this.tile_size,
            y: -4 * this.tile_size,
            width: 34 * this.tile_size,
            height: 32 * this.tile_size
        };
        this.room_cameras.room_5 = {
            x: 73 * this.tile_size,
            y: 27 * this.tile_size,
            width: 31 * this.tile_size,
            height: 21 * this.tile_size
        };
        this.room_cameras.room_6 = {
            x: 15 * this.tile_size,
            y: 35 * this.tile_size,
            width: 97 * this.tile_size,
            height: 25 * this.tile_size
        };
        this.room_cameras.boss = {
            x: 88 * this.tile_size,
            y: 40 * this.tile_size,
            width: 22 * this.tile_size,
            height: 16 * this.tile_size
        };
    };

    update(time: number, delta: number): void {
        this.playerController?.update(time, delta);
        this.bossController?.update(time, delta);
    }
};
