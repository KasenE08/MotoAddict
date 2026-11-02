// Customers + sales: arrivals, budgets, wants, salesperson service, buying,
// haggling, walk-outs, gear sales, trash and trade-in offers. Pure logic, seeded RNG.
import { CUSTOMERS, SALES, LOCATIONS, TRASH_CHANCE } from '../config.js';
import { BIKE, BIKES, BRANDS } from '../data/bikes.js';
import { getLayout } from '../data/layout.js';
import { addOpenRunner, earn } from './engine.js';
import { isOpenAt } from './time.js';
import { rng, uniform, chance, expWait, gauss, weighted, pick } from './rng.js';
import { freeSpace, freeSpot } from './showroom.js';
import * as F from './effects.js';

const MIN = 60e3;

export const arrivalsPerHour = (state, i) => CUSTOMERS[i].arrivals * F.arrivalsMult(state, i);
export const servers = (state, i) => F.servers(state, i);
const wealth = (i) => Math.sqrt(CUSTOMERS[i].budget / CUSTOMERS[0].budget);
const spotKind = (i, spotId) => getLayout(i).spot[spotId]?.kind || 'floor';

/** What a bike sells for: list price, scaled down for used/damaged bikes. */
export function salePrice(bike) {
  const list = BIKE[bike.model].price;
  if (bike.source !== 'tradein' && bike.condition >= 100) return list;
  return Math.round((list * (0.45 + 0.4 * (bike.condition / 100))) / 10) * 10;
}

export function sim(state, i) {
  const loc = state.locations[i];
  if (!loc.sim) loc.sim = { nextArrival: null, nextTradeIn: null, customers: [], nextId: 1, piles: 0 };
  if (loc.sim.piles == null) loc.sim.piles = 0;
  return loc.sim;
}

function newCustomer(state, i, t, extra = {}) {
  const s = sim(state, i);
  const budget = Math.round((CUSTOMERS[i].budget * Math.exp(SALES.budgetSpread * gauss(state))) / 50) * 50;
  const c = {
    id: s.nextId++,
    budget,
    brand: chance(state, SALES.brandLoyal) ? pick(state, BRANDS) : null,
    arrivedAt: t,
    phase: 'queue',
    giveUpAt: t + uniform(state, ...SALES.patienceMinutes) * MIN * F.patienceMult(state),
    look: Math.floor(rng(state) * 1e9), // appearance seed for the renderer
    ...extra,
  };
  // online listings: some customers arrive already wanting a bike you have
  if (!c.want && chance(state, F.listingsChance(state))) {
    const max = c.budget * (1 + F.financeStretch(state, i));
    const fits = state.locations[i].bikes.filter((b) => salePrice(b) <= max);
    if (fits.length) c.want = pick(state, fits).uid;
  }
  s.customers.push(c);
  s.dayCustomers = (s.dayCustomers || 0) + 1;
  state.stats.customers++;
  return c;
}

/** Which displayed bike (if any) this customer wants. Richer customers lean to pricier bikes. */
export function chooseBike(state, i, c) {
  const max = c.budget * (1 + F.financeStretch(state, i));
  const options = state.locations[i].bikes.filter((b) => !b.reserved && salePrice(b) <= max);
  if (!options.length) return null;
  return weighted(state, options, (b) => {
    const p = salePrice(b) / c.budget;
    const brand = !c.brand ? 1 : BIKE[b.model].brand === c.brand ? 3 : 0.35;
    const kind = spotKind(i, b.spot);
    const spot = kind === 'feature' ? 1.6 : kind === 'window' ? 1.3 : 1;
    const want = c.want === b.uid ? 6 : 1;
    return p * p * brand * spot * want;
  });
}

const buyChanceFor = (state, i, bike, c) => {
  const kind = spotKind(i, bike.spot);
  const cond = 0.6 + 0.4 * (bike.condition / 100);
  const detailed = bike.detailed ? 0.06 : 0;
  const want = c?.want === bike.uid ? 0.15 : 0;
  return Math.min(0.95, (SALES.buyChance + SALES.spotBonus[kind] + F.buyBonus(state, i) + detailed + want) * cond);
};

function gearSale(state, i, c, isBuyer, t, report) {
  const p = (isBuyer ? SALES.gearChance.buyer : SALES.gearChance.browser) + F.gearChanceBonus(state, i, isBuyer);
  if (!chance(state, p)) return;
  const amount = Math.round((uniform(state, ...SALES.gear) * wealth(i) * F.gearAmountMult(state, i)) / 5) * 5;
  earn(state, amount, t, report);
  state.stats.gearSold++;
  state.stats.gearRevenue += amount;
  report.gear += amount;
  report.gearCount++;
  report.events.push({ type: 'gear', loc: i, cust: c.id, amount, at: t });
}

function leave(state, i, c, t, report, why) {
  const s = sim(state, i);
  const k = s.customers.indexOf(c);
  if (k >= 0) s.customers.splice(k, 1);
  if (why === 'walkout') { state.stats.walkouts++; report.walkouts = (report.walkouts || 0) + 1; }
  if (why !== 'closing' && chance(state, TRASH_CHANCE)) s.piles = Math.min(12, s.piles + 1);
  report.events.push({ type: 'leave', loc: i, cust: c.id, why, at: t });
}

/** Complete a sale at `price`. */
export function completeSale(state, i, c, price, t, report) {
  const loc = state.locations[i];
  const k = loc.bikes.findIndex((b) => b.uid === c.bikeUid);
  if (k < 0) return false;
  const [bike] = loc.bikes.splice(k, 1);
  const warranty = Math.round(price * F.warrantyRate(state));
  earn(state, price + warranty, t, report);
  const st = state.stats;
  st.bikesSold++;
  st.bikeRevenue += price;
  st.biggestSale = Math.max(st.biggestSale, price);
  st.soldModels[bike.model] = (st.soldModels[bike.model] || 0) + 1;
  if (price >= bike.paid && price >= BIKE[bike.model].price && c.round) st.fullPriceHaggles = (st.fullPriceHaggles || 0) + 1;
  report.sales.push({ loc: i, model: bike.model, price, warranty, list: BIKE[bike.model].price, paid: bike.paid, spot: bike.spot, at: t });
  report.events.push({ type: 'sale', loc: i, cust: c.id, model: bike.model, spot: bike.spot, price: price + warranty, at: t });
  gearSale(state, i, c, true, t, report);
  c.phase = 'done';
  leave(state, i, c, t, report, 'bought');
  // referral: happy buyers bring a friend
  if (isOpenAt(t) && chance(state, F.referralChance(state))) {
    const s = sim(state, i);
    s.nextArrival = Math.min(s.nextArrival ?? Infinity, t + 2 * MIN);
  }
  return true;
}

// customer reaches a decision after browsing with a salesperson
function decide(state, i, c, t, report, offline) {
  const bike = chooseBike(state, i, c);
  if (!bike) { gearSale(state, i, c, false, t, report); leave(state, i, c, t, report, 'nothing'); return; }
  if (!chance(state, buyChanceFor(state, i, bike, c))) { gearSale(state, i, c, false, t, report); leave(state, i, c, t, report, 'nobuy'); return; }
  c.bikeUid = bike.uid;
  const list = salePrice(bike);
  if (chance(state, SALES.haggleChance)) {
    const [lo, hi] = SALES.offer;
    const offer = Math.round((list * (1 - uniform(state, lo, hi) * F.offerShrink(state))) / 10) * 10;
    if (offline) { // nobody to ask: the floor staff take the offer
      report.autoHaggles = (report.autoHaggles || 0) + 1;
      completeSale(state, i, c, offer, t, report);
      return;
    }
    bike.reserved = c.id;
    Object.assign(c, { phase: 'haggle', offer, list, deadline: t + F.haggleSeconds(state) * 1000, round: 1 });
    report.events.push({ type: 'haggle', loc: i, cust: c.id, model: bike.model, offer, list, at: t });
    return;
  }
  completeSale(state, i, c, list, t, report);
}

function startServing(state, i, t) {
  const s = sim(state, i);
  const busy = s.customers.filter((c) => c.phase === 'browse' || c.phase === 'haggle').length;
  let free = F.servers(state, i) - busy;
  for (const c of s.customers) {
    if (free <= 0) break;
    if (c.phase !== 'queue') continue;
    c.phase = 'browse';
    c.servedAt = t;
    c.decideAt = t + uniform(state, ...SALES.serveMinutes) * MIN;
    free--;
  }
}

function nextEventTime(state, i) {
  const s = sim(state, i);
  let t = s.nextArrival ?? Infinity;
  for (const c of s.customers) {
    if (c.phase === 'queue') t = Math.min(t, c.giveUpAt);
    else if (c.phase === 'browse') t = Math.min(t, c.decideAt);
    else if (c.phase === 'haggle') t = Math.min(t, c.deadline);
  }
  if (s.nextTradeIn != null) t = Math.min(t, s.nextTradeIn);
  return t;
}

const unreserve = (state, i, c) => { const b = state.locations[i].bikes.find((x) => x.uid === c.bikeUid); if (b) b.reserved = null; };

/** Simulate one owned location over an open stretch. */
function runLocation(state, i, start, end, report) {
  const s = sim(state, i);
  const offline = report.offline;
  const tradeRate = SALES.tradeInPerHour * F.tradeInRateMult(state);
  if (s.nextArrival == null || s.nextArrival < start) s.nextArrival = start + expWait(state, arrivalsPerHour(state, i));
  if (!offline && i === state.activeLoc && (s.nextTradeIn == null || s.nextTradeIn < start)) s.nextTradeIn = start + expWait(state, tradeRate);
  if (offline || i !== state.activeLoc) s.nextTradeIn = null;
  // pending haggles when you were away: the floor staff accepted the offer
  if (offline) for (const c of [...s.customers]) if (c.phase === 'haggle') { report.autoHaggles = (report.autoHaggles || 0) + 1; completeSale(state, i, c, c.offer, start, report); }
  for (let guard = 0; guard < 20000; guard++) {
    const t = nextEventTime(state, i);
    if (t > end) break;
    if (t === s.nextArrival) {
      const c = newCustomer(state, i, t);
      report.customers = (report.customers || 0) + 1;
      report.events.push({ type: 'arrive', loc: i, cust: c.id, at: t });
      s.nextArrival = t + expWait(state, arrivalsPerHour(state, i));
    } else if (t === s.nextTradeIn) {
      s.nextTradeIn = t + expWait(state, tradeRate);
      if (!state.tradeIn || state.tradeIn.expiresAt <= t) makeTradeIn(state, i, t, report);
    } else {
      const c = s.customers.find((x) => (x.phase === 'queue' && x.giveUpAt === t) || (x.phase === 'browse' && x.decideAt === t) || (x.phase === 'haggle' && x.deadline === t));
      if (!c) break;
      if (c.phase === 'queue') leave(state, i, c, t, report, 'walkout');
      else if (c.phase === 'browse') decide(state, i, c, t, report, offline);
      else if (c.phase === 'haggle') { unreserve(state, i, c); leave(state, i, c, t, report, 'walkout'); }
    }
    startServing(state, i, t);
  }
}

// At closing time everyone still inside heads home (haggles you ignored are lost).
function closeUp(state, i, t, report) {
  const s = sim(state, i);
  for (const c of [...s.customers]) {
    if (c.phase === 'haggle') unreserve(state, i, c);
    leave(state, i, c, t, report, 'closing');
  }
  s.nextArrival = null;
}

addOpenRunner((state, start, end, report, opt) => {
  state.locations.forEach((l, i) => {
    if (!l.owned) return;
    if (opt?.skip) { closeUp(state, i, start, report); sim(state, i).nextTradeIn = null; return; }
    runLocation(state, i, start, end, report);
    if (!isOpenAt(end)) closeUp(state, i, end, report); // `end` is "now" (still open) or closing time
  });
});

// ---------------- haggling (player actions) ----------------
const findHaggle = (state, i, custId) => sim(state, i).customers.find((c) => c.id === custId && c.phase === 'haggle');
const miniReport = () => ({ earned: 0, events: [], sales: [], gear: 0, gearCount: 0 });

export function acceptOffer(state, i, custId, t) {
  const c = findHaggle(state, i, custId);
  if (!c) return { ok: false };
  const report = miniReport();
  completeSale(state, i, c, c.offer, t, report);
  return { ok: true, result: 'sold', price: c.offer, report };
}

/** Counter half-way between their offer and list. */
export function counterOffer(state, i, custId, t) {
  const c = findHaggle(state, i, custId);
  if (!c) return { ok: false };
  const report = miniReport();
  if (c.round === 1) {
    const counter = Math.round((c.offer + (c.list - c.offer) / 2) / 10) * 10;
    if (chance(state, SALES.counterAccept + F.counterBonus(state))) {
      state.stats.hagglesWon++;
      completeSale(state, i, c, counter, t, report);
      return { ok: true, result: 'sold', price: counter, report };
    }
    if (chance(state, SALES.lastOfferChance)) {
      c.offer = Math.round((c.offer + (counter - c.offer) / 2) / 10) * 10;
      c.round = 2;
      c.deadline = t + 15000;
      return { ok: true, result: 'lastOffer', offer: c.offer, report };
    }
  }
  unreserve(state, i, c);
  leave(state, i, c, t, report, 'walkout');
  return { ok: true, result: 'walked', report };
}

/** Hold firm at list price. */
export function refuseOffer(state, i, custId, t) {
  const c = findHaggle(state, i, custId);
  if (!c) return { ok: false };
  const report = miniReport();
  if (c.round === 1 && chance(state, SALES.refusePayFull + F.counterBonus(state) / 2)) {
    state.stats.hagglesWon++;
    state.stats.hardBargains++;
    completeSale(state, i, c, c.list, t, report);
    return { ok: true, result: 'sold', price: c.list, hardBargain: true, report };
  }
  unreserve(state, i, c);
  leave(state, i, c, t, report, 'walkout');
  return { ok: true, result: 'walked', report };
}

export const pendingHaggles = (state, i) => (state.locations[i].sim?.customers || []).filter((c) => c.phase === 'haggle');

// ---------------- trade-ins ----------------
function makeTradeIn(state, i, t, report) {
  const locNo = LOCATIONS[i].id;
  // scaled to what this location sells: mostly its own tier, sometimes cheaper
  const pool = chance(state, 0.7) ? BIKES.filter((b) => b.loc === locNo) : BIKES.filter((b) => b.loc <= locNo);
  const model = pick(state, pool).id;
  const condition = Math.round(uniform(state, 55, 85));
  const cost = Math.round((BIKE[model].price * 0.5 * (0.6 + (0.4 * condition) / 100) * F.tradeInCostMult(state)) / 10) * 10;
  state.tradeIn = { loc: i, model, condition, cost, at: t, expiresAt: t + SALES.tradeInMinutes * MIN };
  report.events.push({ type: 'tradein', loc: i, model, at: t });
}

export function acceptTradeIn(state, t) {
  const o = state.tradeIn;
  if (!o || o.expiresAt <= t) return { ok: false, reason: 'That offer has expired.' };
  if (freeSpace(state, o.loc) <= 0) return { ok: false, reason: 'No free display spot for it. Sell something or add Storage.' };
  if (state.cash < o.cost) return { ok: false, reason: 'Not enough cash.' };
  state.cash -= o.cost;
  const bike = { uid: state.nextUid++, model: o.model, spot: freeSpot(state, o.loc), condition: o.condition, detailed: false, paid: o.cost, at: t, source: 'tradein', reserved: null };
  state.locations[o.loc].bikes.push(bike);
  state.stats.tradeIns++;
  state.tradeIn = null;
  return { ok: true, bike };
}
export const declineTradeIn = (state) => { state.tradeIn = null; };
export const tradeInValue = (o) => salePrice({ model: o.model, condition: o.condition, source: 'tradein' });
