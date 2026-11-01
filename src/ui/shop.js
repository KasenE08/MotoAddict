// Supplier catalog, showroom arranging and the bike details card.
import { BIKES, BIKE, BRANDS } from '../data/bikes.js';
import { SPOTS, SPOT, KIND_LABEL } from '../data/showroom.js';
import { LOCATIONS, WHOLESALE } from '../config.js';
import { orderBike, cancelOrder, supplierCost, capacity, usedSpace, isUnlocked, moveBike, pendingFor } from '../core/showroom.js';
import { isOpenAt } from '../core/time.js';
import { money, duration } from '../core/format.js';
import { openModal, toast } from './modal.js';
import { fill } from './icons.js';
import { img } from './thumbs.js';

const arriveText = (at, now) => {
  const d = new Date(at), n = new Date(now);
  const nights = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 864e5);
  const when = nights <= 1 ? 'tonight' : `in ${nights} nights`;
  return `arrives ${when}, 2 AM (${duration(at - now)})`;
};
const specLine = (b) => `${b.cc}cc · ${b.hp} hp · ${b.mph} mph`;

// ---------------- supplier ----------------
export async function openSupplier(g) {
  let brand = 'All';
  const m = await openModal({ title: 'Supplier', cls: 'wide supplier', body: '<div class="sup"></div>' });
  const root = m.querySelector('.sup');
  async function draw() {
    const s = g.state, i = s.activeLoc, now = g.now();
    const cap = capacity(s, i), used = usedSpace(s, i);
    const list = BIKES.filter((b) => brand === 'All' || b.brand === brand).sort((a, b) => a.loc - b.loc || a.price - b.price);
    const orders = pendingFor(s, i).sort((a, b) => a.arriveAt - b.arriveAt);
    root.innerHTML = await fill(`
      <div class="sup-top">
        <span>{{bill:22}}<b>${money(s.cash)}</b></span>
        <span>{{bike:22}}<b>${used}/${cap}</b> spots used</span>
        <span class="note">Supplier price ${Math.round((s.wholesale ?? WHOLESALE) * 100)}% of MSRP · trucks arrive overnight</span>
      </div>
      <div class="chips">${['All', ...BRANDS].map((b) => `<button class="chip ${b === brand ? 'on' : ''}" data-brand="${b}">${b}</button>`).join('')}</div>
      <div class="cards">${list.map((b) => {
        const locked = !isUnlocked(b.id, i), cost = supplierCost(b.id, s);
        return `<div class="card ${locked ? 'locked' : ''}" data-id="${b.id}">
          ${img(b.id, 22)}
          <div class="nm">${b.name}</div>
          <div class="br">${b.brand} · ${b.color}</div>
          <div class="sp">${specLine(b)}</div>
          <div class="pr"><span>Cost <b>${money(cost)}</b></span><span>Sells <b>${money(b.price)}</b></span></div>
          ${locked ? `<div class="lock">Unlocks at Location ${b.loc}</div>` : `<button class="btn go order" data-id="${b.id}" ${s.cash < cost || used >= cap ? 'disabled' : ''}>{{cart:20:#ffffff}}Order</button>`}
        </div>`;
      }).join('')}</div>
      ${orders.length ? `<div class="orders"><h4>On order (${orders.length})</h4>${orders.map((o) => `<div class="ord">${img(o.model, 10, 'mini')}<span>${BIKE[o.model].name}</span><em>${arriveText(o.arriveAt, now)}</em><button class="btn sm cancel" data-uid="${o.uid}">Cancel</button></div>`).join('')}</div>` : ''}`);
  }
  root.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.brand) { brand = t.dataset.brand; draw(); return; }
    if (t.classList.contains('order')) {
      const r = orderBike(g.state, g.state.activeLoc, t.dataset.id, g.now());
      if (!r.ok) { toast(r.reason); return; }
      toast(`Ordered ${BIKE[r.order.model].name} — ${arriveText(r.order.arriveAt, g.now()).replace(/ \(.*\)/, '')}`);
      g.changed();
      draw();
    }
    if (t.classList.contains('cancel')) { cancelOrder(g.state, Number(t.dataset.uid)); toast('Order cancelled, refunded'); g.changed(); draw(); }
  });
  await draw();
  return m;
}

// ---------------- showroom (arrange) ----------------
export async function openShowroom(g, selectUid = null) {
  let sel = selectUid;
  const m = await openModal({ title: 'Showroom', cls: 'wide showroom', body: '<div class="sr"></div>' });
  const root = m.querySelector('.sr');
  async function draw() {
    const s = g.state, i = s.activeLoc, now = g.now(), open = isOpenAt(now);
    const cap = capacity(s, i), bikes = s.locations[i].bikes;
    const bySpot = new Map(bikes.map((b) => [b.spot, b]));
    root.innerHTML = await fill(`
      <div class="sr-top">
        <span>{{bike:22}}<b>${bikes.length}/${cap}</b> on display${pendingFor(s, i).length ? ` · ${pendingFor(s, i).length} on order` : ''}</span>
        <span class="note ${open ? 'warn' : ''}">${open ? 'Open now — you can rearrange bikes after closing (6 PM).' : sel ? 'Now tap the spot to move it to.' : 'Closed — tap a bike, then a spot, to move it.'}</span>
      </div>
      <p class="hint">Featured and window spots will get more customer attention once customers arrive (Phase 4).</p>
      <div class="spots">${SPOTS.slice(0, cap).map((sp) => {
        const b = bySpot.get(sp.id), bk = b && BIKE[b.model];
        return `<button class="spot ${sp.kind} ${b && b.uid === sel ? 'sel' : ''} ${b ? '' : 'empty'}" data-spot="${sp.id}" ${b ? `data-uid="${b.uid}"` : ''}>
          <span class="k">${KIND_LABEL[sp.kind]} · ${sp.label}</span>
          ${b ? `${img(b.model, 16)}<span class="nm">${bk.name}</span><span class="pr">${money(bk.price)}</span>` : '<span class="em">Empty — order a bike</span>'}
        </button>`;
      }).join('')}</div>`);
  }
  root.addEventListener('click', (e) => {
    const t = e.target.closest('.spot');
    if (!t) return;
    const s = g.state, i = s.activeLoc, open = isOpenAt(g.now());
    const uid = t.dataset.uid ? Number(t.dataset.uid) : null;
    if (sel !== null && t.dataset.spot) {
      if (uid === sel) { sel = null; draw(); return; }
      const r = moveBike(s, i, sel, t.dataset.spot, g.now());
      if (!r.ok) toast(r.reason); else { toast(r.swapped ? 'Bikes swapped' : 'Bike moved'); g.changed(); }
      sel = null; draw(); return;
    }
    if (uid === null) { openSupplier(g); return; }
    if (open) { openBike(g, uid); return; }
    sel = uid; draw();
  });
  await draw();
}

// ---------------- bike details ----------------
export async function openBike(g, uid) {
  const s = g.state, i = s.activeLoc;
  const b = s.locations[i].bikes.find((x) => x.uid === uid);
  if (!b) return;
  const bk = BIKE[b.model], sp = SPOT[b.spot];
  const open = isOpenAt(g.now());
  await openModal({
    title: bk.name,
    cls: 'bikecard',
    body: await fill(`
      <div class="bc">
        <div class="art">${img(b.model, 40, 'big')}</div>
        <div class="info">
          <div class="br">${bk.brand} · ${bk.color}</div>
          <div class="specs"><span>{{engine:22}}<b>${bk.cc}</b>cc</span><span>{{bolt:22}}<b>${bk.hp}</b>hp</span><span>{{speed:22}}<b>${bk.mph}</b>mph</span></div>
          <div class="rows">
            <div><span>Sells for</span><b class="g">${money(bk.price)}</b></div>
            <div><span>You paid</span><b>${money(b.paid)}</b></div>
            <div><span>Condition</span><b>${b.condition}%</b></div>
            <div><span>Display</span><b>${KIND_LABEL[sp.kind]} · ${sp.label}</b></div>
          </div>
        </div>
      </div>`),
    actions: [
      { label: open ? 'Move (after 6 PM)' : 'Move', kind: open ? '' : 'go', onClick: () => { if (open) { toast('Bikes can only be rearranged while closed (6 PM - 9 AM).'); return false; } openShowroom(g, uid); return false; } },
      { label: 'Close' },
    ],
  });
}

export const locName = (s) => LOCATIONS[s.activeLoc].name;
