import test from 'node:test';
import assert from 'node:assert/strict';
import MM6PlayerSimulation, { DEFAULT_MM6_PLAYER_CONFIG } from '../.build/entities/player/MM6PlayerSimulation.js';
import MM6TilemapCollisionWorld from '../.build/engine/collision/MM6TilemapCollisionWorld.js';
import MM6PlayerMovementAdapter from '../.build/adapters/MM6PlayerMovementAdapter.js';

class GridWorld {
    solids = new Set();

    setSolid(x, y) {
        this.solids.add(`${x},${y}`);
    }

    isSolidTile(x, y) {
        return this.solids.has(`${x},${y}`);
    }
}

function frame({ left = false, right = false, jump = false, events = [] } = {}) {
    return {
        held: { left, right, up: false, down: false, jump, attack: false },
        events,
    };
}

function createFloorWorld() {
    const world = new GridWorld();
    for (let x = 0; x < 12; x++) {
        world.setSolid(x, 5);
    }
    return world;
}

function config(overrides = {}) {
    return {
        ...DEFAULT_MM6_PLAYER_CONFIG,
        hitboxWidth: 16,
        hitboxHeight: 16,
        ...overrides,
    };
}

function settleOnFloor(simulation) {
    for (let step = 0; step < 20; step++) {
        simulation.step(frame());
        if (simulation.getState().grounded) {
            return;
        }
    }
    assert.fail('Player did not land on the test floor.');
}

test('player lands on a solid floor and remains grounded', () => {
    const simulation = new MM6PlayerSimulation(createFloorWorld(), { x: 24, y: 40 }, config());

    settleOnFloor(simulation);
    const landed = simulation.getState();

    assert.equal(landed.y, 72);
    assert.equal(landed.grounded, true);

    simulation.step(frame());
    assert.equal(simulation.getState().y, 72);
});

test('horizontal movement stops at a wall tile', () => {
    const world = createFloorWorld();
    for (let y = 1; y < 5; y++) {
        world.setSolid(4, y);
    }
    const simulation = new MM6PlayerSimulation(world, { x: 40, y: 72 }, config());
    settleOnFloor(simulation);

    for (let step = 0; step < 20; step++) {
        simulation.step(frame({ right: true }));
    }

    assert.equal(simulation.getState().x, 56);
    assert.equal(simulation.getState().velocityX, 0);
});

test('high-speed left movement stops at the nearest of multiple wall tiles', () => {
    const world = new GridWorld();
    for (let x = 0; x < 12; x++) {
        world.setSolid(x, 7);
    }
    world.setSolid(4, 6);
    world.setSolid(5, 6);
    const simulation = new MM6PlayerSimulation(
        world,
        { x: 112, y: 104 },
        config({ horizontalSpeed: 40 }),
    );
    settleOnFloor(simulation);

    simulation.step(frame({ left: true }));

    assert.equal(simulation.getState().x, 104);
});

test('sub-tile solid rectangles keep their exact wall boundary without animation flicker', () => {
    const floor = createFloorWorld();
    const world = new MM6TilemapCollisionWorld(
        [{
            getTileAt(x, y) {
                return floor.isSolidTile(x, y) ? { collides: true } : null;
            },
        }],
        [{ x: 128, y: 64, width: 3.5, height: 16 }],
    );
    const simulation = new MM6PlayerSimulation(
        world,
        { x: 144, y: 72 },
        config({ horizontalSpeed: 2 }),
    );
    settleOnFloor(simulation);

    let state;
    for (let step = 0; step < 20; step++) {
        state = simulation.step(frame({ left: true }));
    }

    assert.equal(state.x, 139.5);
    assert.equal(state.velocityX, 0);
    assert.equal(state.movement, 'idle');
});

test('jump starts on a press event and stops at a ceiling', () => {
    const world = createFloorWorld();
    for (let x = 1; x < 4; x++) {
        world.setSolid(x, 2);
    }
    const simulation = new MM6PlayerSimulation(world, { x: 24, y: 72 }, config());
    settleOnFloor(simulation);

    const jumpStart = simulation.step(frame({
        jump: true,
        events: [{ button: 'jump', type: 'pressed' }],
    }));
    assert.equal(jumpStart.velocityY, DEFAULT_MM6_PLAYER_CONFIG.jumpVelocity);
    assert.equal(jumpStart.movement, 'jumping');

    let highestPosition = jumpStart.y;
    for (let step = 0; step < 20; step++) {
        highestPosition = Math.min(highestPosition, simulation.step(frame({ jump: true })).y);
    }

    assert.equal(highestPosition, 56);
});

test('holding jump extends ascent once but does not keep the player rising indefinitely', () => {
    const world = createFloorWorld();
    const simulation = new MM6PlayerSimulation(
        world,
        { x: 24, y: 72 },
        config({ jumpHoldAcceleration: 1, gravity: 1, maxJumpVelocity: -4 }),
    );
    settleOnFloor(simulation);

    const launch = simulation.step(frame({
        jump: true,
        events: [{ button: 'jump', type: 'pressed' }],
    }));
    assert.equal(launch.velocityY, DEFAULT_MM6_PLAYER_CONFIG.jumpVelocity);

    let state = launch;
    let highestY = launch.y;
    for (let step = 0; step < 30; step++) {
        state = simulation.step(frame({ jump: true }));
        highestY = Math.min(highestY, state.y);
    }

    assert.ok(highestY > launch.y - 100);
    assert.equal(state.grounded, true);
});

test('jump requires a fresh press after landing and cannot be triggered twice while held', () => {
    const simulation = new MM6PlayerSimulation(createFloorWorld(), { x: 24, y: 72 }, config());
    settleOnFloor(simulation);

    simulation.step(frame({
        jump: true,
        events: [{ button: 'jump', type: 'pressed' }],
    }));
    for (let step = 0; step < 100; step++) {
        simulation.step(frame({ jump: true }));
    }
    assert.equal(simulation.getState().grounded, true);

    const stillHeld = simulation.step(frame({ jump: true }));
    assert.equal(stillHeld.grounded, true);
    assert.equal(stillHeld.velocityY, 0);

    const released = simulation.step(frame());
    assert.equal(released.grounded, true);
    const secondJump = simulation.step(frame({
        jump: true,
        events: [{ button: 'jump', type: 'pressed' }],
    }));
    assert.equal(secondJump.grounded, false);
    assert.equal(secondJump.velocityY, DEFAULT_MM6_PLAYER_CONFIG.jumpVelocity);
});

test('high-speed jump stops at the nearest of multiple ceiling tiles', () => {
    const world = new GridWorld();
    for (let x = 0; x < 12; x++) {
        world.setSolid(x, 7);
    }
    world.setSolid(1, 3);
    world.setSolid(1, 4);
    const simulation = new MM6PlayerSimulation(
        world,
        { x: 24, y: 104 },
        config({ jumpVelocity: -40, maxJumpVelocity: -40 }),
    );
    settleOnFloor(simulation);

    const result = simulation.step(frame({
        jump: true,
        events: [{ button: 'jump', type: 'pressed' }],
    }));

    assert.equal(result.y, 88);
    assert.equal(result.velocityY, 0);
});

test('a short jump tap is consumed even when released before the simulation step', () => {
    const simulation = new MM6PlayerSimulation(createFloorWorld(), { x: 24, y: 72 }, config());
    settleOnFloor(simulation);

    const result = simulation.step(frame({
        jump: false,
        events: [
            { button: 'jump', type: 'pressed' },
            { button: 'jump', type: 'released' },
        ],
    }));

    assert.equal(result.velocityY, DEFAULT_MM6_PLAYER_CONFIG.jumpVelocity);
    assert.equal(result.grounded, false);
});

test('the same input sequence produces identical player states', () => {
    const world = createFloorWorld();
    const first = new MM6PlayerSimulation(world, { x: 24, y: 40 }, config());
    const second = new MM6PlayerSimulation(world, { x: 24, y: 40 }, config());
    const inputs = [
        ...Array.from({ length: 20 }, () => frame()),
        frame({ right: true }),
        frame({ right: true }),
        frame({ right: true, jump: true, events: [{ button: 'jump', type: 'pressed' }] }),
        ...Array.from({ length: 8 }, () => frame({ right: true, jump: true })),
        ...Array.from({ length: 20 }, () => frame()),
    ];

    for (const input of inputs) {
        assert.deepEqual(first.step(input), second.step(input));
    }
});

test('tilemap collision adapter combines tile layers and solid object rectangles', () => {
    const layer = {
        getTileAt(x, y) {
            return x === 2 && y === 3 ? { collides: true } : null;
        },
    };
    const world = new MM6TilemapCollisionWorld(
        [layer],
        [{ x: 32, y: 16, width: 4, height: 24 }],
    );

    assert.equal(world.isSolidTile(2, 3), true);
    assert.equal(world.isSolidTile(2, 1), false);
    assert.equal(world.isSolidTile(1, 1), false);
    assert.deepEqual(world.getSolidRectangles(), [{ x: 32, y: 16, width: 4, height: 24 }]);
});

test('player movement adapter preserves jump taps between fixed simulation steps', () => {
    const world = createFloorWorld();
    const adapter = new MM6PlayerMovementAdapter({
        collisionWorld: world,
        initialPosition: { x: 24, y: 72 },
        config: config(),
    });
    const buttons = frame().held;

    adapter.update(1000 / 60, buttons);
    adapter.update(4, { ...buttons, jump: true });
    adapter.update(4, { ...buttons, jump: false });
    const afterNextStep = adapter.update(9, buttons);

    assert.equal(afterNextStep.state.velocityY, DEFAULT_MM6_PLAYER_CONFIG.jumpVelocity);
    assert.equal(afterNextStep.state.grounded, false);
});

test('player movement adapter discards pending press events after a long pause', () => {
    const world = createFloorWorld();
    const adapter = new MM6PlayerMovementAdapter({
        collisionWorld: world,
        initialPosition: { x: 24, y: 72 },
        config: config(),
    });
    const buttons = frame().held;

    adapter.update(1000 / 60, buttons);
    adapter.update(4, { ...buttons, jump: true });
    const pause = adapter.update(251, buttons);
    const resumed = adapter.update(1000 / 60, buttons);

    assert.equal(pause.suspended, true);
    assert.equal(resumed.state.grounded, true);
    assert.equal(resumed.state.velocityY, 0);
});

test('player movement adapter exits its region at the player hitbox boundary', () => {
    const adapter = new MM6PlayerMovementAdapter({
        collisionWorld: createFloorWorld(),
        initialPosition: { x: 80, y: 72 },
        config: config({ horizontalSpeed: 1.5 }),
        regionMaxX: 100,
    });
    const buttons = frame().held;

    let update;
    for (let step = 0; step < 8; step++) {
        update = adapter.update(1000 / 60, { ...buttons, right: true });
    }

    assert.equal(update.state.x, 92);
    assert.equal(update.exitedRegion, true);
});

function ladderWorld() {
    const world = createFloorWorld();
    world.getLadderRectangles = () => [{ x: 40, y: 16, width: 16, height: 64 }];
    return world;
}

function climbFrame(overrides = {}) {
    const base = frame(overrides.base);
    return { ...base, held: { ...base.held, ...overrides.held }, events: overrides.events ?? [] };
}

test('player mounts a ladder with up, ignores gravity and snaps to its center', () => {
    const simulation = new MM6PlayerSimulation(ladderWorld(), { x: 44, y: 72 }, config());
    settleOnFloor(simulation);

    const startY = simulation.getState().y;
    for (let step = 0; step < 10; step++) {
        simulation.step(climbFrame({ held: { up: true } }));
    }
    const climbing = simulation.getState();
    assert.equal(climbing.movement, 'climbing');
    assert.equal(climbing.x, 48);
    assert.ok(climbing.y < startY);

    const heldY = climbing.y;
    for (let step = 0; step < 10; step++) {
        simulation.step(climbFrame());
    }
    assert.equal(simulation.getState().y, heldY);
});

test('jumping off a ladder releases it and falls until up/down is released', () => {
    const simulation = new MM6PlayerSimulation(ladderWorld(), { x: 44, y: 72 }, config());
    settleOnFloor(simulation);
    for (let step = 0; step < 10; step++) {
        simulation.step(climbFrame({ held: { up: true } }));
    }

    simulation.step(climbFrame({ held: { up: true }, events: [{ button: 'jump', type: 'pressed' }] }));
    simulation.step(climbFrame({ held: { up: true } }));
    assert.notEqual(simulation.getState().movement, 'climbing');
});

test('climbing past the ladder top steps the player out of the ladder', () => {
    const simulation = new MM6PlayerSimulation(ladderWorld(), { x: 44, y: 72 }, config());
    settleOnFloor(simulation);
    for (let step = 0; step < 80 && simulation.getState().movement !== 'falling'; step++) {
        simulation.step(climbFrame({ held: { up: true } }));
    }
    assert.notEqual(simulation.getState().movement, 'climbing');
});

test('climbing up ignores tiles beside the shaft and lets the player turn on the ladder', () => {
    const world = ladderWorld();
    world.setSolid(1, 3);
    world.setSolid(4, 3);
    const simulation = new MM6PlayerSimulation(world, { x: 44, y: 72 }, config());
    settleOnFloor(simulation);
    for (let step = 0; step < 10; step++) {
        simulation.step(climbFrame({ held: { up: true } }));
    }
    const turned = simulation.step(climbFrame({ held: { left: true } }));
    assert.equal(turned.facing, -1);
    assert.equal(turned.movement, 'climbing');
    assert.equal(turned.x, 48);
});

test('pressing down on top of a ladder climbs down through the floor', () => {
    const world = createFloorWorld();
    world.getLadderRectangles = () => [{ x: 40, y: 80, width: 16, height: 48 }];
    const simulation = new MM6PlayerSimulation(world, { x: 48, y: 40 }, config());
    settleOnFloor(simulation);
    const startY = simulation.getState().y;

    for (let step = 0; step < 20; step++) {
        simulation.step(climbFrame({ held: { down: true } }));
    }
    const state = simulation.getState();
    assert.equal(state.movement, 'climbing');
    assert.ok(state.y > startY + 10);
});

test('ladder top acts as a one-way floor when landing from above', () => {
    const world = new GridWorld();
    world.getLadderRectangles = () => [{ x: 40, y: 80, width: 16, height: 48 }];
    const simulation = new MM6PlayerSimulation(world, { x: 48, y: 40 }, config());
    settleOnFloor(simulation);
    const state = simulation.getState();
    assert.equal(state.y + 8, 80);
    assert.equal(state.grounded, true);
});

test('ladder top does not block a player walking beside the ladder', () => {
    const world = new GridWorld();
    world.getLadderRectangles = () => [{ x: 40, y: 80, width: 16, height: 48 }];
    const simulation = new MM6PlayerSimulation(world, { x: 20, y: 40 }, config());
    for (let step = 0; step < 60; step++) {
        simulation.step(frame());
    }
    assert.ok(simulation.getState().y > 100);
});

test('knockback pushes the player away, ignores input during hitstun and then restores control', () => {
    const simulation = new MM6PlayerSimulation(createFloorWorld(), { x: 48, y: 72 }, config());
    settleOnFloor(simulation);
    const startX = simulation.getState().x;

    simulation.applyKnockback(-1, -1.8, 5);
    for (let step = 0; step < 5; step++) {
        simulation.step(frame({ right: true, jump: true, events: [{ button: 'jump', type: 'pressed' }] }));
    }
    const stunned = simulation.getState();
    assert.ok(stunned.x < startX - 4);

    for (let step = 0; step < 40; step++) {
        simulation.step(frame());
    }
    const recovered = simulation.getState();
    assert.equal(recovered.grounded, true);

    const afterX = recovered.x;
    simulation.step(frame({ right: true }));
    assert.ok(simulation.getState().x > afterX);
});
