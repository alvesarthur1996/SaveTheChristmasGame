import { loadOptions, SoundOptions } from "../utils/options";
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
}