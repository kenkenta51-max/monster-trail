import * as THREE from 'three';

export const EFFECTS = Object.freeze({
  'ember-tail': {name:'スパークテイル',color:'#ffb24e',accent:'#fff2a7',duration:1.5,kind:'fire',frequency:260},
  'warm-tackle': {name:'ぽかぽかタックル',color:'#efb57a',accent:'#fff4cb',duration:1.25,kind:'dash',frequency:180},
  'bubble-rhythm': {name:'バブルリズム',color:'#79ddee',accent:'#edfaff',duration:1.65,kind:'bubble',frequency:720},
  'aqua-roll': {name:'ころころアタック',color:'#83d3ec',accent:'#dcffff',duration:1.45,kind:'roll',frequency:350},
  'leaf-spin': {name:'リーフスピン',color:'#90d59a',accent:'#e4ffc1',duration:1.6,kind:'leaf',frequency:590},
  'acorn-shot': {name:'どんぐりショット',color:'#c79a68',accent:'#e8e3b3',duration:1.55,kind:'acorn',frequency:420},
});
const sphere=new THREE.SphereGeometry(1,12,8);
const ringGeo=new THREE.TorusGeometry(1,.025,6,40);
const leafShape=new THREE.Shape();leafShape.moveTo(0,-1);leafShape.bezierCurveTo(-1,-.1,-.65,.7,0,1);leafShape.bezierCurveTo(.65,.7,1,-.1,0,-1);
const leafGeo=new THREE.ShapeGeometry(leafShape,8);
const nutGeo=new THREE.SphereGeometry(1,12,8);
let glowTexture;
const diagnostics={active:0,completed:0,impacts:0,lastEffect:null};
export const effectDiagnostics=()=>({...diagnostics});
function glowMap(){if(glowTexture)return glowTexture;const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.18,'rgba(255,255,255,.8)');g.addColorStop(.5,'rgba(255,255,255,.24)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);glowTexture=new THREE.CanvasTexture(c);return glowTexture;}
const clamp=t=>THREE.MathUtils.clamp(t,0,1);
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
function poseSnapshot(model){return {position:model.position.clone(),rotation:model.rotation.clone(),bodyPosition:model.userData.body.position.clone(),bodyRotation:model.userData.body.rotation.clone(),bodyScale:model.userData.body.scale.clone(),tailRotation:model.userData.tail?.rotation.clone()};}
function restore(model,saved){model.position.copy(saved.position);model.rotation.copy(saved.rotation);model.userData.body.position.copy(saved.bodyPosition);model.userData.body.rotation.copy(saved.bodyRotation);model.userData.body.scale.copy(saved.bodyScale);if(saved.tailRotation)model.userData.tail.rotation.copy(saved.tailRotation);model.userData.performing=false;}

/** A finite, self-cleaning animation. HP changes exactly once at visual contact. */
export function playAttack({scene,camera,attacker,defender,move,onImpact=()=>{},onSound=()=>{},reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches,speed=1}){
  const fx=EFFECTS[move.effect]??EFFECTS['warm-tackle'];
  if(attacker.userData.performing||defender.userData.performing)return Promise.reject(new Error('An attack is already playing'));
  diagnostics.active++;diagnostics.lastEffect=move.effect;
  const a=poseSnapshot(attacker),d=poseSnapshot(defender);attacker.userData.performing=defender.userData.performing=true;
  const cameraPosition=camera.position.clone(),cameraQuaternion=camera.quaternion.clone(),cameraFov=camera.fov;
  const source=a.position.clone().add(new THREE.Vector3(0,1.35,0));
  const destination=d.position.clone().add(new THREE.Vector3(0,1.05,0));
  const direction=destination.clone().sub(source).normalize(),side=new THREE.Vector3(-direction.z,0,direction.x).normalize();
  const groundDirection=new THREE.Vector3(direction.x,0,direction.z).normalize();
  const effects=new THREE.Group();effects.name=`VFX:${move.effect}`;scene.add(effects);
  const materials=new Set();const lights=[];
  function material(color,opacity=1,additive=false){const m=new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending});materials.add(m);return m;}
  function mesh(geo,color,scale=.1,opacity=1){const m=new THREE.Mesh(geo,material(color,opacity));m.scale.setScalar(scale);effects.add(m);return m;}
  function glow(color,scale){const mat=new THREE.SpriteMaterial({map:glowMap(),color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});materials.add(mat);const sprite=new THREE.Sprite(mat);sprite.scale.setScalar(scale);effects.add(sprite);return sprite;}
  const charge=glow(fx.color,1),flash=glow(fx.accent,1);
  const groundRing=mesh(ringGeo,fx.color,.05,.8);groundRing.rotation.x=-Math.PI/2;groundRing.position.copy(d.position);groundRing.position.y+=.025;
  const halo=mesh(ringGeo,fx.accent,.1,.85);halo.quaternion.copy(camera.quaternion);
  const projectiles=[];
  const count=fx.kind==='bubble'?5:fx.kind==='acorn'?3:fx.kind==='leaf'?12:fx.kind==='fire'?28:12;
  for(let i=0;i<count;i++){
    let p;
    if(fx.kind==='leaf'){p=mesh(leafGeo,i%2?fx.color:'#4da978',.13+(i%3)*.04);p.scale.y*=1.5;}
    else if(fx.kind==='bubble'){
      p=mesh(sphere,fx.color,.22+(i%3)*.07,.35);
      const edge=new THREE.Mesh(ringGeo,material('#dafaff',.65));edge.quaternion.copy(camera.quaternion);p.add(edge);
      const shine=new THREE.Mesh(sphere,material('#ffffff',.9));shine.scale.set(.2,.31,.09);shine.position.set(-.3,.42,.8);p.add(shine);
    }else if(fx.kind==='acorn'){
      p=mesh(nutGeo,'#bd8952',.23);p.scale.y*=1.3;
      const cap=new THREE.Mesh(sphere,material('#785e46'));cap.position.y=.52;cap.scale.set(1.09,.52,1.09);p.add(cap);
      const stem=new THREE.Mesh(sphere,material('#6c6345'));stem.scale.set(.12,.38,.12);stem.position.y=1.08;p.add(stem);
    }else{p=glow(i%3?fx.color:fx.accent,.13+(i%4)*.055);}
    p.userData.index=i;projectiles.push(p);
  }
  const burst=[];for(let i=0;i<(reducedMotion?12:26);i++){const m=fx.kind==='leaf'?mesh(leafGeo,i%2?'#71be83':fx.color,.09):glow(i%3?fx.color:fx.accent,.14+(i%3)*.08);burst.push(m);}
  if(fx.kind==='fire'){const light=new THREE.PointLight(fx.color,0,7,2);effects.add(light);lights.push(light);}
  onSound(fx.frequency,.18,fx.kind==='bubble'?'sine':'triangle',.025);
  let impacted=false,elapsed=0,last=performance.now(),pause=0,finished=false;
  function cleanup(){if(finished)return;finished=true;scene.remove(effects);materials.forEach(m=>m.dispose());restore(attacker,a);restore(defender,d);camera.position.copy(cameraPosition);camera.quaternion.copy(cameraQuaternion);camera.fov=cameraFov;camera.updateProjectionMatrix();diagnostics.active--;diagnostics.completed++;}
  return new Promise((resolve,reject)=>{
    function animate(now){try{
      const dt=Math.min((now-last)/1000,.05);last=now;
      if(document.hidden){requestAnimationFrame(animate);return;}
      if(pause>0)pause-=dt;else elapsed+=dt*Math.max(.1,speed);
      const t=clamp(elapsed/fx.duration),prep=Math.sin(clamp(t/.24)*Math.PI),travel=clamp((t-.24)/.4),impact=clamp((t-.64)/.24),recovery=smooth((t-.82)/.18);
      const body=attacker.userData.body,targetBody=defender.userData.body;
      body.position.copy(a.bodyPosition);body.rotation.copy(a.bodyRotation);body.scale.copy(a.bodyScale);attacker.position.copy(a.position);
      // Anticipation: compress, draw back, then release into the named motion.
      body.scale.y*=1-prep*.18;body.scale.x*=1+prep*.09;body.scale.z*=1+prep*.09;
      body.rotation.x-=prep*.14;
      if(fx.kind==='dash'||fx.kind==='roll'){
        const distance=a.position.distanceTo(d.position)-1.25;
        const advance=t<.64?smooth((t-.25)/.35):1-smooth((t-.77)/.23);
        attacker.position.addScaledVector(groundDirection,Math.max(0,distance)*advance);
        if(fx.kind==='roll'){body.rotation.x+=travel*Math.PI*4*(1-recovery);body.scale.y*=1-.17*Math.sin(travel*Math.PI);}
        else{body.rotation.x+=Math.sin(travel*Math.PI)*.52;body.position.y+=Math.sin(travel*Math.PI)*.2;}
      }else if(fx.kind==='fire'){
        body.rotation.y+=Math.sin(travel*Math.PI)*1.35*(1-recovery);
        if(attacker.userData.tail)attacker.userData.tail.rotation.z=Math.sin(travel*Math.PI)*.65;
      }else if(fx.kind==='leaf'){
        body.rotation.y+=smooth(travel)*Math.PI*2*(1-recovery);body.position.y+=Math.sin(travel*Math.PI)*.3;
      }else if(fx.kind==='bubble'){
        const breath=Math.sin(travel*Math.PI);body.scale.multiplyScalar(1+breath*.07);body.rotation.x-=breath*.12;
      }else{body.rotation.x-=Math.sin(travel*Math.PI*3)*.13*(1-recovery);}
      charge.position.copy(source);charge.scale.setScalar(.35+prep*1.4);charge.material.opacity=t<.28?prep*.8:0;
      for(const [i,p]of projectiles.entries()){
        const delay=fx.kind==='fire'?(i/count)*.11:(i%5)*.015;
        const u=clamp((t-.26-delay)/(.36-delay));p.visible=t>.24&&t<.65;
        if(fx.kind==='dash'||fx.kind==='roll'){
          p.position.copy(attacker.position).addScaledVector(direction,-i*.18);p.position.y+=.18+Math.sin(i*2)*.06;p.material.opacity=Math.sin(travel*Math.PI)*.65;
        }else{
          p.position.lerpVectors(source,destination,u);
          const radius=fx.kind==='leaf'?.45:fx.kind==='bubble'?.25:.13;
          p.position.addScaledVector(side,Math.sin(i*2.4+u*9)*radius*Math.sin(u*Math.PI));
          p.position.y+=Math.sin(u*Math.PI)*(fx.kind==='acorn'?1.35:fx.kind==='fire'?.5:.2)+Math.cos(i*2+u*12)*radius;
          if(fx.kind==='leaf'){p.rotation.set(u*8+i,u*12+i,i);}
          if(fx.kind==='acorn')p.rotation.x=u*Math.PI*2;
        }
      }
      flash.position.copy(destination);flash.scale.setScalar(.3+Math.sin(impact*Math.PI)*2.7);flash.material.opacity=t>=.64&&t<.9?Math.sin(impact*Math.PI)*.75:0;
      halo.position.copy(destination);halo.scale.setScalar(.12+impact*1.4);halo.material.opacity=t>=.64&&t<.88?(1-impact)*.7:0;
      groundRing.scale.setScalar(.15+impact*2);groundRing.material.opacity=t>=.64&&t<.89?(1-impact)*.55:0;
      burst.forEach((p,i)=>{const angle=i*2.39996;const radius=.15+impact*(.8+(i%5)*.25);p.position.copy(destination).add(new THREE.Vector3(Math.cos(angle)*radius,Math.sin(i*1.8)*radius+.3-1.3*impact*impact,Math.sin(angle)*radius));p.visible=t>=.64&&t<.94;p.material.opacity=Math.max(0,1-impact);if(p.isMesh)p.rotation.set(i+impact*7,impact*5,i);});
      targetBody.position.copy(d.bodyPosition);targetBody.rotation.copy(d.bodyRotation);targetBody.scale.copy(d.bodyScale);
      if(t>=.64&&t<.91){const recoil=Math.sin(impact*Math.PI);defender.position.copy(d.position).addScaledVector(groundDirection,recoil*.32);targetBody.rotation.x=-recoil*.26;targetBody.scale.set(d.bodyScale.x*(1+recoil*.08),d.bodyScale.y*(1-recoil*.15),d.bodyScale.z);}
      else defender.position.copy(d.position);
      if(!reducedMotion){camera.position.copy(cameraPosition);camera.position.x+=t>=.64&&t<.77?Math.sin(impact*55)*(1-impact)*.05:0;camera.fov=cameraFov-Math.sin(t*Math.PI)*1.5;camera.updateProjectionMatrix();}
      lights.forEach(l=>{l.position.copy(t<.64?source:destination);l.intensity=t<.64?prep*2:Math.sin(impact*Math.PI)*3;});
      if(!impacted&&t>=.64){impacted=true;diagnostics.impacts++;pause=reducedMotion?0:.045;onImpact();onSound(fx.frequency*.62,.18,fx.kind==='bubble'?'sine':'triangle',.045);}
      if(t>=1){cleanup();resolve();}else requestAnimationFrame(animate);
    }catch(error){cleanup();reject(error);}}
    requestAnimationFrame(animate);
  });
}
