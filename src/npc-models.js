import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Each citizen is built from the same light, articulated human rig, then dressed
// for their own role. Geometry and materials are shared between all 12 models.
const sphere = new THREE.SphereGeometry(1, 20, 14);
const smallSphere = new THREE.SphereGeometry(1, 12, 8);
const roundBox = new RoundedBoxGeometry(1, 1, 1, 2, .12);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 16);
const lathe = rings => new THREE.LatheGeometry(rings.map(([radius, y]) => new THREE.Vector2(radius, y)), 24);
const torsoShape = lathe([[0,-.245],[.16,-.24],[.213,-.18],[.235,.03],[.276,.32],[.208,.43],[.08,.495],[0,.5]]);
const upperArmShape = lathe([[.065,.055],[.082,.035],[.095,-.02],[.088,-.13],[.075,-.285],[.073,-.325]]);
const forearmShape = lathe([[.072,.035],[.077,-.045],[.063,-.215],[.056,-.28]]);
const thighShape = lathe([[.105,.06],[.126,-.07],[.12,-.18],[.103,-.36],[.097,-.45]]);
const shinShape = lathe([[.095,.055],[.103,-.07],[.088,-.2],[.071,-.365],[.07,-.44]]);
const fabric = new Map();
function material(color, roughness = .84) {
  const key = `${color}:${roughness}`;
  if (!fabric.has(key)) fabric.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness: .02 }));
  return fabric.get(key);
}
function piece(parent, geometry, color, x, y, z, sx, sy, sz, roughness) {
  const part = new THREE.Mesh(geometry, material(color, roughness));
  part.position.set(x, y, z); part.scale.set(sx, sy, sz);
  part.castShadow = geometry === sphere || geometry === roundBox || geometry === torsoShape || geometry === thighShape || geometry === shinShape;
  parent.add(part); return part;
}
const oval = (p, c, x, y, z, sx, sy, sz) => piece(p, sphere, c, x, y, z, sx, sy, sz);
const small = (p, c, x, y, z, sx, sy, sz) => piece(p, smallSphere, c, x, y, z, sx, sy, sz);
const softBox = (p, c, x, y, z, sx, sy, sz) => piece(p, roundBox, c, x, y, z, sx, sy, sz);
const rod = (p, c, x, y, z, sx, sy, sz) => piece(p, cylinder, c, x, y, z, sx, sy, sz);

const profiles = [
  { role: 'researcher', hair: '#39404b', pants: '#647683', shoes: '#405461', style: 'bob', coat: '#e9ece7' },
  { role: 'office', hair: '#353a42', pants: '#424b58', shoes: '#303944', style: 'short' },
  { role: 'student', hair: '#443c4c', pants: '#525c75', shoes: '#f2e9d9', style: 'long' },
  { role: 'tourist', hair: '#724d3a', pants: '#819da1', shoes: '#f0e7d2', style: 'wavy' },
  { role: 'cafe', hair: '#493735', pants: '#4d625f', shoes: '#e5ded2', style: 'bun', apron: '#e5d6bd' },
  { role: 'musician', hair: '#382f44', pants: '#434a60', shoes: '#d8c6b3', style: 'wavy' },
  { role: 'shopper', hair: '#4c3746', pants: '#68627c', shoes: '#ede5e0', style: 'long' },
  { role: 'dog', hair: '#645149', pants: '#67705b', shoes: '#4c554a', style: 'short' },
  { role: 'skater', hair: '#342f3c', pants: '#60768c', shoes: '#efebe0', style: 'messy' },
  { role: 'guard', hair: '#41464b', pants: '#3b4e63', shoes: '#303d4b', style: 'short', cap: '#344958' },
  { role: 'florist', hair: '#55423e', pants: '#74816b', shoes: '#dccdb8', style: 'bun', apron: '#e8d5b8' },
  { role: 'courier', hair: '#373b40', pants: '#59616a', shoes: '#343f47', style: 'short', cap: '#bd7856' },
];

function hairStyle(head, profile) {
  const h = profile.hair;
  oval(head, h, 0, .265, -.045, .186, .095, .173);
  oval(head, h, 0, .208, -.132, .17, .15, .078);
  if (profile.style === 'long' || profile.style === 'bob') {
    for (const s of [-1, 1]) oval(head, h, s * .149, .055, -.04, .055, profile.style === 'long' ? .21 : .14, .085);
  }
  if (profile.style === 'wavy' || profile.style === 'messy') {
    for (const [x, y, z, tilt] of [[-.12,.27,.08,-.3],[-.035,.29,.125,.13],[.07,.27,.1,.35],[.15,.24,.025,.5]]) {
      const tuft = oval(head, h, x, y, z, .055, .105, .05); tuft.rotation.z = tilt;
    }
  } else {
    for (const s of [-1, 1]) {
      const fringe = oval(head, h, s * .077, .24, .11, .067, .085, .045);
      fringe.rotation.z = s * .25;
    }
  }
  if (profile.style === 'bun') oval(head, h, 0, .235, -.208, .09, .098, .09);
  if (profile.cap) {
    oval(head, profile.cap, 0, .317, -.014, .203, .071, .178);
    oval(head, profile.cap, 0, .294, .175, .21, .018, .106);
  }
}

function dress(body, profile) {
  const { role } = profile;
  if (role === 'researcher') {
    for (const s of [-1, 1]) softBox(body, profile.coat, s * .155, .005, .117, .145, .49, .11);
    softBox(body, '#83adb0', 0, .19, .175, .085, .18, .028);
    small(body, '#d7ad73', 0, .12, .198, .018, .018, .009);
    softBox(body, '#45667b', .24, -.03, .22, .2, .26, .025);
  } else if (role === 'office') {
    softBox(body, '#e5e3db', 0, .12, .17, .11, .26, .028);
    softBox(body, '#c19078', 0, .19, .192, .028, .18, .016);
    softBox(body, '#344657', .17, .015, .2, .09, .2, .04);
    softBox(body, '#4b4444', .41, -.28, .03, .23, .25, .12);
    oval(body, '#4b4444', .41, -.155, .03, .085, .025, .045);
  } else if (role === 'student') {
    softBox(body, '#eee6d7', 0, .29, .147, .29, .067, .042);
    softBox(body, '#e7d5a4', 0, .02, -.19, .37, .39, .15);
    softBox(body, '#45586d', .19, -.01, .207, .045, .34, .025);
  } else if (role === 'tourist') {
    softBox(body, '#eee3c9', .11, -.015, -.205, .34, .31, .18);
    softBox(body, '#4d5661', 0, .02, .196, .14, .12, .1);
  } else if (role === 'cafe' || role === 'florist') {
    softBox(body, profile.apron, 0, -.055, .173, .34, .48, .045);
    softBox(body, '#a98772', 0, -.095, .205, .24, .16, .012);
    for (const s of [-1, 1]) softBox(body, '#e9e0d1', s * .14, .24, .186, .033, .18, .019);
    if (role === 'florist') {
      oval(body, '#83b884', .27, -.19, .19, .11, .09, .075);
      for (const s of [-1, 1]) small(body, '#efc7ae', .27 + s * .045, -.13, .21, .04, .04, .025);
    }
  } else if (role === 'musician') {
    oval(body, '#b77d49', .08, -.04, .28, .24, .32, .087);
    oval(body, '#473d38', .08, -.04, .358, .089, .1, .01);
    const neck = softBox(body, '#8c6247', .35, .1, .27, .095, .48, .06); neck.rotation.z = -.66;
    softBox(body, '#d7c59c', -.19, .11, .173, .045, .33, .025);
  } else if (role === 'shopper') {
    softBox(body, '#ead3ac', .4, -.22, .01, .27, .32, .17);
    oval(body, '#b5926e', .4, -.035, .012, .11, .035, .045);
    softBox(body, '#ded2c2', 0, .17, .17, .085, .15, .02);
  } else if (role === 'dog') {
    softBox(body, '#d6cdb3', 0, .22, .173, .35, .095, .03);
    softBox(body, '#6b8a72', .225, -.08, .155, .035, .34, .018);
  } else if (role === 'skater') {
    softBox(body, '#cad8d7', 0, .16, .173, .23, .09, .025);
    const board = softBox(body, '#d1df82', .43, -.25, -.02, .13, .73, .065); board.rotation.z = -.17;
    for (const y of [-.5, 0]) small(body, '#47515d', .48, y, .065, .042, .042, .04);
  } else if (role === 'guard') {
    softBox(body, '#d8ceba', 0, .24, .18, .075, .038, .023);
    softBox(body, '#e9ddac', -.18, .1, .184, .065, .052, .028);
    softBox(body, '#273b4c', .21, -.11, .16, .065, .12, .06);
  } else if (role === 'courier') {
    softBox(body, '#dcc594', 0, .17, .175, .08, .08, .025);
    softBox(body, '#ddd0b3', 0, .01, -.22, .34, .35, .16);
    softBox(body, '#8c6954', .2, -.015, .19, .045, .37, .018);
  }
}

export function makeNPCModel(index, outfit, skin) {
  const profile = profiles[index] ?? profiles[0];
  const root = new THREE.Group(); root.name = `Citizen_${index + 1}`;
  const body = new THREE.Group(); body.name = 'Body'; body.position.y = 1.02; root.add(body);
  const trousers = profile.pants;
  const torso = piece(body, torsoShape, outfit, 0, 0, 0, 1, 1, .65);
  torso.scale.x = index === 1 || index === 9 ? 1.06 : index === 2 || index === 6 ? .91 : 1;
  oval(body, skin, 0, .494, .008, .065, .085, .067);
  oval(body, outfit, 0, -.155, 0, .22, .045, .151);
  const head = new THREE.Group(); head.name = 'Head'; head.position.y = .66; body.add(head);
  oval(head, skin, 0, .075, .008, .171, .227, .157);
  for (const s of [-1, 1]) {
    oval(head, skin, s * .169, .06, -.012, .028, .052, .026);
    small(head, '#f1eee5', s * .069, .109, .15, .034, .022, .01);
    small(head, '#3a3737', s * .069, .108, .161, .015, .019, .006);
    const brow = small(head, profile.hair, s * .069, .163, .146, .042, .009, .008);
    brow.rotation.z = -s * .08;
  }
  small(head, skin, 0, .045, .171, .019, .043, .021);
  small(head, '#aa7169', 0, -.025, .155, .033, .006, .006);
  hairStyle(head, profile);
  if (profile.role === 'tourist') {
    oval(head, '#e7d5aa', 0, .315, -.01, .188, .07, .15);
    rod(head, '#e7d5aa', 0, .29, .005, .22, .026, .19);
  }

  const arms = [], elbows = [], legs = [], knees = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * .269, .39, 0); body.add(arm); arms.push(arm);
    oval(arm, outfit, 0, .005, 0, .083, .075, .085);
    piece(arm, upperArmShape, outfit, 0, 0, 0, 1, 1, 1.04);
    const elbow = new THREE.Group(); elbow.position.y = -.3; arm.add(elbow); elbows.push(elbow);
    oval(elbow, outfit, 0, .012, 0, .06, .048, .065);
    piece(elbow, forearmShape, outfit, 0, 0, 0, 1, 1, 1.03);
    oval(elbow, skin, 0, -.278, .013, .053, .095, .05);
    const leg = new THREE.Group(); leg.position.set(s * .124, .98, 0); root.add(leg); legs.push(leg);
    piece(leg, thighShape, trousers, 0, 0, 0, 1, 1, .94);
    const knee = new THREE.Group(); knee.position.y = -.405; leg.add(knee); knees.push(knee);
    oval(knee, trousers, 0, .008, .003, .063, .048, .068);
    piece(knee, shinShape, trousers, 0, 0, .005, 1, 1, 1.02);
    oval(knee, profile.shoes, 0, -.391, .063, .12, .074, .186);
    softBox(knee, profile.shoes === '#f2e9d9' ? '#d8d7cf' : '#c5b8aa', 0, -.443, .07, .235, .035, .34);
  }
  dress(body, profile);
  root.userData = { body, head, arms, elbows, legs, knees, role: profile.role, phase: index * 1.7 };
  return root;
}

export function animateNPCModel(model, time, moving) {
  const { body, head, arms, elbows, legs, knees, phase, role } = model.userData;
  const walk = moving ? Math.sin(time * 6.7 + phase) : 0;
  for (let i = 0; i < 2; i++) {
    const side = i ? -1 : 1;
    legs[i].rotation.x = walk * side * .43;
    knees[i].rotation.x = moving ? Math.max(0, -walk * side) * .36 : .035;
    arms[i].rotation.x = moving ? -walk * side * .31 : Math.sin(time * 1.3 + phase + i) * .014;
    elbows[i].rotation.x = moving ? -.15 - Math.max(0, walk * side) * .12 : -.12;
  }
  body.position.y = 1.02 + (moving ? Math.abs(Math.sin(time * 6.7 + phase)) * .018 : Math.sin(time * 1.7 + phase) * .006);
  body.rotation.z = moving ? Math.sin(time * 6.7 + phase) * .018 : Math.sin(time * .7 + phase) * .006;
  head.rotation.y = Math.sin(time * .55 + phase) * (role === 'guard' ? .13 : .04);
}
