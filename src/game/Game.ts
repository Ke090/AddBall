import { GAME_CONFIG as C } from './config';
import { GameAudio } from './audio';
import { PointerInput } from './input';
import { PhysicsWorld } from './physics';
import { CanvasRenderer } from './renderer';
import { totalArea } from './rules';
import { TiltController } from './tilt';
export class Game {
  readonly world=new PhysicsWorld(); readonly renderer:CanvasRenderer; readonly tilt=new TiltController(); readonly audio=new GameAudio();
  private running=false; private last=0; private fps=60; private debugLast=0;
  constructor(canvas:HTMLCanvasElement,private debug:HTMLElement|null) { this.renderer=new CanvasRenderer(canvas,this.world); new PointerInput(canvas,this.renderer,this.world); this.world.onSound=(kind,strength)=>this.audio.play(kind,strength); document.addEventListener('visibilitychange',()=>{this.last=performance.now();}); }
  async start():Promise<boolean> { this.audio.activate(); const tilt=await this.tilt.activate(); if(!this.running){this.running=true;this.last=performance.now();requestAnimationFrame(this.frame);} return tilt; }
  restart():void { this.world.restart(); this.last=performance.now(); }
  private frame=(now:number) => { if(!this.running)return; const delta=Math.min(now-this.last,C.MAX_DELTA_MS); this.last=now; if(!document.hidden)this.world.step(delta,this.tilt.gravity()); this.renderer.render(now); this.fps+=(1000/Math.max(delta,1)-this.fps)*.08; if(this.debug&&now-this.debugLast>250){this.debugLast=now;const area=totalArea([...this.world.balls.values()].map(b=>b.area)),g=this.tilt.gravity();this.debug.textContent=`FPS ${this.fps.toFixed(0)}\n玉 ${this.world.balls.size}\n総面積 ${area} / ${C.TOTAL_AREA}\n重力 ${g.x.toFixed(4)}, ${g.y.toFixed(4)}\n合体 ≥ ${C.MERGE_IMPACT_THRESHOLD}\n分裂 ≥ ${C.SPLIT_IMPACT_THRESHOLD}`;this.debug.classList.toggle('warning',area!==C.TOTAL_AREA);} requestAnimationFrame(this.frame); };
}
