import type { Body, Vector } from 'matter-js';
export interface Ball { id: number; area: number; body: Body; hue: number; splitReadyAt: number; driftAngle: number }
export type GameAction = { type: 'merge'; a: number; b: number } | { type: 'split'; id: number; normal: Vector };
export interface Effect { type: 'merge' | 'split' | 'impact'; x: number; y: number; born: number; hue: number }
