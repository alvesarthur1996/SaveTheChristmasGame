import { getPersistenceDriver } from './persistence/driver';
import type { GameSettings } from './persistence/types';

export interface SoundOptions {
  BGM: number;
  SFX: number;
}

export async function loadOptions(): Promise<GameSettings> {
  const driver = getPersistenceDriver();
  return await driver.loadOptions();
}

export async function saveOptions(json: GameSettings): Promise<void> {
  const driver = getPersistenceDriver();
  await driver.saveOptions(json);
}