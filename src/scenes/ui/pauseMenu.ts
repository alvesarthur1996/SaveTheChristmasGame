import { Scene } from 'phaser';
import GameEvents from '../../utils/events';
import PlayerController from '../../controllers/characters/playerController';
import { sharedInstance as events } from '../../scenes/eventCentre';
import { Weapons } from '../../utils/weapons';

type Focus = 'weapons' | 'items';
type WeaponRow = { weapon: Weapons; energy: number | null; current: boolean };

const WEAPON_LABELS: Record<Weapons, string> = {
    [Weapons.SnowBuster]: 'S. BUSTER',
    [Weapons.CandyBoomerang]: 'C. BOOMERANG',
    [Weapons.LaserBeam]: 'L. BEAM',
    [Weapons.IceBlock]: 'I. BLOCK',
};

const COLORS = {
    frame: 0x38e8e8,
    panel: 0x000000,
    line: 0xc8c8c8,
    rivet: 0x2038ec,
    energy: 0x80d0ff,
    energyBack: 0x303030,
    selected: '#38e8e8',
    normal: '#ffffff',
    disabled: '#666666',
};

const SLOTS = 8;
const ROW_H = 42;
const ICON = 34;
const WEAPON_ICONS: Record<Weapons, string> = {
    [Weapons.SnowBuster]: 'snow_buster',
    [Weapons.CandyBoomerang]: 'candy_boomerang',
    [Weapons.LaserBeam]: 'laser_beam',
    [Weapons.IceBlock]: 'ice_block',
};
const MAX_ENERGY = 28;
const FONT = 'GameFont';

export class PauseMenu extends Scene {
    private playerController?: PlayerController;
    private content!: Phaser.GameObjects.Container;
    private focus: Focus = 'weapons';
    private cursor = 0;
    private rows: Array<WeaponRow | undefined> = [];
    private armed = false;
    private refilling = false;
    private keys!: Record<string, Phaser.Input.Keyboard.Key>;
    private padHeld = new Set<number>();

    constructor() {
        super({ key: 'PauseMenu' });
    }

    create() {
        this.findPlayer();
        this.focus = 'weapons';
        this.armed = false;
        this.refilling = false;
        this.primePad();

        const kb = this.input.keyboard!;
        this.keys = {
            up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
            down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
            left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
            right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
            w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            s: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            confirm: kb.addKey(Phaser.Input.Keyboard.KeyCodes.K),
            enter: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
            esc: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
        };

        this.events.on('wake', this.onWake, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
        this.render();
    }

    update() {
        const pad = this.input.gamepad?.gamepads[0];

        // The Start press that opened the menu may still reach this scene; ignore input until it is released.
        if (!this.armed) {
            const startHeld = this.keys.enter.isDown || this.keys.esc.isDown || !!pad?.buttons[9]?.pressed;
            if (!startHeld) {
                this.armed = true;
                this.keys.enter.reset();
                this.keys.esc.reset();
                this.primePad();
            }
            return;
        }

        const key = (name: string) => Phaser.Input.Keyboard.JustDown(this.keys[name]);
        if (this.refilling) return;
        const pressed = (index: number) => {
            const down = !!pad?.buttons[index]?.pressed;
            const fresh = down && !this.padHeld.has(index);
            if (down) this.padHeld.add(index); else this.padHeld.delete(index);
            return fresh;
        };

        const up = key('up') || key('w') || pressed(12);
        const down = key('down') || key('s') || pressed(13);
        const left = key('left') || key('a') || pressed(14);
        const right = key('right') || key('d') || pressed(15);
        const confirm = key('confirm') || pressed(0);
        const start = key('enter') || key('esc') || pressed(9);

        if (start) {
            this.resumeGame();
            return;
        }
        if (right && this.focus === 'weapons') this.setFocus('items');
        if (left && this.focus === 'items') this.setFocus('weapons');
        if (up) this.moveCursor(-1);
        if (down) this.moveCursor(1);
        if (confirm) this.confirm();
    }

    // Buttons already held when the menu opens (e.g. Start) must not count as new presses.
    private primePad() {
        this.padHeld.clear();
        const pad = this.input.gamepad?.gamepads[0];
        pad?.buttons.forEach((button, index) => {
            if (button.pressed) this.padHeld.add(index);
        });
    }

    private setFocus(focus: Focus) {
        this.focus = focus;
        this.playMove();
        this.render();
    }

    private moveCursor(delta: number) {
        if (this.focus !== 'weapons') return;
        let next = this.cursor + delta;
        while (next >= 0 && next < SLOTS && !this.rows[next]) next += delta;
        if (next < 0 || next >= SLOTS) return;
        this.cursor = next;
        this.playMove();
        this.render();
    }

    private confirm() {
        if (this.focus === 'weapons') {
            const row = this.rows[this.cursor];
            if (row) this.playerController?.selectWeapon(row.weapon);
        } else if (this.playerController?.consumeLifeTank()) {
            this.startRefill();
            return;
        }
        this.render();
    }

    private startRefill() {
        this.refilling = true;
        this.render();
        this.time.addEvent({
            delay: 70,
            repeat: MAX_ENERGY,
            callback: () => {
                const health = this.playerController?.addHealth(1) ?? MAX_ENERGY;
                this.sound.play('energy_up', { volume: this.getSfxVolume() });
                this.render();
                if (health >= MAX_ENERGY) {
                    this.refilling = false;
                    this.time.removeAllEvents();
                }
            },
        });
    }

    private playMove() {
        this.sound.play('menu_selector', { volume: this.getSfxVolume() });
    }

    private getSfxVolume(): number {
        const stage = this.getStage() as unknown as { SoundOptions?: { SFX: number } } | undefined;
        return (stage?.SoundOptions?.SFX ?? 10) / 10;
    }

    private getStage(): Phaser.Scene | undefined {
        return this.scene.manager.getScenes(false).find(scene =>
            scene.scene.key !== 'PauseMenu'
            && scene.scene.key !== 'UI'
            && (scene.scene.isPaused() || scene.scene.isActive())
            // @ts-ignore - Stage scenes expose their player controller.
            && !!scene.playerController
        );
    }

    // Fixed slots follow the Weapons enum order; locked weapons leave their slot empty.
    private loadRows(): Array<WeaponRow | undefined> {
        const status = this.playerController?.getWeaponStatus() ?? [];
        return Object.values(Weapons).map(weapon => status.find(row => row.weapon === weapon));
    }

    private findPlayer() {
        // @ts-ignore - Stage scenes expose their player controller.
        this.playerController = this.getStage()?.playerController;
        this.rows = this.loadRows();
        const currentIndex = this.rows.findIndex(row => row?.current);
        this.cursor = currentIndex >= 0 ? currentIndex : 0;
    }

    private render() {
        this.content?.destroy();
        this.rows = this.loadRows();
        this.content = this.add.container(0, 0);

        const { width, height } = this.scale;
        this.drawBox(0, 0, width, height, COLORS.frame, 0.9);
        this.drawBox(14, 14, width - 28, height - 28, COLORS.panel, 1);
        this.drawRivets(width, height);

        const leftX = 36, topY = 36;
        const leftW = 430, panelH = 410;
        this.drawPanel(leftX, topY, leftW, panelH, 'WEAPONS');
        this.drawWeapons(leftX + 20, topY + 56);

        const rightX = leftX + leftW + 16;
        const rightW = width - rightX - 36;
        this.drawPanel(rightX, topY, rightW, panelH, 'ITEMS');
        this.drawItems(rightX + 20, topY + 56, rightW);

        this.drawStatusBar(36, topY + panelH + 16, width - 72, height - (topY + panelH) - 52);
    }

    private drawBox(x: number, y: number, w: number, h: number, color: number, alpha: number) {
        this.content.add(this.add.rectangle(x, y, w, h, color, alpha).setOrigin(0));
    }

    private drawRivets(width: number, height: number) {
        for (let x = 40; x < width - 20; x += 80) {
            this.content.add(this.add.rectangle(x, 7, 6, 6, COLORS.rivet));
            this.content.add(this.add.rectangle(x, height - 7, 6, 6, COLORS.rivet));
        }
        for (let y = 40; y < height - 20; y += 80) {
            this.content.add(this.add.rectangle(7, y, 6, 6, COLORS.rivet));
            this.content.add(this.add.rectangle(width - 7, y, 6, 6, COLORS.rivet));
        }
    }

    private drawPanel(x: number, y: number, w: number, h: number, title: string) {
        this.content.add(this.add.rectangle(x, y, w, h, COLORS.panel).setOrigin(0).setStrokeStyle(3, COLORS.line));
        const label = this.add.text(x + w / 2, y, title, {
            fontFamily: FONT, fontSize: '20px', color: COLORS.normal, padding: { x: 12, y: 6 },
        }).setOrigin(0.5, 0.5);
        const outline = this.add.rectangle(label.x, label.y, label.width, label.height, COLORS.panel)
            .setStrokeStyle(3, COLORS.line);
        this.content.add([outline, label]);
    }

    private drawWeapons(x: number, y: number) {
        for (let i = 0; i < SLOTS; i++) {
            const row = this.rows[i];
            const rowY = y + i * ROW_H;
            const selected = this.focus === 'weapons' && i === this.cursor;
            this.drawIcon(x, rowY, row ? WEAPON_ICONS[row.weapon] : undefined, selected, !selected);

            if (!row) continue;
            const color = selected ? COLORS.selected : COLORS.normal;
            const marker = row.current ? '>' : ' ';
            this.content.add(this.add.text(x + 50, rowY - 4, `${marker}${WEAPON_LABELS[row.weapon]}`, {
                fontFamily: FONT, fontSize: '18px', color,
            }));
            this.drawEnergy(x + 50, rowY + 24, row.energy, selected);
        }
    }

    private drawIcon(x: number, y: number, texture: string | undefined, selected: boolean, grayscale = false) {
        const box = this.add.rectangle(x, y, ICON, ICON, COLORS.panel)
            .setOrigin(0)
            .setStrokeStyle(2, selected ? COLORS.frame : COLORS.line);
        this.content.add(box);
        if (texture && this.textures.exists(texture)) {
            const frame = texture === 'life_tank' ? undefined : 0;
            const key = grayscale ? this.getGrayTexture(texture, frame) : texture;
            const image = this.add.image(x + ICON / 2, y + ICON / 2, key, grayscale ? undefined : frame);
            image.setScale(Math.min(1, (ICON - 6) / image.width, (ICON - 6) / image.height));
            this.content.add(image);
        }
    }

    // Black and white copy of a texture frame, built once and cached.
    private getGrayTexture(texture: string, frame?: number): string {
        const grayKey = `${texture}_gray`;
        if (this.textures.exists(grayKey)) return grayKey;

        const source = this.textures.getFrame(texture, frame);
        const canvas = this.textures.createCanvas(grayKey, source.width, source.height);
        if (!canvas) return texture;

        const ctx = canvas.getContext();
        ctx.drawImage(source.source.image as CanvasImageSource, source.cutX, source.cutY, source.width, source.height, 0, 0, source.width, source.height);
        const data = ctx.getImageData(0, 0, source.width, source.height);
        for (let i = 0; i < data.data.length; i += 4) {
            const gray = Math.round(data.data[i] * 0.3 + data.data[i + 1] * 0.59 + data.data[i + 2] * 0.11);
            data.data[i] = data.data[i + 1] = data.data[i + 2] = gray;
        }
        ctx.putImageData(data, 0, 0);
        canvas.refresh();
        return grayKey;
    }

    // Segmented bar; the default weapon has no energy limit, so it is always full.
    private drawEnergy(x: number, y: number, energy: number | null, highlighted: boolean) {
        const value = energy === null ? MAX_ENERGY : Phaser.Math.Clamp(Math.round(energy), 0, MAX_ENERGY);
        for (let i = 0; i < MAX_ENERGY; i++) {
            const filled = i < value;
            const color = filled ? (highlighted ? COLORS.frame : COLORS.energy) : COLORS.energyBack;
            this.content.add(this.add.rectangle(x + i * 5, y, 3, 8, color).setOrigin(0));
        }
    }

    private drawItems(x: number, y: number, w: number) {
        const tanks = this.playerController?.getLifeTanks() ?? 0;
        const health = this.playerController?.getHealth() ?? 0;
        const usable = tanks > 0 && health < MAX_ENERGY;
        const selected = this.focus === 'items';
        const innerW = w - 40;
        const text = (tx: number, ty: number, value: string, size: number, color: string, originX = 0) =>
            this.content.add(this.add.text(tx, ty, value, { fontFamily: FONT, fontSize: `${size}px`, color }).setOrigin(originX, 0));

        this.drawIcon(x, y, 'life_tank', selected && usable);
        const color = !usable ? COLORS.disabled : selected ? COLORS.selected : COLORS.normal;
        text(x + 48, y - 2, 'MILK TANK', 16, color);
        text(x + 48, y + 20, 'FULL HEAL', 12, COLORS.disabled);
        text(x + innerW, y + 44, `x ${tanks}`, 16, COLORS.normal, 1);

        const dividerY = y + 120;
        this.content.add(this.add.rectangle(x, dividerY, innerW, 2, COLORS.line).setOrigin(0));
        text(x, dividerY + 12, 'CONTROLS', 14, COLORS.selected);

        const controls: Array<[string, string]> = [
            ['< >', 'PANEL'],
            ['^ v', 'SELECT'],
            ['K / A', 'CONFIRM'],
            ['START', 'RESUME'],
        ];
        controls.forEach(([keys, action], index) => {
            const rowY = dividerY + 44 + index * 30;
            text(x, rowY, keys, 12, COLORS.normal);
            text(x + innerW, rowY, action, 12, COLORS.disabled, 1);
        });
    }

    private drawStatusBar(x: number, y: number, w: number, h: number) {
        this.content.add(this.add.rectangle(x, y, w, h, COLORS.panel).setOrigin(0).setStrokeStyle(3, COLORS.line));
        const tanks = this.playerController?.getLifeTanks() ?? 0;
        const lives = this.playerController?.getLifeTankCount() ?? 0;
        const health = this.playerController?.getHealth() ?? 0;
        const cy = y + h / 2;
        const style = { fontFamily: FONT, fontSize: '18px', color: COLORS.normal };

        this.content.add(this.add.text(x + 20, cy, `E x${tanks}`, style).setOrigin(0, 0.5));
        this.content.add(this.add.text(x + 150, cy, `LIFE x${lives}`, style).setOrigin(0, 0.5));
        this.content.add(this.add.text(x + 340, cy, 'HP', style).setOrigin(0, 0.5));
        this.drawEnergy(x + 400, cy - 4, health, false);
    }

    private onWake() {
        this.findPlayer();
        this.focus = 'weapons';
        this.armed = false;
        this.refilling = false;
        this.primePad();
        this.render();
    }

    private resumeGame() {
        events.emit(GameEvents.GameResumed);
    }

    shutdown() {
        this.events.off('wake', this.onWake, this);
    }
}
