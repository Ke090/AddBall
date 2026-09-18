import { Body, Vector } from 'matter-js';
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG as C } from '../src/game/config';
import { PhysicsWorld } from '../src/game/physics';
import type { GameplaySettings } from '../src/game/settings';

const noGravity = { x: 0, y: 0 };
const settings: GameplaySettings = { friction: C.DEFAULT_FRICTION, gravity: C.DEFAULT_GRAVITY, mergeProbability: 1, splitProbability: 1, initialBallCount: C.DEFAULT_INITIAL_BALL_COUNT };

describe('physics safety and collisions', () => {
  it.each([1, 7, 30, 100])('creates %i area-1 balls with a matching total area', (initialBallCount) => {
    const world = new PhysicsWorld({ ...settings, initialBallCount });
    const areas = [...world.balls.values()].map((ball) => ball.area);
    expect(areas).toHaveLength(initialBallCount);
    expect(areas.every((area) => area === 1)).toBe(true);
    expect(areas.reduce((sum, area) => sum + area, 0)).toBe(initialBallCount);
  });

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
    const world = new PhysicsWorld({ ...settings, initialBallCount: 1, friction: 0, splitProbability: 0 }, () => 0.5);
    const ball = [...world.balls.values()][0];
    const radius = ball.body.circleRadius!;
    Body.setPosition(ball.body, { x: radius + 0.01, y: 5 });
    Body.setVelocity(ball.body, { x: -1, y: 0.25 });
    const initialSpeed = Vector.magnitude(ball.body.velocity);

    for (let frame = 0; frame < 8 && ball.body.velocity.x < 0; frame++) world.step(16, noGravity);

    expect(ball.body.restitution).toBe(C.RESTITUTION);
    expect(ball.body.velocity.x).toBeGreaterThan(0);
    expect(Vector.magnitude(ball.body.velocity)).toBeCloseTo(initialSpeed, 5);
  });

  it('directly splits at zero probability without increasing speed and blocks immediate merging', () => {
    const world = new PhysicsWorld({ ...settings, initialBallCount: 2, friction: 0, splitProbability: 0, mergeProbability: 1 }, () => 0);
    const [left, right] = [...world.balls.values()];
    Body.setPosition(left.body, { x: 4.44, y: 5 }); Body.setPosition(right.body, { x: 5.56, y: 5 });
    Body.setVelocity(left.body, { x: 0.01, y: 0 }); Body.setVelocity(right.body, { x: -0.01, y: 0 });
    for (let frame = 0; frame < 4 && world.balls.size === 2; frame++) world.step(16, noGravity);
    const original = [...world.balls.values()][0];
    Body.setVelocity(original.body, { x: 0.8, y: -0.3 });
    const velocity = { ...original.body.velocity };

    expect(world.splitBall(original.id)).toBe(true);
    const children = [...world.balls.values()];
    expect(children).toHaveLength(2);
    for (const child of children) {
      expect(child.body.velocity.x).toBeCloseTo(velocity.x, 10);
      expect(child.body.velocity.y).toBeCloseTo(velocity.y, 10);
      expect(child.mergeReadyAt).toBeGreaterThan(performance.now());
    }

    Body.setPosition(children[0].body, { x: 4.8, y: 5 });
    Body.setPosition(children[1].body, { x: 5.2, y: 5 });
    world.step(16, noGravity);
    expect(world.balls.size).toBe(2);
    expect([...world.balls.values()].reduce((sum, ball) => sum + ball.area, 0)).toBe(2);
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
    expect([...world.balls.values()].reduce((sum, ball) => sum + ball.area, 0)).toBe(C.DEFAULT_INITIAL_BALL_COUNT);
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

  it('conserves momentum and kinetic energy during force-free ball collisions', () => {
    const world = new PhysicsWorld({ ...settings, initialBallCount: 2, friction: 0, mergeProbability: 0, splitProbability: 0 }, () => 0.5);
    const [left, right] = [...world.balls.values()];
    Body.setPosition(left.body, { x: 4.4, y: 5 }); Body.setPosition(right.body, { x: 5.6, y: 5 });
    Body.setVelocity(left.body, { x: 0.03, y: 0.005 }); Body.setVelocity(right.body, { x: -0.01, y: -0.005 });
    const initialMomentum = world.totalMomentum();
    const initialEnergy = [...world.balls.values()].reduce((sum, ball) => sum + ball.area * Vector.magnitudeSquared(ball.body.velocity) / 2, 0);

    for (let frame = 0; frame < 40; frame++) world.step(16, noGravity);

    const finalMomentum = world.totalMomentum();
    const finalEnergy = [...world.balls.values()].reduce((sum, ball) => sum + ball.area * Vector.magnitudeSquared(ball.body.velocity) / 2, 0);
    expect(finalMomentum.x).toBeCloseTo(initialMomentum.x, 8);
    expect(finalMomentum.y).toBeCloseTo(initialMomentum.y, 8);
    expect(finalEnergy).toBeCloseTo(initialEnergy, 8);
  });
});
