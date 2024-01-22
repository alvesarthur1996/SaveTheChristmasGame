export enum GameEvents {
    LifeGain = "LifeGain",
    LifeLoss = "LifeLoss",
    CollectLifeTank = "CollectLifeTank",
    UseLifeTank = "UseLifeTank",
}

export enum HealthChange {
    SmallHealth = 5,
    BigHealth = 10,
    LifeTank = 28
}

export default GameEvents;