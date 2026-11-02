// MotoAddict — game bootstrap: state, loop, autosave, HUD, events.
import { LOCATIONS, OPEN_HOUR, CLOSE_HOUR, LOCATION_PRICE } from './config.js';
import { now, setDevOffset, getDevOffset } from './core/clock.js';
import { newGame, advance } from './core/engine.js';
import { isOpenAt, nextChange, nightLevel, dayKey } from './core/time.js';
import { store, load, encode, decode, clearSave, SaveError } from './core/save.js';
import { money, duration, clockText, hourText } from './core/format.js';
import { capacity, pendingFor, repairSpots } from './core/showroom.js';
import './core/sales.js';
import './core/staff.js';
import { checkAchievements, ensureChallenges, challengeProgress } from './core/progress.js';
import { rating, cleanliness } from './core/effects.js';
import { BIKE } from './data/bikes.js';
import { ROLE } from './data/staff.js';
import { getLayout } from './data/layout.js';
import { renderDealership, toMap, spotAt, mapFor } from './render/world.js';
import { makeCamera } from './ui/camera.js';
import { fill } from './ui/icons.js';
import { openModal, toast } from './ui/modal.js';
import { openSupplier, openShowroom, openBike } from './ui/shop.js';
import { openStaff, openUpgrades, openLocations, openAchievements, openChallenges, openStats } from './ui/panels.js';
import { makeCrowd } from './ui/crowd.js';
import { makeHaggle, makeTradeIn, floatMoney, spotXY } from './ui/salesui.js';
import { initAudio, sfx, setMuted } from './ui/audio.js';

const DEV = new URLSearchParams(location.search).has('dev');
const DEV_KEY = 'motoaddict.devOffset';
if (DEV) setDevOffset(Number(localStorage.getItem(DEV_KEY)) || 0);

let state;
let loop = null, anim = null, cam, crowd, haggle, tradeIn;
let seenStaffLog = 0, seenTheftLog = 0;
const $ = (s) => document.querySelector(s);

// ---------- HUD ----------
async function buildHud() {
  $('#hud').innerHTML = await fill(`
    <div class="topbar">
      <div class="pnl cash hud-el">{{bill:26}}<b id="cash">$0</b><span id="rate" class="g"></span></div>
      <div class="pill clock hud-el" id="clockPill">{{clock:24}}<b id="clock">--</b><span class="tag" id="openTag">OPEN</span></div>
      <div class="pnl stat hud-el" id="rateChip">{{star:22}}<b id="stars">3.0</b>{{broom:22}}<b id="clean">100%</b></div>
      <div class="pnl cap hud-el" id="capChip">{{bike:24}}<b id="capTxt">0/4</b></div>
      <div class="pnl loc hud-el" id="locChip">{{rank:26}}<div><small id="locNo">LOCATION 1</small><b id="locName">Rust Row</b></div>{{swap:22}}</div>
    </div>
    <div class="rcol">
      <button class="tb hud-el" id="btnMap" aria-label="Locations">{{map:28}}<em id="mapBadge" hidden>!</em></button>
      <button class="tb hud-el" id="btnChallenges" aria-label="Daily challenges">{{task:28}}<em class="n" id="chBadge" hidden>0</em></button>
      <button class="tb hud-el" id="btnAch" aria-label="Achievements">{{trophy:28}}</button>
      <button class="tb hud-el" id="btnStats" aria-label="Stats">{{bars:28}}</button>
    </div>
    <div class="promo hud-el" id="tradein" hidden></div>
    <div class="haggle hud-el" id="haggle" hidden></div>
    <div class="hud-bl">
      <button class="bb big hud-el" id="btnSupplier" aria-label="Supplier">{{cart:38}}</button>
      <button class="bb hud-el" id="btnShowroom" aria-label="Showroom">{{bike:36:#fff6e0}}</button>
      <button class="bb hud-el" id="btnUpgrades" aria-label="Upgrades">{{hammer:34}}</button>
      <div class="pnl deliv hud-el" id="deliv" hidden>{{truck:28}}<div><b id="delivN">0 bikes</b><span id="delivT">arrive 2 AM</span></div></div>
    </div>
    <div class="hud-br">
      <button class="sq hud-el" id="btnSettings" aria-label="Settings">{{gear:26}}</button>
      <button class="bb hud-el" id="btnStaff" aria-label="Staff">{{staff:34:#fff6e0}}</button>
    </div>
    ${DEV ? `<div class="dev hud-el"><b>DEV</b><button data-h="1">+1h</button><button data-away="12">Away 12h</button><button data-go="8:59">8:59</button><button data-go="17:59">17:59</button><button data-go="1:59">1:59</button><button data-cash="1">+$</button><button data-reset>Reset</button><span id="devOff"></span></div>` : ''}`);
  const on = (id, fn) => { $(id).onclick = fn; };
  on('#btnSettings', openSettings);
  on('#btnSupplier', () => openSupplier(G));
  on('#btnShowroom', () => openShowroom(G));
  on('#btnUpgrades', () => openUpgrades(G));
  on('#btnStaff', () => openStaff(G));
  on('#btnMap', () => openLocations(G));
  on('#locChip', () => openLocations(G));
  on('#btnChallenges', () => openChallenges(G));
  on('#btnAch', () => openAchievements(G));
  on('#btnStats', () => openStats(G));
  on('#rateChip', () => openStats(G));
  on('#deliv', () => openSupplier(G));
  on('#capChip', () => openShowroom(G));
  if (DEV) wireDev();
}

function renderHud() {
  const t = now(), open = isOpenAt(t), i = state.activeLoc;
  $('#cash').textContent = money(state.cash);
  const today = state.today.key === dayKey(t) ? state.today.earned : 0;
  $('#rate').textContent = `today +${money(today)}`;
  $('#rate').classList.toggle('off', !open && today === 0);
  $('#clock').textContent = clockText(t);
  const nc = nextChange(t);
  $('#openTag').textContent = open ? 'OPEN' : 'CLOSED';
  $('#clockPill').classList.toggle('closed', !open);
  $('#clockPill').title = open ? `Closes at ${hourText(CLOSE_HOUR)} (in ${duration(nc.at - t)})` : `Opens in ${duration(nc.at - t)}`;
  const loc = LOCATIONS[i];
  $('#locNo').textContent = `LOCATION ${loc.id}`;
  $('#locName').textContent = loc.name;
  $('#stars').textContent = rating(state, i).toFixed(1);
  $('#clean').textContent = `${Math.round(cleanliness(state, i) * 100)}%`;
  $('#night').style.opacity = nightLevel(t).toFixed(3);
  $('#capTxt').textContent = `${state.locations[i].bikes.length}/${capacity(state, i)}`;
  const ord = pendingFor(state, i);
  $('#deliv').hidden = ord.length === 0;
  if (ord.length) {
    $('#delivN').textContent = `${ord.length} bike${ord.length > 1 ? 's' : ''}`;
    $('#delivT').textContent = `arrive in ${duration(Math.min(...ord.map((o) => o.arriveAt)) - t)}`;
  }
  const ch = ensureChallenges(state, t);
  const claimable = ch.list.filter((c) => !c.claimed && challengeProgress(state, c).done).length;
  $('#chBadge').hidden = !claimable;
  $('#chBadge').textContent = claimable;
  const nextLoc = state.locations.findIndex((l) => !l.owned);
  $('#mapBadge').hidden = !(nextLoc > 0 && state.cash >= LOCATION_PRICE[nextLoc]);
  if (DEV) $('#devOff').textContent = getDevOffset() ? `${(getDevOffset() / 3600e3).toFixed(1)}h ahead` : 'real time';
}

// ---------- world ----------
let worldBusy = false, worldAgain = false, shownLoc = -1;
async function refreshWorld() {
  if (worldBusy) { worldAgain = true; return; }
  worldBusy = true;
  const i = state.activeLoc;
  await renderDealership($('#world'), { loc: i, mat: state.locations[i].mat, glass: $('#glass'), capacity: capacity(state, i), display: state.locations[i].bikes });
  if (cam && shownLoc !== i) {
    const m = mapFor(i);
    cam.setSize(m.W, m.H);
    cam.lookAt(...toMap(...getLayout(i).focus));
    crowd?.reset();
    shownLoc = i;
  }
  worldBusy = false;
  if (worldAgain) { worldAgain = false; refreshWorld(); }
}
function onMapTap(mx, my) {
  const i = state.activeLoc, spot = spotAt(mx, my, capacity(state, i), i);
  if (!spot || document.querySelector('.modal-wrap')) return;
  const b = state.locations[i].bikes.find((x) => x.spot === spot);
  if (b) { sfx('rev'); openBike(G, b.uid); } else openSupplier(G);
}

// shared handle for UI modules
const G = {
  get state() { return state; },
  now,
  changed: (world) => { save(); renderHud(); if (world !== false) refreshWorld(); },
  switched: () => { save(); renderHud(); refreshWorld(); },
};

// ---------- live events ----------
function handleEvents(report) {
  const t = now();
  let restock = false;
  for (const ev of report.events || []) {
    const here = ev.loc === undefined || ev.loc === state.activeLoc;
    if (ev.type === 'sale' && here) { const [x, y] = spotXY(ev.spot, state.activeLoc); floatMoney(ev.price, x, y, 'sale'); restock = true; sfx('cash'); sfx('rideoff', 1.2); }
    if (ev.type === 'sale' && !here) restock = true;
    if (ev.type === 'gear' && here) { const L = getLayout(state.activeLoc); floatMoney(ev.amount, ...L.deskCustomer, 'gear'); sfx('gear'); }
    if (ev.type === 'arrive' && here) sfx('door');
    if (ev.type === 'leave' && here) crowd?.leave(ev, t, state.activeLoc);
    if (ev.type === 'haggle' && here) sfx('haggle');
    if (ev.type === 'tradein') { toast('Trade-in offer! Tap it to take a look.'); sfx('tradein'); }
    if (ev.type === 'theft') { toast(`A ${BIKE[ev.model].name} was stolen at ${LOCATIONS[ev.loc].name}!${ev.refund ? ` Insurance paid ${money(ev.refund)}.` : ''}`); sfx('theft'); restock = true; }
    if (ev.type === 'theftStopped' && here) toast('Your security stopped a theft last night!');
  }
  if (restock) { refreshWorld(); save(); }
}

function staffNews() {
  const log = state.staffLog || [];
  if (log.length > seenStaffLog) {
    const fresh = log.slice(seenStaffLog);
    const unpaid = fresh.filter((e) => e.why === 'unpaid').reduce((a, e) => a + e.n, 0);
    const quit = fresh.filter((e) => e.why === 'quit');
    if (unpaid) toast(`${unpaid} employee${unpaid > 1 ? 's' : ''} quit: you couldn't pay their wages!`);
    else if (quit.length) toast(`A ${ROLE[quit[0].role].name.toLowerCase()} quit today.`);
  }
  seenStaffLog = log.length;
}

function achievementsCheck() {
  const got = checkAchievements(state, now());
  if (!got.length) return;
  for (const a of got) toast(`Achievement: ${a.name}! +${money(a.reward)}`);
  sfx('achievement');
  save();
}

// ---------- loop + saving ----------
function tick() {
  const r = advance(state, now());
  handleEvents(r);
  if (r.delivered?.length) { toast(`Supplier truck arrived: ${r.delivered.length} bike${r.delivered.length > 1 ? 's' : ''} on display`); sfx('delivery'); refreshWorld(); save(); }
  staffNews();
  achievementsCheck();
  renderHud();
}
function animate() {
  if (document.hidden) return;
  crowd.draw(state, now());
  haggle.render();
  tradeIn.render();
}
function save() { try { store(state); } catch (e) { console.warn('autosave failed', e); } }
function start() { if (!loop) { loop = setInterval(tick, 250); anim = setInterval(animate, 120); } tick(); }
function stop() { clearInterval(loop); clearInterval(anim); loop = null; anim = null; }

async function catchUp() {
  const r = advance(state, now(), { offline: true });
  const gotAch = checkAchievements(state, now());
  seenStaffLog = Math.min(seenStaffLog, (state.staffLog || []).length);
  renderHud();
  save();
  if (r.delivered?.length || r.sales.length || r.events.some((e) => e.type === 'theft')) refreshWorld();
  if (r.awayMs < 60e3) return;
  const capH = state.offlineCapHours;
  const lines = [];
  if (r.sales.length) lines.push(`Sold ${r.sales.length} bike${r.sales.length > 1 ? 's' : ''}: ${r.sales.slice(0, 6).map((x) => BIKE[x.model].name).join(', ')}${r.sales.length > 6 ? '…' : ''} (${money(r.sales.reduce((a, x) => a + x.price, 0))})${r.autoHaggles ? ` — your staff accepted ${r.autoHaggles} haggle offer${r.autoHaggles > 1 ? 's' : ''}` : ''}.`);
  if (r.gearCount) lines.push(`Gear, helmets &amp; parts: ${r.gearCount} sale${r.gearCount > 1 ? 's' : ''} (${money(r.gear)}).`);
  if (r.service) lines.push(`Service &amp; detailing: ${money(r.service)}.`);
  if (r.bonus) lines.push(`Offline earnings boost: +${money(r.bonus)}.`);
  if (r.walkouts) lines.push(`${r.walkouts} customer${r.walkouts > 1 ? 's' : ''} walked out waiting for a salesperson.`);
  if (r.delivered?.length) lines.push(`Delivered overnight: ${r.delivered.map((o) => BIKE[o.model].name).join(', ')}.`);
  for (const e of r.events.filter((x) => x.type === 'theft')) lines.push(`<b class="warn">Stolen: ${BIKE[e.model].name} at ${LOCATIONS[e.loc].name}${e.refund ? ` (insurance paid ${money(e.refund)})` : ''}.</b>`);
  const stopped = r.events.filter((x) => x.type === 'theftStopped').length;
  if (stopped) lines.push(`Security stopped ${stopped} theft attempt${stopped > 1 ? 's' : ''}.`);
  const unpaid = (state.staffLog || []).filter((e) => e.at > now() - r.awayMs && e.why === 'unpaid').reduce((a, e) => a + e.n, 0);
  if (gotAch.length) lines.push(`Achievements: ${gotAch.map((a) => `${a.name} (+${money(a.reward)})`).join(', ')}.`);
  if (unpaid) lines.push(`<b class="warn">${unpaid} employee${unpaid > 1 ? 's' : ''} quit because wages couldn't be paid.</b>`);
  seenStaffLog = (state.staffLog || []).length;
  const body = r.earned > 0
    ? `<p>While you were away, your dealership${state.locations.filter((l) => l.owned).length > 1 ? 's' : ''} earned</p><p class="big">${money(r.earned)}</p>
      <p class="sub">from ${duration(r.countedMs)} of open hours${r.capped ? ` (offline cap: ${capH}h — you were open ${duration(r.openMs)})` : ''}.</p>${lines.map((l) => `<p class="sub">${l}</p>`).join('')}`
    : `<p>You were away ${duration(r.awayMs)}.</p><p class="sub">${r.openMs ? 'Nothing sold while you were away. Make sure bikes are on display!' : `The dealership was closed the whole time. It's open ${hourText(OPEN_HOUR)}–${hourText(CLOSE_HOUR)}.`}</p>${lines.map((l) => `<p class="sub">${l}</p>`).join('')}`;
  if (r.earned > 0) sfx('reward');
  await openModal({ title: 'Welcome back!', body, cls: 'welcome', actions: [{ label: r.earned > 0 ? 'Collect' : 'OK', kind: 'go' }] });
}

// ---------- onboarding: brief tips once ----------
async function tips() {
  if (state.tips?.seen || (navigator.webdriver && !location.search.includes('tips'))) return;
  state.tips = { seen: true };
  save();
  await openModal({
    title: 'Welcome to MotoAddict!',
    cls: 'tips',
    body: await fill(`<ul class="tiplist">
      <li>{{cart:26}}<span><b>Order bikes</b> from the supplier. They arrive on the 2 AM truck.</span></li>
      <li>{{clock:26}}<span>You're <b>open 9 AM–6 PM</b> (your phone's clock). Customers only come while open.</span></li>
      <li>{{staff:26}}<span><b>Hire staff</b> to sell more, bring in customers and keep things clean.</span></li>
      <li>{{hammer:26}}<span><b>Upgrade</b> your dealership after hours to attract more (and richer) customers.</span></li>
      <li>{{map:26}}<span>Save up for <b>new locations</b>: 5 neighborhoods, each richer than the last.</span></li>
    </ul><p class="sub">Drag to look around, pinch to zoom, tap a bike for details.</p>`),
    actions: [{ label: "Let's go!", kind: 'go' }],
  });
}

// ---------- settings ----------
async function openSettings() {
  const code = encode(state);
  const m = await openModal({
    title: 'Settings',
    cls: 'settings',
    body: await fill(`
      <div class="setrow"><span>Sound effects</span><button class="btn sm" id="sndBtn">${state.settings.sound ? '{{sound:22}} On' : '{{mute:22}} Off'}</button></div>
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
      <p class="sub ver">MotoAddict · save format v${state.v} · <a href="assets/sfx/CREDITS.md" target="_blank" rel="noopener">sound credits</a></p>`),
  });
  m.querySelector('#sndBtn').onclick = async () => {
    state.settings.sound = !state.settings.sound;
    setMuted(!state.settings.sound);
    save();
    m.querySelector('#sndBtn').innerHTML = await fill(state.settings.sound ? '{{sound:22}} On' : '{{mute:22}} Off');
    if (state.settings.sound) sfx('toggle');
  };
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
      repairSpots(state);
      shownLoc = -1;
      refreshWorld();
      document.querySelector('.modal-wrap')?.remove();
      toast('Save loaded');
      catchUp();
    } catch (e) {
      err.textContent = e instanceof SaveError ? e.message : 'Could not read that save code.';
      sfx('error');
    }
  };
  m.querySelector('#resetGame').onclick = () => {
    if (!confirm('Reset the game? All progress will be lost. (Copy your save code first if you might want it back.)')) return;
    if (!confirm('Are you sure? This cannot be undone.')) return;
    clearSave();
    state = newGame(now());
    state.tips = { seen: true };
    crowd.reset();
    shownLoc = -1;
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
    if (b.dataset.cash) { state.cash += 100000; renderHud(); }
    if (b.dataset.go) {
      const [h, mm] = b.dataset.go.split(':').map(Number);
      const d = new Date(now());
      let target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, mm).getTime();
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
  repairSpots(state);
  seenStaffLog = (state.staffLog || []).length;
  initAudio(!state.settings.sound);
  const m = mapFor(state.activeLoc);
  cam = makeCamera($('#viewport'), $('#layer'), m.W, m.H, { scale: 2, min: 1, max: 4, onTap: onMapTap });
  await refreshWorld();
  window.__cam = cam;
  await buildHud();
  crowd = makeCrowd($('#peopleIn'), $('#peopleOut'));
  haggle = makeHaggle(G, (rep) => handleEvents(rep));
  tradeIn = makeTradeIn(G);
  await catchUp();
  await tips();
  start();
  setInterval(save, 5000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { tick(); save(); stop(); } else { catchUp(); start(); }
  });
  window.addEventListener('pagehide', save);
  // test hook: where a tile point is on screen (CSS px)
  const screenOf = (x, y, z = 0) => { const [mx, my] = toMap(x, y, z); const c = cam.pos; return [c.x + mx * c.s, c.y + my * c.s]; };
  window.__game = { get state() { return state; }, save, tick, refreshWorld, G, screenOf, layout: () => getLayout(state.activeLoc) };
  document.body.dataset.ready = '1';
}

boot();
