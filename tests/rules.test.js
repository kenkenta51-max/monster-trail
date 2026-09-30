import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPECIES, makeMonster, maxHP, effectiveness, damage, captureChance, rewardXP, validateSave, initialSave, canOccupy } from '../src/rules.js';
import { EFFECTS } from '../src/battle-effects.js';

test('すべての技に有効で固有の演出を割り当て、技名と一致させる',()=>{
  const moves=Object.values(SPECIES).flatMap(s=>s.moves);assert.equal(new Set(moves.map(m=>m.effect)).size,6);
  for(const move of moves){assert.ok(EFFECTS[move.effect]);assert.equal(EFFECTS[move.effect].name,move.name);assert.ok(EFFECTS[move.effect].duration<2);}
});

test('属性の有利・不利が循環し、通常攻撃には相性補正がない', () => {
  assert.equal(effectiveness('fire','grass'),1.5);assert.equal(effectiveness('grass','water'),1.5);assert.equal(effectiveness('water','fire'),1.5);
  assert.equal(effectiveness('grass','fire'),.7);assert.equal(effectiveness('normal','fire'),1);
});
test('HPと攻撃力が種類・レベルで異なり、すべての技がダメージを与える', () => {
  assert.notEqual(maxHP('Flamo',5),maxHP('Aquari',5));assert.equal(maxHP('Flamo',6),49);
  for(const name of Object.keys(SPECIES))for(const move of SPECIES[name].moves)assert.ok(damage(makeMonster(name),makeMonster('Leafy'),move,()=>.5)>0);
});
test('捕獲確率はHPを減らすほど上昇し、瀕死で確実になる', () => {
  const m=makeMonster('Leafy');assert.equal(captureChance(m),.34);m.hp=20;const medium=captureChance(m);m.hp=1;assert.ok(captureChance(m)>medium);assert.equal(captureChance(m),1);
});
test('経験値が複数レベル分でも繰り越され、HPは上限を超えない', () => {
  const m=makeMonster('Flamo');assert.equal(rewardXP(m,140),2);assert.equal(m.level,7);assert.equal(m.xp,8);assert.ok(m.hp<=maxHP(m.name,m.level));
});
test('壁の四方向と世界境界で衝突を防ぎ、空間では移動できる', () => {
  const b=[{minX:5,maxX:10,minZ:5,maxZ:10}];assert.equal(canOccupy(4.7,7,b),false);assert.equal(canOccupy(10.3,7,b),false);assert.equal(canOccupy(7,4.7,b),false);assert.equal(canOccupy(7,10.3,b),false);assert.equal(canOccupy(3,7,b),true);assert.equal(canOccupy(45,0,b),false);
});
test('壊れた保存データを拒否し、座標だけの破損は開始地点で修復する', () => {
  assert.ok(validateSave(initialSave()));assert.equal(validateSave({}),null);const bad=initialSave();bad.team[0].name='Unknown';assert.equal(validateSave(bad),null);
  const badHP=initialSave();badHP.team[0].hp=Infinity;assert.equal(validateSave(badHP),null);const badPos=initialSave();badPos.position={x:NaN,z:0};assert.deepEqual(validateSave(badPos).position,{x:0,z:15});
});
