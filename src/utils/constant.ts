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
        {key:'tiles_test', path: 'maps/candy_land/tiles_test.png'},
        {key:'background', path: 'maps/candy_land/scifi_platform_BG1.jpg'},
        {key:'big_health', path: 'sprites/objects/big_life.png'},
        {key:'milk_tank', path: 'sprites/objects/milk_tank.png'},
        {key:'small_health', path: 'sprites/objects/small_life.png'},
        {key:'weapon_energy', path: 'sprites/objects/weapon_energy.png'},
    ],
    Audios: [
        // {key:'main_menu', path: '/sounds/menu/main_menu.wav'},
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