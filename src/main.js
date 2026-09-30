import * as THREE from 'three';
import './style.css';
import { createWorld, createArena, SPOTS } from './world.js';
import { makePerson, makeMonsterModel, animatePerson, animateMonster, createPortraits } from './models.js';
import { SPECIES, makeMonster, maxHP, damage, effectiveness, captureChance, rewardXP, initialSave, validateSave, canOccupy } from './rules.js';
import { playAttack } from './battle-effects.js';

const $ = id => document.getElementById(id);
const show = (id, yes) => { $(id).hidden = !yes; };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const SAVE_KEY = 'monster-trail-save-v1' + (import.meta.env.DEV && new URLSearchParams(location.search).has('qa') ? '-qa' : '');
let save = initialSave(), hasSave = false;
try { const stored = validateSave(JSON.parse(localStorage.getItem(SAVE_KEY))); if (stored) { save = stored; hasSave = true; } } catch { /* A missing/invalid save starts a fresh expedition. */ }
let mode = 'title', previousMode = 'field', moving = false, nearNPC = null, time = 0, cameraYaw = 0;
let battle = null, allyModel = null, enemyModel = null, cooldown = 5, encounterDistance = 0, encounterCheck = 0, spotNow = null;
let audio = null, muted = true, toastTimer, lastMap = 0, lastSaved = 0;
const keys = new Set();
const musicButtonText = () => document.querySelectorAll('.sound').forEach(b => b.textContent = b.classList.contains('ghost') ? `SOUND ${muted ? 'OFF' : 'ON'}` : `♪ ${muted ? 'OFF' : 'ON'}`);
function tone(freq = 440, duration = .12, type = 'sine', volume = .035) { if (muted) return; try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); const oscillator = audio.createOscillator(), gain = audio.createGain(); oscillator.type = type; oscillator.frequency.setValueAtTime(freq, audio.currentTime); oscillator.connect(gain); gain.connect(audio.destination); gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration); oscillator.start(); oscillator.stop(audio.currentTime + duration); } catch {} }
function chime() { [523,659,784].forEach((f,i)=>setTimeout(()=>tone(f,.23,'sine'),i*95)); }
function toast(message) { $('toast').textContent = message; show('toast', true); clearTimeout(toastTimer); toastTimer = setTimeout(()=>show('toast',false),3500); }
function setMode(next) { mode=next; document.body.dataset.mode=next; keys.clear(); show('hud',['field','dialog'].includes(next)); show('battle',next==='battle'); show('prompt',false); }
function active() { return save.team[save.active]; }
function persist() { if (mode === 'title') return; save.position={x:player.position.x,z:player.position.z}; try { localStorage.setItem(SAVE_KEY,JSON.stringify(save)); $('save-status').textContent='SAVED'; setTimeout(()=>$('save-status').textContent='AUTO SAVE',1500); } catch { $('save-status').textContent='保存できません'; } }
function updateQuest() { if(!save.metResearcher){$('quest-title').textContent='虹街へようこそ';$('quest-text').textContent='近くの研究家に話しかけよう';} else if(save.team.length<3){$('quest-title').textContent=`虹街の仲間を見つけよう  ${save.team.length} / 3`;$('quest-text').textContent='公園・駅前・路地の光を探そう';}else{$('quest-title').textContent='虹街トレイル、コンプリート！';$('quest-text').textContent='3種類が仲間に。自由な冒険を続けよう';} }
function setHP(id, monster) { const ratio = monster.hp / maxHP(monster.name, monster.level); $(id).style.width=`${Math.max(0,ratio)*100}%`; $(id).style.background=ratio<.25?'#ec8c79':ratio<.5?'#efd384':'#c6f87b'; }
function updateHUD() { const m=active();$('partner-name').textContent=m.name;$('partner-level').textContent=`Lv. ${m.level}`;$('partner-health').textContent=`${m.hp} / ${maxHP(m.name,m.level)} HP`;setHP('partner-hp',m);const icon=$('partner-card').querySelector('.creature-icon');icon.className=`creature-icon ${SPECIES[m.name].type}`;icon.innerHTML=`<img src="${portraits[m.name]}" alt="" />`;$('collection-count').textContent=`0${save.team.length} / 03`; updateQuest(); }

let renderer, world, arena, player, companion, camera, portraits;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true, powerPreference: 'high-performance' }); renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  world=createWorld();arena=createArena();portraits=createPortraits();camera=new THREE.PerspectiveCamera(47,innerWidth/innerHeight,.1,220);camera.position.set(5,19,30);
  player=makePerson('#e68e76','#efc49f','player');player.position.set(save.position.x,.23,save.position.z);player.rotation.y=Math.PI;world.dynamic.add(player);if(!canOccupy(player.position.x,player.position.z,world.colliders))player.position.set(0,.23,15);
  companion=makeMonsterModel(active().name);companion.scale.setScalar(.56);companion.position.copy(player.position).add(new THREE.Vector3(-1,0,1));world.dynamic.add(companion);
  $('start').disabled=false;$('start').firstElementChild.textContent=hasSave?'CONTINUE TRAIL':'START GAME';document.body.dataset.mode='title';
} catch (error) { show('fatal',true);$('fatal-detail').textContent=error.message;throw error; }

function replaceCompanion() { world.dynamic.remove(companion);companion=makeMonsterModel(active().name);companion.scale.setScalar(.56);companion.position.copy(player.position).add(new THREE.Vector3(-1,0,1));world.dynamic.add(companion); }
async function wipe(text, action) { $('transition-text').textContent=text;$('transition').classList.add('active');await delay(420);action();await delay(200);$('transition').classList.remove('active'); }
$('start').addEventListener('click',async()=>{if(mode!=='title')return;setMode('transition');chime();await wipe('WELCOME TO NIJIMACHI',()=>{show('title',false);setMode('field');camera.position.copy(player.position).add(new THREE.Vector3(0,6.8,10));camera.lookAt(player.position.clone().add(new THREE.Vector3(0,1,0)));updateHUD();});toast(hasSave?'おかえりなさい。虹街の冒険を続けよう。':'虹街へようこそ！ 近くの研究家に E で話しかけよう。');persist();});
document.querySelectorAll('.sound').forEach(button=>button.addEventListener('click',()=>{muted=!muted;musicButtonText();tone(659,.2);}));

function talk() { if(mode!=='field'||!nearNPC)return;setMode('dialog');$('dialog-name').textContent=nearNPC.name;$('dialog-text').textContent=nearNPC.text;show('dialog',true);$('dialog-close').focus();tone(510,.08);if(nearNPC.role==='researcher'){save.metResearcher=true;updateQuest();}if(nearNPC.name.includes('カフェ')){save.team.forEach(m=>m.hp=maxHP(m.name,m.level));save.potions=Math.max(5,save.potions);save.prisms=Math.max(8,save.prisms);chime();updateHUD();}persist(); }
function closeDialog(){show('dialog',false);setMode('field');}
$('dialog-close').addEventListener('click',closeDialog);
function openCollection(){if(mode!=='field')return;setMode('collection');renderCollection();show('collection',true);$('collection-close').focus();}
function renderCollection(){ $('collection-grid').replaceChildren(); for(const [name,s] of Object.entries(SPECIES)){const index=save.team.findIndex(m=>m.name===name),m=save.team[index];const card=document.createElement('article');card.className='monster-card'+(m?'':' locked');card.innerHTML=`<span class="tiny">${s.label.toUpperCase()} / ${s.habitat}</span><span class="creature-icon ${s.type}">${m?`<img src="${portraits[name]}" alt="" />`:'?'}</span><h3>${m?name:'まだ見ぬ仲間'}</h3><small>${m?`Lv. ${m.level} · HP ${m.hp} / ${maxHP(name,m.level)}`:'未発見'}</small><p>${m?s.description:`${s.habitat}の光を探そう。`}</p>`;const b=document.createElement('button');b.disabled=!m||index===save.active;b.textContent=!m?'まだ出会っていません':index===save.active?'いっしょに冒険中':'この子と冒険する';b.addEventListener('click',()=>{save.active=index;replaceCompanion();updateHUD();renderCollection();persist();tone(659,.1);});card.append(b);$('collection-grid').append(card);} $('inventory').innerHTML=`<span>ポーション <b>${save.potions}</b></span><span>リンクプリズム <b>${save.prisms}</b></span><span>勝利数 <b>${save.wins}</b></span>`; }
function closeCollection(){show('collection',false);setMode('field');}
$('collection-button').addEventListener('click',openCollection);$('collection-close').addEventListener('click',closeCollection);
function openHelp(){if(mode!=='field')return;previousMode=mode;setMode('help');show('help',true);$('help-close').focus();}
function closeHelp(){show('help',false);setMode(previousMode);}
$('help-button').addEventListener('click',openHelp);$('help-close').addEventListener('click',closeHelp);$('help-done').addEventListener('click',closeHelp);

window.addEventListener('keydown',event=>{
  if(event.code==='Tab') { const root=mode==='dialog'?$('dialog'):mode==='help'?$('help'):mode==='collection'?$('collection'):mode==='battle'?$('battle'):null; if(root){const items=[...root.querySelectorAll('button:not(:disabled)')];const current=items.indexOf(document.activeElement);if(items.length&&(current<0||(!event.shiftKey&&current===items.length-1)||(event.shiftKey&&current===0))){event.preventDefault();items[event.shiftKey?items.length-1:0].focus();}}return; }
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code))event.preventDefault();
  if(event.repeat){if(mode==='field')keys.add(event.code);return;}
  if(event.code==='KeyE'||event.code==='Enter'){if(mode==='dialog'){event.preventDefault();closeDialog();return;}if(mode==='field'){talk();return;}}
  if(event.code==='KeyM'){if(mode==='collection')closeCollection();else openCollection();return;}
  if(event.code==='Escape'){if(mode==='dialog')closeDialog();else if(mode==='collection')closeCollection();else if(mode==='help')closeHelp();else if(mode==='field')openHelp();return;}
  if(mode==='field')keys.add(event.code);
});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>{keys.clear();clock.getDelta();if(document.hidden)persist();});
let dragging=false,lastPointerX=0;
$('game').addEventListener('pointerdown',e=>{if(mode==='field'){dragging=true;lastPointerX=e.clientX;$('game').setPointerCapture(e.pointerId);}});
$('game').addEventListener('pointermove',e=>{if(dragging&&mode==='field'){cameraYaw-=(e.clientX-lastPointerX)*.006;lastPointerX=e.clientX;}});
$('game').addEventListener('pointerup',()=>dragging=false);$('game').addEventListener('lostpointercapture',()=>dragging=false);

async function beginBattle(spot){if(mode!=='field')return;setMode('transition');spotNow=null;show('spot-banner',false);tone(180,.35,'triangle');await wipe(`野生の ${spot.species} が現れた！`,()=>{
  if(active().hp<=0){const alive=save.team.findIndex(m=>m.hp>0);if(alive>=0){save.active=alive;replaceCompanion();}else active().hp=maxHP(active().name,active().level);}
  battle={enemy:makeMonster(spot.species,Math.max(5,active().level-1)),turn:1,busy:false,spot,ended:false};
  if(allyModel)arena.scene.remove(allyModel);if(enemyModel)arena.scene.remove(enemyModel);
  allyModel=makeMonsterModel(active().name);enemyModel=makeMonsterModel(spot.species);allyModel.scale.setScalar(1.55);enemyModel.scale.setScalar(1.55);allyModel.position.copy(arena.stages[0]);enemyModel.position.copy(arena.stages[1]);allyModel.rotation.y=Math.atan2(6.2,-5);enemyModel.rotation.y=Math.atan2(-6.2,5);arena.scene.add(allyModel,enemyModel);
  $('battle-location').textContent=`虹街 / ${spot.name}`;setMode('battle');battleMessage(`野生の ${spot.species} が現れた！`);updateBattle();commandMenu();
});}
function battleMessage(text){$('battle-message').textContent=text;}
function updateBattle(){const a=active(),e=battle.enemy;for(const [prefix,m] of [['ally',a],['enemy',e]]){$(`${prefix}-name`).textContent=m.name;$(`${prefix}-level`).textContent=`Lv. ${m.level} / ${SPECIES[m.name].label}`;$(`${prefix}-health`).textContent=`${m.hp} / ${maxHP(m.name,m.level)} HP`;setHP(`${prefix}-hp`,m);}$('ally-xp').style.width=`${a.xp/(a.level*12)*100}%`;$('turn-label').textContent=`TURN ${String(battle.turn).padStart(2,'0')}`;updateHUD();}
function commands(items){$('battle-commands').replaceChildren();for(const item of items){const button=document.createElement('button');button.textContent=item.label;if(item.detail){const small=document.createElement('small');small.textContent=item.detail;button.append(small);}button.disabled=!!item.disabled;button.addEventListener('click',item.action);$('battle-commands').append(button);} }
function commandMenu(){if(!battle||battle.busy||battle.ended)return;commands([{label:'たたかう',detail:'技を選んで攻撃',action:moveMenu},{label:'アイテム',detail:'回復・モンスターを仲間に',action:itemMenu},{label:'にげる',detail:'安全にフィールドへ戻る',action:()=>finishBattle('run')},{label:'仲間を見る',detail:'属性と残りHPを確認',action:()=>{battleMessage(save.team.map(m=>`${m.name} (${SPECIES[m.name].label})  HP ${m.hp}`).join(' / '));}}]);}
function moveMenu(){if(battle.busy)return;commands([...SPECIES[active().name].moves.map((move,i)=>({label:move.name,detail:`${move.type==='normal'?'通常':SPECIES[active().name].label} / 威力 ${move.power} · ${move.description}`,action:()=>playerAttack(i)})),{label:'← もどる',action:commandMenu}]);}
function itemMenu(){if(battle.busy)return;commands([{label:`ポーション ×${save.potions}`,detail:'HPを30回復 · 1ターン消費',disabled:save.potions<=0,action:usePotion},{label:`リンクプリズム ×${save.prisms}`,detail:'HPを減らすと仲間にしやすい',disabled:save.prisms<=0,action:tryCapture},{label:'← もどる',action:commandMenu}]);}
function lockBattle(){battle.busy=true;$('battle-commands').querySelectorAll('button').forEach(b=>b.disabled=true);}
async function playerAttack(index){
  if(battle.busy||battle.ended)return;lockBattle();const a=active(),e=battle.enemy,move=SPECIES[a.name].moves[index];battleMessage(`${a.name} の ${move.name}！`);
  const amount=damage(a,e,move),strong=effectiveness(move.type,SPECIES[e.name].type);
  await playAttack({scene:arena.scene,camera:arena.camera,attacker:allyModel,defender:enemyModel,move,onSound:tone,onImpact:()=>{
    e.hp=Math.max(0,e.hp-amount);battleMessage(`${move.name}！ ${amount} ダメージ。${strong>1?'相性ばつぐん！':strong<1?'少し効きにくいようだ。':''}`);updateBattle();
  }});
  await delay(450);if(e.hp===0){await finishBattle('win');return;}await enemyTurn();
}
async function enemyTurn(){
  if(battle.ended)return;const move=SPECIES[battle.enemy.name].moves[Math.random()<.65?0:1];battleMessage(`${battle.enemy.name} の ${move.name}！`);await delay(220);
  const amount=damage(battle.enemy,active(),move);
  await playAttack({scene:arena.scene,camera:arena.camera,attacker:enemyModel,defender:allyModel,move,onSound:tone,onImpact:()=>{
    active().hp=Math.max(0,active().hp-amount);updateBattle();battleMessage(`${active().name} に ${amount} ダメージ。`);
  }});
  await delay(450);if(active().hp<=0){const next=save.team.findIndex(m=>m.hp>0);if(next>=0){save.active=next;arena.scene.remove(allyModel);allyModel=makeMonsterModel(active().name);allyModel.scale.setScalar(1.55);allyModel.position.copy(arena.stages[0]);allyModel.rotation.y=Math.atan2(6.2,-5);arena.scene.add(allyModel);replaceCompanion();battleMessage(`たのんだよ、${active().name}！`);await delay(500);}else{await finishBattle('lose');return;}}
  battle.turn++;battle.busy=false;updateBattle();battleMessage(`${active().name} はどうする？`);commandMenu();persist();
}
async function usePotion(){if(battle.busy||save.potions<=0)return;if(active().hp===maxHP(active().name,active().level)){battleMessage('HPは満タンです。ポーションは使いませんでした。');commandMenu();return;}lockBattle();save.potions--;active().hp=Math.min(maxHP(active().name,active().level),active().hp+30);chime();battleMessage(`${active().name} のHPが回復した！`);updateBattle();await delay(900);await enemyTurn();}
async function tryCapture(){if(battle.busy||save.prisms<=0)return;if(save.team.some(m=>m.name===battle.enemy.name)){battleMessage(`${battle.enemy.name} はすでに仲間です。別の種類との出会いを探そう。`);commandMenu();return;}lockBattle();save.prisms--;battleMessage('リンクプリズムを投げた！ 想いをつなごう…');tone(880,.4,'sine');const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.35),new THREE.MeshStandardMaterial({color:'#d8f799',emissive:'#c6f87b',emissiveIntensity:.8,metalness:.35,roughness:.3}));arena.scene.add(gem);for(let i=0;i<30;i++){gem.position.lerpVectors(arena.stages[0],arena.stages[1],i/29);gem.position.y+=Math.sin(i/29*Math.PI)*4+1;gem.rotation.y=i*.3;await delay(20);}arena.scene.remove(gem);gem.geometry.dispose();gem.material.dispose();if(Math.random()<captureChance(battle.enemy)){save.team.push({...battle.enemy,hp:maxHP(battle.enemy.name,battle.enemy.level),xp:0});await finishBattle('capture');}else{battleMessage('プリズムから飛び出した！ HPをもう少し減らそう。');await delay(900);await enemyTurn();}}
async function finishBattle(result){if(!battle||battle.ended)return;lockBattle();battle.ended=true;let message;
  if(result==='win'||result==='capture'){save.wins++;const levels=rewardXP(active(),30);message=result==='capture'?`${battle.enemy.name} が仲間になった！`:`${battle.enemy.name} に勝利！`;message+=` 30 EXP 獲得。${levels?` Lv. ${active().level} にアップ！`:''}`;chime();if(save.team.length===3)updateQuest();}
  else if(result==='lose'){message='仲間はひと休み。研究家が全員を回復してくれた！';save.team.forEach(m=>m.hp=maxHP(m.name,m.level));player.position.set(0,.23,15);}
  else{message='うまく逃げられた！ 街の探索に戻ろう。';}
  battleMessage(message);updateBattle();persist();commands([{label:'街の探索に戻る →',detail:result==='capture'?'M キーで新しい仲間を選べます':'冒険はまだまだ続く',action:async()=>{if(mode!=='battle')return;setMode('transition');await wipe('BACK TO THE TRAIL',()=>{setMode('field');cooldown=7;encounterDistance=0;encounterCheck=0;updateHUD();replaceCompanion();camera.position.copy(player.position).add(new THREE.Vector3(Math.sin(cameraYaw)*10,6.8,Math.cos(cameraYaw)*10));});battle=null;persist();if(save.team.length===3)toast('3種類の仲間がそろった！ 虹街トレイル、コンプリート。');}}]);
}

const mapCtx=$('minimap').getContext('2d');
function drawMap(){const c=mapCtx,w=210,h=180;const px=x=>w/2+x*1.83,pz=z=>h/2+z*1.83;c.clearRect(0,0,w,h);c.fillStyle='#23404a';c.fillRect(0,0,w,h);c.fillStyle='#3d5660';c.fillRect(px(-8.7),0,17.4*1.83,h);c.fillRect(0,pz(-8.7),w,17.4*1.83);c.fillRect(0,pz(-39.8),w,8*1.83);for(const b of world.buildings){c.fillStyle='#6a8180';c.fillRect(px(b.x-b.w/2),pz(b.z-b.d/2),b.w*1.83,b.d*1.83);}for(const spot of SPOTS){c.fillStyle=spot.color+'38';c.strokeStyle=spot.color;c.lineWidth=1;c.beginPath();c.arc(px(spot.x),pz(spot.z),spot.r*1.83,0,Math.PI*2);c.fill();c.stroke();c.fillStyle=spot.color;c.beginPath();c.arc(px(spot.x),pz(spot.z),2,0,Math.PI*2);c.fill();}c.fillStyle='#e4d6a2';world.npcs.forEach(n=>{c.beginPath();c.arc(px(n.model.position.x),pz(n.model.position.z),1.5,0,Math.PI*2);c.fill();});c.save();c.translate(px(player.position.x),pz(player.position.z));c.rotate(-player.rotation.y);c.fillStyle='#ffffff';c.shadowColor='#c6f87b';c.shadowBlur=9;c.beginPath();c.moveTo(0,5);c.lineTo(-4,-4);c.lineTo(4,-4);c.closePath();c.fill();c.restore();}
const desired=new THREE.Vector3(),target=new THREE.Vector3(),camDirection=new THREE.Vector3();const ray=new THREE.Ray();const intersection=new THREE.Vector3();
function fieldUpdate(dt){
  cooldown=Math.max(0,cooldown-dt);if(keys.has('KeyQ'))cameraYaw+=dt*1.4;if(keys.has('KeyR'))cameraYaw-=dt*1.4;
  let x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),z=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
  const len=Math.hypot(x,z);moving=len>0;let traveled=0;
  if(moving){x/=len;z/=len;const dx=x*Math.cos(cameraYaw)+z*Math.sin(cameraYaw),dz=z*Math.cos(cameraYaw)-x*Math.sin(cameraYaw);const speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?7.7:4.5;const sx=dx*speed*dt,sz=dz*speed*dt;const ox=player.position.x,oz=player.position.z;if(canOccupy(ox+sx,oz,world.colliders))player.position.x+=sx;if(canOccupy(player.position.x,oz+sz,world.colliders))player.position.z+=sz;traveled=Math.hypot(player.position.x-ox,player.position.z-oz);moving=traveled>.0001;const angle=Math.atan2(dx,dz);player.rotation.y+=Math.atan2(Math.sin(angle-player.rotation.y),Math.cos(angle-player.rotation.y))*Math.min(1,dt*13);}
  animatePerson(player,time*(keys.has('ShiftLeft')?1.35:1),moving);
  const follow=player.position.clone().add(new THREE.Vector3(-Math.sin(player.rotation.y)*1.3+.75,0,-Math.cos(player.rotation.y)*1.3));
  if(canOccupy(follow.x,follow.z,world.colliders,.25))companion.position.lerp(follow,Math.min(1,dt*5));else companion.position.lerp(player.position,Math.min(1,dt*5));companion.rotation.y=player.rotation.y;animateMonster(companion,time,moving);
  nearNPC=null;let nearest=3.7;for(const npc of world.npcs){const distance=npc.model.position.distanceTo(player.position);if(distance<nearest){nearest=distance;nearNPC=npc;}}
  show('prompt',!!nearNPC);if(nearNPC)$('prompt').lastElementChild.textContent=`話す · ${nearNPC.name}`;
  const spot=SPOTS.find(s=>Math.hypot(player.position.x-s.x,player.position.z-s.z)<s.r);
  if(spot!==spotNow){encounterDistance=0;encounterCheck=0;spotNow=spot;}
  show('spot-banner',!!spot&&cooldown<=0);
  $('area-name').textContent=spot?spot.name:Math.abs(player.position.x)<12&&Math.abs(player.position.z)<12?'スクランブル交差点':player.position.z< -12?'虹街ステーション通り':'虹街センター通り';
  if(spot&&moving&&cooldown<=0){encounterDistance+=traveled;encounterCheck+=traveled;if(encounterCheck>1.5){encounterCheck=0;if((encounterDistance>2&&Math.random()<.32)||encounterDistance>12)beginBattle(spot);}}
}
function updateCamera(dt){target.copy(player.position);target.y+=1.3;desired.set(player.position.x+Math.sin(cameraYaw)*10,player.position.y+5.4,player.position.z+Math.cos(cameraYaw)*10);camDirection.copy(desired).sub(target);const distance=camDirection.length();camDirection.normalize();ray.set(target,camDirection);let limit=distance;for(const b of world.buildings){const bounds=new THREE.Box3(new THREE.Vector3(b.x-b.w/2-.3,0,b.z-b.d/2-.3),new THREE.Vector3(b.x+b.w/2+.3,b.h+1,b.z+b.d/2+.3));if(ray.intersectBox(bounds,intersection))limit=Math.min(limit,Math.max(1.2,target.distanceTo(intersection)-.5));}desired.copy(target).addScaledVector(camDirection,limit);camera.position.lerp(desired,1-Math.exp(-dt*5));camera.lookAt(target);}
const clock=new THREE.Clock();let lastAmbient=0;
function frame(){requestAnimationFrame(frame);if(document.hidden)return;const dt=Math.min(clock.getDelta(),.05);time+=dt;world.update(time,dt,mode==='title');
  if(mode==='title'){camera.position.set(5+Math.sin(time*.07)*1.3,19,30+Math.cos(time*.07)*1.3);camera.lookAt(-3,5,-8);player.visible=false;companion.visible=false;renderer.render(world.scene,camera);}
  else if(mode==='battle'){animateMonster(allyModel,time);animateMonster(enemyModel,time+1);renderer.render(arena.scene,arena.camera);}
  else{player.visible=true;companion.visible=true;if(mode==='field')fieldUpdate(dt);updateCamera(dt);renderer.render(world.scene,camera);if(time-lastMap>.09){drawMap();lastMap=time;}}
  if(mode==='field'&&time-lastSaved>15){persist();lastSaved=time;}
  if(mode==='field'&&time-lastAmbient>4&&!muted){lastAmbient=time;tone([261.63,329.63,392,493.88][Math.floor(time/4)%4],1.6,'sine',.012);}
}
frame();
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();arena.camera.aspect=innerWidth/innerHeight;arena.camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
window.addEventListener('pagehide',persist);
// Read-only diagnostics help verify real input-driven gameplay and performance.
window.monsterTrail = Object.freeze({ getState: () => ({ mode, player:{x:player.position.x,z:player.position.z}, area:spotNow?.name??null, nearNPC:nearNPC?.name??null, team:save.team.map(m=>({...m})), inventory:{potions:save.potions,prisms:save.prisms}, battle:battle?{enemy:{...battle.enemy},turn:battle.turn,busy:battle.busy,ended:battle.ended}:null, draws:renderer.info.render.calls, triangles:renderer.info.render.triangles, npcCount:world.npcs.length, camera:{x:camera.position.x,y:camera.position.y,z:camera.position.z} }) });
