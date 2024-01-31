import InputFromKeyboard from "./inputFromKeyboard";
import InputKey from "./inputKey";

export default class KeyboardProvider {
    scene: Phaser.Scene;
    keys: Map<any, InputFromKeyboard>;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.keys = new Map();
    }

    update(now: number, delta: number) {
        this.keys.forEach((value, key) => {
            value.updateFromKey();
        })
    }

    // The any in the signature is because Phaser.Input.Keyboard.KeyCodes is 
    // a namespace and cannot be assigned as a type (as far as I know).
    getInput(input: any): InputKey {
        if (!this.keys.has(input)) {
            const phaserKey = this.scene.input.keyboard?.addKey(input);
            const inputKey: InputFromKeyboard = new InputFromKeyboard(phaserKey!);

            const justDown = Phaser.Input.Keyboard.JustDown(phaserKey!);
            const down = phaserKey!.isDown;
            // Populate key isDown.
            if (down) {
                inputKey.update(down);
            }
            // Clear out justDown if it isn't just down.
            if (!justDown) {
                inputKey.update(down);
            }

            this.keys.set(input, inputKey);
        }
        const value = this.keys.get(input);
        return value!;
    }
}