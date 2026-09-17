import type { GameAction } from './types';
export const mergeAreas = (a: number, b: number): number => {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < 1) throw new Error('Areas must be positive integers');
  return a + b;
};
export const splitArea = (area: number): readonly [number, number] | null => {
  if (!Number.isInteger(area) || area < 1) throw new Error('Area must be a positive integer');
  return area === 1 ? null : [Math.floor(area / 2), Math.ceil(area / 2)];
};
export const totalArea = (areas: Iterable<number>): number => [...areas].reduce((sum, area) => sum + area, 0);
export class ActionQueue {
  private actions: GameAction[] = [];
  private reserved = new Set<number>();
  queue(action: GameAction): boolean {
    const ids = action.type === 'merge' ? [action.a, action.b] : [action.id];
    if (ids.some((id) => this.reserved.has(id))) return false;
    ids.forEach((id) => this.reserved.add(id)); this.actions.push(action); return true;
  }
  drain(): GameAction[] { const result = this.actions; this.actions = []; this.reserved.clear(); return result; }
}
