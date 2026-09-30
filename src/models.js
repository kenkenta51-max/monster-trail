import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
const mats = new Map();
export function mat(color, emissive = false) { const key = color + ':' + emissive; if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: .7, flatShading: false, ...(emissive ? { emissive: color, emissiveIntensity: .6 } : {}) })); return mats.get(key); }
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const sphereGeo = new THREE.SphereGeometry(1, 24, 16);
const smallSphereGeo = new THREE.SphereGeometry(1, 16, 12);
const roundedGeo = new RoundedBoxGeometry(1,1,1,3,.14);
const eyeMaterial = new THREE.MeshPhysicalMaterial({color:'#193344',roughness:.12,clearcoat:1,clearcoatRoughness:.07});
const aquaMaterial = new THREE.MeshPhysicalMaterial({color:'#72c9d9',roughness:.27,clearcoat:.85,clearcoatRoughness:.2});
const pearlMaterial = new THREE.MeshPhysicalMaterial({color:'#bbf0ed',roughness:.12,metalness:.12,clearcoat:1});
const mouthGeometry = new THREE.TorusGeometry(.071,.012,8,20,Math.PI);
const pearlRingGeometry = new THREE.TorusGeometry(.22,.018,8,32);
const cylinderGeometries = new Map();
export function box(parent, color, x, y, z, w, h, d, emissive = false) { const m = new THREE.Mesh(boxGeo, mat(color, emissive)); m.position.set(x, y, z); m.scale.set(w, h, d); parent.add(m); m.castShadow = true; m.receiveShadow = true; return m; }
export function orb(parent, color, x, y, z, sx, sy = sx, sz = sx, detail = 1) { const m = new THREE.Mesh(detail === 0 ? smallSphereGeo : sphereGeo, mat(color)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); m.castShadow = true; return m; }
export function cylinder(parent, color, x, y, z, top, bottom, height, segments = 16) { const key=[top,bottom,height,Math.max(12,segments)].join(':');if(!cylinderGeometries.has(key))cylinderGeometries.set(key,new THREE.CylinderGeometry(top,bottom,height,Math.max(12,segments)));const m = new THREE.Mesh(cylinderGeometries.get(key), mat(color)); m.position.set(x, y, z); parent.add(m); m.castShadow = true; m.receiveShadow = true; return m; }
export function makePerson(color = '#ed826a', skin = '#edb995', accessory = '') {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  box(body, color, 0, 1.03, 0, .57, .64, .36); box(body, '#eee6cf', 0, 1.38, .01, .18, .13, .23);
  orb(body, skin, 0, 1.65, 0, .31, .35, .28); orb(body, '#29313e', 0, 1.87, -.04, .33, .18, .29);
  box(body, '#29313e', -.24, 1.73, -.07, .13, .26, .32);
  for (const x of [-.115, .115]) { orb(body, '#18303a', x, 1.66, .262, .028, .037, .015); }
  const limbs = [];
  for (const x of [-.19, .19]) { const leg = new THREE.Group(); leg.position.set(x, .79, 0); root.add(leg); box(leg, '#27374c', 0, -.26, 0, .22, .54, .24); box(leg, '#f4e9d3', 0, -.62, .055, .24, .19, .37); limbs.push(leg); }
  for (const x of [-.39, .39]) { const arm = new THREE.Group(); arm.position.set(x, 1.31, 0); body.add(arm); box(arm, color, 0, -.18, 0, .18, .36, .23); orb(arm, skin, 0, -.46, .02, .105, .15, .1); limbs.push(arm); }
  if (accessory === 'player') { box(body, '#95c6bb', 0, 1.04, -.3, .46, .49, .24); box(body, '#dae49e', 0, 1.03, -.44, .31, .25, .06); box(body, '#f8ecd4', -.19, 1.09, .2, .065, .57, .04); box(body, '#f8ecd4', .19, 1.09, .2, .065, .57, .04); box(body, '#d4f88a', 0, 1.96, .03, .62, .14, .51); box(body, '#d4f88a', 0, 1.92, .31, .63, .05, .25); }
  if (accessory === 'researcher') { box(body, '#4b817d', 0, 1.08, .2, .13, .56, .04); box(body, '#344957', .48, .91, .12, .32, .4, .05); }
  if (accessory === 'student') box(body, '#eceec7', 0, 1.03, -.3, .48, .48, .2);
  if (accessory === 'tourist') { cylinder(body, '#efe2b4', 0, 1.94, 0, .4, .4, .08, 10); box(body, '#233944', 0, 1.1, .25, .25, .2, .16); }
  if (accessory === 'shopper') box(body, '#edd292', .49, .54, 0, .35, .48, .3);
  if (accessory === 'skater') { const board = box(body, '#b2e385', .54, .83, -.04, .2, 1.05, .11); board.rotation.z = -.18; }
  if (accessory === 'musician') { orb(body, '#d69a52', .07, .98, .35, .3, .4, .1); const neck = box(body, '#725748', .35, 1.2, .34, .1, .62, .1); neck.rotation.z = -.6; }
  root.traverse(mesh=>{if(mesh.isMesh&&mesh.geometry===boxGeo)mesh.geometry=roundedGeo;});
  root.userData = { limbs, body }; return root;
}
export function animatePerson(root, time, moving) { const { limbs, body } = root.userData; if (!limbs) return; const a = moving ? Math.sin(time * 11) * .58 : Math.sin(time * 2) * .025; limbs[0].rotation.x = a; limbs[1].rotation.x = -a; limbs[2].rotation.x = -a * .8; limbs[3].rotation.x = a * .8; body.position.y = moving ? Math.abs(Math.sin(time * 11)) * .055 : Math.sin(time * 2) * .015; }
export function makeMonsterModel(name) {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body); const features = new THREE.Group(); body.add(features);
  const eyes=[],ears=[],arms=[];let eyeY=.96,eyeZ=.51,eyeSpacing=.23;
  if (name === 'Flamo') {
    orb(body, '#e98553', 0, .65, 0, .51, .6, .4);orb(body,'#f5a264',0,1.05,.055,.59,.44,.46);orb(body, '#ffdfaa', 0, .56, .35, .33, .39, .13);
    for (const x of [-.38, .38]) { const ear=new THREE.Group();ear.position.set(x,1.33,0);body.add(ear);const lobe=orb(ear,'#ed965d',0,.19,0,.17,.34,.14);lobe.rotation.z=-x*.9;orb(ear,'#ffd8a0',0,.2,.105,.08,.2,.04);ears.push(ear);orb(body,'#804b48',x*.8,.14,.16,.23,.14,.27); }
    const tail = new THREE.Group(); tail.position.set(0, .48, -.31); body.add(tail);orb(tail,'#dc784d',.13,.02,-.33,.19,.18,.46);orb(tail,'#ffbd55',.3,.34,-.74,.25,.43,.25);orb(tail,'#ffdb86',.38,.54,-.77,.13,.3,.15);orb(tail,'#fff0bd',.29,.3,-.95,.1,.23,.05);root.userData.tail=tail;
    for(const x of [-.49,.49])arms.push(orb(body,'#ef9b61',x,.65,.08,.18,.27,.19));
    orb(body,'#f9dca6',0,.86,.46,.24,.16,.11);orb(body,'#694449',0,.97,.565,.055,.045,.025);
    eyeY=1.12;eyeZ=.455;
  } else if (name === 'Aquari') {
    const torso=orb(body,'#72c9d9',0,.64,0,.72,.56,.55);torso.material=aquaMaterial;
    orb(body,'#d9f3e9',0,.43,.43,.5,.3,.17);
    for(const x of [-.66,.66]){const fin=orb(body,'#55a9c3',x,.66,-.03,.32,.13,.32);fin.rotation.z=x*.55;arms.push(fin);orb(body,'#568eae',x*.57,.13,.14,.25,.1,.27);}
    const crest=orb(body,'#b4e9ed',-.04,1.28,-.07,.18,.4,.19);crest.rotation.z=-.3;ears.push(crest);
    const tail=new THREE.Group();tail.position.set(0,.54,-.58);body.add(tail);for(const x of [-.18,.18]){const fluke=orb(tail,'#53abc5',x,.07,-.13,.27,.11,.26);fluke.rotation.z=x;}root.userData.tail=tail;
    const pearl=orb(features,'#e5fff0',.4,1.25,-.06,.12);pearl.material=pearlMaterial;
    const ring=new THREE.Mesh(pearlRingGeometry,mat('#ceffea',true));ring.position.set(.4,1.25,-.06);ring.rotation.y=.4;features.add(ring);
    eyeY=.88;eyeZ=.49;eyeSpacing=.255;
  } else {
    orb(body,'#bbce88',0,.62,0,.55,.61,.46);orb(body,'#dce8ab',0,.96,.05,.53,.42,.45);orb(body,'#f2eac7',0,.49,.39,.33,.32,.12);
    orb(body,'#7f9e59',0,1.21,-.04,.53,.22,.42);cylinder(body,'#788951',0,1.45,0,.043,.065,.37,12);
    for(const x of [-.28,.28]){orb(body,'#607b4e',x,.13,.15,.23,.13,.27);const leaf=orb(body,'#67b482',x*.8,1.59,0,.17,.37,.075);leaf.rotation.z=-x*2;ears.push(leaf);const arm=orb(body,'#83ac63',x*1.9,.64,.02,.17,.24,.16);arm.rotation.z=-x*.6;arms.push(arm);}
    for(let i=0;i<7;i++){const a=i/7*Math.PI*2;const leaf=orb(body,i%2?'#74ad6b':'#90bc75',Math.sin(a)*.4,.63,Math.cos(a)*.33,.15,.22,.07);leaf.rotation.y=a;leaf.rotation.z=Math.sin(a)*.4;}
    const tail=orb(body,'#86ad63',0,.42,-.48,.22,.24,.29);root.userData.tail=tail;eyeY=1.01;eyeZ=.45;eyeSpacing=.21;
  }
  for(const x of [-eyeSpacing,eyeSpacing]){const eye=new THREE.Group();eye.position.set(x,eyeY,eyeZ);body.add(eye);orb(eye,'#f3faf2',0,0,0,.112,.147,.039);orb(eye,'#1d3444',x>0?-.012:.012,0,.033,.081,.117,.022).material=eyeMaterial;orb(eye,'#ffffff',-.025,.047,.056,.034,.041,.01);orb(eye,'#9bdde5',.025,-.047,.055,.015,.02,.008);eyes.push(eye);orb(body,name==='Aquari'?'#c8b8d8':'#e6a796',x*1.52,eyeY-.18,eyeZ-.015,.078,.04,.02);}
  const mouth=new THREE.Mesh(mouthGeometry,mat('#586052'));mouth.rotation.z=Math.PI;mouth.position.set(0,eyeY-.23,name==='Flamo'?.568:eyeZ+.08);body.add(mouth);
  root.userData={...root.userData,body,name,eyes,ears,arms,features,performing:false};return root;
}
export function animateMonster(model,time,moving=false){if(model.userData.performing)return;const {body:b,name,eyes,ears,tail,features}=model.userData;const speed=name==='Flamo'?3.8:name==='Aquari'?2.2:2.8;const bounce=moving?.08:name==='Aquari'?.055:.025;b.position.y=Math.sin(time*(moving?9:speed))*bounce;b.rotation.z=Math.sin(time*speed*.65)*(name==='Leafy'?.045:.018);b.scale.set(1+Math.sin(time*speed)*.012,1-Math.sin(time*speed)*.015,1);if(tail)tail.rotation.y=Math.sin(time*(name==='Flamo'?5:2.7))*.18;const blink=time%4.3;eyes?.forEach(e=>e.scale.y=blink<.12?Math.max(.06,Math.abs(blink-.06)/.06):1);ears?.forEach((e,i)=>e.rotation.x=Math.sin(time*2+i)*.065);if(features)features.position.y=Math.sin(time*2.4)*.035;}

export function createPortraits() {
  const renderer = new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setSize(180,180);renderer.setPixelRatio(1);renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();scene.add(new THREE.HemisphereLight('#fff3dc','#758f9b',3));const light=new THREE.DirectionalLight('#fff3d3',2.4);light.position.set(-3,5,4);scene.add(light);
  const camera=new THREE.PerspectiveCamera(36,1,.1,20);camera.position.set(1.2,1.4,3.6);camera.lookAt(0,.82,0);const portraits={};
  for(const name of ['Flamo','Aquari','Leafy']){const monster=makeMonsterModel(name);scene.add(monster);renderer.render(scene,camera);portraits[name]=renderer.domElement.toDataURL('image/png');scene.remove(monster);}
  renderer.dispose();renderer.forceContextLoss();return portraits;
}
