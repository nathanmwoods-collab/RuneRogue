// RuneRogue engine. Data lives in data.js.
(() => {
'use strict';

// ======================================================================
// Wiki images and music, loaded live from the Old School RuneScape Wiki
// ======================================================================
const WIKI = 'https://oldschool.runescape.wiki/images/';
const WIKI_REDIRECT = 'https://oldschool.runescape.wiki/w/Special:FilePath/';
const enc = (f) => encodeURIComponent(f).replace(/%2F/g, '/');
const imgCache = {};
function wikiImage(file) {
  if (!file) return null;
  if (imgCache[file]) return imgCache[file];
  const im = new Image();
  im.decoding = 'async';
  im.onerror = () => { if (!im._retry) { im._retry = true; im.src = WIKI_REDIRECT + enc(file); } else { im._failed = true; } };
  im.src = WIKI + enc(file);
  imgCache[file] = im;
  return im;
}
const ready = (im) => im && im.complete && im.naturalWidth > 0;
function wireImg(el, file, label) {
  el.classList.add('wiki');
  el.onerror = () => {
    if (!el._retry) { el._retry = true; el.src = WIKI_REDIRECT + enc(file); return; }
    const span = document.createElement('span');
    span.className = 'fallback'; span.textContent = (label || file).replace(/_/g, ' ').replace(/\.png$/, '').slice(0, 2);
    el.replaceWith(span);
  };
  el.src = WIKI + enc(file);
  el.alt = el.alt || label || '';
  return el;
}
function imgTag(file, label) { const el = document.createElement('img'); return wireImg(el, file, label); }
document.querySelectorAll('img[data-wiki]').forEach((el) => wireImg(el, el.dataset.wiki, el.alt));

// Music: one <audio> element, track switches by area. Browsers only allow it after a tap.
const music = new Audio();
music.loop = true; music.volume = 0.45; music.preload = 'auto';
let musicOn = true, musicTrack = null;
try { musicOn = localStorage.getItem('runerogue.music') !== 'off'; } catch (e) { /* optional */ }
function playMusic(file) {
  if (musicTrack === file && !music.paused) return;
  musicTrack = file;
  if (!musicOn || !file) { music.pause(); return; }
  music.onerror = () => { if (!music._retry) { music._retry = true; music.src = WIKI_REDIRECT + enc(file); music.play().catch(() => {}); } };
  music._retry = false;
  music.src = WIKI + enc(file);
  music.play().catch(() => {});
}
function toggleMusic() {
  musicOn = !musicOn;
  try { localStorage.setItem('runerogue.music', musicOn ? 'on' : 'off'); } catch (e) { /* optional */ }
  document.getElementById('musicState').textContent = musicOn ? 'on' : 'off';
  if (musicOn) { const t = musicTrack; musicTrack = null; playMusic(t); } else music.pause();
}
document.getElementById('musicState').textContent = musicOn ? 'on' : 'off';
document.getElementById('musicBtn').addEventListener('click', toggleMusic);
document.getElementById('pauseBtn').addEventListener('click', () => togglePause());

// ======================================================================
// Canvas, world, input
// ======================================================================
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const WORLD_W = 1400, WORLD_H = 820;
let scale = 1, offX = 0, offY = 0, dpr = 1;
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth, h = cv.clientHeight;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  scale = Math.min(w / WORLD_W, h / WORLD_H);
  offX = (w - WORLD_W * scale) / 2; offY = (h - WORLD_H * scale) / 2;
}
addEventListener('resize', resize);
resize();

const keys = {};
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  keys[k] = true;
  if (k === 'm') toggleMusic();
  if (mode !== 'play' && mode !== 'paused') return;
  if (k === '1') togglePrayer('melee');
  if (k === '2') togglePrayer('ranged');
  if (k === '3') togglePrayer('magic');
  if (k === 'e') useItem('shark');
  if (k === 'q') useItem('ppot');
  if (k === ' ') specialAttack();
  if (k === 'p' || k === 'escape') togglePause();
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (mode === 'play') togglePause(); });

// Touch joystick: press anywhere on the arena and drag
const stick = { id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
cv.addEventListener('pointerdown', (e) => {
  if (mode !== 'play') return;
  stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.dx = 0; stick.dy = 0;
  cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointermove', (e) => {
  if (e.pointerId !== stick.id) return;
  stick.dx = e.clientX - stick.ox; stick.dy = e.clientY - stick.oy;
});
const endStick = (e) => { if (e.pointerId === stick.id) { stick.id = null; stick.dx = stick.dy = 0; } };
cv.addEventListener('pointerup', endStick);
cv.addEventListener('pointercancel', endStick);

document.getElementById('specBtn').addEventListener('click', () => specialAttack());
document.querySelectorAll('.pbtn[data-pray], .pbtn[data-use]').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.pray) togglePrayer(b.dataset.pray); else useItem(b.dataset.use);
}));

// ======================================================================
// Sound effects: small WebAudio blips
// ======================================================================
let audio = null;
function sfx(freq, dur = 0.08, type = 'square', vol = 0.04) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
    o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + dur);
  } catch (e) { /* optional */ }
}

// ======================================================================
// Trading sticks: permanent upgrades kept between runs (this browser only)
// ======================================================================
let meta = { sticks: 0, up: {}, heroes: [], cleared: -1, invo: {} };
try { meta = Object.assign(meta, JSON.parse(localStorage.getItem('runerogue.meta') || '{}')); } catch (e) { /* optional */ }
// ---------- Achievements ----------
function achEvent(on, x) {
  if (!run && on !== 'win') return;
  meta.ach = meta.ach || {};
  for (const a of ACHIEVEMENTS) {
    if (a.on !== on || meta.ach[a.id]) continue;
    let ok = false;
    try { ok = a.test(x); } catch (e) { ok = false; }
    if (ok) completeAch(a);
  }
}
const achQueue = [];
function completeAch(a) {
  const t = ACH_TIERS[a.tier];
  meta.ach[a.id] = Date.now();
  meta.sticks += t.sticks;
  saveMeta();
  chat(`Congratulations, you've completed ${/^[aeiou]/i.test(t.name) ? 'an' : 'a'} ${t.name.toLowerCase()} combat task: ${a.name}. (+${t.sticks} trading sticks)`, 'r');
  achQueue.push(a);
  if (achQueue.length === 1) showAch();
}
const jingle = new Audio();
function showAch() {
  const a = achQueue[0];
  if (!a) return;
  const t = ACH_TIERS[a.tier];
  if (musicOn) {
    jingle.onerror = () => { if (!jingle._retry) { jingle._retry = true; jingle.src = WIKI_REDIRECT + enc(ACH_JINGLE); jingle.play().catch(() => {}); } };
    jingle._retry = false; jingle.src = WIKI + enc(ACH_JINGLE); jingle.volume = 0.8; jingle.play().catch(() => {});
  }
  const box = document.createElement('div');
  box.className = 'ach-pop';
  box.innerHTML = `<div class="ach-title">Combat Task Completed!</div><div class="ach-body"></div><div class="ach-name"></div><div class="ach-reward">+${t.sticks} trading sticks</div>`;
  box.querySelector('.ach-body').appendChild(imgTag(t.file, t.name));
  box.querySelector('.ach-body').appendChild(document.createTextNode(` ${t.name} task`));
  box.querySelector('.ach-name').textContent = a.name;
  document.body.appendChild(box);
  setTimeout(() => box.classList.add('out'), 4200);
  setTimeout(() => { box.remove(); achQueue.shift(); showAch(); }, 4700);
}

function saveMeta() { try { localStorage.setItem('runerogue.meta', JSON.stringify(meta)); } catch (e) { /* optional */ } }
function heroUnlocked(h) {
  if (!h.unlock) return true;
  if (meta.heroes.includes(h.id)) return true; // bought or earned before progression unlocks
  if (h.unlock.area !== undefined) return meta.cleared >= h.unlock.area;
  return false;
}
function unlockText(h) {
  if (h.unlock.area !== undefined) return `Clear ${AREAS[h.unlock.area].name} to unlock`;
  if (h.unlock.boss) return `Defeat the ${MONSTERS[h.unlock.boss].name} to unlock`;
  return `Costs ${h.unlock.sticks} trading sticks`;
}
function upLevel(id) { return meta.up[id] || 0; }
let noUpgrades = false; // the Corrupted invocation turns trading-stick upgrades off for a run
function upVal(id) { const u = UPGRADES.find((x) => x.id === id); return noUpgrades ? 0 : upLevel(id) * u.per; }
function upCost(u) { return Math.round(u.base * Math.pow(1.55, upLevel(u.id))); }
// Sticks for a run: progress, bosses and clues all count.
function sticksEarned() {
  const bosses = Math.floor((run.stage + (mode === 'over' && run.won ? 1 : 0)) / (WAVES_PER_AREA + 1));
  const base = (run.stage * 3 + bosses * 12 + run.clues * 8 + run.kills / 25) * (1 + (run.raid || 0) / 100);
  return Math.max(1, Math.round(base * (run.skullDied ? 0.5 : 1)));
}

// ======================================================================
// Run state
// ======================================================================
let mode = 'title'; // title | play | paused | shop | casket | over
let run = null;
let enemies = [], shots = [], eshots = [], coins = [], splats = [], fx = [], telegraphs = [], pickups = [], hazards = [];
const TOTAL_STAGES = AREAS.length * (WAVES_PER_AREA + 1);

function newRun(hero) {
  noUpgrades = !!(meta.invo || {}).corrupted;
  const skills = {};
  for (const s of SKILLS) skills[s.id] = s.start;
  Object.assign(skills, hero.skills || {});
  const gear = {};
  for (const s of SLOTS) gear[s] = null;
  gear.weapon = hero.weapon;
  Object.assign(gear, hero.gear || {});
  const kit = hero.kits && hero.kits[pickedKit];
  if (kit) { gear.weapon = kit.weapon; Object.assign(gear, kit.gear || {}); }
  gearBarKey = '';
  run = {
    hero, skills, gear,
    invo: { ...(meta.invo || {}) }, raid: raidLevel(meta.invo || {}), livesUsed: 0, skull: false, skullAsked: false,
    inv: { shark: Math.round((2 + upVal('shark')) * supplyMult(meta.invo || {})), ppot: Math.round(supplyMult(meta.invo || {})) },
    freeRerolls: 0, buffs: {}, boons: {}, lives: (hero.mods || {}).lives || 0,
    spec: 100, contracts: {}, yamaSeen: 0, killsBy: {}, bossHurt: false, prayedEver: false, gold: upVal('startGold'), stage: -1, kills: 0, totalGold: 0, rerolls: 0, clues: 0, clueSeen: [], bought: 0, piesEaten: 0, specs: 0,
    p: { x: WORLD_W / 2, y: WORLD_H / 2, r: 22, hp: 0, pp: 0, atkT: 0, face: 0, hurtT: 0, frozen: 0, poison: 0, anim: null, over: null },
    prayer: null,
  };
  run.p.hp = stats().maxHp; run.p.pp = stats().maxPp;
  setTimeout(() => achEvent('start'), 600);
  chatClear();
  chat(`Welcome to RuneRogue, ${hero.name}.`);
  chat(`${AREAS.length} areas stand between you and the end. Good luck.`, 'b');
  if (run.raid) chat(`Raid level ${run.raid} (${raidMode(run.raid)} mode): ${INVOCATIONS.filter((v) => run.invo[v.id]).map((v) => v.name).join(', ')}.`, 'r');
  startStage();
}

const KIND_STYLE = { swing: 'melee', shot: 'ranged', spell: 'magic' };
// Your combat style comes from the weapon you hold, not the hero.
function weaponStyle() { return KIND_STYLE[ITEMS[run.gear.weapon].w.kind]; }
// Gear damage bonuses only count when they match the weapon's style, like OSRS.
function gearDmg(it, style) { return it.lane === 'any' || it.lane === style ? (it.dmg || 0) : 0; }
// Combat triangle for armour: melee armour hurts magic, magic armour hurts ranged, ranged armour hurts melee.
const WEAK_STYLE = { melee: 'magic', magic: 'ranged', ranged: 'melee' };
function armourPenalty(it) {
  if (it.w || it.slot === 'ammo' || !WEAK_STYLE[it.lane]) return 0;
  return 0.04 + 0.5 * Math.max(0, it.dmg || 0) + 0.002 * Math.max(0, it.def || 0);
}
function gearPenalty(gear, style) {
  const p = gear.reduce((a, it) => a + (WEAK_STYLE[it.lane] === style ? armourPenalty(it) : 0), 0);
  return Math.min(0.6, p);
}

function gearItems() { return SLOTS.map((s) => run.gear[s]).filter(Boolean).map((id) => ITEMS[id]); }
// Barrows: the set effect works only with all four pieces of one brother on.
function barrowsSet() { for (const k in BARROWS_SETS) if (BARROWS_SETS[k].pieces.every((id) => SLOTS.some((sl) => run.gear[sl] === id))) return k; return null; }
function eDrain(e) { return e && e.drainT > 0 ? 0.8 : 1; }

function stats() {
  const h = run.hero, s = run.skills, m = h.mods || {};
  const gear = gearItems();
  const sum = (k) => gear.reduce((a, it) => a + (it[k] || 0), 0);
  const weapon = ITEMS[run.gear.weapon].w;
  const lane = KIND_STYLE[weapon.kind];
  let dmgMult = (m.dmg || 1) * (1 + upVal('dmg')) * buffMult('dmg_' + lane) * (1 + gear.reduce((a, it) => a + gearDmg(it, lane), 0)) * (1 - gearPenalty(gear, lane)) * (1 + 0.15 * bv('might')) * (ycon('severance') ? 1.6 : 1);
  if (run.weakT > 0) dmgMult *= 0.85; // the Weaken spell, King Black Dragon's shock breath
  let aspd = (1 + sum('aspd') + upVal('aspd')) * buffMult('aspd') * (1 + 0.15 * bv('haste')) * (ycon('bloodied') ? 1.5 : 1);
  const range = (m.range || 1) * (1 + sum('range')) * (1 + 0.15 * bv('reach')) * (inv('myopia') ? 0.75 : 1);
  let splash = (m.splash || 1) * (1 + 0.2 * bv('pierce'));
  // Skill levels run to 99, so each level is a small step.
  if (lane === 'melee') { dmgMult *= 1 + 0.03 * (s.strength - 1); aspd *= 1 + 0.01 * (s.attack - 1); }
  if (lane === 'ranged') { dmgMult *= 1 + 0.03 * (s.ranged - 1); aspd *= 1 + 0.01 * (s.ranged - 1); }
  if (lane === 'magic') { dmgMult *= 1 + 0.03 * (s.magic - 1); splash *= 1 + 0.01 * (s.magic - 1); }
  const defPts = sum('def') * 1.2 + (s.defence - 1) * 0.7;
  const takenGear = gear.reduce((a, it) => a * (it.taken || 1), 1);
  return {
    lane, weapon, dmgMult, aspd, range, splash,
    pierce: sum('pierce') + bv('pierce'),
    regen: sum('regen') + (m.regen || 0) + 1.5 * bv('heal'),
    maxHp: Math.round((50 + 5 * (s.hitpoints - 10) + sum('hp') + upVal('hp') + (m.hp || 0)) * (ycon('bloodied') ? 0.6 : 1) * (inv('frailty') ? 0.8 : 1)),
    maxPp: 20 + 2 * (s.prayer - 1) + sum('pp') + upVal('prayer'),
    ppDrain: PRAYER_DRAIN * (m.ppDrain || 1) / (1 + 0.03 * (s.prayer - 1)) * Math.pow(0.75, bv('preserve')),
    reduce: inv('relentless') ? 0 : Math.min(0.75, defPts / 100),
    taken: (m.taken || 1) * takenGear * (1 - upVal('def')) * Math.pow(0.9, bv('skin')) * (ycon('clouding') ? 1.35 : 1),
    speed: (run.p && run.p.slowT > 0 ? 0.6 : 1) * 230 * (run.frogT > 0 ? 0.5 : 1) * (m.speed || 1) * buffMult('speed') * (1 + 0.12 * bv('fleet')) * (1 + 0.006 * (s.agility - 1) + sum('speed') + upVal('speed')),
    goldMult: (m.gold || 1) * (1 + 0.02 * (s.thieving - 1)) * (1 + sum('gold')) * (1 + upVal('gold')) * (1 + 0.25 * bv('greed')) * (ycon('breath') ? 1.75 : 1) * (run.skull ? SKULL.gold : 1),
    crit: 0.05 + (m.crit || 0) + 0.005 * (s.slayer - 1) + upVal('crit') + 0.08 * bv('crit') + (ycon('glyphic') ? 0.25 : 0),
  };
}

// ======================================================================
// Stages: each area has WAVES_PER_AREA waves and then its boss.
// A wave lasts until every enemy is dead.
// ======================================================================
let area = null, isBoss = false, toSpawn = 0, spawnT = 0, bossAlive = null, stageEnding = 0;
function areaIndex() { return Math.floor(run.stage / (WAVES_PER_AREA + 1)); }
function subIndex() { return run.stage % (WAVES_PER_AREA + 1); }

function startStage() {
  run.stage++;
  area = AREAS[areaIndex()];
  isBoss = subIndex() === WAVES_PER_AREA;
  enemies = []; shots = []; eshots = []; coins = []; fx = []; telegraphs = []; pickups = []; hazards = [];
  bossAlive = null; stageEnding = 0; run.bossHurt = false; run.door = null;
  run.stageT = 0; run.enraged = false; run.obeliskT = 12; run.aerialT = 5; run.boulderT = 8; run.insaneAt = null; run.circleAt = null; run.evAt = null; run.thiefTold = false;
  endEvent();
  if (subIndex() === 0) run.phoenixUsed = false;
  const st = stats();
  Object.assign(run.p, { x: WORLD_W / 2, y: WORLD_H * 0.62, frozen: 0, poison: 0, pp: st.maxPp, anim: null });
  run.prayer = null;
  const a = areaIndex(), sub = subIndex();
  toSpawn = isBoss ? 4 + a * 2 : 12 + a * 4 + sub * 6;
  if (!isBoss && inv('overlords')) toSpawn = Math.round(toSpawn * 1.4);
  if (!isBoss && inv('quartet')) { toSpawn++; run.quartet = true; }
  if (!isBoss && run.stage >= 1 && Math.random() < RANDOM_EVENT_CHANCE) run.evAt = Math.floor(toSpawn * (0.3 + Math.random() * 0.5));
  if (inv('bees')) hazards.push({ x: 60, y: 140, r: 32, t: 1e9, color: '#ffd23a', dps: 3 + areaIndex() * 1.5, chase: 105, bees: true });
  if (inv('solarflare')) hazards.push({ x: WORLD_W / 2, y: WORLD_H / 2, r: 38, t: 1e9, color: '#ff9a1a', dps: 6 + areaIndex() * 2, orbit: { a: 0 } });
  // Varrock: the dark wizards' circle south of the city ambushes you once in each wave
  if (!isBoss && area.name === 'Varrock') run.circleAt = Math.floor(toSpawn * (0.3 + Math.random() * 0.5));
  // Insanity: a boss from elsewhere in Gielinor bursts into this wave partway through
  if (!isBoss && inv('insanity') && run.stage >= 1 && Math.random() < 0.45) run.insaneAt = Math.floor(toSpawn * (0.2 + Math.random() * 0.5));
  // Raids: the waves are the raid's earlier bosses (with their own minions) instead of a horde, and the finale has few mobs
  run.raidQ = null;
  const rw = !isBoss && area.raid && area.raid[sub];
  if (rw) { run.raidQ = rw.map((g) => [].concat(g)); toSpawn = 0; run.evAt = null; run.circleAt = null; run.insaneAt = null; run.raidT = 1.5; }
  if (isBoss && area.raid) toSpawn = area.finaleMobs ?? 4;
  if (run.skull && area.name !== 'Wilderness') { run.skull = false; chat('You leave the Wilderness. Your skull fades.', 'g'); }
  spawnT = 0.6;
  if (isBoss) {
    const def = MONSTERS[area.boss];
    // feet low enough that the whole sprite is on screen
    const b = spawnMonster(area.boss, WORLD_W / 2, Math.max(230, 140 + def.size));
    bossAlive = b;
    chat(`${area.name}: ${def.name} (level-${def.lvl}) appears!`, 'r');
    bossIntro(b);
    sfx(90, 0.6, 'sawtooth', 0.07);
  } else {
    if (rw) chat(`${area.name}, room ${sub + 1} of ${WAVES_PER_AREA}: ${rw.map((g) => { g = [].concat(g); return (g.length > 1 ? g.length + ' × ' : '') + MONSTERS[g[0]].name; }).join(', then ')}. Beat them, then walk through the exit door.`, 'g');
    else chat(`${area.name}, wave ${sub + 1} of ${WAVES_PER_AREA}. Defeat every enemy, then walk through the exit door.`, 'g');
  }
  if (sub === 0 && !isBoss) heroSays();
  creatureStageStart();
  playMusic(area.music);
  mode = 'play';
  showScreen(null);
  updatePrayerButtons();
  const portrait = $('hudPortrait');
  if (portrait && run.stage === 0) { portrait._retry = false; wireImg(portrait, run.hero.file, run.hero.name); }
  if (run.skull && isBoss) spawnPker();
  if (area.name === 'Wilderness' && !run.skullAsked) { run.skullAsked = true; renderSkull(); }
}

function heroSays() {
  const q = run.hero.quotes;
  if (q && q.length) say(run.p, q[Math.floor(Math.random() * q.length)]);
}
function say(ent, text, t = 3.2) { ent.over = { text, t }; chat(`${ent === run.p ? run.hero.name : ent.d.name}: ${text}`, 'b'); }
function bossIntro(b) {
  const lines = (QUOTES[b.d.id] || []);
  if (lines.length) say(b, lines[0], 4);
}

// Global boss toughness (Nathan: bosses were too easy).
const BOSS_TEMPO = 1.3, BOSS_HP = 1.5, BOSS_DMG = 1.35;
// Protection prayers block everything but drain fast; flick them on for the hit and off again.
const PRAYER_DRAIN = 4, FLICK_TICK = 0.6;
// Rest between rounds heals this share of max hitpoints (Nathan: 15%).
const REST_HEAL = 0.15;
// Bosses enrage below this share of their total hitpoints, counting every phase.
const ENRAGE_AT = 0.33;
// Eating a shark or pie stops your attacks for this long, like the OSRS food delay.
const EAT_DELAY = 1.2;
// Healing from your own damage (lifesteal weapons, specs, boons) is halved (Nathan).
const PLAYER_LEECH = 0.5;
function stageScale() { return 1 + 0.085 * run.stage + 0.004 * run.stage * run.stage; }

const SAFE_SPAWN = 260; // nothing appears closer than this to the player
function safeSpot(x, y) {
  const p = run.p;
  let dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
  if (d >= SAFE_SPAWN) return { x, y };
  if (d < 1) { const a = Math.random() * Math.PI * 2; dx = Math.cos(a); dy = Math.sin(a); d = 1; }
  let nx = p.x + dx / d * SAFE_SPAWN, ny = p.y + dy / d * SAFE_SPAWN;
  // pushed off the arena? go the other way instead
  if (nx < 20 || nx > WORLD_W - 20 || ny < 110 || ny > WORLD_H - 20) { nx = p.x - dx / d * SAFE_SPAWN; ny = p.y - dy / d * SAFE_SPAWN; }
  return { x: clamp(nx, 20, WORLD_W - 20), y: clamp(ny, 110, WORLD_H - 20) };
}
function spawnMonster(id, x, y, opts = {}) {
  const d = MONSTERS[id];
  if (!d.boss) ({ x, y } = safeSpot(x, y));
  let hp = d.hp;
  if (d.clue) hp = Math.round(300 * (d.clueMult || 1)); // clue bosses grow with the run via stageScale below
  const sc = d.boss ? 1 : stageScale();
  const e = {
    id, d, x, y, r: d.size * 0.36, hp: Math.round(hp * (d.boss ? 1 : sc)), maxHp: 0,
    dmg: d.clue ? 3.2 * stageScale() * (d.clueMult || 1) * BOSS_DMG : d.dmg * (d.boss ? BOSS_DMG : 1 + 0.03 * run.stage),
    hitCd: 0, frozen: 0, castT: 1 + Math.random() * 2, kx: 0, ky: 0, flash: 0, over: null,
    ai: { t: 2.5 + Math.random(), phase: 0, burrow: 0 }, ...opts,
  };
  if (d.boss || d.clue) {
    e.hp = Math.round(e.hp * BOSS_HP);
    // Bosses scale to your damage so a strong build can't melt them: a fight lasts at least ~35-60s (clue bosses ~20-35s).
    const a = areaIndex(), ttk = d.boss ? (d.sub ? 24 + a : 35 + 1.6 * a) : 20 + a; // raid room bosses are shorter fights
    e.hp = Math.max(e.hp, Math.round(effectiveDps(d) * ttk));
    // Safety net for builds the estimate misses: a boss can't lose more than its HP over ~70% of that time.
    e.capRate = e.hp / (ttk * 0.7); e.capBank = e.capRate * 2;
  }
  if (ycon('glyphic')) e.hp = Math.round(e.hp * 1.4);
  if (inv('cm') && !d.boss) { e.hp = Math.round(e.hp * 1.5); e.dmg *= 1.2; }
  if (inv('hmt') && d.boss) e.hp = Math.round(e.hp * 1.3);
  e.maxHp = e.hp;
  enemies.push(e);
  if (d.say) say(e, d.say);
  return e;
}

function edgeSpawn() {
  const p = run.p;
  for (let i = 0; i < 10; i++) {
    const side = Math.floor(Math.random() * 4);
    const x = side === 0 ? 20 : side === 1 ? WORLD_W - 20 : 20 + Math.random() * (WORLD_W - 40);
    const y = side === 2 ? 110 : side === 3 ? WORLD_H - 20 : 110 + Math.random() * (WORLD_H - 130);
    if (Math.hypot(x - p.x, y - p.y) > 320) return { x, y };
  }
  return safeSpot(20, 120);
}

// Pick a spawn point anywhere on the map, away from the player and from other enemies, so the horde comes from every side.
function spreadSpawn() {
  const p = run.p;
  let best = null, bestScore = -1;
  for (let i = 0; i < 10; i++) {
    const x = 40 + Math.random() * (WORLD_W - 80), y = 130 + Math.random() * (WORLD_H - 160);
    const dp = Math.hypot(x - p.x, y - p.y);
    if (dp < SAFE_SPAWN + 40) continue;
    let near = 1e9;
    for (const e of enemies) near = Math.min(near, Math.hypot(e.x - x, e.y - y));
    // favour spots ahead of where the player is running, so circling runs into new enemies
    const ahead = (p.vx || 0) * (x - p.x) + (p.vy || 0) * (y - p.y) > 0 ? 120 : 0;
    const score = Math.min(near, 500) + ahead - Math.max(0, dp - 650) * 0.3;
    if (score > bestScore) { bestScore = score; best = { x, y }; }
  }
  return best || edgeSpawn();
}

function spawnTick(dt) {
  if (toSpawn <= 0 || (isBoss && (!bossAlive || bossAlive.dead))) return;
  spawnT -= dt;
  const a = areaIndex();
  // trickle in: only a limited number alive at once
  if (run.insaneAt !== null && toSpawn <= run.insaneAt) { run.insaneAt = null; spawnInsane(); }
  if (run.circleAt !== null && toSpawn <= run.circleAt) { run.circleAt = null; wizardCircle(); }
  if (run.evAt !== null && run.evAt !== undefined && toSpawn <= run.evAt) { run.evAt = null; startRandomEvent(); if (mode !== 'play') return; }
  const maxAlive = Math.round((isBoss ? 4 + a : 7 + Math.floor(a * 0.8) + subIndex() * 2) * (!isBoss && inv('overlords') ? 1.4 : 1));
  if (spawnT > 0 || enemies.length >= maxAlive) return;
  spawnT = isBoss ? 4 : Math.max(0.7, 1.7 - a * 0.05);
  const group = Math.min(toSpawn, 1 + Math.floor(Math.random() * 2));
  for (let i = 0; i < group; i++) {
    let id = area.hordes[Math.floor(Math.random() * area.hordes.length)];
    if (area.elites.length && Math.random() < Math.min(0.4, 0.1 + subIndex() * 0.08 + a * 0.015)) id = area.elites[Math.floor(Math.random() * area.elites.length)];
    const pos = spreadSpawn();
    if (run.skull && !isBoss && Math.random() < 0.12 && enemies.filter((e) => e.d.pker && !e.dead).length < 2) { spawnPker(pos); continue; }
    if (!isBoss && inv('medic') && Math.random() < 0.18) { medicScarab(pos); continue; }
    if (run.quartet && area.elites.length) { run.quartet = false; id = area.elites[Math.floor(Math.random() * area.elites.length)]; }
    const m = spawnMonster(id, pos.x, pos.y);
    if (!isBoss && !m.d.elite && Math.random() < SUPERIOR_CHANCE * (1 + luckVal())) makeSuperior(m);
    if (inv('duo') && m.d.elite && !isBoss) { const p2 = spreadSpawn(); spawnMonster(id, p2.x, p2.y); }
    if (!isBoss && a >= 1 && !m.d.caster && Math.random() < Math.min(0.45, 0.2 + a * 0.02)) mixStyle(m);
    burst(pos.x, pos.y, '#d8c8a0', 8);
    if (m && Math.random() < 0.45) m.lead = 0.5 + Math.random() * 0.7; // cuts you off instead of chasing your tail
  }
  toSpawn -= group;
}

// Raid rooms: each boss (or group, like the Inferno's triple Jad) comes in once the one before it is dead
function raidTick(dt) {
  if (!run.raidQ) return;
  const alive = enemies.filter((e) => e.raidBoss && !e.dead);
  if (alive.length) { if (!bossAlive || bossAlive.dead) bossAlive = alive[0]; return; }
  if (!run.raidQ.length || (run.raidT -= dt) > 0) return;
  run.raidT = 2.5;
  const group = run.raidQ.shift();
  const bs = group.map((id, i) => {
    const d = MONSTERS[id];
    const b = spawnMonster(id, WORLD_W / 2 + (i - (group.length - 1) / 2) * 380, Math.max(230, 140 + d.size));
    b.raidBoss = true;
    if (group.length > 1) { b.hp = b.maxHp = Math.round(b.maxHp * 0.55); b.ai.t += i * 1.3; }
    return b;
  });
  bossAlive = bs[0];
  const d = bs[0].d;
  chat(`${group.length > 1 ? group.length + ' × ' : ''}${d.name}${d.lvl ? ` (level-${d.lvl})` : ''} ${group.length > 1 ? 'appear' : 'appears'}!`, 'r');
  bossIntro(bs[0]);
  sfx(90, 0.6, 'sawtooth', 0.07);
}

function checkStageDone(dt) {
  if (stageEnding > 0) { stageEnding -= dt; if (stageEnding <= 0) endStage(); return; }
  const bossDone = !isBoss || !bossAlive || bossAlive.dead;
  // a reward casket or clue scroll on the ground keeps the round open until you pick it up
  const waitPk = pickups.find((pk) => pk.kind === 'casket' || pk.kind === 'clue' || pk.kind === 'artefact');
  const casketWaiting = !!waitPk;
  if (run.ev) return; // finish the random event first
  if (bossDone && (toSpawn <= 0 || isBoss) && enemies.length === 0 && !(run.raidQ && run.raidQ.length)) {
    // a casket or artefact must be picked up; a clue scroll can be read or left behind
    if (casketWaiting && waitPk.kind !== 'clue') { if (!run.casketNag) { run.casketNag = true; chat(`Pick up the ${waitPk.kind === 'artefact' ? waitPk.art.name : 'reward casket'} to finish the round.`, 'r'); } return; }
    run.casketNag = false;
    // every enemy is dead: an exit door appears in the middle of the map, and walking through it ends the round
    if (!run.door) {
      run.door = { x: WORLD_W / 2, y: WORLD_H / 2, t: 0, armed: false };
      chat(waitPk ? 'A door appears in the middle. Read the clue scroll first, or leave it and walk through the door.' : 'A door appears in the middle. Walk through it to leave.', 'g');
      sfx(520, 0.15, 'triangle', 0.05);
    }
    const d = run.door, dist = Math.hypot(run.p.x - d.x, run.p.y - d.y);
    d.t += dt;
    if (dist > 70) d.armed = true; // step away first, so standing on the spot when it appears doesn't end the round
    if (d.armed && dist < run.p.r + 24) {
      if (waitPk) chat('You leave the clue scroll on the ground.', 'b');
      run.door = null;
      stageEnding = 0.3;
    }
  } else run.door = null;
}

function drawDoor() {
  const d = run.door; if (!d) return;
  ctx.fillStyle = 'rgba(255,220,120,0.22)'; ctx.beginPath(); ctx.arc(d.x, d.y, 44 + Math.sin(d.t * 4) * 5, 0, 7); ctx.fill();
  const im = wikiImage(DOOR_FILE);
  if (ready(im)) { const h = 84, w = h * im.naturalWidth / im.naturalHeight; ctx.drawImage(im, d.x - w / 2, d.y - h + 24, w, h); }
  else { ctx.fillStyle = '#5a3a1a'; ctx.fillRect(d.x - 22, d.y - 56, 44, 76); ctx.fillStyle = '#3a2410'; ctx.fillRect(d.x - 18, d.y - 52, 36, 70); ctx.fillStyle = '#d8b040'; ctx.beginPath(); ctx.arc(d.x + 10, d.y - 14, 3, 0, 7); ctx.fill(); }
  text('Exit door', d.x, d.y - 66, 13, '#ff981f');
}

function endStage() {
  if (run.bonus) {
    for (const c of coins) addGold(c.v, false);
    coins = []; pickups = []; run.buffs = {};
    run.bonus = false; area = AREAS[areaIndex()];
    chat('You climb out of the Revenant Caves.', 'g');
    playMusic(MUSIC_SHOP); rollOffers(true); mode = 'shop'; renderShop();
    return;
  }
  for (const c of coins) addGold(c.v, false);
  coins = [];
  pickups = [];
  run.buffs = {};
  const st = stats();
  const bonus = Math.round((15 + run.stage * 6) * st.goldMult * (isBoss ? 2 : 1));
  addGold(bonus, false);
  if (!ycon('breath')) run.p.hp = Math.min(st.maxHp, run.p.hp + Math.round(st.maxHp * REST_HEAL));
  run.p.hp = Math.min(st.maxHp, run.p.hp);
  chat(`${isBoss ? `${area.name} cleared!` : 'Wave cleared.'} Bonus: ${bonus} coins.`, 'g');
  achEvent('stage', { area: areaIndex(), boss: isBoss });
  if (isBoss && areaIndex() > meta.cleared) {
    meta.cleared = areaIndex(); saveMeta();
    for (const h of HEROES) if (h.unlock && h.unlock.area === meta.cleared) chat(`New hero unlocked: ${h.name}!`, 'r');
  }
  sfx(660, 0.12, 'triangle', 0.06); setTimeout(() => sfx(880, 0.18, 'triangle', 0.06), 120);
  if (run.stage >= TOTAL_STAGES - 1) { victory(); return; }
  playMusic(MUSIC_SHOP);
  rollOffers(true);
  const next = () => { if (isBoss) { renderBoons(); return; } mode = 'shop'; renderShop(); };
  if (!isBoss && !run.revSeen && areaIndex() >= 3 && Math.random() < REV_CHANCE) { run.revSeen = true; renderRevOffer(next); return; }
  if (yamaShows()) { renderYama(next); return; }
  next();
}

// Yama: a rare deal at the end of a round. At most YAMA_MAX per run, and always one by round YAMA_PITY.
function yamaShows() {
  if (run.yamaSeen >= YAMA_MAX) return false;
  const open = CONTRACTS.filter((c) => !run.contracts[c.id]);
  if (open.length < 2) return false;
  if (run.yamaSeen === 0 && run.stage + 1 >= YAMA_PITY) return true;
  return Math.random() < (run.yamaSeen ? YAMA_CHANCE / 4 : YAMA_CHANCE);
}
function renderYama(next) {
  mode = 'yama';
  run.yamaSeen++;
  const pool = CONTRACTS.filter((c) => !run.contracts[c.id]);
  const picks = [];
  while (picks.length < 2 && pool.length) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  const s = el('div', 'sheet yama'); s.style.maxWidth = '640px';
  const head = el('div', 'row'); head.style.justifyContent = 'flex-start';
  const art = el('div', 'yama-art'); art.appendChild(imgTag(YAMA.file, YAMA.name)); head.appendChild(art);
  const t = el('div');
  t.appendChild(el('h2', '', 'Yama offers you a contract'));
  t.appendChild(el('p', 'yama-quote', `“${YAMA.quotes[Math.floor(Math.random() * 2)]}”`));
  t.appendChild(el('p', '', 'Sign one for the rest of this run, or walk away. Read the fine print.'));
  head.appendChild(t); s.appendChild(head);
  const g = el('div', 'grid offers'); g.style.marginTop = '12px';
  for (const c of picks) {
    const card = el('button', 'card offer contract'); card.type = 'button';
    card.appendChild(el('div', 'nm', c.name));
    card.appendChild(el('div', 'ds gain', `▲ ${c.gain}`));
    card.appendChild(el('div', 'ds price-bad', `▼ ${c.cost}`));
    card.appendChild(el('div', 'sign', 'Sign'));
    card.addEventListener('click', () => {
      run.contracts[c.id] = true;
      if (c.id === 'clouding') run.boons.multi = bv('multi') + 2;
      if (c.id === 'glyphic') run.spec = 100;
      if (c.id === 'severance') run.prayer = null;
      run.p.hp = Math.min(stats().maxHp, run.p.hp);
      chat(`You sign the ${c.name}. Yama: “${YAMA.quotes[2]}”`, 'r');
      achEvent('yama', 'sign');
      sfx(90, 0.5, 'sawtooth', 0.08);
      next();
    });
    g.appendChild(card);
  }
  s.appendChild(g);
  const r = el('div', 'row'); r.style.marginTop = '14px';
  r.appendChild(btn('Refuse the contract', 'btn', () => { chat('You refuse Yama. He watches you leave.', 'b'); achEvent('yama', 'refuse'); next(); }));
  s.appendChild(r);
  showScreen(s);
}

// After each boss: pick 1 of 3 boons for this run.
function renderBoons() {
  mode = 'boon';
  const pool = BOONS.filter((b) => bv(b.id) < b.max);
  const picks = [];
  while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  if (!picks.length) { mode = 'shop'; renderShop(); return; }
  const s = el('div', 'sheet');
  s.appendChild(el('h2', '', `${area.name} cleared! Choose a boon`));
  s.appendChild(el('p', '', 'Boons last for the rest of this run.'));
  const g = el('div', 'grid offers');
  for (const b of picks) {
    const c = el('button', 'card offer'); c.type = 'button';
    const art = el('div', 'art'); art.appendChild(imgTag(b.file, b.name)); c.appendChild(art);
    c.appendChild(el('div', 'nm', b.name + (bv(b.id) ? ` ${'I'.repeat(bv(b.id) + 1)}` : '')));
    c.appendChild(el('div', 'ds', b.info));
    c.addEventListener('click', () => {
      run.boons[b.id] = bv(b.id) + 1;
      if (b.id === 'life') run.lives++;
      chat(`Boon gained: ${b.name}.`, 'g');
      achEvent('boon', b);
      sfx(784, 0.15, 'triangle', 0.06);
      mode = 'shop'; renderShop();
    });
    g.appendChild(c);
  }
  s.appendChild(g);
  showScreen(s);
}

// ======================================================================
// Treasure Trails: clue scroll -> clue mini boss -> reward casket (pick 1 of 3)
// ======================================================================
function maybeDropPotion(e) {
  if (e.d.boss || e.summoned) return;
  const chance = (e.d.elite || e.clueBoss ? POTION_CHANCE.elite : POTION_CHANCE.normal) * (1 + luckVal() * 0.5);
  if (Math.random() < chance) {
    // the potion for the style you're using is twice as likely
    const style = weaponStyle();
    const bag = Object.keys(POTIONS).flatMap((k) => (POTIONS[k].style === style ? [k, k] : [k]));
    pickups.push({ kind: 'potion', pot: bag[Math.floor(Math.random() * bag.length)], x: e.x + 20, y: e.y, t: 0 });
  }
  const hurt = run.p.hp < stats().maxHp * 0.5 ? 2 : 1;
  if (Math.random() < (e.d.elite || e.clueBoss ? PIE_CHANCE.elite : PIE_CHANCE.normal) * hurt * supplyMult(run.invo) * ((run.hero.mods || {}).pieChance || 1)) {
    pickups.push({ kind: 'pie', x: e.x - 20, y: e.y, t: 0 });
  }
}
function luckVal() { return upVal('luck') + (ycon('breath') ? 0.5 : 0) + (run.raid || 0) / 400 + (run.skull ? SKULL.luck : 0) + 0.25 * bv('wealth'); }
// ======================================================================
// Random events (RANDOM_EVENTS in data.js): talk events, quick puzzle screens and arena events.
// ======================================================================
let evNpc = null; // { x, y, file, name, t, line }
const evPick = (a) => a[Math.floor(Math.random() * a.length)];
const evShuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
function evGold(mult = 1) { return Math.round((40 + run.stage * 14) * mult * stats().goldMult); }
function evReward(gold, why) { addGold(gold, true); chat(`${why} You get ${gold.toLocaleString()} coins.`, 'g'); sfx(880, 0.15, 'triangle', 0.06); }
// An experience lamp: levels in the skill your weapon uses
function evLamp(n, why) {
  const sk = { melee: 'strength', ranged: 'ranged', magic: 'magic' }[weaponStyle()];
  run.skills[sk] = Math.min(99, run.skills[sk] + n);
  chat(`${why} You rub the lamp: +${n} ${SKILLS.find((k) => k.id === sk).name} levels.`, 'g');
  sfx(980, 0.2, 'triangle', 0.06);
}
function evTeleport() {
  const p = run.p;
  p.x = 80 + Math.random() * (WORLD_W - 160); p.y = 150 + Math.random() * (WORLD_H - 200);
  burst(p.x, p.y, '#b080ff', 24);
  chat('You are teleported somewhere random!', 'r');
}
function startRandomEvent() {
  if (run.ev || mode !== 'play') return;
  run.evSeen = run.evSeen || [];
  let pool = RANDOM_EVENTS.filter((d) => !run.evSeen.includes(d.id));
  if (!pool.length) { run.evSeen = []; pool = RANDOM_EVENTS.slice(); }
  const def = evPick(pool);
  run.evSeen.push(def.id);
  chat(`Random event: ${def.name}!`, 'r');
  sfx(700, 0.12, 'triangle', 0.06); setTimeout(() => sfx(940, 0.12, 'triangle', 0.06), 120);
  const p = run.p;
  if (def.type === 'talk') {
    const a = Math.random() * Math.PI * 2;
    evNpc = { x: clamp(p.x + Math.cos(a) * 220, 60, WORLD_W - 60), y: clamp(p.y + Math.sin(a) * 180, 170, WORLD_H - 30), file: def.file, name: def.npc, t: 14 };
    run.ev = { def, type: 'talk' };
    if (def.line) chat(`${def.npc}: ${def.line}`, 'b');
    chat(`${def.npc} wants a word. Walk over within 14 seconds.`, 'b');
    return;
  }
  if (def.type === 'pick') { runPickEvent(def); return; }
  run.ev = { def, type: def.type, t: 0 };
  if (def.line) chat(`${def.npc}: ${def.line}`, 'b');
  if (def.type === 'drill') {
    run.ev.mats = DRILL_MATS.map((name, i) => ({ name, x: WORLD_W / 2 + (i % 2 ? 1 : -1) * 260, y: 300 + (i < 2 ? 0 : 280) }));
    run.ev.round = 0; run.ev.good = 0; run.ev.bad = 0; run.ev.t = 5; run.ev.call = evPick(DRILL_MATS);
    chat(`Sergeant Damien: ${run.ev.call}! Stand on the right mat.`, 'r');
  } else if (def.type === 'forester') {
    const want = 1 + Math.floor(Math.random() * 4);
    run.ev.want = want; run.ev.t = 25;
    for (let i = 1; i <= 4; i++) { const pos = spreadSpawn(); const m = spawnMonster('pheasant', pos.x, pos.y); m.eventMob = true; m.tails = i; m.hp = m.maxHp = 1; }
    chat(`Freaky Forester: kill the pheasant with ${want} tail${want > 1 ? 's' : ''}. Walk up to a pheasant to attack it.`, 'r');
  } else if (def.type === 'maze') {
    const far = { x: p.x < WORLD_W / 2 ? WORLD_W - 90 : 90, y: p.y < WORLD_H / 2 ? WORLD_H - 70 : 170 };
    run.ev.shrine = far; run.ev.pot = 100;
    run.ev.chests = [0, 1, 2].map((i) => ({ x: p.x + (far.x - p.x) * (0.25 + i * 0.25) + (Math.random() - 0.5) * 200, y: p.y + (far.y - p.y) * (0.25 + i * 0.25) + (Math.random() - 0.5) * 140 }));
    run.ev.chests.forEach((c) => { c.x = clamp(c.x, 60, WORLD_W - 60); c.y = clamp(c.y, 150, WORLD_H - 40); });
    chat('Mysterious Old Man: reach the shrine before your reward runs out. Chests cost a little reward.', 'r');
  } else if (def.type === 'pinball') {
    run.ev.posts = [0, 1, 2, 3, 4].map((i) => ({ x: WORLD_W / 2 + Math.cos(i / 5 * Math.PI * 2 - Math.PI / 2) * 300, y: 470 + Math.sin(i / 5 * Math.PI * 2 - Math.PI / 2) * 230 }));
    run.ev.lit = Math.floor(Math.random() * 5); run.ev.score = 0; run.ev.t = 40;
    chat('Flippa: tag the flashing post. 10 in a row wins. A wrong post resets your score.', 'r');
  }
}
function endEvent() { run.ev = null; evNpc = null; for (const e of enemies) if (e.eventMob) e.dead = true; }

function eventTick(dt) {
  const p = run.p;
  if (run.frogT > 0) { run.frogT -= dt; if (run.frogT <= 0) chat('You turn back into a human.', 'g'); }
  if (run.bonus) {
    run.revPkT -= dt;
    if (!run.revPk && run.revPkT <= 0) { run.revPk = 1; spawnPker(); chat('A PKer followed you into the caves!', 'r'); }
    if (run.revPk === 1 && toSpawn <= run.revHalf) { run.revPk = 2; spawnPker(); }
  }
  const ev = run.ev;
  if (!ev) return;
  const d = ev.def;
  if (ev.type === 'talk') {
    evNpc.t -= dt;
    if (Math.hypot(p.x - evNpc.x, p.y - evNpc.y) < p.r + 40) { const n = evNpc; endEvent(); talkReward(d, n); return; }
    if (evNpc.t <= 0) { const n = evNpc; endEvent(); talkIgnored(d, n); }
  } else if (ev.type === 'drill') {
    ev.t -= dt;
    if (ev.t <= 0) {
      const mat = ev.mats.find((m) => Math.abs(p.x - m.x) < 90 && Math.abs(p.y - m.y) < 60);
      if (mat && mat.name === ev.call) { ev.good++; chat('Sergeant Damien: Good!', 'g'); }
      else { ev.bad++; hurtPlayer(0, 'melee', { pure: true, frac: 0.12 }); chat('Sergeant Damien: Wrong! Drop and give me twenty!', 'r'); }
      if (ev.good >= 4) { endEvent(); evLamp(3, 'Drill Demon complete.'); return; }
      if (ev.bad >= 3) { endEvent(); chat('Sergeant Damien gives up on you.', 'r'); return; }
      ev.call = evPick(DRILL_MATS); ev.t = 5;
      chat(`Sergeant Damien: ${ev.call}!`, 'r');
    }
  } else if (ev.type === 'forester') {
    ev.t -= dt;
    if (ev.t <= 0) { endEvent(); chat('The Freaky Forester leaves. You took too long.', 'r'); }
  } else if (ev.type === 'maze') {
    ev.pot -= dt * 3.5;
    for (const c of ev.chests) if (!c.open && Math.hypot(p.x - c.x, p.y - c.y) < p.r + 26) {
      c.open = true; ev.pot -= 5;
      const bag = Object.keys(POTIONS); pickups.push({ kind: 'potion', pot: evPick(bag), x: c.x + 30, y: c.y, t: 0 });
    }
    if (Math.hypot(p.x - ev.shrine.x, p.y - ev.shrine.y) < p.r + 34) { const pot = Math.max(0, ev.pot); endEvent(); evReward(evGold(3 * pot / 100), `You touch the shrine with ${Math.round(pot)}% reward potential.`); return; }
    if (ev.pot <= 0) { endEvent(); chat('Your reward potential ran out. The maze lets you go with nothing.', 'r'); }
  } else if (ev.type === 'pinball') {
    ev.t -= dt;
    ev.posts.forEach((po, i) => {
      if (Math.hypot(p.x - po.x, p.y - po.y) < p.r + 26) {
        if (po.cool > 0) return;
        po.cool = 0.8;
        if (i === ev.lit) { ev.score++; sfx(900 + ev.score * 40, 0.06, 'square', 0.04); let n; do n = Math.floor(Math.random() * 5); while (n === ev.lit); ev.lit = n; }
        else { ev.score = 0; chat('Wrong post! Your score resets.', 'r'); sfx(150, 0.15, 'square', 0.05); }
      }
      po.cool = Math.max(0, (po.cool || 0) - dt);
    });
    if (ev.score >= 10) { endEvent(); evReward(evGold(3), 'Pinball complete: Flippa hands over a pile of gems.'); return; }
    if (ev.t <= 0) { endEvent(); chat('Pinball is over. Flippa keeps the gems.', 'r'); }
  }
}

function talkReward(d, n) {
  const st = stats();
  burst(n.x, n.y, '#ffd060', 16);
  if (d.id === 'count' || d.id === 'genie') evLamp(2, `${d.npc} gives you a lamp.`);
  else if (d.id === 'oldman') evReward(evGold(1.5), 'The Mysterious Old Man gives you a gift.');
  else if (d.id === 'rick') evReward(evGold(1.5), 'Rick Turpentine shares his loot.');
  else if (d.id === 'dwarf') { run.p.hp = Math.min(st.maxHp, run.p.hp + st.maxHp * 0.25); chat('The Drunken Dwarf gives you a beer and a kebab. They heal you.', 'g'); }
  else if (d.id === 'plant') {
    run.p.hp = Math.min(st.maxHp, run.p.hp + st.maxHp * 0.15); run.p.poison = 0;
    run.buffs.speed = { t: 15, amount: 0.3, name: 'Strange fruit', file: 'Strange_plant.png' };
    chat('You pick a strange fruit. It tastes great, some of your energy is restored!', 'g');
  } else if (d.id === 'jekyll') {
    const [herb, pot] = evPick(JEKYLL_HERBS), P = POTIONS[pot];
    run.buffs[P.stat] = { t: 20, amount: P.amount, name: P.name, file: P.file };
    chat(`You give Dr Jekyll a ${herb}. He gives you a ${P.name}: ${P.info} for 20 seconds.`, 'g');
  }
}
function talkIgnored(d, n) {
  const p = run.p;
  if (d.id === 'dwarf') { for (let i = 0; i < 3; i++) slam(p.x + (i ? (Math.random() - 0.5) * 160 : 0), p.y + (i ? (Math.random() - 0.5) * 120 : 0), 55, 0.8 + i * 0.3, 0, 'ranged', '#a08060', i ? '' : 'Rocks!', { noPray: true, frac: 0.08 }); chat('The Drunken Dwarf throws rocks at you!', 'r'); }
  else if (d.id === 'rick') { const lost = Math.round(run.gold * 0.15); run.gold -= lost; hurtPlayer(0, 'melee', { pure: true, frac: 0.12 }); chat(`Rick Turpentine attacks you and takes ${lost.toLocaleString()} coins!`, 'r'); }
  else if (d.id === 'plant') { hurtPlayer(0, 'melee', { pure: true, frac: 0.1, poison: 8 }); chat('The strange plant attacks and poisons you!', 'r'); }
  else if (d.id === 'jekyll') { const m = spawnMonster('mr_hyde', n.x, n.y); m.x = n.x; m.y = n.y; m.hp = m.maxHp = Math.round(m.maxHp * 1.5); chat('Dr Jekyll turns into Mr Hyde!', 'r'); }
  else chat(`${d.npc} leaves.`, 'b');
}

// Quick puzzle screens. The fight pauses; each answer has a timer.
const PICK_SECS = 8;
function runPickEvent(def) {
  mode = 'event';
  run.ev = { def, type: 'pick' };
  const st = { round: 0, good: 0, bad: 0, need: 1, maxBad: 1, data: {} };
  const a = areaIndex();
  const gearPool = Object.values(ITEMS).filter((it) => it.slot !== 'food' && it.tier <= a + 2);
  let gen, win, fail, intro = '';
  const done = (ok) => { clearTimeout(st.timer); run.ev = null; mode = 'play'; showScreen(null); (ok ? win : fail)(); };
  if (def.id === 'beekeeper') {
    intro = 'Help me rebuild this beehive. Place the parts from the top down.'; st.need = 4; st.inOrder = true;
    gen = () => ({ prompt: `Part ${st.good + 1} of 4: which goes next?`, options: evShuffle(HIVE_PARTS).map((x) => ({ label: x, ok: x === HIVE_PARTS[st.good] })) });
    win = () => evReward(evGold(2), 'The hive is fixed.');
    fail = () => { hazards.push({ x: run.p.x + 200, y: run.p.y, r: 32, t: 10, color: '#ffd23a', dps: 4 + a * 1.5, chase: 120 }); chat('The bees are angry! A swarm chases you.', 'r'); };
  } else if (def.id === 'arnav') {
    const target = evPick(ARNAV_ITEMS); st.need = 3; st.maxBad = 2;
    intro = `Turn the three dials so they all show the ${target[0]}.`;
    gen = () => ({ prompt: `Dial ${st.good + 1} of 3: show the ${target[0]}`, options: evShuffle(ARNAV_ITEMS).map(([n, f]) => ({ img: f, ok: n === target[0] })) });
    win = () => evReward(evGold(2), `The chest opens: a ${target[0].toLowerCase()} and some coins.`);
    fail = () => evTeleport();
  } else if (def.id === 'certer') {
    const it = evPick(gearPool), others = evShuffle(gearPool.filter((x) => x.name !== it.name)).slice(0, 2);
    intro = 'Can you tell me what this is?';
    gen = () => ({ prompt: 'What is this item?', show: it.file, options: evShuffle([it, ...others]).map((x) => ({ label: x.name, ok: x === it })) });
    win = () => evReward(evGold(1.5), 'Niles thanks you.'); fail = () => chat('Niles: Wrong! Better luck next time.', 'r');
  } else if (def.id === 'evilbob') {
    st.need = 3; st.maxBad = 4;
    intro = 'Evil Bob wants fish. His servant whispers which one; each wrong fish means one more to catch.';
    gen = () => { const f = evPick(BOB_FISH); return { prompt: `Servant: "He wants ${f[0].toLowerCase()}." (${st.good} of ${st.need} fed)`, options: evShuffle(BOB_FISH).map(([n, file]) => ({ img: file, ok: n === f[0] })) }; };
    st.onBad = () => { st.need++; };
    win = () => evLamp(2, 'Evil Bob falls asleep and you escape ScapeRune.'); fail = () => { run.p.frozen = 2; chat('Evil Bob keeps you on ScapeRune a little longer...', 'r'); };
  } else if (def.id === 'twin') {
    st.maxBad = 2;
    intro = 'My evil twin is in the pen, among some bystanders. She looks exactly like me. Grab her with the claw!';
    gen = () => { const opts = [{ img: def.file, ok: true }]; for (const h of evShuffle([70, 140, 200, 260, 320]).slice(0, 3)) opts.push({ img: def.file, filter: `hue-rotate(${h}deg)`, ok: false }); return { prompt: 'Which one is the evil twin?', show: def.file, options: evShuffle(opts) }; };
    win = () => evReward(evGold(2), 'You caught the evil twin. Molly gives you uncut gems.'); fail = () => evTeleport();
  } else if (def.id === 'gravedigger') {
    st.need = 3; st.maxBad = 2;
    intro = 'Put each coffin under the right gravestone.';
    gen = () => { const j = evPick(GRAVE_JOBS); return { prompt: 'This coffin holds:', show: j[1], options: evShuffle(GRAVE_JOBS).map(([n]) => ({ label: `${n}'s grave`, ok: n === j[0] })) }; };
    win = () => evLamp(2, 'Leo thanks you.'); fail = () => { summon(run.p, 'zombie', 2); chat('You disturbed the dead! Zombies rise.', 'r'); };
  } else if (def.id === 'frog') {
    intro = 'One of these frogs is a royal in disguise. Kiss the one with the crown.';
    gen = () => ({ prompt: 'Which frog do you kiss?', options: evShuffle([{ img: def.file, ok: true }, ...[0, 1, 2].map(() => ({ img: 'Frog_(Kiss_the_frog)_chathead.png', ok: false }))]) });
    win = () => evReward(evGold(2), 'The frog turns into royalty and gives you a frog token.');
    fail = () => { run.frogT = 8; chat('Wrong frog! You are turned into a frog for 8 seconds: slow, and you can\'t attack.', 'r'); };
  } else if (def.id === 'mime') {
    st.need = 4; st.maxBad = 2;
    intro = 'Copy the Mime\'s emotes.';
    gen = () => { const em = evPick(MIME_EMOTES); return { prompt: `The Mime performs: ${em}`, options: evShuffle([em, ...evShuffle(MIME_EMOTES.filter((x) => x !== em)).slice(0, 3)]).map((x) => ({ label: x, ok: x === em })) }; };
    win = () => evLamp(2, 'The Mime applauds.'); fail = () => chat('The Mime is unimpressed.', 'r');
  } else if (def.id === 'pillory') {
    st.need = 3; st.maxBad = 6; st.streak = true;
    intro = 'You are locked in the pillory! Pick the key that matches the big lock. A wrong key adds another lock.';
    gen = () => { const lock = evPick(PILLORY_SHAPES); return { prompt: `Lock ${st.good + 1} of ${st.need}`, bigText: lock[1], options: evShuffle([lock, ...evShuffle(PILLORY_SHAPES.filter((x) => x !== lock)).slice(0, 2)]).map((x) => ({ label: x[1], ok: x === lock })) }; };
    st.onBad = () => { st.need = Math.min(6, st.need + 1); run.p.hp -= Math.round(stats().maxHp * 0.04); chat('The crowd pelts you with rotten tomatoes!', 'r'); };
    win = () => evReward(evGold(1.5), 'You are free of the pillory.'); fail = () => chat('The guard finally lets you go.', 'r');
  } else if (def.id === 'prisonpete') {
    st.need = 3; st.maxBad = 5; st.streak = true;
    intro = 'Pull the lever, then pop the balloon animal that matches. Three keys in a row gets us out.';
    gen = () => { const an = evPick(BALLOONS); return { prompt: `The lever shows a ${an.toLowerCase()}. Pop the matching balloon. (${st.good} of 3 keys)`, options: evShuffle(BALLOONS).map((x) => ({ label: `${x} balloon`, ok: x === an })) }; };
    win = () => evReward(evGold(1.5), 'Prison Pete thanks you for the keys.'); fail = () => chat('Prison Pete gives up for now.', 'r');
  } else if (def.id === 'quiz') {
    st.need = 4; st.maxBad = 6; st.streak = true;
    intro = 'Welcome to the quiz! Pick the odd one out. Four in a row wins.';
    gen = () => {
      const slots = evShuffle([...new Set(gearPool.map((x) => x.slot))]);
      const same = evShuffle(gearPool.filter((x) => x.slot === slots[0])).slice(0, 2), odd = evPick(gearPool.filter((x) => x.slot === slots[1]));
      if (same.length < 2 || !odd) return { prompt: 'Odd one out?', options: [{ label: 'Coins', ok: true }, { label: 'Coins', ok: true }] };
      return { prompt: `Which is the odd one out? (${st.good} of 4)`, options: evShuffle([...same.map((x) => ({ img: x.file, ok: false })), { img: odd.file, ok: true }]) };
    };
    win = () => { evReward(evGold(2), 'Quiz complete!'); if (Math.random() < 0.3) { chat('You also get a mystery box!', 'g'); setTimeout(() => { if (mode === 'play') openCasket({}); }, 300); } };
    fail = () => chat('The Quiz Master lets you go.', 'r');
  } else if (def.id === 'sandwich') {
    const f = evPick(SANDWICH_FOOD);
    intro = `You look hungry. Have a ${f[0].toLowerCase()}!`;
    gen = () => ({ prompt: `She offers you a ${f[0].toLowerCase()}. Take it.`, options: evShuffle(SANDWICH_FOOD).map(([n, file]) => ({ img: file, ok: n === f[0] })) });
    win = () => { const m = stats().maxHp; run.p.hp = Math.min(m, run.p.hp + m * 0.2); chat(`You eat the ${f[0].toLowerCase()}. It heals you.`, 'g'); };
    fail = () => { hurtPlayer(0, 'melee', { pure: true, frac: 0.25 }); evTeleport(); chat('The sandwich lady hits you with a baguette!', 'r'); };
  } else {
    // Surprise Exam: find the item that fits Mr. Mordaut's hint
    st.need = 3; st.maxBad = 2;
    intro = 'Surprise exam! Find the item that matches each hint.';
    gen = () => {
      const slots = evShuffle([...new Set(gearPool.map((x) => x.slot))]).slice(0, 4);
      const picks = slots.map((sl) => evPick(gearPool.filter((x) => x.slot === sl)));
      const ans = evPick(picks);
      return { prompt: `Hint: something you wear in the ${SLOT_NAME[ans.slot].toLowerCase()} slot`, options: evShuffle(picks).map((x) => ({ img: x.file, ok: x === ans })) };
    };
    win = () => evLamp(3, 'You pass! Mr. Mordaut gives you a Book of Knowledge.'); fail = () => chat('Mr. Mordaut: You fail!', 'r');
  }
  const render = () => {
    clearTimeout(st.timer);
    const q = gen();
    const s = el('div', 'sheet event'); s.style.maxWidth = '620px';
    const head = el('div', 'row'); head.style.justifyContent = 'flex-start';
    const art = el('div', 'yama-art'); art.appendChild(imgTag(def.file, def.npc)); head.appendChild(art);
    const t = el('div'); t.appendChild(el('h2', '', `Random event: ${def.name}`)); t.appendChild(el('p', '', `${def.npc}: “${intro}”`)); head.appendChild(t);
    s.appendChild(head);
    const bar = el('div', 'ev-timer'); const fill = el('div'); bar.appendChild(fill); s.appendChild(bar);
    s.appendChild(el('p', 'ev-prompt', q.prompt));
    if (q.show) { const sh = el('div', 'ev-show'); sh.appendChild(imgTag(q.show, '')); s.appendChild(sh); }
    if (q.bigText) s.appendChild(el('div', 'ev-big', q.bigText));
    const g = el('div', 'grid offers ev-opts');
    const answer = (ok) => {
      if (ok) { st.good++; sfx(760, 0.08, 'triangle', 0.05); }
      else { st.bad++; sfx(160, 0.15, 'square', 0.05); if (st.streak) st.good = 0; if (st.onBad) st.onBad(); }
      if (st.good >= st.need) return done(true);
      if (st.bad >= st.maxBad) return done(false);
      render();
    };
    for (const o of q.options) {
      const c = el('button', 'card offer ev-opt'); c.type = 'button';
      if (o.img) { const a2 = el('div', 'art'); const im = imgTag(o.img, o.label || ''); if (o.filter) im.style.filter = o.filter; a2.appendChild(im); c.appendChild(a2); }
      if (o.label) c.appendChild(el('div', 'nm', o.label));
      c.addEventListener('click', () => answer(o.ok));
      g.appendChild(c);
    }
    s.appendChild(g);
    showScreen(s);
    fill.style.animation = `evbar ${PICK_SECS}s linear forwards`;
    st.timer = setTimeout(() => { chat('Too slow!', 'r'); answer(false); }, PICK_SECS * 1000);
  };
  render();
}

function drawEvent() {
  const ev = run.ev;
  if (evNpc) {
    drawShadow(evNpc.x, evNpc.y + 4, 22);
    drawSprite(wikiImage(evNpc.file), evNpc.x, evNpc.y + 4, 84, { color: '#7a5aaa', label: evNpc.name[0] });
    text(`${evNpc.name} (${Math.ceil(evNpc.t)}s)`, evNpc.x, evNpc.y - 100, 14, '#00ffff');
  }
  if (!ev) return;
  if (ev.type === 'drill') {
    for (const m of ev.mats) {
      ctx.fillStyle = m.name === ev.call ? 'rgba(255,220,80,0.35)' : 'rgba(80,120,60,0.45)'; ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 3;
      ctx.fillRect(m.x - 90, m.y - 60, 180, 120); ctx.strokeRect(m.x - 90, m.y - 60, 180, 120);
      text(m.name, m.x, m.y, 18, '#fff');
    }
    text(`Sergeant Damien: ${ev.call}! (${Math.ceil(ev.t)})`, WORLD_W / 2, 130, 22, '#ffff00');
  } else if (ev.type === 'maze') {
    ctx.fillStyle = 'rgba(160,200,255,0.4)'; ctx.beginPath(); ctx.arc(ev.shrine.x, ev.shrine.y, 34 + Math.sin(performance.now() / 200) * 4, 0, 7); ctx.fill();
    text('Shrine', ev.shrine.x, ev.shrine.y - 44, 15, '#9fe8ff');
    for (const c of ev.chests) if (!c.open) { ctx.fillStyle = '#7a4a1a'; ctx.fillRect(c.x - 16, c.y - 12, 32, 24); ctx.strokeStyle = '#ffd060'; ctx.strokeRect(c.x - 16, c.y - 12, 32, 24); }
    text(`Reward potential ${Math.max(0, Math.round(ev.pot))}%`, WORLD_W / 2, 130, 20, '#9fe8ff');
  } else if (ev.type === 'pinball') {
    ev.posts.forEach((po, i) => {
      const lit = i === ev.lit && Math.sin(performance.now() / 120) > -0.3;
      ctx.fillStyle = lit ? '#ffe04a' : '#5a4a3a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(po.x, po.y, 24, 0, 7); ctx.fill(); ctx.stroke();
    });
    text(`Pinball: ${ev.score} / 10 (${Math.ceil(ev.t)}s)`, WORLD_W / 2, 130, 20, '#ffe04a');
  } else if (ev.type === 'forester') {
    text(`Freaky Forester: kill the pheasant with ${ev.want} tail${ev.want > 1 ? 's' : ''} (${Math.ceil(ev.t)}s)`, WORLD_W / 2, 130, 20, '#7fd060');
  }
}

// ======================================================================
// Revenant Caves bonus round (REV_AREA in data.js)
// ======================================================================
function renderRevOffer(next) {
  mode = 'revoffer';
  const s = el('div', 'sheet yama'); s.style.maxWidth = '640px';
  const head = el('div', 'row'); head.style.justifyContent = 'flex-start';
  const art = el('div', 'yama-art'); art.appendChild(imgTag('Revenant_knight.png', 'Revenant')); head.appendChild(art);
  const t = el('div'); t.appendChild(el('h2', '', 'A way into the Revenant Caves')); t.appendChild(el('p', '', 'A bonus round: revenants drop ancient artefacts worth a fortune. A PKer is always hunting down there.')); head.appendChild(t);
  s.appendChild(head);
  const r = el('div', 'row'); r.style.marginTop = '14px';
  r.appendChild(btn('Walk past', 'btn', () => { chat('You leave the caves alone.', 'b'); next(); }));
  r.appendChild(btn('Enter the caves', 'btn big', startBonus));
  s.appendChild(r);
  showScreen(s);
}
function startBonus() {
  run.bonus = true; run.revPk = 0; run.revPkT = 4;
  area = REV_AREA; isBoss = false;
  enemies = []; shots = []; eshots = []; coins = []; fx = []; telegraphs = []; pickups = []; hazards = []; endEvent();
  bossAlive = null; stageEnding = 0; run.door = null;
  run.stageT = 0; run.enraged = false; run.insaneAt = null; run.circleAt = null; run.evAt = null; run.quartet = false;
  const st = stats();
  Object.assign(run.p, { x: WORLD_W / 2, y: WORLD_H * 0.62, frozen: 0, poison: 0, pp: st.maxPp, anim: null });
  run.prayer = null;
  toSpawn = 16 + areaIndex() * 2; run.revHalf = Math.floor(toSpawn / 2); spawnT = 0.6;
  chat('You enter the Revenant Caves. Ancient artefacts await, and so do PKers.', 'r');
  playMusic(REV_AREA.music);
  mode = 'play'; showScreen(null); updatePrayerButtons();
}
function maybeDropArtefact(e) {
  if (!run.bonus || e.summoned) return;
  const ch = (e.d.pker ? 1 : e.d.elite ? 0.25 : 0.06) * (1 + luckVal());
  if (Math.random() >= ch) return;
  const total = ARTEFACTS.reduce((a, x) => a + x.wt, 0);
  let r = Math.random() * total, art = ARTEFACTS[0];
  for (const x of ARTEFACTS) { if (r < x.wt) { art = x; break; } r -= x.wt; }
  pickups.push({ kind: 'artefact', art, x: e.x, y: e.y, t: 0 });
  chat(`An ${art.name} drops!`, 'r');
}

// ======================================================================
// Superior monsters, goblin thieves and boss helpers
// ======================================================================
function makeSuperior(m) {
  m.superior = true;
  m.d = { ...m.d, name: `Superior ${m.d.name.toLowerCase()}`, size: m.d.size * 1.35, elite: true };
  m.r = m.d.size * 0.36;
  m.hp = m.maxHp = Math.round(m.maxHp * 4);
  m.dmg *= 1.6;
  chat('A superior foe has appeared...', 'r');
  sfx(120, 0.4, 'sawtooth', 0.07);
}
const THIEVES = new Set(['goblin', 'hobgoblin', 'rev_goblin']);
// Goblins run for coins on the ground and make off with them. Kill the thief to get them back with interest.
function thiefMove(e, dt) {
  const p = run.p, spd = e.d.spd * (e.slow || 1);
  if (e.loot) {
    const a = Math.atan2(e.y - p.y, e.x - p.x);
    e.x += Math.cos(a) * spd * 1.15 * dt; e.y += Math.sin(a) * spd * 1.15 * dt;
    return true;
  }
  let best = null, bd = 420;
  for (const c of coins) { if (c.got) continue; const d = Math.hypot(c.x - e.x, c.y - e.y); if (d < bd) { bd = d; best = c; } }
  if (!best) return false;
  if (bd < 18) {
    e.loot = best.v; best.got = true;
    if (!run.thiefTold) { run.thiefTold = true; chat(`A ${e.d.name.toLowerCase()} grabs your coins! Kill it to get them back.`, 'r'); }
    return true;
  }
  e.x += (best.x - e.x) / bd * spd * dt; e.y += (best.y - e.y) / bd * spd * dt;
  return true;
}
// Verzik's Nylocas Matomenos walk to her and heal her for the health they have left.
function feederMove(e, dt) {
  const b = e.feeds;
  if (!b || b.dead) { e.dead = true; return; }
  const dx = b.x - e.x, dy = b.y - e.y, d = Math.hypot(dx, dy) || 1;
  if (d < b.r + e.r) {
    b.hp = Math.min(b.maxHp, b.hp + e.hp); e.dead = true;
    burst(b.x, b.y, '#c01a1a', 14);
    chat(`A ${e.d.name} heals ${b.d.name}!`, 'r');
    return;
  }
  e.x += dx / d * e.d.spd * dt; e.y += dy / d * e.d.spd * dt;
}
// Scorpia's guardians stay by her and heal her every 1.8s
function guardianTick(e, dt) {
  const b = e.guardOf;
  if (!b || b.dead) { e.dead = true; return; }
  const dx = b.x + e.ox - e.x, dy = b.y + e.oy - e.y, d = Math.hypot(dx, dy);
  if (d > 4) { e.x += dx / d * Math.min(d, e.d.spd * dt); e.y += dy / d * Math.min(d, e.d.spd * dt); }
  e.healT = (e.healT || 1.8) - dt;
  if (e.healT <= 0) { e.healT = 1.8; b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.012); fx.push({ kind: 'beam', x: e.x, y: e.y - 20, tx: b.x, ty: b.y - 40, t: 0.25, max: 0.25, color: '#5fd34a' }); }
}
// Corp's dark energy core leaps onto you and heals the Corporeal Beast for half the damage it does
function coreTick(e, dt) {
  const b = e.coreOf, p = run.p;
  if (!b || b.dead) { e.dead = true; return; }
  e.leapT = (e.leapT || 1.5) - dt;
  if (e.leapT <= 0) {
    e.leapT = 2.6;
    const tx = p.x, ty = p.y;
    slam(tx, ty, 60, 0.7, b.dmg * 0.7, 'magic', '#4a4aff', '', { noPray: true, heal: 0.5, from: b });
    setTimeout(() => { if (!e.dead) { e.x = tx; e.y = ty; } }, 700);
  }
}
function clueHelpers(e, dt) {
  const id = e.d.id;
  if (id === 'clue_vetion') {
    if (!e.ai.hounds && e.hp < e.maxHp * 0.5) {
      e.ai.hounds = [0, 1].map((i) => { const m = spawnMonster('vetion_hound', e.x + (i ? 120 : -120), e.y + 60); m.hp = m.maxHp = Math.round(e.maxHp * 0.12); m.dmg = e.dmg * 0.6; m.summoned = true; return m; });
      chat("Vet'ion summons his Skeleton Hellhounds! He is immune until they die.", 'r');
    }
    e.immune = !!(e.ai.hounds && e.ai.hounds.some((m) => !m.dead));
  } else if (id === 'clue_scorpia') {
    if (!e.ai.guards && e.hp < e.maxHp) {
      e.ai.guards = true;
      for (const ox of [-90, 90]) { const m = spawnMonster('scorpia_guardian', e.x + ox, e.y); m.hp = m.maxHp = Math.round(e.maxHp * 0.05); m.guardOf = e; m.ox = ox; m.oy = 30; m.summoned = true; }
      chat("Scorpia's guardians appear to heal her! Kill them.", 'r');
    }
  } else if (id === 'clue_corp') {
    e.ai.coreT = (e.ai.coreT ?? 6) - dt;
    if (e.ai.coreT <= 0 && !(e.ai.core && !e.ai.core.dead)) {
      e.ai.coreT = 14;
      const m = spawnMonster('dark_core', e.x, e.y + 60); m.hp = m.maxHp = Math.round(e.maxHp * 0.05); m.coreOf = e; m.summoned = true; e.ai.core = m;
      chat('The Corporeal Beast releases a dark energy core! It heals him as it hurts you.', 'r');
    }
  }
}

// Invocations chosen for this run (INVOCATIONS in data.js)
function inv(id) { return !!(run && run.invo && run.invo[id]); }
function raidLevel(set) { return INVOCATIONS.reduce((a, v) => a + (set[v.id] ? v.lvl : 0), 0); }
function supplyMult(set) { const h = INVOCATIONS.find((v) => v.supply && set[v.id]); return h ? h.supply : 1; }
function invoTempo() { return (inv('oc1') ? 1.15 : 1) * (inv('oc2') ? 1.15 : 1); }
function timeLimit() { const t = INVOCATIONS.find((v) => v.secs && inv(v.id)); return t ? t.secs * (isBoss ? 2 : 1) : 0; }
function specCost(S) { return inv('draining') ? 100 : S.cost; }
// Medic!: scarab swarms as tough as this area's own horde
function medicScarab(pos) {
  const base = MONSTERS[area.hordes[0]];
  const m = spawnMonster('scarab_swarm', pos.x, pos.y);
  m.hp = m.maxHp = Math.round(base.hp * stageScale() * 1.2);
  m.dmg = base.dmg * (1 + 0.03 * run.stage) * 1.2;
  burst(pos.x, pos.y, '#c8a060', 8);
}
// Mixed-style waves: some of the horde fight at range or with magic, so one prayer can't cover the wave.
function mixStyle(m) {
  const style = Math.random() < 0.5 ? 'ranged' : 'magic';
  m.d = { ...m.d, style, caster: style === 'magic' ? MAGIC_BOLT('#4aa0ff') : ARROW('#c8a060') };
  m.castT = 1 + Math.random() * 1.5;
}
// The dark wizards' circle: a perfect ring of them appears around you and casts straight away.
function wizardCircle() {
  const p = run.p, n = 8, rad = SAFE_SPAWN + 30;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = clamp(p.x + Math.cos(a) * rad, 30, WORLD_W - 30), y = clamp(p.y + Math.sin(a) * rad * 0.8, 130, WORLD_H - 20);
    const m = spawnMonster('dark_wizard', x, y);
    m.x = x; m.y = y; m.castT = 0.3 + i * 0.05;
    burst(x, y, '#c040ff', 10);
  }
  chat('A circle of dark wizards surrounds you!', 'r');
  sfx(140, 0.5, 'sawtooth', 0.07);
}
// Insanity: an off-route boss joins a normal wave. It drops a pile of coins instead of a casket.
function spawnInsane() {
  const alive = enemies.map((e) => e.id);
  const pool = CLUE_BOSSES.filter((id) => !alive.includes(id));
  const id = pool[Math.floor(Math.random() * pool.length)];
  const pos = spreadSpawn();
  pos.y = clamp(pos.y, 130 + MONSTERS[id].size, WORLD_H - 40);
  pos.x = clamp(pos.x, 40 + MONSTERS[id].size * 0.4, WORLD_W - 40 - MONSTERS[id].size * 0.4);
  const m = spawnMonster(id, pos.x, pos.y);
  m.insane = true;
  chat(`Insanity! ${m.d.name} tears into the fight!`, 'r');
  burst(pos.x, pos.y, '#ff3a1a', 40);
  sfx(80, 0.6, 'sawtooth', 0.08);
}
// PKers hunt skulled players in the Wilderness
function spawnPker(pos) {
  const pool = PKERS.filter((id) => !(id === 'pk_durial' && run.hero.id === 'durial'));
  const id = pool[Math.floor(Math.random() * pool.length)];
  pos = pos || spreadSpawn();
  const m = spawnMonster(id, pos.x, pos.y);
  m.pkT = 1.2; m.pkN = 0;
  chat(`${m.d.name} is hunting you!`, 'r');
  burst(pos.x, pos.y, '#c01a1a', 14);
}
const PK_STYLES = ['melee', 'ranged', 'magic'];
function pkerAct(e, dt, dist, dx, dy) {
  e.pkT -= dt;
  if (e.pkT > 0) return;
  e.pkT = 1.5 + Math.random() * 0.7;
  e.pkN++;
  const p = run.p;
  // every fourth move up close is a special attack dump
  if (e.pkN % 4 === 0 && dist < 180) {
    slam(p.x, p.y, 75, 0.6, e.dmg * 2.4, 'melee', '#ff3a1a', 'Spec');
    return;
  }
  e.pkStyle = PK_STYLES.filter((x) => x !== e.pkStyle)[Math.floor(Math.random() * 2)];
  if (e.pkStyle === 'melee' || dist > 460) return;
  const sp = e.pkStyle === 'ranged' ? 460 : 340;
  const barrage = e.pkStyle === 'magic' && Math.random() < 0.35;
  eshots.push({ x: e.x, y: e.y - e.d.size * 0.5, vx: dx / dist * sp, vy: (dy + e.d.size * 0.5) / dist * sp, r: 9, dmg: e.dmg, style: e.pkStyle,
    color: e.pkStyle === 'ranged' ? '#c8a060' : barrage ? '#9fe8ff' : '#7a3aff', life: 3, freeze: barrage ? 1.2 : 0 });
}
// Skulled and cheating death: the most valuable thing you wear is lost, like dropping it in the Wilderness.
function loseBestItem() {
  let best = null;
  for (const sl of SLOTS) {
    const id = run.gear[sl];
    if (!id || (sl === 'weapon' && id === run.hero.weapon)) continue;
    if (!best || (ITEMS[id].price || 0) > (ITEMS[best.id].price || 0)) best = { sl, id };
  }
  if (!best) return;
  run.gear[best.sl] = best.sl === 'weapon' ? run.hero.weapon : null;
  gearBarKey = '';
  chat(`You were skulled: you lose your ${ITEMS[best.id].name}!`, 'r');
}
function cheatDeathAllowed() {
  if (inv('hardcore')) return false;
  if (inv('softcore')) return run.livesUsed < 1;
  return true;
}
// Invocation hazards and timers, every frame of a fight
function invoTick(dt) {
  const p = run.p;
  run.stageT += dt;
  if (p.doom > 0) p.doom = Math.max(0, p.doom - dt * 0.4);
  if (inv('hmt') && bossAlive && !bossAlive.dead && bossAlive.d.boss === 'verzik' && (bossAlive.ai.vphase || 1) === 3 && !bossAlive.ai.hmHeal && bossAlive.hp < bossAlive.maxHp * 0.05) {
    bossAlive.ai.hmHeal = true; bossAlive.hp += bossAlive.maxHp * 0.3; chat('Verzik heals herself!', 'r'); burst(bossAlive.x, bossAlive.y, '#c01a1a', 30);
  }
  const T = timeLimit();
  if (T && !run.enraged && run.stageT > T) { run.enraged = true; chat('Time is up! Every enemy enrages: they hit 50% harder and move faster.', 'r'); sfx(70, 0.6, 'sawtooth', 0.08); }
  if (inv('aerial') && !isBoss) {
    run.aerialT -= dt;
    if (run.aerialT <= 0) { run.aerialT = 4.5 + Math.random() * 2.5; slam(p.x, p.y, 70, 1.1, 4 * stageScale(), 'ranged', '#8a6a3a', '', { noPray: true }); }
  }
  if (inv('boulder')) {
    run.boulderT -= dt;
    if (run.boulderT <= 0) {
      run.boulderT = 8 + Math.random() * 3;
      const fromLeft = Math.random() < 0.5;
      telegraphs.push({ line: true, x: fromLeft ? 0 : WORLD_W, y: p.y, a: fromLeft ? 0 : Math.PI, len: WORLD_W, w: 64, t: 1.3, max: 1.3, color: '#a08a6a', dmg: 5 * stageScale(), style: 'melee', label: '' });
    }
  }
  if (inv('penetration') && isBoss && bossAlive && !bossAlive.dead) {
    run.obeliskT -= dt;
    if (run.obeliskT <= 0) {
      run.obeliskT = 12;
      if (run.prayer) { run.prayer = null; updatePrayerButtons(); chat('The obelisk switches off your protection prayer!', 'r'); sfx(200, 0.2, 'square', 0.05); }
    }
  }
}

function ycon(id) { return !!(run && run.contracts && run.contracts[id]); }
function bv(id) { return (run && run.boons[id]) || 0; }
function buffMult(stat) { const b = run.buffs[stat]; return b && b.t > 0 ? 1 + b.amount : 1; }
function maybeDropClue(e) {
  if (e.d.boss || e.d.clue || e.summoned) return;
  const chance = (e.d.elite ? 0.02 : 0.005) * (1 + luckVal());
  if (Math.random() < chance) {
    const tier = Math.min(4, baseClueTier() + (e.d.elite && Math.random() < 0.3 ? 1 : 0));
    pickups.push({ kind: 'clue', tier, x: e.x, y: e.y, t: 0 });
    chat(`${aAn(CLUE_TIERS[tier].name)} ${CLUE_TIERS[tier].name.toLowerCase()} clue scroll drops!`, 'r');
    sfx(980, 0.2, 'triangle', 0.06);
  }
}
// beginner clues in the first areas, then easy, medium, hard and elite as the route goes on
function baseClueTier() { return clamp(Math.floor(areaIndex() / 3), 0, 4); }
const aAn = (w) => (/^[aeiou]/i.test(w) ? 'An' : 'A');
let pendingClue = [];
function startClue(tier = 3) {
  if (mode !== 'play') { pendingClue.push(tier); return; }
  // A random boss from outside the route, never the same one twice in a run.
  let pool = CLUE_BOSSES.filter((id) => !run.clueSeen.includes(id));
  if (!pool.length) { run.clueSeen = []; pool = CLUE_BOSSES.slice(); }
  // Early clues mostly summon low bosses (Obor, Bryophyta, Barrows), later ones the big ones (Nightmare, the DT2 bosses, Sol).
  // clueMult (1.1 to 2.4) ranks them; the target moves up with the area and the clue's tier, with a small chance of a surprise.
  const prog = clamp(areaIndex() / (AREAS.length - 1) * 0.75 + tier / 5 * 0.25, 0, 1);
  const target = 1.1 + 1.3 * prog;
  const bag = pool.map((cid) => ({ cid, wt: 0.03 + Math.exp(-((((MONSTERS[cid].clueMult || 1) - target) / 0.25) ** 2)) }));
  let roll = Math.random() * bag.reduce((x, b) => x + b.wt, 0), pick = bag[bag.length - 1].cid;
  for (const b of bag) { if ((roll -= b.wt) <= 0) { pick = b.cid; break; } }
  const id = pick;
  run.clueSeen.push(id);
  run.clues++;
  meta.clues = (meta.clues || 0) + 1; saveMeta();
  setTimeout(() => achEvent('clue'), 50);
  const pos = spreadSpawn();
  // keep the whole sprite and its health bar on screen
  pos.y = clamp(pos.y, 130 + MONSTERS[id].size, WORLD_H - 40);
  pos.x = clamp(pos.x, 40 + MONSTERS[id].size * 0.4, WORLD_W - 40 - MONSTERS[id].size * 0.4);
  const m = spawnMonster(id, pos.x, pos.y);
  m.clueBoss = true; m.clueTier = tier;
  const T = CLUE_TIERS[tier];
  m.hp = m.maxHp = Math.round(m.maxHp * T.mult); m.dmg *= T.mult;
  chat(`You read the ${T.name.toLowerCase()} clue scroll. ${aAn(m.d.name)} ${m.d.name} appears!`, 'r');
}
function openCasket(pk) {
  mode = 'casket';
  achEvent('casket');
  const choices = [];
  const a = areaIndex(), tier = pk.tier ?? 3, T = CLUE_TIERS[tier];
  // higher tier caskets reach further up the item list and lean rarer; a master casket can hold a mega rare anywhere
  const pool = Object.values(ITEMS).filter((it) => it.slot !== 'food' && !it.start &&
    it.tier <= a + T.casketLift && (it.rarity !== 'mega' || a >= 10 || tier >= 5) && run.gear[it.slot] !== it.id);
  const bag = pool.map((it) => ({ it, wt: rarityWeight(it) * (it.rarity === 'common' ? 0.5 / T.weight : 1.5 * T.weight) }));
  // A Barrows brother's casket always offers one piece of his own set you aren't wearing yet.
  if (pk.barrows) {
    const own = BARROWS_SETS[pk.barrows].pieces.filter((id) => !SLOTS.some((sl) => run.gear[sl] === id));
    if (own.length) { const it = ITEMS[evPick(own)]; choices.push(it); const j = bag.findIndex((b) => b.it === it); if (j >= 0) bag.splice(j, 1); }
  }
  while (choices.length < (tier >= 5 ? 4 : 3) && bag.length) {
    const total = bag.reduce((x, b) => x + b.wt, 0);
    let r = Math.random() * total, i = 0;
    while (i < bag.length - 1 && r > bag[i].wt) { r -= bag[i].wt; i++; }
    choices.push(bag.splice(i, 1)[0].it);
  }
  renderCasket(choices, tier);
}

// ======================================================================
// Combat
// ======================================================================
function nearestEnemy(x, y, maxD) {
  let best = null, bd = maxD;
  for (const e of enemies) {
    if (e.ai.burrow > 0 || e.untargetable) continue;
    const d = Math.hypot(e.x - x, e.y - y) - e.r;
    if (e.eventMob && d > 70) continue; // walk up to the pheasant you want
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function rollDamage(base, target, st) {
  if (Math.random() < 0.1) return { dmg: 0, crit: false };
  let dmg = base * st.dmgMult * (0.65 + Math.random() * 0.35);
  if (st.weapon.tbow) dmg *= 1 + Math.min(1.2, target.d.lvl / 400);
  if (target.d.boss && run.hero.mods && run.hero.mods.bossDmg) dmg *= run.hero.mods.bossDmg;
  const crit = Math.random() < st.crit;
  if (crit) dmg *= 2 + 0.5 * bv('crit');
  if (target.d.boss) dmg *= 1 + 0.25 * bv('giant');
  if (target.d.elite) dmg *= 1 + 0.2 * bv('slayer');
  if (bv('dharok')) dmg *= 1 + 0.5 * bv('dharok') * clamp(1 - run.p.hp / st.maxHp, 0, 1);
  if (barrowsSet() === 'dharok') dmg *= 1 + 0.6 * clamp(1 - run.p.hp / st.maxHp, 0, 1);
  return { dmg: Math.max(1, Math.round(dmg)), crit };
}

function damageEnemy(e, dmg, crit, opts = {}) {
  if (e.dead) return;
  const bset = !opts.venom && dmg > 0 && !e.immune && barrowsSet();
  const proc = bset && bset !== 'dharok' && Math.random() < 0.25 ? bset : null;
  if (proc === 'verac') dmg = Math.round(dmg * 1.25);
  if (e.immune) { dmg = 0; }
  else if (e.mirror && weaponStyle() !== e.mirror && dmg > 0) {
    // Nylocas Vasilias: the wrong style bounces back at you and heals it
    e.hp = Math.min(e.maxHp, e.hp + dmg); hurtPlayer(dmg * 0.5, e.mirror, { pure: true });
    if (!e.ai.mirrorTold) { e.ai.mirrorTold = true; chat('Wrong style! The damage bounces back and heals Nylocas Vasilias.', 'r'); }
    dmg = 0;
  } else if (e.resist && e.resist[weaponStyle()] && proc !== 'verac') dmg = Math.round(dmg * e.resist[weaponStyle()]);
  dmg = creatureDamage(e, dmg);
  // Xarpus: attacking him from the quadrant he stares at brings a poison retaliation
  if (e.d.boss === 'xarpus' && e.ai.stare !== undefined && e.hp < e.maxHp * 0.25 && dmg > 0 && quadOf(run.p.x, run.p.y) === e.ai.stare && (e.ai.ret = e.ai.ret || 0) <= run.stageT) {
    e.ai.ret = run.stageT + 0.6; hurtPlayer(0, 'magic', { pure: true, frac: 0.2, poison: 6 }); burst(run.p.x, run.p.y, '#5fd34a', 12);
  }
  if (e.weakT > 0 && dmg > 0) dmg = Math.round(dmg * (1 + e.weak));
  if (e.capRate && dmg > 0) { dmg = Math.min(dmg, Math.max(1, Math.floor(e.capBank))); e.capBank -= dmg; }
  e.hp -= dmg;
  e.flash = 0.12;
  e.aggro = true;
  splats.push({ x: e.x + (Math.random() - 0.5) * 16, y: e.y - e.d.size * 0.5, v: dmg, crit, t: 0.8, kind: dmg === 0 ? 'miss' : opts.venom ? 'venom' : 'hit' });
  if (opts.freeze && dmg > 0 && !e.d.boss) e.frozen = Math.max(e.frozen, opts.freeze);
  if (bv('barrage') && dmg > 0 && !e.d.boss && !opts.venom && Math.random() < 0.1 * bv('barrage')) e.frozen = Math.max(e.frozen, 1.5);
  if (bv('venom') && dmg > 0 && !opts.venom) { e.venomT = 5; e.venomDps = e.maxHp * (e.d.boss ? 0.02 : 0.1) * bv('venom') / 5; }
  if (opts.knock && !e.d.boss) {
    const a = Math.atan2(e.y - run.p.y, e.x - run.p.x);
    e.kx += Math.cos(a) * opts.knock * 4; e.ky += Math.sin(a) * opts.knock * 4;
  }
  if (proc && dmg > 0) {
    if (proc === 'guthan') { const mx = stats().maxHp, h = Math.min(dmg * 0.5, mx * 0.08); run.p.hp = Math.min(mx, run.p.hp + h); splats.push({ x: run.p.x, y: run.p.y - 80, v: Math.round(h), t: 0.8, kind: 'heal' }); }
    if (proc === 'torag') { e.bslow = 0.6; e.bslowT = 3; }
    if (proc === 'karil') { e.bslow = Math.min(e.bslowT > 0 ? e.bslow : 1, 0.75); e.bslowT = Math.max(e.bslowT || 0, 5); }
    if (proc === 'ahrim') e.drainT = 5;
    fx.push({ kind: 'label', x: e.x, y: e.y - e.d.size * 0.6, t: 0.9, max: 0.9, txt: BARROWS_SETS[proc].effect, color: '#c8a0ff' });
  }
  const leech = (opts.leech || 0) + 0.03 * bv('vamp');
  if (leech && dmg > 0) run.p.hp = Math.min(stats().maxHp, run.p.hp + dmg * leech * PLAYER_LEECH);
  if (bv('execute') && !e.d.boss && !e.clueBoss && e.hp > 0 && e.hp < e.maxHp * 0.12) e.hp = 0;
  if (e.hp <= 0) {
    if (e.d.boss && bossPhaseOnDeath(e)) return;
    killEnemy(e);
  }
}

function killEnemy(e) {
  if (e.dead) return;
  e.dead = true;
  run.kills++;
  if (bv('bones')) run.p.pp = Math.min(stats().maxPp, run.p.pp + bv('bones'));
  run.killsBy[e.id] = (run.killsBy[e.id] || 0) + 1;
  achEvent('kill', e);
  if (e.d.boss && !e.summoned) achEvent('boss', e);
  creatureDeath(e);
  const st = stats();
  const value = Math.max(1, Math.round(e.d.gold * st.goldMult * (0.8 + Math.random() * 0.4) * (e.summoned ? 0.3 : 1)));
  if (e.d.boss) {
    for (let i = 0; i < 14; i++) coins.push({ x: e.x + (Math.random() - 0.5) * 140, y: e.y + (Math.random() - 0.5) * 140, v: Math.ceil(value / 14), t: 0 });
    chat(`You have defeated ${e.d.name}!`, 'r');
    sfx(220, 0.4, 'triangle', 0.08); setTimeout(() => sfx(440, 0.5, 'triangle', 0.08), 200);
    burst(e.x, e.y, '#ffd060', 60);
    // remaining summons collapse with their master
    for (const m of enemies) if (m.summoned && !m.dead && (!m.master || m.master === e)) { m.dead = true; burst(m.x, m.y, '#888', 8); }
  } else if (e.eventMob) {
    const ev = run.ev;
    if (ev && ev.type === 'forester') { const ok = e.tails === ev.want; endEvent(); if (ok) evLamp(2, 'The Freaky Forester takes the pheasant.'); else chat('Freaky Forester: That\'s the wrong pheasant!', 'r'); }
    return;
  } else if (e.insane) {
    for (let i = 0; i < 8; i++) coins.push({ x: e.x + (Math.random() - 0.5) * 120, y: e.y + (Math.random() - 0.5) * 120, v: Math.ceil(value * 1.5), t: 0 });
    chat(`You have defeated ${e.d.name}!`, 'r');
    burst(e.x, e.y, '#ffd060', 30);
    maybeDropPotion(e);
  } else if (e.clueBoss) {
    const tier = e.clueTier ?? 3;
    const bro = e.id.replace('clue_', '');
    pickups.push({ kind: 'casket', tier, x: e.x, y: e.y, t: 0, barrows: BARROWS_SETS[bro] ? bro : null });
    chat(`The ${e.d.name} drops ${aAn(CLUE_TIERS[tier].name).toLowerCase()} ${CLUE_TIERS[tier].name.toLowerCase()} reward casket!`, 'r');
    // on top of the casket: sometimes a clue one tier higher
    if (tier < 5 && Math.random() < CLUE_UPGRADE_CHANCE * (1 + luckVal() * 0.5)) {
      pickups.push({ kind: 'clue', tier: tier + 1, x: e.x + 50, y: e.y, t: 0 });
      chat(`It also drops ${aAn(CLUE_TIERS[tier + 1].name).toLowerCase()} ${CLUE_TIERS[tier + 1].name.toLowerCase()} clue scroll!`, 'r');
      sfx(1200, 0.25, 'triangle', 0.06);
    }
    burst(e.x, e.y, '#ffd060', 30);
  } else {
    if (value > 0) coins.push({ x: e.x, y: e.y, v: value, t: 0 });
    burst(e.x, e.y, '#d8c9a3', 6);
    maybeDropClue(e);
    maybeDropPotion(e);
  }
  if (e.d.explode) burst(e.x, e.y, '#5fd34a', 20);
  if (e.superior) { for (let i = 0; i < 5; i++) coins.push({ x: e.x + (Math.random() - 0.5) * 100, y: e.y + (Math.random() - 0.5) * 100, v: value, t: 0 }); const bag = Object.keys(POTIONS); pickups.push({ kind: 'potion', pot: evPick(bag), x: e.x + 30, y: e.y, t: 0 }); if (Math.random() < 0.2) pickups.push({ kind: 'clue', tier: Math.min(4, baseClueTier() + 1), x: e.x - 30, y: e.y, t: 0 }); }
  if (e.loot) { for (let i = 0; i < 3; i++) coins.push({ x: e.x + (Math.random() - 0.5) * 60, y: e.y + (Math.random() - 0.5) * 60, v: Math.ceil(e.loot * 0.5), t: 0 }); }
  maybeDropArtefact(e);
  maybeDropPet(e);
  if (inv('volatility') && !e.d.boss && !e.d.clue) slam(e.x, e.y, 80, 0.7, e.dmg * 1.5, 'magic', '#ff7a1a', '', { noPray: true });
  if (inv('upset') && !e.d.boss && !e.summoned && Math.random() < 0.2) hazards.push({ x: e.x, y: e.y, r: 45, t: 6, color: '#7ad04a', dps: 4 + areaIndex() * 1.5 });
}

// ---------- Pets (cosmetic only) ----------
const PET_BY_MON = {};
for (const pt of PETS) for (const id of pt.from) PET_BY_MON[id] = pt;
function maybeDropPet(e) {
  const pt = PET_BY_MON[e.id];
  if (!pt || e.summoned) return;
  const rate = pt.thief ? PET_RATE.thief : e.clueBoss ? PET_RATE.clue : PET_RATE.route;
  if (Math.random() >= rate * (1 + luckVal() * 0.5)) return;
  meta.pets = meta.pets || {};
  if (meta.pets[pt.id]) { chat(PET_MSG_DUPE, 'r'); return; }
  meta.pets[pt.id] = Date.now();
  if (!meta.pet) meta.pet = pt.id;
  saveMeta();
  chat(PET_MSG_NEW, 'r');
  chat(`New pet: ${pt.name}!${meta.pet === pt.id ? ' It follows you now.' : ' Equip it from the Pets screen.'}`, 'r');
  sfx(880, 0.3, 'triangle', 0.07); setTimeout(() => sfx(1320, 0.4, 'triangle', 0.07), 180);
  burst(e.x, e.y, '#ff8af0', 40);
}
function updatePet(dt) {
  const pt = meta.pet && PETS.find((x) => x.id === meta.pet);
  if (!pt) { run.pet = null; return; }
  const p = run.p;
  if (!run.pet || run.pet.id !== pt.id) run.pet = { id: pt.id, x: p.x - 50, y: p.y + 10, face: 1 };
  const q = run.pet, dx = p.x - 48 * (Math.cos(p.face || 0) >= 0 ? 1 : -1) - q.x, dy = p.y + 8 - q.y, d = Math.hypot(dx, dy);
  if (d > 600) { q.x = p.x - 50; q.y = p.y + 10; return; }
  if (d > 30) { const v = Math.min(d, (120 + d * 3) * dt); q.x += dx / d * v; q.y += dy / d * v; if (Math.abs(dx) > 4) q.face = dx > 0 ? 1 : -1; }
}
function drawPet() {
  const q = run.pet, pt = q && PETS.find((x) => x.id === q.id);
  if (!pt) return;
  drawShadow(q.x, q.y + 2, 14);
  const im = wikiImage(pt.file);
  if (!ready(im)) return;
  const h = 46, w = Math.min(70, h * im.naturalWidth / im.naturalHeight), hh = w * im.naturalHeight / im.naturalWidth;
  const bob = Math.abs(Math.sin(performance.now() / 160)) * 3;
  ctx.save(); ctx.translate(q.x, q.y - hh - bob); if (q.face < 0) ctx.scale(-1, 1);
  ctx.drawImage(im, -w / 2, 0, w, hh); ctx.restore();
}
function renderPets() {
  if (run && mode !== 'over') return;
  meta.pets = meta.pets || {};
  const own = PETS.filter((pt) => meta.pets[pt.id]).length;
  const s = el('div', 'sheet');
  const head = el('div', 'row');
  head.appendChild(el('h2', '', 'Pets'));
  head.appendChild(el('div', 'purse txt', `${own} of ${PETS.length} found`));
  s.appendChild(head);
  s.appendChild(el('p', '', 'Pets are very rare drops, and each one only comes from its own boss or monster. Tap a pet you own to have it follow you. They are just for show.'));
  const g = el('div', 'grid offers invos'); s.appendChild(g);
  for (const pt of PETS) {
    const has = !!meta.pets[pt.id], on = meta.pet === pt.id;
    const c = el('button', 'card offer invo' + (on ? ' sel' : '') + (has ? '' : ' locked')); c.type = 'button';
    const art = el('div', 'art'); const im = imgTag(pt.file, pt.name); if (!has) im.style.filter = 'brightness(0) opacity(0.45)'; art.appendChild(im); c.appendChild(art);
    c.appendChild(el('div', 'nm', has ? pt.name : '???'));
    c.appendChild(el('div', 'lvl', on ? 'Following you' : has ? 'Tap to equip' : 'Not found yet'));
    c.appendChild(el('div', 'ds', `Drops from: ${pt.src}`));
    c.addEventListener('click', () => {
      if (!has) return;
      meta.pet = on ? null : pt.id; saveMeta();
      sfx(on ? 300 : 620, 0.06, 'triangle', 0.05);
      renderPets();
    });
    g.appendChild(c);
  }
  const r = el('div', 'row'); r.style.marginTop = '14px';
  r.appendChild(btn('Back to heroes', 'btn big', () => { renderTitle(); playMusic(MUSIC_TITLE); }));
  s.appendChild(r);
  $('hud').hidden = true;
  screen.innerHTML = ''; screen.hidden = false; screen.appendChild(s);
}

// ---------- Special attacks ----------
function specialAttack() {
  if (mode !== 'play' || !run) return;
  const p = run.p, st = stats(), w = st.weapon, S = SPECS[run.gear.weapon];
  if (!S) { chat(`Your ${ITEMS[run.gear.weapon].name} has no special attack.`, 'b'); return; }
  if (run.spec < specCost(S)) { chat(`You need ${specCost(S)}% special attack energy for ${S.name}.`, 'b'); return; }
  if (p.frozen > 0) return;
  // a sure hit: specs re-roll a miss once
  const roll = (base, e) => { let r = rollDamage(base, e, st); if (!r.dmg) r = rollDamage(base, e, st); return r; };
  const afterHit = (e, dmg) => {
    if (S.heal && dmg > 0) p.hp = Math.min(st.maxHp, p.hp + dmg * S.heal * PLAYER_LEECH);
    if (S.weaken && !e.dead) { e.weak = S.weaken; e.weakT = 10; }
    if (S.bind && !e.dead && !e.d.boss) e.frozen = Math.max(e.frozen, S.bind);
  };
  if (S.lock) {
    run.buffs.lock = { t: S.lock, amount: 0.5, name: S.name, file: ITEMS[run.gear.weapon].file };
  } else if (w.kind === 'swing') {
    const reach = w.reach * MELEE_REACH * (1 + 0.15 * bv('reach')) * 1.3;
    const target = nearestEnemy(p.x, p.y, (S.aoe || reach) + 10);
    if (!target) { chat('Nothing in reach for a special attack.', 'b'); return; }
    const ang = Math.atan2(target.y - p.y, target.x - p.x);
    p.face = ang; p.anim = { kind: 'swing', ang, t: 0, dur: 0.25, arc: S.arc ? 6.3 : (w.arc || 1.5) };
    fx.push({ kind: 'slash', x: p.x, y: p.y - 30, a: ang, arc: S.arc ? 6.3 : Math.min(w.arc, 6.3), r: S.aoe || reach, t: 0.3, max: 0.3 });
    const victims = S.arc ? enemies.filter((e) => !e.dead && !e.untargetable && !(e.ai.burrow > 0) && Math.hypot(e.x - p.x, e.y - p.y) - e.r < (S.aoe || reach)) : [target];
    victims.forEach((e) => {
      S.hits.forEach((m, i) => {
        const go = () => { if (e.dead) return; const r = roll(w.dmg * m, e); damageEnemy(e, r.dmg, true, { knock: S.knock }); afterHit(e, r.dmg); };
        if (i === 0) go(); else setTimeout(go, i * 110);
      });
    });
    if (S.aoe) for (const e of victims) burst(e.x, e.y - 30, '#9fd8ff', 10);
    if (!S.instant) p.atkT = Math.max(p.atkT, w.cd / st.aspd);
  } else {
    const target = nearestEnemy(p.x, p.y, w.range * st.range * 1.2);
    if (!target) { chat('Nothing in range for a special attack.', 'b'); return; }
    const ang = Math.atan2(target.y - p.y, target.x - p.x);
    p.face = ang; p.anim = { kind: w.kind, ang, t: 0, dur: 0.2, arc: 0 };
    if (w.kind === 'shot') {
      const n = S.arrows || 1;
      for (let i = 0; i < n; i++) {
        const a = ang + (i - (n - 1) / 2) * 0.08;
        shots.push({ kind: 'arrow', x: p.x, y: p.y - 30, vx: Math.cos(a) * w.speed * 1.1, vy: Math.sin(a) * w.speed * 1.1, life: (w.range * st.range * 1.2) / w.speed + 0.2,
          pierce: 1, hit: new Set(), dmg: w.dmg * S.mult, bolt: w.bolt, dart: w.dart, bounce: 0, spec: S });
      }
    } else {
      shots.push({ kind: 'spell', x: p.x, y: p.y - 40, vx: Math.cos(ang) * w.speed, vy: Math.sin(ang) * w.speed, life: (w.range * st.range * 1.2) / w.speed + 0.2,
        pierce: 1, hit: new Set(), dmg: w.dmg * S.mult, splash: (w.splash || 40) * st.splash * 1.4, color: '#ff4ad8', icon: w.icon, bounce: 0, spec: S, big: true });
    }
  }
  run.spec -= specCost(S);
  p.over = { text: `${S.name}!`, t: 1.6 };
  sfx(180, 0.25, 'sawtooth', 0.07); setTimeout(() => sfx(360, 0.2, 'square', 0.05), 80);
  burst(p.x, p.y - 30, '#ffd23a', 16);
  chat(`Special attack: ${S.name}.`, 'g');
  run.specs++; achEvent('spec', run.gear.weapon);
}

// Melee swings reach this much farther than each weapon's listed reach, so melee heroes can hit from a safer distance.
const MELEE_REACH = 1.3;

function playerAttack(dt) {
  const p = run.p, st = stats(), w = st.weapon;
  p.atkT -= dt;
  if (p.eatT > 0) p.eatT -= dt;
  if (p.atkT > 0 || p.frozen > 0 || p.eatT > 0 || run.frogT > 0) return;
  const reachMult = MELEE_REACH * (1 + 0.15 * bv('reach'));
  const reach = w.kind === 'swing' ? w.reach * reachMult : w.range * st.range;
  const target = nearestEnemy(p.x, p.y, reach + (w.kind === 'swing' ? 10 : 0));
  if (!target) return;
  p.atkT = w.cd / st.aspd;
  const ang = Math.atan2(target.y - p.y, target.x - p.x);
  p.face = ang;
  p.anim = { kind: w.kind, ang, t: 0, dur: w.kind === 'swing' ? 0.2 : 0.18, arc: w.arc || 0 };
  if (w.kind === 'swing') {
    fx.push({ kind: 'slash', x: p.x, y: p.y - 30, a: ang, arc: Math.min(w.arc, 6.3), r: w.reach * reachMult, t: 0.2, max: 0.2 });
    sfx(w.arc > 6 ? 120 : 300, 0.06, 'square', 0.03);
    for (const e of [...enemies]) {
      const d = Math.hypot(e.x - p.x, e.y - p.y) - e.r;
      if (d > w.reach * reachMult || e.ai.burrow > 0 || e.untargetable) continue;
      const da = Math.abs(((Math.atan2(e.y - p.y, e.x - p.x) - ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (da > w.arc / 2 && d > 4) continue;
      for (let h = 0; h < (w.hits || 1) + bv('multi'); h++) {
        if (e.dead) break;
        const r = rollDamage(w.dmg * (h > 0 ? 0.6 : 1), e, st);
        damageEnemy(e, r.dmg, r.crit, { knock: w.knock });
        // weapon types: maces stun and weaken, battleaxes cause bleeding
        if (w.wt === 'mace' && !e.dead && r.dmg > 0) { if (!e.d.boss) e.frozen = Math.max(e.frozen, 0.35); e.weak = Math.max(e.weak || 0, 0.15); e.weakT = 3; }
        if (w.wt === 'battleaxe' && !e.dead && r.dmg > 0) { e.bleedT = 3; e.bleedDps = Math.max(e.bleedDps && e.bleedT > 0 ? e.bleedDps : 0, r.dmg * 0.2); }
      }
    }
    // daggers lunge you in toward your target
    if (w.wt === 'dagger') { const d = Math.hypot(target.x - p.x, target.y - p.y) - target.r - p.r; if (d > 4) { const step = Math.min(26, d); p.x += Math.cos(ang) * step; p.y += Math.sin(ang) * step; } }
  } else if (w.kind === 'shot') {
    sfx(700, 0.04, 'triangle', 0.025);
    const ammo = run.gear.ammo ? ITEMS[run.gear.ammo] : null;
    // shortbows loose two arrows on every 4th shot
    const snap = w.wt === 'short' && (run.shortN = (run.shortN || 0) + 1) % 4 === 0;
    const count = w.count + bv('multi') + (snap ? 1 : 0), spread = w.spread || 0.13;
    for (let i = 0; i < count; i++) {
      const a = ang + (i - (count - 1) / 2) * spread;
      shots.push({ kind: 'arrow', x: p.x, y: p.y - 30, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, life: (w.range * st.range) / w.speed + 0.1,
        pierce: w.pierce + st.pierce, hit: new Set(), dmg: w.dmg, bolt: w.bolt, dart: w.dart, bounce: (w.bounce || 0) + bv('chain'), knock: w.knock, food: w.foods ? w.foods[Math.floor(Math.random() * w.foods.length)] : null, spin: Math.random() * 6, icon: ammo && ammo.slot === 'ammo' && ammo.lane === 'ranged' ? ammo.file : null, proc: ammo && ammo.proc, long: w.wt === 'long', ox: p.x, oy: p.y });
    }
  } else {
    sfx(480, 0.09, 'sine', 0.04);
    const count = 1 + bv('multi');
    for (let i = 0; i < count; i++) {
      const a = ang + (i - (count - 1) / 2) * 0.18;
      shots.push({ kind: 'spell', x: p.x, y: p.y - 40, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, life: (w.range * st.range) / w.speed + 0.15,
        pierce: 1, hit: new Set(), dmg: w.dmg, splash: w.splash * st.splash, color: w.color, freeze: w.freeze, leech: w.leech, icon: w.icon, bounce: bv('chain'), knock: w.knock });
    }
  }
}

function specHit(s, e, dmg) {
  const S = s.spec, st = stats();
  if (S.heal && dmg > 0) run.p.hp = Math.min(st.maxHp, run.p.hp + dmg * S.heal * PLAYER_LEECH);
  if (S.weaken && !e.dead) { e.weak = S.weaken; e.weakT = 10; }
  if (S.aoe) {
    fx.push({ kind: 'boom', x: e.x, y: e.y - e.d.size * 0.35, r: S.aoe, color: '#ff8a2a', t: 0.35, max: 0.35 });
    for (const o of [...enemies]) {
      if (o === e || o.dead || o.untargetable || o.ai.burrow > 0) continue;
      if (Math.hypot(o.x - e.x, o.y - e.y) < S.aoe + o.r * 0.5) { const r = rollDamage(s.dmg * 0.6, o, st); damageEnemy(o, r.dmg, r.crit); }
    }
  }
}

// Enchanted bolt effects
function boltProc(kind, e, dmg, st) {
  const P = BOLT_PROCS[kind];
  if (!P || Math.random() >= P.chance) return;
  const p = run.p;
  let extra = 0;
  if (kind === 'ruby') { extra = Math.min(Math.round(e.hp * 0.2), 100 + 25 * run.stage); p.hp = Math.max(1, p.hp - Math.round(p.hp * 0.1)); }
  else if (kind === 'diamond') extra = Math.round(Math.max(dmg, 1) * 0.15 + 4 + run.stage);
  else if (kind === 'onyx') { extra = Math.round(Math.max(dmg, 1) * 0.2 + 3); p.hp = Math.min(st.maxHp, p.hp + (dmg + extra) * 0.25); }
  else if (kind === 'dragonstone') extra = Math.round(run.skills.ranged * 0.2 * (1 + run.stage * 0.08)) + 2;
  if (extra > 0) { damageEnemy(e, extra, true); burst(e.x, e.y - e.d.size * 0.4, kind === 'ruby' ? '#e0103a' : kind === 'onyx' ? '#7a3a8a' : kind === 'diamond' ? '#e8f8ff' : '#ff6a1a', 12); }
}

// Is (x, y) inside a telegraphed attack's area?
function inTelegraph(t, x, y) {
  const dx = x - t.x, dy = y - t.y, d = Math.hypot(dx, dy);
  if (t.inner && d < t.inner) return false;
  if (t.shape === 'ring') return d < t.r && d > t.r * 0.45;
  if (t.shape === 'square') return Math.abs(dx) < t.r && Math.abs(dy) < t.r;
  if (t.shape === 'cross') return (Math.abs(dx) < t.w / 2 && Math.abs(dy) < t.r) || (Math.abs(dy) < t.w / 2 && Math.abs(dx) < t.r);
  if (t.shape === 'cone') {
    const da = Math.abs(((Math.atan2(dy, dx) - t.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    return d < t.r && da < t.spread / 2;
  }
  return d < t.r;
}

// Minion telegraphed moves (MINION_ATK in data.js)
function minionMove(e, dt, dist) {
  const kind = MINION_ATK[e.id];
  if (!kind || e.summoned && e.d.boss) return;
  e.mvT = (e.mvT === undefined ? 1.5 + Math.random() * 2.5 : e.mvT) - dt;
  const reach = { lunge: 280, smash: 110, spit: 400, breath: 280, volley: 420, nova: 200, cross: 360 }[kind];
  if (e.mvT > 0 || dist > reach) return;
  e.mvT = 3.2 + Math.random() * 2.2;
  const p = run.p, a = Math.atan2(p.y - e.y, p.x - e.x), dmg = e.dmg;
  const col = e.d.style === 'magic' ? '#b070ff' : e.d.style === 'ranged' ? '#7fd04a' : '#ff8a3a';
  if (kind === 'lunge') {
    telegraphs.push({ line: true, x: e.x, y: e.y, a, len: 300, w: 46, t: 0.55, max: 0.55, color: '#ffd23a', dmg: dmg * 1.4, style: 'melee', label: '' });
    setTimeout(() => { if (!e.dead && mode === 'play') e.charge = { vx: Math.cos(a) * 760, vy: Math.sin(a) * 760, t: 0.38, spd: 0 }; }, 550);
  } else if (kind === 'smash') slam(e.x, e.y - 10, 85, 0.7, dmg * 1.6, 'melee', '#c8a060', '', { shape: 'square' });
  else if (kind === 'spit') {
    slam(p.x, p.y, 58, 1.0, dmg * 1.3, e.d.style === 'melee' ? 'ranged' : e.d.style, '#7fd04a', '', { fx: e.d.onHit });
    eshots.push({ x: e.x, y: e.y - e.d.size * 0.5, vx: (p.x - e.x) / 1.0, vy: (p.y - e.y) / 1.0, r: 7, dmg: 0, style: 'ranged', color: '#7fd04a', life: 1, shape: 'blob', harmless: true });
  } else if (kind === 'breath') slam(e.x, e.y - 20, 280, 0.75, dmg * 1.5, 'magic', '#ff6a1a', '', { shape: 'cone', a, spread: 0.75, fx: { dragonfire: true } });
  else if (kind === 'volley') { for (let i = -1; i <= 1; i++) aimShot(e, 430, e.d.style === 'melee' ? 'ranged' : e.d.style, col, dmg, { r: 8, shape: e.d.style === 'magic' ? 'orb' : 'arrow' }, i * 0.2); }
  else if (kind === 'nova') slam(e.x, e.y - 10, 190, 0.9, dmg * 1.4, e.d.style === 'melee' ? 'magic' : e.d.style, '#9fd8ff', '', { shape: 'ring' });
  else if (kind === 'cross') slam(p.x, p.y, 210, 0.9, dmg * 1.4, e.d.style === 'melee' ? 'magic' : e.d.style, col, '', { shape: 'cross', w: 52 });
}

function updateShots(dt) {
  const st = stats();
  for (const s of shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    for (const e of enemies) {
      if (e.dead || s.hit.has(e) || e.ai.burrow > 0 || e.untargetable) continue;
      if (Math.hypot(e.x - s.x, (e.y - e.d.size * 0.35) - s.y) < e.r + 10) {
        s.hit.add(e);
        if (s.kind === 'spell') {
          fx.push({ kind: 'boom', x: s.x, y: s.y, r: s.splash, color: s.color, t: 0.3, max: 0.3 });
          for (const o of [...enemies]) {
            if (o.dead || o.ai.burrow > 0 || o.untargetable) continue;
            if (Math.hypot(o.x - s.x, (o.y - o.d.size * 0.35) - s.y) < s.splash + o.r * 0.5) {
              const r = rollDamage(o === e ? s.dmg : s.dmg * 0.6, o, st);
              damageEnemy(o, r.dmg, r.crit, { freeze: s.freeze, leech: s.leech, knock: s.knock });
              if (s.spec && o === e) specHit(s, o, r.dmg);
            }
          }
          // Ricochet: the spell leaps on to another enemy
          const next = s.bounce > 0 && enemies.find((o) => !o.dead && !s.hit.has(o) && Math.hypot(o.x - e.x, o.y - e.y) < 260);
          if (next) { s.bounce--; const a = Math.atan2(next.y - s.y, next.x - s.x), sp = Math.hypot(s.vx, s.vy); s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp; s.life = 0.7; break; }
          s.life = 0;
        } else {
          // longbows hit harder the further the arrow has flown (up to +60%)
          const sd = s.long ? s.dmg * (1 + Math.min(0.6, Math.hypot(s.x - s.ox, s.y - s.oy) / 700)) : s.dmg;
          let r = rollDamage(sd, e, st);
          if (s.spec && !r.dmg) r = rollDamage(sd, e, st);
          damageEnemy(e, r.dmg, r.crit || !!s.spec, { knock: s.knock });
          if (s.spec) specHit(s, e, r.dmg);
          if (s.proc && !e.dead) boltProc(s.proc, e, r.dmg, st);
          if (s.bounce > 0) {
            // Venator bow: the arrow bounces to the next nearby enemy
            const next = enemies.find((o) => !o.dead && !s.hit.has(o) && Math.hypot(o.x - e.x, o.y - e.y) < 220);
            if (next) { s.bounce--; const a = Math.atan2(next.y - s.y, next.x - s.x), sp = Math.hypot(s.vx, s.vy); s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp; s.life = 0.6; continue; }
          }
          s.pierce--;
          if (s.pierce <= 0) s.life = 0;
        }
        if (s.life <= 0) break;
      }
    }
  }
  shots = shots.filter((s) => s.life > 0 && s.x > -50 && s.x < WORLD_W + 50 && s.y > -50 && s.y < WORLD_H + 50);
}

function hurtPlayer(raw, style, opts = {}) {
  raw = creatureHurtMods(raw, style, opts);
  const p = run.p, st = stats();
  // frac: a share of max hitpoints (fracCur: of current hitpoints), for the big skill-check hits
  const fixed = opts.frac || opts.fracCur;
  let dmg = opts.frac ? st.maxHp * opts.frac : opts.fracCur ? p.hp * opts.fracCur : raw * st.taken * (opts.pure ? 1 : 1 - st.reduce);
  if (style === 'magic' && (run.hero.mods || {}).magicTaken) dmg *= run.hero.mods.magicTaken;
  if (run.buffs.lock && run.buffs.lock.t > 0) dmg *= 0.5;
  // OSRS protection prayers block all damage of their style (Quiet Prayers: 80%)
  if (run.prayer && run.prayer === style && !opts.pure && !opts.noPray) dmg *= inv('quiet') ? 0.2 : 0;
  if (run.enraged && !opts.pure) dmg *= 1.5;
  dmg = Math.round(dmg * (fixed ? 1 : 0.6 + Math.random() * 0.4));
  p.hp -= dmg;
  p.hurtT = 0.15;
  splats.push({ x: p.x + (Math.random() - 0.5) * 14, y: p.y - 70, v: dmg, t: 0.8, kind: dmg === 0 ? 'miss' : 'hit' });
  if (dmg > 0) { sfx(130, 0.08, 'sawtooth', 0.04); if (isBoss) run.bossHurt = true; } else if (dmg === 0) achEvent('zero');
  if (opts.freeze) p.frozen = Math.max(p.frozen, opts.freeze);
  if (opts.poison && !(run.hero.mods || {}).poisonImmune) p.poison = Math.max(p.poison, opts.poison);
  if (opts.drain) p.pp = Math.max(0, p.pp - opts.drain);
  if (inv('deadly') && dmg > 0) p.pp = Math.max(0, p.pp - dmg * 0.2);
  if (inv('blasphemy') && !opts.pure) p.pp = Math.max(0, p.pp - raw * 0.15);
  if (inv('doom') && dmg > 0) {
    p.doom = (p.doom || 0) + 1;
    if (p.doom >= 12) { p.doom = 0; p.hp -= Math.round(stats().maxHp * 0.5); chat('Doom! Your stacks burst.', 'r'); burst(p.x, p.y - 30, '#8a1aff', 30); }
  }
  if (inv('arterial') && opts.from && !opts.from.dead && dmg > 0) opts.from.hp = Math.min(opts.from.maxHp, opts.from.hp + dmg);
  if (bv('thorns') && opts.from && !opts.from.dead && dmg > 0) damageEnemy(opts.from, Math.round(dmg * 0.5 * bv('thorns')), false);
  if (bv('veng') && dmg > 0 && !(run.vengT > 0)) {
    const t = opts.from && !opts.from.dead ? opts.from : nearestEnemy(p.x, p.y, 700);
    if (t) { run.vengT = 20; p.over = { text: 'Taste vengeance!', t: 1.6 }; damageEnemy(t, Math.round(dmg * 0.75 * bv('veng')), false); }
  }
  if (bv('phoenix') && !run.phoenixUsed && p.hp > 0 && p.hp < st.maxHp * 0.2) {
    run.phoenixUsed = true; p.hp = Math.min(st.maxHp, p.hp + Math.round(st.maxHp * 0.3));
    chat('Your phoenix necklace heals you, but is destroyed in the process.', 'g'); burst(p.x, p.y, '#ff8a2a', 20);
  }
  if (opts.heal && opts.from) opts.from.hp = Math.min(opts.from.maxHp, opts.from.hp + dmg * opts.heal);
  if (p.hp <= 0 && run.lives > 0 && cheatDeathAllowed()) {
    run.lives--; run.livesUsed++;
    if (run.skull) loseBestItem();
    p.hp = Math.round(stats().maxHp / 2);
    chat(`${run.hero.name} cheats death!`, 'r'); burst(p.x, p.y, '#ffd060', 30);
    achEvent('revive');
  }
  if (p.hp <= 0) die();
}

function updateEnemies(dt) {
  const p = run.p;
  if (dt > 0) {
    const ivx = (p.x - (p.lx ?? p.x)) / dt, ivy = (p.y - (p.ly ?? p.y)) / dt;
    p.vx = (p.vx || 0) * 0.85 + ivx * 0.15; p.vy = (p.vy || 0) * 0.85 + ivy * 0.15;
    p.lx = p.x; p.ly = p.y;
  }
  for (const e of enemies) {
    if (e.dead) continue;
    e.flash = Math.max(0, e.flash - dt);
    e.hitCd = Math.max(0, e.hitCd - dt);
    if (e.weakT > 0) e.weakT -= dt;
    if (e.capRate) e.capBank = Math.min(e.capRate * 2, e.capBank + e.capRate * dt);
    if (e.over) { e.over.t -= dt; if (e.over.t <= 0) e.over = null; }
    e.x += e.kx * dt; e.y += e.ky * dt; e.kx *= 0.85; e.ky *= 0.85;
    if (e.bleedT > 0) {
      e.bleedT -= dt; e.bleedTick = (e.bleedTick || 0.5) - dt;
      if (e.bleedTick <= 0) { e.bleedTick = 0.5; if (!e.immune) damageEnemy(e, Math.max(1, Math.round(e.bleedDps * 0.5)), false, { venom: true }); if (e.dead) continue; }
    }
    if (e.venomT > 0) {
      e.venomT -= dt; e.venomTick = (e.venomTick || 1) - dt;
      if (e.venomTick <= 0) { e.venomTick = 1; if (!e.immune) damageEnemy(e, Math.max(1, Math.round(e.venomDps)), false, { venom: true }); if (e.dead) continue; }
    }
    if (e.bslowT > 0) e.bslowT -= dt;
    if (e.drainT > 0) e.drainT -= dt;
    if (e.frozen > 0) { e.frozen -= dt; continue; }
    if (e.eventMob) { e.wt = (e.wt || 0) - dt; if (e.wt <= 0) { e.wt = 1.5; e.wa = Math.random() * 7; } e.x += Math.cos(e.wa) * e.d.spd * dt; e.y += Math.sin(e.wa) * e.d.spd * dt; continue; }
    if (e.feeds) { feederMove(e, dt); continue; }
    if (e.guardOf) { guardianTick(e, dt); continue; }
    if (e.coreOf) { coreTick(e, dt); continue; }
    if (THIEVES.has(e.id) && thiefMove(e, dt)) continue;
    if (e.d.boss) bossAI(e, dt);
    if (e.dead || e.ai.burrow > 0) continue;
    if (e.d.clue) clueHelpers(e, dt);
    if (e.d.clue) { // clue bosses: a telegraphed special on top of their normal attack
      e.ai.t -= dt;
      if (e.ai.t <= 0) { e.ai.t = (3.2 + Math.random()) / (BOSS_TEMPO * invoTempo()); clueSpecial(e); }
    }
    if (!e.d.boss && !e.d.clue) creatureTick(e, dt);
    if (e.dead || e.ai.burrow > 0) continue;
    if (e.d.spd === 0 && !e.d.caster) continue; // stationary bosses

    const healT = e.healer && !e.aggro ? (e.healFor && !e.healFor.dead ? e.healFor : bossAlive && !bossAlive.dead ? bossAlive : null) : null;
    const tgt = healT || p;
    let dx = tgt.x - e.x, dy = tgt.y - e.y, dist = Math.hypot(dx, dy) || 1;
    const realDist = dist;
    if (e.lead && tgt === p && dist > 90 && e.d.spd) {
      // aim where the player is heading
      const t = Math.min(e.lead, dist / e.d.spd);
      dx = p.x + (p.vx || 0) * t - e.x; dy = p.y + (p.vy || 0) * t - e.y;
      dist = Math.hypot(dx, dy) || 1;
    }
    let want = tgt === p ? 1 : dist > e.r + tgt.r ? 1 : 0;
    if (e.d.caster && !e.d.boss) {
      want = dist > e.d.caster.range ? 1 : dist < e.d.caster.range * 0.7 ? -0.6 : 0;
      e.castT -= dt;
      if (e.castT <= 0 && dist < e.d.caster.range + 80) {
        e.castT = e.d.caster.cd;
        const sp = e.d.caster.speed;
        // Stay Vigilant: archers and casters swap style at random
        const vs = inv('vigilant') && Math.random() < 0.5 ? (e.d.style === 'magic' ? 'ranged' : 'magic') : casterStyle(e);
        eshots.push({ x: e.x, y: e.y - e.d.size * 0.5, vx: dx / dist * sp, vy: (dy + e.d.size * 0.5) / dist * sp, r: 9, dmg: e.dmg, style: vs, color: vs === e.d.style ? e.d.caster.color : vs === 'magic' ? '#4aa0ff' : '#c8a060', life: 3, ...e.d.onHit });
      }
    }
    if (e.d.pker) pkerAct(e, dt, realDist, dx, dy);
    else if (!e.d.boss && !e.d.clue) minionMove(e, dt, realDist);
    const spd = (e.charge ? e.charge.spd : e.d.spd) * (e.slow || 1) * (e.bslowT > 0 ? e.bslow : 1) * (inv('haste') ? 1.2 : 1) * (run.enraged ? 1.25 : 1);
    if (e.charge) {
      e.x += e.charge.vx * dt; e.y += e.charge.vy * dt; e.charge.t -= dt;
      if (e.charge.t <= 0) e.charge = null;
    } else {
      e.x += dx / dist * spd * want * dt;
      e.y += dy / dist * spd * want * dt;
    }
    if (tgt === p && realDist < e.r + p.r && e.hitCd <= 0) {
      e.hitCd = e.d.boss ? 1.2 : 0.9;
      if (e.d.explode) { hurtPlayer(eDrain(e) * e.dmg, 'melee', { pure: true }); killEnemy(e); continue; }
      hurtPlayer(eDrain(e) * e.dmg * (e.d.closeMult || 1), e.d.style === 'magic' && !e.d.caster ? 'magic' : 'melee', { drain: e.d.drain, heal: e.lifesteal, from: e, noPray: e.d.noPray, ...e.d.onHit });
    }
  }
  // soft separation so hordes don't stack into one sprite
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i];
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = (a.r + b.r) * 0.75;
      if (d > 0 && d < min) {
        const push = (min - d) / 2, nx = dx / d, ny = dy / d;
        const wa = a.d.boss ? 0.05 : 1, wb = b.d.boss ? 0.05 : 1;
        a.x -= nx * push * wa; a.y -= ny * push * wa; b.x += nx * push * wb; b.y += ny * push * wb;
      }
    }
  }
  for (const e of enemies) { e.x = clamp(e.x, 10, WORLD_W - 10); e.y = clamp(e.y, Math.min(WORLD_H - 40, 100 + e.d.size * 0.9), WORLD_H - 10); }
  enemies = enemies.filter((e) => !e.dead);
}

// ======================================================================
// Bosses
// ======================================================================
function aimShot(e, speed, style, color, dmg, extra = {}, spreadA = 0) {
  const p = run.p, sy = e.y - e.d.size * 0.5;
  const a = Math.atan2(p.y - 30 - sy, p.x - e.x) + spreadA;
  eshots.push({ x: e.x, y: sy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: extra.r || 12, dmg, style, color, life: 4, ...extra });
}
function fan(e, n, step, speed, style, color, dmg, extra) {
  for (let i = 0; i < n; i++) aimShot(e, speed, style, color, dmg, extra, (i - (n - 1) / 2) * step);
}
function slam(x, y, r, delay, dmg, style, color, label, extra) {
  const ex = extra || {};
  telegraphs.push({ x, y, r, t: delay, max: delay, color, dmg, style, label, noPray: !!ex.noPray, heal: ex.heal, from: ex.from, freeze: ex.freeze, frac: ex.frac, fx: ex.fx, inner: ex.inner, shape: ex.shape || 'circle', a: ex.a || 0, spread: ex.spread || 0.6, w: ex.w || 50 });
}
function summon(e, id, n, opts = {}) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const m = spawnMonster(id, clamp(e.x + Math.cos(a) * 140, 40, WORLD_W - 40), clamp(e.y + Math.sin(a) * 140, 120, WORLD_H - 40), opts);
    m.summoned = true; m.master = e;
  }
}
function shout(e, key) {
  const lines = QUOTES[key || e.d.id] || [];
  if (lines.length) say(e, lines[Math.floor(Math.random() * lines.length)]);
}

// Returns true if the boss changes phase instead of dying.
function bossPhaseOnDeath(e) {
  if (bossDeathMech(e)) return true;
  const k = e.d.boss;
  if (k === 'kq' && !e.ai.form2) {
    e.ai.form2 = true; e.hp = e.maxHp; e.resist = { melee: 0.5 };
    chat('The Kalphite Queen transforms into her airborne form!', 'r');
    burst(e.x, e.y, '#c8a060', 40);
    return true;
  }
  if (k === 'verzik' && (e.ai.vphase || 1) < 3) {
    e.ai.vphase = (e.ai.vphase || 1) + 1; e.hp = e.maxHp * 0.6; e.maxHp = e.hp;
    chat(`Verzik Vitur enters phase ${e.ai.vphase}!`, 'r');
    shout(e);
    burst(e.x, e.y, '#a01a2a', 50);
    return true;
  }
  return false;
}

// Clue boss specials, by the mechanic each boss is known for on the wiki.
function clueSpecial(e) {
  const p = run.p, m = e.d.mech || 'slam', dmg = e.dmg;
  const np = { noPray: true };
  if (m === 'bombs') {
    const shapes = ['circle', 'square', 'cross'], sh = shapes[(e.ai.bombN = (e.ai.bombN || 0) + 1) % 3];
    for (let i = 0; i < 5; i++) slam(p.x + (i ? (Math.random() - 0.5) * 300 : 0), p.y + (i ? (Math.random() - 0.5) * 240 : 0), sh === 'cross' ? 110 : 60, 1.0 + i * 0.15, dmg * 1.4, e.d.style, '#ff981f', i ? '' : 'Special!', { shape: sh, w: 40 });
  } else if (m === 'volley') {
    fan(e, 7, 0.14, 420, e.d.style === 'melee' ? 'ranged' : e.d.style, (e.d.caster && e.d.caster.color) || '#ff981f', dmg);
  } else if (m === 'summon') {
    summon(e, e.d.summons || 'lesser_demon', 2);
    if (e.d.id === 'clue_cerberus') { summon(e, 'spiritual_ranger', 1); summon(e, 'spiritual_mage', 1); }
    say(e, 'Rise!');
  } else if (m === 'bind') {
    slam(p.x, p.y, 70, 0.9, dmg * 1.2, e.d.style, '#5fd34a', 'Bind!');
    setTimeout(() => { if (!e.dead && run && Math.hypot(p.x - e.x, p.y - e.y) < 900) { p.frozen = Math.max(p.frozen, 1.2); chat(`${e.d.name} binds you in place!`, 'r'); } }, 900);
    if (e.d.summons) summon(e, e.d.summons, 2);
  } else if (m === 'pierce') {
    slam(p.x, p.y, 85, 1.0, dmg * 2, e.d.style, '#ff3a1a', 'Prayer won\'t help!', np);
  } else if (m === 'drain') {
    fan(e, 5, 0.18, 400, e.d.style === 'melee' ? 'magic' : e.d.style, '#5fd34a', dmg, { drain: 6 });
    if (e.d.caster == null) slam(p.x, p.y, 75, 1.0, dmg * 1.5, e.d.style, '#5fd34a', 'Special!');
  } else if (m === 'leech') {
    // Guthan's set effect: he heals by the damage this hit deals you, so dodge it or pray
    slam(p.x, p.y, 75, 1.0, dmg * 1.6, e.d.style, '#c01a1a', 'Infest!', { heal: 1, from: e });
  } else if (m === 'rage') {
    const missing = 1 - e.hp / e.maxHp;
    slam(p.x, p.y, 80, 1.0, dmg * (1.4 + 2.5 * missing), e.d.style, '#c01a1a', 'Special!');
  } else if (m === 'fast') {
    for (let i = 0; i < 3; i++) setTimeout(() => { if (!e.dead && run) slam(p.x, p.y, 65, 0.6, dmg * 1.1, e.d.style, '#ffd23a', i ? '' : 'Special!'); }, i * 350);
  } else if (m === 'gaze') {
    // a huge unblockable hit: get out of the circle
    slam(p.x, p.y, 140, 1.6, dmg * 3.2, e.d.style, '#a0ff3a', 'Gaze! Move!', np);
  } else {
    slam(p.x, p.y, 75, 1.1, dmg * 1.6, e.d.style, '#ff981f', 'Special!');
  }
}

// Share of a boss's hitpoints left across all its phases (Kalphite Queen has two forms, Verzik three phases).
function totalHpFrac(e) {
  const k = e.d.boss, h = Math.max(0, e.hp);
  if (k === 'kq') return e.ai.form2 ? h / e.maxHp / 2 : 0.5 + h / e.maxHp / 2;
  if (k === 'verzik') {
    const vp = e.ai.vphase || 1, base = e.ai.vBase || (e.ai.vBase = e.maxHp), total = base * 1.96;
    const later = vp === 1 ? base * 0.96 : vp === 2 ? e.maxHp * 0.6 : 0;
    return (h + later) / total;
  }
  return h / e.maxHp;
}

function bossAI(e, dt) {
  const p = run.p, k = e.d.boss;
  const hpf = e.hp / e.maxHp;
  // bosses act faster than their base pattern, and faster still below half health
  if (totalHpFrac(e) < ENRAGE_AT && !e.ai.enraged) { e.ai.enraged = true; chat(`${e.d.name} is enraged!`, 'r'); burst(e.x, e.y, '#ff3a1a', 30); }
  e.ai.t -= dt * BOSS_TEMPO * invoTempo() * (e.ai.enraged ? 1.3 : 1);
  if (bossMech(e, dt)) { /* creatures.js */ } else if (k === 'cow') {
    // Cow Boss: charges across the field and calls the herd
    if (e.ai.t <= 0) {
      e.ai.t = 3.4;
      if (Math.random() < 0.6) {
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        telegraphs.push({ line: true, x: e.x, y: e.y, a, len: 520, w: 70, t: 0.8, max: 0.8, color: '#ffffff', dmg: e.dmg * 2, style: 'melee', label: 'Moo!' });
        setTimeout(() => { if (!e.dead) e.charge = { vx: Math.cos(a) * 650, vy: Math.sin(a) * 650, t: 0.8, spd: 0 }; }, 800);
      } else { summon(e, 'cow', 3); shout(e); }
    }
  } else if (k === 'count') {
    // Count Draynor: drains your blood and turns into bats
    e.lifesteal = 1;
    if (e.ai.t <= 0) {
      e.ai.t = 5;
      summon(e, 'giant_bat', 2 + Math.floor(areaIndex() / 2));
      burst(e.x, e.y, '#3a0000', 20);
      const a = Math.random() * Math.PI * 2;
      e.x = clamp(p.x + Math.cos(a) * 200, 60, WORLD_W - 60); e.y = clamp(p.y + Math.sin(a) * 200, 140, WORLD_H - 60);
      burst(e.x, e.y, '#3a0000', 20);
      shout(e);
    }
  } else if (k === 'delrith') {
    if (e.ai.t <= 0) {
      e.ai.t = 2.6;
      if (e.ai.phase++ % 3 === 2) { summon(e, 'dark_wizard', 2); shout(e); }
      else fan(e, 5, 0.18, 300, 'magic', '#ff4a1a', e.dmg);
    }
  } else if (k === 'scurrius') {
    // Scurrius: tail swipe, lightning, fur balls, falling bricks, giant rats
    if (e.ai.t <= 0) {
      e.ai.t = 2.4;
      const r = e.ai.phase++ % 4;
      if (r === 0) { for (let i = 0; i < 4; i++) slam(p.x + (Math.random() - 0.5) * 260, p.y + (Math.random() - 0.5) * 200, 70, 1.2, 22, 'melee', '#a08060', 'Bricks!'); }
      else if (r === 1) fan(e, 3, 0.2, 340, 'magic', '#6aa0ff', 8 * 1.6);
      else if (r === 2) fan(e, 3, 0.2, 340, 'ranged', '#8a6a3c', 7 * 1.6);
      else { summon(e, 'giant_rat', 4); chat('Scurrius calls for help!', 'r'); }
    }
  } else if (k === 'mole') {
    if (e.ai.burrow > 0) {
      e.ai.burrow -= dt;
      e.untargetable = true;
      if (e.ai.burrow <= 0) { e.untargetable = false; e.x = e.ai.next.x; e.y = e.ai.next.y; burst(e.x, e.y, '#8a6a3c', 30); sfx(80, 0.3, 'sawtooth', 0.06); }
    } else if (e.ai.t <= 0) {
      e.ai.t = 6.5;
      e.ai.burrow = 1.6;
      e.ai.next = { x: clamp(p.x + (Math.random() - 0.5) * 300, 80, WORLD_W - 80), y: clamp(p.y + (Math.random() - 0.5) * 300, 140, WORLD_H - 80) };
      slam(e.ai.next.x, e.ai.next.y, 110, 1.6, e.dmg * 1.4, 'melee', '#c8a060', 'Dig!');
      burst(e.x, e.y, '#8a6a3c', 30);
      chat('The Giant Mole burrows underground.', 'r');
    }
  } else if (k === 'dragon' && e.id === 'elvarg') {
    // Elvarg: rotates a wide dragonfire cone, a fast aimed fire stream, and scorched ground under you. Enrages at half hp.
    const rage = e.hp < e.maxHp * 0.5;
    if (rage && !e.ai.rage) { e.ai.rage = 1; chat('Elvarg roars in fury!', 'r'); shout(e); }
    if (e.ai.stream > 0 && (e.ai.st -= dt) <= 0) {
      e.ai.stream--; e.ai.st = 0.12;
      aimShot(e, 560, 'magic', '#ff6a1a', e.dmg * 0.55, { r: 12 });
    }
    if (e.ai.t <= 0) {
      e.ai.t = rage ? 1.6 : 2.2;
      const r = e.ai.phase++ % 3;
      if (r === 0) {
        fan(e, rage ? 13 : 11, 0.11, 430, 'magic', '#ff6a1a', e.dmg);
        if (e.ai.phase === 1) chat('Elvarg breathes dragonfire! Protect from Magic helps.', 'r');
      } else if (r === 1) { e.ai.stream = rage ? 9 : 6; e.ai.st = 0; }
      else {
        const n = rage ? 5 : 3;
        for (let i = 0; i < n; i++) slam(p.x + (i ? (Math.random() - 0.5) * 220 : 0), p.y + (i ? (Math.random() - 0.5) * 180 : 0), 75, 0.9, 0, 'magic', '#ff4a1a', i ? '' : 'Scorch!', { frac: rage ? 0.3 : 0.25 });
      }
      sfx(70, 0.4, 'sawtooth', 0.06);
    }
  } else if (k === 'dragon' || k === 'kbd') {
    if (e.ai.t <= 0) {
      e.ai.t = k === 'kbd' ? 2.5 : 3.0;
      const breaths = k === 'kbd' ? ['fire', 'poison', 'ice', 'shock'] : ['fire'];
      const kind = breaths[e.ai.phase++ % breaths.length];
      const color = { fire: '#ff6a1a', poison: '#5fd34a', ice: '#9fe8ff', shock: '#e0e0ff' }[kind];
      fan(e, k === 'kbd' ? 9 : 7, 0.13, 360, 'magic', color, e.dmg * 0.75, { freeze: kind === 'ice' ? 1.1 : 0, poison: kind === 'poison' ? 5 : 0, drain: kind === 'shock' ? 4 : 0 });
      sfx(70, 0.4, 'sawtooth', 0.06);
      if (e.ai.phase === 1) chat(`${e.d.name} breathes ${kind === 'fire' ? 'dragonfire' : kind + ' breath'}! Protect from Magic helps.`, 'r');
    }
  } else if (k === 'kq') {
    // Kalphite Queen: her spines and lightning go straight through protection prayers, and she hits hard.
    if (!e.ai.form2) e.resist = { magic: 0.5, ranged: 0.5 };
    const np = { noPray: true };
    if (e.ai.t <= 0) {
      e.ai.t = e.ai.form2 ? 1.7 : 2.1;
      const r = e.ai.phase++ % 4;
      if (r === 0 && e.ai.phase === 1) chat('The Kalphite Queen\'s attacks ignore protection prayers!', 'r');
      if (r === 3) { summon(e, e.ai.form2 ? 'kalphite_soldier' : 'kalphite_worker', 3); slam(p.x, p.y, 90, 1.0, 0, 'melee', '#c8a060', 'Acid!', { noPray: true, frac: 0.35 }); }
      else if (e.ai.form2) fan(e, r === 1 ? 9 : 7, 0.14, 440, 'magic', '#c8a0ff', e.dmg, np);
      else fan(e, r === 1 ? 7 : 5, 0.13, 480, 'ranged', '#c8a060', e.dmg, { drain: 3, noPray: true });
      sfx(90, 0.25, 'square', 0.05);
    }
  } else if (k === 'graardor') {
    // General Graardor (wiki): fights with his three sergeants. In melee range he punches hard (2/3) or slams the
    // ground (1/3), a ranged hit that reaches you anywhere in the room. Out of range he charges you down.
    if (!e.ai.guards) {
      e.ai.guards = true; e.ai.t = 1.5;
      for (const [id, ox] of [['sergeant_strongstack', -150], ['sergeant_steelwill', 150], ['sergeant_grimspike', 0]]) {
        const m = spawnMonster(id, clamp(e.x + ox, 60, WORLD_W - 60), clamp(e.y + (ox ? 40 : -60), 130, WORLD_H - 60));
        m.summoned = true;
      }
      chat('General Graardor and his sergeants: Strongstack (melee), Steelwill (magic) and Grimspike (ranged).', 'r');
    }
    const d = Math.hypot(p.x - e.x, p.y - e.y), reach = e.r + p.r + 40;
    if (!e.charge && d > 380 && (e.ai.ct = (e.ai.ct || 0) - dt) <= 0) {
      e.ai.ct = 4;
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      say(e, 'CHAAARGE!');
      e.charge = { vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, t: 0.6, spd: 0 };
    }
    if (e.ai.t <= 0 && d < reach) {
      e.ai.t = 2.2;
      if (Math.random() < 1 / 3) {
        // ground slam: hits wherever you stand; only Protect from Missiles helps
        burst(e.x, e.y, '#c8a060', 40);
        for (let i = 0; i < 6; i++) burst(e.x + (Math.random() - 0.5) * 500, e.y + (Math.random() - 0.5) * 400, '#8a6a3c', 10);
        sfx(55, 0.5, 'sawtooth', 0.08);
        hurtPlayer(0, 'ranged', { frac: 0.3 });
        if (e.ai.phase++ === 0) chat('Graardor slams the ground! It hits the whole room. Protect from Missiles.', 'r');
      } else {
        hurtPlayer(eDrain(e) * e.dmg * 2.0, 'melee', { from: e });
        burst(p.x, p.y - 20, '#ff4a1a', 12);
      }
      shout(e);
    }
  } else if (k === 'zulrah') {
    // Zulrah: rotates forms. Serpentine = ranged, magma = melee slams, tanzanite = magic. Leaves venom clouds.
    const form = ZULRAH_FORMS[e.ai.form || 0];
    e.formFile = form.file;
    if (e.ai.t <= 0) {
      e.ai.shots = (e.ai.shots || 0) + 1;
      e.ai.t = form.style === 'melee' ? 2.6 : 1.4;
      if (form.style === 'melee') slam(p.x, p.y, 90, 1.1, 0, 'melee', form.color, 'Magma!', { frac: 0.6, freeze: 1 });
      else aimShot(e, 520, form.style, form.color, e.dmg, { r: 14 });
      if (e.ai.shots % 3 === 0) hazards.push({ x: clamp(p.x + (Math.random() - 0.5) * 200, 40, WORLD_W - 40), y: clamp(p.y + (Math.random() - 0.5) * 160, 120, WORLD_H - 40), r: 60, t: 8, color: '#5fd34a', dps: 6, poison: 4 });
      if (e.ai.shots >= 6) {
        e.ai.shots = 0; e.ai.form = ((e.ai.form || 0) + 1) % 3;
        const nf = ZULRAH_FORMS[e.ai.form];
        burst(e.x, e.y, nf.color, 30);
        summon(e, 'snakeling', 2);
        e.x = clamp(WORLD_W / 2 + (Math.random() - 0.5) * 700, 150, WORLD_W - 150);
        chat(`Zulrah dives and resurfaces in its ${nf.name} form. Pray ${nf.style === 'melee' ? 'Melee (1)' : nf.style === 'ranged' ? 'Missiles (2)' : 'Magic (3)'}!`, 'r');
      }
    }
  } else if (k === 'jad') {
    if (!e.ai.windup && e.ai.t <= 0 && !enemies.some((o) => o !== e && !o.dead && o.ai.windup && o.ai.windup.t > 0.2)) {
      e.ai.windup = { style: Math.random() < 0.5 ? 'magic' : 'ranged', t: Math.max(0.9, 1.5 - (1 - hpf) * 0.5) };
      sfx(e.ai.windup.style === 'magic' ? 200 : 600, 0.2, 'triangle', 0.06);
    }
    if (e.ai.windup) {
      e.ai.windup.t -= dt;
      if (e.ai.windup.t <= 0) {
        const style = e.ai.windup.style;
        e.ai.windup = null; e.ai.t = 1.6;
        // like the real Jad: the right prayer blocks it all, the wrong one nearly kills you
        aimShot(e, 700, style, style === 'magic' ? '#ff5a1a' : '#e8c060', 0, { r: 16, homing: true, frac: 0.95 });
      }
    }
    if (!e.ai.healers && hpf < 0.5) {
      e.ai.healers = true;
      chat('Yt-HurKot healers appear! Hit them to pull them off Jad.', 'r');
      for (let i = 0; i < (e.raidBoss ? 3 : 4); i++) { const sp = edgeSpawn(); const m = spawnMonster('yt_hurkot', sp.x, sp.y); m.healer = true; m.summoned = true; m.master = e; m.healFor = e; }
    }
  } else if (k === 'vorkath') {
    if (e.ai.spawn && !e.ai.spawn.dead) { e.immune = true; return; }
    e.immune = false;
    if (e.ai.t <= 0) {
      e.ai.t = 2.4;
      const r = e.ai.phase++ % 6;
      if (r === 2) {
        // acid phase: pools everywhere and a rapid fireball stream
        for (let i = 0; i < 14; i++) hazards.push({ x: 60 + Math.random() * (WORLD_W - 120), y: 140 + Math.random() * (WORLD_H - 180), r: 40, t: 7, color: '#7ad04a', dps: 20, heal: 3, from: e });
        for (let i = 0; i < 6; i++) setTimeout(() => { if (!e.dead && mode === 'play') aimShot(e, 600, 'magic', '#ff6a1a', 16, { pure: true }); }, i * 450);
        if (!e.ai.acidTold) { e.ai.acidTold = true; chat('Vorkath spews acid! Stepping in it heals him. Walk between the pools.', 'r'); }
      } else if (r === 5) {
        p.frozen = 2.5;
        e.ai.spawn = spawnMonster('zombified_spawn', e.x, e.y + 60);
        e.ai.spawn.summoned = true;
        chat('Vorkath freezes you and sends a zombified spawn! Kill it before it reaches you.', 'r');
      } else if (r === 4) {
        slam(p.x, p.y, 70, 1.5, 0, 'magic', '#ff3a1a', 'Firebomb! Move!', { noPray: true, frac: 0.9 });
      } else {
        aimShot(e, 500, Math.random() < 0.5 ? 'magic' : 'ranged', '#ff6a1a', e.dmg, { r: 16 });
      }
    }
  } else if (k === 'wardens') {
    if (e.ai.t <= 0) {
      e.ai.t = 2.2;
      const r = e.ai.phase++ % 5;
      if (r === 0) { for (let i = 0; i < 5; i++) slam(60 + Math.random() * (WORLD_W - 120), 140 + Math.random() * (WORLD_H - 180), 90, 1.2, e.dmg, 'magic', '#ffd24a', 'Lightning!'); }
      else if (r === 4) slam(p.x, p.y, 200, 1.3, 0, 'magic', '#ffd24a', 'Warden slam!', { shape: 'cross', w: 100, noPray: true, frac: 0.6 });
      else if (r === 2) { summon(e, 'scarab_swarm', 3); chat('The Warden calls a scarab swarm!', 'r'); }
      else aimShot(e, 520, r === 1 ? 'magic' : 'ranged', r === 1 ? '#4aa0ff' : '#c89a50', e.dmg, { r: 14 });
    }
    e.immune = hpf < 0.5 && (e.ai.phase % 8) < 2; // core retreats briefly in phase two
  } else if (k === 'olm') {
    // Great Olm: sits in the wall, alternates magic and ranged, drops crystals and acid.
    // His claws must be disabled before the head takes damage (again after half health), and the flame wall nearly kills you.
    const spawnClaws = () => {
      e.ai.claws = [['olm_left_claw', -300], ['olm_right_claw', 300]].map(([id, ox]) => { const m = spawnMonster(id, clamp(e.x + ox, 80, WORLD_W - 80), e.y + 30); m.x = clamp(e.x + ox, 80, WORLD_W - 80); m.y = e.y + 30; m.hp = m.maxHp = Math.round(e.maxHp * 0.12); m.summoned = true; return m; });
      chat('Great Olm raises his claws. Disable both before you can hurt his head.', 'r');
    };
    if (!e.ai.claws) spawnClaws();
    if (hpf < 0.5 && !e.ai.claws2) { e.ai.claws2 = true; spawnClaws(); }
    e.immune = e.ai.claws.some((m) => !m.dead);
    if (e.ai.t <= 0) {
      e.ai.t = 1.8;
      const r = e.ai.phase++ % 5;
      if (r === 3 && e.ai.phase % 2 === 0) { telegraphs.push({ line: true, x: 0, y: p.y, a: 0, len: WORLD_W, w: 150, t: 1.8, max: 1.8, color: '#ff5a1a', dmg: 0, frac: 0.55, noPray: true, style: 'magic', label: 'Flame wall! Get out!' }); return; }
      if (r === 2) { for (let i = 0; i < 6; i++) slam(p.x + (Math.random() - 0.5) * 300, p.y + (Math.random() - 0.5) * 240, 55, 1.1, e.dmg * 0.9, 'melee', '#9a7aff', 'Crystal!'); }
      else if (r === 4) hazards.push({ x: p.x, y: p.y, r: 70, t: 6, color: '#5fd34a', dps: 10, poison: 4 });
      else aimShot(e, 560, r % 2 ? 'ranged' : 'magic', r % 2 ? '#7ad04a' : '#6a9aff', e.dmg, { r: 14 });
    }
  } else if (k === 'verzik') {
    const vp = e.ai.vphase || 1;
    // Phase 1: hide behind a pillar from her big blast or it nearly kills you (Protect from Magic halves it)
    if (vp === 1) {
      if (!e.ai.pillars) { e.ai.pillars = [[0.25, 0.42], [0.75, 0.42], [0.25, 0.82], [0.75, 0.82]].map(([fx2, fy]) => ({ x: WORLD_W * fx2, y: WORLD_H * fy })); e.ai.blastT = 6; }
      e.ai.blastT -= dt;
      if (e.ai.blastT <= 0 && !e.ai.blast) { e.ai.blast = 2.2; chat('Verzik charges a huge blast. Hide behind a pillar!', 'r'); sfx(60, 0.6, 'sawtooth', 0.07); }
      if (e.ai.blast > 0) {
        e.ai.blast -= dt;
        if (e.ai.blast <= 0) {
          e.ai.blast = 0; e.ai.blastT = 10;
          const safe = e.ai.pillars.some((pl) => Math.hypot(p.x - pl.x, p.y - pl.y) < 75);
          fx.push({ kind: 'beam', x: e.x, y: e.y - 60, tx: p.x, ty: p.y - 30, t: 0.3, max: 0.3, color: safe ? '#888' : '#a01aff' });
          if (!safe) hurtPlayer(0, 'magic', { pure: true, frac: run.prayer === 'magic' ? 0.42 : 0.85 });
        }
      }
    } else e.ai.pillars = null;
    if (e.ai.t <= 0) {
      e.ai.t = vp === 1 ? 2.2 : vp === 2 ? 2.0 : 1.6;
      if (vp === 1) { fan(e, 8, 0.4, 320, 'magic', '#a01aff', e.dmg * 0.7); }
      else if (vp === 2) {
        const v2 = e.ai.phase++ % 3;
        if (v2 === 0) { summon(e, ['nylocas_ischyros', 'nylocas_toxobolos', 'nylocas_hagios'][Math.floor(Math.random() * 3)], 3); }
        else if (v2 === 1 && e.ai.phase % 2 === 0) { for (let i = 0; i < 2; i++) { const sp = edgeSpawn(); const m = spawnMonster('nylocas_matomenos', sp.x, sp.y); m.hp = m.maxHp = Math.round(e.maxHp * 0.04); m.feeds = e; m.summoned = true; } chat('Nylocas Matomenos crawl toward Verzik. Kill them before they heal her!', 'r'); }
        else slam(p.x, p.y, 80, 1.0, e.dmg * 1.2, 'ranged', '#a01a2a', 'Bounce!');
      } else {
        const vr = e.ai.phase++ % 4;
        if (vr === 0) { hazards.push({ x: e.x, y: e.y, r: 40, t: 8, color: '#c03030', dps: 25, chase: 90, heal: 2, from: e }); chat('Verzik summons a tornado! It heals her if it catches you.', 'r'); }
        else if (vr === 2) {
          // webs: get caught and you're stuck in place
          for (let i = 0; i < 6; i++) slam(clamp(p.x + (i ? (Math.random() - 0.5) * 420 : 0), 40, WORLD_W - 40), clamp(p.y + (i ? (Math.random() - 0.5) * 300 : 0), 130, WORLD_H - 40), 55, 1.0, e.dmg * 0.8, 'magic', '#e8e8e8', i ? '' : 'Webs!', { noPray: true, freeze: 1.5 });
        }
        else if (vr === 3) { aimShot(e, 240, 'magic', '#5fd34a', 0, { r: 22, pure: true, fracCur: 0.74 }); chat('Verzik throws a green ball. Dodge it!', 'r'); }
        else aimShot(e, 520, Math.random() < 0.5 ? 'ranged' : 'magic', '#e04a6a', e.dmg, { r: 14 });
      }
    }
  } else if (k === 'nex') {
    // Nex: smoke, shadow, blood, ice, then Zaros
    const phases = ['smoke', 'shadow', 'blood', 'ice', 'zaros'];
    const ph = phases[Math.min(4, Math.floor((1 - hpf) * 5))];
    // After each fifth of her health, the mage empowering that phase must die before she can be hurt again
    if (!e.ai.mages) e.ai.mages = [];
    ['fumus', 'umbra', 'cruor', 'glacies'].forEach((id, i) => {
      const at = 0.8 - 0.2 * i;
      if (e.hp / e.maxHp <= at && !e.ai.mages[i]) {
        e.hp = Math.max(e.hp, e.maxHp * at);
        const sp = edgeSpawn(); const m = spawnMonster(id, sp.x, sp.y); m.hp = m.maxHp = Math.round(e.maxHp * 0.06); m.dmg = e.dmg * 0.6; m.summoned = true; e.ai.mages[i] = m;
        chat(`Nex: ${m.d.name}, don't fail me! She is immune until ${m.d.name} dies.`, 'r');
      }
    });
    e.immune = e.ai.mages.some((m) => m && !m.dead);
    if (ph !== e.ai.nexPhase) { e.ai.nexPhase = ph; shout(e, 'nex_' + ph); }
    if (e.ai.t <= 0) {
      e.ai.t = 2.2;
      if (ph === 'smoke') fan(e, 5, 0.25, 360, 'magic', '#7a7a7a', e.dmg * 0.8, { poison: 4 });
      else if (ph === 'shadow') { for (let i = 0; i < 4; i++) slam(p.x + (Math.random() - 0.5) * 240, p.y + (Math.random() - 0.5) * 200, 60, 1.0, e.dmg * 1.2, 'ranged', '#222', 'Shadow!'); }
      else if (ph === 'blood') {
        e.lifesteal = 1; aimShot(e, 500, 'magic', '#c01a1a', e.dmg, { r: 14 });
        if (e.ai.siphon % 3 === 2) { slam(e.x, e.y, 300, 2.4, 0, 'magic', '#c01a1a', 'Blood Sacrifice! Run from Nex!', { noPray: true, frac: 0.85 }); }
        if (e.ai.siphon = (e.ai.siphon || 0) + 1, e.ai.siphon % 3 === 1) {
          // Blood Siphon: pools of blood around you feed Nex for every hit they do
          for (let i = 0; i < 5; i++) hazards.push({ x: clamp(p.x + (Math.random() - 0.5) * 360, 40, WORLD_W - 40), y: clamp(p.y + (Math.random() - 0.5) * 280, 130, WORLD_H - 40), r: 50, t: 6, color: '#a00a1a', dps: 24, heal: 4, from: e });
          chat('Nex: Blood Siphon! Her blood pools heal her. Stay out of them.', 'r');
        }
      }
      else if (ph === 'ice') { if (e.ai.icy = (e.ai.icy || 0) + 1, e.ai.icy % 3 === 0) slam(p.x, p.y, 90, 1.3, 0, 'magic', '#9fe8ff', 'Contain this!', { shape: 'square', noPray: true, frac: 0.5, freeze: 2 }); else fan(e, 6, 0.2, 380, 'magic', '#9fe8ff', e.dmg * 0.8, { freeze: 0.8 }); }
      else { fan(e, 7, 0.18, 420, 'magic', '#b04bff', e.dmg); }
    }
  } else if (k === 'zuk') {
    // TzKal-Zuk: hide behind the moving shield when he fires, or take a huge hit
    if (!e.ai.shield) e.ai.shield = { x: WORLD_W / 2, dir: 1, y: Math.min(WORLD_H - 160, e.y + 80) };
    const sh = e.ai.shield;
    sh.x += sh.dir * 120 * dt;
    if (sh.x < 220 || sh.x > WORLD_W - 220) sh.dir *= -1;
    if (e.ai.t <= 0) {
      e.ai.t = 4.5;
      e.ai.blast = 1.4;
      chat('TzKal-Zuk charges a blast. Get behind the shield!', 'r');
    }
    if (e.ai.blast > 0) {
      e.ai.blast -= dt;
      if (e.ai.blast <= 0) {
        const safe = Math.abs(p.x - sh.x) < 85 && p.y > sh.y + 13;
        fx.push({ kind: 'beam', x: e.x, y: e.y - 60, tx: p.x, ty: p.y - 30, t: 0.3, max: 0.3, color: safe ? '#888' : '#ff3a1a' });
        if (safe) burst(sh.x, sh.y + 13, '#ffb040', 20); else hurtPlayer(0, 'magic', { pure: true, frac: 0.95 });
      }
    }
    if (!e.ai.jad && hpf < 0.6) { e.ai.jad = true; const j = spawnMonster('jaltok_jad', 200, 300); j.summoned = true; j.master = e; j.hp = j.maxHp = 2500; chat('TzKal-Zuk summons Jal-TokJad!', 'r'); }
    if (!e.ai.heal && hpf < 0.3) { e.ai.heal = true; for (let i = 0; i < 4; i++) { const m = spawnMonster('yt_hurkot', 200 + i * 300, 160); m.healer = true; m.summoned = true; } chat('Jal-MejJak healers arrive!', 'r'); }
  }
  // Jad-style healers heal whoever is the boss
  for (const m of enemies) if (m.healer && !m.dead && !m.aggro && (!m.healFor || m.healFor === e) && Math.hypot(m.x - e.x, m.y - e.y) < e.r + 50) e.hp = Math.min(e.maxHp, e.hp + 16 * dt);
}

function updateEnemyShots(dt) {
  const p = run.p;
  for (const s of eshots) {
    if (s.homing) {
      const a = Math.atan2(p.y - 30 - s.y, p.x - s.x), sp = Math.hypot(s.vx, s.vy);
      s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp;
    }
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (!s.harmless && Math.hypot(p.x - s.x, p.y - 30 - s.y) < p.r + s.r) {
      s.life = 0;
      hurtPlayer(s.dmg, s.style, s);
    }
  }
  eshots = eshots.filter((s) => s.life > 0 && s.x > -40 && s.x < WORLD_W + 40 && s.y > -40 && s.y < WORLD_H + 40);
  for (const t of telegraphs) {
    t.t -= dt;
    if (t.t <= 0 && !t.done) {
      t.done = true;
      sfx(60, 0.3, 'sawtooth', 0.07);
      if (t.line) {
        // distance from the player to the charge line
        const dx = p.x - t.x, dy = p.y - t.y, along = dx * Math.cos(t.a) + dy * Math.sin(t.a), off = Math.abs(-dx * Math.sin(t.a) + dy * Math.cos(t.a));
        if (along > 0 && along < t.len && off < t.w / 2) hurtPlayer(t.dmg, t.style, { noPray: t.noPray, frac: t.frac, ...t.fx });
      } else {
        if (t.shape === 'circle' || t.shape === 'ring') fx.push({ kind: 'boom', x: t.x, y: t.y, r: t.r, color: t.color, t: 0.35, max: 0.35 });
        else burst(t.x, t.y, t.color, 14);
        if (inTelegraph(t, p.x, p.y)) hurtPlayer(t.dmg, t.style, { noPray: t.noPray, heal: t.heal, from: t.from, freeze: t.freeze, frac: t.frac, ...t.fx });
      }
    }
  }
  telegraphs = telegraphs.filter((t) => !t.done);
  for (const h of hazards) {
    h.t -= dt;
    if (h.orbit) { h.orbit.a += dt * 0.7; h.x = WORLD_W / 2 + Math.cos(h.orbit.a) * WORLD_W * 0.33; h.y = 470 + Math.sin(h.orbit.a) * 260; }
    if (h.chase) { const a = Math.atan2(p.y - h.y, p.x - h.x); h.x += Math.cos(a) * h.chase * dt; h.y += Math.sin(a) * h.chase * dt; }
    if (Math.hypot(p.x - h.x, p.y - h.y) < h.r) {
      h.tick = (h.tick || 0) - dt;
      if (h.tick <= 0) { h.tick = 0.5; hurtPlayer(h.dps * 0.5, 'magic', { pure: true, poison: h.poison, heal: h.heal, from: h.from }); }
    }
  }
  hazards = hazards.filter((h) => h.t > 0);
}

// ======================================================================
// Player
// ======================================================================
function updatePlayer(dt) {
  const p = run.p, st = stats();
  updatePet(dt);
  p.hurtT = Math.max(0, p.hurtT - dt);
  if (p.over) { p.over.t -= dt; if (p.over.t <= 0) p.over = null; }
  if (p.anim) { p.anim.t += dt; if (p.anim.t > p.anim.dur + 0.1) p.anim = null; }
  if (st.regen > 0 && p.hp > 0) p.hp = Math.min(st.maxHp, p.hp + st.regen * dt);
  if (p.poison > 0) {
    p.poison -= dt;
    p.poisonTick = (p.poisonTick || 0) - dt;
    if (p.poisonTick <= 0) {
      p.poisonTick = 1;
      p.hp -= 2 + Math.floor(areaIndex() / 3);
      splats.push({ x: p.x, y: p.y - 70, v: 2 + Math.floor(areaIndex() / 3), t: 0.8, kind: 'poison' });
      if (p.hp <= 0) return die();
    }
  }
  if (p.frozen > 0) { p.frozen -= dt; p.moving = false; }
  else {
    let mx = 0, my = 0;
    if (keys['a'] || keys['arrowleft']) mx -= 1;
    if (keys['d'] || keys['arrowright']) mx += 1;
    if (keys['w'] || keys['arrowup']) my -= 1;
    if (keys['s'] || keys['arrowdown']) my += 1;
    if (stick.id !== null) {
      const l = Math.hypot(stick.dx, stick.dy);
      if (l > 8) { mx += stick.dx / Math.max(l, 50); my += stick.dy / Math.max(l, 50); }
    }
    const l = Math.hypot(mx, my);
    if (l > 1) { mx /= l; my /= l; }
    p.x = clamp(p.x + mx * st.speed * dt, p.r, WORLD_W - p.r);
    p.y = clamp(p.y + my * st.speed * dt, 110, WORLD_H - p.r);
    p.moving = l > 0.1;
    if (mx) p.flip = mx < 0;
  }
  if (run.prayer) {
    // prayer flicking: like a game tick, the first 0.6s of a prayer costs nothing, so tapping it on for each hit is free
    run.prayOnT = (run.prayOnT || 0) + dt;
    if (run.prayOnT > FLICK_TICK) p.pp -= st.ppDrain * dt;
    if (p.pp <= 0) { p.pp = 0; run.prayer = null; chat('You have run out of prayer points.', 'r'); updatePrayerButtons(); }
  }
  for (const c of coins) {
    c.t += dt;
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d < 120 * (1 + bv('greed'))) { c.x += (p.x - c.x) / d * 440 * dt; c.y += (p.y - c.y) / d * 440 * dt; }
    if (d < p.r + 8) { addGold(c.v, true); c.got = true; }
  }
  coins = coins.filter((c) => !c.got);
  for (const k in run.buffs) run.buffs[k].t -= dt;
  run.spec = Math.min(100, run.spec + SPEC_REGEN * (1 + bv('light')) * dt);
  if (run.vengT > 0) run.vengT -= dt;
  if (bv('thrall')) {
    run.thrallT = (run.thrallT || 0) - dt;
    if (run.thrallT <= 0) {
      const t = nearestEnemy(p.x, p.y, 420);
      run.thrallT = t ? 1 : 0.2;
      if (t) { damageEnemy(t, Math.max(1, Math.round(weaponDps(st) * 0.25 * bv('thrall') * (0.7 + Math.random() * 0.3))), false); burst(t.x, t.y, '#b8e0ff', 6); }
    }
  }
  for (const pk of pickups) {
    pk.t += dt;
    if ((pk.kind === 'potion' || pk.kind === 'pie') && pk.t > 20) { pk.got = true; continue; } // potions and pies fade after a while
    if (Math.hypot(p.x - pk.x, p.y - pk.y) < p.r + 22) {
      pk.got = true;
      if (pk.kind === 'clue') startClue(pk.tier ?? baseClueTier());
      else if (pk.kind === 'artefact') { const g = Math.round(pk.art.gold * (1 + areaIndex() * 0.15)); addGold(g, true); chat(`You pick up an ${pk.art.name}, worth ${g.toLocaleString()} coins.`, 'g'); sfx(1100, 0.2, 'triangle', 0.06); }
      else if (pk.kind === 'pie' && inv('diet')) { chat('You are On a Diet, so you leave the pie.', 'b'); }
      else if (pk.kind === 'pie') {
        const max = stats().maxHp, heal = ycon('breath') ? 0 : Math.round(max * PIE.heal * ((run.hero.mods || {}).pieHeal || 1));
        p.hp = Math.min(max, p.hp + heal);
        p.eatT = EAT_DELAY;
        chat(`You eat the Redberry pie. It heals ${heal} hitpoints.`, 'g');
        run.piesEaten++; achEvent('pie');
        burst(p.x, p.y - 20, '#ff4a6a', 12);
        sfx(620, 0.15, 'sine', 0.06);
      } else if (pk.kind === 'potion') {
        const pot = POTIONS[pk.pot];
        run.buffs[pot.stat] = { t: pot.secs, amount: pot.amount, name: pot.name, file: pot.file };
        chat(`You drink a ${pot.name}: ${pot.info} for ${pot.secs} seconds.`, 'g');
        achEvent('potion', pot);
        sfx(520, 0.15, 'sine', 0.06);
      } else { sfx(700, 0.2, 'triangle', 0.06); openCasket(pk); }
    }
  }
  pickups = pickups.filter((pk) => !pk.got);
}

function addGold(v, sound) {
  run.gold += v; run.totalGold += v;
  achEvent('gold');
  if (sound) sfx(1200 + Math.random() * 200, 0.03, 'square', 0.015);
}

function togglePrayer(style) {
  if (!run || mode !== 'play') return;
  if (run.prayer === style) run.prayer = null;
  else if (ycon('severance')) { chat('Your Contract of Divine Severance forbids protection prayers.', 'r'); return; }
  else if (run.p.pp > 0) { run.prayer = style; run.prayOnT = 0; run.prayedEver = true; achEvent('pray'); }
  else chat('You need to recharge your prayer.', 'r');
  sfx(run.prayer ? 520 : 300, 0.06, 'sine', 0.05);
  updatePrayerButtons();
}
function updatePrayerButtons() {
  document.querySelectorAll('.pbtn[data-pray]').forEach((b) => b.classList.toggle('on', !!run && run.prayer === b.dataset.pray));
}
function useItem(kind) {
  if (!run || mode !== 'play' || run.inv[kind] <= 0) return;
  if (kind === 'shark' && inv('diet')) { chat('You are On a Diet: no eating this raid.', 'r'); return; }
  if (kind === 'ppot' && inv('dehydration')) { chat('Dehydration: you can\'t drink potions this raid.', 'r'); return; }
  const st = stats();
  run.inv[kind]--;
  if (kind === 'shark') achEvent('eat');
  if (kind === 'shark') { if (ycon('breath')) chat('You eat the shark, but your contract with Yama stops it healing you.', 'r'); else { run.p.hp = Math.min(st.maxHp, run.p.hp + 20); run.p.eatT = EAT_DELAY; chat('You eat the shark. It heals some health.'); } }
  else { run.p.pp = Math.min(st.maxPp, run.p.pp + 20); chat('You drink some of your prayer potion.'); }
  sfx(400, 0.1, 'sine', 0.05);
}

function die() {
  if (mode !== 'play') return;
  mode = 'over';
  chat('Oh dear, you are dead!', 'r');
  if (run.skull) { run.skullDied = true; chat('You died skulled. The PKers loot half of this run\'s trading sticks.', 'r'); }
  meta.deaths = (meta.deaths || 0) + 1; saveMeta();
  achEvent('death');
  sfx(110, 0.6, 'sawtooth', 0.08);
  saveBest();
  setTimeout(renderGameOver, 700);
}
function victory() {
  mode = 'over'; run.won = true;
  achEvent('win');
  saveBest(true);
  renderVictory();
}
function awardSticks() {
  if (run.sticksGiven) return;
  run.sticksGiven = sticksEarned();
  meta.sticks += run.sticksGiven;
  saveMeta();
}
function saveBest(won) {
  awardSticks();
  try {
    const best = JSON.parse(localStorage.getItem('runerogue.best2') || '{}');
    const prev = best[run.hero.id] || 0;
    best[run.hero.id] = Math.max(prev, won ? 999 : run.stage + 1);
    localStorage.setItem('runerogue.best2', JSON.stringify(best));
  } catch (e) { /* storage optional */ }
}
function loadBest() { try { return JSON.parse(localStorage.getItem('runerogue.best2') || '{}'); } catch (e) { return {}; } }

function togglePause() {
  if (mode === 'play') { mode = 'paused'; renderPause(); }
  else if (mode === 'paused') { mode = 'play'; showScreen(null); }
}

function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 200;
    fx.push({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, t: 0.3 + Math.random() * 0.35, max: 0.6 });
  }
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ======================================================================
// Main loop
// ======================================================================
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.04, (now - last) / 1000);
  last = now;
  if (mode === 'play') step(dt);
  for (const f of fx) { f.t -= dt; if (f.kind === 'spark') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.92; f.vy *= 0.92; } }
  fx = fx.filter((f) => f.t > 0);
  for (const s of splats) s.t -= dt;
  splats = splats.filter((s) => s.t > 0);
  draw();
  if (run && (mode === 'play' || mode === 'paused')) drawHud();
  requestAnimationFrame(frame);
}

function step(dt) {
  updatePlayer(dt);
  if (mode !== 'play') return;
  playerAttack(dt);
  updateShots(dt);
  updateEnemies(dt);
  updateEnemyShots(dt);
  creatureFrame(dt);
  if (mode !== 'play') return;
  if (pendingClue.length) startClue(pendingClue.shift());
  invoTick(dt);
  eventTick(dt);
  spawnTick(dt);
  raidTick(dt);
  checkStageDone(dt);
}

// ======================================================================
// Drawing
// ======================================================================
// Top-down world map tiles for each area. Each tile is cached once; failures are remembered.
const tileCache = {};
function mapTile(m, plane, tx, ty) {
  const key = `${m}_${plane}_${tx}_${ty}`;
  if (tileCache[key]) return tileCache[key];
  const im = new Image();
  im.decoding = 'async';
  im.onerror = () => { im._failed = true; };
  im.src = `${MAP_TILES}${m}_${MAP_VERSION}/3/${plane}_${tx}_${ty}.png`;
  tileCache[key] = im;
  return im;
}
// Calls fn(image, x, y, size) for every map tile covering the arena.
function forEachMapTile(ar, fn) {
  const [m, plane, cx, cy, sc] = ar.map;
  const px = 8 * sc, size = 256 * sc; // zoom 3 = 8px per game tile
  const tx0 = Math.floor((cx - WORLD_W / 2 / px) / 32), tx1 = Math.floor((cx + WORLD_W / 2 / px) / 32);
  const ty0 = Math.floor((cy - WORLD_H / 2 / px) / 32), ty1 = Math.floor((cy + WORLD_H / 2 / px) / 32);
  for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) {
    fn(mapTile(m, plane, tx, ty), WORLD_W / 2 + (tx * 32 - cx) * px, WORLD_H / 2 - ((ty + 1) * 32 - cy) * px, size);
  }
}
function preloadMap(ar) { if (ar && ar.map) forEachMapTile(ar, () => {}); }
function mapReady(ar) {
  let ok = 0, all = 0;
  forEachMapTile(ar, (im) => { all++; if (ready(im) || im._failed) ok++; });
  return all > 0 && ok === all;
}

function drawGround() {
  const ar = area || AREAS[0];
  if (ar.map && mapReady(ar) && !ar.mapFailed) {
    // Aerial view: base colour first, then the map in 'screen' mode so empty black map areas take the base colour.
    ctx.fillStyle = ar.look[1]; ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'screen';
    let drawn = 0;
    forEachMapTile(ar, (im, x, y, size) => { if (ready(im)) { ctx.drawImage(im, x, y, size + 0.5, size + 0.5); drawn++; } });
    ctx.restore();
    if (!drawn) ar.mapFailed = true; // nothing loaded: fall back to the screenshot next frame
    ctx.fillStyle = 'rgba(10,8,4,0.22)'; ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, WORLD_W - 6, WORLD_H - 6);
    return;
  }
  const bg = wikiImage(ar.bg);
  if (ar.map && !ar.mapFailed && !mapReady(ar)) { /* map still loading: show plain ground */ }
  else if (ready(bg)) {
    // cover the arena with the area's wiki screenshot, darkened so sprites stand out
    const s = Math.max(WORLD_W / bg.naturalWidth, WORLD_H / bg.naturalHeight);
    const w = bg.naturalWidth * s, h = bg.naturalHeight * s;
    ctx.drawImage(bg, (WORLD_W - w) / 2, (WORLD_H - h) / 2, w, h);
    ctx.fillStyle = 'rgba(10,8,4,0.38)'; ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  } else {
    const look = ar.look;
    ctx.fillStyle = look[1]; ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    const T = 64;
    for (let y = 0; y < WORLD_H; y += T) for (let x = 0; x < WORLD_W; x += T) {
      const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; const r = n - Math.floor(n);
      ctx.fillStyle = r < 0.33 ? look[0] : r < 0.66 ? look[1] : look[2];
      ctx.globalAlpha = 0.55; ctx.fillRect(x, y, T, T); ctx.globalAlpha = 1;
    }
  }
  ctx.strokeStyle = '#000'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, WORLD_W - 6, WORLD_H - 6);
}

function drawSprite(im, x, y, h, opts = {}) {
  if (ready(im)) {
    let w = im.naturalWidth * (h / im.naturalHeight), hh = h;
    const maxW = h * 1.5;
    if (w > maxW) { hh = h * maxW / w; w = maxW; }
    if (opts.flip) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, y - hh, w, hh); ctx.restore(); }
    else ctx.drawImage(im, x - w / 2, y - hh, w, hh);
    return true;
  }
  ctx.fillStyle = opts.color || '#7a6a50';
  ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y - h / 2, h * 0.32, h / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (opts.label) text(opts.label, x, y - h / 2, Math.max(10, h * 0.28), '#fff');
  return false;
}

function text(s, x, y, size, color = '#ff0', align = 'center') {
  ctx.font = `600 ${size}px "Pixelify Sans", "Trebuchet MS", sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000'; ctx.fillText(s, x + 1.5, y + 1.5);
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}

function draw() {
  const w = cv.width, h = cv.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#1b1610'; ctx.fillRect(0, 0, w, h);
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offX, dpr * offY);
  if (!run) { drawTitleBackdrop(); return; }
  drawGround();

  for (const hz of hazards) {
    ctx.fillStyle = hz.color + '55'; ctx.strokeStyle = hz.color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hz.x, hz.y, hz.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  for (const t of telegraphs) {
    const k = 1 - t.t / t.max;
    ctx.fillStyle = t.color + '33'; ctx.strokeStyle = t.color; ctx.lineWidth = 3;
    if (t.line) {
      ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.a);
      ctx.fillRect(0, -t.w / 2, t.len, t.w); ctx.strokeRect(0, -t.w / 2, t.len, t.w);
      ctx.fillStyle = t.color + '66'; ctx.fillRect(0, -t.w / 2, t.len * k, t.w);
      ctx.restore();
      text(t.label, t.x + Math.cos(t.a) * 120, t.y + Math.sin(t.a) * 120, 22, '#fff');
    } else if (t.shape === 'square') {
      ctx.fillRect(t.x - t.r, t.y - t.r, t.r * 2, t.r * 2); ctx.strokeRect(t.x - t.r, t.y - t.r, t.r * 2, t.r * 2);
      ctx.fillStyle = t.color + '66'; ctx.fillRect(t.x - t.r * k, t.y - t.r * k, t.r * 2 * k, t.r * 2 * k);
      text(t.label, t.x, t.y, 18, '#fff');
    } else if (t.shape === 'cross') {
      const w = t.w;
      for (const [rw, rh] of [[t.r * 2, w], [w, t.r * 2]]) { ctx.fillRect(t.x - rw / 2, t.y - rh / 2, rw, rh); ctx.strokeRect(t.x - rw / 2, t.y - rh / 2, rw, rh); }
      ctx.fillStyle = t.color + '66';
      ctx.fillRect(t.x - t.r * k, t.y - w / 2, t.r * 2 * k, w); ctx.fillRect(t.x - w / 2, t.y - t.r * k, w, t.r * 2 * k);
      text(t.label, t.x, t.y, 18, '#fff');
    } else if (t.shape === 'cone') {
      ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.arc(t.x, t.y, t.r, t.a - t.spread / 2, t.a + t.spread / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = t.color + '66';
      ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.arc(t.x, t.y, t.r * k, t.a - t.spread / 2, t.a + t.spread / 2); ctx.closePath(); ctx.fill();
      if (t.inner) { ctx.fillStyle = '#1a3a1a99'; ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.arc(t.x, t.y, t.inner, t.a - t.spread / 2, t.a + t.spread / 2); ctx.closePath(); ctx.fill(); }
    } else if (t.shape === 'ring') {
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.arc(t.x, t.y, t.r * 0.45, 0, Math.PI * 2, true); ctx.fill('evenodd'); ctx.stroke();
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r * 0.45, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = t.color + '66';
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r * 0.45 + t.r * 0.55 * k, 0, Math.PI * 2); ctx.arc(t.x, t.y, t.r * 0.45, 0, Math.PI * 2, true); ctx.fill('evenodd');
    } else {
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = t.color + '66';
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r * k, 0, Math.PI * 2); ctx.fill();
      text(t.label, t.x, t.y, 18, '#fff');
    }
  }

  const coinIm = wikiImage('Coins_10000.png');
  for (const c of coins) {
    const bob = Math.sin(c.t * 6) * 2;
    if (ready(coinIm)) ctx.drawImage(coinIm, c.x - 11, c.y - 10 + bob, 22, 19);
    else { ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.arc(c.x, c.y + bob, 6, 0, 7); ctx.fill(); }
  }
  for (const pk of pickups) {
    const bob = Math.sin(pk.t * 4) * 4;
    ctx.fillStyle = 'rgba(255,220,120,0.25)'; ctx.beginPath(); ctx.arc(pk.x, pk.y, 30 + Math.sin(pk.t * 5) * 4, 0, 7); ctx.fill();
    const pot = pk.kind === 'potion' ? POTIONS[pk.pot] : null;
    const pie = pk.kind === 'pie';
    const art = pk.kind === 'artefact' ? pk.art : null;
    const ct = pk.tier ?? 3;
    const im = wikiImage(art ? art.file : pot ? pot.file : pie ? PIE.file : pk.kind === 'clue' ? clueFile(ct) : casketFile(ct));
    const w = pot ? 22 : pie ? 30 : 36;
    if (ready(im)) ctx.drawImage(im, pk.x - w / 2, pk.y - 22 + bob, w, w * im.naturalHeight / im.naturalWidth);
    else { ctx.fillStyle = pot ? '#4aa0ff' : pie ? '#c0304a' : pk.kind === 'clue' ? '#f0e0b0' : '#8a5a2a'; ctx.fillRect(pk.x - 14, pk.y - 14 + bob, 28, 22); }
    text(art ? art.name : pot ? pot.name : pie ? PIE.name : pk.kind === 'clue' ? `Clue scroll (${CLUE_TIERS[ct].id})` : `Reward casket (${CLUE_TIERS[ct].id})`, pk.x, pk.y - 34 + bob, 13, pot ? '#7fd0ff' : pie ? '#ff8a9a' : '#ff981f');
  }

  for (const e of enemies) if (!e.dead && RAID_DRAW[e.d.boss]) RAID_DRAW[e.d.boss](e);
  drawDoor();
  drawEvent();
  const sprites = enemies.filter((e) => e.ai.burrow <= 0).map((e) => ({ y: e.y, e }));
  sprites.push({ y: run.p.y, player: true });
  if (run.pet) sprites.push({ y: run.pet.y, pet: true });
  sprites.sort((a, b) => a.y - b.y);
  for (const s of sprites) s.player ? drawPlayer() : s.pet ? drawPet() : drawEnemy(s.e);
  drawCreatureExtras();

  if (bossAlive && !bossAlive.dead && bossAlive.ai.pillars) {
    for (const pl of bossAlive.ai.pillars) { ctx.fillStyle = '#6a6a72'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(pl.x, pl.y, 36, 0, 7); ctx.fill(); ctx.stroke(); text('Pillar', pl.x, pl.y + 4, 13, '#fff'); }
  }
  if (bossAlive && bossAlive.d.boss === 'zuk' && bossAlive.ai.shield) {
    const sh = bossAlive.ai.shield;
    ctx.fillStyle = '#5a3a1a'; ctx.strokeStyle = '#ffb040'; ctx.lineWidth = 3;
    ctx.fillRect(sh.x - 85, sh.y, 170, 26); ctx.strokeRect(sh.x - 85, sh.y, 170, 26);
    text('Ancestral Glyph', sh.x, sh.y + 13, 13, '#ffb040');
  }

  for (const s of shots) {
    const im = s.icon ? wikiImage(s.icon) : null;
    const fim = s.food ? wikiImage(s.food) : null;
    if (s.food && ready(fim)) {
      // Thrown food spins as it flies
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.spin + (s.life || 0) * -14);
      ctx.drawImage(fim, -15, -15, 30, 30); ctx.restore();
    } else if (s.kind === 'arrow') {
      const a = Math.atan2(s.vy, s.vx);
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a);
      ctx.strokeStyle = s.bolt ? '#9ad' : s.dart ? '#6fd06a' : '#c8a060'; ctx.lineWidth = s.bolt ? 4 : 3;
      ctx.beginPath(); ctx.moveTo(s.dart ? -8 : -16, 0); ctx.lineTo(8, 0); ctx.stroke();
      ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(6, -4); ctx.lineTo(6, 4); ctx.fill();
      ctx.restore();
    } else if (ready(im)) {
      ctx.save(); ctx.shadowColor = s.color; ctx.shadowBlur = 18;
      ctx.drawImage(im, s.x - 14, s.y - 14, 28, 28); ctx.restore();
    } else {
      ctx.fillStyle = s.color; ctx.shadowColor = s.color; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
  }
  for (const s of eshots) {
    const shape = s.shape || (s.style === 'ranged' ? 'arrow' : s.style === 'melee' ? 'rock' : 'orb');
    const ang = Math.atan2(s.vy, s.vx);
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(ang);
    ctx.fillStyle = s.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
    if (shape === 'arrow') {
      ctx.fillRect(-s.r * 2.2, -1.5, s.r * 2.6, 3);
      ctx.beginPath(); ctx.moveTo(s.r * 1.2, 0); ctx.lineTo(s.r * 0.2, -s.r * 0.6); ctx.lineTo(s.r * 0.2, s.r * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#eee'; ctx.fillRect(-s.r * 2.2, -3, 5, 6);
    } else if (shape === 'rock') {
      ctx.rotate(s.x * 0.05);
      ctx.beginPath(); for (let i = 0; i < 6; i++) { const rr = s.r * (0.75 + (i % 2) * 0.35); ctx.lineTo(Math.cos(i * 1.05) * rr, Math.sin(i * 1.05) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (shape === 'blob') {
      ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(0, 0, s.r * 1.4, s.r, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (shape === 'spike') {
      ctx.beginPath(); ctx.moveTo(s.r * 1.6, 0); ctx.lineTo(-s.r, -s.r * 0.6); ctx.lineTo(-s.r * 0.5, 0); ctx.lineTo(-s.r, s.r * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      // magic orb with a fading tail
      ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.ellipse(-s.r * 1.4, 0, s.r * 1.6, s.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.shadowColor = s.color; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(0, 0, s.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.stroke();
    }
    ctx.restore();
  }

  for (const f of fx) {
    const a = f.t / f.max;
    if (f.kind === 'slash') {
      ctx.strokeStyle = `rgba(255,255,230,${a * 0.85})`; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 - a * 0.3), f.a - f.arc / 2, f.a + f.arc / 2); ctx.stroke();
    } else if (f.kind === 'boom') {
      ctx.fillStyle = f.color; ctx.globalAlpha = a * 0.45;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.1 - a * 0.4), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    } else if (f.kind === 'spark') {
      ctx.fillStyle = f.color; ctx.globalAlpha = Math.min(1, a * 2);
      ctx.fillRect(f.x - 2, f.y - 2, 4, 4); ctx.globalAlpha = 1;
    } else if (f.kind === 'label') {
      ctx.globalAlpha = Math.min(1, a * 2); text(f.txt, f.x, f.y - (1 - a) * 24, 14, f.color); ctx.globalAlpha = 1;
    } else if (f.kind === 'beam') {
      ctx.strokeStyle = f.color; ctx.globalAlpha = a; ctx.lineWidth = 14;
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.tx, f.ty); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  for (const s of splats) drawSplat(s);
  drawOverheads();

  if (stick.id !== null) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = cv.getBoundingClientRect();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(stick.ox - r.left, stick.oy - r.top, 50, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    const l = Math.min(50, Math.hypot(stick.dx, stick.dy)), a = Math.atan2(stick.dy, stick.dx);
    ctx.beginPath(); ctx.arc(stick.ox - r.left + Math.cos(a) * l, stick.oy - r.top + Math.sin(a) * l, 20, 0, 7); ctx.fill();
  }
}

function drawShadow(x, y, r) {
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();
}

const HERO_H = 92;
function drawPlayer() {
  const p = run.p, h = HERO_H;
  drawShadow(p.x, p.y + 4, 24);
  if (run.prayer) {
    const icon = wikiImage({ melee: 'Protect_from_Melee.png', ranged: 'Protect_from_Missiles.png', magic: 'Protect_from_Magic.png' }[run.prayer]);
    if (ready(icon)) ctx.drawImage(icon, p.x - 13, p.y - h - 34, 26, 26);
  }
  if (run.skull) {
    const sk = wikiImage(SKULL.file), sy = p.y - h - 34 - (run.prayer ? 28 : 0);
    if (ready(sk)) ctx.drawImage(sk, p.x - 11, sy, 22, 22 * sk.naturalHeight / sk.naturalWidth);
    else text('☠', p.x, sy + 18, 20, '#fff');
  }
  if (bv('thrall')) {
    const tb = Math.sin(performance.now() / 300) * 5;
    ctx.save(); ctx.globalAlpha = 0.85;
    drawSprite(wikiImage(THRALL_FILE), p.x + (p.flip ? 48 : -48), p.y - 6 + tb, 58, { color: '#9ab8d8', label: 'G' });
    ctx.restore();
  }
  const bob = p.moving ? Math.abs(Math.sin(performance.now() / 90)) * 3 : 0;
  ctx.save();
  if (p.hurtT > 0) ctx.globalAlpha = 0.6;
  drawSprite(wikiImage(run.hero.file), p.x, p.y + 4 - bob, h, { color: '#3a7bd5', label: run.hero.name[0], flip: p.flip });
  ctx.restore();
  drawWeapon(p, h);
  if (p.frozen > 0) { ctx.fillStyle = 'rgba(160,220,255,0.45)'; ctx.fillRect(p.x - 26, p.y - h, 52, h + 4); }
  if (p.poison > 0) text('Poisoned', p.x, p.y + 18, 13, '#5fd34a');
  if (run.frogT > 0) text('Frog!', p.x, p.y - HERO_H - 8, 16, '#5fd34a');
  if (p.doom >= 1) text(`Doom ${Math.floor(p.doom)}/12`, p.x, p.y + 56, 13, '#b06aff');
  // active potion buffs: icon and seconds left under the player
  const active = Object.values(run.buffs).filter((b) => b.t > 0);
  active.forEach((b, i) => {
    const bx = p.x + (i - (active.length - 1) / 2) * 30, by = p.y + 26;
    const im = wikiImage(b.file);
    if (ready(im)) ctx.drawImage(im, bx - 8, by, 16, 16 * im.naturalHeight / im.naturalWidth);
    text(String(Math.ceil(b.t)), bx, by + 30, 11, '#7fd0ff');
  });
}

// The equipped weapon's wiki sprite, animated: swings through its arc, draws and fires, or raises and casts.
function drawWeapon(p, h) {
  const wItem = ITEMS[run.gear.weapon];
  const im = wikiImage(wItem.file);
  if (!ready(im)) return;
  const size = 44;
  const handX = p.x, handY = p.y - h * 0.45;
  const an = p.anim;
  let ang = p.face, dist = 26, rot = p.face + Math.PI / 4, glow = 0;
  if (an) {
    const k = clamp(an.t / an.dur, 0, 1);
    if (an.kind === 'swing') {
      const arc = Math.min(an.arc, Math.PI * 1.6);
      ang = an.ang - arc / 2 + arc * k;
      dist = 34;
      rot = ang + Math.PI / 4;
    } else if (an.kind === 'shot') {
      ang = an.ang; dist = 30 - Math.sin(k * Math.PI) * 10; rot = an.ang - Math.PI / 4;
    } else {
      ang = an.ang; dist = 24; rot = -Math.PI / 6; glow = Math.sin(k * Math.PI);
    }
  } else if (weaponStyle() === 'ranged') rot = p.face - Math.PI / 4;
  const wx = handX + Math.cos(ang) * dist, wy = handY + Math.sin(ang) * dist * 0.8;
  ctx.save();
  ctx.translate(wx, wy);
  if (glow > 0) {
    const col = wItem.w.color || '#fff';
    ctx.shadowColor = col; ctx.shadowBlur = 24 * glow;
    ctx.fillStyle = col; ctx.globalAlpha = 0.35 * glow;
    ctx.beginPath(); ctx.arc(0, -size * 0.4, 18, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  }
  ctx.rotate(rot);
  const s = size / Math.max(im.naturalWidth, im.naturalHeight);
  ctx.drawImage(im, -im.naturalWidth * s / 2, -im.naturalHeight * s / 2, im.naturalWidth * s, im.naturalHeight * s);
  ctx.restore();
}

function drawEnemy(e) {
  const h = e.d.size;
  drawShadow(e.x, e.y + 2, e.r);
  if (e.superior) { ctx.fillStyle = 'rgba(170,80,255,0.28)'; ctx.beginPath(); ctx.arc(e.x, e.y - h * 0.45, h * 0.6 + Math.sin(performance.now() / 180) * 4, 0, 7); ctx.fill(); }
  ctx.save();
  if (e.flash > 0) ctx.filter = 'brightness(1.8)';
  if (e.frozen > 0) ctx.filter = 'hue-rotate(160deg) brightness(1.2)';
  if (e.immune) ctx.globalAlpha = 0.55;
  drawSprite(wikiImage(e.formFile || e.d.file), e.x, e.y + 2, h, { color: e.d.boss ? '#8a2a2a' : e.d.elite ? '#7a5a2a' : '#6a6a4a', label: e.d.name[0] });
  ctx.restore();
  if (e.hp < e.maxHp && !e.d.boss) {
    const w = Math.max(30, e.r * 1.6);
    const by = Math.max(4, e.y - h - 8);
    ctx.fillStyle = '#c00'; ctx.fillRect(e.x - w / 2, by, w, 5);
    ctx.fillStyle = '#0c0'; ctx.fillRect(e.x - w / 2, by, w * Math.max(0, e.hp / e.maxHp), 5);
  }
  if ((e.d.elite || e.clueBoss || e.insane) && !e.d.boss) text(`${e.d.name} (level-${e.d.lvl})`, e.x, Math.max(14, e.y - h - 18), 12, e.clueBoss || e.insane ? '#ff981f' : '#ffff00');
  if (e.d.pker) {
    const sk = wikiImage(SKULL.file);
    if (ready(sk)) ctx.drawImage(sk, e.x - 10, Math.max(0, e.y - h - 44), 20, 20 * sk.naturalHeight / sk.naturalWidth);
  }
  if (e.tails) text(`${e.tails} tail${e.tails > 1 ? 's' : ''}`, e.x, e.y - h - 10, 13, '#7fd060');
  if (e.loot) text('Thief!', e.x, e.y - h - 10, 13, '#ffd34a');
  if (e.healer) text(e.aggro ? e.d.name : `${e.d.name} (healing)`, e.x, e.y - h - 18, 12, '#ff981f');
  if (e.immune) text('Immune', e.x, e.y - h - 30, 14, '#9fe8ff');
  if (e.d.boss === 'jad' && e.ai.windup) {
    const icon = wikiImage(e.ai.windup.style === 'magic' ? 'Magic_icon.png' : 'Ranged_icon.png');
    const px = run.p.x, y = Math.max(190, run.p.y - 140);
    ctx.fillStyle = e.ai.windup.style === 'magic' ? '#ff5a1a' : '#e8c060';
    ctx.beginPath(); ctx.arc(px, y, 26, 0, 7); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
    if (ready(icon)) ctx.drawImage(icon, px - 16, y - 16, 32, 32);
    text(e.ai.windup.style === 'magic' ? 'Magic! Pray 3' : 'Ranged! Pray 2', px, y - 42, 22, '#fff');
  }
}

// OSRS-style yellow overhead chat
function drawOverheads() {
  const list = [];
  if (run.p.over) list.push({ x: run.p.x, y: run.p.y - HERO_H - 46, o: run.p.over });
  for (const e of enemies) if (e.over) list.push({ x: e.x, y: e.y - e.d.size - 36, o: e.over });
  for (const it of list) text(it.o.text, clamp(it.x, 160, WORLD_W - 160), Math.max(100, it.y), 18, '#ffff00');
}

function drawSplat(s) {
  const a = Math.min(1, s.t * 3);
  const y = s.y - (0.8 - s.t) * 20;
  ctx.globalAlpha = a;
  ctx.fillStyle = s.kind === 'miss' ? '#2a5adf' : s.kind === 'poison' ? '#3c9a2a' : s.kind === 'venom' ? '#1f7a6a' : s.kind === 'heal' ? '#c0309a' : '#b00000';
  ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
  ctx.beginPath();
  const R = s.crit ? 19 : 15;
  for (let i = 0; i < 16; i++) {
    const r = i % 2 ? R * 0.68 : R, an = i / 16 * Math.PI * 2;
    ctx.lineTo(s.x + Math.cos(an) * r, y + Math.sin(an) * r);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  text(String(s.v), s.x, y + 1, s.crit ? 17 : 14, '#fff');
  ctx.globalAlpha = 1;
}

function drawTitleBackdrop() {
  area = AREAS[0];
  drawGround();
  area = null;
  const t = performance.now() / 1000;
  const parade = ['chicken', 'cow', 'goblin', 'skeleton', 'moss_giant', 'lesser_demon', 'black_demon'];
  parade.forEach((id, i) => {
    const d = MONSTERS[id];
    const x = ((t * 40 + i * 210) % (WORLD_W + 200)) - 100;
    drawShadow(x, WORLD_H - 70, d.size * 0.36);
    drawSprite(wikiImage(d.file), x, WORLD_H - 68, d.size, { color: '#6a6a4a', label: d.name[0] });
  });
}

// ======================================================================
// HUD
// ======================================================================
const $ = (id) => document.getElementById(id);
// Left sidebar: what you're wearing, rebuilt only when gear changes.
let gearBarKey = '';
function drawGearBar() {
  const key = SLOTS.map((sl) => run.gear[sl] || '').join('|');
  if (key === gearBarKey) return;
  gearBarKey = key;
  const bar = $('gearBar'); bar.innerHTML = '';
  for (const sl of SLOTS) {
    const it = run.gear[sl] ? ITEMS[run.gear[sl]] : null;
    const box = el('div', 'gs' + (it ? '' : ' empty'));
    box.title = it ? `${SLOT_NAME[sl]}: ${it.name}` : `${SLOT_NAME[sl]}: empty`;
    if (it) box.appendChild(imgTag(it.file, it.name));
    bar.appendChild(box);
  }
}
function drawHud() {
  const st = stats(), p = run.p;
  $('hpBar').firstElementChild.style.width = `${clamp(p.hp / st.maxHp, 0, 1) * 100}%`;
  $('hpBar').lastElementChild.textContent = `${Math.max(0, Math.ceil(p.hp))} / ${st.maxHp}`;
  $('ppBar').firstElementChild.style.width = `${clamp(p.pp / st.maxPp, 0, 1) * 100}%`;
  $('ppBar').lastElementChild.textContent = `Prayer ${Math.ceil(p.pp)} / ${st.maxPp}`;
  $('waveName').textContent = area.name;
  const left = enemies.length + Math.max(0, isBoss ? 0 : toSpawn);
  const T = timeLimit(), tl = Math.max(0, Math.ceil(T - run.stageT));
  const timer = T ? (run.enraged ? ' · Enraged!' : ` · ${Math.floor(tl / 60)}:${String(tl % 60).padStart(2, '0')} left`) : '';
  $('waveSub').textContent = run.bonus ? `Bonus round · ${left} left` : `Area ${areaIndex() + 1} of ${AREAS.length} · ` + (isBoss ? 'Boss fight' : `Wave ${subIndex() + 1} of ${WAVES_PER_AREA} · ${left} left`) + timer + (run.skull ? ' · Skulled' : '');
  $('goldTxt').textContent = run.gold.toLocaleString();
  drawGearBar();
  $('sharkN').textContent = '×' + run.inv.shark;
  $('ppotN').textContent = '×' + run.inv.ppot;
  const S = SPECS[run.gear.weapon], sb = $('specBtn');
  if (sb) {
    const e = Math.floor(run.spec);
    $('specN').textContent = S ? `${e}%` : '—';
    sb.style.setProperty('--fill', `${S ? e : 0}%`);
    sb.classList.toggle('ready', !!S && run.spec >= specCost(S));
    sb.classList.toggle('none', !S);
    sb.title = S ? `${S.name}: ${specCost(S)}% energy (Space)` : 'This weapon has no special attack';
  }
  const bb = $('bossbar');
  if (bossAlive && !bossAlive.dead) {
    bb.hidden = false;
    const extra = bossAlive.d.boss === 'zulrah' ? ` · ${ZULRAH_FORMS[bossAlive.ai.form || 0].name}` : bossAlive.d.boss === 'verzik' ? ` · phase ${bossAlive.ai.vphase || 1}` : bossAlive.d.boss === 'kq' && bossAlive.ai.form2 ? ' · airborne' : '';
    $('bossName').textContent = `${bossAlive.d.name}${bossAlive.d.lvl ? ` (level-${bossAlive.d.lvl})` : ''}${extra}`;
    $('bossHp').firstElementChild.style.width = `${clamp(bossAlive.hp / bossAlive.maxHp, 0, 1) * 100}%`;
  } else bb.hidden = true;
}

const chatEl = $('chat');
function chat(msg, cls) {
  const d = document.createElement('div');
  if (cls) d.className = cls;
  d.textContent = msg;
  chatEl.appendChild(d);
  while (chatEl.children.length > 6) chatEl.firstChild.remove();
}
function chatClear() { chatEl.innerHTML = ''; }

// ======================================================================
// Screens
// ======================================================================
const screen = $('screen');
function showScreen(node) {
  screen.innerHTML = '';
  if (!node) { screen.hidden = true; $('hud').hidden = !run || mode === 'title'; return; }
  screen.hidden = false;
  screen.appendChild(node);
  $('hud').hidden = mode !== 'paused';
}
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
function btn(label, cls, onClick) { const b = el('button', cls, label); b.type = 'button'; b.addEventListener('click', onClick); return b; }

let pickedHero = HEROES[0];
let pickedKit = 0; // starting kit for heroes that offer a choice
function heroBoostText(h) {
  return Object.entries(h.skills || {}).map(([id, lv]) => `${SKILLS.find((k) => k.id === id).name} ${lv}`).join(', ');
}
function renderTitle() {
  mode = 'title'; run = null;
  const best = loadBest();
  const s = el('div', 'sheet');
  s.appendChild(el('h1', '', 'RuneRogue'));
  s.appendChild(el('p', '', `Pick a hero from Gielinor and fight your way out from Lumbridge. Each of the ${AREAS.length} areas has ${WAVES_PER_AREA} waves and then its own boss. Any hero can use any weapon or armour; each starts with a weapon and a boost in their natural skill. Gold buys skill levels and gear for every equipment slot.`));
  const g = el('div', 'grid heroes');
  for (const h of HEROES) {
    const open = heroUnlocked(h);
    const c = el('button', 'card' + (h === pickedHero ? ' sel' : '') + (open ? '' : ' locked'));
    c.type = 'button';
    if (!open && h.unlock.secret) {
      // surprise unlock: a mystery card with only a hint
      c.appendChild(el('div', 'art', '<span style="font-size:64px;line-height:1;color:var(--orange)">?</span>'));
      c.appendChild(el('div', 'nm', '???'));
      c.appendChild(el('div', 'ds', h.unlock.secret));
      g.appendChild(c);
      continue;
    }
    const art = el('div', 'art'); art.appendChild(imgTag(h.file, h.name)); c.appendChild(art);
    c.appendChild(el('div', 'nm', h.name));
    const lane = el('div', 'lane'); lane.appendChild(imgTag(LANE_ICON[h.lane], LANE_NAME[h.lane])); const extra = Object.keys(h.gear || {}).length;
    lane.appendChild(document.createTextNode(`${heroBoostText(h)} · ${h.kits ? `pick 1 of ${h.kits.length} starting kits` : `starts with ${ITEMS[h.weapon].name}${extra ? ` + ${extra} item${extra > 1 ? 's' : ''}` : ''}`}`)); c.appendChild(lane);
    c.appendChild(el('div', 'ds', h.perk));
    if (best[h.id]) c.appendChild(el('div', 'ds', best[h.id] > 900 ? '<b style="color:var(--orange)">Infernal cape earned</b>' : `Best: ${AREAS[Math.min(AREAS.length - 1, Math.floor((best[h.id] - 1) / (WAVES_PER_AREA + 1)))].name}`));
    if (!open) {
      const canBuy = h.unlock.sticks && meta.sticks >= h.unlock.sticks;
      c.appendChild(el('div', 'unlock', canBuy ? `Buy for ${h.unlock.sticks} trading sticks` : unlockText(h)));
      c.addEventListener('click', () => {
        if (!canBuy) return;
        meta.sticks -= h.unlock.sticks; meta.heroes.push(h.id); saveMeta();
        pickedHero = h; sfx(900, 0.1, 'triangle', 0.05); renderTitle();
      });
      g.appendChild(c);
      continue;
    }
    c.addEventListener('click', () => { if (pickedHero !== h) pickedKit = 0; pickedHero = h; renderTitle(); playMusic(MUSIC_TITLE); });
    c.addEventListener('dblclick', () => { if (pickedHero !== h) pickedKit = 0; pickedHero = h; begin(); });
    g.appendChild(c);
  }
  s.appendChild(g);
  if (pickedHero.kits && heroUnlocked(pickedHero)) {
    // harder-to-reach heroes let you choose how they start
    s.appendChild(el('h3', '', `${pickedHero.name}: starting kit`));
    const kr = el('div', 'row');
    pickedHero.kits.forEach((k, i) => {
      const kb = btn('', 'btn' + (i === pickedKit ? ' sel' : ''), () => { pickedKit = i; renderTitle(); });
      kb.appendChild(imgTag(ITEMS[k.weapon].file, ITEMS[k.weapon].name));
      const n = Object.keys(k.gear || {}).length;
      kb.appendChild(document.createTextNode(` ${k.name}: ${ITEMS[k.weapon].name}${n ? ` + ${n} item${n > 1 ? 's' : ''}` : ''}`));
      if (i === pickedKit) kb.style.outline = '2px solid var(--orange)';
      kr.appendChild(kb);
    });
    s.appendChild(kr);
  }
  const r = el('div', 'row'); r.style.marginTop = '16px';
  r.appendChild(el('p', '', 'Move with <kbd>WASD</kbd> or arrows (on touch, drag anywhere). Attacks are automatic. Prayers <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>, eat <kbd>E</kbd>, prayer potion <kbd>Q</kbd>, music <kbd>M</kbd>, pause <kbd>P</kbd>.'));
  const b = btn(`Play as ${pickedHero.name}`, 'btn big', begin);
  const ub = btn('', 'btn', renderUpgrades);
  ub.appendChild(imgTag(STICKS_FILE, 'Trading sticks')); ub.appendChild(document.createTextNode(` Upgrades (${meta.sticks.toLocaleString()} sticks)`));
  ub.classList.add('sticks-btn');
  r.appendChild(ub);
  const nDone = ACHIEVEMENTS.filter((a) => (meta.ach || {})[a.id]).length;
  const ab = btn('', 'btn', renderAchievements);
  ab.appendChild(imgTag(ACH_TIERS.elite.file, 'Achievements')); ab.appendChild(document.createTextNode(` Achievements (${nDone}/${ACHIEVEMENTS.length})`));
  ab.classList.add('sticks-btn');
  r.appendChild(ab);
  const rl = raidLevel(meta.invo || {});
  const ib = btn('', 'btn', renderInvocations);
  ib.appendChild(imgTag(INVO_ICON.warden, 'Invocations')); ib.appendChild(document.createTextNode(` Invocations (raid level ${rl})`));
  ib.classList.add('sticks-btn');
  r.appendChild(ib);
  const nPets = Object.keys(meta.pets || {}).length;
  const pb = btn('', 'btn', renderPets);
  const shown = PETS.find((x) => x.id === meta.pet) || PETS.find((x) => (meta.pets || {})[x.id]);
  if (shown) pb.appendChild(imgTag(shown.file, 'Pets'));
  pb.appendChild(document.createTextNode(` Pets (${nPets}/${PETS.length})`));
  pb.classList.add('sticks-btn');
  r.appendChild(pb);
  const mb = btn(musicOn ? 'Music: on' : 'Music: off', 'btn', () => { toggleMusic(); mb.textContent = musicOn ? 'Music: on' : 'Music: off'; });
  r.appendChild(mb);
  r.appendChild(b);
  s.appendChild(r);
  s.appendChild(el('p', '', '<small>Images and music load live from the <a style="color:var(--orange)" href="https://oldschool.runescape.wiki/" target="_blank" rel="noopener">Old School RuneScape Wiki</a> (CC BY-NC-SA 3.0). Game art and music © Jagex Ltd. Fan-made and non-commercial.</small>'));
  showScreen(s);
  b.focus();
}
function begin() { sfx(440, 0.1, 'triangle', 0.05); newRun(pickedHero); }

// ---------- Shop ----------
let offers = [];
// Rarer items get likelier the further into the run you are (every wave counts), and with the luck upgrade.
function rarityWeight(it) {
  const prog = run.stage / Math.max(1, TOTAL_STAGES - 1);
  let wt = RARITY_WEIGHT[it.rarity] * (1 + RARITY_GROWTH[it.rarity] * prog);
  if (it.rarity !== 'common') wt *= 1 + luckVal() * (it.rarity === 'uncommon' ? 0.5 : 1);
  return wt;
}
function itemScore(it) { return it ? it.price + it.tier * 10 : -1; }
function rollOffers(fresh) {
  const style = weaponStyle(), a = areaIndex();
  const pool = Object.values(ITEMS).filter((it) => {
    if (it.start || it.price <= 0) return false;
    if (it.tier > a + 1) return false;
    if (it.rarity === 'mega' && a < 10) return false;
    if (it.slot !== 'food') {
      const cur = run.gear[it.slot] ? ITEMS[run.gear[it.slot]] : null;
      // Skip downgrades, but still offer weapons of another style so you can switch.
      if (cur && cur.lane === it.lane && itemScore(cur) >= itemScore(it)) return false;
      if (cur && cur.id === it.id) return false;
    }
    return true;
  });
  // Weight: items near your area's tier are likeliest; rarity makes top items scarce.
  const bag = pool.map((it) => {
    const gap = a - it.tier;
    let wt = Math.max(0.04, Math.exp(-((gap - 0.5) * (gap - 0.5)) / 6)) * rarityWeight(it);
    if (it.lane === style) wt *= 1.6; // gear for the weapon you hold turns up more often
    if (it.slot === 'food') wt = 0.5 * supplyMult(run.invo);
    if (!run.gear[it.slot] && it.slot !== 'food') wt *= 1.4;
    return { it, wt };
  });
  const picks = [];
  while (picks.length < 5 && bag.length) {
    const total = bag.reduce((x, b) => x + b.wt, 0);
    let r = Math.random() * total, i = 0;
    while (i < bag.length - 1 && r > bag[i].wt) { r -= bag[i].wt; i++; }
    picks.push({ it: bag[i].it, sold: false });
    bag.splice(i, 1);
  }
  offers = picks;
  if (fresh) { run.rerolls = 0; run.freeRerolls = upVal('reroll'); }
}

function skillCost(sk) {
  // Tuned so a run that focuses one skill can reach 99 by the end (about 14,500 gp from 1 to 99).
  const lvl = run.skills[sk.id];
  return Math.round((4 + 0.045 * lvl * lvl) * ((run.hero.mods || {}).skillCost || 1));
}

function itemStatsText(it) {
  if (it.desc) return it.desc;
  const bits = [];
  if (it.w) {
    const w = it.w;
    bits.push(`${LANE_NAME[KIND_STYLE[w.kind]]} weapon`);
    bits.push(`${w.dmg} dmg every ${w.cd}s`);
    if (w.wt && WEAPON_TYPES[w.wt]) bits.push(WEAPON_TYPES[w.wt].info);
    if (w.spell) bits.push(`casts ${w.spell}`);
    if (w.kind === 'swing') bits.push(w.arc > 6 ? 'hits all around you' : `reach ${Math.round(w.reach * MELEE_REACH)}`);
    if (w.hits) bits.push(`${w.hits} hits per swing`);
    if (w.count > 1) bits.push(`${w.count} arrows`);
    if (w.pierce > 1) bits.push(`pierces ${w.pierce}`);
    if (w.bounce) bits.push(`bounces ${w.bounce}`);
    if (w.splash) bits.push(`splash ${w.splash}`);
    if (w.freeze) bits.push('freezes');
    if (w.leech) bits.push('heals you');
    if (w.tbow) bits.push('stronger vs high levels');
    const S = SPECS[it.id];
    if (S) bits.push(`<b>Special: ${S.name}</b> (${S.cost}% energy): ${S.info}`);
  }
  if (it.barrows) { const B = BARROWS_SETS[it.barrows]; bits.push(`<b>${B.name} set (${B.effect})</b>, all 4 pieces: ${B.info}`); }
  if (it.proc) bits.push(`<b>${BOLT_PROCS[it.proc].name}</b>: ${BOLT_PROCS[it.proc].info}`);
  if (it.def) bits.push(`${it.def > 0 ? '+' : ''}${it.def} defence`);
  if (it.dmg) bits.push(`+${Math.round(it.dmg * 100)}% ${it.lane === 'any' ? '' : LANE_NAME[it.lane] + ' '}damage`);
  if (it.hp) bits.push(`+${it.hp} hitpoints`);
  if (it.pp) bits.push(`+${it.pp} prayer`);
  if (it.aspd) bits.push(`+${Math.round(it.aspd * 100)}% attack speed`);
  if (it.range) bits.push(`+${Math.round(it.range * 100)}% range`);
  if (it.pierce) bits.push(`+${it.pierce} pierce`);
  if (it.speed) bits.push(`+${Math.round(it.speed * 100)}% run speed`);
  if (it.gold) bits.push(`+${Math.round(it.gold * 100)}% gold`);
  if (armourPenalty(it)) bits.push(`<span style="color:var(--red)">-${Math.round(armourPenalty(it) * 100)}% ${LANE_NAME[WEAK_STYLE[it.lane]]} damage</span>`);
  if (it.regen) bits.push(`heals ${it.regen} HP a second`);
  if (it.taken) bits.push(`${Math.round((1 - it.taken) * 100)}% less damage taken`);
  return bits.join(' · ');
}

function equip(it) {
  const st0 = stats();
  run.gear[it.slot] = it.id;
  const st1 = stats();
  run.p.hp += Math.max(0, st1.maxHp - st0.maxHp);
}

function buy(offer) {
  const it = offer.it;
  if (run.gold < it.price) return;
  if (it.slot === 'food') {
    if (run.inv[it.id] >= 5) { chat('You can\'t carry more than 5 of those.', 'r'); return; }
    run.inv[it.id]++;
  } else equip(it);
  run.gold -= it.price;
  offer.sold = true;
  run.bought++; achEvent('buy', it); achEvent('gear', it);
  chat(`You buy ${it.name}.`, 'g');
  sfx(900, 0.08, 'triangle', 0.05);
  renderShop();
}

let trainStep = 1; // levels bought per tap: 1, 5 or 10
function trainCost(sk, n) {
  let total = 0;
  const lv = run.skills[sk.id];
  for (let i = 0; i < n && lv + i < 99; i++) { run.skills[sk.id] = lv + i; total += skillCost(sk); }
  run.skills[sk.id] = lv;
  return total;
}
function trainSkill(sk) {
  const n = Math.min(trainStep, 99 - run.skills[sk.id]);
  const cost = trainCost(sk, n);
  if (n <= 0 || run.gold < cost) return;
  const st0 = stats();
  run.gold -= cost;
  run.skills[sk.id] += n;
  achEvent('train', sk);
  const st1 = stats();
  run.p.hp += Math.max(0, st1.maxHp - st0.maxHp);
  chat(`Congratulations, you've just advanced your ${sk.name} level. You are now level ${run.skills[sk.id]}.`, 'b');
  [523, 659, 784].forEach((f, i) => setTimeout(() => sfx(f, 0.12, 'triangle', 0.05), i * 90));
  renderShop();
}

// OSRS Worn Equipment layout
const EQUIP_LAYOUT = [null, 'head', null, 'cape', 'neck', 'ammo', 'weapon', 'body', 'shield', null, 'legs', null, 'hands', 'feet', 'ring'];
function equipmentPanel() {
  const g = el('div', 'equip');
  for (const slot of EQUIP_LAYOUT) {
    if (!slot) { g.appendChild(el('div', 'gap')); continue; }
    const id = run.gear[slot];
    const d = el('div', 'slot' + (id ? '' : ' empty')); d.title = id ? `${SLOT_NAME[slot]}: ${ITEMS[id].name}` : `${SLOT_NAME[slot]}: empty`;
    if (id) d.appendChild(imgTag(ITEMS[id].file, ITEMS[id].name));
    d.appendChild(el('span', '', SLOT_NAME[slot]));
    g.appendChild(d);
  }
  return g;
}

// What changes if you wear this instead of what you have now.
// Rough real damage per second against one target, counting crits, multishot and boss bonuses.
function effectiveDps(d) {
  const st = stats(), w = st.weapon;
  const tb = w.tbow && d ? 1 + Math.min(1.2, d.lvl / 400) : 1;
  return weaponDps(st) * 0.8 * tb * (1 + st.crit * (1 + 0.5 * bv('crit'))) * (1 + bv('multi')) * (1 + 0.25 * bv('giant')) * ((run.hero.mods || {}).bossDmg || 1);
}
function weaponDps(st) { const w = st.weapon; return w.dmg * (w.hits || 1) * (w.count || 1) / w.cd * st.dmgMult * st.aspd; }
function compareText(it) {
  if (it.slot === 'food') return '';
  const before = stats();
  const old = run.gear[it.slot];
  run.gear[it.slot] = it.id;
  const after = stats();
  run.gear[it.slot] = old;
  const out = [];
  const pct = (a, b) => Math.round((b / a - 1) * 100);
  const add = (label, v, unit = '%') => { if (v) out.push(`<span style="color:${v > 0 ? 'var(--green)' : 'var(--red)'}">${v > 0 ? '▲ +' : '▼ '}${v}${unit} ${label}</span>`); };
  add('damage per second', pct(weaponDps(before), weaponDps(after)));
  add('blocked', Math.round((after.reduce - before.reduce) * 100), ' pts');
  add('hitpoints', after.maxHp - before.maxHp, '');
  add('prayer', after.maxPp - before.maxPp, '');
  add('damage taken', -pct(before.taken, after.taken));
  add('run speed', pct(before.speed, after.speed));
  add('gold', pct(before.goldMult, after.goldMult));
  add('crit', Math.round((after.crit - before.crit) * 100), ' pts');
  if (after.weapon.kind !== before.weapon.kind) out.push(`<span style="color:var(--yellow)">Switches you to ${LANE_NAME[KIND_STYLE[after.weapon.kind]]}</span>`);
  return out.length ? out.join('<br>') : '<span style="color:var(--muted)">No change for your current weapon</span>';
}
function offerCard(it, priceLabel, onClick, sold) {
  const c = el('button', `card offer${sold ? ' sold' : ''} r-${it.rarity}`); c.type = 'button';
  const art = el('div', 'art'); art.appendChild(imgTag(it.file, it.name)); c.appendChild(art);
  c.appendChild(el('div', 'nm', it.name));
  c.appendChild(el('div', `rar ${it.rarity}`, RARITY_NAME[it.rarity]));
  const cur = it.slot !== 'food' && run.gear[it.slot] ? ITEMS[run.gear[it.slot]].name : null;
  const slotTxt = it.slot === 'food' ? 'Supply' : `${SLOT_NAME[it.slot]}${cur ? ` (replaces ${cur})` : ''}`;
  c.appendChild(el('div', 'ds', `<b style="color:var(--yellow)">${slotTxt}</b><br>${itemStatsText(it)}`));
  if (!sold && it.slot !== 'food') c.appendChild(el('div', 'ds cmp', compareText(it)));
  const pr = el('div', 'price');
  if (priceLabel !== 'Free') pr.appendChild(imgTag('Coins_10000.png', 'Coins'));
  pr.appendChild(document.createTextNode(priceLabel));
  c.appendChild(pr);
  c.addEventListener('click', onClick);
  return c;
}

function renderShop() {
  const st = stats();
  const s = el('div', 'sheet');
  const head = el('div', 'row');
  const ht = el('div');
  const doneArea = AREAS[areaIndex()];
  ht.appendChild(el('h2', '', isBoss ? `${doneArea.name} cleared!` : `${doneArea.name}: wave ${subIndex() + 1} cleared`));
  const ni = run.stage + 1, na = AREAS[Math.floor(ni / (WAVES_PER_AREA + 1))], nb = ni % (WAVES_PER_AREA + 1) === WAVES_PER_AREA;
  ht.appendChild(el('p', '', `Next: ${na.name}, ${nb ? '<b style="color:var(--red)">Boss fight</b>' : `wave ${(ni % (WAVES_PER_AREA + 1)) + 1}`}`));
  head.appendChild(ht);
  const purse = el('div', 'purse txt'); purse.appendChild(imgTag('Coins_10000.png', 'Coins')); purse.appendChild(el('span', '', `${run.gold.toLocaleString()} coins`));
  head.appendChild(purse);
  s.appendChild(head);

  const grid = el('div', 'grid shop');
  const left = el('div');
  const trainHead = el('div', 'row'); trainHead.style.justifyContent = 'space-between';
  trainHead.appendChild(el('div', 'sec-title', 'Train skills'));
  const steps = el('div', 'steps');
  steps.appendChild(el('span', 'steps-lbl', 'Levels per click:'));
  for (const n of [1, 5, 10]) {
    const sb = btn(`+${n} lvl${n > 1 ? 's' : ''}`, 'btn step' + (trainStep === n ? ' on' : ''), () => { trainStep = n; renderShop(); });
    steps.appendChild(sb);
  }
  trainHead.appendChild(steps);
  left.appendChild(trainHead);
  const sk = el('div', 'skills');
  for (const k of SKILLS) {
    const maxed = run.skills[k.id] >= 99;
    const cost = trainCost(k, trainStep);
    const b = el('button', 'skill'); b.type = 'button';
    b.title = k.info; b.disabled = maxed || run.gold < cost;
    b.appendChild(imgTag(k.file, k.name));
    const mid = el('div'); mid.appendChild(el('div', 'lv', `Level ${run.skills[k.id]}`)); mid.appendChild(el('div', 'nm', `${k.name}<br>${k.info}`));
    b.appendChild(mid);
    b.appendChild(el('div', 'cost', maxed ? 'Maxed' : `${cost.toLocaleString()} gp<br><small>to level ${Math.min(99, run.skills[k.id] + trainStep)}</small>`));
    b.addEventListener('click', () => trainSkill(k));
    sk.appendChild(b);
  }
  left.appendChild(sk);
  const eqRow = el('div', 'row'); eqRow.style.marginTop = '14px'; eqRow.style.alignItems = 'flex-start'; eqRow.style.justifyContent = 'flex-start';
  const eqCol = el('div'); eqCol.appendChild(el('div', 'sec-title', 'Worn Equipment')); eqCol.appendChild(equipmentPanel()); eqRow.appendChild(eqCol);
  const stl = el('div', 'stats');
  stl.innerHTML = `<span>Hitpoints</span><b>${Math.ceil(run.p.hp)} / ${st.maxHp}</b>
    <span>Damage</span><b>×${st.dmgMult.toFixed(2)}</b>
    <span>Attack speed</span><b>×${st.aspd.toFixed(2)}</b>
    <span>Damage blocked</span><b>${Math.round(st.reduce * 100)}%</b>
    <span>Critical hits</span><b>${Math.round(st.crit * 100)}%</b>
    <span>Gold bonus</span><b>×${st.goldMult.toFixed(2)}</b>
    <span>Sharks · Prayer pots</span><b>${run.inv.shark} · ${run.inv.ppot}</b>`;
  const boons = BOONS.filter((b) => bv(b.id)).map((b) => b.name + (bv(b.id) > 1 ? ` ${'I'.repeat(bv(b.id))}` : ''));
  if (boons.length) stl.innerHTML += `<span>Boons</span><b>${boons.join(', ')}</b>`;
  const signed = CONTRACTS.filter((c) => ycon(c.id));
  if (signed.length) stl.innerHTML += `<span>Yama contracts</span><b style="color:#ff8a7a">${signed.map((c) => `${c.name.replace('Contract of ', '')} (${c.cost.toLowerCase()})`).join('; ')}</b>`;
  eqRow.appendChild(stl);
  left.appendChild(eqRow);
  grid.appendChild(left);

  const right = el('div');
  right.appendChild(el('div', 'sec-title', 'Shop: any hero can use any item'));
  const of = el('div', 'grid offers');
  for (const o of offers) {
    const c = offerCard(o.it, o.sold ? 'Bought' : `${o.it.price.toLocaleString()} gp`, () => buy(o), o.sold);
    c.disabled = o.sold || run.gold < o.it.price;
    of.appendChild(c);
  }
  right.appendChild(of);
  const rr = el('div', 'row'); rr.style.marginTop = '12px';
  const free = run.freeRerolls > 0;
  const rerollCost = free ? 0 : 5 + run.rerolls * 4 + run.stage * 2;
  const rb = btn(free ? `Reroll (free, ${run.freeRerolls} left)` : `Reroll (${rerollCost} gp)`, 'btn', () => {
    if (free) run.freeRerolls--; else { run.gold -= rerollCost; run.rerolls++; }
    rollOffers(false); renderShop();
  });
  rb.disabled = run.gold < rerollCost;
  const nb2 = btn(nb ? 'Fight the boss' : 'Next wave', 'btn big', startStage);
  rr.appendChild(rb); rr.appendChild(nb2);
  right.appendChild(rr);
  grid.appendChild(right);
  s.appendChild(grid);
  showScreen(s);
  nb2.focus({ preventScroll: true });
}

function renderCasket(choices, tier = 3) {
  const s = el('div', 'sheet'); s.style.maxWidth = '720px';
  const head = el('div', 'row'); head.style.justifyContent = 'flex-start';
  head.appendChild(imgTag(casketFile(tier), 'Reward casket'));
  const t = el('div'); t.appendChild(el('h2', '', `You open the ${CLUE_TIERS[tier].name.toLowerCase()} reward casket`)); t.appendChild(el('p', '', 'Pick one item to keep. It is equipped straight away. Or skip to keep your current gear.'));
  head.appendChild(t);
  s.appendChild(head);
  const g = el('div', 'grid offers'); g.style.marginTop = '12px';
  for (const it of choices) {
    g.appendChild(offerCard(it, 'Free', () => {
      equip(it);
      chat(`You take the ${it.name} from the casket.`, 'g');
      achEvent('gear', it);
      sfx(900, 0.15, 'triangle', 0.06);
      mode = 'play'; showScreen(null);
    }));
  }
  if (!choices.length) g.appendChild(el('p', '', 'The casket is empty.'));
  s.appendChild(g);
  const r = el('div', 'row'); r.style.marginTop = '14px';
  r.appendChild(btn(choices.length ? 'Skip, keep my gear' : 'Close', 'btn', () => {
    chat('You leave the casket items behind.', 'b');
    achEvent('skipCasket');
    mode = 'play'; showScreen(null);
  }));
  s.appendChild(r);
  showScreen(s);
}

function renderPause() {
  const s = el('div', 'sheet'); s.style.maxWidth = '460px';
  s.appendChild(el('h2', '', 'Paused'));
  s.appendChild(el('p', '', `${area.name}. ${run.kills} kills so far.`));
  const r = el('div', 'row'); r.style.marginTop = '14px';
  const a = btn('Resume', 'btn', togglePause);
  r.appendChild(a); r.appendChild(btn('Quit run', 'btn', () => { saveBest(); renderTitle(); playMusic(MUSIC_TITLE); }));
  s.appendChild(r);
  showScreen(s);
  a.focus();
}

function renderGameOver() {
  const s = el('div', 'sheet'); s.style.maxWidth = '560px';
  s.appendChild(el('h1', '', 'Oh dear, you are dead!'));
  const art = el('div', 'end-art'); art.appendChild(imgTag('Bones.png', 'Bones')); s.appendChild(art);
  s.appendChild(el('p', '', `${run.hero.name} fell in ${area.name}${isBoss ? ` fighting ${MONSTERS[area.boss].name}` : ''}, with ${run.kills} kills and ${run.totalGold.toLocaleString()} coins earned.`));
  const r = el('div', 'row'); r.style.marginTop = '14px';
  s.appendChild(sticksLine());
  r.appendChild(btn('Choose hero', 'btn', () => { renderTitle(); playMusic(MUSIC_TITLE); }));
  r.appendChild(btn('Spend trading sticks', 'btn', renderUpgrades));
  const a = btn('Try again', 'btn big', () => newRun(run.hero));
  r.appendChild(a); s.appendChild(r);
  $('hud').hidden = true;
  screen.innerHTML = ''; screen.hidden = false; screen.appendChild(s);
  a.focus();
}

function sticksLine() {
  const p = el('div', 'purse txt'); p.style.margin = '10px auto 0'; p.style.justifyContent = 'center';
  p.appendChild(imgTag(STICKS_FILE, 'Trading sticks'));
  p.appendChild(el('span', '', `+${run.sticksGiven || 0} trading sticks (you have ${meta.sticks.toLocaleString()})`));
  return p;
}

// Permanent upgrades bought with trading sticks
function renderAchievements() {
  if (run && mode !== 'over') return;
  const done = meta.ach || {};
  const n = ACHIEVEMENTS.filter((a) => done[a.id]).length;
  const s = el('div', 'sheet');
  const head = el('div', 'row');
  head.appendChild(el('h2', '', 'Combat achievements'));
  head.appendChild(el('div', 'purse txt', `${n} / ${ACHIEVEMENTS.length} done`));
  s.appendChild(head);
  s.appendChild(el('p', '', 'Each one pays out trading sticks once. Bigger tiers pay more.'));
  for (const [tid, t] of Object.entries(ACH_TIERS)) {
    const list = ACHIEVEMENTS.filter((a) => a.tier === tid);
    const got = list.filter((a) => done[a.id]).length;
    const sec = el('div', 'sec-title ach-tier'); sec.appendChild(imgTag(t.file, t.name));
    sec.appendChild(document.createTextNode(` ${t.name} (${got}/${list.length}) · ${t.sticks} sticks each`));
    s.appendChild(sec);
    const g = el('div', 'ach-list');
    for (const a of list) {
      const row = el('div', 'ach-row' + (done[a.id] ? ' done' : ''));
      row.appendChild(el('div', 'ach-check', done[a.id] ? '✓' : ''));
      const txt = el('div'); txt.appendChild(el('div', 'ach-nm', a.name)); txt.appendChild(el('div', 'ach-ds', a.desc));
      row.appendChild(txt);
      g.appendChild(row);
    }
    s.appendChild(g);
  }
  const back = btn('Back to heroes', 'btn big', () => { renderTitle(); playMusic(MUSIC_TITLE); });
  const r = el('div', 'row'); r.style.marginTop = '14px'; r.appendChild(back); s.appendChild(r);
  showScreen(s);
}

function renderUpgrades() {
  if (run && mode !== 'over') return;
  const s = el('div', 'sheet');
  const head = el('div', 'row');
  head.appendChild(el('h2', '', 'Trading sticks upgrades'));
  const purse = el('div', 'purse txt'); purse.appendChild(imgTag(STICKS_FILE, 'Trading sticks')); purse.appendChild(el('span', '', `${meta.sticks.toLocaleString()} sticks`));
  head.appendChild(purse);
  s.appendChild(head);
  s.appendChild(el('p', '', 'Every run earns trading sticks, even when you die. Upgrades are permanent and apply to every hero.'));
  const g = el('div', 'skills upgrades');
  for (const u of UPGRADES) {
    const lv = upLevel(u.id), maxed = lv >= u.max, cost = upCost(u);
    const b = el('button', 'skill'); b.type = 'button';
    b.disabled = maxed || meta.sticks < cost;
    b.appendChild(imgTag(u.file, u.name));
    const mid = el('div');
    mid.appendChild(el('div', 'lv', `${lv}/${u.max}`));
    mid.appendChild(el('div', 'nm', `${u.name}<br>${lv ? u.info(lv * u.per) : 'not bought'}${maxed ? '' : ` → ${u.info((lv + 1) * u.per)}`}`));
    b.appendChild(mid);
    b.appendChild(el('div', 'cost', maxed ? 'Max' : `${cost} sticks`));
    b.addEventListener('click', () => {
      if (maxed || meta.sticks < cost) return;
      meta.sticks -= cost; meta.up[u.id] = lv + 1; saveMeta();
      sfx(900, 0.08, 'triangle', 0.05);
      renderUpgrades();
    });
    g.appendChild(b);
  }
  s.appendChild(g);
  const r = el('div', 'row'); r.style.marginTop = '14px'; r.style.justifyContent = 'flex-end';
  const back = btn('Back to heroes', 'btn big', () => { renderTitle(); playMusic(MUSIC_TITLE); });
  r.appendChild(back); s.appendChild(r);
  $('hud').hidden = true;
  screen.innerHTML = ''; screen.hidden = false; screen.appendChild(s);
}

// Invocations: pick challenges before a run, like the Tombs of Amascut.
function renderInvocations() {
  if (run && mode !== 'over') return;
  meta.invo = meta.invo || {};
  const set = meta.invo, rl = raidLevel(set);
  const s = el('div', 'sheet');
  const head = el('div', 'row');
  head.appendChild(el('h2', '', 'Invocations'));
  head.appendChild(el('div', 'purse txt', `Raid level ${rl} · ${raidMode(rl)} mode`));
  s.appendChild(head);
  s.appendChild(el('p', '', `Pick challenges for your next runs, inspired by the raids and the Colosseum. Each raid level adds 1% trading sticks and a little luck. Your choices stay on until you change them. Right now: +${rl}% sticks.`));
  let g = null, raidName = '';
  for (const v of INVOCATIONS) {
    if (v.raid !== raidName) { raidName = v.raid; const h = el('div', 'sec-title', raidName); h.style.marginTop = '14px'; s.appendChild(h); g = el('div', 'grid offers invos'); s.appendChild(g); }
    const on = !!set[v.id], locked = v.needs && !set[v.needs];
    const c = el('button', 'card offer invo' + (on ? ' sel' : '') + (locked ? ' locked' : '')); c.type = 'button';
    const art = el('div', 'art'); art.appendChild(imgTag(INVO_ICON[v.icon], v.name)); c.appendChild(art);
    c.appendChild(el('div', 'nm', v.name));
    c.appendChild(el('div', 'lvl', `+${v.lvl} raid levels`));
    c.appendChild(el('div', 'ds', v.info));
    if (locked) c.appendChild(el('div', 'unlock', `Needs ${INVOCATIONS.find((x) => x.id === v.needs).name}`));
    c.addEventListener('click', () => {
      if (locked) return;
      if (on) {
        delete set[v.id];
        // switching one off also switches off anything that needs it
        let changed = true;
        while (changed) { changed = false; for (const x of INVOCATIONS) if (set[x.id] && x.needs && !set[x.needs]) { delete set[x.id]; changed = true; } }
      } else {
        if (v.group) for (const x of INVOCATIONS) if (x.group === v.group) delete set[x.id];
        set[v.id] = true;
      }
      saveMeta();
      sfx(on ? 300 : 620, 0.06, 'triangle', 0.05);
      renderInvocations();
    });
    g.appendChild(c);
  }
  const r = el('div', 'row'); r.style.marginTop = '14px';
  r.appendChild(btn('Clear all', 'btn', () => { meta.invo = {}; saveMeta(); renderInvocations(); }));
  r.appendChild(btn('Back to heroes', 'btn big', () => { renderTitle(); playMusic(MUSIC_TITLE); }));
  s.appendChild(r);
  $('hud').hidden = true;
  screen.innerHTML = ''; screen.hidden = false; screen.appendChild(s);
}

// The Wilderness skull: risk it for bigger rewards while PKers hunt you.
function renderSkull() {
  mode = 'skull';
  const s = el('div', 'sheet yama'); s.style.maxWidth = '640px';
  const head = el('div', 'row'); head.style.justifyContent = 'flex-start';
  const art = el('div', 'yama-art'); art.appendChild(imgTag(SKULL.file, 'Skull')); head.appendChild(art);
  const t = el('div');
  t.appendChild(el('h2', '', 'You enter the Wilderness'));
  t.appendChild(el('p', '', 'Skull up for bigger rewards? The skull lasts until you leave the Wilderness.'));
  head.appendChild(t); s.appendChild(head);
  const g = el('div', 'grid offers'); g.style.marginTop = '12px';
  const go = () => { mode = 'play'; showScreen(null); };
  const sk = el('button', 'card offer contract'); sk.type = 'button';
  sk.appendChild(el('div', 'nm', 'Skull up'));
  sk.appendChild(el('div', 'ds gain', `▲ ×${SKULL.gold} gold and +${Math.round(SKULL.luck * 100)}% luck`));
  sk.appendChild(el('div', 'ds price-bad', '▼ PKers hunt you. Cheat death and you lose your most valuable item. Die and they take half this run\'s trading sticks.'));
  sk.appendChild(el('div', 'sign', 'Skull'));
  sk.addEventListener('click', () => {
    run.skull = true;
    chat('You are skulled! PKers are coming for you.', 'r');
    achEvent('skull');
    sfx(90, 0.5, 'sawtooth', 0.08);
    go();
  });
  g.appendChild(sk);
  const no = el('button', 'card offer'); no.type = 'button';
  no.appendChild(el('div', 'nm', 'Stay unskulled'));
  no.appendChild(el('div', 'ds', 'Fight through the Wilderness as normal.'));
  no.addEventListener('click', () => { chat('You stay unskulled.', 'b'); go(); });
  g.appendChild(no);
  s.appendChild(g);
  showScreen(s);
}

function renderVictory() {
  const s = el('div', 'sheet'); s.style.maxWidth = '560px';
  s.appendChild(el('h1', '', 'You defeated TzKal-Zuk!'));
  const art = el('div', 'end-art'); art.appendChild(imgTag('Infernal_cape.png', 'Infernal cape')); s.appendChild(art);
  s.appendChild(el('p', '', `${run.hero.name} fought from Lumbridge to the Inferno with ${run.kills} kills and earned the Infernal cape.`));
  s.appendChild(sticksLine());
  const r = el('div', 'row'); r.style.marginTop = '14px';
  r.appendChild(btn('Spend trading sticks', 'btn', renderUpgrades));
  r.appendChild(btn('Play again', 'btn big', () => { renderTitle(); playMusic(MUSIC_TITLE); }));
  s.appendChild(r);
  $('hud').hidden = true;
  screen.innerHTML = ''; screen.hidden = false; screen.appendChild(s);
  [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => sfx(f, 0.25, 'triangle', 0.06), i * 160));
}

// Preload arena sprites and the first area
for (const h of HEROES) wikiImage(h.file);
for (const id of [...AREAS[0].hordes, ...AREAS[0].elites, AREAS[0].boss]) wikiImage(MONSTERS[id].file);
wikiImage(AREAS[0].bg); preloadMap(AREAS[0]);
[STICKS_FILE, 'Coins_10000.png', 'Protect_from_Melee.png', 'Protect_from_Missiles.png', 'Protect_from_Magic.png', CLUE_FILE, CASKET_FILE].forEach(wikiImage);
// Warm the next area's art while you play
setInterval(() => {
  if (!run) return;
  const nxt = AREAS[Math.min(AREAS.length - 1, areaIndex() + 1)];
  wikiImage(nxt.bg); preloadMap(nxt); preloadMap(area);
  for (const id of [...nxt.hordes, ...nxt.elites, nxt.boss]) wikiImage(MONSTERS[id].file);
  for (const it of Object.values(ITEMS)) if (it.tier <= areaIndex() + 2) wikiImage(it.file);
}, 4000);

// First tap anywhere starts the title music (browsers block autoplay)
addEventListener('pointerdown', function first() { if (!musicTrack) playMusic(MUSIC_TITLE); removeEventListener('pointerdown', first); }, { once: true });
addEventListener('keydown', function firstKey() { if (!musicTrack) playMusic(MUSIC_TITLE); }, { once: true });

renderTitle();
requestAnimationFrame(frame);

// Test hook
window.RR = { get run() { return run; }, get meta() { return meta; }, stats: () => stats() };
// ======================================================================
// Creature and boss mechanics researched from each monster's OSRS Wiki page.
// game.js calls these hooks; the data lives in data.js (TRAITS, SPOOF_AREAS, CAMEOS).
// ======================================================================
let CR = null; // per-stage state: cameos, pillars, tornadoes, dead monsters for Jal-Zek, marks

function creatureStageStart() {
  CR = { t: 0, dead: [], pillars: null, tornados: [], cameos: [], mark: null, darkT: 0, nexDark: 0, spoofT: 0, hopT: 0, wooxDone: false };
  if (run) { run.weakT = 0; run.p.slowT = 0; }
  if (isBoss) return;
  const a = areaIndex(), sub = subIndex();
  if (SPOOF_AREAS[area.name] && sub === WAVES_PER_AREA - 1) CR.spoofT = 6 + Math.random() * 6;
  if (a === 0 && Math.random() < 0.6) CR.cowT = 4 + Math.random() * 8;
  if (a >= 1 && Math.random() < 0.3) CR.hopT = 8 + Math.random() * 14;
}

function hasDragonShield() { const s = run.gear.shield; return s === 'dragonfire_shield' || s === 'anti_dragon_shield'; }

// Called first thing in hurtPlayer: on-hit effects, then the adjusted damage.
function creatureHurtMods(raw, style, opts) {
  const elvargFire = bossAlive && !bossAlive.dead && bossAlive.id === 'elvarg' && style === 'magic' && !opts.pure;
  if ((opts.dragonfire || elvargFire) && hasDragonShield()) raw *= 0.35;
  if (opts.sphere) opts.fracCur = 0.66; // Olm's sphere: half your hitpoints unless the matching prayer blocks it
  if (opts.prayOff && run.prayer) { run.prayer = null; updatePrayerButtons(); chat('Your protection prayer has been switched off!', 'r'); }
  if (opts.slow) { if (!CR.slowTold) { CR.slowTold = true; chat('Jal-MejRah drains your run energy! You move slower for a moment.', 'r'); } run.p.slowT = Math.max(run.p.slowT || 0, opts.slow); }
  if (opts.weaken) { if (!(run.weakT > 0)) chat('You feel weakened: 15% less damage for a few seconds.', 'r'); run.weakT = Math.max(run.weakT || 0, opts.weaken); }
  return raw;
}

// Style a caster fires with. Jal-Ak reads your protection prayer and attacks with the other style.
function casterStyle(e) {
  if (!e.d.scan) return e.d.style;
  if (run.prayer === 'magic') return 'ranged';
  if (run.prayer === 'ranged') return 'magic';
  return Math.random() < 0.5 ? 'magic' : 'ranged';
}

// Damage the player deals, before it lands. Returns the new damage.
function creatureDamage(e, dmg) {
  if (e.d.lock && weaponStyle() !== e.d.lock && dmg > 0) dmg = Math.max(1, Math.round(dmg * 0.1));
  if (e.d.recoil && weaponStyle() === 'melee' && dmg > 0 && !(e.recoilCd > 0)) {
    e.recoilCd = 0.5; hurtPlayer(1 + areaIndex() * 0.6, 'melee', { pure: true });
  }
  if (e.id === 'blood_reaver' && dmg > 0) run.p.hp = Math.min(stats().maxHp, run.p.hp + dmg * 0.5);
  if (e.d.boss === 'mole') {
    // the wiki: between 50% and 5% hp, each hit has a 25% chance to make her burrow away
    const f = e.hp / e.maxHp;
    if (f <= 0.5 && f > 0.05 && !(e.ai.burrow > 0) && !(e.ai.digCd > 0) && Math.random() < 0.25) e.ai.dig = true;
  }
  if (e.d.boss === 'nex' && e.ai.kneel > 0 && dmg > 0) { // Blood Siphon: hitting her while she kneels heals her
    e.hp = Math.min(e.maxHp, e.hp + dmg);
    splats.push({ x: e.x, y: e.y - e.d.size * 0.6, v: dmg, t: 0.8, kind: 'poison' });
    return 0;
  }
  return dmg;
}

function silentDeath(e) { e.dead = true; burst(e.x, e.y, '#888', 10); }

function creatureDeath(e) {
  if (!CR) return;
  if (!e.summoned && !e.revived && !e.d.boss && !e.clueBoss && CR.dead.length < 30) CR.dead.push({ id: e.id, x: e.x, y: e.y });
  // heroes unlocked by killing a boss (Woox: the Corporeal Beast)
  for (const h of HEROES) if (h.unlock && h.unlock.boss === e.id && !meta.heroes.includes(h.id)) { meta.heroes.push(h.id); saveMeta(); chat(`New hero unlocked: ${h.name}!`, 'g'); }
  if (e.d.split) {
    const [into, n] = e.d.split, list = Array.isArray(into) ? into : Array(n).fill(into);
    list.forEach((id, i) => {
      const m = spawnMonster(id, e.x, e.y);
      const a = i * Math.PI * 2 / list.length;
      m.x = clamp(e.x + Math.cos(a) * 40, 20, WORLD_W - 20); m.y = clamp(e.y + Math.sin(a) * 30, 120, WORLD_H - 20);
    });
    chat(`The ${e.d.name} splits apart!`, 'r');
  }
  if (e.d.spoof) {
    const extra = Math.round(e.d.gold * 6 * stats().goldMult);
    for (let i = 0; i < 8; i++) coins.push({ x: e.x + (Math.random() - 0.5) * 100, y: e.y + (Math.random() - 0.5) * 100, v: Math.ceil(extra / 8), t: 0 });
    chat(`You defeat ${e.d.name} and loot his pile.`, 'g');
  }
}

// Called for each normal monster every frame.
function creatureTick(e, dt) {
  const p = run.p, d = e.d, dist = Math.hypot(p.x - e.x, p.y - e.y);
  e.age = (e.age || 0) + dt;
  if (e.recoilCd > 0) e.recoilCd -= dt;
  if (d.heals && (e.healT = (e.healT || 2.4) - dt) <= 0) {
    // Yt-MejKot: heals itself or a monster beside it that is below half hp
    e.healT = 2.4;
    const t = enemies.find((o) => !o.dead && !o.d.boss && o.hp < o.maxHp / 2 && Math.hypot(o.x - e.x, o.y - e.y) < 160);
    if (t) { t.hp = Math.min(t.maxHp, t.hp + t.maxHp * 0.08); burst(t.x, t.y - t.d.size * 0.4, '#5fd34a', 8); }
  }
  if (d.revive && (e.revT = (e.revT ?? 6) - dt) <= 0) {
    // Jal-Zek: brings back a slain monster at half hp, each only once
    e.revT = 7;
    const r = CR.dead.shift();
    if (r && MONSTERS[r.id] && !MONSTERS[r.id].split) {
      const m = spawnMonster(r.id, r.x, r.y); m.x = r.x; m.y = r.y; m.revived = true; m.hp = Math.round(m.maxHp / 2);
      fx.push({ kind: 'beam', x: e.x, y: e.y - d.size * 0.5, tx: r.x, ty: r.y - 30, t: 0.4, max: 0.4, color: '#ff5a1a' });
      chat(`Jal-Zek resurrects a ${m.d.name}!`, 'r');
    }
  }
  if (d.dig) {
    // Jal-ImKot: if it can't reach you for a while, it burrows and comes up beside you
    e.digT = dist > e.r + p.r + 30 ? (e.digT || 0) + dt : 0;
    if (e.digT > 6) {
      e.digT = 0; e.ai.burrow = 1.4; e.untargetable = true;
      e.ai.next = { x: clamp(p.x + (Math.random() - 0.5) * 80, 40, WORLD_W - 40), y: clamp(p.y + (Math.random() - 0.5) * 60, 130, WORLD_H - 40) };
      slam(e.ai.next.x, e.ai.next.y, 80, 1.4, e.dmg * 1.6, 'melee', '#c8a060', 'Dig!');
      burst(e.x, e.y, '#8a6a3c', 16);
    }
  }
  if (d.shaman && (e.shT = (e.shT ?? 4) - dt) <= 0) {
    e.shT = 6.5;
    if ((e.shN = (e.shN || 0) + 1) % 2) {
      // jump attack: lands where you stood, 3x3, typeless (prayer won't help)
      const tx = p.x, ty = p.y;
      slam(tx, ty, 80, 1.4, e.dmg * 1.5, 'melee', '#5fd34a', 'Jump!', { noPray: true });
      setTimeout(() => { if (!e.dead && mode === 'play') { e.x = tx; e.y = ty; burst(tx, ty, '#5fd34a', 14); } }, 1400);
    } else {
      // three purple spawns beside you that explode a few seconds later
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2, m = spawnMonster('shaman_spawn', p.x, p.y);
        m.x = clamp(p.x + Math.cos(a) * 70, 20, WORLD_W - 20); m.y = clamp(p.y + Math.sin(a) * 50, 120, WORLD_H - 20);
        m.summoned = true;
      }
    }
  }
  if (d.fuse && e.age > d.fuse && !e.blown) {
    e.blown = true;
    slam(e.x, e.y, 95, 0.2, 7 + areaIndex() * 1.5, 'melee', '#b04bff', '', { noPray: true });
    setTimeout(() => silentDeath(e), 200);
  }
  if (d.lock && e.age > 3 && dist < 110 && !e.blown) {
    // Nylocas burst when they get near you
    e.blown = true;
    slam(e.x, e.y, 110, 1.0, e.dmg * 2.2, d.lock === 'melee' ? 'melee' : d.lock, '#c8c8c8', 'Burst!');
    setTimeout(() => { if (!e.dead) silentDeath(e); }, 1000);
  }
  if (e.id === 'snakeling' && e.summoned && e.age > 40) silentDeath(e);
}

// Everything that isn't tied to one monster: timers, cameos, Verzik's pillars and tornadoes.
function creatureFrame(dt) {
  if (!CR || !run) return;
  const p = run.p;
  CR.t += dt;
  if (run.weakT > 0) run.weakT -= dt;
  if (p.slowT > 0) p.slowT -= dt;
  if (CR.darkT > 0) CR.darkT -= dt;
  // burrowed minions (Jal-ImKot) come back up
  for (const e of enemies) {
    if (e.d.boss || !(e.ai.burrow > 0)) continue;
    e.ai.burrow -= dt;
    if (e.ai.burrow <= 0) { e.untargetable = false; e.x = e.ai.next.x; e.y = e.ai.next.y; burst(e.x, e.y, '#8a6a3c', 20); }
  }
  // Nex's darkness: standing near her hurts
  if (CR.nexDark > 0) {
    CR.nexDark -= dt;
    const n = bossAlive;
    if (n && !n.dead && Math.hypot(p.x - n.x, p.y - n.y) < 190 && (CR.darkTick = (CR.darkTick || 0) - dt) <= 0) { CR.darkTick = 0.6; hurtPlayer(n.dmg * 0.25, 'magic', { pure: true }); }
  }
  // Nex's blood sacrifice mark
  if (CR.mark) {
    CR.mark.t -= dt;
    if (CR.mark.t <= 0) {
      const n = CR.mark.e; CR.mark = null;
      if (n && !n.dead && Math.hypot(p.x - n.x, p.y - n.y) < 300) {
        const before = p.hp;
        hurtPlayer(n.dmg * 2.2, 'magic', { pure: true });
        n.hp = Math.min(n.maxHp, n.hp + Math.max(0, before - p.hp));
        p.pp = Math.max(0, p.pp * 0.67);
        chat('The blood sacrifice heals Nex!', 'r');
      } else chat('You escape the blood sacrifice.', 'g');
    }
  }
  // Verzik's tornadoes: a hit takes half your hitpoints and heals her three times as much
  for (const t of CR.tornados) {
    const v = t.e;
    if (!v || v.dead) { t.dead = true; continue; }
    const a = Math.atan2(p.y - t.y, p.x - t.x);
    t.x += Math.cos(a) * 105 * dt; t.y += Math.sin(a) * 105 * dt;
    if (Math.hypot(p.x - t.x, p.y - t.y) < p.r + 22) {
      const hit = Math.max(5, Math.round(p.hp * 0.5));
      hurtPlayer(hit / 0.8, 'magic', { pure: true });
      v.hp = Math.min(v.maxHp, v.hp + hit * 3);
      burst(t.x, t.y, '#c03030', 16);
      const r = Math.random() * Math.PI * 2; t.x = v.x + Math.cos(r) * 60; t.y = v.y + Math.sin(r) * 60;
    }
  }
  CR.tornados = CR.tornados.filter((t) => !t.dead);
  // a player spoof joins the second wave
  if (CR.spoofT > 0 && (CR.spoofT -= dt) <= 0) {
    const id = SPOOF_AREAS[area.name], pos = spreadSpawn(), m = spawnMonster(id, pos.x, pos.y);
    chat(`${m.d.name} (level-${m.d.lvl}) attacks! ${m.d.spoof}`, 'r');
  }
  // Cow31337Killer turns up in Lumbridge and slays cows
  if (CR.cowT > 0 && (CR.cowT -= dt) <= 0) addCameo('cow31337');
  // Hopleez steals the loot you leave lying around
  if (CR.hopT > 0 && (CR.hopT -= dt) <= 0) addCameo('hopleez');
  // The Mysterious Adventurer (a tribute to Woox) helps against late bosses
  if (isBoss && !CR.wooxDone && areaIndex() >= 7 && bossAlive && !bossAlive.dead && bossAlive.hp < bossAlive.maxHp * 0.6) {
    CR.wooxDone = true;
    if (Math.random() < 0.35 && run.hero.id !== 'woox') addCameo('woox');
  }
  for (const c of CR.cameos) cameoTick(c, dt);
  CR.cameos = CR.cameos.filter((c) => !c.gone);
}

function addCameo(id) {
  const d = CAMEOS[id], side = Math.random() < 0.5 ? 40 : WORLD_W - 40;
  const c = { id, d, x: side, y: 160 + Math.random() * (WORLD_H - 220), t: 0, cd: 0, n: 0 };
  CR.cameos.push(c);
  chat(`${d.name} appears. ${d.line}`, 'b');
  burst(c.x, c.y, '#ffffff', 14);
}

function cameoTick(c, dt) {
  const p = run.p;
  c.t += dt; c.cd -= dt;
  let tx = null, ty = null;
  if (c.id === 'cow31337') {
    const cow = enemies.filter((e) => !e.dead && (e.id === 'cow' || e.id === 'cow_boss') && e.id !== 'cow_boss').sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
    if (cow) {
      tx = cow.x; ty = cow.y;
      if (Math.hypot(cow.x - c.x, cow.y - c.y) < 50 && c.cd <= 0) { c.cd = 1.2; c.swing = 0.25; damageEnemy(cow, cow.hp, true); if (++c.n === 1) say(c, 'Die, cow!'); }
    } else if (c.t > 6) c.leave = true;
  } else if (c.id === 'hopleez') {
    const coin = coins.slice().sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
    if (coin) {
      tx = coin.x; ty = coin.y;
      if (Math.hypot(coin.x - c.x, coin.y - c.y) < 24) { coin.got = true; coins = coins.filter((k) => !k.got); if (++c.n === 1) chat('Hopleez picks up your loot. He was here first.', 'r'); }
    }
    if (Math.hypot(p.x - c.x, p.y - c.y) < p.r + 26) { c.gone = true; burst(c.x, c.y, '#9fd8ff', 18); chat('Hopleez hops to another world.', 'g'); return; }
    if (c.t > 25) c.leave = true;
  } else if (c.id === 'woox') {
    const b = bossAlive && !bossAlive.dead ? bossAlive : null;
    if (b) {
      const d = Math.hypot(b.x - c.x, b.y - c.y);
      if (d > 260) { tx = b.x; ty = b.y; }
      if (c.cd <= 0 && d < 420) {
        c.cd = 0.6; c.swing = 0.2;
        fx.push({ kind: 'beam', x: c.x, y: c.y - 40, tx: b.x, ty: b.y - b.d.size * 0.4, t: 0.15, max: 0.15, color: '#9fd8ff' });
        b.hp -= Math.round(b.maxHp * 0.003);
        splats.push({ x: b.x, y: b.y - b.d.size * 0.5, v: Math.round(b.maxHp * 0.003), t: 0.8, kind: 'hit' });
        if (b.hp <= 1) b.hp = 1;
      }
    }
    if (c.t > 22 || !b) c.leave = true;
  }
  if (c.leave) { tx = c.x < WORLD_W / 2 ? -60 : WORLD_W + 60; ty = c.y; if (c.x < -40 || c.x > WORLD_W + 40) c.gone = true; }
  if (tx !== null) {
    const d = Math.hypot(tx - c.x, ty - c.y) || 1, sp = c.id === 'hopleez' ? 210 : 190;
    if (d > 20) { c.x += (tx - c.x) / d * sp * dt; c.y += (ty - c.y) / d * sp * dt; c.flip = tx < c.x; }
  }
  if (c.over) { c.over.t -= dt; if (c.over.t <= 0) c.over = null; }
  if (c.swing > 0) c.swing -= dt;
}

// Drawn after the monsters: cameos, Verzik's pillars and tornadoes, Nex's mark, and darkness.
function drawCreatureExtras() {
  if (!CR || !run) return;
  const p = run.p;
  for (const c of CR.cameos) {
    drawShadow(c.x, c.y + 2, 20);
    ctx.save(); if (c.swing > 0) ctx.filter = 'brightness(1.5)';
    drawSprite(wikiImage(c.d.file), c.x, c.y + 2, c.d.size, { flip: c.flip, color: '#5a7aaa', label: c.d.name[0] });
    ctx.restore();
    text(c.d.name, c.x, c.y - c.d.size - 10, 12, '#9fd8ff');
    if (c.over) text(c.over.text, c.x, c.y - c.d.size - 28, 18, '#ffff00');
  }
  if (CR.pillars) for (const pl of CR.pillars) {
    if (pl.hp <= 0) continue;
    ctx.fillStyle = '#6a5a5a'; ctx.strokeStyle = '#2a1a1a'; ctx.lineWidth = 3;
    ctx.fillRect(pl.x - 34, pl.y - 70, 68, 80); ctx.strokeRect(pl.x - 34, pl.y - 70, 68, 80);
    text(`Pillar ${'|'.repeat(pl.hp)}`, pl.x, pl.y - 80, 12, '#ffd0d0');
  }
  for (const t of CR.tornados) {
    ctx.strokeStyle = '#c03030'; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(t.x, t.y - i * 14, 22 - i * 3, 7, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  if (CR.mark) {
    ctx.strokeStyle = '#ff1a1a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(p.x, p.y - 40, 46 + Math.sin(CR.t * 12) * 4, 0, Math.PI * 2); ctx.stroke();
    text(`Run from Nex! ${Math.ceil(CR.mark.t)}`, p.x, p.y - 112, 16, '#ff6a6a');
  }
  if (CR.darkT > 0 || CR.nexDark > 0) {
    const g = ctx.createRadialGradient(p.x, p.y - 40, 90, p.x, p.y - 40, 420);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.88)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }
}

// ======================================================================
// Bosses. Returns true when the boss's attacks were handled here.
// ======================================================================
// ======================================================================
// Raid rooms: the bosses before each raid's final boss (wiki attacks), with their minions.
// Many attacks are about where you stand: safe tiles, hiding behind cover, quadrants, mazes.
// ======================================================================
const ARENA_TOP = 120;
const roomSpot = () => ({ x: 60 + Math.random() * (WORLD_W - 120), y: ARENA_TOP + 30 + Math.random() * (WORLD_H - ARENA_TOP - 60) });
const nearSpot = (p, s) => ({ x: clamp(p.x + (Math.random() - 0.5) * s, 40, WORLD_W - 40), y: clamp(p.y + (Math.random() - 0.5) * s, ARENA_TOP + 20, WORLD_H - 30) });
// a quadrant of the room as a rectangle telegraph (a wide "line")
function quadTele(q, delay, color, label, ex) {
  const h = (WORLD_H - ARENA_TOP) / 2, x = q % 2 ? WORLD_W / 2 : 0, y = ARENA_TOP + h * (q < 2 ? 0.5 : 1.5);
  telegraphs.push({ line: true, x, y, a: 0, len: WORLD_W / 2, w: h, t: delay, max: delay, color, dmg: 0, style: 'magic', label, noPray: true, ...ex });
}
const quadOf = (x, y) => (x > WORLD_W / 2 ? 1 : 0) + (y > ARENA_TOP + (WORLD_H - ARENA_TOP) / 2 ? 2 : 0);
// does the circle (cx, cy, r) block the straight line from a to b?
function blocks(ax, ay, bx, by, cx, cy, r) {
  const vx = bx - ax, vy = by - ay, L = vx * vx + vy * vy || 1;
  const t = clamp(((cx - ax) * vx + (cy - ay) * vy) / L, 0, 1);
  return t > 0.05 && t < 0.98 && Math.hypot(ax + vx * t - cx, ay + vy * t - cy) < r;
}
function rectBlocks(ax, ay, bx, by, R) {
  for (let i = 1; i < 20; i++) { const x = ax + (bx - ax) * i / 20, y = ay + (by - ay) * i / 20; if (x > R.x && x < R.x + R.w && y > R.y && y < R.y + R.h) return true; }
  return false;
}
function hpGate(e, hpf, marks) { // fires once as health passes each mark
  e.ai.gate = e.ai.gate || 0;
  if (e.ai.gate < marks.length && hpf < marks[e.ai.gate]) return ++e.ai.gate;
  return 0;
}
function styleShot(e, style, mult = 1) {
  if (style === 'melee') return;
  aimShot(e, 480, style, style === 'magic' ? '#4aa0ff' : '#c8a060', e.dmg * mult, { r: 13 });
}

const RAID_MECH = {
  // --- Tombs of Amascut ---
  baba(e, dt, p, hpf, dist, near) {
    // Ba-Ba (wiki): slams the ground around her, drops rocks from the ceiling, rolls boulders across the room, and calls baboons
    if (hpGate(e, hpf, [0.66, 0.33])) { summon(e, 'baboon_brawler', 2); summon(e, 'baboon_thrower', 1); chat('Ba-Ba calls her baboons!', 'r'); e.ai.phase = 2; e.ai.t = 0.5; }
    if (e.ai.t > 0) return;
    e.ai.t = 2.3;
    const r = e.ai.phase++ % 4;
    if (r === 0) slam(e.x, e.y, e.r + 110, 1.0, 0, 'melee', '#c8a060', 'Slam! Back off!', { noPray: true, frac: 0.35 });
    else if (r === 1) { slam(p.x, p.y, 60, 1.2, 0, 'melee', '#8a6a3c', 'Falling rocks!', { noPray: true, frac: 0.2 }); for (let i = 0; i < 6; i++) { const s = roomSpot(); slam(s.x, s.y, 60, 1.2, 0, 'melee', '#8a6a3c', '', { noPray: true, frac: 0.2 }); } }
    else if (r === 2) {
      // boulders roll down every lane but one: find the gap
      const lanes = 5, lh = (WORLD_H - ARENA_TOP) / lanes, gap = Math.floor(Math.random() * lanes);
      for (let i = 0; i < lanes; i++) if (i !== gap) telegraphs.push({ line: true, x: 0, y: ARENA_TOP + lh * (i + 0.5), a: 0, len: WORLD_W, w: lh - 6, t: 2.0, max: 2.0, color: '#a07a4a', dmg: 0, frac: 0.45, style: 'melee', label: i === (gap + 1) % lanes ? 'Boulders! Get in the gap!' : '', noPray: true });
    } else if (near) hurtPlayer(eDrain(e) * e.dmg * 1.6, 'melee', { from: e });
  },
  kephri(e, dt, p, hpf) {
    // Kephri (wiki): shielded while her scarab swarms crawl in to heal her; dung bombs explode on the floor where you stand;
    // soldier, spitting and arcane scarabs join her
    const g = hpGate(e, hpf, [0.75, 0.5, 0.25]);
    if (g) {
      e.ai.shieldT = 9; e.immune = true;
      for (let i = 0; i < 3 + g; i++) { const s = roomSpot(); const m = spawnMonster('scarab_swarm', s.x, s.y); m.feeds = e; m.summoned = true; m.master = e; }
      if (g < 3) { summon(e, 'soldier_scarab', 1); summon(e, g === 1 ? 'spitting_scarab' : 'arcane_scarab', 1); }
      chat('Kephri shields herself. Kill the scarab swarms before they reach her!', 'r');
    }
    if (e.ai.shieldT > 0) { e.ai.shieldT -= dt; if (e.ai.shieldT <= 0 || !enemies.some((m) => m.feeds === e && !m.dead)) { e.ai.shieldT = 0; e.immune = false; chat('Kephri\'s shield drops!', 'g'); } }
    if (e.ai.t > 0) return;
    e.ai.t = 2.2;
    if (e.ai.phase++ % 3 === 2) fan(e, 5, 0.16, 360, 'magic', '#ffd24a', e.dmg);
    else {
      slam(p.x, p.y, 65, 1.3, 0, 'magic', '#ff8a2a', 'Dung bomb!', { noPray: true, frac: 0.3 });
      for (let i = 0; i < 2 + Math.floor((1 - hpf) * 4); i++) { const s = nearSpot(p, 420); slam(s.x, s.y, 65, 1.3, 0, 'magic', '#ff8a2a', '', { noPray: true, frac: 0.3 }); }
    }
  },
  akkha(e, dt, p, hpf, dist, near) {
    // Akkha (wiki): switches between melee, ranged and magic; leaves a shadow at each 20% that must die first;
    // "memory" quadrants explode in order; enraged, unstable orbs drift after you
    const g = hpGate(e, hpf, [0.8, 0.6, 0.4, 0.2]);
    if (g) { const s = roomSpot(); const m = spawnMonster('akkha_shadow', s.x, s.y); m.summoned = true; m.master = e; e.ai.shadow = m; chat('Akkha splits off a shadow. Kill it to reach him!', 'r'); }
    e.immune = !!(e.ai.shadow && !e.ai.shadow.dead);
    if (hpf < 0.2 && (e.ai.orbT = (e.ai.orbT || 0) - dt) <= 0) { e.ai.orbT = 3; hazards.push({ x: e.x, y: e.y, r: 34, t: 9, color: '#b04bff', dps: e.dmg * 1.2, chase: 70 }); }
    if (e.ai.t > 0) return;
    e.ai.t = 1.9;
    if (e.ai.phase % 4 === 0) e.ai.style = ['melee', 'ranged', 'magic'][Math.floor(Math.random() * 3)];
    const st = e.ai.style || 'magic';
    if (++e.ai.phase % 6 === 0) {
      // memory: quadrants light up one after another, then explode in the same order. Stand in the last one.
      const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      order.forEach((q, i) => quadTele(q, 1.6 + i * 0.8, '#b04bff', i === 0 ? 'Memory! Remember the order' : '', { frac: 0.5 }));
      chat('Akkha\'s quadrants explode one after another. Move into the one that just went off!', 'r');
    } else if (st === 'melee') { if (near) hurtPlayer(eDrain(e) * e.dmg * 1.5, 'melee', { from: e }); else slam(p.x, p.y, 70, 1.1, 0, 'melee', '#d8c8a0', 'Akkha leaps!', { frac: 0.3 }); }
    else styleShot(e, st, 1.3);
  },
  zebak(e, dt, p, hpf) {
    // Zebak (wiki): magic and ranged rocks, poison pools, blood clouds that heal him, waves of water,
    // and the Great Roar, which hits hard unless you are behind a stone
    if (!e.ai.stones) e.ai.stones = [0.22, 0.5, 0.78].map((f) => ({ x: WORLD_W * f, y: WORLD_H * 0.62 + (Math.random() - 0.5) * 80 }));
    if (e.ai.roar > 0) {
      e.ai.roar -= dt;
      if (e.ai.roar <= 0) {
        const stone = e.ai.stones.find((j) => blocks(e.x, e.y, p.x, p.y, j.x, j.y, 44));
        fx.push({ kind: 'boom', x: e.x, y: e.y, r: 600, color: '#ff4a1a', t: 0.4, max: 0.4 });
        if (stone) { burst(stone.x, stone.y, '#9a9a9a', 20); chat('The stone shields you from the roar.', 'g'); }
        else hurtPlayer(0, 'melee', { pure: true, frac: 0.7 });
      }
      return;
    }
    if (e.ai.t > 0) return;
    e.ai.t = 2.1;
    const r = e.ai.phase++ % 6;
    if (r === 5) { e.ai.roar = 2.2; chat('Zebak is about to roar! Get behind a stone!', 'r'); }
    else if (r === 2) { for (let i = 0; i < 3; i++) { const s = i ? nearSpot(p, 300) : p; hazards.push({ x: s.x, y: s.y, r: 50, t: 9, color: '#5fd34a', dps: e.dmg * 0.8, poison: 6 }); } chat('Zebak spits poison pools.', 'r'); }
    else if (r === 3) { for (let i = 0; i < 2; i++) { const s = roomSpot(); hazards.push({ x: s.x, y: s.y, r: 36, t: 8, color: '#c01a1a', dps: e.dmg, heal: 2, from: e, chase: 55 }); } chat('Blood clouds drift toward you. They heal Zebak.', 'r'); }
    else if (r === 4) { const x = clamp(p.x, 100, WORLD_W - 100); telegraphs.push({ line: true, x, y: ARENA_TOP, a: Math.PI / 2, len: WORLD_H, w: 160, t: 1.4, max: 1.4, color: '#4aa0ff', dmg: 0, frac: 0.35, style: 'magic', label: 'Wave!', noPray: true }); }
    else styleShot(e, Math.random() < 0.5 ? 'magic' : 'ranged', 1.3);
  },

  // --- Chambers of Xeric ---
  tekton(e, dt, p, hpf, dist, near) {
    // Tekton (wiki): huge melee hits up close, then back to his anvil where burning debris rains down
    const g = hpGate(e, hpf, [0.75, 0.5, 0.25]);
    if (g) { e.ai.anvil = 5; e.immune = true; e.ai.home = { x: WORLD_W / 2, y: ARENA_TOP + 110 }; chat('Tekton returns to his anvil. Burning debris falls!', 'r'); }
    if (e.ai.anvil > 0) {
      e.ai.anvil -= dt; e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.01 * dt); e.x += (e.ai.home.x - e.x) * dt * 2; e.y += (e.ai.home.y - e.y) * dt * 2;
      if ((e.ai.deb = (e.ai.deb || 0) - dt) <= 0) { e.ai.deb = 0.7; slam(p.x, p.y, 55, 1.0, 0, 'magic', '#ff6a1a', '', { noPray: true, frac: 0.22 }); const s = roomSpot(); slam(s.x, s.y, 55, 1.0, 0, 'magic', '#ff6a1a', '', { noPray: true, frac: 0.22 }); }
      if (e.ai.anvil <= 0) { e.immune = false; e.ai.enr = true; chat('Tekton comes back angrier.', 'r'); }
      e.slow = 0.01; return;
    }
    e.slow = 1;
    e.resist = { ranged: 0.35, magic: 0.35 }; // wiki: immune to ranged, 80% less magic (softened so every hero can finish him)
    if (!e.ai.told) { e.ai.told = true; chat('Tekton shrugs off ranged and magic. Melee works best, if you dare stand next to him.', 'r'); }
    if (e.ai.t > 0) return;
    e.ai.t = e.ai.enr ? 1.6 : 2.1;
    if (dist < 260) slam(e.x, e.y, 170, 1.0, 0, 'melee', '#c8c8c8', 'Tekton swings!', { shape: 'cone', a: Math.atan2(p.y - e.y, p.x - e.x), spread: 1.4, frac: e.ai.enr ? 0.55 : 0.45 });
  },
  vanguard(e, dt, p, hpf, dist, near) {
    // Vanguards (wiki): three fight together; if one falls too far behind the others in health they all heal back up.
    // Melee hits up close, ranged drops rocks on you, magic blasts the area.
    const vs = enemies.filter((m) => m.d.boss === 'vanguard' && !m.dead);
    if (vs[0] === e && vs.length > 1 && (e.ai.syncCd = (e.ai.syncCd || 0) - dt) <= 0) {
      const fr = vs.map((m) => m.hp / m.maxHp), hi = Math.max(...fr), lo = Math.min(...fr);
      if (hi - lo > 0.4) { e.ai.syncCd = 6; for (const m of vs) { m.hp = m.maxHp * hi; burst(m.x, m.y, '#5fd34a', 14); } chat('The vanguards are out of step and heal back up! Bring them down together.', 'r'); }
    }
    if (e.ai.t > 0) return;
    e.ai.t = 2.4;
    const kind = e.id.split('_')[1];
    if (kind === 'ranged') { slam(p.x, p.y, 55, 1.2, 0, 'ranged', '#8a8a8a', 'Rocks!', { noPray: true, frac: 0.2 }); for (let i = 0; i < 2; i++) { const s = nearSpot(p, 200); slam(s.x, s.y, 55, 1.2, 0, 'ranged', '#8a8a8a', '', { noPray: true, frac: 0.2 }); } }
    else if (kind === 'magic') { if (e.ai.phase++ % 3 === 2) for (let i = 0; i < 3; i++) { const s = i ? nearSpot(p, 260) : p; slam(s.x, s.y, 70, 1.1, e.dmg * 1.4, 'magic', '#4aa0ff', i ? '' : 'Magic blast!'); } else styleShot(e, 'magic', 1.1); }
    else if (near) hurtPlayer(eDrain(e) * e.dmg * 1.4, 'melee', { from: e });
  },
  vasa(e, dt, p, hpf) {
    // Vasa Nistirio (wiki): heals from a glowing crystal (break it to stop him), throws boulders,
    // and teleports you next to him before an explosion
    if (!e.ai.crystals) e.ai.crystals = [[160, ARENA_TOP + 60], [WORLD_W - 160, ARENA_TOP + 60], [160, WORLD_H - 70], [WORLD_W - 160, WORLD_H - 70]].map(([x, y]) => { const m = spawnMonster('vasa_crystal', x, y); m.x = x; m.y = y; m.summoned = true; m.master = e; m.immune = true; return m; });
    const live = e.ai.crystals.filter((c) => !c.dead);
    if (!e.ai.charge && live.length && (e.ai.ct = (e.ai.ct ?? 6) - dt) <= 0) {
      e.ai.ct = 14; e.ai.charge = live[Math.floor(Math.random() * live.length)]; e.ai.charge.immune = false; e.ai.chargeT = 9;
      chat('Vasa Nistirio draws power from a glowing crystal. Break it!', 'r');
    }
    if (e.ai.charge) {
      const c = e.ai.charge;
      e.ai.chargeT -= dt;
      if (c.dead || e.ai.chargeT <= 0) {
        if (c.dead) chat('The crystal shatters before Vasa can siphon it!', 'g');
        else { c.immune = true; e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.25); burst(e.x, e.y, '#c0f0ff', 30); chat('Vasa Nistirio finishes the siphon and heals!', 'r'); }
        e.ai.charge = null; e.slow = 1; e.immune = false;
      } else { e.immune = true; e.x += (c.x - e.x) * dt * 1.5; e.y += (c.y + 60 - e.y) * dt * 1.5; e.slow = 0.01; if (Math.random() < dt * 3) fx.push({ kind: 'beam', x: c.x, y: c.y - 20, tx: e.x, ty: e.y - 40, t: 0.2, max: 0.2, color: '#c0f0ff' }); }
    }
    if (e.ai.t > 0) return;
    e.ai.t = 2.2;
    if (++e.ai.phase % 5 === 0) {
      burst(p.x, p.y, '#c0f0ff', 16); p.x = e.x + 40; p.y = clamp(e.y + 60, ARENA_TOP + 20, WORLD_H - 30); burst(p.x, p.y, '#c0f0ff', 16);
      // the blast takes all but a sliver of your hitpoints, unless you run clear or pray Magic
      slam(e.x, e.y, 170, 1.6, 0, 'magic', '#c0f0ff', 'Teleported! Run or pray Magic!');
      telegraphs[telegraphs.length - 1].fx = { fracCur: 0.95 };
    } else for (let i = 0; i < 3; i++) { const s = i ? nearSpot(p, 260) : p; slam(s.x, s.y, 60, 1.3, 0, 'ranged', '#9a9aa8', i ? '' : 'Boulder!', { noPray: true, frac: 0.2 }); }
  },
  vespula(e, dt, p, hpf) {
    // Vespula (wiki): flies above the room, so melee can't reach her; she stings, and lux grubs hatch into
    // vespine soldiers unless killed in time. She lands, enraged, when low.
    e.resist = hpf > 0.2 ? { melee: 0.01 } : null;
    if (!e.ai.told) { e.ai.told = true; chat('Vespula is flying. Melee can\'t reach her until she lands.', 'r'); }
    if ((e.ai.grub = (e.ai.grub ?? 4) - dt) <= 0) { e.ai.grub = 7; const s = roomSpot(); const m = spawnMonster('lux_grub', s.x, s.y); m.summoned = true; m.master = e; m.hatch = 6; }
    for (const m of enemies) if (m.hatch && !m.dead && (m.hatch -= dt) <= 0) { m.dead = true; const v = spawnMonster('vespine_soldier', m.x, m.y); v.summoned = true; v.master = e; chat('A lux grub hatches into a vespine soldier!', 'r'); }
    if (e.ai.t > 0) return;
    e.ai.t = hpf > 0.2 ? 2.0 : 1.4;
    if (e.ai.phase++ % 3 === 2) slam(p.x, p.y, 70, 0.9, 0, 'melee', '#ffd23a', 'Sting!', { noPray: true, frac: 0.3, fx: { poison: 6 } });
    else styleShot(e, 'ranged', 1.2);
  },
  muttadile(e, dt, p, hpf, dist, near) {
    // Muttadiles (wiki): bite hard up close, ranged and magic from range; below half health the big one
    // eats from the meat tree to heal unless you stand by it and chop it down
    const tree = { x: WORLD_W - 150, y: ARENA_TOP + 90 };
    e.ai.tree = tree;
    if (e.id === 'muttadile_large' && !e.ai.chopped && hpf < 0.5 && !e.ai.ate) { e.ai.ate = true; e.ai.eat = 10; chat('The Muttadile goes to eat from the meat tree. Stand by the tree to chop it down!', 'r'); }
    if (e.ai.eat > 0) {
      e.ai.eat -= dt; e.slow = 0.01;
      const d = Math.hypot(tree.x - e.x, tree.y + 40 - e.y);
      if (d > 30) { e.x += (tree.x - e.x) / d * 240 * dt; e.y += (tree.y + 40 - e.y) / d * 240 * dt; }
      else e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.04 * dt);
      if (Math.hypot(p.x - tree.x, p.y - tree.y) < 80) { e.ai.chop = (e.ai.chop || 0) + dt; if (Math.random() < dt * 4) burst(tree.x, tree.y, '#8a6a3c', 4); }
      if (e.ai.chop >= 2.5) { e.ai.chopped = true; e.ai.eat = 0; chat('You chop down the meat tree!', 'g'); }
      if (e.ai.eat <= 0) e.slow = 1;
      return;
    }
    if (e.ai.t > 0) return;
    e.ai.t = 2.0;
    if (near) slam(e.x, e.y, e.r + 70, 0.8, 0, 'melee', '#5a8a3a', 'Bite!', { frac: 0.4 });
    else styleShot(e, Math.random() < 0.5 ? 'ranged' : 'magic', 1.2);
  },

  // --- Theatre of Blood ---
  maiden(e, dt, p, hpf) {
    // The Maiden of Sugadinti (wiki): throws blood that splashes the floor, blood spawn crawl out of it,
    // and Nylocas Matomenos crawl to her at 70%, 50% and 30% to heal her
    if (hpGate(e, hpf, [0.7, 0.5, 0.3])) {
      for (let i = 0; i < 2; i++) { const x = WORLD_W / 2 + (Math.random() - 0.5) * 400, y = i ? WORLD_H - 40 : ARENA_TOP + 20; const m = spawnMonster('nylocas_matomenos', x, y); m.x = x; m.y = y; m.feeds = e; m.summoned = true; m.master = e; }
      chat('Nylocas Matomenos crawl toward the Maiden. Kill or freeze them before they reach her!', 'r');
    }
    if (e.ai.t > 0) return;
    e.ai.t = 2.0;
    if (e.ai.phase++ % 3 === 2) styleShot(e, 'magic', 1.5);
    else {
      for (let i = 0; i < 3; i++) {
        const s = i ? nearSpot(p, 360) : { x: p.x, y: p.y };
        slam(s.x, s.y, 50, 1.2, 0, 'magic', '#c01a1a', i ? '' : 'Blood!', { noPray: true, frac: 0.15, heal: 1, from: e });
        setTimeout(() => { if (!e.dead && mode === 'play') hazards.push({ x: s.x, y: s.y, r: 45, t: 7, color: '#8a0a0a', dps: e.dmg * 0.8, heal: 1, from: e }); }, 1200);
      }
      if (Math.random() < 0.4 && enemies.filter((m) => m.id === 'blood_spawn' && !m.dead).length < 3) summon(e, 'blood_spawn', 1);
    }
  },
  bloat(e, dt, p, hpf) {
    // Pestilent Bloat (wiki): walks round the tank in the middle; while it walks its flies hit anyone it can see,
    // so hide behind the tank. Limbs fall from the ceiling. It sleeps, then stomps as it wakes.
    const tank = { x: WORLD_W / 2 - 150, y: ARENA_TOP + (WORLD_H - ARENA_TOP) / 2 - 90, w: 300, h: 180 };
    e.ai.tank = tank;
    // the tank is solid: push the player out to its nearest side
    if (p.x > tank.x - 10 && p.x < tank.x + tank.w + 10 && p.y > tank.y - 10 && p.y < tank.y + tank.h + 10) {
      const opts = [[p.x - tank.x + 10, -1, 0], [tank.x + tank.w + 10 - p.x, 1, 0], [p.y - tank.y + 10, 0, -1], [tank.y + tank.h + 10 - p.y, 0, 1]].sort((a, b) => a[0] - b[0])[0];
      p.x += opts[1] * opts[0]; p.y += opts[2] * opts[0];
    }
    const loop = [[tank.x - 170, tank.y - 90], [tank.x + tank.w + 170, tank.y - 90], [tank.x + tank.w + 170, tank.y + tank.h + 120], [tank.x - 170, tank.y + tank.h + 120]];
    if (e.ai.wp === undefined) { e.ai.wp = 0; e.ai.walk = 10; e.x = loop[0][0]; e.y = loop[0][1]; }
    e.slow = 0.01;
    if (e.ai.sleep > 0) {
      e.ai.sleep -= dt;
      if (e.ai.sleep <= 0) { e.ai.walk = 8 + Math.random() * 6; slam(e.x, e.y, e.r + 150, 0.6, 0, 'melee', '#5fd34a', 'Bloat wakes!', { noPray: true, frac: 0.5 }); }
      return;
    }
    e.resist = { melee: 0.5, ranged: 0.5, magic: 0.5 }; // half damage while it walks
    const [tx, ty] = loop[e.ai.wp], d = Math.hypot(tx - e.x, ty - e.y);
    if (d < 8) e.ai.wp = (e.ai.wp + 1) % 4; else { e.x += (tx - e.x) / d * 110 * dt; e.y += (ty - e.y) / d * 110 * dt; }
    e.ai.walk -= dt;
    if (e.ai.walk <= 0) { e.ai.sleep = 4.5; e.resist = null; chat('The Pestilent Bloat stops to sleep. Hit it, then get clear before it wakes.', 'g'); return; }
    // flies: anyone in its line of sight gets hit
    e.ai.seen = !rectBlocks(e.x, e.y - 40, p.x, p.y - 20, tank);
    if (e.ai.seen && (e.ai.fly = (e.ai.fly || 0) - dt) <= 0) { e.ai.fly = 0.6; hurtPlayer(eDrain(e) * e.dmg * 0.5, 'melee', { pure: true, from: e }); if (!e.ai.flyTold) { e.ai.flyTold = true; chat('Flies swarm anyone the Bloat can see. Hide behind the tank!', 'r'); } }
    if (e.ai.t > 0) return;
    e.ai.t = 2.4;
    for (let i = 0; i < 5; i++) { const s = i ? roomSpot() : p; slam(s.x, s.y, 55, 1.3, 0, 'melee', '#c8a080', i ? '' : 'Falling limbs!', { noPray: true, frac: 0.2 }); }
  },
  vasilias(e, dt, p, hpf, dist, near) {
    // Nylocas Vasilias (wiki): changes between melee (white), ranged (green) and magic (aqua) forms,
    // and hitting it with the wrong style bounces the damage back at you and heals it. Nylocas pour out of the pillars.
    if ((e.ai.sw = (e.ai.sw ?? 0) - dt) <= 0) {
      e.ai.sw = 7;
      const forms = ['melee', 'ranged', 'magic'].filter((f) => f !== e.ai.form);
      e.ai.form = forms[Math.floor(Math.random() * forms.length)];
      e.formFile = VASILIAS_FORMS[e.ai.form];
      e.mirror = e.ai.form;
      chat(`Nylocas Vasilias turns ${{ melee: 'white: use melee', ranged: 'green: use ranged', magic: 'aqua: use magic' }[e.ai.form]}!`, 'r');
      burst(e.x, e.y, { melee: '#e8e8e8', ranged: '#5fd34a', magic: '#5ad0d0' }[e.ai.form], 20);
    }
    if ((e.ai.nyT = (e.ai.nyT ?? 4) - dt) <= 0) { e.ai.nyT = 9; summon(e, ['nylocas_ischyros', 'nylocas_toxobolos', 'nylocas_hagios'][Math.floor(Math.random() * 3)], 2); }
    if (e.ai.t > 0) return;
    e.ai.t = 1.9;
    if (e.ai.form === 'melee') { if (near) hurtPlayer(eDrain(e) * e.dmg * 1.5, 'melee', { from: e }); }
    else styleShot(e, e.ai.form, 1.3);
  },
  sotetseg(e, dt, p, hpf) {
    // Sotetseg (wiki): red (magic) and black (ranged) orbs, a death ball you must not stand under,
    // and at 66% and 33% the maze: only the marked path is safe while he can't be hurt
    if (hpGate(e, hpf, [0.66, 0.33])) {
      const cols = 9, rows = 6, path = new Set();
      let c = Math.floor(Math.random() * cols);
      e.ai.start = c;
      for (let r = rows - 1; r >= 0; r--) {
        const nc = clamp(c + Math.floor(Math.random() * 7) - 3, 0, cols - 1);
        for (let k = Math.min(c, nc); k <= Math.max(c, nc); k++) path.add(r * cols + k);
        c = nc;
      }
      e.ai.maze = { cols, rows, path, t: 16, warm: 1.5 };
      e.immune = true;
      const cw = WORLD_W / cols, ch = (WORLD_H - ARENA_TOP) / rows;
      p.x = (e.ai.start + 0.5) * cw; p.y = ARENA_TOP + (rows - 0.5) * ch;
      chat('Sotetseg pulls you into the maze! Follow the dark path to the far side. Red tiles burn.', 'r');
    }
    const mz = e.ai.maze;
    if (mz) {
      const cw = WORLD_W / mz.cols, ch = (WORLD_H - ARENA_TOP) / mz.rows;
      const col = clamp(Math.floor(p.x / cw), 0, mz.cols - 1), row = clamp(Math.floor((p.y - ARENA_TOP) / ch), 0, mz.rows - 1);
      mz.t -= dt; mz.warm -= dt;
      if (mz.warm <= 0 && !mz.path.has(row * mz.cols + col) && (mz.tick = (mz.tick || 0) - dt) <= 0) { mz.tick = 0.5; hurtPlayer(0, 'magic', { pure: true, fracCur: 0.12 }); burst(p.x, p.y, '#ff2a2a', 10); }
      if ((row === 0 && mz.path.has(col)) || mz.t <= 0) { e.ai.maze = null; e.immune = false; chat(row === 0 ? 'You make it through the maze.' : 'The maze fades.', 'g'); }
      return;
    }
    if (e.ai.t > 0) return;
    e.ai.t = 1.8;
    const r = e.ai.phase++ % 10;
    if (r === 9) { aimShot(e, 140, 'magic', '#3a0a3a', 0, { r: 30, pure: true, frac: 0.6 }); chat('Sotetseg launches the death ball. Get out of its way!', 'r'); }
    else { const s = Math.random() < 0.5 ? 'magic' : 'ranged'; aimShot(e, 420, s, s === 'magic' ? '#ff2a2a' : '#222', e.dmg * 1.3, { r: 14 }); }
  },
  xarpus(e, dt, p, hpf) {
    // Xarpus (wiki): first heals from exhumeds in the floor (stand on them to stop it, they poison you);
    // then spits poison that pools on the floor; below 25% he stares at a quadrant, and attacking him from there brings a poison retaliation
    if (e.ai.exT === undefined) { e.ai.exT = 14; e.ai.ex = []; e.immune = true; chat('Xarpus feeds on the exhumeds. Stand on them to stop him healing!', 'r'); }
    if (e.ai.exT > 0) {
      e.ai.exT -= dt;
      if ((e.ai.exS = (e.ai.exS || 0) - dt) <= 0) { e.ai.exS = 1.6; const s = roomSpot(); e.ai.ex.push({ x: s.x, y: s.y, t: 4 }); }
      for (const x of e.ai.ex) {
        x.t -= dt;
        const on = Math.hypot(p.x - x.x, p.y - x.y) < 42;
        if (on) { x.held = true; if ((x.tick = (x.tick || 0) - dt) <= 0) { x.tick = 0.5; hurtPlayer(eDrain(e) * e.dmg * 0.3, 'magic', { pure: true, poison: 4 }); } }
        if (x.t <= 0 && !x.held) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.05); burst(e.x, e.y, '#5fd34a', 10); }
      }
      e.ai.ex = e.ai.ex.filter((x) => x.t > 0);
      if (e.ai.exT <= 0) { e.ai.ex = []; e.immune = false; chat('Xarpus rises from the pit!', 'r'); }
      return;
    }
    if (hpf < 0.25) {
      if ((e.ai.stareT = (e.ai.stareT || 0) - dt) <= 0) { e.ai.stareT = 3.5; e.ai.stare = Math.floor(Math.random() * 4); if (!e.ai.screech) { e.ai.screech = true; chat('Xarpus screeches and turns to stare. Don\'t attack him from the quadrant he faces!', 'r'); } }
    }
    if (e.ai.t > 0) return;
    e.ai.t = 1.6;
    const s = { x: p.x, y: p.y };
    slam(s.x, s.y, 55, 1.0, 0, 'magic', '#5fd34a', 'Poison!', { noPray: true, frac: 0.2 });
    setTimeout(() => { if (!e.dead && mode === 'play') hazards.push({ x: s.x, y: s.y, r: 48, t: 20, color: '#3a8a2a', dps: e.dmg * 0.7, poison: 4 }); }, 1000);
  },
};

const RAID_DRAW = {
  zebak(e) {
    for (const j of e.ai.stones || []) { ctx.fillStyle = '#7a7a80'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(j.x, j.y, 40, 32, 0, 0, 7); ctx.fill(); ctx.stroke(); text('Stone', j.x, j.y + 4, 13, '#fff'); }
    if (e.ai.roar > 0) text('Get behind a stone!', run.p.x, run.p.y - 90, 15, '#ff4a1a');
  },
  bloat(e) {
    const t = e.ai.tank; if (!t) return;
    ctx.fillStyle = '#4a3a3a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.fillRect(t.x, t.y, t.w, t.h); ctx.strokeRect(t.x, t.y, t.w, t.h);
    text('Tank', t.x + t.w / 2, t.y + t.h / 2, 14, '#ddd');
    if (e.ai.seen && !(e.ai.sleep > 0)) { ctx.strokeStyle = 'rgba(120,200,60,0.5)'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(e.x, e.y - 40); ctx.lineTo(run.p.x, run.p.y - 20); ctx.stroke(); ctx.setLineDash([]); }
  },
  sotetseg(e) {
    const mz = e.ai.maze; if (!mz) return;
    const cw = WORLD_W / mz.cols, ch = (WORLD_H - ARENA_TOP) / mz.rows;
    for (let r = 0; r < mz.rows; r++) for (let c = 0; c < mz.cols; c++) {
      const safe = mz.path.has(r * mz.cols + c);
      ctx.fillStyle = safe ? 'rgba(20,20,30,0.75)' : `rgba(200,20,20,${mz.warm > 0 ? 0.25 : 0.45})`;
      ctx.fillRect(c * cw + 2, ARENA_TOP + r * ch + 2, cw - 4, ch - 4);
    }
  },
  xarpus(e) {
    for (const x of e.ai.ex || []) { ctx.fillStyle = x.held ? 'rgba(90,200,70,0.35)' : 'rgba(90,200,70,0.7)'; ctx.beginPath(); ctx.arc(x.x, x.y, 42, 0, 7); ctx.fill(); text('Exhumed', x.x, x.y + 4, 12, '#fff'); }
    if (e.ai.stare !== undefined && e.hp / e.maxHp < 0.25) {
      const h = (WORLD_H - ARENA_TOP) / 2, q = e.ai.stare;
      ctx.fillStyle = 'rgba(160,40,160,0.18)'; ctx.fillRect(q % 2 ? WORLD_W / 2 : 0, ARENA_TOP + (q < 2 ? 0 : h), WORLD_W / 2, h);
    }
  },
  muttadile(e) {
    const t = e.ai.tree; if (!t || e.ai.chopped || e.id !== 'muttadile_large') return;
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(t.x - 8, t.y - 10, 16, 40); ctx.fillStyle = '#8a2a2a'; ctx.beginPath(); ctx.arc(t.x, t.y - 22, 34, 0, 7); ctx.fill();
    text('Meat tree', t.x, t.y - 64, 13, '#ff981f');
  },
  vasa(e) { const c = e.ai.charge; if (c && !c.dead) text('Glowing!', c.x, c.y - 60, 13, '#c0f0ff'); },
};

function bossMech(e, dt) {
  const p = run.p, k = e.d.boss, hpf = e.hp / e.maxHp;
  const dist = Math.hypot(p.x - e.x, p.y - e.y);
  const near = dist < e.r + p.r + 40;
  if (RAID_MECH[k]) { RAID_MECH[k](e, dt, p, hpf, dist, near); return true; }
  if (k === 'cow') {
    // Brutus (wiki): "*growls*" then charges in a line; "*snort*" then stomps 1-3 times 3-6 tiles in front (step in close to dodge)
    if (e.ai.stomps > 0 && (e.ai.st -= dt) <= 0) {
      e.ai.stomps--; e.ai.st = 0.8;
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      slam(e.x, e.y - 10, 300, 0.7, 0, 'melee', '#ffffff', '', { shape: 'cone', a, spread: 1.0, inner: 105, frac: 0.3 });
    }
    if (e.ai.t <= 0 && !e.charge && !(e.ai.stomps > 0)) {
      e.ai.t = 3.2;
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      if (dist < 340 && Math.random() < 0.55) { say(e, '*snort*'); e.ai.stomps = 1 + Math.floor(Math.random() * 3); e.ai.st = 0.2; }
      else {
        say(e, '*growls*');
        telegraphs.push({ line: true, x: e.x, y: e.y, a, len: 430, w: 80, t: 0.75, max: 0.75, color: '#ffffff', dmg: 0, frac: 0.35, style: 'melee', label: '' });
        setTimeout(() => { if (!e.dead && mode === 'play') e.charge = { vx: Math.cos(a) * 760, vy: Math.sin(a) * 760, t: 0.55, spd: 0 }; }, 750);
      }
    }
    return true;
  }
  if (k === 'count') {
    // Count Draynor regenerates about 20 times faster than other monsters; finish him with a stake (see bossDeathMech)
    e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.004 * dt);
    if (!e.ai.told) { e.ai.told = true; chat('Count Draynor regenerates fast. When he drops, be next to him to drive the stake in.', 'r'); }
    return false;
  }
  if (k === 'delrith') {
    if (e.ai.weak > 0) {
      // weakened: walk up to him to banish him with the incantation from Demon Slayer
      e.ai.weak -= dt; e.slow = 0.01; e.hitCd = 1;
      if (near) {
        say(run.p, INCANTATION);
        chat('Delrith is banished back to the void!', 'g');
        e.immune = false; e.ai.banished = true; killEnemy(e);
      } else if (e.ai.weak <= 0) {
        e.immune = false; e.slow = 1; e.hp = Math.round(e.maxHp * 0.25);
        chat('Delrith recovers his strength!', 'r');
      }
      return true;
    }
    return false;
  }
  if (k === 'scurrius') {
    // Scurrius (wiki): tail swipe, bolts of electricity, flying fur, falling bricks, six giant rats,
    // and between phases he eats from a food pile to heal, taking less damage while he eats.
    const eatAt = !e.ai.ate1 && hpf < 0.66 ? 1 : !e.ai.ate2 && hpf < 0.33 ? 2 : 0;
    if (eatAt && !e.ai.eat) {
      e.ai['ate' + eatAt] = true; e.ai.eat = 4;
      e.ai.pile = { x: Math.random() < 0.5 ? 120 : WORLD_W - 120, y: WORLD_H - 120 };
      chat('Scurrius scurries off to eat from a food pile!', 'r');
    }
    if (e.ai.eat > 0) {
      const pl = e.ai.pile, d = Math.hypot(pl.x - e.x, pl.y - e.y);
      if (d > 30) { e.x += (pl.x - e.x) / d * 260 * dt; e.y += (pl.y - e.y) / d * 260 * dt; }
      else { e.ai.eat -= dt; e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.03 * dt); if (Math.random() < dt * 4) burst(e.x, e.y - 40, '#c89a50', 4); }
      e.resist = { melee: 0.6, ranged: 0.6, magic: 0.6 }; e.slow = 0.01;
      if (e.ai.eat <= 0) { e.resist = null; e.slow = 1; }
      return true;
    }
    if (e.ai.t <= 0) {
      e.ai.t = 2.4;
      const r = e.ai.phase++ % 5;
      if (r === 0) { for (let i = 0; i < 4; i++) slam(p.x + (i ? (Math.random() - 0.5) * 260 : 0), p.y + (i ? (Math.random() - 0.5) * 200 : 0), 70, 1.2, 0, 'melee', '#a08060', i ? '' : 'Falling bricks!', { noPray: true, frac: 0.2 }); }
      else if (r === 1) fan(e, 3, 0.2, 340, 'magic', '#6aa0ff', e.dmg * 0.9, { r: 10 });
      else if (r === 2) fan(e, 3, 0.2, 340, 'ranged', '#8a6a3c', e.dmg * 0.8, { r: 10, shape: 'blob' });
      else if (r === 3 && near) { hurtPlayer(eDrain(e) * e.dmg * 1.6, 'melee', { from: e }); burst(p.x, p.y - 20, '#c8a080', 10); }
      else if (r === 4) { summon(e, 'giant_rat', 6); chat('Scurrius calls six giant rats!', 'r'); }
      else aimShot(e, 360, 'magic', '#6aa0ff', e.dmg, { r: 12 });
    }
    return true;
  }
  if (k === 'mole') {
    if (e.ai.digCd > 0) e.ai.digCd -= dt;
    if (e.ai.burrow > 0) {
      e.ai.burrow -= dt; e.untargetable = true;
      if (e.ai.burrow <= 0) { e.untargetable = false; e.x = e.ai.next.x; e.y = e.ai.next.y; burst(e.x, e.y, '#8a6a3c', 30); sfx(80, 0.3, 'sawtooth', 0.06); }
    } else if (e.ai.dig) {
      e.ai.dig = false; e.ai.digCd = 4; e.ai.burrow = 1.8;
      e.ai.next = { x: 80 + Math.random() * (WORLD_W - 160), y: 140 + Math.random() * (WORLD_H - 220) };
      burst(e.x, e.y, '#8a6a3c', 30);
      if (near && Math.random() < 0.5) { CR.darkT = 7; chat('The Giant Mole throws dirt at you. Your light source goes out!', 'r'); }
      else chat('The Giant Mole burrows away. Chase her down!', 'r');
    }
    return true;
  }
  if (k === 'kbd') {
    // King Black Dragon: four dragonfires (wiki). Shock lowers your stats, ice freezes, poison poisons. A dragon shield blocks most of it.
    if (e.ai.t <= 0) {
      e.ai.t = 2.5;
      const kind = ['fire', 'poison', 'ice', 'shock'][e.ai.phase++ % 4];
      const color = { fire: '#ff6a1a', poison: '#5fd34a', ice: '#9fe8ff', shock: '#e0e0ff' }[kind];
      fan(e, 9, 0.13, 360, 'magic', color, e.dmg * 0.75, { dragonfire: true, freeze: kind === 'ice' ? 1.1 : 0, poison: kind === 'poison' ? 8 : 0, weaken: kind === 'shock' ? 6 : 0 });
      sfx(70, 0.4, 'sawtooth', 0.06);
      if (e.ai.phase === 1) chat('The King Black Dragon breathes fire! An anti-dragon or dragonfire shield blocks most of it.', 'r');
    }
    if (near && (e.ai.bite = (e.ai.bite || 0) - dt) <= 0) { e.ai.bite = 2.4; hurtPlayer(eDrain(e) * e.dmg * 1.1, 'melee', { from: e }); }
    return true;
  }
  if (k === 'zulrah') {
    // Zulrah (wiki): green = ranged, blue = mostly magic with some ranged, red stares at a spot then whips it and stuns you.
    // Snakelings from white orbs (they die after 40 seconds), venom clouds from dark green orbs.
    const form = ZULRAH_FORMS[e.ai.form || 0];
    e.formFile = form.file;
    if (e.ai.t <= 0) {
      e.ai.shots = (e.ai.shots || 0) + 1;
      e.ai.t = form.style === 'melee' ? 2.8 : 1.4;
      if (form.style === 'melee') slam(p.x, p.y, 90, 1.6, 0, 'melee', form.color, 'Whip!', { frac: 0.6, freeze: 2 });
      else aimShot(e, 520, form.name === 'tanzanite' && Math.random() < 0.25 ? 'ranged' : form.style, form.color, e.dmg, { r: 14 });
      if (e.ai.shots % 3 === 0) {
        const cx = clamp(p.x + (Math.random() - 0.5) * 200, 40, WORLD_W - 40), cy = clamp(p.y + (Math.random() - 0.5) * 160, 120, WORLD_H - 40);
        hazards.push({ x: cx, y: cy, r: 60, t: 8, color: '#5fd34a', dps: 6, poison: 4 });
      }
      if (e.ai.shots % 4 === 2 && enemies.filter((m) => m.id === 'snakeling' && !m.dead).length < 4) summon(e, 'snakeling', 1);
      if (e.ai.shots >= 6) {
        e.ai.shots = 0; e.ai.form = ((e.ai.form || 0) + 1) % 3;
        const nf = ZULRAH_FORMS[e.ai.form];
        burst(e.x, e.y, nf.color, 30);
        summon(e, 'snakeling', 2);
        e.x = clamp(WORLD_W / 2 + (Math.random() - 0.5) * 700, 150, WORLD_W - 150);
        chat(`Zulrah dives and resurfaces in its ${nf.name} form. Pray ${nf.style === 'melee' ? 'Melee (1)' : nf.style === 'ranged' ? 'Missiles (2)' : 'Magic (3)'}!`, 'r');
      }
    }
    return true;
  }
  if (k === 'jad') {
    // TzTok-Jad bites with no warning when you stand in his reach (wiki), on top of his magic and ranged
    if (near && (e.ai.bite = (e.ai.bite ?? 1) - dt) <= 0) {
      e.ai.bite = 2.4;
      hurtPlayer(eDrain(e) * e.dmg * 2.2, 'melee', { from: e });
      if (!e.ai.biteTold) { e.ai.biteTold = true; chat('Jad bites! Stay out of his reach, or pray Melee.', 'r'); }
    }
    return false;
  }
  if (k === 'vorkath') {
    // Vorkath (wiki): six regular attacks (magic, ranged, dragonfire, venom dragonfire, prayer-disabling pink dragonfire,
    // or a firebomb you must dodge), then a special that alternates between the acid phase and the zombified spawn.
    if (e.ai.spawn && !e.ai.spawn.dead) { e.immune = true; return true; }
    e.immune = false;
    if (e.ai.acid > 0) { e.ai.acid -= dt; e.resist = { melee: 0.5, ranged: 0.5, magic: 0.5 }; if (e.ai.acid <= 0) e.resist = null; }
    if (e.ai.t <= 0) {
      e.ai.t = 2.4;
      if ((e.ai.reg = (e.ai.reg || 0) + 1) > 6) {
        e.ai.reg = 0;
        if ((e.ai.spec = (e.ai.spec || 0) + 1) % 2) {
          for (let i = 0; i < 14; i++) hazards.push({ x: 60 + Math.random() * (WORLD_W - 120), y: 140 + Math.random() * (WORLD_H - 180), r: 40, t: 7, color: '#7ad04a', dps: 20, heal: 3, from: e });
          for (let i = 0; i < 8; i++) setTimeout(() => { if (!e.dead && mode === 'play') aimShot(e, 600, 'magic', '#ff6a1a', 16, { pure: true }); }, i * 450);
          e.ai.acid = 7;
          if (!e.ai.acidTold) { e.ai.acidTold = true; chat('Vorkath spews acid! Stepping in it heals him, and he takes half damage until it ends.', 'r'); }
        } else {
          p.frozen = 2.5;
          e.ai.spawn = spawnMonster('zombified_spawn', e.x, e.y + 60);
          e.ai.spawn.summoned = true;
          chat('Vorkath freezes you and sends a zombified spawn! Kill it before it reaches you.', 'r');
        }
        return true;
      }
      const r = Math.random();
      if (r < 0.25) aimShot(e, 500, 'magic', '#7a5aff', e.dmg, { r: 14 });
      else if (r < 0.5) aimShot(e, 500, 'ranged', '#c8c8c8', e.dmg, { r: 12, shape: 'spike' });
      else if (r < 0.65) aimShot(e, 460, 'magic', '#ff6a1a', e.dmg * 1.6, { r: 16, dragonfire: true });
      else if (r < 0.78) aimShot(e, 460, 'magic', '#5fd34a', e.dmg * 1.2, { r: 16, dragonfire: true, poison: 8 });
      else if (r < 0.9) { aimShot(e, 460, 'magic', '#ff7ad0', e.dmg * 1.3, { r: 16, dragonfire: true, prayOff: true }); if (!e.ai.pinkTold) { e.ai.pinkTold = true; chat('Pink dragonfire switches off your prayer!', 'r'); } }
      else slam(p.x, p.y, 70, 1.5, 0, 'magic', '#ff3a1a', 'Firebomb! Move!', { noPray: true, frac: 0.9 });
    }
    return true;
  }
  if (k === 'wardens') {
    // Tumeken's Warden (wiki): starts protected from melee and magic; obelisk lightning, the floor rises in rows,
    // scarabs; below 5% it heals 20% and enrages, with lightning everywhere.
    if (hpf > 0.85 && !e.ai.unshield) {
      e.resist = { melee: 0.3, magic: 0.3 };
      if (!e.ai.told) { e.ai.told = true; chat('The Warden prays against melee and magic. Ranged breaks through.', 'r'); }
    } else if (!e.ai.unshield) { e.ai.unshield = true; e.resist = null; chat('The Warden\'s core is exposed!', 'g'); }
    if (hpf < 0.05 && !e.ai.lastStand) { e.ai.lastStand = true; e.hp += e.maxHp * 0.2; chat('Tumeken\'s Warden heals and enrages!', 'r'); burst(e.x, e.y, '#ffd24a', 50); }
    if (e.ai.t <= 0) {
      e.ai.t = e.ai.lastStand ? 1.4 : 2.2;
      const r = e.ai.phase++ % 5;
      if (r === 0 || e.ai.lastStand) { for (let i = 0; i < (e.ai.lastStand ? 9 : 5); i++) slam(60 + Math.random() * (WORLD_W - 120), 140 + Math.random() * (WORLD_H - 180), 90, 1.2, e.dmg, 'magic', '#ffd24a', 'Lightning!'); }
      else if (r === 2) { summon(e, 'scarab_swarm', 3); chat('The Warden calls a scarab swarm!', 'r'); }
      else if (r === 4 && e.ai.phase % 2) slam(p.x, p.y, 200, 1.3, 0, 'magic', '#ffd24a', 'Warden slam!', { shape: 'cross', w: 100, noPray: true, frac: 0.6 });
      else if (r === 4) {
        const y = clamp(p.y, 150, WORLD_H - 50);
        telegraphs.push({ line: true, x: 0, y, a: 0, len: WORLD_W, w: 90, t: 1.3, max: 1.3, color: '#c89a50', dmg: 0, frac: 0.4, style: 'melee', label: 'The floor rises!', noPray: true });
      }
      else aimShot(e, 520, r === 1 ? 'magic' : 'ranged', r === 1 ? '#4aa0ff' : '#c89a50', e.dmg, { r: 14 });
    }
    e.immune = hpf < 0.5 && !e.ai.lastStand && (e.ai.phase % 8) < 2;
    return true;
  }
  if (k === 'olm') {
    // Great Olm (wiki): head shoots magic or ranged (20% chance to switch), plus crystal burst, lightning that binds
    // and disables prayer, teleport swap, fire walls, the coloured sphere, acid, crystal bombs and falling crystals.
    // His claws must be disabled before the head takes damage (again after half health).
    const spawnClaws = () => {
      e.ai.claws = [['olm_left_claw', -300], ['olm_right_claw', 300]].map(([id, ox]) => { const m = spawnMonster(id, clamp(e.x + ox, 80, WORLD_W - 80), e.y + 30); m.x = clamp(e.x + ox, 80, WORLD_W - 80); m.y = e.y + 30; m.hp = m.maxHp = Math.round(e.maxHp * 0.12); m.summoned = true; return m; });
      chat('Great Olm raises his claws. Disable both before you can hurt his head.', 'r');
    };
    if (!e.ai.claws) spawnClaws();
    if (hpf < 0.5 && !e.ai.claws2) { e.ai.claws2 = true; spawnClaws(); }
    e.immune = e.ai.claws.some((m) => !m.dead);
    if (hpf < 0.25 && (e.ai.fall = (e.ai.fall || 0) - dt) <= 0) {
      e.ai.fall = 1.3;
      slam(p.x + (Math.random() - 0.5) * 80, p.y + (Math.random() - 0.5) * 60, 55, 1.0, e.dmg * 0.8, 'melee', '#9a7aff', '', { noPray: true });
    }
    if (e.ai.t <= 0) {
      e.ai.t = 1.8;
      if (Math.random() < 0.2) e.ai.olmStyle = e.ai.olmStyle === 'ranged' ? 'magic' : 'ranged';
      const st = e.ai.olmStyle || 'magic';
      if (++e.ai.phase % 3) { aimShot(e, 560, st, st === 'ranged' ? '#7ad04a' : '#6a9aff', e.dmg, { r: 14 }); return true; }
      const sp = ['burst', 'lightning', 'sphere', 'fire', 'swap', 'acid', 'bombs'][(e.ai.sp = (e.ai.sp || 0) + 1) % 7];
      if (sp === 'burst') slam(p.x, p.y, 55, 1.1, 0, 'melee', '#9a7aff', 'Crystal burst!', { noPray: true, frac: 0.3 });
      else if (sp === 'lightning') {
        for (let i = -1; i <= 1; i++) telegraphs.push({ line: true, x: clamp(p.x + i * 150 + (Math.random() - 0.5) * 60, 30, WORLD_W - 30), y: 100, a: Math.PI / 2, len: WORLD_H, w: 50, t: 1.2, max: 1.2, color: '#6ad0ff', dmg: e.dmg, style: 'magic', label: i ? '' : 'Lightning!', fx: { freeze: 1.2, prayOff: true } });
      } else if (sp === 'sphere') {
        const s = ['melee', 'ranged', 'magic'][Math.floor(Math.random() * 3)];
        aimShot(e, 260, s, { melee: '#ff3a3a', ranged: '#5fd34a', magic: '#b04bff' }[s], 1, { r: 18, sphere: true });
        chat(`Olm launches a ${{ melee: 'red', ranged: 'green', magic: 'purple' }[s]} sphere. Pray ${s === 'melee' ? 'Melee (1)' : s === 'ranged' ? 'Missiles (2)' : 'Magic (3)'} or lose two thirds of your hitpoints!`, 'r');
      } else if (sp === 'fire') {
        telegraphs.push({ line: true, x: clamp(p.x, 120, WORLD_W - 120), y: 100, a: Math.PI / 2, len: WORLD_H, w: 230, t: 2.6, max: 2.6, color: '#ff6a1a', dmg: 0, frac: 0.7, style: 'magic', label: 'Fire wall! Get out!', noPray: true });
      } else if (sp === 'swap') {
        const nx = 60 + Math.random() * (WORLD_W - 120), ny = 140 + Math.random() * (WORLD_H - 180);
        fx.push({ kind: 'boom', x: nx, y: ny, r: 40, color: '#b04bff', t: 1.1, max: 1.1 });
        setTimeout(() => {
          if (e.dead || mode !== 'play') return;
          const d = Math.hypot(nx - p.x, ny - p.y);
          burst(p.x, p.y, '#b04bff', 16); p.x = nx; p.y = ny; burst(p.x, p.y, '#b04bff', 16);
          hurtPlayer(eDrain(e) * e.dmg * d / 400, 'magic', { pure: true });
          chat('Olm teleports you across the room!', 'r');
        }, 1100);
      } else if (sp === 'acid') {
        for (let i = 0; i < 4; i++) setTimeout(() => { if (!e.dead && mode === 'play') hazards.push({ x: p.x, y: p.y, r: 45, t: 6, color: '#5fd34a', dps: 10, poison: 4 }); }, i * 500);
        chat('Acid drips from Olm onto you. Keep moving!', 'r');
      } else {
        for (let i = 0; i < 2; i++) slam(clamp(p.x + (Math.random() - 0.5) * 300, 60, WORLD_W - 60), clamp(p.y + (Math.random() - 0.5) * 220, 140, WORLD_H - 40), 130, 2.2, 0, 'magic', '#c8c8ff', 'Crystal bomb!', { noPray: true, frac: 0.6 });
      }
    }
    return true;
  }
  if (k === 'verzik') return verzikMech(e, dt, near, hpf);
  if (k === 'nex') return nexMech(e, dt, near);
  if (k === 'zuk') {
    // Jal-Xil and Jal-Zek pairs spawn behind you during the Zuk fight (wiki)
    if ((e.ai.set = (e.ai.set ?? 30) - dt) <= 0) {
      e.ai.set = 45;
      for (const id of ['jal_xil', 'jal_zek']) { const m = spawnMonster(id, 120 + Math.random() * (WORLD_W - 240), WORLD_H - 60); m.summoned = true; }
      chat('A Jal-Xil and Jal-Zek join the fight!', 'r');
    }
    return false;
  }
  return false;
}

function verzikMech(e, dt, near, hpf) {
  const p = run.p, vp = e.ai.vphase || 1;
  if (vp === 1) {
    // Phase 1 (wiki): a huge attack that only the pillars block; the pillars crumble after a few hits
    e.slow = 0.01; // she stays on her throne
    if (!CR.pillars) {
      CR.pillars = [0.22, 0.5, 0.78].map((f) => ({ x: WORLD_W * f, y: Math.min(WORLD_H - 80, e.y + 210), hp: 3 }));
      chat('Verzik Vitur charges a blast. Hide behind a pillar!', 'r');
    }
    if (!e.ai.blast && e.ai.t <= 0) { e.ai.blast = 1.6; e.over = { text: 'You think you can defeat me?', t: 1.6 }; }
    if (e.ai.blast > 0) {
      e.ai.blast -= dt * BOSS_TEMPO;
      if (e.ai.blast <= 0) {
        e.ai.blast = 0; e.ai.t = 4.2;
        const cover = CR.pillars.find((pl) => {
          if (pl.hp <= 0 || pl.y > p.y + 20) return false;
          const vx = p.x - e.x, vy = p.y - e.y, l = Math.hypot(vx, vy) || 1;
          const tt = ((pl.x - e.x) * vx + (pl.y - e.y) * vy) / (l * l);
          if (tt < 0 || tt > 1) return false;
          return Math.hypot(e.x + vx * tt - pl.x, e.y + vy * tt - pl.y) < 40;
        });
        fx.push({ kind: 'beam', x: e.x, y: e.y - 60, tx: cover ? cover.x : p.x, ty: cover ? cover.y - 30 : p.y - 30, t: 0.3, max: 0.3, color: cover ? '#888' : '#a01aff' });
        if (cover) {
          if (--cover.hp <= 0) { slam(cover.x, cover.y, 100, 0.3, e.dmg * 1.8, 'melee', '#6a5a5a', 'Collapse!', { noPray: true }); chat('A pillar collapses!', 'r'); }
        } else hurtPlayer(0, 'magic', { pure: true, frac: run.prayer === 'magic' ? 0.42 : 0.85 });
      }
    }
    return true;
  }
  CR.pillars = null; e.slow = 1;
  if (vp === 2) {
    // Phase 2 (wiki): body slam up close, urnbombs, a lightning ball, purple Nylocas Athanatos that heal her,
    // and below 35% blood spells that heal her and two Nylocas Matomenos.
    if (near && (e.ai.slamCd = (e.ai.slamCd || 0) - dt) <= 0) {
      e.ai.slamCd = 3; hurtPlayer(eDrain(e) * e.dmg * 2.2, 'melee', { from: e });
      const a = Math.atan2(p.y - e.y, p.x - e.x); p.x = clamp(p.x + Math.cos(a) * 120, p.r, WORLD_W - p.r); p.y = clamp(p.y + Math.sin(a) * 120, 110, WORLD_H - p.r); p.frozen = Math.max(p.frozen, 0.8);
    }
    if (hpf < 0.35 && !e.ai.bloodTold) {
      e.ai.bloodTold = true; chat('Verzik turns to blood magic. Pray Magic, and kill the Nylocas Matomenos before they reach her!', 'r');
      for (let i = 0; i < 2; i++) { const sp = edgeSpawn(); const m = spawnMonster('nylocas_matomenos', sp.x, sp.y); m.hp = m.maxHp = Math.round(e.maxHp * 0.04); m.feeds = e; m.summoned = true; }
    }
    if (e.ai.t <= 0) {
      e.ai.t = 2.0;
      const r = e.ai.phase++ % 4;
      if (hpf < 0.35 && r % 2) aimShot(e, 480, 'magic', '#c01a1a', e.dmg, { r: 14, heal: 1, from: e });
      else if (r === 0) { for (let i = 0; i < 3; i++) slam(clamp(p.x + (i ? (Math.random() - 0.5) * 220 : 0), 40, WORLD_W - 40), clamp(p.y + (i ? (Math.random() - 0.5) * 160 : 0), 130, WORLD_H - 40), 70, 1.1, e.dmg * 1.3, 'ranged', '#a01a2a', i ? '' : 'Urnbombs!'); }
      else if (r === 1) aimShot(e, 620, 'magic', '#6ad0ff', e.dmg * 1.4, { r: 12, pure: true });
      else if (r === 2) {
        const tx = p.x, ty = p.y;
        slam(tx, ty, 60, 2.0, e.dmg * 2, 'magic', '#b04bff', 'Purple Nylocas!');
        setTimeout(() => { if (!e.dead && mode === 'play') { const m = spawnMonster('nylocas_hagios', tx, ty); m.x = tx; m.y = ty; m.healer = true; m.summoned = true; chat('A Nylocas Athanatos crawls to heal Verzik!', 'r'); } }, 2000);
      } else summon(e, ['nylocas_ischyros', 'nylocas_toxobolos', 'nylocas_hagios'][Math.floor(Math.random() * 3)], 3);
    }
    return true;
  }
  // Phase 3 (wiki): melee up close, barbs and blue magic, then in order: Nylocas, webs, the green ball, yellow pools.
  // Below 20% her tornadoes chase you, take half your hitpoints and heal her.
  if (hpf < 0.2 && !e.ai.torn) {
    e.ai.torn = true;
    CR.tornados.push({ x: e.x, y: e.y, e }); CR.tornados.push({ x: e.x + 80, y: e.y, e });
    chat('Verzik summons tornadoes! A hit takes half your hitpoints and heals her.', 'r');
  }
  if (near && (e.ai.melee = (e.ai.melee || 0) - dt) <= 0) { e.ai.melee = 1.8; hurtPlayer(eDrain(e) * e.dmg * 1.8, 'melee', { from: e }); }
  if (e.ai.t <= 0) {
    e.ai.t = 1.6;
    if (++e.ai.phase % 5) { const s = Math.random() < 0.5 ? 'ranged' : 'magic'; aimShot(e, 520, s, s === 'ranged' ? '#c8c8a0' : '#4aa0ff', e.dmg, { r: 13, shape: s === 'ranged' ? 'spike' : 'orb' }); return true; }
    const sp = (e.ai.sp = (e.ai.sp || 0) + 1) % 4;
    if (sp === 0) summon(e, ['nylocas_ischyros', 'nylocas_toxobolos', 'nylocas_hagios'][Math.floor(Math.random() * 3)], 3);
    else if (sp === 1) for (let i = 0; i < 6; i++) slam(clamp(p.x + (i ? (Math.random() - 0.5) * 420 : 0), 40, WORLD_W - 40), clamp(p.y + (i ? (Math.random() - 0.5) * 300 : 0), 130, WORLD_H - 40), 55, 1.0, e.dmg * 0.8, 'magic', '#e8e8e8', i ? '' : 'Webs!', { noPray: true, freeze: 1.5 });
    else if (sp === 2) { aimShot(e, 240, 'magic', '#5fd34a', 0, { r: 22, pure: true, fracCur: 0.74 }); chat('Verzik throws the green ball. Dodge it!', 'r'); }
    else for (let i = 0; i < 8; i++) slam(60 + Math.random() * (WORLD_W - 120), 140 + Math.random() * (WORLD_H - 180), 60, 1.6, e.dmg * 1.4, 'magic', '#ffe040', i ? '' : 'Yellow!', { noPray: true });
  }
  return true;
}

function nexMech(e, dt, near) {
  // Nex (wiki): smoke, shadow, blood, ice, then Zaros. Each special comes with her real shout.
  const p = run.p;
  // After each fifth of her health, the mage empowering that phase must die before she can be hurt again
  if (!e.ai.mages) e.ai.mages = [];
  ['fumus', 'umbra', 'cruor', 'glacies'].forEach((id, i) => {
    const at = 0.8 - 0.2 * i;
    if (e.hp / e.maxHp <= at && !e.ai.mages[i]) {
      e.hp = Math.max(e.hp, e.maxHp * at);
      const sp = edgeSpawn(); const m = spawnMonster(id, sp.x, sp.y); m.hp = m.maxHp = Math.round(e.maxHp * 0.06); m.dmg = e.dmg * 0.6; m.summoned = true; e.ai.mages[i] = m;
      chat(`Nex: ${m.d.name}, don't fail me! She is immune until ${m.d.name} dies.`, 'r');
    }
  });
  e.immune = e.ai.mages.some((m) => m && !m.dead);
  // each phase lasts until its mage falls
  const ph = ['smoke', 'shadow', 'blood', 'ice', 'zaros'][e.ai.mages.filter((m) => m && m.dead).length];
  if (ph !== e.ai.nexPhase) { e.ai.nexPhase = ph; shout(e, 'nex_' + ph); e.ai.n = 0; }
  if (e.ai.kneel > 0) { e.ai.kneel -= dt; e.slow = 0.01; if (e.ai.kneel <= 0) e.slow = 1; return true; }
  e.lifesteal = ph === 'blood' ? 1 : ph === 'zaros' ? 0.25 : 0;
  if (e.ai.t > 0) return true;
  e.ai.t = 2.2;
  const spec = ++e.ai.n % 3 === 0, second = e.ai.n % 6 === 0;
  if (ph === 'smoke') {
    if (!spec) fan(e, 5, 0.25, 360, 'magic', '#7a7a7a', e.dmg * 0.8, { poison: 4 });
    else if (second) {
      shout(e, 'nex_dash');
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      telegraphs.push({ line: true, x: e.x, y: e.y, a, len: 900, w: 90, t: 0.9, max: 0.9, color: '#9a9a9a', dmg: e.dmg * 2.2, style: 'melee', label: '' });
      setTimeout(() => { if (!e.dead && mode === 'play') e.charge = { vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, t: 0.6, spd: 0 }; }, 900);
    } else { shout(e, 'nex_choke'); aimShot(e, 420, 'magic', '#5a6a5a', e.dmg * 0.5, { r: 16, poison: 8, drain: 8, noPray: true }); }
  } else if (ph === 'shadow') {
    if (!spec) fan(e, 3, 0.15, 480, 'ranged', '#333', e.dmg * 0.9, { shape: 'spike' });
    else if (second) { shout(e, 'nex_dark'); CR.nexDark = 10; CR.darkT = 10; chat('Darkness falls. Standing near Nex hurts!', 'r'); }
    else { shout(e, 'nex_smash'); slam(p.x, p.y, 70, 1.1, 0, 'ranged', '#222', 'Move!', { noPray: true, frac: 0.35 }); }
  } else if (ph === 'blood') {
    if (!spec) aimShot(e, 500, 'magic', '#c01a1a', e.dmg, { r: 14, heal: 1, from: e });
    else if (second) {
      shout(e, 'nex_siphon'); e.ai.kneel = 4.8;
      for (let i = 0; i < 3; i++) { const a = i * 2.1, m = spawnMonster('blood_reaver', e.x + Math.cos(a) * 150, e.y + Math.sin(a) * 100); m.summoned = true; }
      for (let i = 0; i < 4; i++) hazards.push({ x: clamp(p.x + (Math.random() - 0.5) * 360, 40, WORLD_W - 40), y: clamp(p.y + (Math.random() - 0.5) * 280, 130, WORLD_H - 40), r: 50, t: 6, color: '#a00a1a', dps: 24, heal: 4, from: e });
      chat('Nex kneels. Hitting her now heals her! Kill the blood reavers instead: they heal you.', 'r');
    } else { shout(e, 'nex_sac'); CR.mark = { t: 4, e }; }
  } else if (ph === 'ice') {
    if (!spec) fan(e, 6, 0.2, 380, 'magic', '#9fe8ff', e.dmg * 0.8, { freeze: 0.8 });
    else if (second) { shout(e, 'nex_contain'); slam(e.x, e.y, 210, 1.0, 0, 'ranged', '#9fe8ff', 'Contain this!', { frac: 0.65, fx: { prayOff: true } }); }
    else { shout(e, 'nex_prison'); p.frozen = Math.max(p.frozen, 1.0); slam(p.x, p.y, 75, 2.8, 0, 'magic', '#bff4ff', 'Ice prison!', { noPray: true, frac: 0.6 }); }
  } else {
    fan(e, 7, 0.18, 420, 'magic', '#b04bff', e.dmg, { heal: 0.25, from: e });
    if (spec) slam(p.x, p.y, 80, 1.0, e.dmg * 1.6, 'magic', '#b04bff', 'Soul split!', { heal: 1, from: e });
  }
  return true;
}

// Returns true if the boss survives its death (it changes form instead).
function bossDeathMech(e) {
  const k = e.d.boss, p = run.p;
  const near = Math.hypot(p.x - e.x, p.y - e.y) < e.r + p.r + 90;
  if (k === 'count') {
    if (near) { chat('You hammer the stake through Count Draynor\'s heart!', 'g'); return false; }
    e.hp = Math.round(e.maxHp * 0.3);
    chat('Count Draynor rises again! Be next to him when he falls to stake him.', 'r');
    burst(e.x, e.y, '#3a0000', 30);
    return true;
  }
  if (k === 'delrith' && !e.ai.banished) {
    e.hp = 1; e.immune = true; e.ai.weak = 5;
    chat('Delrith is weakened! Get next to him to banish him with the incantation.', 'r');
    return true;
  }
  if (k === 'nex') {
    shout(e, 'nex_wrath');
    slam(e.x, e.y, 220, 1.0, e.dmg * 2.5, 'magic', '#b04bff', 'Wrath! Run!', { noPray: true });
    return false;
  }
  return false;
}

window.__rr = {
  get mode() { return mode; }, get run() { return run; }, get enemies() { return enemies; }, get pickups() { return pickups; },
  start: (i) => { pickedHero = HEROES[i || 0]; begin(); }, endStage: () => endStage(),
  skipTo: (stage) => { run.stage = stage - 1; startStage(); }, dropClue: (tier) => pickups.push({ kind: 'clue', tier: tier ?? 3, x: run.p.x + 60, y: run.p.y, t: 0 }),
  killAll: () => { for (const e of enemies) e.hp = 1; },
  kill: (e) => killEnemy(e),
  clearWave: () => { toSpawn = 0; run.evAt = null; run.insaneAt = null; run.circleAt = null; enemies.length = 0; },
  die: () => die(),
  rollOffers: () => { rollOffers(true); return offers; },
  yama: () => renderYama(() => { mode = 'shop'; renderShop(); }),
  yamaShows: () => yamaShows(),
  achEvent: (o, x) => achEvent(o, x),
  get meta() { return meta; },
  dropPie: () => pickups.push({ kind: 'pie', x: run.p.x + 60, y: run.p.y, t: 0 }),
  cameo: (id) => addCameo(id),
  event: (id) => { run.evSeen = RANDOM_EVENTS.filter((d) => d.id !== id).map((d) => d.id); startRandomEvent(); },
  get ev() { return run.ev; }, bonus: () => startBonus(), superior: () => makeSuperior(enemies[0]), spawn: (id) => spawnMonster(id, 700, 420),
};
})();
