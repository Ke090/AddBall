import type { Game } from '../game/Game';
export const bindMenu=(game:Game):void=>{
  const panel=document.querySelector<HTMLElement>('#menu-panel')!,toggle=document.querySelector<HTMLButtonElement>('#menu-toggle')!,tilt=document.querySelector<HTMLButtonElement>('#tilt-btn')!,sound=document.querySelector<HTMLButtonElement>('#sound-btn')!;
  const labels=()=>{tilt.textContent=`傾き ${game.tilt.enabled?'ON':'OFF'}`;sound.textContent=`サウンド ${game.audio.enabled?'ON':'OFF'}`}; labels();
  const bindSlider=(id:string,key:'friction'|'mergeProbability'|'splitProbability',format:(value:number)=>string)=>{const input=document.querySelector<HTMLInputElement>(`#${id}-slider`)!,output=document.querySelector<HTMLOutputElement>(`#${id}-value`)!,render=()=>{output.value=format(Number(input.value));};input.value=String(game.settings.values[key]);render();input.addEventListener('input',()=>{game.settings.set(key,Number(input.value));render();});};
  bindSlider('friction','friction',(value)=>value.toFixed(3));bindSlider('merge','mergeProbability',(value)=>`${Math.round(value*100)}%`);bindSlider('split','splitProbability',(value)=>`${Math.round(value*100)}%`);
  const count=document.querySelector<HTMLInputElement>('#count-slider')!,countValue=document.querySelector<HTMLOutputElement>('#count-value')!,renderCount=()=>{countValue.value=count.value;};count.value=String(game.settings.values.initialBallCount);renderCount();count.addEventListener('input',()=>{game.setInitialBallCount(Number(count.value));renderCount();});
  const gravity=document.querySelector<HTMLInputElement>('#gravity-slider')!,gravityValue=document.querySelector<HTMLOutputElement>('#gravity-value')!,renderGravity=()=>{gravityValue.value=Number(gravity.value).toFixed(5);};gravity.value=String(game.settings.values.gravity);renderGravity();gravity.addEventListener('input',()=>{game.setGravity(Number(gravity.value));renderGravity();});
  toggle.addEventListener('click',()=>{const open=panel.toggleAttribute('data-open');toggle.setAttribute('aria-expanded',String(open));});
  document.querySelector('#restart-btn')!.addEventListener('click',()=>{game.restart();panel.removeAttribute('data-open');});
  tilt.addEventListener('click',()=>{game.tilt.setEnabled(!game.tilt.enabled);labels();}); sound.addEventListener('click',()=>{game.audio.setEnabled(!game.audio.enabled);labels();});
  document.querySelector('#calibrate-btn')!.addEventListener('click',()=>{game.tilt.recalibrate();panel.removeAttribute('data-open');});
};
