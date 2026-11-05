import { MM6_BUTTONS, MM6Button, MM6InputEvent, MM6InputFrame } from './MM6InputFrame.js';

export default class MM6InputBuffer {
    private held: Record<MM6Button, boolean> = this.createButtonState();
    private pendingEvents: MM6InputEvent[] = [];

    setButtonState(button: MM6Button, isDown: boolean): void {
        if (this.held[button] === isDown) {
            return;
        }

        this.held[button] = isDown;
        this.pendingEvents.push({
            button,
            type: isDown ? 'pressed' : 'released',
        });
    }

    consumeFrame(): MM6InputFrame {
        const frame: MM6InputFrame = {
            held: { ...this.held },
            events: this.pendingEvents.splice(0),
        };

        return frame;
    }

    clearPendingEvents(): void {
        this.pendingEvents.length = 0;
    }

    reset(): void {
        this.held = this.createButtonState();
        this.clearPendingEvents();
    }

    private createButtonState(): Record<MM6Button, boolean> {
        return Object.fromEntries(MM6_BUTTONS.map(button => [button, false])) as Record<MM6Button, boolean>;
    }
}
