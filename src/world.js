import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box, orb, cylinder, mat, makePerson, makeMonsterModel, animatePerson, animateMonster } from './models.js';
import { canOccupy } from './rules.js';

export const SPOTS = [
  { x: -22, z: 20, r: 6.5, name: 'こもれび公園', species: 'Leafy', color: '#c6f87b' },
  { x: 21, z: -16, r: 5.3, name: '駅前プラザ', species: 'Aquari', color: '#7bdce8' },
  { x: 27, z: 22, r: 4.2, name: 'ひだまり路地', species: 'Flamo', color: '#ffac78' },
];
const NPC_INFO = [
  ['モンスター研究家・ナギ', 3, 15, '#f5e5ce', 'researcher', '虹街へようこそ！ 君のFlamoも街の冒険を楽しみにしているみたい。西の「こもれび公園」で緑の光を探してごらん。弱らせたモンスターにはリンクプリズムを使うと仲間になりやすいよ。'],
  ['会社員・ソウ', -12, -4, '#567787', '', '今日もスクランブルはにぎやかだね。駅前の青い光のあたりで、泡みたいな生き物を見かけたよ。'],
  ['学生・ミオ', -9, 11, '#bd889c', 'student', '放課後は公園に寄り道！ Leafyって、頭の葉っぱで風の音を聴いているんだって。'],
  ['観光客・ルカ', 12, 4, '#e4c28a', 'tourist', 'この街、光の色がすごくきれい！ 路地の奥にはオレンジ色の小さな子がいたよ。'],
  ['カフェ店員・ハル', -15, -15, '#90bca6', '', 'おかえりなさい、トレイラー！ あたたかいミルクで仲間を全回復したよ。ポーションとリンクプリズムも補充しておくね。いつでも休みにおいで。'],
  ['ミュージシャン・レン', 14, -11, '#d39b64', 'musician', '♪ ネオンをたどって、出会いをつないで。Aquariは音に合わせて泡を弾ませるんだ。'],
  ['買い物客・ユイ', 13, 14, '#b89bd3', 'shopper', '新しいバッグを買っちゃった。仲間を切り替えるなら M キー。どの子と歩くか悩むよね。'],
  ['犬の散歩中・タク', -17, 26, '#b8aa78', 'dog', 'うちのココはLeafyと仲良しなんだ。ここはこもれび公園。緑の輪の中を歩くと、きっと会えるよ。'],
  ['スケーター・キリ', 22, 29, '#7aabbf', 'skater', 'ひだまり路地は、炎のFlamoの遊び場。バトルではHPを減らしてからプリズム！ つかまえやすくなるぜ。'],
  ['警備員・ダイチ', 11, -24, '#526482', '', '虹街駅はこちらです。道に迷ったら右下のマップをどうぞ。光る丸印はモンスターの出現スポットですよ。'],
  ['花屋・アオ', -26, 12, '#d39f9d', 'shopper', '相性も覚えておくと便利よ。炎は草に、草は水に、水は炎に強いの。仲間の個性を活かしてね。'],
  ['配達員・イト', 5, -12, '#cf9068', '', '街灯も看板も、夜になると特別な顔を見せるんだ。この街に屋根のない冒険があるなんて、いいよな。'],
];

function sign(parent, text, x, y, z, w, h, bg, fg = '#f7f0db', rotation = 0, subtitle = '') {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = fg + '55'; ctx.lineWidth = 5; ctx.strokeRect(12, 12, 488, 232);
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 ${text.length > 9 ? 44 : text.length > 5 ? 54 : 72}px "Arial", "Meiryo", sans-serif`;
  ctx.fillText(text, 256, subtitle ? 104 : 128, 465);
  if (subtitle) { ctx.font = '22px "Arial", "Meiryo", sans-serif'; ctx.fillText(subtitle, 256, 179, 440); }
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: .48, roughness: .65 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material); m.position.set(x, y, z); m.rotation.y = rotation; parent.add(m); return m;
}

export function createWorld() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#26394f'); scene.fog = new THREE.Fog('#344b63', 65, 160);
  const hemi = new THREE.HemisphereLight('#ceeaf9', '#66748f', 2.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffddae', 3); sun.position.set(-30, 65, 30); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 160 }); sun.shadow.normalBias = .04; scene.add(sun);
  const fill = new THREE.DirectionalLight('#b2d9fb', 1.2); fill.position.set(25, 22, -35); scene.add(fill);
  const fixed = new THREE.Group(); scene.add(fixed); const dynamic = new THREE.Group(); scene.add(dynamic);
  const colliders = [], buildings = [], trees = [], signals = [], cars = [], beacons = [], billboards = [];
  const solid = (x, z, w, d) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  box(fixed, '#91a8a5', 0, -.38, 0, 102, .65, 102);
  box(fixed, '#435368', 0, -.02, 0, 17.4, .14, 99); box(fixed, '#435368', 0, -.015, 0, 99, .14, 17.4);
  box(fixed, '#465469', 0, .01, -36, 99, .1, 9);
  for (const n of [-1, 1]) {
    box(fixed, '#d7d4be', n * 10.8, .08, 0, 4.1, .28, 94); box(fixed, '#d7d4be', 0, .09, n * 10.8, 94, .28, 4.1);
    box(fixed, '#eff0d4', n * 8.8, .15, 0, .18, .21, 96); box(fixed, '#eff0d4', 0, .15, n * 8.8, 96, .21, .18);
    for (let j = -43; j <= 43; j += 3) { if (Math.abs(j) > 13) { box(fixed, '#dfd4ad', n * .18, .065, j, .1, .02, 1.4); box(fixed, '#dfd4ad', j, .07, n * .18, 1.4, .02, .1); } }
    for (let j = -39; j < 40; j += 2) { box(fixed, '#a6b6aa', n * 10.8, .231, j, 4, .014, .045); box(fixed, '#a6b6aa', j, .232, n * 10.8, .045, .014, 4); }
  }
  // Zebra crossings plus two diagonal pedestrian routes.
  for (const n of [-1, 1]) for (let j = -7; j <= 7; j += 1.3) { box(fixed, '#f5efdc', j, .091, n * 6.7, .73, .026, 3.1); box(fixed, '#f5efdc', n * 6.7, .092, j, 3.1, .026, .73); }
  for (const direction of [-1, 1]) for (let j = -6; j <= 6; j += 1.2) { const stripe = box(fixed, '#f1ead5', j, .097, j * direction, 2.4, .026, .57); stripe.rotation.y = direction * Math.PI / 4; }
  function building(x, z, w, d, h, color, name = '', accent = '#9ecfca') {
    solid(x, z, w, d); buildings.push({ x, z, w, d, h });
    box(fixed, color, x, h / 2, z, w, h, d); box(fixed, '#d6d6c8', x, h + .25, z, w + .35, .5, d + .35); box(fixed, '#8a9ba3', x, h + .9, z, w * .4, 1, d * .35);
    box(fixed, '#344a5d', x, 1.9, z + d / 2 + .03, w - .4, 3.2, .09);
    for (let xx = x - w / 2 + 1; xx < x + w / 2; xx += 1.6) for (let yy = 4.7; yy < h - .9; yy += 2.5) {
      const lit = (Math.round(xx * 7 + yy * 3) % 4) !== 0; const c = lit ? accent : '#3f6075';
      box(fixed, c, xx, yy, z + d / 2 + .06, .88, 1.28, .1, lit);
      box(fixed, c, xx, yy, z - d / 2 - .06, .88, 1.28, .1, lit);
    }
    for (let zz = z - d / 2 + 1; zz < z + d / 2; zz += 1.7) for (let yy = 4.7; yy < h - .9; yy += 2.5) { const c = Math.round(zz + yy) % 4 ? accent : '#45667a'; for (const n of [-1, 1]) box(fixed, c, x + n * (w / 2 + .06), yy, zz, .1, 1.28, .95, true); }
    if (name) billboards.push(sign(fixed, name, x, h * .67, z + d / 2 + .15, w * .88, Math.min(4.5, h * .3), color === '#d09caa' ? '#9b5067' : '#324d69', '#f2ecca', 0, 'NIJIMACHI · CITY LIFE'));
  }
  building(-21, -23, 13, 14, 24, '#718bac', '虹街', '#b6dcca');
  building(-34, -22, 10, 16, 35, '#a5a5bf', 'ORBIT', '#dfbad4');
  building(-20, -43, 12, 8, 31, '#718598', 'KUMO', '#c5dcdf');
  building(-36, -43, 12, 9, 22, '#9daca8', '', '#bddebf');
  building(20, -27, 12, 10, 26, '#a8afc5', 'LUMA', '#c2dcec');
  building(35, -23, 12, 15, 38, '#78989e', 'mori', '#c3e3bc');
  building(20, -44, 10, 8, 38, '#939cbd', '', '#d4c2de');
  building(35, -44, 12, 8, 29, '#b695ad', 'SOL', '#eec9b3');
  building(19, 21, 9, 13, 15, '#d09caa', 'PICO STORE', '#f5d5a6');
  building(36, 20, 9, 12, 22, '#87a5ac', 'PLAY', '#a9ded0');
  building(20, 39, 12, 10, 25, '#8395b5', 'TRAIL CLUB', '#d2d6ec');
  building(36, 39, 11, 11, 30, '#c2b2a3', '', '#e3cf9d');
  building(-35, 35, 12, 10, 19, '#8ca9a1', 'BOTANICA', '#d8e2b8');
  building(-20, 39, 12, 10, 25, '#a9a4ba', '', '#cdd2ed');
  building(-42, 0, 8, 12, 28, '#bfa2b1', 'CHILL', '#decee0');
  building(43, 0, 8, 13, 30, '#829eae', 'NIJI', '#c8e3ca');
  for (const side of [-1, 1]) for (let k = 0; k < 5; k++) { const h = 22 + (k * 11 % 24); box(fixed, ['#728899', '#8295a9', '#a9a8b7'][k % 3], side * (53 + k * 7), h / 2 - 1, -24 - k * 10, 9, h, 11); }
  for (let i = 0; i < 9; i++) { const x = (i - 4) * 10, h = 20 + (i * 13 % 24); box(fixed, ['#7e96aa','#9bacc0','#869dad'][i%3], x,h/2,-66,8,h,12); for(let y=3;y<h-1;y+=3) for(let xx=-2;xx<=2;xx+=2) box(fixed,'#c5dbc2',x+xx,y,-59.95,.7,1.1,.08,true); }
  // Original commercial signage: no real businesses or city assets.
  sign(fixed, 'NEON / DAYS', -21, 16, -15.86, 10.7, 5.4, '#e98b70', '#fff3cb', 0, 'きょうも、いい寄り道。');
  sign(fixed, '✦', 20, 17, -21.86, 9.8, 7, '#4b8498', '#d9f2a3', 0, 'FIND YOUR LITTLE WONDER');
  sign(fixed, 'NIJI', 13.85, 9, -25, 7.5, 5, '#b875ae', '#f8edcd', -Math.PI / 2, 'あたらしい毎日');
  sign(fixed, 'TRAIL', -14.35, 9, -22, 7, 5, '#428c84', '#e5f0c7', Math.PI / 2, 'きみと、どこまでも。');
  // Cafe with striped canopy, lit glazing and outdoor furniture.
  box(fixed, '#f3d2a3', -23, 2.15, -13.55, 11, 4.3, 2.6); solid(-23, -13.6, 11, 2.6);
  sign(fixed, 'cafe komorebi', -23, 3.25, -12.19, 10.5, 1.3, '#397c74', '#f9e7bb');
  for (let i = 0; i < 10; i++) box(fixed, i % 2 ? '#f4deaf' : '#76a39b', -27.5 + i, 2.48, -11.8, .96, .17, 1.2);
  for (const x of [-26, -23, -20]) box(fixed, '#90c8c4', x, 1.22, -12.18, 2.25, 1.95, .04, true);
  // Station gateway at the edge of the plaza.
  box(fixed, '#4d7785', 22, 1.8, -22, 9, 3.6, 2); solid(22, -22, 9, 2);
  box(fixed, '#172e43', 22, 1.4, -20.95, 7, 2.8, .12);
  box(fixed, '#cbdfd2', 22, 3.65, -21.3, 10, .35, 3.2);
  sign(fixed, '虹街駅', 22, 3, -20.85, 6.8, 1.02, '#315f73', '#e4f4d0', 0, 'NIJIMACHI STATION');
  for (let i = 0; i < 3; i++) box(fixed, '#7b96a0', 22, .13 + i * .12, -20 + i * .34, 7.4, .12, .4);
  // Small park, path and raised flower beds.
  box(fixed, '#719c85', -22, .09, 22, 19, .18, 18);
  box(fixed, '#c3c4a5', -22, .2, 22, 2.3, .08, 18); box(fixed, '#c3c4a5', -22, .21, 20, 19, .08, 2.3);
  sign(fixed, 'こもれび公園', -18, 1.6, 13, 4, 1, '#46796b');
  for (const x of [-19.6, -16.4]) cylinder(fixed, '#465d50', x, .8, 13, .07, .07, 1.6);
  function tree(x, z, scale = 1) {
    cylinder(fixed, '#877465', x, 1.1 * scale, z, .14 * scale, .25 * scale, 2.2 * scale); solid(x, z, .5 * scale, .5 * scale);
    const crown = new THREE.Group(); crown.position.set(x, 2.3 * scale, z); crown.scale.setScalar(scale); dynamic.add(crown);
    orb(crown, '#6eab82', 0, .5, 0, 1.05, 1.25, 1); orb(crown, '#90c790', .45, 1.05, .13, .77, .86, .85); orb(crown, '#78b887', -.5, .65, -.16, .75, .85, .82); trees.push(crown);
    box(fixed, '#768a80', x, .25, z, 1.5 * scale, .4, 1.5 * scale);
  }
  for (const p of [[-28,16],[-28,24],[-15,28],[-24,28],[-29,29],[-12,20],[-11,-30],[11,24],[11,34],[30,11],[13,-16],[-30,11],[-12,-2],[12,0],[-11,36],[32,-12]]) tree(...p, p[0] < -14 && p[1] > 12 ? 1.2 : .85);
  function bench(x, z, rotation = 0) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotation; fixed.add(g); for (let i = 0; i < 3; i++) box(g, '#bb946e', 0, .56, -.24 + i * .2, 2.1, .12, .16); box(g, '#c7a47d', 0, .98, -.35, 2.1, .45, .13); for (const n of [-1, 1]) { box(g, '#405964', n * .75, .3, 0, .13, .6, .65); } solid(x, z, rotation ? .9 : 2.3, rotation ? 2.3 : .9); }
  bench(-27, 26); bench(-16, 23, Math.PI / 2); bench(16, -18); bench(-7.5, 16, Math.PI / 2);
  for (let i = 0; i < 24; i++) { const x = -29 + (i % 8) * 1.8, z = 29 + Math.floor(i / 8) * .4; orb(fixed, ['#e7b1b0','#f5dfa2','#b7d191'][i % 3], x, .36, z, .18, .3, .18, 0); }
  // Vending machines and a small subway entry.
  function vending(x, z, color) { box(fixed, color, x, 1.15, z, 1.18, 2.3, .9); solid(x, z, 1.2, .95); box(fixed, '#c1e4dc', x - .08, 1.46, z + .461, .83, 1.13, .04, true); for (let i = 0; i < 9; i++) box(fixed, ['#efb082','#96ceaa','#9db7df'][i % 3], x - .32 + (i % 3) * .25, 1.8 - Math.floor(i / 3) * .34, z + .5, .14, .21, .1); box(fixed, '#263c4f', x, .41, z + .47, .65, .25, .06); }
  vending(25.1, 16, '#c5797a'); vending(-30, -13.2, '#83afb4');
  box(fixed, '#456578', 35, .8, 30, 4, 1.6, 4); solid(35, 30, 4, 4); sign(fixed, 'METRO ↓', 35, 1.6, 32.1, 4, 1, '#517488', '#e4f1c9');
  // Pedestrian traffic signals and street lamps.
  for (const x of [-9.6, 9.6]) for (const z of [-9.6, 9.6]) {
    cylinder(fixed, '#4c626c', x, 2.4, z, .09, .14, 4.8); solid(x, z, .34, .34);
    box(fixed, '#3c5361', x, 4.5, z, 1.55, .56, .48);
    const dots = [-.46, 0, .46].map((dx, i) => { const mesh = orb(dynamic, ['#ec8e86', '#ead080', '#a5e497'][i], x + dx, 4.5, z + .27, .15, .15, .05); mesh.material = mat(['#ec8e86', '#ead080', '#a5e497'][i], true).clone(); return mesh; }); signals.push(dots);
  }
  for (const p of [[-11,4],[11,-5],[-11,-20],[11,18],[-4,11],[4,-11],[-24,11],[28,-11],[-11,29],[11,-31]]) {
    const [x,z] = p; cylinder(fixed, '#4a6471', x, 2.6, z, .065, .12, 5.2); box(fixed, '#506d7b', x + .4, 5.12, z, 1.05, .16, .17); box(fixed, '#fff1bd', x + .65, 5.03, z, .58, .09, .38, true); solid(x, z, .25, .25);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(1.5, 20), new THREE.MeshBasicMaterial({ color: '#fff0ab', transparent:true, opacity:.075, depthWrite:false })); glow.rotation.x = -Math.PI / 2; glow.position.set(x + .5, .25, z); dynamic.add(glow);
  }
  for (let i = 0; i < 5; i++) { const car = new THREE.Group(); box(car, ['#e3b690','#83bab7','#bca4bf','#e0d6b8','#87a4bd'][i], 0, .65, 0, 3.1, .7, 1.5); box(car, '#73939d', -.1, 1.15, 0, 1.7, .63, 1.3); for (const x of [-1,1]) for (const z of [-.7,.7]) { const wheel = cylinder(car, '#26394a', x, .3, z, .32, .32, .16); wheel.rotation.x = Math.PI / 2; } for (const z of [-.43,.43]) box(car, '#fff0ae', 1.57, .65, z, .04, .19, .31, true); car.position.set(i * 20 - 44, .12, -36 + (i % 2 ? -2 : 2)); dynamic.add(car); cars.push(car); }
  const npcs = NPC_INFO.map((v, i) => { const [name, x, z, color, accessory, text] = v; const model = makePerson(color, ['#e6b88d','#c68e74','#edc7a6'][i % 3], accessory); model.position.set(x, .23, z); model.rotation.y = i % 2 ? Math.PI * .75 : -.6; dynamic.add(model); const npc = { name, model, text, home: new THREE.Vector3(x, .23, z), roaming: [1,2,3,6,7,11].includes(i), phase: i * 1.4, role: accessory }; if (accessory === 'dog') { const dog = new THREE.Group(); orb(dog, '#deb180', 0, .4, 0, .35, .25, .52); orb(dog, '#f1c99b', 0, .67, .34, .26); for (const xx of [-.22,.22]) { box(dog, '#c89d73', xx, .2, .22, .09, .3, .1); box(dog, '#c89d73', xx, .2, -.26, .09, .3, .1); } dog.position.set(1, 0, .2); model.add(dog); } return npc; });
  // Holographic encounter beacons, with visible original creatures.
  for (const spot of SPOTS) {
    const group = new THREE.Group(); group.position.set(spot.x, .29, spot.z); dynamic.add(group);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(spot.r, .045, 5, 64), mat(spot.color, true)); ring.rotation.x = -Math.PI / 2; group.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(spot.r, 40), new THREE.MeshBasicMaterial({ color: spot.color, transparent: true, opacity: .055, depthWrite: false })); disc.rotation.x = -Math.PI / 2; disc.position.y = -.01; group.add(disc);
    const particles = []; for (let i = 0; i < 9; i++) { const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(.09), mat(spot.color, true)); group.add(diamond); particles.push(diamond); }
    const monster = makeMonsterModel(spot.species); monster.position.set(1.8, 0, 0); monster.scale.setScalar(.68); group.add(monster); beacons.push({ group, particles, monster, spot });
  }
  const titleFriends = new THREE.Group(); scene.add(titleFriends);
  ['Flamo','Aquari','Leafy'].forEach((name,i)=>{const m=makeMonsterModel(name);m.position.set(5+i*2.7,.22,7.5-i*.6);m.rotation.y=.2;m.scale.setScalar(1.8);titleFriends.add(m);});
  // Merge static geometry by material to keep the city inexpensive to draw.
  fixed.updateMatrixWorld(true); const buckets = new Map(); const retained = [];
  fixed.traverse(o => { if (!o.isMesh) return; if (o.material.map) { retained.push(o); return; } const geom = o.geometry.clone().applyMatrix4(o.matrixWorld); const list = buckets.get(o.material) || []; list.push(geom); buckets.set(o.material, list); });
  const mergedRoot = new THREE.Group(); scene.add(mergedRoot);
  for (const [material, geometries] of buckets) { const mesh = new THREE.Mesh(mergeGeometries(geometries), material); mesh.castShadow = true; mesh.receiveShadow = true; mergedRoot.add(mesh); geometries.forEach(g => g.dispose()); }
  for (const o of retained) { const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); o.matrixWorld.decompose(p,q,s); mergedRoot.add(o); o.position.copy(p); o.quaternion.copy(q); o.scale.copy(s); }
  scene.remove(fixed);
  function update(t, dt, title = false) {
    trees.forEach((tree,i) => tree.rotation.z = Math.sin(t * .8 + i) * .024);
    signals.forEach((dots,i)=>dots.forEach((m,j)=>{const on = j === (Math.floor(t / 7 + (i % 2)) % 2 ? 0 : 2); m.material.emissiveIntensity = on ? 2 : .03; m.material.color.setScalar(on ? 1 : .27);}));
    cars.forEach((car,i)=>{ car.position.x += dt * (i % 2 ? -5 : 5); car.rotation.y = i % 2 ? Math.PI : 0; if (car.position.x > 52) car.position.x = -52; if (car.position.x < -52) car.position.x = 52; });
    npcs.forEach(n=>{if(n.roaming){const nx=n.home.x+Math.sin(t*.25+n.phase)*2, nz=n.home.z+Math.cos(t*.25+n.phase)*2; const dx=nx-n.model.position.x,dz=nz-n.model.position.z;if(canOccupy(nx,nz,colliders)){n.model.position.set(nx,.23,nz);if(Math.abs(dx)+Math.abs(dz)>.001)n.model.rotation.y=Math.atan2(dx,dz);}}animatePerson(n.model,t+n.phase,n.roaming);});
    beacons.forEach(b=>{b.particles.forEach((m,i)=>{const a=t*.2+i*Math.PI*2/9; m.position.set(Math.cos(a)*b.spot.r, .4+Math.sin(t+i)*.35, Math.sin(a)*b.spot.r);m.rotation.y=t;});animateMonster(b.monster,t);b.monster.rotation.y=t*.15;});
    billboards.forEach((m,i)=>m.material.emissiveIntensity=.45+Math.sin(t*.6+i)*.12);
    titleFriends.visible=title; titleFriends.children.forEach((m,i)=>animateMonster(m,t+i));
    const target = title ? .85 : 3.0; hemi.intensity=THREE.MathUtils.lerp(hemi.intensity,target,dt*2); sun.intensity=THREE.MathUtils.lerp(sun.intensity,title?.5:3.1,dt*2); fill.intensity=THREE.MathUtils.lerp(fill.intensity,title?.7:1.2,dt*2);
  }
  return { scene, dynamic, colliders, buildings, npcs, update, titleFriends };
}

export function createArena() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#567583'); scene.fog = new THREE.Fog('#567583', 28, 95);
  scene.add(new THREE.HemisphereLight('#e6f4dc', '#698e9a', 3.2)); const light = new THREE.DirectionalLight('#ffdfac', 3); light.position.set(-5, 15, 8); light.castShadow = true; light.shadow.mapSize.set(1024,1024); scene.add(light);
  box(scene, '#819d91', 0, -.3, 0, 150, .5, 150);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const x = Math.sin(a) * 40, z = Math.cos(a) * 40; const h = 7 + i * 3 % 18; box(scene, ['#93aaa9','#a9bdac','#8d9daa'][i%3], x,h/2,z,7,h,8); for(let j=2;j<h;j+=3) box(scene,'#d1ddbc',x,j,z+4.05,5,.8,.1,true); }
  const stages=[]; for (const [x,z] of [[-3.1,2.5],[3.1,-2.5]]) { cylinder(scene,'#bdcbb5',x,.04,z,3.2,3.4,.27,48); const ring=new THREE.Mesh(new THREE.TorusGeometry(3,.045,6,64),mat('#d9f2b4',true));ring.rotation.x=-Math.PI/2;ring.position.set(x,.195,z);scene.add(ring);stages.push(new THREE.Vector3(x,.2,z)); }
  const camera = new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.1,150); camera.position.set(8,6.3,13); camera.lookAt(0,1,0);
  return { scene, camera, stages };
}
