export type GameState = {
  Stages: Record<string, { finished: boolean }>;
  Weapons: Record<string, { available: boolean }>;
};

export type GameSettings = {
  Sound: {
    BGM: number;
    SFX: number;
  };
};

export interface PersistenceDriver {
  loadGameState(): Promise<GameState>;
  saveGameState(state: GameState): Promise<void>;

  loadOptions(): Promise<GameSettings>;
  saveOptions(settings: GameSettings): Promise<void>;
}
