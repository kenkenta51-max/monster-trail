import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// A self-contained, original character asset. Run `npm run model:player` to rebuild it.
// The named transform groups and three clips are exported with the mesh so the
// character can also be inspected and animated in any glTF-compatible viewer.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(data => { this.result = data; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(data => { this.result = `data:${blob.type};base64,${Buffer.from(data).toString('base64')}`; this.onloadend?.(); }); }
};

const material = (color, roughness = .78, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const coral = material('#de715e'), coralLight = material('#f19b80'), coralDark = material('#a94949');
const cream = material('#f5e8d4'), skin = material('#e9b894'), skinShade = material('#ce9075');
const ink = material('#253342'), hair = material('#293546'), hairLight = material('#42516a');
const mint = material('#83bfb1'), mintDark = material('#4c8886'), lime = material('#c5e68d');
const navy = material('#324457'), navyLight = material('#4b6072'), sole = material('#f5e8d6');
const eye = material('#172b3e', .17), shine = material('#ffffff', .22);
const brass = material('#e7c386', .36, .38);

const root = new THREE.Group(); root.name = 'TrailRunner';
const torso = new THREE.Group(); torso.name = 'Torso'; torso.position.y = .86; root.add(torso);
const head = new THREE.Group(); head.name = 'Head'; head.position.y = .82; torso.add(head);
const limbs = {};

function mesh(parent, name, geometry, mat, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, mat); object.name = name;
  object.position.set(...position); object.scale.set(...scale); object.rotation.set(...rotation);
  object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
}
const sph = (p,n,m,pos,scale,segments=32) => mesh(p,n,new THREE.SphereGeometry(1,segments,20),m,pos,scale);
const round = (p,n,m,pos,size,r=.07) => mesh(p,n,new RoundedBoxGeometry(...size,4,r),m,pos);
function path(parent, name, mat, points, radius=.012) {
  return mesh(parent,name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),20,radius,6,false),mat);
}
function loft(parent,name,mat,rings,segments=32) {
  const vertices=[],indices=[];
  for (const [y,rx,rz,x=0,z=0] of rings) for(let j=0;j<segments;j++) {
    const a=2*Math.PI*j/segments;vertices.push(x+rx*Math.cos(a),y,z+rz*Math.sin(a));
  }
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<segments;j++){
    const a=i*segments+j,b=i*segments+(j+1)%segments,c=(i+1)*segments+j,d=(i+1)*segments+(j+1)%segments;
    if(rings[i+1][0]>rings[i][0])indices.push(a,c,b,b,c,d);
    else indices.push(a,b,c,b,d,c);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  return mesh(parent,name,geometry,mat);
}

// Tapered jacket and asymmetric explorer details give the protagonist a distinct silhouette.
loft(torso,'Tailored coral jacket',coral,[[-.12,.20,.13],[-.08,.29,.19],[.15,.315,.205],[.45,.28,.18],[.56,.23,.155],[.57,.13,.12]],36);
sph(torso,'Jacket hem',coralDark,[0,-.09,0],[.292,.056,.195]);
loft(torso,'Cream undershirt',cream,[[.38,.105,.125],[.47,.13,.14],[.56,.11,.12],[.58,.08,.09]],24);
path(torso,'Jacket zipper',brass,[[0,-.085,.202],[0,.11,.213],[0,.35,.2],[0,.47,.174]],.009);
path(torso,'Left jacket seam',coralLight,[[-.23,-.04,.114],[-.26,.13,.126],[-.23,.39,.13]],.011);
path(torso,'Right jacket seam',coralLight,[[.23,-.04,.114],[.26,.13,.126],[.23,.39,.13]],.011);
round(torso,'Explorer chest badge',mintDark,[-.178,.28,.174],[.11,.09,.025],.018);
mesh(torso,'Badge star',new THREE.OctahedronGeometry(.028,0),lime,[-.178,.28,.194],[1,.85,.4]);
sph(torso,'Neck',skin,[0,.605,0],[.105,.14,.105]);

// A shaped backpack, front straps and a small rolled map are visible from all angles.
round(torso,'Backpack body',mint,[0,.15,-.295],[.48,.55,.235],.11);
round(torso,'Backpack front pocket',mintDark,[0,.02,-.421],[.33,.27,.052],.043);
path(torso,'Backpack pocket seam',lime,[[-.145,.105,-.45],[0,.13,-.459],[.145,.105,-.45]],.009);
round(torso,'Backpack clasp',brass,[0,.095,-.465],[.06,.05,.023],.014);
for(const side of [-1,1]){
  path(torso,`${side<0?'Left':'Right'} backpack strap`,cream,[[side*.235,.48,-.12],[side*.235,.42,.08],[side*.22,.18,.195],[side*.205,-.06,.16]],.035);
}
mesh(torso,'Map roll',new THREE.CylinderGeometry(.055,.055,.35,20),cream,[.30,.18,-.33],[1,1,1],[0,0,.08]);
mesh(torso,'Map roll tie',new THREE.TorusGeometry(.058,.009,8,20),coralDark,[.30,.18,-.33],[1,1,1],[Math.PI/2,0,.08]);

// Soft face, layered hair, nose, eyebrows and a curved smile.
sph(head,'Face',skin,[0,.115,.015],[.275,.315,.255]);
sph(head,'Ear left',skin,[-.268,.115,-.007],[.061,.09,.041]);
sph(head,'Ear right',skin,[.268,.115,-.007],[.061,.09,.041]);
sph(head,'Ear inner left',skinShade,[-.311,.112,.004],[.015,.047,.025],16);
sph(head,'Ear inner right',skinShade,[.311,.112,.004],[.015,.047,.025],16);
sph(head,'Hair mass',hair,[0,.295,-.032],[.29,.195,.26]);
sph(head,'Side lock left',hair,[-.225,.2,.082],[.075,.14,.13]);
sph(head,'Side lock right',hair,[.225,.2,.082],[.075,.14,.13]);
for(const [x,z,rot] of [[-.13,.217,-.28],[-.028,.25,.09],[.092,.23,.28]]){
  const tuft=mesh(head,'Layered fringe',new THREE.ConeGeometry(.07,.18,12),hairLight,[x,.285,z]);tuft.rotation.z=rot+Math.PI;
}
for(const s of [-1,1]){
  sph(head,`${s<0?'Left':'Right'} eye white`,cream,[s*.115,.12,.256],[.062,.076,.019]);
  sph(head,`${s<0?'Left':'Right'} iris`,eye,[s*.113,.116,.273],[.034,.049,.012]);
  sph(head,`${s<0?'Left':'Right'} catchlight`,shine,[s*.113-.011,.139,.284],[.013,.017,.006],16);
  const brow=round(head,'Expressive brow',hair,[s*.117,.217,.255],[.10,.018,.019],.008);brow.rotation.z=s*.08;
  sph(head,'Cheek',skinShade,[s*.186,.018,.226],[.053,.026,.011],16);
}
sph(head,'Nose',skin,[0,.041,.263],[.036,.05,.033],16);
path(head,'Smile',coralDark,[[-.049,-.045,.256],[0,-.061,.268],[.049,-.045,.256]],.008);

// Explorer cap: a curved dome and a projecting, rounded bill.
sph(head,'Cap crown',lime,[0,.377,-.01],[.312,.155,.273]);
loft(head,'Cap band',mintDark,[[.322,.291,.245],[.35,.309,.257],[.38,.305,.255]],32);
sph(head,'Curved cap bill',lime,[0,.321,.293],[.307,.043,.225]);
round(head,'Cap emblem',mintDark,[0,.459,.217],[.104,.069,.023],.02);
mesh(head,'Cap emblem star',new THREE.OctahedronGeometry(.026,0),cream,[0,.459,.235],[1,.85,.4]);

for(const side of [-1,1]){
  const label=side<0?'Left':'Right';
  const arm=new THREE.Group();arm.name=`${label}Arm`;arm.position.set(side*.34,.48,0);torso.add(arm);limbs[`${label}Arm`]=arm;
  sph(arm,`${label} jacket sleeve`,coral,[side*.033,-.20,0],[.145,.28,.145]);
  sph(arm,`${label} sleeve cuff`,coralDark,[side*.032,-.43,.008],[.119,.055,.115]);
  sph(arm,`${label} hand`,skin,[side*.03,-.535,.023],[.092,.12,.089]);
  sph(arm,`${label} thumb`,skin,[side*.03-side*.077,-.52,.084],[.039,.072,.044],16);

  const leg=new THREE.Group();leg.name=`${label}Leg`;leg.position.set(side*.155,.805,0);root.add(leg);limbs[`${label}Leg`]=leg;
  loft(leg,`${label} trouser`,navy,[[.0,.13,.13],[-.1,.155,.155],[-.34,.12,.125],[-.55,.102,.107],[-.61,.106,.108]],24);
  path(leg,`${label} trouser crease`,navyLight,[[0,-.19,.14],[0,-.35,.13],[0,-.53,.115]],.008);
  sph(leg,`${label} shoe upper`,cream,[0,-.677,.067],[.142,.105,.235]);
  sph(leg,`${label} shoe toe`,shine,[0,-.701,.191],[.14,.07,.123]);
  round(leg,`${label} shoe sole`,sole,[0,-.755,.081],[.31,.064,.48],.026);
  path(leg,`${label} shoe lace`,mintDark,[[-.072,-.616,.17],[0,-.612,.179],[.072,-.616,.17]],.012);
}

// Keyed clips live in the GLB, so the model remains reusable beyond this game.
const q=(x=0,y=0,z=0)=>new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z));
function rotationTrack(name,times,angles){return new THREE.QuaternionKeyframeTrack(`${name}.quaternion`,times,angles.flatMap(a=>q(...a).toArray()));}
function positionTrack(name,times,positions){return new THREE.VectorKeyframeTrack(`${name}.position`,times,positions.flat());}
function gait(name,duration,stride,armSwing,bounce,lean){
  const times=Array.from({length:17},(_,i)=>i*duration/16),phase=times.map((_,i)=>i/16*Math.PI*2);
  const tracks=[
    rotationTrack('LeftLeg',times,phase.map(p=>[Math.sin(p)*stride,0,.03])),
    rotationTrack('RightLeg',times,phase.map(p=>[-Math.sin(p)*stride,0,-.03])),
    rotationTrack('LeftArm',times,phase.map(p=>[-Math.sin(p)*armSwing,0,-.04])),
    rotationTrack('RightArm',times,phase.map(p=>[Math.sin(p)*armSwing,0,.04])),
    rotationTrack('Torso',times,phase.map(p=>[lean,0,Math.sin(p)*.025])),
    positionTrack('Torso',times,phase.map(p=>[0,.86+Math.abs(Math.sin(p))*bounce,0])),
    rotationTrack('Head',times,phase.map(p=>[-lean*.36,0,Math.sin(p)*.015])),
  ];return new THREE.AnimationClip(name,duration,tracks);
}
const idleTimes=[0,.75,1.5,2.25,3];
const idle=new THREE.AnimationClip('Idle',3,[
  positionTrack('Torso',idleTimes,idleTimes.map(t=>[0,.86+Math.sin(t/3*Math.PI*2)*.012,0])),
  rotationTrack('Head',idleTimes,idleTimes.map(t=>[.012,Math.sin(t/3*Math.PI*2)*.035,Math.sin(t/3*Math.PI*2)*.014])),
  rotationTrack('LeftArm',idleTimes,idleTimes.map(t=>[.02,0,-.045])),
  rotationTrack('RightArm',idleTimes,idleTimes.map(t=>[.02,0,.045])),
]);
const clips=[idle,gait('Walk',.8,.52,.4,.037,.035),gait('Run',.57,.81,.7,.07,.16)];
const output=resolve(dirname(fileURLToPath(import.meta.url)),'../public/models/trail-runner.glb');
await mkdir(dirname(output),{recursive:true});
const data=await new GLTFExporter().parseAsync(root,{binary:true,animations:clips,onlyVisible:true,trs:true});
await writeFile(output,Buffer.from(data));
console.log(`Wrote ${output} (${Math.round(data.byteLength/1024)} KiB, ${clips.length} clips)`);
