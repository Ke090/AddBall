export class GameAudio {
  enabled=localStorage.getItem('addball-sound')!=='off'; private context:AudioContext|null=null;
  activate():void { if(!this.enabled)return; this.context ??= new AudioContext(); if(this.context.state==='suspended')void this.context.resume(); }
  setEnabled(value:boolean):void { this.enabled=value; localStorage.setItem('addball-sound',value?'on':'off'); if(value)this.activate(); }
  play(kind:'collision'|'merge'|'split',strength=1):void { if(!this.enabled||!this.context)return; const c=this.context,o=c.createOscillator(),gain=c.createGain(),now=c.currentTime; o.type=kind==='merge'?'sine':kind==='split'?'triangle':'sine'; const start=kind==='merge'?320:kind==='split'?190:120+Math.min(strength,4)*25,end=kind==='merge'?150:kind==='split'?460:80; o.frequency.setValueAtTime(start,now); o.frequency.exponentialRampToValueAtTime(end,now+(kind==='collision'?.055:.16)); gain.gain.setValueAtTime(Math.min(.09,.018*strength+(kind==='collision'?0:.035)),now); gain.gain.exponentialRampToValueAtTime(.0001,now+(kind==='collision'?.06:.2)); o.connect(gain).connect(c.destination); o.start(now); o.stop(now+.22); }
}
