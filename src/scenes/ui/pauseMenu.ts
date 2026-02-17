import { Scene } from 'phaser';
import GameEvents from '../../utils/events';
import PlayerController from '../../controllers/characters/playerController';
import { sharedInstance as events } from '../../scenes/eventCentre';
import { Weapons, WeaponsAtlas } from '../../utils/weapons';
import InputHandler from '../../controllers/joystick/inputHandler';
import KeyboardProvider from '../../controllers/joystick/keyboardProvider';
import JoystickProvider, { GamepadInput } from '../../controllers/joystick/joystickProvider';

export class PauseMenu extends Scene {
    private playerController?: PlayerController;

    private readonly maxHealth = 28;

    // UI refs
    private container!: Phaser.GameObjects.Container;
    private weaponCells: Array<{ weapon: Weapons; x: number; y: number; bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; icon?: Phaser.GameObjects.Image; }>;
    private cursor!: Phaser.GameObjects.Rectangle;

    private healthBarSegments: Phaser.GameObjects.Rectangle[] = [];
    private lifeText!: Phaser.GameObjects.Text;
    private lifeTankText!: Phaser.GameObjects.Text;
    private useLifeTankHint!: Phaser.GameObjects.Text;

    private selectedIndex = 0;

    // input (same system as game)
    private keyboard!: KeyboardProvider;
    private controller!: JoystickProvider;
    private inputHandler!: InputHandler;
    private navCooldownMs = 0;

    // player portrait
    private portraitAnim?: Phaser.GameObjects.Sprite;

    private resolveAttempts = 0;

    constructor() {
        super({ key: 'PauseMenu' });
        this.weaponCells = [];
    }

    create() {
        // Find the current gameplay scene and get playerController.
        this.resolvePlayerController();

        // Input setup (keyboard + gamepad)
        this.keyboard = new KeyboardProvider(this);
        this.controller = new JoystickProvider(this, 0);
        this.inputHandler = new InputHandler(this, {
            left: [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.LEFT),
                this.controller.getInput(GamepadInput.Left),
            ],
            right: [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.RIGHT),
                this.controller.getInput(GamepadInput.Right),
            ],
            up: [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.UP),
                this.controller.getInput(GamepadInput.Up),
            ],
            down: [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.DOWN),
                this.controller.getInput(GamepadInput.Down),
            ],
            confirm: [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.ENTER),
                this.controller.getInput(GamepadInput.A),
            ],
            cancel: [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.ESC),
                this.controller.getInput(GamepadInput.Start),
            ],
            start: [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.ESC),
                this.controller.getInput(GamepadInput.Start),
            ],
            X: [
                this.keyboard.getInput(Phaser.Input.Keyboard.KeyCodes.X),
                this.controller.getInput(GamepadInput.X),
            ],
        });

        const { width, height } = this.scale;

        // Fullscreen dark background
        this.add.rectangle(0, 0, width, height, 0x000000, 0.92).setOrigin(0);

        this.container = this.add.container(0, 0);

        // Frame
        const framePadding = 16;
        const frame = this.add.rectangle(framePadding, framePadding, width - framePadding * 2, height - framePadding * 2, 0x0b0b16, 1)
            .setOrigin(0)
            .setStrokeStyle(2, 0x7aa0ff, 1);
        this.container.add(frame);

        // Title
        const title = this.add.text(width / 2, framePadding + 10, 'PAUSE', {
            fontSize: '22px',
            color: '#ffffff',
            fontFamily: 'GameFont',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0);
        this.container.add(title);

        // Left panel: weapons grid
        const leftX = framePadding + 18;
        const topY = framePadding + 50;
        const gridW = Math.floor(width * 0.58);
        const gridH = height - topY - (framePadding + 16);

        const gridFrame = this.add.rectangle(leftX, topY, gridW, gridH, 0x0f1a33, 0.9)
            .setOrigin(0)
            .setStrokeStyle(2, 0x3f63b3, 1);
        this.container.add(gridFrame);

        const weaponsTitle = this.add.text(leftX + 12, topY + 10, 'WEAPONS', {
            fontSize: '14px',
            color: '#ffffff',
            fontFamily: 'GameFont'
        });
        this.container.add(weaponsTitle);

        // Build list of available weapons from cache (saved game state).
        const weaponList = this.getAvailableWeapons();

        // Grid (2 columns like classic Mega Man pause)
        const cols = 2;
        const cellW = Math.floor((gridW - 24) / cols);
        const cellH = 32;
        const startX = leftX + 12;
        const startY = topY + 34;

        this.weaponCells = [];
        weaponList.forEach((weapon, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const x = startX + col * cellW;
            const y = startY + row * (cellH + 10);

            const bg = this.add.rectangle(x, y, cellW - 8, cellH, 0x101a2e, 1)
                .setOrigin(0)
                .setStrokeStyle(1, 0x2b3d6d, 1);

            // Weapon icon (first frame of its atlas/texture)
            const icon = this.createWeaponIcon(weapon, x + 12, y + 16);

            const label = this.add.text(x + 28, y + 8, weapon, {
                fontSize: '12px',
                color: '#dfe9ff',
                fontFamily: 'GameFont'
            }).setOrigin(0, 0);

            this.container.add(bg);
            if (icon) this.container.add(icon);
            this.container.add(label);

            this.weaponCells.push({ weapon, x, y, bg, label, icon: icon ?? undefined });
        });

        // Cursor
        this.cursor = this.add.rectangle(0, 0, cellW - 8, cellH, 0x000000, 0)
            .setOrigin(0)
            .setStrokeStyle(2, 0xffff00, 1);
        this.container.add(this.cursor);

        // Right panel: player status
        const rightX = leftX + gridW + 14;
        const rightW = width - rightX - (framePadding + 18);
        const rightFrame = this.add.rectangle(rightX, topY, rightW, gridH, 0x0f1a33, 0.9)
            .setOrigin(0)
            .setStrokeStyle(2, 0x3f63b3, 1);
        this.container.add(rightFrame);

        const statusTitle = this.add.text(rightX + 12, topY + 10, 'STATUS', {
            fontSize: '14px',
            color: '#ffffff',
            fontFamily: 'GameFont'
        });
        this.container.add(statusTitle);

        // Player portrait frame (black box) + idle sprite
        const portraitBoxX = rightX + Math.floor(rightW / 2);
        const portraitBoxY = topY + 80;
        const portraitBox = this.add.rectangle(portraitBoxX, portraitBoxY, 84, 84, 0x000000, 1)
            .setOrigin(0.5)
            .setStrokeStyle(2, 0x7aa0ff, 1);
        this.container.add(portraitBox);

        this.portraitAnim = this.add.sprite(portraitBoxX, portraitBoxY + 8, 'santa_claus');
        this.portraitAnim.setScale(2);
        this.portraitAnim.setOrigin(0.5, 0.75);
        // If there is an idle animation in the project, try to play it.
        try {
            if (this.anims.exists('idle')) {
                this.portraitAnim.play('idle');
            }
        } catch {
            // ignore
        }
        this.container.add(this.portraitAnim);

        // Health segmented bar (0-28)
        const hpLabel = this.add.text(rightX + 12, topY + 120, 'HP', {
            fontSize: '12px',
            color: '#ffffff',
            fontFamily: 'GameFont'
        });
        this.container.add(hpLabel);

        this.createHealthSegments(rightX + 12, topY + 138, rightW - 24);

        // Lives
        this.lifeText = this.add.text(rightX + 12, topY + 170, '', {
            fontSize: '12px',
            color: '#ffffff',
            fontFamily: 'GameFont'
        });
        this.container.add(this.lifeText);

        // Life tanks
        this.lifeTankText = this.add.text(rightX + 12, topY + 192, '', {
            fontSize: '12px',
            color: '#ffffff',
            fontFamily: 'GameFont'
        });
        this.container.add(this.lifeTankText);

        // Use life tank hint
        this.useLifeTankHint = this.add.text(rightX + 12, topY + gridH - 50, '', {
            fontSize: '12px',
            color: '#dfe9ff',
            fontFamily: 'GameFont'
        });
        this.container.add(this.useLifeTankHint);

        // Footer
        const footer = this.add.text(width / 2, height - framePadding - 14, 'D-Pad/Arrows: Select  |  A/Enter: Equip  |  X: Tank  |  Start/Esc: Resume', {
            fontSize: '10px',
            color: '#cbd8ff',
            fontFamily: 'GameFont'
        }).setOrigin(0.5, 1);
        this.container.add(footer);

        this.selectedIndex = 0;
        this.refresh();

        // Scene events
        this.events.on('wake', this.onWake, this);

        // Game events
        events.on(GameEvents.LifeTankUsed, this.refresh, this);
        events.on(GameEvents.HealthChanged, this.refresh, this);
        events.on(GameEvents.WeaponChanged, this.refresh, this);
    }

    update(time: number, delta: number) {
        // Keep trying to resolve for a short time window (UI may resolve on pause event)
        if (!this.playerController && this.resolveAttempts < 30) {
            this.resolvePlayerController();
            this.resolveAttempts++;
            if (this.playerController) {
                console.log('[PauseMenu] PlayerController resolved.');
                this.refresh();
            }
        }

        // Update same input providers used in-game
        this.controller.update(time, delta);
        this.keyboard.update(time, delta);

        if (this.navCooldownMs > 0) {
            this.navCooldownMs = Math.max(0, this.navCooldownMs - delta);
        }

        if (this.inputHandler.isJustDown('start') || this.inputHandler.isJustDown('cancel')) {
            this.resumeGame();
            return;
        }

        if (this.weaponCells.length === 0) return;

        if (this.navCooldownMs <= 0) {
            const cols = 2;
            const rows = Math.ceil(this.weaponCells.length / cols);

            let next = this.selectedIndex;
            if (this.inputHandler.isJustDown('left')) next = Math.max(0, this.selectedIndex - 1);
            if (this.inputHandler.isJustDown('right')) next = Math.min(this.weaponCells.length - 1, this.selectedIndex + 1);
            if (this.inputHandler.isJustDown('up')) next = Math.max(0, this.selectedIndex - cols);
            if (this.inputHandler.isJustDown('down')) next = Math.min(this.weaponCells.length - 1, this.selectedIndex + cols);

            // clamp to valid item for last row
            if (next !== this.selectedIndex) {
                const nRow = Math.floor(next / cols);
                if (nRow >= rows) next = this.selectedIndex;
                this.selectedIndex = next;
                this.navCooldownMs = 110;
                this.refresh();
            }
        }

        if (this.inputHandler.isJustDown('confirm')) {
            const selected = this.weaponCells[this.selectedIndex];
            if (selected) {
                this.playerController?.setWeapon(selected.weapon);
                this.refresh();
            }
        }

        if (this.inputHandler.isJustDown('X')) {
            this.tryUseLifeTank();
        }
    }

    private createHealthSegments(x: number, y: number, w: number) {
        // 28 segments arranged in 2 rows of 14 (Mega Man-ish)
        const segments = 28;
        const perRow = 14;
        const segW = Math.floor((w - 2) / perRow) - 1;
        const segH = 6;
        const gap = 2;

        // clear if recreate
        this.healthBarSegments.forEach(s => s.destroy());
        this.healthBarSegments = [];

        for (let i = 0; i < segments; i++) {
            const row = Math.floor(i / perRow);
            const col = i % perRow;
            const sx = x + col * (segW + gap);
            const sy = y + row * (segH + gap);

            // background (empty)
            const bg = this.add.rectangle(sx, sy, segW, segH, 0x1f2b49, 1).setOrigin(0);
            this.container.add(bg);

            // fill segment (toggled in refresh)
            const fill = this.add.rectangle(sx, sy, segW, segH, 0x2ee66b, 1).setOrigin(0);
            this.container.add(fill);

            this.healthBarSegments.push(fill);
        }
    }

    private refresh() {
        // Scene might receive refresh calls while sleeping / before fully created.
        if (!this.scene.isActive()) return;

        // Guard: if UI objects are not ready yet, skip.
        if (!this.container || !this.lifeText || !this.lifeTankText || !this.useLifeTankHint || !this.cursor) {
            return;
        }

        // Cursor
        if (this.weaponCells.length > 0) {
            const cell = this.weaponCells[this.selectedIndex];
            if (cell) this.cursor.setPosition(cell.x, cell.y);
        }

        // Highlight
        for (let i = 0; i < this.weaponCells.length; i++) {
            const isSelected = i === this.selectedIndex;
            this.weaponCells[i].bg.setStrokeStyle(isSelected ? 2 : 1, isSelected ? 0xffff00 : 0x2b3d6d, 1);
        }

        // Right panel texts
        const hp = this.playerController?.getHealth() ?? 0;
        const lifeTanks = this.playerController?.getLifeTanks() ?? 0;

        // Update segmented health bar
        for (let i = 0; i < this.healthBarSegments.length; i++) {
            const segment = this.healthBarSegments[i];
            if (segment) segment.setVisible(i < hp);
        }

        this.lifeText.setText(`LIVES: ${this.playerController?.getLifeTankCount?.() ?? 0}`);
        this.lifeTankText.setText(`TANKS: ${lifeTanks}`);

        const canUseTank = lifeTanks > 0 && hp < this.maxHealth;
        this.useLifeTankHint.setText(canUseTank ? 'Press X to use Life Tank' : '');
        this.useLifeTankHint.setColor(canUseTank ? '#ffffff' : '#666666');
    }

    private tryUseLifeTank() {
        if (!this.playerController) return;
        if (this.playerController.useLifeTank()) {
            this.refresh();
        }
    }

    private onWake() {
        this.resolvePlayerController();
        this.refresh();
    }

    private resolvePlayerController() {
        const uiScene = this.scene.get('UI') as any;
        const fromUI = uiScene?.getPlayerController?.() ?? uiScene?.playerController;
        if (fromUI) {
            this.playerController = fromUI as PlayerController;
            return;
        }

        const activeScene = this.scene.manager.getScenes(true).find(scene =>
            scene.scene.key !== 'PauseMenu' && scene.scene.key !== 'UI'
        ) as any;
        if (activeScene?.playerController) {
            this.playerController = activeScene.playerController as PlayerController;
            return;
        }

        // Debug (optional)
        // console.log('[PauseMenu] PlayerController not found yet');
    }

    private resumeGame() {
        this.scene.sleep();
        events.emit(GameEvents.GameResumed);
    }

    private getAvailableWeapons(): Weapons[] {
        const allWeapons = Object.values(Weapons).filter(v => typeof v === 'string') as Weapons[];

        const gameState = this.cache.json.get('gameState');
        if (!gameState?.Weapons) return allWeapons;

        const available: Weapons[] = [];
        for (const w of allWeapons) {
            const entry = gameState.Weapons[w];
            if (!entry) {
                available.push(w);
                continue;
            }
            if (entry.available) available.push(w);
        }

        return available.length ? available : allWeapons;
    }

    private createWeaponIcon(weapon: Weapons, x: number, y: number): Phaser.GameObjects.Image | null {
        // Use the weapon texture/atlas loaded in LoadingScene.
        // The atlas keys are created as `${spritesheet}_atlas` in loadingScene.
        try {
            const atlasBase = weaponToAtlasBase(weapon);
            if (!atlasBase) return null;

            const atlasKey = atlasBase.endsWith('_atlas') ? atlasBase : `${atlasBase}_atlas`;

            if (this.textures.exists(atlasKey)) {
                // If there is an atlas, pick the first frame.
                const tex = this.textures.get(atlasKey) as any;
                const frames = tex.getFrameNames?.() ?? [];
                const frame = frames.length ? frames[0] : undefined;
                return this.add.image(x, y, atlasKey, frame).setOrigin(0.5).setScale(0.8);
            }

            // Fallback: try direct spritesheet texture
            if (this.textures.exists(atlasBase)) {
                return this.add.image(x, y, atlasBase, 0).setOrigin(0.5).setScale(0.8);
            }

            return null;
        } catch {
            return null;
        }
    }

    shutdown() {
        this.events.off('wake');
        events.off(GameEvents.LifeTankUsed, this.refresh, this);
        events.off(GameEvents.HealthChanged, this.refresh, this);
        events.off(GameEvents.WeaponChanged, this.refresh, this);
    }
}

function weaponToAtlasBase(weapon: Weapons): string | null {
    // Map to the asset keys defined in GameUtils.Weapons.spritesheet
    switch (weapon) {
        case Weapons.SnowBuster:
            return WeaponsAtlas.SnowBuster;
        case Weapons.CandyBoomerang:
            // candy_boomerang does not have json, but is loaded as spritesheet; we still return base
            return WeaponsAtlas.CandyBoomerang;
        case Weapons.LaserBeam:
            return WeaponsAtlas.LaserBeam;
        case Weapons.IceBlock:
            return WeaponsAtlas.IceBlock;
        default:
            return null;
    }
}
