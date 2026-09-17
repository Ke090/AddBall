import './styles/main.css';
import { Game } from './game/Game';
import { bindMenu } from './ui/menu';
const debug=new URLSearchParams(location.search).get('debug')==='1';
document.querySelector<HTMLDivElement>('#app')!.innerHTML=`<main class="shell"><header><span class="brand">ADDBALL <b>30</b></span><button id="menu-toggle" class="icon-button" aria-label="メニュー" aria-expanded="false">•••</button><nav id="menu-panel" aria-label="ゲーム設定"><button id="restart-btn">はじめから</button><button id="tilt-btn"></button><button id="calibrate-btn">傾きを再調整</button><button id="sound-btn"></button></nav></header><section class="stage"><canvas id="game" aria-label="AddBall ゲームフィールド"></canvas><div id="start-screen"><div class="start-mark">30</div><h1>玉をぶつけて、大きくする。</h1><p>壁に強く当たると、割れる。</p><button id="start-btn">START</button><small>傾き操作は任意です。センサー情報は送信されません。</small></div>${debug?'<pre id="debug" aria-live="off"></pre>':''}</section></main>`;
const game=new Game(document.querySelector<HTMLCanvasElement>('#game')!,document.querySelector('#debug')); bindMenu(game);
document.querySelector<HTMLButtonElement>('#start-btn')!.addEventListener('click',async()=>{const start=document.querySelector<HTMLElement>('#start-screen')!,button=document.querySelector<HTMLButtonElement>('#start-btn')!;button.disabled=true;await game.start();start.classList.add('hidden');setTimeout(()=>start.remove(),450);});
if('serviceWorker'in navigator)window.addEventListener('load',()=>{void navigator.serviceWorker.register('/sw.js');});
