export const SPECIES = {
  Flamo: { type: 'fire', label: '炎', color: '#ffad70', hp: 44, attack: 13, defense: 8, personality:'せっかちで、人なつっこい', silhouette:'立ち耳・二股の灯火しっぽ・あたたかい腹毛', description: 'ネオンの熱から生まれた小さな灯火獣。うれしいとしっぽの火花が踊る。', habitat: 'ひだまり路地', moves: [{ name: 'スパークテイル', power: 15, type: 'fire', effect:'ember-tail', description: 'しっぽを振り、火花の弧を放つ' }, { name: 'ぽかぽかタックル', power: 12, type: 'normal', effect:'warm-tackle', description: '身を縮めて、温かな光と突進' }] },
  Aquari: { type: 'water', label: '水', color: '#7fdae9', hp: 50, attack: 10, defense: 11, personality:'のんびり屋の、リズム好き', silhouette:'横に広い体・小さなひれ・浮かぶ水の真珠', description: '駅前の水辺が大好きな泡の精。音に合わせて水の真珠を揺らす。', habitat: '駅前プラザ', moves: [{ name: 'バブルリズム', power: 15, type: 'water', effect:'bubble-rhythm', description: 'リズムに乗せて泡を連射' }, { name: 'ころころアタック', power: 12, type: 'normal', effect:'aqua-roll', description: 'まるく回転し、水しぶきと突進' }] },
  Leafy: { type: 'grass', label: '草', color: '#bce684', hp: 47, attack: 11, defense: 10, personality:'慎重だけど、いたずら好き', silhouette:'木の実の帽子・双葉・葉っぱのえり', description: '頭の双葉で風を聴く公園の案内役。大切などんぐりをこっそり集めている。', habitat: 'こもれび公園', moves: [{ name: 'リーフスピン', power: 15, type: 'grass', effect:'leaf-spin', description: 'ひと回りして葉の渦を飛ばす' }, { name: 'どんぐりショット', power: 12, type: 'normal', effect:'acorn-shot', description: '3つの木の実を山なりに発射' }] },
};
export const ADVANTAGE = { fire: 'grass', grass: 'water', water: 'fire' };
export function maxHP(name, level) { return SPECIES[name].hp + (level - 5) * 5; }
export function makeMonster(name, level = 5) { return { name, level, hp: maxHP(name, level), xp: 0 }; }
export function effectiveness(type, targetType) { return ADVANTAGE[type] === targetType ? 1.5 : ADVANTAGE[targetType] === type ? 0.7 : 1; }
export function damage(attacker, defender, move, random = Math.random) { const a = SPECIES[attacker.name], d = SPECIES[defender.name]; return Math.max(2, Math.round((move.power * .58 + a.attack * .48 + attacker.level * .7 - d.defense * .38) * effectiveness(move.type, d.type) * (.92 + random() * .16))); }
export function captureChance(monster) { return Math.min(1, .34 + (1 - monster.hp / maxHP(monster.name, monster.level)) * .9); }
export function rewardXP(monster, amount) { monster.xp += amount; let levels = 0; while (monster.xp >= monster.level * 12) { monster.xp -= monster.level * 12; monster.level++; monster.hp = Math.min(maxHP(monster.name, monster.level), monster.hp + 12); levels++; } return levels; }
export function initialSave() { return { version: 1, team: [makeMonster('Flamo')], active: 0, potions: 5, prisms: 8, wins: 0, metResearcher: false, position: { x: 0, z: 15 } }; }
export function validateSave(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.team) || data.team.length < 1 || data.team.length > 3) return null;
  if (new Set(data.team.map(m => m.name)).size !== data.team.length) return null;
  for (const m of data.team) if (!SPECIES[m.name] || !Number.isInteger(m.level) || m.level < 5 || m.level > 100 || !Number.isFinite(m.hp) || m.hp < 0 || m.hp > maxHP(m.name, m.level) || !Number.isFinite(m.xp) || m.xp < 0 || m.xp >= m.level * 12) return null;
  if (!Number.isInteger(data.active) || data.active < 0 || data.active >= data.team.length) return null;
  if (![data.potions, data.prisms, data.wins].every(v => Number.isInteger(v) && v >= 0 && v < 100000)) return null;
  if (!data.position || !Number.isFinite(data.position.x) || !Number.isFinite(data.position.z) || Math.abs(data.position.x) > 44 || Math.abs(data.position.z) > 44) data.position = { x: 0, z: 15 };
  return data;
}
export function canOccupy(x, z, colliders, radius = .42) {
  if (Math.abs(x) > 44 || Math.abs(z) > 44) return false;
  return !colliders.some(b => x + radius > b.minX && x - radius < b.maxX && z + radius > b.minZ && z - radius < b.maxZ);
}
