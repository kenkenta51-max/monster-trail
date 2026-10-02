import * as THREE from 'three';

// Small, deterministic materials made in the browser. They give the pavement
// scale and wear without downloading photographic assets or adding draw calls
// for every individual paving stone.
function pattern(kind) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const road = kind === 'road';
  ctx.fillStyle = road ? '#48596b' : '#d2d1c4'; ctx.fillRect(0, 0, 256, 256);
  let seed = road ? 17 : 83;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < (road ? 2800 : 1700); i++) {
    const x = random() * 256, y = random() * 256, size = .4 + random() * (road ? 2 : 1.6);
    ctx.fillStyle = random() > .45 ? 'rgba(205,222,220,.09)' : 'rgba(22,43,54,.09)';
    ctx.fillRect(x, y, size, size);
  }
  if (road) {
    for (let i = 0; i < 20; i++) {
      ctx.strokeStyle = 'rgba(27,48,58,.06)'; ctx.lineWidth = 1 + random() * 2;
      ctx.beginPath(); const y = random() * 256; ctx.moveTo(0, y); ctx.lineTo(256, y + random() * 10 - 5); ctx.stroke();
    }
  } else {
    ctx.strokeStyle = '#a6aaa5'; ctx.lineWidth = 2;
    for (let x = 0; x <= 256; x += 64) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, 256); ctx.stroke(); }
    for (let y = 0; y <= 256; y += 64) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(256, y + .5); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,.23)'; ctx.lineWidth = 1;
    for (let x = 2; x < 256; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke(); }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

const materials = new Map();
export function streetSurface(parent, kind, x, y, z, width, depth) {
  if (!materials.has(kind)) materials.set(kind, new THREE.MeshStandardMaterial({ map: pattern(kind), roughness: kind === 'road' ? .9 : .95, metalness: 0 }));
  const geometry = new THREE.PlaneGeometry(width, depth);
  geometry.rotateX(-Math.PI / 2);
  const uv = geometry.getAttribute('uv'), unit = kind === 'road' ? 8 : 2;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * width / unit, uv.getY(i) * depth / unit);
  const mesh = new THREE.Mesh(geometry, materials.get(kind)); mesh.position.set(x, y, z);
  mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
