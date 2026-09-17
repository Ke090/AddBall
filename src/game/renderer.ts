import { GAME_CONFIG as C } from './config';
import type { PhysicsWorld } from './physics';
export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D; private width = 1; private height = 1; private scale = 1; private ox = 0; private oy = 0;
  constructor(readonly canvas: HTMLCanvasElement, private world: PhysicsWorld) { const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas unavailable'); this.ctx = context; this.resize(); new ResizeObserver(() => this.resize()).observe(canvas); }
  resize(): void { const rect = this.canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 3); this.canvas.width = Math.round(rect.width * dpr); this.canvas.height = Math.round(rect.height * dpr); this.width = rect.width; this.height = rect.height; this.scale = Math.min(rect.width, rect.height) / C.FIELD_SIZE; this.ox = (rect.width - C.FIELD_SIZE * this.scale) / 2; this.oy = (rect.height - C.FIELD_SIZE * this.scale) / 2; this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  screenToWorld(x: number, y: number): Matter.Vector { const r = this.canvas.getBoundingClientRect(); return { x: (x - r.left - this.ox) / this.scale, y: (y - r.top - this.oy) / this.scale }; }
  worldToScreen(p: Matter.Vector): Matter.Vector { return { x: this.ox + p.x * this.scale, y: this.oy + p.y * this.scale }; }
  render(now: number): void {
    const g = this.ctx; g.clearRect(0, 0, this.width, this.height); g.fillStyle = '#10131a'; g.fillRect(0, 0, this.width, this.height);
    const size = C.FIELD_SIZE * this.scale; g.fillStyle = '#171c27'; g.strokeStyle = '#303a50'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(this.ox, this.oy, size, size, Math.max(8, this.scale * .14)); g.fill(); g.stroke();
    for (const ball of this.world.balls.values()) { const p = this.worldToScreen(ball.body.position), r = Math.sqrt(ball.area / Math.PI) * this.scale; const grad = g.createRadialGradient(p.x-r*.3,p.y-r*.35,r*.08,p.x,p.y,r); grad.addColorStop(0,`hsl(${ball.hue} 82% 70%)`); grad.addColorStop(1,`hsl(${ball.hue} 67% 48%)`); g.fillStyle=grad; g.shadowColor=`hsl(${ball.hue} 70% 45% / .3)`; g.shadowBlur=Math.min(18,r*.25); g.beginPath(); g.arc(p.x,p.y,r,0,Math.PI*2); g.fill(); g.shadowBlur=0; g.fillStyle='#fff'; g.textAlign='center'; g.textBaseline='middle'; g.font=`700 ${Math.max(11,Math.min(r*.92,42))}px system-ui`; g.fillText(String(ball.area),p.x,p.y+.5); }
    this.world.effects.splice(0, this.world.effects.length, ...this.world.effects.filter((e) => now - e.born < C.EFFECT_DURATION_MS));
    for (const e of this.world.effects) { const age=(now-e.born)/C.EFFECT_DURATION_MS,p=this.worldToScreen(e), radius=(.2+age*1.3)*this.scale; g.strokeStyle=`hsl(${e.hue} 90% 70% / ${1-age})`; g.lineWidth=2*(1-age); g.beginPath(); g.arc(p.x,p.y,radius,0,Math.PI*2); g.stroke(); }
  }
}
