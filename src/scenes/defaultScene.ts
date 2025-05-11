import Boss, { BossWeapon } from "../utils/boss";
import { saveGameState } from "../utils/gameState";
import { loadOptions, SoundOptions } from "../utils/options";
import Stages from "../utils/stages";
import { Weapons } from "../utils/weapons";
import GameEvents from "../utils/events";
import { sharedInstance as events } from "./eventCentre";

export default class DefaultScene extends Phaser.Scene {
    public SoundOptions: SoundOptions;
    protected options: any;
    public isPaused: boolean;

    constructor(config?: string | Phaser.Types.Scenes.SettingsConfig) {
        super(config);
        this.SoundOptions = { BGM: 10, SFX: 10 };
        this.isPaused = false;
        loadOptions()
            .then(opt => {
                this.SoundOptions = { BGM: opt.Sound.BGM, SFX: opt.Sound.SFX };
            });

        events.on(GameEvents.GameResumed, () => {
            console.log('Resume Game triggered');
            this.resumeGame();
        }, this);
    }

    create() {

    }

    public togglePause(): void {
        if (this.isPaused) {
            this.resumeGame();
        } else {
            this.pauseGame();
        }
    }

    public pauseGame(): void {
        console.log('pausing game', this.isPaused);
        if (!this.isPaused) {
            this.isPaused = true;
            this.scene.pause(this.scene.key);
            this.scene.pause('UI');
            // Launch pause menu scene
            this.scene.launch('PauseMenu');
            events.emit(GameEvents.GamePaused);
        }
    }

    public resumeGame(): void {
        console.log('resuming game', this.isPaused);
        if (this.isPaused) {
            this.isPaused = false;
            this.scene.resume(this.scene.key);
            this.scene.resume('UI');
            this.scene.stop('PauseMenu');
            console.log('ResumeCompleted', this.scene.key);
        }
    }

    load_options() {
        this.options = this.cache.json.get('config');

        events.on(GameEvents.OptionsChangesConfirmed, () => {
            loadOptions()
                .then(opt => {
                    this.options = opt;
                    this.SoundOptions = this.options.Sound;
                    events.emit(GameEvents.SoundOptionsChanged);
                })
        }, this);
    }

    on_stage_complete(currentScene: Stages, bossWeapon: BossWeapon | Weapons) {
        const gameState = this.cache.json.get('gameState');
        const currentInstance = this;

        gameState.Stages[currentScene].finished = true;
        gameState.Weapons[bossWeapon].available = true;

        saveGameState(gameState);
        setTimeout(() => {
            const currentScene = currentInstance.scene.scene;
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', function () {
                currentInstance.scene.stop(currentScene);
                currentInstance.scene.stop('UI');
                currentInstance.scene.start(Stages.StageComplete, { weapon: bossWeapon });
            });
        }, 3000);
    }
}