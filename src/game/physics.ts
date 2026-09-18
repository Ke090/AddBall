import { Bodies, Body, Composite, Engine, Events, Vector, type IEventCollision, type Pair } from 'matter-js';
import { GAME_CONFIG as C } from './config';
import { ActionQueue, mergeAreas, splitArea, totalArea } from './rules';
import { createDefaultSettings, type GameplaySettings } from './settings';
import type { Ball, Effect, GameAction } from './types';

const WALL = 'wall';
export class PhysicsWorld {
  readonly engine = Engine.create({ gravity: { x: 0, y: 0 } });
  readonly balls = new Map<number, Ball>();
  readonly effects: Effect[] = [];
  private queue = new ActionQueue(); private nextId = 1; private tick = 0;
  private stepVelocities = new Map<number, Matter.Vector>(); private wallReflections = new Map<number, Matter.Vector>();
  private settings: GameplaySettings; private random: () => number;
  onSound?: (kind: 'collision' | 'merge' | 'split', strength?: number) => void;

  constructor(settings?: GameplaySettings, random?: () => number) {
    this.settings = settings ?? createDefaultSettings();
    this.random = random ?? Math.random;
    const f = C.FIELD_SIZE, t = C.WALL_THICKNESS;
    const options = { isStatic: true, label: WALL, restitution: C.RESTITUTION };
    Composite.add(this.engine.world, [Bodies.rectangle(f / 2, -t / 2, f + t * 2, t, options), Bodies.rectangle(f / 2, f + t / 2, f + t * 2, t, options), Bodies.rectangle(-t / 2, f / 2, t, f + t * 2, options), Bodies.rectangle(f + t / 2, f / 2, t, f + t * 2, options)]);
    Events.on(this.engine, 'collisionStart', (event) => this.collisions(event));
    this.restart();
  }
  restart(): void {
    for (const ball of this.balls.values()) Composite.remove(this.engine.world, ball.body);
    this.balls.clear(); this.effects.length = 0; this.nextId = 1;
    const count = this.settings.initialBallCount;
    const cols = Math.ceil(Math.sqrt(count)), rows = Math.ceil(count / cols);
    const baseArea = Math.floor(C.TOTAL_AREA / count), extra = C.TOTAL_AREA % count;
    for (let i = 0; i < count; i++) {
      const position = count === 1
        ? { x: C.FIELD_SIZE / 2, y: C.FIELD_SIZE / 2 }
        : count === C.DEFAULT_INITIAL_BALL_COUNT
          ? { x: 1.2 + (i % 6) * 1.52, y: 1.2 + Math.floor(i / 6) * 1.52 }
        : { x: (i % cols + .5) * C.FIELD_SIZE / cols, y: (Math.floor(i / cols) + .5) * C.FIELD_SIZE / rows };
      this.addBall(baseArea + (i < extra ? 1 : 0), position, { x: 0, y: 0 }, 0, 0);
    }
    this.assertArea();
  }
  private addBall(area: number, position: Matter.Vector, velocity: Matter.Vector, splitReadyAt: number, mergeReadyAt: number): Ball {
    const id = this.nextId++, radius = Math.sqrt(area / Math.PI);
    const body = Bodies.circle(position.x, position.y, radius, { label: `ball:${id}`, restitution: C.RESTITUTION, friction: 0, frictionStatic: 0, frictionAir: this.settings.friction, density: 0.01 });
    Body.setVelocity(body, velocity); Composite.add(this.engine.world, body);
    const ball = { id, area, body, hue: (id * 47 + area * 13) % 360, splitReadyAt, mergeReadyAt }; this.balls.set(id, ball); return ball;
  }
  step(deltaMs: number, gravity: Matter.Vector): void {
    this.tick++;
    this.engine.gravity.x = gravity.x; this.engine.gravity.y = gravity.y; this.engine.gravity.scale = 1;
    let remaining = Math.min(deltaMs, C.MAX_DELTA_MS);
    while (remaining > 0) {
      for (const ball of this.balls.values()) {
        ball.body.frictionAir = this.settings.friction;
        const speed = Vector.magnitude(ball.body.velocity); if (speed > C.MAX_SPEED) Body.setVelocity(ball.body, Vector.mult(Vector.normalise(ball.body.velocity), C.MAX_SPEED));
      }
      this.stepVelocities = new Map([...this.balls].map(([id, ball]) => [id, { ...ball.body.velocity }]));
      const step = Math.min(remaining, C.PHYSICS_STEP_MS); Engine.update(this.engine, step); remaining -= step;
      for (const [id, velocity] of this.wallReflections) { const ball = this.balls.get(id); if (ball) Body.setVelocity(ball.body, velocity); }
      this.wallReflections.clear();
    }
    for (const action of this.queue.drain()) this.apply(action);
    this.containBalls();
    if (this.tick % 120 === 0) this.assertArea();
  }
  private containBalls(): void {
    for (const ball of this.balls.values()) {
      const radius = ball.body.circleRadius ?? Math.sqrt(ball.area / Math.PI), p = ball.body.position, v = ball.body.velocity;
      const x = Math.max(radius, Math.min(C.FIELD_SIZE - radius, p.x)), y = Math.max(radius, Math.min(C.FIELD_SIZE - radius, p.y));
      if (x === p.x && y === p.y) continue;
      Body.setPosition(ball.body, { x, y });
      Body.setVelocity(ball.body, { x: x !== p.x && Math.sign(v.x) === Math.sign(p.x - x) ? -v.x * C.RESTITUTION : v.x, y: y !== p.y && Math.sign(v.y) === Math.sign(p.y - y) ? -v.y * C.RESTITUTION : v.y });
    }
  }
  private collisions(event: IEventCollision<Engine>): void { for (const pair of event.pairs) this.measurePair(pair); }
  private measurePair(pair: Pair): void {
    const a = this.fromBody(pair.bodyA), b = this.fromBody(pair.bodyB);
    if (a && b) {
      const relative = Vector.sub(a.body.velocity, b.body.velocity); const impact = Math.abs(Vector.dot(relative, pair.collision.normal));
      const now = performance.now();
      if (now >= a.mergeReadyAt && now >= b.mergeReadyAt && this.random() < this.settings.mergeProbability) this.queue.queue({ type: 'merge', a: a.id, b: b.id });
      else { this.onSound?.('collision', impact); this.effect('impact', pair.collision.supports[0]?.x ?? a.body.position.x, pair.collision.supports[0]?.y ?? a.body.position.y, a.hue); }
      return;
    }
    const ball = a ?? b; const wall = a ? pair.bodyB : pair.bodyA;
    if (!ball || wall.label !== WALL) return;
    const awayFromWall = wall.position.x < 0 ? { x: 1, y: 0 }
      : wall.position.x > C.FIELD_SIZE ? { x: -1, y: 0 }
        : wall.position.y < 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
    const incoming = this.stepVelocities.get(ball.id) ?? ball.body.velocity;
    if (Vector.dot(incoming, awayFromWall) < 0) this.wallReflections.set(ball.id, Vector.sub(incoming, Vector.mult(awayFromWall, 2 * Vector.dot(incoming, awayFromWall))));
    if (ball.area === 1 || performance.now() < ball.splitReadyAt) return;
    if (this.random() < this.settings.splitProbability) this.queue.queue({ type: 'split', id: ball.id, normal: awayFromWall });
  }
  private fromBody(body: Matter.Body): Ball | undefined { if (!body.label.startsWith('ball:')) return; return this.balls.get(Number(body.label.slice(5))); }
  private apply(action: GameAction): void { if (action.type === 'merge') this.merge(action.a, action.b); else this.split(action.id, action.normal); }
  private merge(aId: number, bId: number): void {
    const a = this.balls.get(aId), b = this.balls.get(bId); if (!a || !b) return;
    const area = mergeAreas(a.area, b.area), pos = Vector.div(Vector.add(Vector.mult(a.body.position, a.area), Vector.mult(b.body.position, b.area)), area), velocity = Vector.div(Vector.add(Vector.mult(a.body.velocity, a.area), Vector.mult(b.body.velocity, b.area)), area);
    this.remove(a); this.remove(b); const ball = this.addBall(area, pos, velocity, performance.now() + 120, 0); this.effect('merge', pos.x, pos.y, ball.hue); this.onSound?.('merge'); this.assertArea();
  }
  splitBall(id: number, normal: Matter.Vector = { x: 1, y: 0 }): boolean {
    const ball = this.balls.get(id); if (!ball) return false; const parts = splitArea(ball.area); if (!parts) return false;
    const unitNormal = Vector.magnitude(normal) === 0 ? { x: 1, y: 0 } : Vector.normalise(normal);
    const tangent = Vector.perp(unitNormal), pos = { ...ball.body.position }, velocity = { ...ball.body.velocity };
    const now = performance.now(), splitReadyAt = now + C.SPLIT_COOLDOWN_MS, mergeReadyAt = now + C.SPLIT_MERGE_COOLDOWN_MS;
    this.remove(ball); parts.forEach((area, i) => { const sign = i ? 1 : -1; const radius = Math.sqrt(area / Math.PI); const p = Vector.add(pos, Vector.add(Vector.mult(unitNormal, radius * .32), Vector.mult(tangent, sign * radius * 1.05))); this.addBall(area, p, velocity, splitReadyAt, mergeReadyAt); });
    this.effect('split', pos.x, pos.y, ball.hue); this.onSound?.('split'); this.assertArea();
    return true;
  }
  private split(id: number, normal: Matter.Vector): void { this.splitBall(id, normal); }
  private remove(ball: Ball): void { Composite.remove(this.engine.world, ball.body); this.balls.delete(ball.id); }
  private effect(type: Effect['type'], x: number, y: number, hue: number): void { this.effects.push({ type, x, y, hue, born: performance.now() }); }
  private assertArea(): void { const sum = totalArea([...this.balls.values()].map((b) => b.area)); if (sum !== C.TOTAL_AREA) throw new Error(`Area invariant violated: ${sum}`); }
}
