// Minimal 24x24 stroke icons shared by every style (colored via currentColor).
const I = {
  store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 13v7h14v-7"/><path d="M10 20v-4h4v4"/>',
  truck: '<path d="M2 6h11v10H2z"/><path d="M13 9h4l4 4v3h-8z"/><circle cx="6" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
  staff: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c3 0 5 2 5 5"/>',
  up: '<path d="M12 20V5"/><path d="M6 11l6-6 6 6"/><path d="M5 20h14"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/><path d="M12 14v4M8 20h8"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  task: '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 10l2 2 4-4M8 16h8"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M14.8 8.6c-.5-.9-1.6-1.4-2.8-1.4-1.7 0-3 .9-3 2.3 0 3 6 1.6 6 4.6 0 1.4-1.3 2.4-3 2.4-1.3 0-2.5-.6-3-1.6M12 5.5v13"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
};

export function icon(name, size = 20, sw = 2) {
  return `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name]}</svg>`;
}

// The same fake game state is shown in every mockup so styles compare fairly.
export const MOCK = {
  cash: '$128,450',
  rate: '+$1,240/min',
  time: '2:47 PM',
  location: 'Maple Heights',
  locNo: 3,
  rating: '4.6',
  haggle: { bike: 'Yamaha YZF-R1', list: '$18,999', offer: '$16,800' },
};

export function tabbar(active = 0) {
  const tabs = [['store', 'Showroom'], ['truck', 'Supplier'], ['staff', 'Staff'], ['up', 'Upgrades'], ['more', 'More']];
  return `<nav class="tabbar">${tabs
    .map(([ic, label], i) => `<div class="tab${i === active ? ' on' : ''}">${icon(ic, 22)}<span>${label}</span></div>`)
    .join('')}</nav>`;
}

export function hud() {
  return `<div class="hud">
    <div class="hud-top">
      <div class="cash">${icon('coin', 22)}<b>${MOCK.cash}</b></div>
      <div class="rate">${MOCK.rate}</div>
    </div>
    <div class="hud-chips">
      <div class="chip loc">${icon('pin', 15)}<span>Loc ${MOCK.locNo} · ${MOCK.location}</span></div>
      <div class="chip open"><i class="dot"></i>${icon('clock', 15)}<span>${MOCK.time} · OPEN</span></div>
    </div>
  </div>`;
}

export function sideButtons() {
  return `<div class="side">
    <div class="sbtn">${icon('trophy', 22)}<i class="badge">2</i></div>
    <div class="sbtn">${icon('task', 22)}<i class="badge">1/3</i></div>
    <div class="sbtn rating">${icon('star', 20)}<span>${MOCK.rating}</span></div>
  </div>`;
}

export function haggleCard() {
  const h = MOCK.haggle;
  return `<div class="haggle">
    <div class="hg-head"><span class="hg-title">Haggle!</span><span class="hg-timer"><i style="width:62%"></i></span></div>
    <div class="hg-body">Customer offers <b>${h.offer}</b> for the <b>${h.bike}</b> <span class="hg-list">(list ${h.list})</span></div>
    <div class="hg-btns"><span class="b ok">Accept</span><span class="b mid">Counter</span><span class="b no">Refuse</span></div>
  </div>`;
}

export function statusBar() {
  return `<div class="statusbar"><span>9:41</span><span class="sb-r"><i></i><i></i><i></i><b></b></span></div>`;
}
