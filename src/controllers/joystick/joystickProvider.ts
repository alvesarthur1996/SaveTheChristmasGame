import InputKey from "./inputKey";

export enum GamepadInput {
    Left,
    Right,
    Up,
    Down,
    LB,
    RB,
    A,
    B,
    X,
    Y,
    Start,
    Select
}

export default class JoystickProvider {

    scene: Phaser.Scene;
    buttons!: Map<GamepadInput, InputKey>;
    gamePadNumber: number;
    private connected!: boolean;

    constructor(scene: Phaser.Scene, gamePadNumber: number) {
        // super();
        this.scene = scene;

        this.gamePadNumber = gamePadNumber;

        this.buttons = new Map();
        this.buttons.set(GamepadInput.Left, new InputKey());
        this.buttons.set(GamepadInput.Right, new InputKey());
        this.buttons.set(GamepadInput.Up, new InputKey());
        this.buttons.set(GamepadInput.Down, new InputKey());
        this.buttons.set(GamepadInput.LB, new InputKey());
        this.buttons.set(GamepadInput.RB, new InputKey());
        this.buttons.set(GamepadInput.A, new InputKey());
        this.buttons.set(GamepadInput.B, new InputKey());
        this.buttons.set(GamepadInput.X, new InputKey());
        this.buttons.set(GamepadInput.Y, new InputKey());
        this.buttons.set(GamepadInput.Start, new InputKey());
        this.buttons.set(GamepadInput.Select, new InputKey());
    }

    protected updateConnect() {
        this.connected = true;
    }

    // Disconnecting a controller should zero out all inputs, so no phantom 
    // inputs exist in perpetuity.
    updateDisconnect() {
        if (!this.connected) {
            return;
        }
        this.connected = false;
        this.buttons.forEach((value, key) => {
            value.update(false);
        })
    }

    private _getGamepad() {
        if (!this.scene.input.gamepad || this.gamePadNumber >= this.scene.input.gamepad.gamepads.length) {
            this.updateDisconnect();
            return;
        }
        let gamePad = this.scene.input.gamepad.gamepads[this.gamePadNumber];
        if (!gamePad) {
            this.updateDisconnect();
            return;
        }

        this.updateConnect();
        return gamePad;
    }

    update(now: number, delta: number) {
        let gamePad = this._getGamepad();
        if (!gamePad) return;

        this._updateInput(GamepadInput.Left, gamePad.left);
        this._updateInput(GamepadInput.Right, gamePad.right);
        this._updateInput(GamepadInput.Up, gamePad.up);
        this._updateInput(GamepadInput.Down, gamePad.down);
        this._updateInput(GamepadInput.LB, gamePad.L1 > 0.9);
        this._updateInput(GamepadInput.RB, gamePad.R1 > 0.9);
        this._updateInput(GamepadInput.A, gamePad.A);
        this._updateInput(GamepadInput.B, gamePad.B);
        this._updateInput(GamepadInput.X, gamePad.X);
        this._updateInput(GamepadInput.Y, gamePad.Y);
        this._updateInput(GamepadInput.Start, gamePad.isButtonDown(9));
        this._updateInput(GamepadInput.Select, gamePad.isButtonDown(8));
    }

    private _updateInput(input: GamepadInput, value: boolean) {
        this.buttons.get(input)?.update(value);
    }

    getInput(input: GamepadInput): InputKey {
        return this.buttons.get(input)!;
    }
}