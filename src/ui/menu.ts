import type { Game } from '../game/Game';
export const bindMenu=(game:Game):void=>{
  const panel=document.querySelector<HTMLElement>('#menu-panel')!,toggle=document.querySelector<HTMLButtonElement>('#menu-toggle')!,tilt=document.querySelector<HTMLButtonElement>('#tilt-btn')!,sound=document.querySelector<HTMLButtonElement>('#sound-btn')!;
  const labels=()=>{tilt.textContent=`傾き ${game.tilt.enabled?'ON':'OFF'}`;sound.textContent=`サウンド ${game.audio.enabled?'ON':'OFF'}`}; labels();
  toggle.addEventListener('click',()=>{const open=panel.toggleAttribute('data-open');toggle.setAttribute('aria-expanded',String(open));});
  document.querySelector('#restart-btn')!.addEventListener('click',()=>{game.restart();panel.removeAttribute('data-open');});
  tilt.addEventListener('click',()=>{game.tilt.setEnabled(!game.tilt.enabled);labels();}); sound.addEventListener('click',()=>{game.audio.setEnabled(!game.audio.enabled);labels();});
  document.querySelector('#calibrate-btn')!.addEventListener('click',()=>{game.tilt.recalibrate();panel.removeAttribute('data-open');});
};
