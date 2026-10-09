// High scores per hero. Every run is kept on this device; players can also type a name
// and post it to the shared global board (a public JSON store set in scores-config.js).
// game.js calls window.RRScores.box(run) on the end-of-run screen and .page(...) from the title.
(() => {
'use strict';
const SCORES_TOP = 10;
const SCORES_KEY = 'runerogue.scores';
const SCORES_NAME_KEY = 'runerogue.name';

function scoreUrl() { return (typeof SCORES_URL === 'string' && SCORES_URL) || ''; }
function cleanName(s) { return String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16); }
function scoreName() { try { return localStorage.getItem(SCORES_NAME_KEY) || ''; } catch (e) { return ''; } }

// One run as a board entry. Further is better; kills break ties.
function runScoreEntry(run, name) {
  const stage = Math.max(0, run.stage);
  const reach = run.won ? 999 : stage + 1;
  return {
    n: cleanName(name) || 'Anonymous', s: reach * 100000 + Math.min(99999, run.kills),
    a: Math.min(AREAS.length - 1, Math.floor(stage / (WAVES_PER_AREA + 1))), w: run.won ? 1 : 0,
    k: run.kills, r: run.raid || 0, t: Date.now(),
  };
}
function validEntry(e) { return e && typeof e.n === 'string' && Number.isFinite(e.s) && Number.isFinite(e.k); }
function addEntry(board, heroId, entry) {
  const list = (Array.isArray(board[heroId]) ? board[heroId] : []).filter((e) => validEntry(e) && e.t !== entry.t);
  list.push(entry);
  list.sort((x, y) => y.s - x.s || x.t - y.t);
  board[heroId] = list.slice(0, SCORES_TOP);
  return board[heroId].includes(entry);
}

function loadLocalScores() { try { return JSON.parse(localStorage.getItem(SCORES_KEY) || '{}') || {}; } catch (e) { return {}; } }
function saveLocalScore(heroId, entry) {
  const b = loadLocalScores(); addEntry(b, heroId, entry);
  try { localStorage.setItem(SCORES_KEY, JSON.stringify(b)); } catch (e) { /* optional */ }
}

async function fetchGlobalScores() {
  const url = scoreUrl();
  if (!url) throw new Error('no board');
  const res = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
}
// Read, add, write back. Returns true if the entry made the top list.
async function postGlobalScore(heroId, entry) {
  const board = await fetchGlobalScores();
  const made = addEntry(board, heroId, entry);
  if (!made) return false;
  const res = await fetch(scoreUrl(), { method: 'PUT', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(board) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return true;
}

function scoreReach(e) { return e.w ? 'Beat the Inferno' : (AREAS[e.a] || AREAS[0]).name; }
function scoreTable(list, mine) {
  const t = el('ol', 'scores');
  if (!list || !list.length) { t.appendChild(el('li', 'empty', 'No scores yet. Be the first!')); return t; }
  list.filter(validEntry).forEach((e, i) => {
    const li = el('li', mine && e.t === mine.t ? 'me' : '');
    li.appendChild(el('span', 'rk', `${i + 1}.`));
    const nm = el('span', 'nm'); nm.textContent = e.n; li.appendChild(nm);
    li.appendChild(el('span', 'rc', `${scoreReach(e)} · ${e.k.toLocaleString()} kills${e.r ? ` · raid ${e.r}` : ''}`));
    t.appendChild(li);
  });
  return t;
}

// Name box and Submit button for the end-of-run screen. The run is already saved locally.
function scoreSubmitBox(run) {
  const heroId = run.hero.id, box = el('div', 'score-box');
  const entry = runScoreEntry(run, scoreName());
  saveLocalScore(heroId, entry);
  box.appendChild(el('h2', '', `${run.hero.name} high scores`));
  const out = el('div'), online = !!scoreUrl();
  if (!online) out.appendChild(scoreTable(loadLocalScores()[heroId], entry));
  const form = el('form', 'row score-form');
  const inp = el('input'); inp.type = 'text'; inp.maxLength = 16; inp.placeholder = 'Your name'; inp.value = scoreName();
  inp.autocomplete = 'nickname'; inp.enterKeyHint = 'send'; inp.setAttribute('aria-label', 'Your name for the high score board');
  const go = el('button', 'btn', 'Submit score'); go.type = 'submit';
  form.appendChild(inp); form.appendChild(go); box.appendChild(form);
  const msg = el('p', ''); box.appendChild(msg); box.appendChild(out);
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const name = cleanName(inp.value);
    if (!name) { msg.textContent = 'Type a name first.'; inp.focus(); return; }
    try { localStorage.setItem(SCORES_NAME_KEY, name); } catch (e) { /* optional */ }
    entry.n = name; saveLocalScore(heroId, entry);
    if (!online) { msg.textContent = 'Saved on this device. The global board is coming soon.'; out.innerHTML = ''; out.appendChild(scoreTable(loadLocalScores()[heroId], entry)); form.remove(); return; }
    go.disabled = inp.disabled = true; msg.textContent = 'Sending...';
    try {
      const made = await postGlobalScore(heroId, entry);
      msg.textContent = made ? 'Score posted!' : `Not in the top ${SCORES_TOP} this time.`;
      out.innerHTML = ''; out.appendChild(scoreTable((await fetchGlobalScores())[heroId], entry));
      form.remove();
    } catch (e) {
      msg.textContent = 'Could not reach the global board. Your score is saved on this device; try again.';
      go.disabled = inp.disabled = false;
    }
  });
  // stop game keys (WASD, P, M...) firing while typing
  inp.addEventListener('keydown', (ev) => ev.stopPropagation());
  if (online) fetchGlobalScores().then((b) => { if (!out.firstChild) out.appendChild(scoreTable(b[heroId], null)); }).catch(() => {});
  return box;
}

// Title screen page: pick a hero, see its global and device boards.
let scoresHero = null, scoresView = 'global';
// heroes: the heroes to list; picked: the one to open on; show: puts a sheet on screen; onBack: returns to the title.
function renderScores(heroes, picked, show, onBack) {
  const again = () => renderScores(heroes, picked, show, onBack);
  const s = el('div', 'sheet'); s.style.maxWidth = '640px';
  s.appendChild(el('h1', '', 'High scores'));
  if (!scoresHero || !heroes.includes(scoresHero)) scoresHero = heroes.includes(picked) ? picked : heroes[0];
  const sel = el('select', 'score-hero'); sel.setAttribute('aria-label', 'Hero');
  for (const h of heroes) { const o = el('option'); o.value = h.id; o.textContent = h.name; o.selected = h === scoresHero; sel.appendChild(o); }
  sel.addEventListener('change', () => { scoresHero = heroes.find((h) => h.id === sel.value); again(); });
  const tabs = el('div', 'row score-tabs');
  tabs.appendChild(sel);
  const gb = btn('Global', 'btn step' + (scoresView === 'global' ? ' on' : ''), () => { scoresView = 'global'; again(); });
  const lb = btn('This device', 'btn step' + (scoresView === 'local' ? ' on' : ''), () => { scoresView = 'local'; again(); });
  const tb = el('div', 'steps'); tb.appendChild(gb); tb.appendChild(lb); tabs.appendChild(tb);
  s.appendChild(tabs);
  const out = el('div'); s.appendChild(out);
  if (scoresView === 'local') out.appendChild(scoreTable(loadLocalScores()[scoresHero.id], null));
  else if (!scoreUrl()) out.appendChild(el('p', '', 'The global board is not set up yet. Scores are kept on this device for now.'));
  else {
    out.appendChild(el('p', '', 'Loading...'));
    const want = scoresHero;
    fetchGlobalScores()
      .then((b) => { if (want !== scoresHero) return; out.innerHTML = ''; out.appendChild(scoreTable(b[want.id], null)); })
      .catch(() => { out.innerHTML = ''; out.appendChild(el('p', '', 'Could not reach the global board right now.')); });
  }
  const r = el('div', 'row'); r.style.marginTop = '16px';
  r.appendChild(btn('Back', 'btn big', onBack));
  s.appendChild(r);
  show(s);
}

function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
function btn(label, cls, onClick) { const b = el('button', cls, label); b.type = 'button'; b.addEventListener('click', onClick); return b; }

window.RRScores = { box: scoreSubmitBox, page: renderScores };
})();
