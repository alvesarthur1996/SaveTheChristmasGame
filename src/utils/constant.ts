const BossSprites = [
    {
        spritesheet: "gingermad",
        spritesheet_path: "sprites/characters/bosses/gingermad/gingermad",
        config: { frameHeight: 32, frameWidth: 32 }
    },
    {
        spritesheet: "rudolph_the_red",
        spritesheet_path: "sprites/characters/bosses/rudolph_the_red/rudolph_the_red",
        config: { frameHeight: 32, frameWidth: 32 }
    },
    {
        spritesheet: "yeti",
        spritesheet_path: "sprites/characters/bosses/yeti/yeti",
        config: { frameHeight: 32, frameWidth: 32 }
    },
];

const BossAvatars = [
    { key: 'santa_avatar', path: 'images/santa_avatar.jpg' },
    { key: 'rudolph_avatar', path: 'images/boss_avatar/rudolph_the_red.jpg' },
    { key: 'ginger_mad_avatar', path: 'images/boss_avatar/ginger_mad.jpg' },
    { key: 'yeti_avatar', path: 'images/boss_avatar/yeti.jpg' },
    { key: 'frosty_avatar', path: 'images/boss_avatar/frosty.jpg' },
    { key: 'jack_avatar', path: 'images/boss_avatar/jack.jpg' },
    { key: 'elf_avatar', path: 'images/boss_avatar/elf.jpg' },
    { key: 'bad_boy_avatar', path: 'images/boss_avatar/bad_boy.jpg' },
    { key: 'greedy_green_avatar', path: 'images/boss_avatar/greedy_green.jpg' }
];

const BossLoadingBackgrounds = [
    { key: 'frosty_loading', path: 'images/loading_stages/frosty_loading.jpeg' },
    { key: 'gingermad_loading', path: 'images/loading_stages/gingermad_loading.jpeg' },
    { key: 'yeti_loading', path: 'images/loading_stages/yeti_loading.jpeg' },
    { key: 'rudolph_loading', path: 'images/loading_stages/rudolph_loading.jpeg' },
    { key: 'jack_loading', path: 'images/loading_stages/jack_loading.jpeg' },
    { key: 'elf_loading', path: 'images/loading_stages/elf_loading.jpeg' },
    { key: 'bad_boy_loading', path: 'images/loading_stages/bad_boy_loading.jpeg' },
    { key: 'greedy_green_loading', path: 'images/loading_stages/greedy_green_loading.jpeg' },
]

export const GameUtils: any = {
    Scenes: {
        Loading: {
            Key: "LoadingScene"
        }
    },
    Images: [
        ...BossLoadingBackgrounds,
        ...BossAvatars,
        { key: 'stage_select', path: 'images/stage_select.png' },
        { key: 'stage_select_cursor', path: 'images/stage_select_cursor.png' },
        
        { key: 'you_got_a_new_weapon', path: 'images/you_got_a_new_weapon.jpg' },
        
        { key: 'big_health', path: 'sprites/objects/big_life.png' },
        { key: 'life_tank', path: 'sprites/objects/milk_tank.png' },
        { key: 'small_health', path: 'sprites/objects/small_life.png' },
        { key: 'weapon_energy', path: 'sprites/objects/weapon_energy.png' },
        { key: 'game_title', path: 'images/game_title.jpeg' },

        { key: 'megacommando', path: 'maps/mad_factory/megacommando.png' },

        { key: 'other_candy_blocks', path: 'maps/candy_land/other_candy_blocks.png' },
        { key: 'new_candy_options', path: 'maps/candy_land/new_candy_options.png' },
        { key: 'tileset_candy', path: 'maps/candy_land/tileset_candy.png' },
        { key: 'tiles_test', path: 'maps/candy_land/tiles_test.png' },
        { key: 'candies_factory', path: 'maps/candy_land/candies_factory.png' },
        { key: 'candies_props', path: 'maps/candy_land/candies_props.png' },
        { key: 'candy_land_background_image', path: 'maps/candy_land/background.jpg' },

        { key: 'ice_spikes', path: 'maps/cold_mountains/ice_spikes.png' },
        { key: 'icicle', path: 'maps/cold_mountains/icicle.png' },
        { key: 'terrain-tileset', path: 'maps/cold_mountains/terrain-tileset.png' },
        { key: 'tileset_snow', path: 'maps/cold_mountains/tileset_snow.png' },
        { key: 'trees', path: 'maps/cold_mountains/trees.png' },
        { key: 'background/background_image', path: 'maps/cold_mountains/background/background1.png' },
        { key: 'background/background_overlay_2', path: 'maps/cold_mountains/background/background2.png' },
        { key: 'background/background_overlay_3', path: 'maps/cold_mountains/background/background3.png' },

        { key: 'avalon_logo', path: 'images/logos/logo.jpg' },
    ],
    Audios: [
        { key: 'death', path: '/sounds/death.mp3' },
        { key: 'candy_land_stage', path: '/sounds/candy_land_stage.wav' },
        { key: 'boss_splash', path: '/sounds/boss_splash.wav' },
        { key: 'cursor_move', path: '/sounds/cursor_move.wav' },
        { key: 'snow_buster', path: '/sounds/snow_buster.wav' },
        { key: 'laser_beam', path: '/sounds/laser_beam.wav' },
        { key: 'select_stage', path: '/sounds/select_stage.wav' },
        { key: 'boss_fight', path: '/sounds/boss_fight.mp3' },
        { key: 'main_menu', path: '/sounds/main_menu.wav' },
        { key: 'intro_menu', path: '/sounds/intro/br_theme.mp3' },
    ],
    Sprites: [
        ...BossSprites,
        {
            spritesheet: "energy_bar",
            spritesheet_path: "sprites/ui/energy_bar/energy_bar",
            config: { frameHeight: 32, frameWidth: 32 }
        },
        {
            spritesheet: "santa_claus",
            spritesheet_path: "sprites/characters/santa_claus/santa_claus",
            config: { frameHeight: 32, frameWidth: 32 }
        },
        {
            spritesheet: "met",
            spritesheet_path: "sprites/characters/enemies/met/met",
            config: { frameHeight: 32, frameWidth: 32 }
        },
    ],
    Weapons: [
        {
            spritesheet: "snow_buster",
            spritesheet_path: "sprites/weapons/snow_buster/snow_buster",
            config: { frameHeight: 32, frameWidth: 32 }
        },
        {
            spritesheet: "candy_boomerang",
            spritesheet_path: "sprites/weapons/candy_boomerang/candy_boomerang",
            config: { frameHeight: 23, frameWidth: 13 }
        },
        {
            spritesheet: "ice_block",
            spritesheet_path: "sprites/weapons/ice_block/ice_block",
            config: { frameHeight: 16, frameWidth: 16 }
        },
        {
            spritesheet: "laser_beam",
            spritesheet_path: "sprites/weapons/laser_beam/laser_beam",
            config: { frameHeight: 20, frameWidth: 48 }
        },

    ]
}