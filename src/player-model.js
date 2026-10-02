import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { animatePerson, makePerson } from './models.js';

const ASSET = `${import.meta.env.BASE_URL}models/trail-runner.glb?v=2`;

export function createPlayer() {
  const root = new THREE.Group();
  root.name = 'Player';
  const fallback = makePerson('#e68e76', '#efc49f', 'player');
  root.add(fallback);
  root.userData.modelState = 'loading';
  root.userData.fallback = fallback;

  new GLTFLoader().loadAsync(ASSET).then(gltf => {
    const names = new Set(gltf.animations.map(clip => clip.name));
    if (!['Idle', 'Walk', 'Run'].every(name => names.has(name))) throw new Error('Character animations are missing');
    gltf.scene.traverse(object => {
      if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; }
    });
    const mixer = new THREE.AnimationMixer(gltf.scene);
    const actions = Object.fromEntries(gltf.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
    root.remove(fallback);
    root.add(gltf.scene);
    root.userData.mixer = mixer;
    root.userData.actions = actions;
    root.userData.currentAction = 'Idle';
    root.userData.modelState = 'ready';
    actions.Idle.play();
  }).catch(error => {
    root.userData.modelState = 'fallback';
    console.warn('Could not load Trail Runner model; using the built-in character.', error);
  });
  return root;
}

export function animatePlayer(root, dt, time, moving, running) {
  const data = root.userData;
  if (!data.mixer) {
    animatePerson(data.fallback, time * (running ? 1.35 : 1), moving);
    return;
  }
  const next = moving ? (running ? 'Run' : 'Walk') : 'Idle';
  if (next !== data.currentAction) {
    const previous = data.actions[data.currentAction];
    const action = data.actions[next];
    action.reset().play();
    previous.crossFadeTo(action, next === 'Idle' ? .2 : .16, false);
    data.currentAction = next;
  }
  data.mixer.update(dt);
}
