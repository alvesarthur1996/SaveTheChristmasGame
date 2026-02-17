import { getPersistenceDriver } from './persistence/driver';
import type { GameState } from './persistence/types';

export async function loadGameState(): Promise<GameState> {
  const driver = getPersistenceDriver();
  return await driver.loadGameState();
}

export async function saveGameState(json: GameState): Promise<void> {
  const driver = getPersistenceDriver();
  await driver.saveGameState(json);
}