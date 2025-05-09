import { BossWeapon } from "../utils/boss";
import { saveGameState } from "../utils/gameState";
import { loadOptions, SoundOptions } from "../utils/options";
import Stages from "../utils/stages";
import { Weapons } from "../utils/weapons";
import { sharedInstance as events } from "./eventCentre";

export default class DefaultScene extends Phaser.Scene {
    public SoundOptions: SoundOptions;
    protected options: any;

    constructor(config?: string | Phaser.Types.Scenes.SettingsConfig) {
        super(config);
        this.SoundOptions = { BGM: 10, SFX: 10 };
        loadOptions()
            .then(opt => {
                this.SoundOptions = { BGM: opt.Sound.BGM, SFX: opt.Sound.SFX };
            });
    }

    load_options() {
        this.options = this.cache.json.get('config');

        events.on('options_changes_confirmed', () => {
            loadOptions()
                .then(opt => {
                    this.options = opt;
                    this.SoundOptions = this.options.Sound;
                    events.emit('sound_options_changed');
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