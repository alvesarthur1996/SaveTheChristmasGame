export default class InputHandler {
    // The any in the dictionary signature is because 
    // Phaser.Input.Keyboard.KeyCodes is a namespace and cannot be assigned as
    // a type (as far as I know).
    private mappings: any = {};

    constructor(scene: Phaser.Scene, inputMappings: { [key: string]: any }) {
        const allKeys = [];
        for (const key in inputMappings) {
            let vals = [];

            for (let i = 0; i < inputMappings[key].length; i++) {
                allKeys.push(inputMappings[key][i].keyCode);
                vals.push(inputMappings[key][i]);
            }
            this.mappings[key] = vals;
        }
        scene.input.keyboard?.addKeys(this.mappings);
    }

    isJustDown(key: string): boolean {
        for (let i = 0; i < this.mappings[key].length; i++) {
            console.log();
            if (this.mappings[key][i].isJustDown()){
                return true;
            }
        }
        return false;
    }

    isDown(key: string): boolean {
        for (let i = 0; i < this.mappings[key].length; i++) {
            if (this.mappings[key][i].isDown()) return true;
        }
        return false;
    }
}