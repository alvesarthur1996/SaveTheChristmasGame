import type MM6CollisionWorld from '../../engine/collision/MM6CollisionWorld.js';
import type { MM6SolidRectangle } from '../../engine/collision/MM6CollisionWorld.js';
import type { MM6InputFrame } from '../../engine/input/MM6InputFrame.js';

export type MM6PlayerMovementState = 'idle' | 'walking' | 'jumping' | 'falling' | 'climbing';

export interface MM6PlayerSimulationConfig {
    tileSize: number;
    hitboxWidth: number;
    hitboxHeight: number;
    horizontalSpeed: number;
    jumpVelocity: number;
    jumpHoldSteps: number;
    gravity: number;
    maxFallSpeed: number;
    climbSpeed?: number;
}

export interface MM6PlayerState {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    grounded: boolean;
    facing: -1 | 1;
    movement: MM6PlayerMovementState;
}

const COLLISION_EPSILON = 0.0001;
const GROUND_PROBE_DISTANCE = 0.01;
const LADDER_TOP_EXIT_MARGIN = 2;
const LADDER_TOP_EXIT_LIFT = 4;
const LADDER_TOP_ENTRY_DEPTH = 4;
const LADDER_TOP_ENTRY_TOLERANCE = 3;
const DEFAULT_CLIMB_SPEED = 1.05;

export const DEFAULT_MM6_PLAYER_CONFIG: MM6PlayerSimulationConfig = {
    // Baseline-derived starting values, not verified Mega Man 6 constants.
    tileSize: 16,
    hitboxWidth: 19.2,
    hitboxHeight: 22.4,
    horizontalSpeed: 1.35,
    jumpVelocity: -4.2,
    jumpHoldSteps: 11,
    gravity: 0.34,
    maxFallSpeed: 5,
};

export default class MM6PlayerSimulation {
    private state: MM6PlayerState;
    private canHoldJump = false;
    private jumpHoldRemaining = 0;
    private climbing = false;
    private ladderLocked = false;
    private hitstunSteps = 0;
    private knockbackVelocityX = 0;

    applyKnockback(velocityX: number, velocityY: number, steps: number): void {
        this.climbing = false;
        this.ladderLocked = true;
        this.canHoldJump = false;
        this.hitstunSteps = steps;
        this.knockbackVelocityX = velocityX;
        this.state.velocityY = velocityY;
        this.state.grounded = false;
    }

    constructor(
        private readonly world: MM6CollisionWorld,
        initialPosition: { x: number; y: number },
        private readonly config: MM6PlayerSimulationConfig = DEFAULT_MM6_PLAYER_CONFIG,
    ) {
        if (![initialPosition.x, initialPosition.y].every(Number.isFinite)) {
            throw new RangeError('Initial player position must be finite.');
        }
        if (![config.tileSize, config.hitboxWidth, config.hitboxHeight, config.horizontalSpeed,
            config.jumpVelocity, config.jumpHoldSteps,
            config.gravity, config.maxFallSpeed].every(Number.isFinite)
            || config.tileSize <= 0
            || config.hitboxWidth <= 0
            || config.hitboxHeight <= 0
            || config.horizontalSpeed < 0
            || config.jumpVelocity >= 0
            || config.jumpHoldSteps < 0
            || config.gravity < 0
            || config.maxFallSpeed < 0) {
            throw new RangeError('Player movement configuration contains invalid values.');
        }

        this.state = {
            ...initialPosition,
            velocityX: 0,
            velocityY: 0,
            grounded: false,
            facing: 1,
            movement: 'falling',
        };
    }

    getState(): Readonly<MM6PlayerState> {
        return { ...this.state };
    }

    setPosition(x: number, y: number): void {
        this.hitstunSteps = 0;
        if (![x, y].every(Number.isFinite)) {
            throw new RangeError('Player position must be finite.');
        }

        this.state = {
            ...this.state,
            x,
            y,
            velocityX: 0,
            velocityY: 0,
            grounded: false,
            movement: 'falling',
        };
        this.canHoldJump = false;
        this.climbing = false;
        this.ladderLocked = false;
    }

    step(input: MM6InputFrame): Readonly<MM6PlayerState> {
        const stunned = this.hitstunSteps > 0;
        if (stunned) {
            this.hitstunSteps--;
            input = {
                held: { ...input.held, left: false, right: false, up: false, down: false, jump: false },
                events: [],
            };
        }

        if (!input.held.up && !input.held.down) {
            this.ladderLocked = false;
        }

        if (!this.climbing && !this.ladderLocked
            && (input.held.up || (input.held.down && !this.state.grounded))) {
            const ladder = this.findLadder();
            if (ladder) {
                this.climbing = true;
                this.state.x = ladder.x + ladder.width / 2;
                this.state.velocityX = 0;
                this.state.velocityY = 0;
                this.state.grounded = false;
                this.canHoldJump = false;
            }
        }

        if (!this.climbing && !this.ladderLocked && input.held.down && this.state.grounded) {
            const ladder = this.findLadderBelowFeet();
            if (ladder) {
                this.climbing = true;
                this.state.x = ladder.x + ladder.width / 2;
                this.state.y = ladder.y - this.config.hitboxHeight / 2 + LADDER_TOP_ENTRY_DEPTH;
                this.state.velocityX = 0;
                this.state.velocityY = 0;
                this.state.grounded = false;
                this.canHoldJump = false;
            }
        }

        if (this.climbing) {
            if (this.stepClimbing(input)) {
                return this.getState();
            }
        }

        const horizontalDirection = Number(input.held.right) - Number(input.held.left);
        const jumpPressed = input.events.some(event => event.button === 'jump' && event.type === 'pressed');

        this.state.velocityX = stunned
            ? this.knockbackVelocityX
            : horizontalDirection * this.config.horizontalSpeed;
        if (horizontalDirection !== 0) {
            this.state.facing = horizontalDirection < 0 ? -1 : 1;
        }

        const jumpStarted = jumpPressed && this.state.grounded;
        if (jumpStarted) {
            this.state.velocityY = this.config.jumpVelocity;
            this.state.grounded = false;
            this.canHoldJump = input.held.jump;
            this.jumpHoldRemaining = this.config.jumpHoldSteps;
        } else if (this.state.grounded) {
            this.state.velocityY = 0;
            this.canHoldJump = false;
        } else if (this.canHoldJump && this.state.velocityY < 0 && input.held.jump && this.jumpHoldRemaining > 0) {
            // Constant rise while the button is held, so the jump does not speed up mid-air.
            this.state.velocityY = this.config.jumpVelocity;
            this.jumpHoldRemaining--;
        } else {
            this.canHoldJump = false;
            this.state.velocityY = Math.min(
                this.config.maxFallSpeed,
                this.state.velocityY + this.config.gravity,
            );
        }

        this.moveHorizontally(this.state.velocityX);
        this.moveVertically(this.state.velocityY);
        this.state.grounded = this.state.grounded || this.isGrounded();

        if (this.state.grounded) {
            this.state.movement = this.state.velocityX === 0 ? 'idle' : 'walking';
        } else {
            this.state.movement = this.state.velocityY < 0 ? 'jumping' : 'falling';
        }

        return this.getState();
    }

    private findLadder(): MM6SolidRectangle | undefined {
        const halfHeight = this.config.hitboxHeight / 2;
        return (this.world.getLadderRectangles?.() ?? []).find(ladder =>
            this.state.x >= ladder.x
            && this.state.x <= ladder.x + ladder.width
            && this.state.y + halfHeight > ladder.y
            && this.state.y - halfHeight < ladder.y + ladder.height);
    }

    private findLadderBelowFeet(): MM6SolidRectangle | undefined {
        const feet = this.state.y + this.config.hitboxHeight / 2;
        return (this.world.getLadderRectangles?.() ?? []).find(ladder =>
            this.state.x >= ladder.x
            && this.state.x <= ladder.x + ladder.width
            && Math.abs(feet - ladder.y) <= LADDER_TOP_ENTRY_TOLERANCE);
    }

    // Returns true when the step was fully handled by the ladder.
    private stepClimbing(input: MM6InputFrame): boolean {
        const releaseLadder = () => {
            this.climbing = false;
            this.ladderLocked = true;
        };

        const jumpPressed = input.events.some(event => event.button === 'jump' && event.type === 'pressed');
        const ladder = this.findLadder();
        if (!ladder || jumpPressed) {
            releaseLadder();
            this.state.velocityY = 0;
            return false;
        }

        const halfHeight = this.config.hitboxHeight / 2;
        const direction = Number(input.held.down) - Number(input.held.up);
        const velocityY = direction * (this.config.climbSpeed ?? DEFAULT_CLIMB_SPEED);

        if (velocityY < 0 && this.state.y + halfHeight + velocityY <= ladder.y + LADDER_TOP_EXIT_MARGIN) {
            releaseLadder();
            this.state.y -= LADDER_TOP_EXIT_LIFT;
            this.state.velocityY = 0;
            return false;
        }

        this.state.velocityX = 0;
        this.state.velocityY = velocityY;
        if (input.held.left !== input.held.right) {
            this.state.facing = input.held.left ? -1 : 1;
        }
        if (velocityY < 0) {
            // The hitbox is wider than the ladder, so ignore tiles beside the shaft while going up.
            this.state.y += velocityY;
        } else {
            this.moveVertically(velocityY);
        }
        if (this.state.grounded && velocityY > 0) {
            releaseLadder();
            return false;
        }

        this.state.grounded = false;
        this.state.movement = 'climbing';
        return true;
    }

    private moveHorizontally(displacement: number): void {
        if (displacement === 0) {
            return;
        }

        const halfWidth = this.config.hitboxWidth / 2;
        const halfHeight = this.config.hitboxHeight / 2;
        const startX = this.state.x;
        let nextX = startX + displacement;
        const minTileY = Math.floor((this.state.y - halfHeight + COLLISION_EPSILON) / this.config.tileSize);
        const maxTileY = Math.floor((this.state.y + halfHeight - COLLISION_EPSILON) / this.config.tileSize);

        const firstTileX = Math.floor((Math.min(startX, nextX) - halfWidth + COLLISION_EPSILON) / this.config.tileSize);
        const lastTileX = Math.floor((Math.max(startX, nextX) + halfWidth - COLLISION_EPSILON) / this.config.tileSize);

        const horizontalTileStep = displacement > 0 ? 1 : -1;
        const startTileX = displacement > 0 ? firstTileX : lastTileX;
        for (
            let tileX = startTileX;
            displacement > 0 ? tileX <= lastTileX : tileX >= firstTileX;
            tileX += horizontalTileStep
        ) {
            if (displacement > 0) {
                const tileLeft = tileX * this.config.tileSize;
                const startRight = startX + halfWidth;
                const nextRight = nextX + halfWidth;
                if (startRight <= tileLeft + COLLISION_EPSILON && nextRight > tileLeft) {
                    for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
                        if (this.world.isSolidTile(tileX, tileY)) {
                            nextX = Math.min(nextX, tileLeft - halfWidth);
                            this.state.velocityX = 0;
                            break;
                        }
                    }
                }
            } else {
                const tileRight = (tileX + 1) * this.config.tileSize;
                const startLeft = startX - halfWidth;
                const nextLeft = nextX - halfWidth;
                if (startLeft >= tileRight - COLLISION_EPSILON && nextLeft < tileRight) {
                    for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
                        if (this.world.isSolidTile(tileX, tileY)) {
                            nextX = Math.max(nextX, tileRight + halfWidth);
                            this.state.velocityX = 0;
                            break;
                        }
                    }
                }
            }
        }

        for (const rectangle of this.world.getSolidRectangles?.() ?? []) {
            const verticalOverlap = this.state.y + halfHeight > rectangle.y + COLLISION_EPSILON
                && this.state.y - halfHeight < rectangle.y + rectangle.height - COLLISION_EPSILON;
            if (!verticalOverlap) {
                continue;
            }

            const startLeft = startX - halfWidth;
            const startRight = startX + halfWidth;
            const nextLeft = nextX - halfWidth;
            const nextRight = nextX + halfWidth;
            if (displacement > 0) {
                const alreadyOverlapping = startRight > rectangle.x + COLLISION_EPSILON
                    && startLeft < rectangle.x + rectangle.width - COLLISION_EPSILON;
                if (alreadyOverlapping || (startRight <= rectangle.x + COLLISION_EPSILON && nextRight > rectangle.x)) {
                    nextX = Math.min(nextX, rectangle.x - halfWidth);
                    this.state.velocityX = 0;
                }
            } else {
                const rectangleRight = rectangle.x + rectangle.width;
                const alreadyOverlapping = startRight > rectangle.x + COLLISION_EPSILON
                    && startLeft < rectangleRight - COLLISION_EPSILON;
                if (alreadyOverlapping || (startLeft >= rectangleRight - COLLISION_EPSILON && nextLeft < rectangleRight)) {
                    nextX = Math.max(nextX, rectangleRight + halfWidth);
                    this.state.velocityX = 0;
                }
            }
        }

        this.state.x = nextX;
    }

    private moveVertically(displacement: number): void {
        this.state.grounded = false;
        if (displacement === 0) {
            return;
        }

        const halfWidth = this.config.hitboxWidth / 2;
        const halfHeight = this.config.hitboxHeight / 2;
        const startY = this.state.y;
        let nextY = startY + displacement;
        const minTileX = Math.floor((this.state.x - halfWidth + COLLISION_EPSILON) / this.config.tileSize);
        const maxTileX = Math.floor((this.state.x + halfWidth - COLLISION_EPSILON) / this.config.tileSize);

        const firstTileY = Math.floor((Math.min(startY, nextY) - halfHeight + COLLISION_EPSILON) / this.config.tileSize);
        const lastTileY = Math.floor((Math.max(startY, nextY) + halfHeight - COLLISION_EPSILON) / this.config.tileSize);

        const verticalTileStep = displacement > 0 ? 1 : -1;
        const startTileY = displacement > 0 ? firstTileY : lastTileY;
        for (
            let tileY = startTileY;
            displacement > 0 ? tileY <= lastTileY : tileY >= firstTileY;
            tileY += verticalTileStep
        ) {
            if (displacement > 0) {
                const tileTop = tileY * this.config.tileSize;
                const startBottom = startY + halfHeight;
                const nextBottom = nextY + halfHeight;
                if (startBottom <= tileTop + COLLISION_EPSILON && nextBottom > tileTop) {
                    for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
                        if (this.world.isSolidTile(tileX, tileY)) {
                            nextY = Math.min(nextY, tileTop - halfHeight);
                            this.state.velocityY = 0;
                            this.state.grounded = true;
                            break;
                        }
                    }
                }
            } else {
                const tileBottom = (tileY + 1) * this.config.tileSize;
                const startTop = startY - halfHeight;
                const nextTop = nextY - halfHeight;
                if (startTop >= tileBottom - COLLISION_EPSILON && nextTop < tileBottom) {
                    for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
                        if (this.world.isSolidTile(tileX, tileY)) {
                            nextY = Math.max(nextY, tileBottom + halfHeight);
                            this.state.velocityY = 0;
                            break;
                        }
                    }
                }
            }
        }

        for (const rectangle of this.world.getSolidRectangles?.() ?? []) {
            const horizontalOverlap = this.state.x + halfWidth > rectangle.x + COLLISION_EPSILON
                && this.state.x - halfWidth < rectangle.x + rectangle.width - COLLISION_EPSILON;
            if (!horizontalOverlap) {
                continue;
            }

            const startTop = startY - halfHeight;
            const startBottom = startY + halfHeight;
            const nextTop = nextY - halfHeight;
            const nextBottom = nextY + halfHeight;
            if (displacement > 0) {
                const alreadyOverlapping = startBottom > rectangle.y + COLLISION_EPSILON
                    && startTop < rectangle.y + rectangle.height - COLLISION_EPSILON;
                if (alreadyOverlapping || (startBottom <= rectangle.y + COLLISION_EPSILON && nextBottom > rectangle.y)) {
                    nextY = Math.min(nextY, rectangle.y - halfHeight);
                    this.state.velocityY = 0;
                    this.state.grounded = true;
                }
            } else {
                const rectangleBottom = rectangle.y + rectangle.height;
                const alreadyOverlapping = startBottom > rectangle.y + COLLISION_EPSILON
                    && startTop < rectangleBottom - COLLISION_EPSILON;
                if (alreadyOverlapping || (startTop >= rectangleBottom - COLLISION_EPSILON && nextTop < rectangleBottom)) {
                    nextY = Math.max(nextY, rectangleBottom + halfHeight);
                    this.state.velocityY = 0;
                    this.canHoldJump = false;
                }
            }
        }

        if (!this.climbing && displacement > 0) {
            // Ladder tops behave as one-way floors when landing from above.
            const startBottom = startY + halfHeight;
            for (const ladder of this.world.getLadderRectangles?.() ?? []) {
                const centered = this.state.x >= ladder.x && this.state.x <= ladder.x + ladder.width;
                if (centered && startBottom <= ladder.y + COLLISION_EPSILON && nextY + halfHeight > ladder.y) {
                    nextY = Math.min(nextY, ladder.y - halfHeight);
                    this.state.velocityY = 0;
                    this.state.grounded = true;
                }
            }
        }

        this.state.y = nextY;
    }

    private isGrounded(): boolean {
        const probeY = this.state.y + GROUND_PROBE_DISTANCE;
        const halfWidth = this.config.hitboxWidth / 2;
        const halfHeight = this.config.hitboxHeight / 2;
        const left = this.state.x - halfWidth;
        const right = this.state.x + halfWidth;
        const top = probeY + halfHeight - COLLISION_EPSILON;
        const bottom = probeY + halfHeight + COLLISION_EPSILON;
        const minTileX = Math.floor((left + COLLISION_EPSILON) / this.config.tileSize);
        const maxTileX = Math.floor((right - COLLISION_EPSILON) / this.config.tileSize);
        const minTileY = Math.floor(top / this.config.tileSize);
        const maxTileY = Math.floor(bottom / this.config.tileSize);

        for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
            for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
                if (this.world.isSolidTile(tileX, tileY)) {
                    return true;
                }
            }
        }

        const feet = this.state.y + halfHeight;
        const onSolidRectangle = (this.world.getSolidRectangles?.() ?? []).some(rectangle => {
            const horizontalOverlap = right > rectangle.x + COLLISION_EPSILON
                && left < rectangle.x + rectangle.width - COLLISION_EPSILON;
            const touchingTop = feet <= rectangle.y + COLLISION_EPSILON
                && feet + GROUND_PROBE_DISTANCE >= rectangle.y;
            return horizontalOverlap && touchingTop;
        });
        if (onSolidRectangle) {
            return true;
        }

        return !this.climbing && (this.world.getLadderRectangles?.() ?? []).some(ladder =>
            this.state.x >= ladder.x
            && this.state.x <= ladder.x + ladder.width
            && feet <= ladder.y + COLLISION_EPSILON
            && feet + GROUND_PROBE_DISTANCE >= ladder.y);
    }
}
