import test from 'node:test';
import assert from 'node:assert/strict';
import MM6InputBuffer from '../.build/engine/input/MM6InputBuffer.js';
import MM6FixedStepLoop from '../.build/engine/core/MM6FixedStepLoop.js';

test('input buffer preserves a tap and the order of its transitions', () => {
    const input = new MM6InputBuffer();

    input.setButtonState('jump', true);
    input.setButtonState('jump', false);

    const frame = input.consumeFrame();
    assert.equal(frame.held.jump, false);
    assert.deepEqual(frame.events, [
        { button: 'jump', type: 'pressed' },
        { button: 'jump', type: 'released' },
    ]);
    assert.deepEqual(input.consumeFrame().events, []);
});

test('fixed-step loop produces the same number of steps for different render rates', () => {
    let stepsAt60Fps = 0;
    let stepsAt120Fps = 0;
    const loopAt60Fps = new MM6FixedStepLoop(10, 100);
    const loopAt120Fps = new MM6FixedStepLoop(10, 100);

    for (let frame = 0; frame < 12; frame++) {
        loopAt60Fps.advance(20, () => stepsAt60Fps++);
    }
    for (let frame = 0; frame < 24; frame++) {
        loopAt120Fps.advance(10, () => stepsAt120Fps++);
    }

    assert.equal(stepsAt60Fps, 24);
    assert.equal(stepsAt120Fps, 24);
});

test('default simulation step stays synchronized at 60 Hz', () => {
    let steps = 0;
    const loop = new MM6FixedStepLoop();
    const frameDelta = 1000 / 60;

    for (let frame = 0; frame < 60; frame++) {
        loop.advance(frameDelta, () => steps++);
    }

    assert.equal(steps, 60);
});

test('fixed-step loop caps catch-up work and drops stale whole steps', () => {
    let steps = 0;
    const loop = new MM6FixedStepLoop(10, 100, 3);

    const delayedFrame = loop.advance(80, () => steps++);
    const nextFrame = loop.advance(5, () => steps++);
    const followingFrame = loop.advance(5, () => steps++);

    assert.deepEqual(delayedFrame, { steps: 3, suspended: false });
    assert.deepEqual(nextFrame, { steps: 0, suspended: false });
    assert.deepEqual(followingFrame, { steps: 1, suspended: false });
    assert.equal(steps, 4);
});

test('fixed-step loop clears accumulated time for a suspended frame', () => {
    const loop = new MM6FixedStepLoop(10, 100);
    let steps = 0;

    loop.advance(5, () => steps++);
    const suspended = loop.advance(101, () => steps++);

    assert.deepEqual(suspended, { steps: 0, suspended: true });
    assert.equal(loop.advance(5, () => steps++).steps, 0);
    assert.equal(loop.advance(5, () => steps++).steps, 1);
    assert.equal(steps, 1);
});

test('fixed-step loop rejects invalid frame deltas', () => {
    const loop = new MM6FixedStepLoop(10, 100);

    assert.throws(() => loop.advance(-1, () => undefined), RangeError);
    assert.throws(() => loop.advance(Number.NaN, () => undefined), RangeError);
});
