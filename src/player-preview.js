import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas=document.querySelector('#stage');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
const scene=new THREE.Scene();scene.background=new THREE.Color('#87adaf');scene.fog=new THREE.Fog('#87adaf',12,22);
scene.add(new THREE.HemisphereLight('#fff8e6','#426974',2.4));
const key=new THREE.DirectionalLight('#fff4dc',3.5);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;scene.add(key);
const fill=new THREE.DirectionalLight('#9dcfe0',1.3);fill.position.set(4,2,-3);scene.add(fill);
const floor=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.35,.23,64),new THREE.MeshStandardMaterial({color:'#326c70',roughness:.8}));floor.position.y=-.115;floor.receiveShadow=true;scene.add(floor);
const rim=new THREE.Mesh(new THREE.TorusGeometry(2.2,.025,8,64),new THREE.MeshStandardMaterial({color:'#c5ebaa',emissive:'#a6d67e',emissiveIntensity:.3}));rim.rotation.x=Math.PI/2;rim.position.y=.01;scene.add(rim);
const camera=new THREE.PerspectiveCamera(35,1,.1,50);
let yaw=.33,pitch=.09,distance=4.9,dragging=false,lastX=0,lastY=0,mixer,actions,current='Idle';
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
addEventListener('resize',resize);resize();
canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!dragging)return;yaw+=(e.clientX-lastX)*.008;pitch=Math.max(-.34,Math.min(.58,pitch+(e.clientY-lastY)*.006));lastX=e.clientX;lastY=e.clientY;});
canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('lostpointercapture',()=>dragging=false);
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(3.1,Math.min(8.8,distance+Math.sign(e.deltaY)*.35));},{passive:false});
new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/trail-runner.glb?v=2`).then(gltf=>{
  gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(gltf.scene);
  mixer=new THREE.AnimationMixer(gltf.scene);actions=Object.fromEntries(gltf.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));actions.Idle.play();
}).catch(error=>{console.error(error);document.querySelector('#error').style.display='block';});
document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>{
  const next=button.dataset.action;if(!actions?.[next]||next===current)return;
  const action=actions[next];action.reset().play();actions[current].crossFadeTo(action,.22,false);current=next;
  document.querySelectorAll('[data-action]').forEach(b=>b.classList.toggle('active',b===button));
}));
const clock=new THREE.Clock();
function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05);mixer?.update(dt);camera.position.set(Math.sin(yaw)*distance*Math.cos(pitch),1.22+Math.sin(pitch)*distance,Math.cos(yaw)*distance*Math.cos(pitch));camera.lookAt(0,1.12,0);renderer.render(scene,camera);}
frame();
