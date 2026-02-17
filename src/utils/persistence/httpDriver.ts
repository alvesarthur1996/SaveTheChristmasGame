import type { GameSettings, GameState, PersistenceDriver } from './types';

export class HttpPersistenceDriver implements PersistenceDriver {
  constructor(private readonly baseUrl: string) {}

  async loadGameState(): Promise<GameState> {
    const request = await fetch(`${this.baseUrl}/game-state`, {
      headers: { 'Content-Type': 'application/json' },
      method: 'GET',
    });
    return (await request.json()) as GameState;
  }

  async saveGameState(state: GameState): Promise<void> {
    await fetch(`${this.baseUrl}/update-game-state`, {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify(state),
    });
  }

  async loadOptions(): Promise<GameSettings> {
    const request = await fetch(`${this.baseUrl}/load-options`, {
      headers: { 'Content-Type': 'application/json' },
      method: 'GET',
    });
    return (await request.json()) as GameSettings;
  }

  async saveOptions(settings: GameSettings): Promise<void> {
    await fetch(`${this.baseUrl}/save-options`, {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }
}
