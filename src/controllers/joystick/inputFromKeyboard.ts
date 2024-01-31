import InputKey from "./inputKey";

export default class InputFromKeyboard extends InputKey {
    private key: Phaser.Input.Keyboard.Key;

    constructor(key: Phaser.Input.Keyboard.Key) {
        super();
        this.key = key;
    }

    updateFromKey(): void {
        this.update(this.key.isDown);
    }
}