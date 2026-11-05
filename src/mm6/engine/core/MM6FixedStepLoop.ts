export interface MM6FixedStepResult {
    steps: number;
    suspended: boolean;
}

const STEP_EPSILON_MS = 0.0000001;

export default class MM6FixedStepLoop {
    private accumulatorMs = 0;

    constructor(
        private readonly stepMs = 1000 / 60,
        private readonly maxFrameDeltaMs = 250,
        private readonly maxStepsPerFrame = 5,
    ) {
        if (!Number.isFinite(stepMs) || stepMs <= 0) {
            throw new RangeError('Simulation step must be a positive finite number.');
        }
        if (!Number.isFinite(maxFrameDeltaMs) || maxFrameDeltaMs < stepMs) {
            throw new RangeError('Maximum frame delta must be finite and at least one simulation step.');
        }
        if (!Number.isInteger(maxStepsPerFrame) || maxStepsPerFrame < 1) {
            throw new RangeError('Maximum steps per frame must be a positive integer.');
        }
    }

    advance(deltaMs: number, step: () => void): MM6FixedStepResult {
        if (!Number.isFinite(deltaMs) || deltaMs < 0) {
            throw new RangeError('Frame delta must be a non-negative finite number.');
        }

        if (deltaMs > this.maxFrameDeltaMs) {
            this.accumulatorMs = 0;
            return { steps: 0, suspended: true };
        }

        this.accumulatorMs += deltaMs;
        let steps = 0;

        while (
            this.accumulatorMs + STEP_EPSILON_MS >= this.stepMs
            && steps < this.maxStepsPerFrame
        ) {
            step();
            this.accumulatorMs = Math.max(0, this.accumulatorMs - this.stepMs);
            steps++;
        }

        if (this.accumulatorMs + STEP_EPSILON_MS >= this.stepMs) {
            // Drop stale whole steps instead of carrying input lag into later frames.
            this.accumulatorMs %= this.stepMs;
        }

        return { steps, suspended: false };
    }

    getAlpha(): number {
        return Math.min(1, this.accumulatorMs / this.stepMs);
    }
}
