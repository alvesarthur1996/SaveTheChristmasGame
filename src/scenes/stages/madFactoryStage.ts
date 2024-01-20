import PlayerController from "../../controllers/characters/playerController";
import EnemyController from "../../controllers/enemies/enemyController";
import ObstaclesController from "../../controllers/obsctaclesController";
import { sharedInstance as events } from "../eventCentre";

export default class MadFactoryStage extends Phaser.Scene {
    private playerController?: PlayerController;
    private obstacles!: ObstaclesController;
    private enemies!: Array<EnemyController>;
    private room_cameras: any = {};
    constructor() {
        super('MadFactory');
    }

    init() {
        this.scene.launch('UI');
        this.enemies = [];
        this.obstacles = new ObstaclesController();
    }

    preload() {
    }

    create() {
        const map = this.make.tilemap({ key: 'mad_factory', tileWidth: 16, tileHeight: 16 });
        map.addTilesetImage('megacommando', 'megacommando');
        const objectLayer = map.getObjectLayer('objects');

        const Background: Phaser.Tilemaps.TilemapLayer = map.createLayer('background', 'megacommando')?.setVisible(true);
        const Room_1_bg: Phaser.Tilemaps.TilemapLayer = map.createLayer('room_1_bg', 'megacommando');
        const Room_1: Phaser.Tilemaps.TilemapLayer = map.createLayer('room_1', 'megacommando');
        const Room_2: Phaser.Tilemaps.TilemapLayer = map.createLayer('room_2', 'megacommando')?.setVisible(true);
        const Room_3: Phaser.Tilemaps.TilemapLayer = map.createLayer('room_3', 'megacommando')?.setVisible(false);

        this.room_cameras.room_1 = {
            x: Room_1.x,
            y: Room_1.y,
            width: Room_1.width,
            height: Room_1.height
        }
        this.room_cameras.room_2 = {
            x: Room_1.x,
            y: Room_2.y,
            width: Room_2.width * .575,
            height: Room_2.height * 0.65
        }
        this.room_cameras.room_3 = {
            x: Room_3.x,
            y: Room_3.y,
            width: Room_3.width,
            height: Room_3.height * 0.65
        }


        this.cameras.main.setBounds(this.room_cameras.room_1.x, this.room_cameras.room_1.y, this.room_cameras.room_1.width, this.room_cameras.room_1.height);

        Room_1!.setCollisionByProperty({ collision: true });
        Room_2!.setCollisionByProperty({ collision: true });
        Room_3!.setCollisionByProperty({ collision: true });


        objectLayer?.objects.forEach(object => {
            const { x = 0, y = 0, name, width = 0, height = 0 } = object;
            console.log('2')

            switch (name) {
                case 'spawn_zone':
                    this.playerController = new PlayerController(this, this.obstacles);
                    this.playerController.setSpritePosition(x, y);
                    this.cameras.main.startFollow(this.playerController.getSprite(), true, 0.5, 0.5);
                    this.cameras.main.zoom = 2.5
                    break;
                case 'room_2_trigger':
                    const trigger_cam: MatterJS.BodyType = this.matter.add.rectangle(x + (width / 2), y + (height / 2), width, height, {
                        isStatic: true,
                        isSensor: true,
                        label: 'room_2_camera_trigger'
                    });
                    this.obstacles.add('camera_trigger', trigger_cam);
                    events.once('room_2_camera_trigger', () => {
                        Room_2.setVisible(true);
                        this.cameras.main.setBounds(this.room_cameras.room_2.x, this.room_cameras.room_2.y, this.room_cameras.room_2.width, this.room_cameras.room_2.height);
                        events.off('room_2_camera_trigger');
                    });
                    break;
                case 'room_3_trigger':
                    const trigger_cam_3: MatterJS.BodyType = this.matter.add.rectangle(x + (width / 2), y + (height / 2), width, height, {
                        isStatic: true,
                        isSensor: true,
                        label: 'room_3_camera_trigger',
                    });
                    this.obstacles.add('camera_trigger', trigger_cam_3);
                    events.once('room_3_camera_trigger', () => {
                        Room_3.setVisible(true);
                        this.cameras.main.setBounds(x, this.room_cameras.room_3.y, this.room_cameras.room_3.width, this.room_cameras.room_3.height);
                        events.off('room_3_camera_trigger');
                    });
                    break;
                case 'wall':
                    this.matter.add.rectangle(x + (width / 2), y + (height / 2), width, height, {
                        isStatic: true,
                    });
                    break;
                case 'ladder':
                    this.matter.add.rectangle(x + (width / 2), y + (height / 2), width, height, {
                        isStatic: true,
                        isSensor: true,
                        label: 'ladder'
                    });
                    break;
                case 'lethal':
                    const lethal = this.matter.add.rectangle(x + (width / 2), y + (height / 2), width, height, {
                        isStatic: true,
                        isSensor: true,
                    });
                    this.obstacles.add('lethal', lethal);
                    break;

            }
        });

        this.matter.world.convertTilemapLayer(Room_1);
        this.matter.world.convertTilemapLayer(Room_2);
        this.matter.world.convertTilemapLayer(Room_3);
    }

    update(time: number, delta: number): void {
        this.playerController?.update(delta);
    }
};
