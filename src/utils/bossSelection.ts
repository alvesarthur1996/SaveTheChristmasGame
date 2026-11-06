import DefaultScene from "../scenes/defaultScene";
import { sharedInstance as events } from "../scenes/eventCentre";
import GameEvents from "./events";
import BossController from "../controllers/characters/bosses/bossController";
import GingerMadController from "../controllers/characters/bosses/gingerMadController";
import RudolphTheRedController from "../controllers/characters/bosses/rudolphTheRedController";
import YetiController from "../controllers/characters/bosses/yetiController";
import Boss from "./boss";

const BOSS_ALIASES: Record<string, Boss> = {
    gingermad: Boss.GingerMad,
    ginger: Boss.GingerMad,
    rudolph: Boss.RudolphTheRed,
    rudolphthered: Boss.RudolphTheRed,
    yeti: Boss.Yeti,
};

// Debug helper: `?boss=gingermad|rudolph|yeti` replaces the stage's default boss.
export function getBossOverride(): Boss | null {
    const raw = new URLSearchParams(window.location.search).get('boss');
    if (!raw) return null;
    return BOSS_ALIASES[raw.toLowerCase().replace(/[^a-z]/g, '')] ?? null;
}

export function createBoss(boss: Boss, scene: DefaultScene, player: Phaser.Physics.Matter.Sprite): BossController {
    switch (boss) {
        case Boss.RudolphTheRed:
            return new RudolphTheRedController(scene, player);
        case Boss.Yeti:
            return new YetiController(scene, player);
        default:
            return new GingerMadController(scene, player);
    }
}

// Shared boss intro: wait for the landing, optionally run a stage-specific `prepare` step
// (e.g. fade), fill the boss bar one unit at a time, then release boss and player together.
export function runBossIntro(
    scene: DefaultScene,
    boss: BossController,
    opts: { prepare?: (start: () => void) => void; onFinish?: () => void } = {},
) {
    const fillBar = () => {
        let fill = 0;
        scene.time.addEvent({
            delay: 100,
            repeat: 27,
            callback: () => {
                fill++;
                scene.sound.play('energy_up', { volume: scene.SoundOptions.SFX / 10 });
                events.emit(GameEvents.BossHealthChanged, fill);
                if (fill >= 28) {
                    boss.finishIntro();
                    opts.onFinish?.();
                }
            },
        });
    };

    const landingCheck = scene.time.addEvent({
        delay: 50,
        loop: true,
        callback: () => {
            if (!boss.isIntroLanded()) return;
            landingCheck.remove(false);
            if (opts.prepare) opts.prepare(fillBar);
            else fillBar();
        },
    });
}
