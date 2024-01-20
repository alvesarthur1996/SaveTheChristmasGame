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
        {key:'milk_tank', path: 'sprites/objects/milk_tank.png'},
        {key:'small_health', path: 'sprites/objects/small_life.png'},
        {key:'weapon_energy', path: 'sprites/objects/weapon_energy.png'},
        {key:'megacommando', path: 'maps/mad_factory/megacommando.png'},
        {key:'other_candy_blocks', path: 'maps/candy_land/other_candy_blocks.png'},
        {key:'new_candy_options', path: 'maps/candy_land/new_candy_options.png'},
        {key:'tileset_candy', path: 'maps/candy_land/tileset_candy.png'},
        {key:'tiles_test', path: 'maps/candy_land/tiles_test.png'},
        {key:'candies_factory', path: 'maps/candy_land/candies_factory.png'},
        {key:'candies_props', path: 'maps/candy_land/candies_props.png'},
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
        }
    ],
}