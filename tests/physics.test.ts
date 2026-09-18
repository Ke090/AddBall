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

  it('does not move resting balls without gravity or input', () => {
    const world = new PhysicsWorld({ ...settings, mergeProbability: 0, splitProbability: 0 }, () => 0.5);
    const before = [...world.balls.values()].map(({ body }) => ({ ...body.position }));

    for (let frame = 0; frame < 10; frame++) world.step(16, noGravity);

    [...world.balls.values()].forEach(({ body }, index) => {
      expect(body.position.x).toBeCloseTo(before[index].x, 10);
      expect(body.position.y).toBeCloseTo(before[index].y, 10);
      expect(Vector.magnitude(body.velocity)).toBeCloseTo(0, 10);
    });
  });

  it('applies the configured slight friction without a random force', () => {
    const configured = { ...settings, friction: C.DEFAULT_FRICTION, mergeProbability: 0, splitProbability: 0 };
    const world = new PhysicsWorld(configured, () => 0.5);
    const ball = [...world.balls.values()][0];
    Body.setPosition(ball.body, { x: 5, y: 9 });
    Body.setVelocity(ball.body, { x: 1, y: 0 });

    world.step(16, noGravity);

    expect(ball.body.frictionAir).toBe(C.DEFAULT_FRICTION);
    expect(Vector.magnitude(ball.body.velocity)).toBeLessThan(1);
    expect(ball.body.velocity.y).toBeCloseTo(0, 10);
  });

  it('reflects a ball elastically at a wall', () => {
    const world = new PhysicsWorld({ ...settings, friction: 0, splitProbability: 0 }, () => 0.5);
    const ball = [...world.balls.values()][0];
    Body.setPosition(ball.body, { x: 0.57, y: 9 });
    Body.setVelocity(ball.body, { x: -1, y: 0 });

    for (let frame = 0; frame < 4 && ball.body.velocity.x < 0; frame++) world.step(16, noGravity);

    expect(ball.body.restitution).toBe(C.RESTITUTION);
    expect(ball.body.velocity.x).toBeGreaterThan(0);
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
    Body.setPosition(left.body, { x: 4.44, y: 9 });
    Body.setPosition(right.body, { x: 5.56, y: 9 });
    Body.setVelocity(left.body, { x: 0.01, y: 0 });
    Body.setVelocity(right.body, { x: -0.01, y: 0 });

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

  it('uses probability rather than impact speed to decide a split', () => {
    const world = new PhysicsWorld({ ...settings, friction: 0 }, () => 0);
    const [left, right] = [...world.balls.values()];
    Body.setPosition(left.body, { x: 4.44, y: 9 });
    Body.setPosition(right.body, { x: 5.56, y: 9 });
    Body.setVelocity(left.body, { x: 0.01, y: 0 });
    Body.setVelocity(right.body, { x: -0.01, y: 0 });
    for (let frame = 0; frame < 4 && world.balls.size === C.INITIAL_BALL_COUNT; frame++) world.step(16, noGravity);
    const merged = [...world.balls.values()].find((ball) => ball.area === 2)!;
    merged.splitReadyAt = 0;
    Body.setPosition(merged.body, { x: 0.7, y: 5 });
    Body.setVelocity(merged.body, { x: -0.1, y: 0 });

    for (let frame = 0; frame < 4 && world.balls.size < C.INITIAL_BALL_COUNT; frame++) world.step(16, noGravity);

    expect(world.balls.size).toBe(C.INITIAL_BALL_COUNT);
    expect([...world.balls.values()].every((ball) => ball.area === 1)).toBe(true);
  });

  it('limits speed even when a ball is thrown unrealistically fast', () => {
    const world = new PhysicsWorld({ ...settings }, () => 0);
    const ball = [...world.balls.values()][0];
    Body.setVelocity(ball.body, { x: 100, y: 100 });

    world.step(1, noGravity);

    expect(Vector.magnitude(ball.body.velocity)).toBeLessThanOrEqual(C.MAX_SPEED + 0.01);
  });
});
