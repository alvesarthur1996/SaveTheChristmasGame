export const GameUtils: any =  {
    Scenes: {
        Loading: {
            Key:"LoadingScene"
        },
        Menu: {
            Main: {
                Key: "MainMenuScene"
            },
            Options: {
                Key: "OptionsMenuScene"
            },
        },
        Play: {
            Key:"PlayScene"
        },
    },
    Images: [
        {key:'loading_img', path: 'images/loading_img.png'},
        {key:'big_health', path: 'sprites/objects/big_life.png'},
        {key:'life_tank', path: 'sprites/objects/milk_tank.png'},
        {key:'small_health', path: 'sprites/objects/small_life.png'},
        {key:'weapon_energy', path: 'sprites/objects/weapon_energy.png'},
        {key:'megacommando', path: 'maps/mad_factory/megacommando.png'},
        {key:'other_candy_blocks', path: 'maps/candy_land/other_candy_blocks.png'},
        {key:'new_candy_options', path: 'maps/candy_land/new_candy_options.png'},
        {key:'tileset_candy', path: 'maps/candy_land/tileset_candy.png'},
        {key:'tiles_test', path: 'maps/candy_land/tiles_test.png'},
        {key:'candies_factory', path: 'maps/candy_land/candies_factory.png'},
        {key:'candies_props', path: 'maps/candy_land/candies_props.png'},
        {key:'game_title', path: 'images/game_title.jpeg'},
    ],
    Audios: [
        {key:'candy_land_stage', path: '/sounds/candy_land_stage.mp3'},
    ],
    Sprites: [
        {
            spritesheet: "santa_claus",
            spritesheet_path: "sprites/characters/santa_claus/santa_claus",
            config:{frameHeight: 32, frameWidth: 32}
        },
        {
            spritesheet: "met",
            spritesheet_path: "sprites/characters/enemies/met/met",
            config:{frameHeight: 32, frameWidth: 32}
        },
        {
            spritesheet: "gingermad",
            spritesheet_path: "sprites/characters/bosses/gingermad/gingermad",
            config:{frameHeight: 32, frameWidth: 32}
        },
        {
            spritesheet: "rudolph_the_red",
            spritesheet_path: "sprites/characters/bosses/rudolph_the_red/rudolph_the_red",
            config:{frameHeight: 32, frameWidth: 32}
        },
    ],
    Weapons: [
        {
            spritesheet: "snow_buster",
            spritesheet_path: "sprites/weapons/snow_buster/snow_buster",
            config:{frameHeight: 32, frameWidth: 32}
        },
        {
            spritesheet: "candy_boomerang",
            spritesheet_path: "sprites/weapons/candy_boomerang/candy_boomerang",
            config:{frameHeight: 23, frameWidth: 13}
        },
        {
            spritesheet: "ice_block",
            spritesheet_path: "sprites/weapons/ice_block/ice_block",
            config:{frameHeight: 16, frameWidth: 16}
        },
        {
            spritesheet: "laser_beam",
            spritesheet_path: "sprites/weapons/laser_beam/laser_beam",
            config:{frameHeight: 20, frameWidth: 48}
        },

    ]
}