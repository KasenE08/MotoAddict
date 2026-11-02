// Staff, upgrades, locations, achievements, daily challenges and stats screens.
import { ROLES, MAX_ROLE_LEVEL } from '../data/staff.js';
import { MATERIAL, MAT_CATS, GLOBAL, GLOBAL_CATS, maxLevel } from '../data/upgrades.js';
import { LOCATIONS, LOCATION_PRICE, LOC_MULT } from '../config.js';
import { THEMES } from '../data/themes.js';
import { hire, fire, upgradeRole, wagesFor, totalWages } from '../core/staff.js';
import { buyMaterial, buyGlobal, globalCost, buyLocation, switchLocation, nextLocation } from '../core/upgrades.js';
import { ACHIEVEMENTS, ensureChallenges, challengeProgress, claimChallenge } from '../core/progress.js';
import { capacity } from '../core/showroom.js';
import { isOpenAt } from '../core/time.js';
import { money } from '../core/format.js';
import * as F from '../core/effects.js';
import { openModal, toast } from './modal.js';
import { fill } from './icons.js';
import { sfx } from './audio.js';

const pct = (x) => `${Math.round(x * 100)}%`;
const stars = (r) => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));

// ---------------- staff ----------------
export async function openStaff(G) {
  const m = await openModal({ title: 'Staff', cls: 'wide staff', body: '<div class="stf"></div>' });
  const root = m.querySelector('.stf');
  async function draw() {
    const s = G.state, i = s.activeLoc;
    root.innerHTML = await fill(`
      <div class="sup-top"><span>{{bill:22}}<b>${money(s.cash)}</b></span><span>Daily wages here <b>${money(wagesFor(s, i))}</b> · all locations <b>${money(totalWages(s))}</b></span><span class="note">Paid at 6 PM. If you can't pay, they quit.</span></div>
      <div class="roles">${ROLES.map((r) => {
        const have = F.n(s, i, r.id), cap = r.caps[i], lv = F.rl(s, i, r.id);
        const fee = F.hireFee(r, i), wage = F.dailyWage(s, r, i), up = lv < MAX_ROLE_LEVEL ? F.roleUpgradeCost(r, i, lv) : 0;
        return `<div class="role">
          <div class="rh">{{${r.icon}:30}}<div><b>${r.name}</b><span>${have}/${cap} hired · level ${lv}/${MAX_ROLE_LEVEL}</span></div></div>
          <p>${r.desc}</p>
          <div class="rc"><span>Hire ${money(fee)}</span><span>Wage ${money(wage)}/day</span></div>
          <div class="rb">
            <button class="btn go sm" data-a="hire" data-r="${r.id}" ${have >= cap || s.cash < fee ? 'disabled' : ''}>Hire</button>
            <button class="btn no sm" data-a="fire" data-r="${r.id}" ${have ? '' : 'disabled'}>Fire</button>
            <button class="btn sm" data-a="up" data-r="${r.id}" ${lv >= MAX_ROLE_LEVEL || s.cash < up ? 'disabled' : ''}>${lv >= MAX_ROLE_LEVEL ? 'Max level' : `Upgrade ${money(up)}`}</button>
          </div>
        </div>`;
      }).join('')}</div>`);
  }
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-a]');
    if (!b) return;
    const s = G.state, i = s.activeLoc, r = b.dataset.r;
    const res = b.dataset.a === 'hire' ? hire(s, i, r) : b.dataset.a === 'fire' ? fire(s, i, r) : upgradeRole(s, i, r);
    if (!res.ok) { if (res.reason) toast(res.reason); sfx('error'); return; }
    sfx(b.dataset.a === 'fire' ? 'click' : b.dataset.a === 'hire' ? 'hire' : 'upgrade');
    toast(b.dataset.a === 'hire' ? 'Hired!' : b.dataset.a === 'fire' ? 'Employee let go' : `Role upgraded to level ${res.level}`);
    G.changed(); draw();
  });
  await draw();
}

// ---------------- upgrades ----------------
export async function openUpgrades(G, tab = 'material') {
  let cat = tab === 'material' ? 'Showroom' : 'Sales';
  let mode = tab;
  const m = await openModal({ title: 'Upgrades', cls: 'wide upgrades', body: '<div class="upg"></div>' });
  const root = m.querySelector('.upg');
  async function draw() {
    const s = G.state, i = s.activeLoc, open = isOpenAt(G.now());
    const cats = mode === 'material' ? MAT_CATS : GLOBAL_CATS;
    if (!cats.includes(cat)) cat = cats[0];
    const items = mode === 'material' ? MATERIAL.filter((x) => x.cat === cat) : GLOBAL.filter((x) => x.cat === cat);
    root.innerHTML = await fill(`
      <div class="tabs"><button class="tab ${mode === 'material' ? 'on' : ''}" data-mode="material">This dealership</button><button class="tab ${mode === 'global' ? 'on' : ''}" data-mode="global">Company-wide</button>
        <span class="sup-top"><span>{{bill:22}}<b>${money(s.cash)}</b></span><span>{{star:20}}<b>${F.rating(s, i).toFixed(1)}</b></span></span></div>
      ${mode === 'material' ? `<p class="hint ${open ? 'warn' : ''}">${open ? 'Building work happens after hours: material upgrades can be bought while closed (6 PM - 9 AM).' : 'Closed: the builders are in. Material upgrades apply to this location only.'}</p>` : '<p class="hint">Company-wide upgrades apply to every location and can be bought any time.</p>'}
      <div class="chips">${cats.map((c) => `<button class="chip ${c === cat ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('')}</div>
      <div class="ups">${items.map((it) => {
        if (mode === 'material') {
          const lv = F.m(s, i, it.id), max = maxLevel(it.id, i), locked = max === 0;
          const cost = lv < max ? F.matCost(it.id, i, lv) : 0;
          return `<div class="up ${locked ? 'locked' : ''}"><div class="uh"><b>${it.name}</b><span>${locked ? `Unlocks at Location ${(it.unlock ?? 0) + 1}` : `Level ${lv}/${max}`}</span></div>
            <p>${it.desc}${it.arrivals ? ` <i>+${pct(it.arrivals)} customers per level.</i>` : ''}</p>
            <div class="pips">${Array.from({ length: max }, (_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('')}</div>
            ${locked ? '' : `<button class="btn go sm" data-buy="${it.id}" ${lv >= max || open || s.cash < cost ? 'disabled' : ''}>${lv >= max ? 'Maxed' : `Build ${money(cost)}`}</button>`}</div>`;
        }
        const lv = F.g(s, it.id), cost = lv < it.levels ? globalCost(it.id, lv) : 0;
        return `<div class="up"><div class="uh"><b>${it.name}${it.names && lv ? ` · ${it.names[lv - 1]}` : ''}</b><span>Level ${lv}/${it.levels}</span></div>
          <p>${it.desc}</p>
          <div class="pips">${Array.from({ length: it.levels }, (_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('')}</div>
          <button class="btn go sm" data-glob="${it.id}" ${lv >= it.levels || s.cash < cost ? 'disabled' : ''}>${lv >= it.levels ? 'Maxed' : `${it.names ? it.names[lv] + ' · ' : ''}Buy ${money(cost)}`}</button></div>`;
      }).join('')}</div>`);
  }
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.mode) { mode = b.dataset.mode; draw(); return; }
    if (b.dataset.cat) { cat = b.dataset.cat; draw(); return; }
    const s = G.state;
    const r = b.dataset.buy ? buyMaterial(s, s.activeLoc, b.dataset.buy, G.now()) : b.dataset.glob ? buyGlobal(s, b.dataset.glob) : null;
    if (!r) return;
    if (!r.ok) { toast(r.reason); sfx('error'); return; }
    sfx('upgrade');
    toast(`Upgraded to level ${r.level}`);
    G.changed(true); draw();
  });
  await draw();
}

// ---------------- locations ----------------
export async function openLocations(G) {
  const m = await openModal({ title: 'Locations', cls: 'wide locations', body: '<div class="locs"></div>' });
  const root = m.querySelector('.locs');
  async function draw() {
    const s = G.state, next = nextLocation(s);
    root.innerHTML = await fill(`
      <div class="sup-top"><span>{{bill:22}}<b>${money(s.cash)}</b></span><span class="note">One shared balance. Every location you own keeps its staff and bikes, and keeps earning (online and offline).</span></div>
      <div class="loclist">${LOCATIONS.map((l, i) => {
        const o = s.locations[i], th = THEMES[i];
        const state = o.owned ? (i === s.activeLoc ? 'here' : 'owned') : i === next ? 'buy' : 'locked';
        return `<div class="locc ${state}" style="--a:${th.extL};--b:${th.extR}">
          <div class="lh"><span class="ln">${l.id}</span><div><b>${l.name}</b><span>${l.blurb}</span></div></div>
          <div class="lstats">${o.owned ? `<span>{{bike:18}}${o.bikes.length}/${capacity(s, i)}</span><span>{{staff:18}}${ROLES.reduce((a, r) => a + F.n(s, i, r.id), 0)}</span><span>{{star:18}}${F.rating(s, i).toFixed(1)}</span>` : `<span>Prices x${LOC_MULT[i]} · richer customers · bikes up to Location ${l.id}</span>`}</div>
          ${state === 'here' ? '<em class="here">You are here</em>' : state === 'owned' ? `<button class="btn go sm" data-go="${i}">Go here</button>` : state === 'buy' ? `<button class="btn go sm" data-buy="${i}" ${s.cash < LOCATION_PRICE[i] ? 'disabled' : ''}>Buy ${money(LOCATION_PRICE[i])}</button>` : `<em>{{lock:18}} Buy Location ${i} first</em>`}
        </div>`;
      }).join('')}</div>`);
  }
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const s = G.state;
    if (b.dataset.go) { switchLocation(s, +b.dataset.go); sfx('click'); G.switched(); document.querySelector('.modal-wrap')?.remove(); return; }
    if (b.dataset.buy) {
      const i = +b.dataset.buy;
      if (!confirm(`Buy ${LOCATIONS[i].name} for ${money(LOCATION_PRICE[i])}?`)) return;
      const r = buyLocation(s, i, G.now());
      if (!r.ok) { toast(r.reason); sfx('error'); return; }
      sfx('achievement');
      toast(`Welcome to ${LOCATIONS[i].name}!`);
      G.switched();
      document.querySelector('.modal-wrap')?.remove();
    }
  });
  await draw();
}

// ---------------- achievements + challenges + stats ----------------
export async function openAchievements(G) {
  const s = G.state;
  const got = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length;
  const cats = [...new Set(ACHIEVEMENTS.map((a) => a.cat))];
  await openModal({
    title: `Achievements ${got}/${ACHIEVEMENTS.length}`,
    cls: 'wide achievements',
    body: await fill(cats.map((c) => `<h4>${c}</h4><div class="achs">${ACHIEVEMENTS.filter((a) => a.cat === c).map((a) => `
      <div class="ach ${s.achievements[a.id] ? 'got' : ''}">${s.achievements[a.id] ? '{{trophy:26}}' : '{{lock:26}}'}<div><b>${a.name}</b><span>${a.desc}</span><em>${money(a.reward)}</em></div></div>`).join('')}</div>`).join('')),
  });
}

export async function openChallenges(G) {
  const m = await openModal({ title: 'Daily challenges', cls: 'challenges', body: '<div class="chl"></div>' });
  const root = m.querySelector('.chl');
  async function draw() {
    const s = G.state, ch = ensureChallenges(s, G.now());
    const midnight = new Date(G.now()); midnight.setHours(24, 0, 0, 0);
    root.innerHTML = await fill(`<p class="sub">Three new challenges every day. Resets in ${Math.floor((midnight - G.now()) / 3600e3)}h ${Math.floor(((midnight - G.now()) % 3600e3) / 60e3)}m.</p>
      ${ch.list.map((c, k) => { const p = challengeProgress(s, c); return `<div class="chal ${c.claimed ? 'claimed' : p.done ? 'done' : ''}">
        <div><b>${p.title}</b><div class="bar"><i style="width:${(p.value / c.goal) * 100}%"></i></div><span>${typeof p.value === 'number' && c.goal > 50 ? money(p.value) + ' / ' + money(c.goal) : `${p.value}/${c.goal}`}</span></div>
        ${c.claimed ? '{{check:26}}' : `<button class="btn go sm" data-k="${k}" ${p.done ? '' : 'disabled'}>Claim ${money(c.reward)}</button>`}</div>`; }).join('')}`);
  }
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-k]');
    if (!b) return;
    const r = claimChallenge(G.state, +b.dataset.k);
    if (!r.ok) return;
    sfx('reward');
    toast(`Challenge reward: ${money(r.reward)}`);
    G.changed(); draw();
  });
  await draw();
}

export async function openStats(G) {
  const s = G.state, st = s.stats, i = s.activeLoc;
  const rows = [
    ['Cash', money(s.cash)], ['Total earned', money(st.totalEarned)], ['Best day', money(st.bestDay)],
    ['Bikes sold', st.bikesSold.toLocaleString()], ['Bike revenue', money(st.bikeRevenue)], ['Biggest sale', money(st.biggestSale)],
    ['Gear sales', `${st.gearSold} (${money(st.gearRevenue)})`], ['Service & detailing', money(st.serviceRevenue || 0)],
    ['Customers', st.customers.toLocaleString()], ['Walk-outs', st.walkouts.toLocaleString()], ['Haggles won', st.hagglesWon],
    ['Trade-ins', st.tradeIns], ['Thefts / stopped', `${st.thefts} / ${st.theftsStopped}`], ['Days open', st.daysOpened],
    ['Rating here', `${stars(F.rating(s, i))} ${F.rating(s, i).toFixed(1)}`], ['Cleanliness here', pct(F.cleanliness(s, i))],
    ['Customers/hour here', (F.arrivalsMult(s, i) * [6, 8, 10, 12, 14][i]).toFixed(1)], ['Offline cap', `${F.offlineCapHours(s)}h`],
  ];
  await openModal({ title: 'Stats', cls: 'wide stats', body: `<div class="statgrid">${rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>` });
}
