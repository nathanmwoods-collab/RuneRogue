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
let meta = { sticks: 0, up: {}, heroes: [], cleared: -1 };
try { meta = Object.assign(meta, JSON.parse(localStorage.getItem('runerogue.meta') || '{}')); } catch (e) { /* optional */ }
function saveMeta() { try { localStorage.setItem('runerogue.meta', JSON.stringify(meta)); } catch (e) { /* optional */ } }
function heroUnlocked(h) {
  if (!h.unlock) return true;
  if (h.unlock.area !== undefined) return meta.cleared >= h.unlock.area;
  return meta.heroes.includes(h.id);
}
function unlockText(h) {
  if (h.unlock.area !== undefined) return `Clear ${AREAS[h.unlock.area].name} to unlock`;
  return `Costs ${h.unlock.sticks} trading sticks`;
}
function upLevel(id) { return meta.up[id] || 0; }
function upVal(id) { const u = UPGRADES.find((x) => x.id === id); return upLevel(id) * u.per; }
function upCost(u) { return Math.round(u.base * Math.pow(1.55, upLevel(u.id))); }
// Sticks for a run: progress, bosses and clues all count.
function sticksEarned() {
  const bosses = Math.floor((run.stage + (mode === 'over' && run.won ? 1 : 0)) / (WAVES_PER_AREA + 1));
  return Math.max(1, Math.round(run.stage * 3 + bosses * 12 + run.clues * 8 + run.kills / 25));
}

// ======================================================================
// Run state
// ======================================================================
let mode = 'title'; // title | play | paused | shop | casket | over
let run = null;
let enemies = [], shots = [], eshots = [], coins = [], splats = [], fx = [], telegraphs = [], pickups = [], hazards = [];
const TOTAL_STAGES = AREAS.length * (WAVES_PER_AREA + 1);

function newRun(hero) {
  const skills = {};
  for (const s of SKILLS) skills[s.id] = s.start;
  Object.assign(skills, hero.skills || {});
  const gear = {};
  for (const s of SLOTS) gear[s] = null;
  gear.weapon = hero.weapon;
  Object.assign(gear, hero.gear || {});
  gearBarKey = '';
  run = {
    hero, skills, gear,
    inv: { shark: 2 + upVal('shark'), ppot: 1 },
    freeRerolls: 0, buffs: {}, boons: {}, lives: (hero.mods || {}).lives || 0,
    gold: upVal('startGold'), stage: -1, kills: 0, totalGold: 0, rerolls: 0, clues: 0, clueSeen: [],
    p: { x: WORLD_W / 2, y: WORLD_H / 2, r: 22, hp: 0, pp: 0, atkT: 0, face: 0, hurtT: 0, frozen: 0, poison: 0, anim: null, over: null },
    prayer: null,
  };
  run.p.hp = stats().maxHp; run.p.pp = stats().maxPp;
  chatClear();
  chat(`Welcome to RuneRogue, ${hero.name}.`);
  chat(`${AREAS.length} areas stand between you and the end. Good luck.`, 'b');
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

function stats() {
  const h = run.hero, s = run.skills, m = h.mods || {};
  const gear = gearItems();
  const sum = (k) => gear.reduce((a, it) => a + (it[k] || 0), 0);
  const weapon = ITEMS[run.gear.weapon].w;
  const lane = KIND_STYLE[weapon.kind];
  let dmgMult = (m.dmg || 1) * (1 + upVal('dmg')) * buffMult('dmg_' + lane) * (1 + gear.reduce((a, it) => a + gearDmg(it, lane), 0)) * (1 - gearPenalty(gear, lane)) * (1 + 0.15 * bv('might'));
  let aspd = (1 + sum('aspd') + upVal('aspd')) * buffMult('aspd') * (1 + 0.15 * bv('haste'));
  const range = (m.range || 1) * (1 + sum('range')) * (1 + 0.15 * bv('reach'));
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
    maxHp: 50 + 5 * (s.hitpoints - 10) + sum('hp') + upVal('hp') + (m.hp || 0),
    maxPp: 20 + 2 * (s.prayer - 1) + sum('pp') + upVal('prayer'),
    ppDrain: 1.6 * (m.ppDrain || 1) / (1 + 0.03 * (s.prayer - 1)),
    reduce: Math.min(0.75, defPts / 100),
    taken: (m.taken || 1) * takenGear * (1 - upVal('def')) * Math.pow(0.9, bv('skin')),
    speed: 230 * (m.speed || 1) * buffMult('speed') * (1 + 0.12 * bv('fleet')) * (1 + 0.006 * (s.agility - 1) + sum('speed') + upVal('speed')),
    goldMult: (m.gold || 1) * (1 + 0.02 * (s.thieving - 1)) * (1 + sum('gold')) * (1 + upVal('gold')) * (1 + 0.25 * bv('greed')),
    crit: 0.05 + (m.crit || 0) + 0.005 * (s.slayer - 1) + upVal('crit') + 0.08 * bv('crit'),
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
  bossAlive = null; stageEnding = 0;
  const st = stats();
  Object.assign(run.p, { x: WORLD_W / 2, y: WORLD_H * 0.62, frozen: 0, poison: 0, pp: st.maxPp, anim: null });
  run.prayer = null;
  const a = areaIndex(), sub = subIndex();
  toSpawn = isBoss ? 4 + a * 2 : 12 + a * 4 + sub * 6;
  spawnT = 0.6;
  if (isBoss) {
    const def = MONSTERS[area.boss];
    const b = spawnMonster(area.boss, WORLD_W / 2, def.spd === 0 ? 210 : 230);
    bossAlive = b;
    chat(`${area.name}: ${def.name} (level-${def.lvl}) appears!`, 'r');
    bossIntro(b);
    sfx(90, 0.6, 'sawtooth', 0.07);
  } else {
    chat(`${area.name}, wave ${sub + 1} of ${WAVES_PER_AREA}. Defeat every enemy.`, 'g');
  }
  if (sub === 0 && !isBoss) heroSays();
  playMusic(area.music);
  mode = 'play';
  showScreen(null);
  updatePrayerButtons();
  const portrait = $('hudPortrait');
  if (portrait && run.stage === 0) { portrait._retry = false; wireImg(portrait, run.hero.file, run.hero.name); }
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
    dmg: d.clue ? 3.2 * stageScale() * (d.clueMult || 1) : d.dmg * (d.boss ? 1 : 1 + 0.03 * run.stage),
    hitCd: 0, frozen: 0, castT: 1 + Math.random() * 2, kx: 0, ky: 0, flash: 0, over: null,
    ai: { t: 2.5 + Math.random(), phase: 0, burrow: 0 }, ...opts,
  };
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
  const maxAlive = isBoss ? 4 + a : 7 + Math.floor(a * 0.8) + subIndex() * 2;
  if (spawnT > 0 || enemies.length >= maxAlive) return;
  spawnT = isBoss ? 4 : Math.max(0.7, 1.7 - a * 0.05);
  const group = Math.min(toSpawn, 1 + Math.floor(Math.random() * 2));
  for (let i = 0; i < group; i++) {
    let id = area.hordes[Math.floor(Math.random() * area.hordes.length)];
    if (area.elites.length && Math.random() < Math.min(0.4, 0.1 + subIndex() * 0.08 + a * 0.015)) id = area.elites[Math.floor(Math.random() * area.elites.length)];
    const pos = spreadSpawn();
    const m = spawnMonster(id, pos.x, pos.y);
    burst(pos.x, pos.y, '#d8c8a0', 8);
    if (m && Math.random() < 0.45) m.lead = 0.5 + Math.random() * 0.7; // cuts you off instead of chasing your tail
  }
  toSpawn -= group;
}

function checkStageDone(dt) {
  if (stageEnding > 0) { stageEnding -= dt; if (stageEnding <= 0) endStage(); return; }
  const bossDone = !isBoss || !bossAlive || bossAlive.dead;
  // a reward casket or clue scroll on the ground keeps the round open until you pick it up
  const waitPk = pickups.find((pk) => pk.kind === 'casket' || pk.kind === 'clue');
  const casketWaiting = !!waitPk;
  if (bossDone && (toSpawn <= 0 || isBoss) && enemies.length === 0) {
    if (casketWaiting) { if (!run.casketNag) { run.casketNag = true; chat(`Pick up the ${waitPk.kind === 'clue' ? 'clue scroll' : 'reward casket'} to finish the round.`, 'r'); } return; }
    run.casketNag = false;
    stageEnding = 1.2;
  }
}

function endStage() {
  for (const c of coins) addGold(c.v, false);
  coins = [];
  pickups = [];
  run.buffs = {};
  const st = stats();
  const bonus = Math.round((15 + run.stage * 6) * st.goldMult * (isBoss ? 2 : 1));
  addGold(bonus, false);
  run.p.hp = Math.min(st.maxHp, run.p.hp + Math.round(st.maxHp * 0.5));
  chat(`${isBoss ? `${area.name} cleared!` : 'Wave cleared.'} Bonus: ${bonus} coins.`, 'g');
  if (isBoss && areaIndex() > meta.cleared) {
    meta.cleared = areaIndex(); saveMeta();
    for (const h of HEROES) if (h.unlock && h.unlock.area === meta.cleared) chat(`New hero unlocked: ${h.name}!`, 'r');
  }
  sfx(660, 0.12, 'triangle', 0.06); setTimeout(() => sfx(880, 0.18, 'triangle', 0.06), 120);
  if (run.stage >= TOTAL_STAGES - 1) { victory(); return; }
  playMusic(MUSIC_SHOP);
  rollOffers(true);
  if (isBoss) { renderBoons(); return; }
  mode = 'shop';
  renderShop();
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
  const chance = (e.d.elite || e.clueBoss ? POTION_CHANCE.elite : POTION_CHANCE.normal) * (1 + upVal('luck') * 0.5);
  if (Math.random() < chance) {
    // the potion for the style you're using is twice as likely
    const style = weaponStyle();
    const bag = Object.keys(POTIONS).flatMap((k) => (POTIONS[k].style === style ? [k, k] : [k]));
    pickups.push({ kind: 'potion', pot: bag[Math.floor(Math.random() * bag.length)], x: e.x + 20, y: e.y, t: 0 });
  }
  const hurt = run.p.hp < stats().maxHp * 0.5 ? 2 : 1;
  if (Math.random() < (e.d.elite || e.clueBoss ? PIE_CHANCE.elite : PIE_CHANCE.normal) * hurt) {
    pickups.push({ kind: 'pie', x: e.x - 20, y: e.y, t: 0 });
  }
}
function bv(id) { return (run && run.boons[id]) || 0; }
function buffMult(stat) { const b = run.buffs[stat]; return b && b.t > 0 ? 1 + b.amount : 1; }
function maybeDropClue(e) {
  if (e.d.boss || e.d.clue || e.summoned) return;
  const chance = (e.d.elite ? 0.02 : 0.005) * (1 + upVal('luck'));
  if (Math.random() < chance) {
    pickups.push({ kind: 'clue', x: e.x, y: e.y, t: 0 });
    chat('A clue scroll drops!', 'r');
    sfx(980, 0.2, 'triangle', 0.06);
  }
}
let pendingClue = 0;
function startClue() {
  if (mode !== 'play') { pendingClue++; return; }
  // A random boss from outside the route, never the same one twice in a run.
  let pool = CLUE_BOSSES.filter((id) => !run.clueSeen.includes(id));
  if (!pool.length) { run.clueSeen = []; pool = CLUE_BOSSES.slice(); }
  const id = pool[Math.floor(Math.random() * pool.length)];
  run.clueSeen.push(id);
  run.clues++;
  const pos = spreadSpawn();
  // keep the whole sprite and its health bar on screen
  pos.y = clamp(pos.y, 130 + MONSTERS[id].size, WORLD_H - 40);
  pos.x = clamp(pos.x, 40 + MONSTERS[id].size * 0.4, WORLD_W - 40 - MONSTERS[id].size * 0.4);
  const m = spawnMonster(id, pos.x, pos.y);
  m.clueBoss = true;
  chat(`You read the clue scroll. A ${m.d.name} appears!`, 'r');
}
function openCasket(pk) {
  mode = 'casket';
  const choices = [];
  const a = areaIndex();
  const pool = Object.values(ITEMS).filter((it) => it.slot !== 'food' && !it.start &&
    it.tier <= a + 3 && (it.rarity !== 'mega' || a >= 10) && run.gear[it.slot] !== it.id);
  // casket loot leans rarer than the shop
  const bag = pool.map((it) => ({ it, wt: rarityWeight(it) * (it.rarity === 'common' ? 0.5 : 1.5) }));
  while (choices.length < 3 && bag.length) {
    const total = bag.reduce((x, b) => x + b.wt, 0);
    let r = Math.random() * total, i = 0;
    while (i < bag.length - 1 && r > bag[i].wt) { r -= bag[i].wt; i++; }
    choices.push(bag.splice(i, 1)[0].it);
  }
  renderCasket(choices);
}

// ======================================================================
// Combat
// ======================================================================
function nearestEnemy(x, y, maxD) {
  let best = null, bd = maxD;
  for (const e of enemies) {
    if (e.ai.burrow > 0 || e.untargetable) continue;
    const d = Math.hypot(e.x - x, e.y - y) - e.r;
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
  return { dmg: Math.max(1, Math.round(dmg)), crit };
}

function damageEnemy(e, dmg, crit, opts = {}) {
  if (e.dead) return;
  if (e.immune) { dmg = 0; }
  else if (e.resist && e.resist[weaponStyle()]) dmg = Math.round(dmg * e.resist[weaponStyle()]);
  e.hp -= dmg;
  e.flash = 0.12;
  e.aggro = true;
  splats.push({ x: e.x + (Math.random() - 0.5) * 16, y: e.y - e.d.size * 0.5, v: dmg, crit, t: 0.8, kind: dmg === 0 ? 'miss' : 'hit' });
  if (opts.freeze && dmg > 0 && !e.d.boss) e.frozen = Math.max(e.frozen, opts.freeze);
  if (opts.knock && !e.d.boss) {
    const a = Math.atan2(e.y - run.p.y, e.x - run.p.x);
    e.kx += Math.cos(a) * opts.knock * 4; e.ky += Math.sin(a) * opts.knock * 4;
  }
  const leech = (opts.leech || 0) + 0.03 * bv('vamp');
  if (leech && dmg > 0) run.p.hp = Math.min(stats().maxHp, run.p.hp + dmg * leech);
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
  const st = stats();
  const value = Math.max(1, Math.round(e.d.gold * st.goldMult * (0.8 + Math.random() * 0.4) * (e.summoned ? 0.3 : 1)));
  if (e.d.boss) {
    for (let i = 0; i < 14; i++) coins.push({ x: e.x + (Math.random() - 0.5) * 140, y: e.y + (Math.random() - 0.5) * 140, v: Math.ceil(value / 14), t: 0 });
    chat(`You have defeated ${e.d.name}!`, 'r');
    sfx(220, 0.4, 'triangle', 0.08); setTimeout(() => sfx(440, 0.5, 'triangle', 0.08), 200);
    burst(e.x, e.y, '#ffd060', 60);
    // remaining summons collapse with their master
    for (const m of enemies) if (m.summoned && !m.dead) { m.dead = true; burst(m.x, m.y, '#888', 8); }
  } else if (e.clueBoss) {
    pickups.push({ kind: 'casket', x: e.x, y: e.y, t: 0 });
    chat(`The ${e.d.name} drops a reward casket!`, 'r');
    burst(e.x, e.y, '#ffd060', 30);
  } else {
    if (value > 0) coins.push({ x: e.x, y: e.y, v: value, t: 0 });
    burst(e.x, e.y, '#d8c9a3', 6);
    maybeDropClue(e);
    maybeDropPotion(e);
  }
  if (e.d.explode) burst(e.x, e.y, '#5fd34a', 20);
}

function playerAttack(dt) {
  const p = run.p, st = stats(), w = st.weapon;
  p.atkT -= dt;
  if (p.atkT > 0 || p.frozen > 0) return;
  const reachMult = 1 + 0.15 * bv('reach');
  const reach = w.kind === 'swing' ? w.reach * reachMult : w.range * st.range;
  const target = nearestEnemy(p.x, p.y, reach + (w.kind === 'swing' ? 10 : 0));
  if (!target) return;
  p.atkT = w.cd / st.aspd;
  const ang = Math.atan2(target.y - p.y, target.x - p.x);
  p.face = ang;
  p.anim = { kind: w.kind, ang, t: 0, dur: w.kind === 'swing' ? 0.2 : 0.18, arc: w.arc || 0 };
  if (w.kind === 'swing') {
    fx.push({ kind: 'slash', x: p.x, y: p.y - 30, a: ang, arc: Math.min(w.arc, 6.3), r: w.reach, t: 0.2, max: 0.2 });
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
      }
    }
  } else if (w.kind === 'shot') {
    sfx(700, 0.04, 'triangle', 0.025);
    const ammo = run.gear.ammo ? ITEMS[run.gear.ammo] : null;
    const count = w.count + bv('multi'), spread = w.spread || 0.13;
    for (let i = 0; i < count; i++) {
      const a = ang + (i - (count - 1) / 2) * spread;
      shots.push({ kind: 'arrow', x: p.x, y: p.y - 30, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, life: (w.range * st.range) / w.speed + 0.1,
        pierce: w.pierce + st.pierce, hit: new Set(), dmg: w.dmg, bolt: w.bolt, dart: w.dart, bounce: (w.bounce || 0) + bv('chain'), icon: ammo && ammo.slot === 'ammo' && ammo.lane === 'ranged' ? ammo.file : null });
    }
  } else {
    sfx(480, 0.09, 'sine', 0.04);
    const count = 1 + bv('multi');
    for (let i = 0; i < count; i++) {
      const a = ang + (i - (count - 1) / 2) * 0.18;
      shots.push({ kind: 'spell', x: p.x, y: p.y - 40, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, life: (w.range * st.range) / w.speed + 0.15,
        pierce: 1, hit: new Set(), dmg: w.dmg, splash: w.splash * st.splash, color: w.color, freeze: w.freeze, leech: w.leech, icon: w.icon, bounce: bv('chain') });
    }
  }
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
              damageEnemy(o, r.dmg, r.crit, { freeze: s.freeze, leech: s.leech });
            }
          }
          // Ricochet: the spell leaps on to another enemy
          const next = s.bounce > 0 && enemies.find((o) => !o.dead && !s.hit.has(o) && Math.hypot(o.x - e.x, o.y - e.y) < 260);
          if (next) { s.bounce--; const a = Math.atan2(next.y - s.y, next.x - s.x), sp = Math.hypot(s.vx, s.vy); s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp; s.life = 0.7; break; }
          s.life = 0;
        } else {
          const r = rollDamage(s.dmg, e, st);
          damageEnemy(e, r.dmg, r.crit);
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
  const p = run.p, st = stats();
  let dmg = raw * st.taken * (opts.pure ? 1 : 1 - st.reduce);
  if (style === 'magic' && (run.hero.mods || {}).magicTaken) dmg *= run.hero.mods.magicTaken;
  if (run.prayer && run.prayer === style && !opts.pure && !opts.noPray) dmg *= opts.full ? 0 : 0.3;
  dmg = Math.round(dmg * (0.6 + Math.random() * 0.4));
  p.hp -= dmg;
  p.hurtT = 0.15;
  splats.push({ x: p.x + (Math.random() - 0.5) * 14, y: p.y - 70, v: dmg, t: 0.8, kind: dmg === 0 ? 'miss' : 'hit' });
  if (dmg > 0) sfx(130, 0.08, 'sawtooth', 0.04);
  if (opts.freeze) p.frozen = Math.max(p.frozen, opts.freeze);
  if (opts.poison && !(run.hero.mods || {}).poisonImmune) p.poison = Math.max(p.poison, opts.poison);
  if (opts.drain) p.pp = Math.max(0, p.pp - opts.drain);
  if (bv('thorns') && opts.from && !opts.from.dead && dmg > 0) damageEnemy(opts.from, Math.round(dmg * 0.5 * bv('thorns')), false);
  if (opts.heal && opts.from) opts.from.hp = Math.min(opts.from.maxHp, opts.from.hp + dmg * opts.heal);
  if (p.hp <= 0 && run.lives > 0) {
    run.lives--; p.hp = Math.round(st.maxHp / 2);
    chat(`${run.hero.name} cheats death!`, 'r'); burst(p.x, p.y, '#ffd060', 30);
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
    if (e.over) { e.over.t -= dt; if (e.over.t <= 0) e.over = null; }
    e.x += e.kx * dt; e.y += e.ky * dt; e.kx *= 0.85; e.ky *= 0.85;
    if (e.frozen > 0) { e.frozen -= dt; continue; }
    if (e.d.boss) bossAI(e, dt);
    if (e.dead || e.ai.burrow > 0) continue;
    if (e.d.clue) { // clue bosses: a telegraphed special on top of their normal attack
      e.ai.t -= dt;
      if (e.ai.t <= 0) { e.ai.t = 3.2 + Math.random(); slam(p.x, p.y, 75, 1.1, e.dmg * 1.6, e.d.style, '#ff981f', 'Special!'); }
    }
    if (e.d.spd === 0 && !e.d.caster) continue; // stationary bosses

    const tgt = e.healer && !e.aggro && bossAlive && !bossAlive.dead ? bossAlive : p;
    let dx = tgt.x - e.x, dy = tgt.y - e.y, dist = Math.hypot(dx, dy) || 1;
    const realDist = dist;
    if (e.lead && tgt === p && dist > 90 && e.d.spd) {
      // aim where the player is heading
      const t = Math.min(e.lead, dist / e.d.spd);
      dx = p.x + (p.vx || 0) * t - e.x; dy = p.y + (p.vy || 0) * t - e.y;
      dist = Math.hypot(dx, dy) || 1;
    }
    let want = tgt === p ? 1 : dist > e.r + bossAlive.r ? 1 : 0;
    if (e.d.caster && !e.d.boss) {
      want = dist > e.d.caster.range ? 1 : dist < e.d.caster.range * 0.7 ? -0.6 : 0;
      e.castT -= dt;
      if (e.castT <= 0 && dist < e.d.caster.range + 80) {
        e.castT = e.d.caster.cd;
        const sp = e.d.caster.speed;
        eshots.push({ x: e.x, y: e.y - e.d.size * 0.5, vx: dx / dist * sp, vy: (dy + e.d.size * 0.5) / dist * sp, r: 9, dmg: e.dmg, style: e.d.style, color: e.d.caster.color, life: 3 });
      }
    }
    const spd = (e.charge ? e.charge.spd : e.d.spd) * (e.slow || 1);
    if (e.charge) {
      e.x += e.charge.vx * dt; e.y += e.charge.vy * dt; e.charge.t -= dt;
      if (e.charge.t <= 0) e.charge = null;
    } else {
      e.x += dx / dist * spd * want * dt;
      e.y += dy / dist * spd * want * dt;
    }
    if (tgt === p && realDist < e.r + p.r && e.hitCd <= 0) {
      e.hitCd = e.d.boss ? 1.2 : 0.9;
      if (e.d.explode) { hurtPlayer(e.dmg, 'melee', { pure: true }); killEnemy(e); continue; }
      hurtPlayer(e.dmg, e.d.style === 'magic' && !e.d.caster ? 'magic' : 'melee', { drain: e.d.drain, heal: e.lifesteal, from: e, noPray: e.d.noPray });
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
  for (const e of enemies) { e.x = clamp(e.x, 10, WORLD_W - 10); e.y = clamp(e.y, 90, WORLD_H - 10); }
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
  telegraphs.push({ x, y, r, t: delay, max: delay, color, dmg, style, label, noPray: !!(extra && extra.noPray) });
}
function summon(e, id, n, opts = {}) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const m = spawnMonster(id, clamp(e.x + Math.cos(a) * 140, 40, WORLD_W - 40), clamp(e.y + Math.sin(a) * 140, 120, WORLD_H - 40), opts);
    m.summoned = true;
  }
}
function shout(e, key) {
  const lines = QUOTES[key || e.d.id] || [];
  if (lines.length) say(e, lines[Math.floor(Math.random() * lines.length)]);
}

// Returns true if the boss changes phase instead of dying.
function bossPhaseOnDeath(e) {
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

function bossAI(e, dt) {
  const p = run.p, k = e.d.boss;
  e.ai.t -= dt;
  const hpf = e.hp / e.maxHp;
  if (k === 'cow') {
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
        for (let i = 0; i < n; i++) slam(p.x + (i ? (Math.random() - 0.5) * 220 : 0), p.y + (i ? (Math.random() - 0.5) * 180 : 0), 75, 0.9, e.dmg * 1.3, 'magic', '#ff4a1a', i ? '' : 'Scorch!');
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
      if (r === 3) { summon(e, e.ai.form2 ? 'kalphite_soldier' : 'kalphite_worker', 3); slam(p.x, p.y, 90, 1.0, e.dmg * 1.4, 'melee', '#c8a060', 'Acid!', np); }
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
        hurtPlayer(e.dmg * 1.1, 'ranged');
        if (e.ai.phase++ === 0) chat('Graardor slams the ground! It hits the whole room. Protect from Missiles.', 'r');
      } else {
        hurtPlayer(e.dmg * 2.0, 'melee', { from: e });
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
      if (form.style === 'melee') slam(p.x, p.y, 90, 1.1, e.dmg * 1.8, 'melee', form.color, 'Magma!');
      else aimShot(e, 520, form.style, form.color, e.dmg, { r: 14 });
      if (e.ai.shots % 3 === 0) hazards.push({ x: clamp(p.x + (Math.random() - 0.5) * 200, 40, WORLD_W - 40), y: clamp(p.y + (Math.random() - 0.5) * 160, 120, WORLD_H - 40), r: 60, t: 8, color: '#5fd34a', dps: 6, poison: 4 });
      if (e.ai.shots >= 6) {
        e.ai.shots = 0; e.ai.form = ((e.ai.form || 0) + 1) % 3;
        const nf = ZULRAH_FORMS[e.ai.form];
        burst(e.x, e.y, nf.color, 30);
        e.x = clamp(WORLD_W / 2 + (Math.random() - 0.5) * 700, 150, WORLD_W - 150);
        chat(`Zulrah dives and resurfaces in its ${nf.name} form. Pray ${nf.style === 'melee' ? 'Melee (1)' : nf.style === 'ranged' ? 'Missiles (2)' : 'Magic (3)'}!`, 'r');
      }
    }
  } else if (k === 'jad') {
    if (!e.ai.windup && e.ai.t <= 0) {
      e.ai.windup = { style: Math.random() < 0.5 ? 'magic' : 'ranged', t: Math.max(0.9, 1.5 - (1 - hpf) * 0.5) };
      sfx(e.ai.windup.style === 'magic' ? 200 : 600, 0.2, 'triangle', 0.06);
    }
    if (e.ai.windup) {
      e.ai.windup.t -= dt;
      if (e.ai.windup.t <= 0) {
        const style = e.ai.windup.style;
        e.ai.windup = null; e.ai.t = 1.6;
        aimShot(e, 700, style, style === 'magic' ? '#ff5a1a' : '#e8c060', 42, { r: 16, homing: true, full: true });
      }
    }
    if (!e.ai.healers && hpf < 0.5) {
      e.ai.healers = true;
      chat('Yt-HurKot healers appear! Hit them to pull them off Jad.', 'r');
      for (let i = 0; i < 4; i++) { const sp = edgeSpawn(); const m = spawnMonster('yt_hurkot', sp.x, sp.y); m.healer = true; m.summoned = true; }
    }
  } else if (k === 'vorkath') {
    if (e.ai.spawn && !e.ai.spawn.dead) { e.immune = true; return; }
    e.immune = false;
    if (e.ai.t <= 0) {
      e.ai.t = 2.4;
      const r = e.ai.phase++ % 6;
      if (r === 2) {
        // acid phase: pools everywhere and a rapid fireball stream
        for (let i = 0; i < 10; i++) hazards.push({ x: 60 + Math.random() * (WORLD_W - 120), y: 140 + Math.random() * (WORLD_H - 180), r: 40, t: 7, color: '#7ad04a', dps: 14 });
        for (let i = 0; i < 6; i++) setTimeout(() => { if (!e.dead && mode === 'play') aimShot(e, 600, 'magic', '#ff6a1a', 16, { pure: true }); }, i * 450);
        chat('Vorkath spews acid!', 'r');
      } else if (r === 5) {
        p.frozen = 2.5;
        e.ai.spawn = spawnMonster('zombified_spawn', e.x, e.y + 60);
        e.ai.spawn.summoned = true;
        chat('Vorkath freezes you and sends a zombified spawn! Kill it before it reaches you.', 'r');
      } else if (r === 4) {
        slam(p.x, p.y, 70, 1.5, 80, 'magic', '#ff3a1a', 'Bomb! Move!');
      } else {
        aimShot(e, 500, Math.random() < 0.5 ? 'magic' : 'ranged', '#ff6a1a', e.dmg, { r: 16 });
      }
    }
  } else if (k === 'wardens') {
    if (e.ai.t <= 0) {
      e.ai.t = 2.2;
      const r = e.ai.phase++ % 4;
      if (r === 0) { for (let i = 0; i < 5; i++) slam(60 + Math.random() * (WORLD_W - 120), 140 + Math.random() * (WORLD_H - 180), 90, 1.2, e.dmg, 'magic', '#ffd24a', 'Lightning!'); }
      else if (r === 2) { summon(e, 'scarab_swarm', 3); chat('The Warden calls a scarab swarm!', 'r'); }
      else aimShot(e, 520, r === 1 ? 'magic' : 'ranged', r === 1 ? '#4aa0ff' : '#c89a50', e.dmg, { r: 14 });
    }
    e.immune = hpf < 0.5 && (e.ai.phase % 8) < 2; // core retreats briefly in phase two
  } else if (k === 'olm') {
    // Great Olm: sits in the wall, alternates magic and ranged, drops crystals and acid
    if (e.ai.t <= 0) {
      e.ai.t = 1.8;
      const r = e.ai.phase++ % 5;
      if (r === 2) { for (let i = 0; i < 6; i++) slam(p.x + (Math.random() - 0.5) * 300, p.y + (Math.random() - 0.5) * 240, 55, 1.1, e.dmg * 0.9, 'melee', '#9a7aff', 'Crystal!'); }
      else if (r === 4) hazards.push({ x: p.x, y: p.y, r: 70, t: 6, color: '#5fd34a', dps: 10, poison: 4 });
      else aimShot(e, 560, r % 2 ? 'ranged' : 'magic', r % 2 ? '#7ad04a' : '#6a9aff', e.dmg, { r: 14 });
    }
  } else if (k === 'verzik') {
    const vp = e.ai.vphase || 1;
    if (e.ai.t <= 0) {
      e.ai.t = vp === 1 ? 2.2 : vp === 2 ? 2.0 : 1.6;
      if (vp === 1) { fan(e, 8, 0.4, 320, 'magic', '#a01aff', e.dmg * 0.7); }
      else if (vp === 2) {
        if (e.ai.phase++ % 3 === 0) { summon(e, ['nylocas_ischyros', 'nylocas_toxobolos', 'nylocas_hagios'][Math.floor(Math.random() * 3)], 3); }
        else slam(p.x, p.y, 80, 1.0, e.dmg * 1.2, 'ranged', '#a01a2a', 'Bounce!');
      } else {
        if (e.ai.phase++ % 4 === 0) { hazards.push({ x: e.x, y: e.y, r: 40, t: 8, color: '#c03030', dps: 25, chase: 90 }); chat('Verzik summons a tornado!', 'r'); }
        else aimShot(e, 520, Math.random() < 0.5 ? 'ranged' : 'magic', '#e04a6a', e.dmg, { r: 14 });
      }
    }
  } else if (k === 'nex') {
    // Nex: smoke, shadow, blood, ice, then Zaros
    const phases = ['smoke', 'shadow', 'blood', 'ice', 'zaros'];
    const ph = phases[Math.min(4, Math.floor((1 - hpf) * 5))];
    if (ph !== e.ai.nexPhase) { e.ai.nexPhase = ph; shout(e, 'nex_' + ph); }
    if (e.ai.t <= 0) {
      e.ai.t = 2.2;
      if (ph === 'smoke') fan(e, 5, 0.25, 360, 'magic', '#7a7a7a', e.dmg * 0.8, { poison: 4 });
      else if (ph === 'shadow') { for (let i = 0; i < 4; i++) slam(p.x + (Math.random() - 0.5) * 240, p.y + (Math.random() - 0.5) * 200, 60, 1.0, e.dmg * 1.2, 'ranged', '#222', 'Shadow!'); }
      else if (ph === 'blood') { e.lifesteal = 1; aimShot(e, 500, 'magic', '#c01a1a', e.dmg, { r: 14 }); }
      else if (ph === 'ice') { fan(e, 6, 0.2, 380, 'magic', '#9fe8ff', e.dmg * 0.8, { freeze: 0.8 }); }
      else { fan(e, 7, 0.18, 420, 'magic', '#b04bff', e.dmg); }
    }
  } else if (k === 'zuk') {
    // TzKal-Zuk: hide behind the moving shield when he fires, or take a huge hit
    if (!e.ai.shield) e.ai.shield = { x: WORLD_W / 2, dir: 1 };
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
        const safe = Math.abs(p.x - sh.x) < 85 && p.y > 300;
        fx.push({ kind: 'beam', x: e.x, y: e.y - 60, tx: p.x, ty: p.y - 30, t: 0.3, max: 0.3, color: safe ? '#888' : '#ff3a1a' });
        if (safe) burst(sh.x, 300, '#ffb040', 20); else hurtPlayer(75, 'magic', { pure: true });
      }
    }
    if (!e.ai.jad && hpf < 0.6) { e.ai.jad = true; const j = spawnMonster('jad', 200, 300); j.summoned = true; j.hp = j.maxHp = 2500; chat('TzKal-Zuk summons Jal-TokJad!', 'r'); }
    if (!e.ai.heal && hpf < 0.3) { e.ai.heal = true; for (let i = 0; i < 4; i++) { const m = spawnMonster('yt_hurkot', 200 + i * 300, 160); m.healer = true; m.summoned = true; } chat('Jal-MejJak healers arrive!', 'r'); }
  }
  // Jad-style healers heal whoever is the boss
  for (const m of enemies) if (m.healer && !m.dead && !m.aggro && Math.hypot(m.x - e.x, m.y - e.y) < e.r + 50) e.hp = Math.min(e.maxHp, e.hp + 16 * dt);
}

function updateEnemyShots(dt) {
  const p = run.p;
  for (const s of eshots) {
    if (s.homing) {
      const a = Math.atan2(p.y - 30 - s.y, p.x - s.x), sp = Math.hypot(s.vx, s.vy);
      s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp;
    }
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (Math.hypot(p.x - s.x, p.y - 30 - s.y) < p.r + s.r) {
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
        if (along > 0 && along < t.len && off < t.w / 2) hurtPlayer(t.dmg, t.style);
      } else {
        fx.push({ kind: 'boom', x: t.x, y: t.y, r: t.r, color: t.color, t: 0.35, max: 0.35 });
        if (Math.hypot(p.x - t.x, p.y - t.y) < t.r) hurtPlayer(t.dmg, t.style, { noPray: t.noPray });
      }
    }
  }
  telegraphs = telegraphs.filter((t) => !t.done);
  for (const h of hazards) {
    h.t -= dt;
    if (h.chase) { const a = Math.atan2(p.y - h.y, p.x - h.x); h.x += Math.cos(a) * h.chase * dt; h.y += Math.sin(a) * h.chase * dt; }
    if (Math.hypot(p.x - h.x, p.y - h.y) < h.r) {
      h.tick = (h.tick || 0) - dt;
      if (h.tick <= 0) { h.tick = 0.5; hurtPlayer(h.dps * 0.5, 'magic', { pure: true, poison: h.poison }); }
    }
  }
  hazards = hazards.filter((h) => h.t > 0);
}

// ======================================================================
// Player
// ======================================================================
function updatePlayer(dt) {
  const p = run.p, st = stats();
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
    p.pp -= st.ppDrain * dt;
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
  for (const pk of pickups) {
    pk.t += dt;
    if ((pk.kind === 'potion' || pk.kind === 'pie') && pk.t > 20) { pk.got = true; continue; } // potions and pies fade after a while
    if (Math.hypot(p.x - pk.x, p.y - pk.y) < p.r + 22) {
      pk.got = true;
      if (pk.kind === 'clue') startClue();
      else if (pk.kind === 'pie') {
        const max = stats().maxHp, heal = Math.round(max * PIE.heal);
        p.hp = Math.min(max, p.hp + heal);
        chat(`You eat the Redberry pie. It heals ${heal} hitpoints.`, 'g');
        burst(p.x, p.y - 20, '#ff4a6a', 12);
        sfx(620, 0.15, 'sine', 0.06);
      } else if (pk.kind === 'potion') {
        const pot = POTIONS[pk.pot];
        run.buffs[pot.stat] = { t: pot.secs, amount: pot.amount, name: pot.name, file: pot.file };
        chat(`You drink a ${pot.name}: ${pot.info} for ${pot.secs} seconds.`, 'g');
        sfx(520, 0.15, 'sine', 0.06);
      } else { sfx(700, 0.2, 'triangle', 0.06); openCasket(pk); }
    }
  }
  pickups = pickups.filter((pk) => !pk.got);
}

function addGold(v, sound) {
  run.gold += v; run.totalGold += v;
  if (sound) sfx(1200 + Math.random() * 200, 0.03, 'square', 0.015);
}

function togglePrayer(style) {
  if (!run || mode !== 'play') return;
  if (run.prayer === style) run.prayer = null;
  else if (run.p.pp > 0) run.prayer = style;
  else chat('You need to recharge your prayer.', 'r');
  sfx(run.prayer ? 520 : 300, 0.06, 'sine', 0.05);
  updatePrayerButtons();
}
function updatePrayerButtons() {
  document.querySelectorAll('.pbtn[data-pray]').forEach((b) => b.classList.toggle('on', !!run && run.prayer === b.dataset.pray));
}
function useItem(kind) {
  if (!run || mode !== 'play' || run.inv[kind] <= 0) return;
  const st = stats();
  run.inv[kind]--;
  if (kind === 'shark') { run.p.hp = Math.min(st.maxHp, run.p.hp + 20); chat('You eat the shark. It heals some health.'); }
  else { run.p.pp = Math.min(st.maxPp, run.p.pp + 20); chat('You drink some of your prayer potion.'); }
  sfx(400, 0.1, 'sine', 0.05);
}

function die() {
  if (mode !== 'play') return;
  mode = 'over';
  chat('Oh dear, you are dead!', 'r');
  sfx(110, 0.6, 'sawtooth', 0.08);
  saveBest();
  setTimeout(renderGameOver, 700);
}
function victory() {
  mode = 'over'; run.won = true;
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
  if (mode !== 'play') return;
  if (pendingClue > 0) { pendingClue--; startClue(); }
  spawnTick(dt);
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
    const im = wikiImage(pot ? pot.file : pie ? PIE.file : pk.kind === 'clue' ? CLUE_FILE : CASKET_FILE);
    const w = pot ? 22 : pie ? 30 : 36;
    if (ready(im)) ctx.drawImage(im, pk.x - w / 2, pk.y - 22 + bob, w, w * im.naturalHeight / im.naturalWidth);
    else { ctx.fillStyle = pot ? '#4aa0ff' : pie ? '#c0304a' : pk.kind === 'clue' ? '#f0e0b0' : '#8a5a2a'; ctx.fillRect(pk.x - 14, pk.y - 14 + bob, 28, 22); }
    text(pot ? pot.name : pie ? PIE.name : pk.kind === 'clue' ? 'Clue scroll' : 'Reward casket', pk.x, pk.y - 34 + bob, 13, pot ? '#7fd0ff' : pie ? '#ff8a9a' : '#ff981f');
  }

  const sprites = enemies.filter((e) => e.ai.burrow <= 0).map((e) => ({ y: e.y, e }));
  sprites.push({ y: run.p.y, player: true });
  sprites.sort((a, b) => a.y - b.y);
  for (const s of sprites) s.player ? drawPlayer() : drawEnemy(s.e);

  if (bossAlive && bossAlive.d.boss === 'zuk' && bossAlive.ai.shield) {
    const sh = bossAlive.ai.shield;
    ctx.fillStyle = '#5a3a1a'; ctx.strokeStyle = '#ffb040'; ctx.lineWidth = 3;
    ctx.fillRect(sh.x - 85, 280, 170, 26); ctx.strokeRect(sh.x - 85, 280, 170, 26);
    text('Ancestral Glyph', sh.x, 293, 13, '#ffb040');
  }

  for (const s of shots) {
    const im = s.icon ? wikiImage(s.icon) : null;
    if (s.kind === 'arrow') {
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
    ctx.fillStyle = s.color; ctx.shadowColor = s.color; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke();
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
  const bob = p.moving ? Math.abs(Math.sin(performance.now() / 90)) * 3 : 0;
  ctx.save();
  if (p.hurtT > 0) ctx.globalAlpha = 0.6;
  drawSprite(wikiImage(run.hero.file), p.x, p.y + 4 - bob, h, { color: '#3a7bd5', label: run.hero.name[0], flip: p.flip });
  ctx.restore();
  drawWeapon(p, h);
  if (p.frozen > 0) { ctx.fillStyle = 'rgba(160,220,255,0.45)'; ctx.fillRect(p.x - 26, p.y - h, 52, h + 4); }
  if (p.poison > 0) text('Poisoned', p.x, p.y + 18, 13, '#5fd34a');
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
  if ((e.d.elite || e.clueBoss) && !e.d.boss) text(`${e.d.name} (level-${e.d.lvl})`, e.x, Math.max(14, e.y - h - 18), 12, e.clueBoss ? '#ff981f' : '#ffff00');
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
  ctx.fillStyle = s.kind === 'miss' ? '#2a5adf' : s.kind === 'poison' ? '#3c9a2a' : '#b00000';
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
  $('waveSub').textContent = `Area ${areaIndex() + 1} of ${AREAS.length} · ` + (isBoss ? `Boss: ${MONSTERS[area.boss].name}` : `Wave ${subIndex() + 1} of ${WAVES_PER_AREA} · ${left} left`);
  $('goldTxt').textContent = run.gold.toLocaleString();
  drawGearBar();
  $('sharkN').textContent = '×' + run.inv.shark;
  $('ppotN').textContent = '×' + run.inv.ppot;
  const bb = $('bossbar');
  if (bossAlive && !bossAlive.dead) {
    bb.hidden = false;
    const extra = bossAlive.d.boss === 'zulrah' ? ` · ${ZULRAH_FORMS[bossAlive.ai.form || 0].name}` : bossAlive.d.boss === 'verzik' ? ` · phase ${bossAlive.ai.vphase || 1}` : bossAlive.d.boss === 'kq' && bossAlive.ai.form2 ? ' · airborne' : '';
    $('bossName').textContent = `${bossAlive.d.name} (level-${bossAlive.d.lvl})${extra}`;
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
    const art = el('div', 'art'); art.appendChild(imgTag(h.file, h.name)); c.appendChild(art);
    c.appendChild(el('div', 'nm', h.name));
    const lane = el('div', 'lane'); lane.appendChild(imgTag(LANE_ICON[h.lane], LANE_NAME[h.lane])); lane.appendChild(document.createTextNode(`${heroBoostText(h)} · starts with ${ITEMS[h.weapon].name}`)); c.appendChild(lane);
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
    c.addEventListener('click', () => { pickedHero = h; renderTitle(); playMusic(MUSIC_TITLE); });
    c.addEventListener('dblclick', () => { pickedHero = h; begin(); });
    g.appendChild(c);
  }
  s.appendChild(g);
  const r = el('div', 'row'); r.style.marginTop = '16px';
  r.appendChild(el('p', '', 'Move with <kbd>WASD</kbd> or arrows (on touch, drag anywhere). Attacks are automatic. Prayers <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>, eat <kbd>E</kbd>, prayer potion <kbd>Q</kbd>, music <kbd>M</kbd>, pause <kbd>P</kbd>.'));
  const b = btn(`Play as ${pickedHero.name}`, 'btn big', begin);
  const ub = btn('', 'btn', renderUpgrades);
  ub.appendChild(imgTag(STICKS_FILE, 'Trading sticks')); ub.appendChild(document.createTextNode(` Upgrades (${meta.sticks.toLocaleString()} sticks)`));
  ub.classList.add('sticks-btn');
  r.appendChild(ub);
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
  if (it.rarity !== 'common') wt *= 1 + upVal('luck') * (it.rarity === 'uncommon' ? 0.5 : 1);
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
    if (it.slot === 'food') wt = 0.5;
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
    if (w.spell) bits.push(`casts ${w.spell}`);
    if (w.kind === 'swing') bits.push(w.arc > 6 ? 'hits all around you' : `reach ${w.reach}`);
    if (w.hits) bits.push(`${w.hits} hits per swing`);
    if (w.count > 1) bits.push(`${w.count} arrows`);
    if (w.pierce > 1) bits.push(`pierces ${w.pierce}`);
    if (w.bounce) bits.push(`bounces ${w.bounce}`);
    if (w.splash) bits.push(`splash ${w.splash}`);
    if (w.freeze) bits.push('freezes');
    if (w.leech) bits.push('heals you');
    if (w.tbow) bits.push('stronger vs high levels');
  }
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

function renderCasket(choices) {
  const s = el('div', 'sheet'); s.style.maxWidth = '720px';
  const head = el('div', 'row'); head.style.justifyContent = 'flex-start';
  head.appendChild(imgTag(CASKET_FILE, 'Reward casket'));
  const t = el('div'); t.appendChild(el('h2', '', 'You open the reward casket')); t.appendChild(el('p', '', 'Pick one item to keep. It is equipped straight away. Or skip to keep your current gear.'));
  head.appendChild(t);
  s.appendChild(head);
  const g = el('div', 'grid offers'); g.style.marginTop = '12px';
  for (const it of choices) {
    g.appendChild(offerCard(it, 'Free', () => {
      equip(it);
      chat(`You take the ${it.name} from the casket.`, 'g');
      sfx(900, 0.15, 'triangle', 0.06);
      mode = 'play'; showScreen(null);
    }));
  }
  if (!choices.length) g.appendChild(el('p', '', 'The casket is empty.'));
  s.appendChild(g);
  const r = el('div', 'row'); r.style.marginTop = '14px';
  r.appendChild(btn(choices.length ? 'Skip, keep my gear' : 'Close', 'btn', () => {
    chat('You leave the casket items behind.', 'b');
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
window.__rr = {
  get mode() { return mode; }, get run() { return run; }, get enemies() { return enemies; }, get pickups() { return pickups; },
  start: (i) => { pickedHero = HEROES[i || 0]; begin(); }, endStage: () => endStage(),
  skipTo: (stage) => { run.stage = stage - 1; startStage(); }, dropClue: () => pickups.push({ kind: 'clue', x: run.p.x + 60, y: run.p.y, t: 0 }),
  killAll: () => { for (const e of enemies) e.hp = 1; },
  die: () => die(),
  rollOffers: () => { rollOffers(true); return offers; },
  dropPie: () => pickups.push({ kind: 'pie', x: run.p.x + 60, y: run.p.y, t: 0 }),
};
})();
