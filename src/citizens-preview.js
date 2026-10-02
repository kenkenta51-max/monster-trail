import * as THREE from 'three';
import { makeNPCModel, animateNPCModel } from './npc-models.js';

const cast = [
  ['ナギ','モンスター研究家','#f5e5ce'],['ソウ','会社員','#567787'],['ミオ','学生','#bd889c'],
  ['ルカ','観光客','#e4c28a'],['ハル','カフェ店員','#90bca6'],['レン','ミュージシャン','#d39b64'],
  ['ユイ','買い物客','#b89bd3'],['タク','犬の散歩中','#b8aa78'],['キリ','スケーター','#7aabbf'],
  ['ダイチ','警備員','#526482'],['アオ','花屋','#d39f9d'],['イト','配達員','#cf9068'],
];
const skins=['#e6b88d','#c68e74','#edc7a6'];
const canvas=document.querySelector('#stage');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
const scene=new THREE.Scene();scene.background=new THREE.Color('#83a9ad');scene.fog=new THREE.Fog('#83a9ad',12,22);
scene.add(new THREE.HemisphereLight('#fff5e4','#496f78',2.6));
const key=new THREE.DirectionalLight('#fff1d8',3.3);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;scene.add(key);
const fill=new THREE.DirectionalLight('#a9d6e4',1.3);fill.position.set(4,2,-3);scene.add(fill);
const floor=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.35,.23,64),new THREE.MeshStandardMaterial({color:'#356f73',roughness:.8}));floor.position.y=-.115;floor.receiveShadow=true;scene.add(floor);
const rim=new THREE.Mesh(new THREE.TorusGeometry(2.2,.025,8,64),new THREE.MeshStandardMaterial({color:'#c5ebaa',emissive:'#a6d67e',emissiveIntensity:.3}));rim.rotation.x=Math.PI/2;rim.position.y=.01;scene.add(rim);
const camera=new THREE.PerspectiveCamera(35,1,.1,50);
const models=cast.map((entry,i)=>makeNPCModel(i,entry[2],skins[i%3]));
let selected=0,moving=false,yaw=.38,pitch=.08,distance=4.8,dragging=false,lastX=0,lastY=0;
scene.add(models[0]);
const roster=document.querySelector('#roster');
cast.forEach(([name],i)=>{const button=document.createElement('button');button.textContent=name;button.addEventListener('click',()=>select(i));roster.append(button);});
function select(index){scene.remove(models[selected]);selected=index;scene.add(models[selected]);document.querySelector('#name').textContent=cast[index][0];document.querySelector('#role').textContent=cast[index][1];[...roster.children].forEach((button,i)=>button.classList.toggle('active',i===index));}
select(0);
document.querySelector('#idle').addEventListener('click',()=>motion(false));document.querySelector('#walk').addEventListener('click',()=>motion(true));
function motion(value){moving=value;document.querySelector('#idle').classList.toggle('active',!moving);document.querySelector('#walk').classList.toggle('active',moving);}
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!dragging)return;yaw+=(e.clientX-lastX)*.008;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-lastY)*.006,-.34,.58);lastX=e.clientX;lastY=e.clientY;});
canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('lostpointercapture',()=>dragging=false);
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+Math.sign(e.deltaY)*.35,3.1,8.8);},{passive:false});
const clock=new THREE.Clock();let time=0;
function frame(){requestAnimationFrame(frame);time+=Math.min(clock.getDelta(),.05);animateNPCModel(models[selected],time,moving);camera.position.set(Math.sin(yaw)*distance*Math.cos(pitch),.9+Math.sin(pitch)*distance,Math.cos(yaw)*distance*Math.cos(pitch));camera.lookAt(0,.85,0);renderer.render(scene,camera);}frame();
