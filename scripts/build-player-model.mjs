import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// A game-sized interpretation of concept B. All geometry, rig nodes and clips
// are original and exported together as one portable glTF binary.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(data => { this.result = data; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(data => { this.result = `data:${blob.type};base64,${Buffer.from(data).toString('base64')}`; this.onloadend?.(); }); }
};

const m = (color, roughness=.78, metalness=0) => new THREE.MeshStandardMaterial({color,roughness,metalness});
const cloth=m('#cd715b'), clothLight=m('#dc8b72'), clothShade=m('#a84e4d');
const lining=m('#57646b'), tee=m('#ded8cb'), skin=m('#ddb091',.93), skinShade=m('#b9806d');
const hair=m('#29333f'), hairHi=m('#3d4654'), iris=m('#49372f',.35), eyeWhite=m('#ede8df');
const pants=m('#3c4853'), pantsHi=m('#535d67'), pantsDark=m('#303d49');
const mint=m('#83b3ac'), mintShade=m('#567f7e'), lime=m('#d1e2a1');
const shoe=m('#e8e6dc'), sole=m('#d4d6d3'), lace=m('#b0c6bc'), metal=m('#c3a375',.38,.3);

const scene=new THREE.Group();scene.name='TrailRunner';
const torso=new THREE.Group();torso.name='Torso';torso.position.y=1.0;scene.add(torso);
const head=new THREE.Group();head.name='Head';head.position.y=.64;torso.add(head);

function add(parent,name,geometry,mat,pos=[0,0,0],scale=[1,1,1],rot=[0,0,0]){
  const object=new THREE.Mesh(geometry,mat);object.name=name;object.position.set(...pos);object.scale.set(...scale);object.rotation.set(...rot);
  object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
}
const oval=(p,n,mat,pos,scale,segments=28)=>add(p,n,new THREE.SphereGeometry(1,segments,18),mat,pos,scale);
const rounded=(p,n,mat,pos,size,r=.04)=>add(p,n,new RoundedBoxGeometry(...size,4,r),mat,pos);
function curve(p,n,mat,points,r=.007){return add(p,n,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),Math.max(10,points.length*5),r,6,false),mat);}
function loft(p,n,mat,rings,segments=28){
  const vertices=[],indices=[];
  for(const [y,rx,rz,x=0,z=0] of rings)for(let j=0;j<segments;j++){
    const angle=2*Math.PI*j/segments;vertices.push(x+Math.cos(angle)*rx,y,z+Math.sin(angle)*rz);
  }
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<segments;j++){
    const a=i*segments+j,b=i*segments+(j+1)%segments,c=(i+1)*segments+j,d=(i+1)*segments+(j+1)%segments;
    if(rings[i+1][0]>rings[i][0])indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
  return add(p,n,g,mat);
}
function plane(p,n,mat,points,z){
  const shape=new THREE.Shape();shape.moveTo(points[0][0],points[0][1]);points.slice(1).forEach(v=>shape.lineTo(v[0],v[1]));shape.closePath();
  const surface=add(p,n,new THREE.ShapeGeometry(shape),mat,[0,0,z]);surface.material=mat.clone();surface.material.side=THREE.DoubleSide;return surface;
}

// Six-head silhouette: longer legs, modest face, relaxed shoulders and a waist.
loft(torso,'T shirt volume',tee,[[-.10,.18,.115],[.07,.22,.13],[.32,.245,.145],[.49,.19,.125],[.57,.09,.085]],32);
loft(torso,'Windbreaker shell',cloth,[[-.09,.235,.165],[.02,.26,.178],[.24,.275,.165],[.42,.30,.17],[.49,.235,.145],[.52,.135,.11]],36);
oval(torso,'Waist hem',clothShade,[0,-.085,0],[.244,.03,.171]);
plane(torso,'Visible cream T shirt',tee,[[-.05,.14],[.05,.14],[.086,.4],[.065,.53],[-.065,.53],[-.086,.4]],.182);
curve(torso,'Left zipper edge',metal,[[-.012,-.075,.181],[-.05,.16,.187],[-.085,.41,.188]],.004);
curve(torso,'Right zipper edge',metal,[[.012,-.075,.181],[.05,.16,.187],[.085,.41,.188]],.004);
curve(torso,'Soft jacket fold left',clothShade,[[-.2,.1,.14],[-.12,.075,.18],[-.08,.12,.18]],.004);
curve(torso,'Soft jacket fold right',clothShade,[[.2,.13,.14],[.13,.105,.18],[.09,.145,.18]],.004);
curve(torso,'Jacket panel seam left',clothShade,[[-.22,-.07,.115],[-.255,.16,.1],[-.26,.35,.095]],.005);
curve(torso,'Jacket panel seam right',clothShade,[[.22,-.07,.115],[.255,.16,.1],[.26,.35,.095]],.005);
curve(torso,'Left collar',clothShade,[[-.16,.48,.11],[-.095,.54,.145],[-.07,.51,.18]],.014);
curve(torso,'Right collar',clothShade,[[.16,.48,.11],[.095,.54,.145],[.07,.51,.18]],.014);
rounded(torso,'Chest patch',mintShade,[-.214,.285,.2],[.073,.05,.014],.007);
add(torso,'Chest patch star',new THREE.OctahedronGeometry(.015),lime,[-.214,.285,.215],[1,.8,.3]);
oval(torso,'Neck',skin,[0,.585,.0],[.073,.105,.073]);

// Fabric backpack hugs the back instead of reading as a cuboid.
rounded(torso,'Pack body',mint,[0,.265,-.236],[.38,.49,.18],.08);
oval(torso,'Pack top',mint,[0,.49,-.236],[.19,.07,.095]);
rounded(torso,'Pack front pocket',mintShade,[0,.13,-.337],[.25,.18,.035],.025);
curve(torso,'Pack pocket zipper',metal,[[-.11,.21,-.359],[0,.215,-.361],[.11,.21,-.359]],.006);
rounded(torso,'Pack clasp',metal,[0,.205,-.367],[.039,.025,.015],.008);
curve(torso,'Pack upper handle',mintShade,[[-.065,.525,-.235],[0,.56,-.235],[.065,.525,-.235]],.018);
for(const s of [-1,1]){
  curve(torso,`${s<0?'Left':'Right'} shoulder strap`,mintShade,[[s*.16,.47,-.19],[s*.23,.42,.025],[s*.22,.21,.18],[s*.18,-.07,.15]],.026);
  rounded(torso,'Strap adjuster',metal,[s*.216,.19,.186],[.037,.05,.014],.006);
}
add(torso,'Rolled street map',new THREE.CylinderGeometry(.034,.034,.31,16),tee,[.235,.255,-.265],[1,1,1],[0,0,.08]);
curve(torso,'Map tie',clothShade,[[.202,.255,-.269],[.235,.26,-.3],[.268,.255,-.269]],.007);

// Sculpted jaw and a restrained face: small almond eyes, nose, lips and hair.
loft(head,'Head with jaw',skin,[[-.105,.09,.095],[-.075,.135,.14],[.01,.182,.173],[.13,.197,.184],[.26,.174,.159],[.325,.11,.12]],40);
oval(head,'Chin',skin,[0,-.115,.052],[.103,.039,.093]);
for(const s of [-1,1]){
  oval(head,'Ear',skin,[s*.192,.09,-.002],[.031,.055,.026],16);
  oval(head,'Ear shadow',skinShade,[s*.215,.09,.008],[.008,.028,.012],12);
  const eyes=new THREE.Group();eyes.name=s<0?'LeftEye':'RightEye';eyes.position.set(s*.075,.12,.17);head.add(eyes);
  oval(eyes,'Eye white',eyeWhite,[0,0,0],[.039,.023,.01],20);
  oval(eyes,'Brown iris',iris,[s*.003,-.001,.01],[.017,.02,.006],16);
  oval(eyes,'Pupil highlight',eyeWhite,[s*.003-.005,.006,.015],[.005,.006,.002],12);
  curve(head,'Upper eyelid',hair,[[s*.037,.136,.176],[s*.075,.149,.18],[s*.111,.132,.171]],.004);
  curve(head,'Eyebrow',hair,[[s*.045,.188,.166],[s*.075,.198,.17],[s*.111,.187,.155]],.007);
  oval(head,'Soft cheek',skinShade,[s*.143,.036,.13],[.03,.012,.006],12);
}
oval(head,'Nose bridge',skin,[0,.068,.185],[.018,.056,.023],16);
oval(head,'Nose tip',skin,[0,.023,.205],[.022,.014,.02],16);
curve(head,'Subtle smile',skinShade,[[-.03,-.038,.179],[0,-.045,.185],[.03,-.038,.179]],.004);
oval(head,'Hair crown',hair,[0,.262,-.02],[.204,.11,.18]);
oval(head,'Rear hair',hair,[0,.184,-.135],[.178,.15,.075]);
for(const [x,y,z,angle] of [[-.13,.22,.12,-.5],[-.075,.23,.17,-.2],[.02,.235,.174,.25],[.105,.225,.13,.48]]){
  const lock=oval(head,'Soft layered fringe',hairHi,[x,y,z],[.052,.1,.03],18);lock.rotation.z=angle;
}
for(const s of [-1,1]){
  const lock=oval(head,'Side hair',hair,[s*.171,.18,.049],[.036,.095,.06],18);lock.rotation.z=s*.12;
}
oval(head,'Tied rear hair',hair,[-.025,.17,-.211],[.118,.12,.088]);
curve(head,'Loose hair strand left',hairHi,[[-.14,.21,-.17],[-.19,.11,-.2],[-.205,.005,-.23]],.02);
curve(head,'Loose hair strand right',hairHi,[[.12,.2,-.17],[.18,.08,-.21],[.19,0,-.25]],.018);

// Low-profile cap follows the skull; no outsized cartoon bill.
oval(head,'Lime cap crown',lime,[0,.318,-.016],[.218,.082,.186]);
loft(head,'Cap lower band',lime,[[.288,.204,.18],[.31,.215,.187],[.33,.212,.185]],32);
oval(head,'Curved cap visor',lime,[0,.286,.187],[.222,.021,.118]);
rounded(head,'Small cap emblem',mintShade,[0,.376,.14],[.055,.036,.012],.006);
add(head,'Emblem glint',new THREE.OctahedronGeometry(.012),tee,[0,.377,.151],[1,.8,.4]);

// Joint groups retain an inexpensive animation rig without skinning or downloads.
for(const s of [-1,1]){
  const side=s<0?'Left':'Right';
  const arm=new THREE.Group();arm.name=`${side}Arm`;arm.position.set(s*.285,.455,0);torso.add(arm);
  loft(arm,'Upper sleeve',cloth,[[.025,.089,.096],[-.09,.101,.1],[-.22,.085,.083],[-.27,.076,.078]],24);
  oval(arm,'Shoulder drape',clothLight,[s*.008,-.04,0],[.087,.088,.091]);
  curve(arm,'Sleeve seam',clothShade,[[0,-.05,.105],[0,-.145,.1],[0,-.23,.086]],.005);
  const elbow=new THREE.Group();elbow.name=`${side}Elbow`;elbow.position.y=-.255;arm.add(elbow);
  loft(elbow,'Lower sleeve',cloth,[[.018,.079,.079],[-.07,.082,.08],[-.19,.07,.069],[-.27,.064,.065]],24);
  oval(elbow,'Sleeve fold',clothLight,[0,-.09,0],[.082,.026,.08]);
  oval(elbow,'Ribbed cuff',clothShade,[0,-.265,0],[.066,.025,.065]);
  oval(elbow,'Hand',skin,[0,-.34,.012],[.054,.09,.038],20);
  oval(elbow,'Thumb',skin,[-s*.045,-.325,.041],[.025,.044,.023],16);
  for(let i=0;i<3;i++)oval(elbow,'Finger',skin,[(i-1)*.021,-.4,.02],[.01,.024,.014],12);

  const leg=new THREE.Group();leg.name=`${side}Leg`;leg.position.set(s*.129,.985,0);scene.add(leg);
  loft(leg,'Upper utility trouser',pants,[[.05,.12,.12],[-.08,.138,.129],[-.28,.119,.115],[-.43,.105,.105],[-.46,.101,.101]],28);
  rounded(leg,'Cargo pocket',pantsHi,[s*.115,-.23,.005],[.035,.16,.145],.017);
  curve(leg,'Outer pant seam',pantsDark,[[s*.116,-.05,.035],[s*.125,-.23,.025],[s*.105,-.42,.025]],.004);
  const knee=new THREE.Group();knee.name=`${side}Knee`;knee.position.y=-.435;leg.add(knee);
  loft(knee,'Lower utility trouser',pants,[[.018,.103,.104],[-.07,.113,.106],[-.18,.091,.093],[-.32,.077,.084],[-.385,.076,.078]],26);
  oval(knee,'Knee cloth fold',pantsHi,[0,-.05,0],[.108,.025,.107]);
  curve(knee,'Front pant crease',pantsHi,[[0,-.10,.105],[0,-.24,.087],[0,-.36,.08]],.004);
  oval(knee,'Elastic ankle cuff',pantsDark,[0,-.38,0],[.08,.03,.08]);
  const foot=new THREE.Group();foot.name=`${side}Foot`;foot.position.y=-.385;knee.add(foot);
  oval(foot,'Sock',tee,[0,-.02,0],[.068,.055,.068]);
  oval(foot,'Shoe upper',shoe,[0,-.075,.07],[.115,.075,.18]);
  oval(foot,'Toe cap',eyeWhite,[0,-.093,.18],[.112,.048,.086]);
  rounded(foot,'Shoe sole',sole,[0,-.126,.073],[.245,.045,.37],.022);
  curve(foot,'Sneaker color line',mint,[[s*.083,-.082,.01],[s*.091,-.09,.1],[s*.053,-.088,.19]],.008);
  for(let i=0;i<3;i++)curve(foot,'Shoe lace',lace,[[-.043,-.024,.105+i*.026],[0,-.017,.107+i*.026],[.043,-.024,.105+i*.026]],.004);
}

const quat=(x=0,y=0,z=0)=>new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z)).toArray();
const rotations=(name,times,values)=>new THREE.QuaternionKeyframeTrack(`${name}.quaternion`,times,values.flatMap(v=>quat(...v)));
const positions=(name,times,values)=>new THREE.VectorKeyframeTrack(`${name}.position`,times,values.flat());
function motion(name,duration,stride,arms,bob,lean){
  const times=Array.from({length:25},(_,i)=>duration*i/24),p=times.map((_,i)=>i*Math.PI*2/24);
  const run=name==='Run';
  return new THREE.AnimationClip(name,duration,[
    positions('Torso',times,p.map(v=>[0,1+Math.abs(Math.sin(v))*bob,0])),
    rotations('Torso',times,p.map(v=>[lean,0,Math.sin(v)*.015])),
    rotations('Head',times,p.map(v=>[-lean*.33,Math.sin(v)*.018,-Math.sin(v)*.01])),
    ...[-1,1].flatMap((s,i)=>{
      const side=i===0?'Left':'Right',phase=p.map(v=>v+i*Math.PI);
      return [
        rotations(`${side}Leg`,times,phase.map(v=>[Math.sin(v)*stride,0,s*.018])),
        rotations(`${side}Knee`,times,phase.map(v=>[.08+Math.pow(Math.max(0,Math.sin(v+1.2)),2)*(run?.72:.35),0,0])),
        rotations(`${side}Foot`,times,phase.map(v=>[-Math.sin(v)*stride*.23,0,0])),
        rotations(`${side}Arm`,times,phase.map(v=>[-Math.sin(v)*arms,0,s*-.055])),
        rotations(`${side}Elbow`,times,phase.map(v=>[run?-.66:-.14-Math.max(0,Math.sin(v))*.11,0,0])),
      ];
    }),
  ]);
}
const idleTimes=[0,.75,1.5,2.25,3],idlePhase=idleTimes.map(t=>t/3*Math.PI*2);
const idle=new THREE.AnimationClip('Idle',3,[
  positions('Torso',idleTimes,idlePhase.map(v=>[0,1+Math.sin(v)*.008,0])),
  rotations('Torso',idleTimes,idlePhase.map(v=>[.012,0,Math.sin(v)*.008])),
  rotations('Head',idleTimes,idlePhase.map(v=>[0,Math.sin(v)*.035,Math.sin(v)*.012])),
  ...['Left','Right'].flatMap((side,i)=>[
    rotations(`${side}Arm`,idleTimes,idlePhase.map(v=>[Math.sin(v)*.012,0,i===0?.055:-.055])),
    rotations(`${side}Elbow`,idleTimes,idlePhase.map(()=>[-.11,0,0])),
    rotations(`${side}Knee`,idleTimes,idlePhase.map(()=>[.045,0,0])),
  ]),
]);
const clips=[idle,motion('Walk',.86,.48,.36,.024,.025),motion('Run',.56,.78,.58,.052,.13)];
const output=resolve(dirname(fileURLToPath(import.meta.url)),'../public/models/trail-runner.glb');
await mkdir(dirname(output),{recursive:true});
const data=await new GLTFExporter().parseAsync(scene,{binary:true,animations:clips,onlyVisible:true,trs:true});
await writeFile(output,Buffer.from(data));
console.log(`Wrote ${output} (${Math.round(data.byteLength/1024)} KiB, ${clips.length} clips)`);
