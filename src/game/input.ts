import { Body, Query, Vector, type Body as MatterBody } from 'matter-js';
import { GAME_CONFIG as C } from './config';
import type { PhysicsWorld } from './physics';
import type { CanvasRenderer } from './renderer';
export class PointerInput {
  private pointerId: number | null=null; private body: MatterBody | null=null; private offset={x:0,y:0}; private samples: {p:Matter.Vector;t:number}[]=[];
  constructor(private canvas: HTMLCanvasElement, private renderer: CanvasRenderer, private world: PhysicsWorld) { canvas.addEventListener('pointerdown',this.down); canvas.addEventListener('pointermove',this.move); canvas.addEventListener('pointerup',this.up); canvas.addEventListener('pointercancel',this.up); }
  private down=(e:PointerEvent) => { const p=this.renderer.screenToWorld(e.clientX,e.clientY), bodies=[...this.world.balls.values()].map(b=>b.body), body=Query.point(bodies,p)[0]; if(!body)return; e.preventDefault(); this.pointerId=e.pointerId; this.body=body; this.offset=Vector.sub(body.position,p); this.samples=[{p,t:performance.now()}]; this.canvas.setPointerCapture(e.pointerId); Body.setVelocity(body,{x:0,y:0}); };
  private move=(e:PointerEvent) => { if(e.pointerId!==this.pointerId||!this.body)return; e.preventDefault(); const p=this.renderer.screenToWorld(e.clientX,e.clientY), target=Vector.add(p,this.offset); Body.setPosition(this.body,target); Body.setVelocity(this.body,{x:0,y:0}); const now=performance.now(); this.samples.push({p:target,t:now}); this.samples=this.samples.filter(s=>now-s.t<100); };
  private up=(e:PointerEvent) => { if(e.pointerId!==this.pointerId||!this.body)return; e.preventDefault(); const last=this.samples.at(-1), first=this.samples[0]; if(last&&first&&last.t>first.t) Body.setVelocity(this.body,Vector.mult(Vector.sub(last.p,first.p),C.DRAG_THROW_SCALE*1000/(last.t-first.t))); this.pointerId=null; this.body=null; this.samples=[]; };
}
