# Mega Man 6--Inspired Engine Proposal

## Phaser 3 + TypeScript architecture for the Save The Christmas Game project

**Purpose:** A technical proposal to discuss with the team before
refactoring the existing game.

**Status:** Architecture recommendation --- not a verified
reverse-engineering specification of Mega Man 6.

## 1. Executive recommendation

Keep **Phaser 3 + TypeScript + Vite** as the project foundation, but
separate gameplay simulation from Phaser's rendering and scene APIs.

Use Phaser for: - Rendering sprites, backgrounds, tile layers,
particles, and effects - Camera control and scene transitions - Audio
playback and asset loading - Reading browser input

Build a small custom gameplay engine for: - Deterministic frame
updates - Player movement and state transitions - Tile-based collision -
Enemy and projectile updates - Damage, knockback, and invulnerability
rules - Stage-specific gameplay logic

> Phaser presents the game. The custom engine decides what happens in
> the game.

This approach pursues a Mega Man 6 NES-style feel without emulating NES
hardware or relying on Phaser Arcade Physics for the main character's
movement.

## 2. What "faithful to Mega Man 6" should mean

Aim to reproduce observable gameplay behavior: - Consistent movement and
jump timing - Predictable collision against a tile-based world - Clear
player states and transitions - Consistent enemy and projectile
behavior - Repeatable interactions at a fixed simulation rate -
Deliberate control over knockback, damage, and temporary invulnerability

This does **not** require emulating the NES CPU, PPU, memory bus, or
original machine timing.

### Research limitation

The TASVideos Rockman game-resource material and Mega Man 6 RAM map are
useful research leads, but do not by themselves establish every Mega Man
6 movement constant or the exact order of every gameplay update.

Treat initial physics values as **provisional** until measured or
verified against Mega Man 6 gameplay footage, frame data, disassembly,
or reliable game-specific documentation. Do not label guessed values as
original game constants.

## 3. Recommended technology stack

  -----------------------------------------------------------------------
  Concern                 Recommendation          Reason
  ----------------------- ----------------------- -----------------------
  Game framework          Phaser 3                Keep the existing
                                                  framework and ecosystem

  Language                TypeScript              Strong typing for
                                                  engine contracts and
                                                  state

  Bundler/dev server      Vite                    Fast development
                                                  workflow

  Simulation timing       Custom fixed-step loop  Gameplay does not
                                                  depend on render frame
                                                  rate

  Player/world collision  Custom tile collision   Precise control over
                                                  retro platformer
                                                  behavior

  Rendering               Phaser                  Reuse sprites, cameras,
                                                  tilemaps, and effects

  Tests                   Vitest                  Test gameplay logic
                                                  without launching a
                                                  browser

  Physics library         Not for core player     Avoid mixing a
                          movement                general-purpose solver
                                                  with hand-tuned
                                                  platformer rules
  -----------------------------------------------------------------------

Phaser Arcade Physics may remain useful for non-critical effects or
prototypes. It should not silently become the authority for the main
character's movement and collision.

## 4. Proposed project structure

This is a target structure, not a requirement to rename every existing
file immediately. Preserve the current `public/` and `server/` folders
if they are still needed.

``` text
project/
├── public/
│   ├── assets/
│   └── maps/
├── server/
│   └── ...
├── src/
│   ├── main.ts
│   └── mm6/
│       ├── core/
│       │   ├── MM6Game.ts
│       │   ├── MM6GameLoop.ts
│       │   ├── MM6GameConfig.ts
│       │   └── MM6EventBus.ts
│       ├── engine/
│       │   ├── math/FixedPoint.ts
│       │   ├── physics/
│       │   │   ├── MM6PhysicsBody.ts
│       │   │   └── MM6Movement.ts
│       │   ├── collision/
│       │   │   ├── MM6TileCollision.ts
│       │   │   └── MM6CollisionWorld.ts
│       │   ├── input/MM6InputState.ts
│       │   ├── animation/
│       │   └── camera/
│       ├── entities/
│       │   ├── player/
│       │   │   ├── MM6Player.ts
│       │   │   ├── MM6PlayerState.ts
│       │   │   └── MM6PlayerController.ts
│       │   ├── enemies/MM6Enemy.ts
│       │   ├── bosses/MM6Boss.ts
│       │   └── projectiles/MM6Projectile.ts
│       ├── systems/
│       │   ├── MM6CombatSystem.ts
│       │   ├── MM6DamageSystem.ts
│       │   └── MM6StageSystem.ts
│       ├── scenes/
│       │   ├── MM6BootScene.ts
│       │   ├── MM6MenuScene.ts
│       │   └── MM6GameScene.ts
│       └── ui/MM6HUD.ts
├── tests/
│   ├── physics/
│   ├── collision/
│   └── gameplay/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### MM6 naming convention

Use `MM6` as the prefix for classes, interfaces, enums, and types that belong specifically to this game engine. Keep general-purpose utilities unprefixed when they could be reused by another project.

Examples:
- Engine-specific: `MM6GameLoop`, `MM6Player`, `MM6PlayerState`, `MM6CollisionWorld`, `MM6Enemy`, `MM6CombatSystem`
- Reusable utilities: `FixedPoint`, `Vector2`, `InputBuffer` (when genuinely game-agnostic)

Keep the engine code grouped under `src/mm6/`. This makes the boundary visible in imports and avoids spreading MM6-specific implementation into unrelated project code. The `MM6` prefix describes the engine domain; it does not imply that its internals have already been proven identical to the original NES implementation.

### Responsibility boundaries

-   `core/`: starts and coordinates the game and simulation loop.
-   `engine/`: reusable, framework-independent gameplay mechanics.
-   `entities/`: player, enemies, bosses, and projectiles.
-   `systems/`: rules that operate across multiple entities.
-   `scenes/`: Phaser integration and presentation.
-   `ui/`: menus, HUD, and interface elements.
-   `tests/`: automated checks for mechanics that should remain stable.

Avoid adding an Entity Component System framework unless the project
grows enough to justify it. A small game can remain easier to understand
with ordinary TypeScript classes and focused systems.

## 5. Deterministic fixed-step simulation

Do not update gameplay by multiplying movement by the variable render
delta. Accumulate elapsed time and advance the simulation in fixed
steps.

A 60 Hz simulation uses a step of approximately 16.667 ms. Phaser can
render between simulation updates, but gameplay rules advance only in
fixed steps.

Conceptual loop:

``` ts
const STEP_MS = 1000 / 60;
let accumulator = 0;

function updateFrame(deltaMs: number) {
  accumulator += Math.min(deltaMs, 100);

  while (accumulator >= STEP_MS) {
    mm6Simulation.updateOneFrame();
    accumulator -= STEP_MS;
  }

  renderer.render();
}
```

This is illustrative pseudocode. Production code should define a
deliberate policy for long pauses, tab suspension, and maximum catch-up
steps. Avoid silently dropping simulation time in a way that changes
gameplay.

Suggested per-frame order: 1. Read and snapshot input for this
simulation frame. 2. Update player state and movement intent. 3. Apply
movement and resolve world collision. 4. Update enemies and their
movement. 5. Update projectiles. 6. Resolve attacks and collisions
between entities. 7. Apply damage, knockback, and invulnerability
timers. 8. Update stage triggers and gameplay events. 9. Publish the
resulting state for rendering.

The exact order is a design decision. It should be explicit, tested, and
changed only intentionally.

## 6. Fixed-point coordinates

For retro-style precision, consider storing gameplay positions and
velocities as integers rather than floating-point pixel values.

One possible representation is **8.8 fixed point**: - 256 internal units
= 1 pixel - 1 pixel = 256 units - 0.5 pixel = 128 units - 2 pixels = 512
units

``` ts
const FIXED_ONE = 256;

function pixelsToFixed(px: number): number {
  return Math.round(px * FIXED_ONE);
}

function fixedToPixels(value: number): number {
  return value / FIXED_ONE;
}
```

This is a proposed representation, not a claim that Mega Man 6 uses this
exact format internally. The original game may use different coordinate
formats and conventions.

Benefits include consistent subpixel movement, explicit rounding
behavior, reproducible tests, and a clear separation between simulation
coordinates and rendered pixels. Keep conversions at system boundaries
rather than repeatedly converting during movement operations.

## 7. Player movement and state machine

Use explicit player states rather than a collection of loosely related
booleans.

``` ts
type MM6PlayerState =
  | "idle"
  | "walking"
  | "jumping"
  | "falling"
  | "landing"
  | "climbing"
  | "damaged"
  | "knockback"
  | "dead";
```

The exact states should reflect the game design. Climbing or knockback
can be omitted if unnecessary.

Each state should define: - Which inputs are accepted - Which movement
rules apply - Which transitions are allowed - Which animation is
displayed - Whether attacks or damage can interrupt it

Keep state transitions in one identifiable place. Avoid allowing
animation callbacks, collision handlers, and input handlers to
independently overwrite the player's state.

Keep movement values in configuration rather than scattering constants:

``` ts
interface MM6PlayerMovementConfig {
  runSpeed: number;
  groundAcceleration: number;
  airAcceleration: number;
  jumpVelocity: number;
  gravity: number;
  maxFallSpeed: number;
}
```

These values are intentionally unspecified. Tune them from measured
reference behavior and playtesting; do not assume plausible values are
Mega Man 6 values.

## 8. Tile-based collision

A custom tile collision layer gives the team control over how the player
interacts with the stage.

``` ts
type MM6TileType =
  | "empty"
  | "solid"
  | "oneWay"
  | "ladder"
  | "hazard";
```

The collision system should eventually support: - Horizontal and
vertical collision resolution separately - Snapping the player to tile
boundaries - Ground detection - Ceiling collision - Wall collision -
One-way platforms, if required - Ladders and hazards, if required - A
player hitbox independent of sprite dimensions

Recommended collision update: 1. Calculate intended horizontal movement.
2. Test the player's hitbox against nearby tiles. 3. Resolve horizontal
overlap and update horizontal velocity. 4. Calculate intended vertical
movement. 5. Test the updated hitbox against nearby tiles. 6. Resolve
vertical overlap and update vertical velocity. 7. Update
grounded/airborne information.

Do not rely on a single "is the next position blocked?" check. A robust
implementation needs boundary resolution, axis separation, and clearly
defined corner behavior.

Use the visual tilemap for drawing and a separate collision
representation for gameplay. They can share source data, but visual
artwork should not determine collision accidentally.

## 9. Rendering and animation

Phaser remains responsible for displaying the simulation state.

-   The simulation owns position, state, facing direction, and gameplay
    timers.
-   Phaser sprites display those values.
-   Animation completion may request a gameplay transition, but should
    not be the only authority for critical physics or collision state.
-   If rendering interpolation is used between fixed simulation steps,
    interpolate only the displayed position. Never feed interpolated
    values back into gameplay physics.

## 10. Testing strategy

Separating simulation from Phaser allows core mechanics to be tested as
ordinary TypeScript.

**Physics tests** - Player accelerates and reaches configured speed. - A
jump follows configured velocity and gravity. - A falling player lands
on a floor. - A ceiling stops upward movement. - A wall stops horizontal
movement.

**Collision tests** - Player does not pass through a solid tile. -
Player is snapped to the correct tile boundary. - Ground detection is
stable. - One-way platforms behave consistently, if implemented.

**State-machine tests** - Idle transitions to walking when
appropriate. - Walking transitions to jumping when a jump is accepted. -
Jumping transitions to falling at the correct point. - Landing returns
to an appropriate grounded state. - Damage and knockback follow explicit
rules.

**Determinism test**

Given the same initial state and the same sequence of per-frame inputs,
the simulation should produce the same resulting state.

A useful future improvement is a replay test: record input per frame,
run it twice, and compare the resulting simulation state.

## 11. Suggested implementation milestones

Do not refactor the entire game in one step. Build incrementally and
keep a playable version at every milestone.

  -----------------------------------------------------------------------
  Milestone               Deliverable             Acceptance criterion
  ----------------------- ----------------------- -----------------------
  1\. Baseline            Document current        Team agrees on what
                          scenes, entities,       must be preserved
                          assets, dependencies    

  2\. Simulation loop     Fixed-step update       Same input sequence
                          independent of          produces repeatable
                          rendering               updates

  3\. Player model        Player state and        Player logic runs
                          movement data           without Phaser sprites

  4\. Collision           Tile collision and      No tunneling through
                          hitbox resolution       basic solid tiles

  5\. Phaser adapter      Render simulation state Existing art and camera
                          through Phaser          work with the new model

  6\. Combat              Projectiles, damage,    Combat rules are tested
                          knockback,              independently
                          invulnerability         

  7\. Stage integration   Enemies, triggers,      A complete test section
                          hazards, stage          is playable
                          transitions             

  8\. Tuning              Compare behavior        Movement and
                          against Mega Man 6      interactions are tuned
                          references              from evidence
  -----------------------------------------------------------------------

## 12. Migration guidance for the existing repository

The project has previously been identified as using Phaser 3,
TypeScript, and Vite, with `src/`, `public/`, and a `server/` area. It
also appears to include Phaser-related plugins.

Those details are a starting point, not a verified file-by-file audit.
Before moving files:

1.  Capture the current directory tree.
2.  Identify the current Phaser entry point and scene lifecycle.
3.  Find where player movement and collision are implemented.
4.  Identify which plugins are actually used and where.
5.  Identify server responsibilities and keep them separate from client
    simulation.
6.  Add tests before replacing existing gameplay behavior.
7.  Move one responsibility at a time, keeping the game runnable.

Do not delete Matter, Arcade Physics, or existing plugins just because
the proposed architecture does not use them for core player movement.
First verify whether enemies, effects, or other features depend on them.

A safe migration is usually an **incremental extraction**: move gameplay
rules behind new TypeScript interfaces while existing Phaser scenes
continue to render the game.

## 13. Decisions for the team

Agree on these questions before implementation:

1.  Is the target an accurate Mega Man 6-style feel, or a frame-by-frame
    behavioral recreation?
2.  Which exact Mega Man 6 actions must be reproduced first?
3.  What reference material will verify movement and collision values?
4.  Will the simulation always run at 60 updates per second?
5.  Which existing systems must remain compatible with the current game?
6.  Should collision maps be authored separately, or generated from
    tilemap properties?
7.  What is the smallest playable stage that can validate the new
    engine?

## 14. Final recommendation

Use **Phaser 3 + TypeScript + Vite**, retain the current project
infrastructure, and introduce a small custom deterministic gameplay
layer.

Prioritize: 1. Fixed-step simulation 2. Player state machine 3.
Fixed-point or otherwise explicitly controlled movement arithmetic 4.
Tile collision with proper axis resolution 5. Combat and enemy systems
6. Reference-based tuning

Do not begin by rewriting every scene or guessing the original game's
physics constants. First establish a reliable simulation, prove it with
tests, and then tune behavior against Mega Man 6-specific evidence.

------------------------------------------------------------------------

**Confidence:** High (95%) in the proposed architecture as a sound
approach for a Phaser-based retro platformer. Lower confidence in claims
about exact Mega Man 6 internals or numeric physics values until
independently verified from game-specific sources.
