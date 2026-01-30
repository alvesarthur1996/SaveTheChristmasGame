
interface RoomCamera {
    room_id: string,
    x: integer,
    y: integer,
    width: integer,
    height: integer
}


export default class CameraController {
    private room_cameras: RoomCamera[] = [];
    private tile_size: integer = 16;
    private sceneCamera!: Phaser.Cameras.Scene2D.Camera;

    constructor() {
    }

    
    public setSceneCamera(camera: Phaser.Cameras.Scene2D.Camera): void {
        this.sceneCamera = camera;
    }

    public getRoomCamera(room_id: string): RoomCamera | null {
        const camera = this.room_cameras.find(cam => cam.room_id === room_id);
        return camera || null;
    }

    public setRoomCamera(room_id: string, x: integer, y: integer, width: integer, height: integer): void {
        const existingCameraIndex = this.room_cameras.findIndex(cam => cam.room_id === room_id);
        const newCamera: RoomCamera = {
            room_id,
            x: (x * this.tile_size),
            y: (y * this.tile_size),
            width: (width * this.tile_size),
            height: (height * this.tile_size)
        };

        if (existingCameraIndex !== -1) {
            this.room_cameras[existingCameraIndex] = newCamera;
        } else {
            this.room_cameras.push(newCamera);
        }
    }

    public setTileSize(size: integer): void {
        this.tile_size = size;
    }

    public setRoomBounds(room_id: string): void {
        const camera = this.getRoomCamera(room_id);

        if (camera) {
            this.sceneCamera.setBounds(camera.x, camera.y, camera.width, camera.height);
        }
    }

    public playerSpawnCamera(playerSprite: Phaser.Physics.Matter.Sprite): void {
        this.sceneCamera.startFollow(playerSprite, true, 0.5, 0.5);
        this.sceneCamera.zoom = 2.1
    }
}