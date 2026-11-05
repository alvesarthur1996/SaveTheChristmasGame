import MM6FixedStepLoop from '../engine/core/MM6FixedStepLoop.js';
import type MM6CollisionWorld from '../engine/collision/MM6CollisionWorld.js';
import MM6InputBuffer from '../engine/input/MM6InputBuffer.js';
import { MM6_BUTTONS } from '../engine/input/MM6InputFrame.js';
import type { MM6Button } from '../engine/input/MM6InputFrame.js';
import MM6PlayerSimulation, {
    DEFAULT_MM6_PLAYER_CONFIG,
} from '../entities/player/MM6PlayerSimulation.js';
import type { MM6PlayerSimulationConfig, MM6PlayerState } from '../entities/player/MM6PlayerSimulation.js';

export interface MM6PlayerMovementOptions {
    collisionWorld: MM6CollisionWorld;
    initialPosition: { x: number; y: number };
    config?: MM6PlayerSimulationConfig;
    regionMaxX?: number;
}

export type MM6PlayerMovementSetup = Omit<MM6PlayerMovementOptions, 'initialPosition'>;

export interface MM6PlayerMovementUpdate {
    state: Readonly<MM6PlayerState>;
    renderPosition: { x: number; y: number };
    suspended: boolean;
    exitedRegion: boolean;
}

export default class MM6PlayerMovementAdapter {
    private readonly simulation: MM6PlayerSimulation;
    private readonly inputBuffer = new MM6InputBuffer();
    private readonly fixedStepLoop = new MM6FixedStepLoop();
    private readonly config: MM6PlayerSimulationConfig;
    private previousPosition: { x: number; y: number };

    constructor(private readonly options: MM6PlayerMovementOptions) {
        this.config = options.config ?? {
            ...DEFAULT_MM6_PLAYER_CONFIG,
        };
        this.simulation = new MM6PlayerSimulation(
            options.collisionWorld,
            options.initialPosition,
            this.config,
        );
        this.previousPosition = { ...options.initialPosition };
    }

    update(
        deltaMs: number,
        heldButtons: Readonly<Record<MM6Button, boolean>>,
    ): MM6PlayerMovementUpdate {
        for (const button of MM6_BUTTONS) {
            this.inputBuffer.setButtonState(button, heldButtons[button]);
        }

        const loopResult = this.fixedStepLoop.advance(deltaMs, () => {
            const before = this.simulation.getState();
            this.previousPosition = { x: before.x, y: before.y };
            this.simulation.step(this.inputBuffer.consumeFrame());
        });

        if (loopResult.suspended) {
            this.inputBuffer.clearPendingEvents();
        }

        const state = this.simulation.getState();
        const alpha = this.fixedStepLoop.getAlpha();
        return {
            state,
            renderPosition: {
                x: this.previousPosition.x + (state.x - this.previousPosition.x) * alpha,
                y: this.previousPosition.y + (state.y - this.previousPosition.y) * alpha,
            },
            suspended: loopResult.suspended,
            exitedRegion: this.options.regionMaxX !== undefined
                && state.x + this.config.hitboxWidth / 2 >= this.options.regionMaxX,
        };
    }

    setPosition(x: number, y: number): void {
        this.simulation.setPosition(x, y);
        this.previousPosition = { x, y };
    }
}
