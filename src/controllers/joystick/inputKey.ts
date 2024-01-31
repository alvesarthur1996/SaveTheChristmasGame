export default class InputKey {
    protected down: boolean;
    protected justDown: boolean;
    
    constructor() {
        this.down = false;
        this.justDown = false;
    }

    update(down: boolean): void {
        let justDown = down && !this.down;
        this.updateInternal(down, justDown);
    }

    protected updateInternal(down: boolean, justDown: boolean): void {
        this.justDown = justDown;
        this.down = down;
    }

    isDown(): boolean {
        return this.down;
    }

    isJustDown(): boolean {
        return this.justDown;
    }
}