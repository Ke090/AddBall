import { GAME_CONFIG as C } from './config';

export interface GameplaySettings { friction: number; gravity: number; mergeProbability: number; splitProbability: number }

const defaults: GameplaySettings = { friction: C.DEFAULT_FRICTION, gravity: C.DEFAULT_GRAVITY, mergeProbability: C.DEFAULT_MERGE_PROBABILITY, splitProbability: C.DEFAULT_SPLIT_PROBABILITY };
const bounds: Record<keyof GameplaySettings, readonly [number, number]> = { friction: [0, C.MAX_FRICTION], gravity: [0, C.MAX_GRAVITY], mergeProbability: [0, 1], splitProbability: [0, 1] };

export class SettingsStore {
  readonly values: GameplaySettings = { ...defaults };
  constructor() {
    for (const key of Object.keys(defaults) as (keyof GameplaySettings)[]) {
      const text = localStorage.getItem(`addball-${key}`), stored = Number(text);
      if (text !== null && Number.isFinite(stored)) this.values[key] = Math.max(bounds[key][0], Math.min(bounds[key][1], stored));
    }
  }
  set<K extends keyof GameplaySettings>(key: K, value: number): void {
    this.values[key] = Math.max(bounds[key][0], Math.min(bounds[key][1], value));
    localStorage.setItem(`addball-${key}`, String(this.values[key]));
  }
}
