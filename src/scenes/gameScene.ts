import PlayerController, { Keys } from "../controllers/characters/playerController";
import ObstaclesController from "../controllers/obsctaclesController";
import MetController from "../controllers/enemies/metController";
import EnemyController from "../controllers/enemies/enemyController";

export default class GameScene extends Phaser.Scene {
    private playerController?: PlayerController;
    private obstacles!: ObstaclesController;
    private enemies!: Array<EnemyController>;


    constructor() {
        super({ key: 'TEST' })
    }

    init(data: any) {
        this.scene.launch('UI');
        this.enemies = [];
        this.obstacles = new ObstaclesController();

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.destroy();
        })
    }

    preload() {

    }

    create() {
        this.cameras.main.scrollY = -400;

        const map = this.make.tilemap({ key: 'candy_land', tileWidth: 16, tileHeight: 16 });
        const tileset = map.addTilesetImage('tiles_test', 'tiles_test');

        const objectLayer = map.getObjectLayer('Objects');
        const bg: Phaser.Tilemaps.TilemapLayer = map.createLayer('Background Scenario', 'tiles_test')
        const overlay: Phaser.Tilemaps.TilemapLayer = map.createLayer('Overlay', 'tiles_test')?.setDepth(10)
        const obstacles: Phaser.Tilemaps.TilemapLayer = map.createLayer('Obstacles', 'tiles_test')
        const ground: Phaser.Tilemaps.TilemapLayer = map.createLayer('Base', 'tiles_test')

        ground?.setCollisionByProperty({ collision: true });

        objectLayer?.objects.forEach(object => {
            const { x = 0, y = 0, name, width = 0, height = 0 } = object;
            switch (name) {
                case 'spawn_zone':
                    {
                        this.playerController = new PlayerController(this, this.obstacles);
                        this.playerController.setSpritePosition(x, y);

                        this.cameras.main.startFollow(this.playerController.getSprite(), true, 0.5, 0.5)
                        this.cameras.main.zoom = 3
                    }
                    break;
                case 'small_health':
                    const small_health = this.matter.add.sprite(x + (width / 2), y + (height / 2), 'small_health', undefined, {
                        isStatic: true,
                        isSensor: true
                    });
                    small_health.setData('type', 'small_health');
                    small_health.setData('health', 10);
                    break;
                case 'big_health':
                    const big_health = this.matter.add.sprite(x + (width / 2), y + (height / 2), 'big_health', undefined, {
                        isStatic: true,
                        isSensor: true
                    });
                    big_health.setData('type', 'big_health');
                    big_health.setData('health', 50);
                    break;
                case 'milk_tank':
                    const milk_tank = this.matter.add.sprite(x + (width / 2), y + (height / 2), 'milk_tank', undefined, {
                        isStatic: true,
                        isSensor: true
                    });
                    milk_tank.setData('type', 'milk_tank');
                    break;
                case 'spike':
                    const spike = this.matter.add.rectangle(x + (width / 2), y + (height / 2), width, height, {
                        isStatic: true,
                    })
                    this.obstacles.add('spike', spike);
                    break;
                case 'pit':
                    const pit = this.matter.add.rectangle(x + (width / 2), y + (height / 2), width, height, {
                        isStatic: true,
                        isSensor: true,
                    })
                    this.obstacles.add('pit', pit);
                    break;
                case 'met_enemy':
                    const met = this.matter.add.sprite(x, y, 'met_atlas', 'idle').setFixedRotation();
                    this.enemies.push(new MetController(this, met))
                    this.obstacles.add('met_enemy', met.body as MatterJS.BodyType);
                    break;
                default:
                    break;
            }
        })


        this.matter.world.convertTilemapLayer(ground);
    }

    destroy() {
        this.scene.stop('UI');
        this.enemies.forEach(enemy => enemy.destroy())
    }

    update(time: number, delta: number): void {
        this.playerController?.update(delta);
        this.enemies.forEach(enemy => {
            enemy.update(delta);
        });
    }




};
