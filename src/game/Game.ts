import { GAME_CONFIG as C } from './config';
import { GameAudio } from './audio';
import { PointerInput } from './input';
import { PhysicsWorld } from './physics';
import { CanvasRenderer } from './renderer';
import { totalArea } from './rules';
import { TiltController } from './tilt';
import { SettingsStore } from './settings';
export class Game {
  readonly world=new PhysicsWorld(); readonly renderer:CanvasRenderer; readonly tilt=new TiltController(); readonly audio=new GameAudio();
  private running=false; private last=0; private fps=60; private debugLast=0; private statusLast=0;
  constructor(canvas:HTMLCanvasElement,private debug:HTMLElement|null,private tiltStatus:HTMLOutputElement|null) { this.renderer=new CanvasRenderer(canvas,this.world); new PointerInput(canvas,this.renderer,this.world); this.world.onSound=(kind,strength)=>this.audio.play(kind,strength); document.addEventListener('visibilitychange',()=>{this.last=performance.now();}); this.updateTiltStatus(); }
  async start():Promise<boolean> { this.audio.activate(); const tilt=await this.tilt.activate(); if(!this.running){this.running=true;this.last=performance.now();requestAnimationFrame(this.frame);} return tilt; }
  restart():void { this.world.restart(); this.last=performance.now(); }
  private updateTiltStatus():void { if(!this.tiltStatus)return; const t=this.tilt.reading(); this.tiltStatus.textContent=t.active?`傾き X(右+) ${t.x>=0?'+':''}${t.x.toFixed(2)} / Y(下+) ${t.y>=0?'+':''}${t.y.toFixed(2)}`:'傾き --'; }
  private frame=(now:number) => { if(!this.running)return; const delta=Math.min(now-this.last,C.MAX_DELTA_MS); this.last=now; const gravity=this.tilt.gravity(); if(!document.hidden)this.world.step(delta,gravity); this.renderer.render(now); this.fps+=(1000/Math.max(delta,1)-this.fps)*.08; if(now-this.statusLast>100){this.statusLast=now;this.updateTiltStatus();} if(this.debug&&now-this.debugLast>250){this.debugLast=now;const area=totalArea([...this.world.balls.values()].map(b=>b.area));this.debug.textContent=`FPS ${this.fps.toFixed(0)}\n玉 ${this.world.balls.size}\n総面積 ${area} / ${C.TOTAL_AREA}\n重力 ${gravity.x.toFixed(4)}, ${gravity.y.toFixed(4)}\n合体 ≥ ${C.MERGE_IMPACT_THRESHOLD}\n分裂 ≥ ${C.SPLIT_IMPACT_THRESHOLD}`;this.debug.classList.toggle('warning',area!==C.TOTAL_AREA);} requestAnimationFrame(this.frame); };
}
