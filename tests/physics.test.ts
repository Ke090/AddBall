import { Body, Vector } from 'matter-js';
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG as C } from '../src/game/config';
import { PhysicsWorld } from '../src/game/physics';
import type { GameplaySettings } from '../src/game/settings';

const noGravity = { x: 0, y: 0 };
const settings: GameplaySettings = { friction: C.DEFAULT_FRICTION, gravity: C.DEFAULT_GRAVITY, mergeProbability: 1, splitProbability: 1 };

describe('physics safety and collisions', () => {
  it('supports parameter-less construction for existing integrations', () => {
    const world = new PhysicsWorld();
    expect(world.balls.size).toBe(C.INITIAL_BALL_COUNT);
    expect(() => world.step(16, noGravity)).not.toThrow();
  });

  it('keeps every ball inside the field after an extreme displacement', () => {
    const world = new PhysicsWorld({ ...settings }, () => 0);
    const ball = [...world.balls.values()][0];
    Body.setPosition(ball.body, { x: -20, y: 30 });
    Body.setVelocity(ball.body, { x: -10, y: 10 });

    world.step(C.MAX_DELTA_MS, noGravity);

    for (const current of world.balls.values()) {
      const radius = current.body.circleRadius ?? Math.sqrt(current.area / Math.PI);
      expect(current.body.position.x).toBeGreaterThanOrEqual(radius - 1e-9);
      expect(current.body.position.x).toBeLessThanOrEqual(C.FIELD_SIZE - radius + 1e-9);
      expect(current.body.position.y).toBeGreaterThanOrEqual(radius - 1e-9);
      expect(current.body.position.y).toBeLessThanOrEqual(C.FIELD_SIZE - radius + 1e-9);
    }
  });

  it('merges balls in a deliberate head-on collision', () => {
    const world = new PhysicsWorld({ ...settings }, () => 0);
    const [left, right] = [...world.balls.values()];
    Body.setPosition(left.body, { x: 4.35, y: 9 });
    Body.setPosition(right.body, { x: 5.65, y: 9 });
    Body.setVelocity(left.body, { x: 1, y: 0 });
    Body.setVelocity(right.body, { x: -1, y: 0 });

    for (let frame = 0; frame < 4 && world.balls.size === C.INITIAL_BALL_COUNT; frame++) world.step(16, noGravity);

    expect(world.balls.size).toBe(C.INITIAL_BALL_COUNT - 1);
    expect([...world.balls.values()].some((ball) => ball.area === 2)).toBe(true);
    expect([...world.balls.values()].reduce((sum, ball) => sum + ball.area, 0)).toBe(C.TOTAL_AREA);
  });

  it('uses probability rather than impact speed to decide a merge', () => {
    const world = new PhysicsWorld({ ...settings, mergeProbability: 0 }, () => 0.99);
    const [left, right] = [...world.balls.values()];
    Body.setPosition(left.body, { x: 4.35, y: 9 });
    Body.setPosition(right.body, { x: 5.65, y: 9 });
    Body.setVelocity(left.body, { x: C.MAX_SPEED, y: 0 });
    Body.setVelocity(right.body, { x: -C.MAX_SPEED, y: 0 });

    for (let frame = 0; frame < 4; frame++) world.step(16, noGravity);

    expect(world.balls.size).toBe(C.INITIAL_BALL_COUNT);
  });

  it('limits speed even when a ball is thrown unrealistically fast', () => {
    const world = new PhysicsWorld({ ...settings }, () => 0);
    const ball = [...world.balls.values()][0];
    Body.setVelocity(ball.body, { x: 100, y: 100 });

    world.step(1, noGravity);

    expect(Vector.magnitude(ball.body.velocity)).toBeLessThanOrEqual(C.MAX_SPEED + 0.01);
  });
});
