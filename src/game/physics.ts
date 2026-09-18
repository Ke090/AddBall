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
    const cols = 6, gap = 1.52;
    for (let i = 0; i < C.INITIAL_BALL_COUNT; i++) this.addBall(C.INITIAL_AREA, { x: 1.2 + (i % cols) * gap, y: 1.2 + Math.floor(i / cols) * gap }, { x: 0, y: 0 }, 0);
    this.assertArea();
  }
  private addBall(area: number, position: Matter.Vector, velocity: Matter.Vector, splitReadyAt: number): Ball {
    const id = this.nextId++, radius = Math.sqrt(area / Math.PI);
    const body = Bodies.circle(position.x, position.y, radius, { label: `ball:${id}`, restitution: C.RESTITUTION, friction: 0, frictionStatic: 0, frictionAir: this.settings.friction, density: 0.01 });
    Body.setVelocity(body, velocity); Composite.add(this.engine.world, body);
    const ball = { id, area, body, hue: (id * 47 + area * 13) % 360, splitReadyAt }; this.balls.set(id, ball); return ball;
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
      const step = Math.min(remaining, C.PHYSICS_STEP_MS); Engine.update(this.engine, step); remaining -= step;
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
      if (this.random() < this.settings.mergeProbability) this.queue.queue({ type: 'merge', a: a.id, b: b.id });
      else { this.onSound?.('collision', impact); this.effect('impact', pair.collision.supports[0]?.x ?? a.body.position.x, pair.collision.supports[0]?.y ?? a.body.position.y, a.hue); }
      return;
    }
    const ball = a ?? b; const wall = a ? pair.bodyB : pair.bodyA;
    if (!ball || wall.label !== WALL || ball.area === 1 || performance.now() < ball.splitReadyAt) return;
    const awayFromWall = a ? Vector.neg(pair.collision.normal) : pair.collision.normal;
    if (this.random() < this.settings.splitProbability) this.queue.queue({ type: 'split', id: ball.id, normal: awayFromWall });
  }
  private fromBody(body: Matter.Body): Ball | undefined { if (!body.label.startsWith('ball:')) return; return this.balls.get(Number(body.label.slice(5))); }
  private apply(action: GameAction): void { if (action.type === 'merge') this.merge(action.a, action.b); else this.split(action.id, action.normal); }
  private merge(aId: number, bId: number): void {
    const a = this.balls.get(aId), b = this.balls.get(bId); if (!a || !b) return;
    const area = mergeAreas(a.area, b.area), pos = Vector.div(Vector.add(Vector.mult(a.body.position, a.area), Vector.mult(b.body.position, b.area)), area), velocity = Vector.div(Vector.add(Vector.mult(a.body.velocity, a.area), Vector.mult(b.body.velocity, b.area)), area);
    this.remove(a); this.remove(b); const ball = this.addBall(area, pos, velocity, performance.now() + 120); this.effect('merge', pos.x, pos.y, ball.hue); this.onSound?.('merge'); this.assertArea();
  }
  private split(id: number, normal: Matter.Vector): void {
    const ball = this.balls.get(id); if (!ball) return; const parts = splitArea(ball.area); if (!parts) return;
    const tangent = Vector.perp(normal), pos = { ...ball.body.position }, base = { ...ball.body.velocity }, ready = performance.now() + C.SPLIT_COOLDOWN_MS;
    this.remove(ball); parts.forEach((area, i) => { const sign = i ? 1 : -1; const radius = Math.sqrt(area / Math.PI); const p = Vector.add(pos, Vector.add(Vector.mult(normal, radius * .32), Vector.mult(tangent, sign * radius * 1.05))); const v = Vector.add(Vector.mult(base, .48), Vector.add(Vector.mult(normal, 1.0), Vector.mult(tangent, sign * 1.2))); this.addBall(area, p, v, ready); });
    this.effect('split', pos.x, pos.y, ball.hue); this.onSound?.('split'); this.assertArea();
  }
  private remove(ball: Ball): void { Composite.remove(this.engine.world, ball.body); this.balls.delete(ball.id); }
  private effect(type: Effect['type'], x: number, y: number, hue: number): void { this.effects.push({ type, x, y, hue, born: performance.now() }); }
  private assertArea(): void { const sum = totalArea([...this.balls.values()].map((b) => b.area)); if (sum !== C.TOTAL_AREA) throw new Error(`Area invariant violated: ${sum}`); }
}
