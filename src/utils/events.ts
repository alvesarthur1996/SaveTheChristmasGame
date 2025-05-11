export enum GameEvents {
    LifeGain = "LifeGain",
    LifeLoss = "LifeLoss",
    HealthChanged = "HealthChanged",
    CollectLifeTank = "CollectLifeTank",
    UseLifeTank = "UseLifeTank",
    LifeTankUsed = "LifeTankUsed",
    GamePaused = "GamePaused",
    GameResumed = "GameResumed",
    BossArrived = "BossArrived",
    BossHealthChanged = "BossHealthChanged",
    WeaponChanged = "WeaponChanged",
    WeaponEnergyChanged = "WeaponEnergyChanged",
    OptionsChangesConfirmed = "OptionsChangesConfirmed",
    OptionChanged = "OptionChanged",
    SoundOptionsChanged = "SoundOptionsChanged",
}

export enum HealthChange {
    SmallHealth = 5,
    BigHealth = 10,
    LifeTank = 28
}

export enum RoomEvents {
    RoomCamera = "room_camera_trigger",
    Room2Camera = "room_2_camera_trigger",
    Room3Camera = "room_3_camera_trigger",
    Room4Camera = "room_4_camera_trigger",
    Room5Camera = "room_5_camera_trigger",
    Room6Camera = "room_6_camera_trigger",
    BossCamera = "room_boss_camera_trigger"
}

export default GameEvents;