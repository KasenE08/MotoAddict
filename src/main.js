// MotoAddict — game bootstrap: state, loop, autosave, HUD.
import { LOCATIONS, OPEN_HOUR, CLOSE_HOUR } from './config.js';
import { now, setDevOffset, getDevOffset } from './core/clock.js';
import { newGame, advance, totalRate } from './core/engine.js';
import { isOpenAt, nextChange, nightLevel } from './core/time.js';
import { store, load, encode, decode, clearSave, SaveError } from './core/save.js';
import { money, duration, clockText, hourText } from './core/format.js';
import { renderDealership, toMap, spotAt, W as MAP_W, H as MAP_H } from './render/world.js';
import { capacity, pendingFor } from './core/showroom.js';
import { BIKE } from './data/bikes.js';
import { openSupplier, openShowroom, openBike } from './ui/shop.js';
import { makeCamera } from './ui/camera.js';
import { fill } from './ui/icons.js';
import { openModal, toast } from './ui/modal.js';

const DEV = new URLSearchParams(location.search).has('dev');
const DEV_KEY = 'motoaddict.devOffset';
if (DEV) setDevOffset(Number(localStorage.getItem(DEV_KEY)) || 0);

let state;
let loop = null;
const $ = (s) => document.querySelector(s);

// ---------- HUD ----------
async function buildHud() {
  $('#hud').innerHTML = await fill(`
    <div class="topbar">
      <div class="pnl cash hud-el">{{bill:26}}<b id="cash">$0</b><span id="rate" class="g"></span></div>
      <div class="pill clock hud-el" id="clockPill">{{clock:24}}<b id="clock">--</b><span class="tag" id="openTag">OPEN</span></div>
      <div class="pnl cap hud-el" id="capChip">{{bike:24}}<b id="capTxt">0/4</b></div>
      <div class="pnl loc hud-el" id="locChip">{{rank:26}}<div><small id="locNo">LOCATION 1</small><b id="locName">Rust Row</b></div></div>
    </div>
    <div class="hud-bl">
      <button class="bb big hud-el" id="btnSupplier" aria-label="Supplier">{{cart:38}}</button>
      <button class="bb hud-el" id="btnShowroom" aria-label="Showroom">{{bike:36:#fff6e0}}</button>
      <div class="pnl deliv hud-el" id="deliv" hidden>{{truck:28}}<div><b id="delivN">0 bikes</b><span id="delivT">arrive 2 AM</span></div></div>
    </div>
    <div class="hud-br"><button class="sq hud-el" id="btnSettings" aria-label="Settings">{{gear:26}}</button></div>
    ${DEV ? `<div class="dev hud-el"><b>DEV TIME</b><button data-h="1">+1h</button><button data-away="12">Away 12h</button><button data-go="8:59">8:59 AM</button><button data-go="17:59">5:59 PM</button><button data-reset>Reset</button><span id="devOff"></span></div>` : ''}`);
  $('#btnSettings').onclick = openSettings;
  $('#btnSupplier').onclick = () => openSupplier(G);
  $('#btnShowroom').onclick = () => openShowroom(G);
  $('#deliv').onclick = () => openSupplier(G);
  $('#capChip').onclick = () => openShowroom(G);
  if (DEV) wireDev();
}

function renderHud() {
  const t = now();
  const open = isOpenAt(t);
  $('#cash').textContent = money(state.cash);
  $('#rate').textContent = open ? `+${money(totalRate(state) * 60)}/min` : 'closed';
  $('#rate').classList.toggle('off', !open);
  $('#clock').textContent = clockText(t);
  const nc = nextChange(t);
  $('#openTag').textContent = open ? 'OPEN' : `CLOSED · opens ${hourText(OPEN_HOUR)}`;
  $('#clockPill').classList.toggle('closed', !open);
  $('#clockPill').title = open ? `Closes at ${hourText(CLOSE_HOUR)} (in ${duration(nc.at - t)})` : `Opens in ${duration(nc.at - t)}`;
  const loc = LOCATIONS[state.activeLoc];
  $('#locNo').textContent = `LOCATION ${loc.id}`;
  $('#locName').textContent = loc.name;
  $('#night').style.opacity = nightLevel(t).toFixed(3);
  const i = state.activeLoc, cap = capacity(state, i), n = state.locations[i].bikes.length;
  $('#capTxt').textContent = `${n}/${cap}`;
  const ord = pendingFor(state, i);
  $('#deliv').hidden = ord.length === 0;
  if (ord.length) {
    $('#delivN').textContent = `${ord.length} bike${ord.length > 1 ? 's' : ''}`;
    $('#delivT').textContent = `arrive in ${duration(Math.min(...ord.map((o) => o.arriveAt)) - t)}`;
  }
  if (DEV) $('#devOff').textContent = getDevOffset() ? `${(getDevOffset() / 3600e3).toFixed(1)}h ahead` : 'real time';
}

// ---------- world ----------
let worldBusy = false, worldAgain = false;
async function refreshWorld() {
  if (worldBusy) { worldAgain = true; return; }
  worldBusy = true;
  const i = state.activeLoc;
  await renderDealership($('#world'), { populated: false, capacity: capacity(state, i), display: state.locations[i].bikes });
  worldBusy = false;
  if (worldAgain) { worldAgain = false; refreshWorld(); }
}
function onMapTap(mx, my) {
  const i = state.activeLoc, spot = spotAt(mx, my, capacity(state, i));
  if (!spot || document.querySelector('.modal-wrap')) return;
  const b = state.locations[i].bikes.find((x) => x.spot === spot);
  if (b) openBike(G, b.uid); else openSupplier(G);
}
// shared handle for UI modules
const G = { get state() { return state; }, now, changed: () => { save(); renderHud(); refreshWorld(); } };

// ---------- loop + saving ----------
function tick() {
  const r = advance(state, now());
  if (r.delivered?.length) { toast(`Supplier truck arrived: ${r.delivered.length} bike${r.delivered.length > 1 ? 's' : ''} on display`); refreshWorld(); save(); }
  renderHud();
}
function save() { try { store(state); } catch (e) { console.warn('autosave failed', e); } }
function start() { if (!loop) { loop = setInterval(tick, 250); } tick(); }
function stop() { clearInterval(loop); loop = null; }

async function catchUp() {
  const r = advance(state, now(), { offline: true });
  renderHud();
  save();
  if (r.delivered?.length) refreshWorld();
  if (r.awayMs < 60e3) return;
  const del = r.delivered?.length ? `<p class="sub">Delivered overnight: ${r.delivered.map((o) => BIKE[o.model].name).join(', ')}.</p>` : '';
  const capH = state.offlineCapHours;
  let body;
  if (r.earned > 0) {
    body = `<p>While you were away, your dealership earned</p><p class="big">${money(r.earned)}</p>
      <p class="sub">from ${duration(r.countedMs)} of open hours${r.capped ? ` (offline cap: ${capH}h — you were open ${duration(r.openMs)})` : ''}.</p>${del}`;
  } else {
    body = `<p>You were away ${duration(r.awayMs)}.</p><p class="sub">The dealership was closed the whole time, so nothing was earned. It's open ${hourText(OPEN_HOUR)}–${hourText(CLOSE_HOUR)}.</p>${del}`;
  }
  await openModal({ title: 'Welcome back!', body, cls: 'welcome', actions: [{ label: r.earned > 0 ? 'Collect' : 'OK', kind: 'go' }] });
}

// ---------- settings: save code export / import ----------
async function openSettings() {
  const code = encode(state);
  const m = await openModal({
    title: 'Settings',
    cls: 'settings',
    body: `
      <h4>Save code</h4>
      <p class="sub">Copy this to back up your game or move it to another device.</p>
      <textarea id="exportCode" readonly rows="3">${code}</textarea>
      <button class="btn" id="copyCode">Copy save code</button>
      <h4>Load a save</h4>
      <textarea id="importCode" rows="3" placeholder="Paste a save code here"></textarea>
      <button class="btn" id="loadCode">Load save</button>
      <p class="err" id="importErr"></p>
      <h4>Danger zone</h4>
      <button class="btn no" id="resetGame">Reset game</button>
      <p class="sub ver">MotoAddict · save format v${state.v}</p>`,
  });
  m.querySelector('#copyCode').onclick = async () => {
    const ta = m.querySelector('#exportCode');
    ta.select();
    try { await navigator.clipboard.writeText(ta.value); } catch { document.execCommand('copy'); }
    toast('Save code copied');
  };
  m.querySelector('#loadCode').onclick = () => {
    const err = m.querySelector('#importErr');
    try {
      const incoming = decode(m.querySelector('#importCode').value, now());
      if (!confirm(`Load this save? It has ${money(incoming.cash)}. Your current game will be replaced.`)) return;
      state = incoming;
      refreshWorld();
      document.querySelector('.modal-wrap')?.remove();
      toast('Save loaded');
      catchUp();
    } catch (e) {
      err.textContent = e instanceof SaveError ? e.message : 'Could not read that save code.';
    }
  };
  m.querySelector('#resetGame').onclick = () => {
    if (!confirm('Reset the game? All progress will be lost. (Copy your save code first if you might want it back.)')) return;
    if (!confirm('Are you sure? This cannot be undone.')) return;
    clearSave();
    state = newGame(now());
    save();
    renderHud();
    refreshWorld();
    document.querySelector('.modal-wrap')?.remove();
    toast('New game started');
  };
}

// ---------- dev time controls (?dev=1) ----------
function wireDev() {
  const set = (ms) => { setDevOffset(ms); localStorage.setItem(DEV_KEY, String(ms)); };
  $('.dev').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.h) { set(getDevOffset() + b.dataset.h * 3600e3); tick(); }
    if (b.dataset.away) { save(); set(getDevOffset() + b.dataset.away * 3600e3); catchUp(); }
    if (b.dataset.go) {
      const [h, m] = b.dataset.go.split(':').map(Number);
      const d = new Date(now());
      let target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime();
      if (target < now()) target += 24 * 3600e3;
      set(getDevOffset() + (target - now()));
      tick();
    }
    if ('reset' in b.dataset) { set(0); state.lastTick = Math.min(state.lastTick, now()); tick(); }
  });
}

// ---------- boot ----------
async function boot() {
  await document.fonts.load('16px "Jersey 10"').catch(() => {});
  state = load(now()) ?? newGame(now());
  await refreshWorld();
  const cam = makeCamera($('#viewport'), $('#layer'), MAP_W, MAP_H, { scale: 2, min: 1, max: 4, onTap: onMapTap });
  cam.lookAt(...toMap(7, 5));
  window.__cam = cam;
  await buildHud();
  await catchUp();
  start();
  setInterval(save, 5000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { tick(); save(); stop(); } else { catchUp(); start(); }
  });
  window.addEventListener('pagehide', save);
  window.__game = { get state() { return state; }, save, tick, refreshWorld };
  document.body.dataset.ready = '1';
}

boot();
