// Supplier orders, overnight deliveries, display spots and capacity.
import { BASE_CAPACITY, WHOLESALE, DELIVERY, LOCATIONS } from '../config.js';
import { BIKE } from '../data/bikes.js';
import { SPOTS } from '../data/showroom.js';
import { isOpenAt } from './time.js';
import { addPointRunner } from './engine.js';

export const supplierCost = (modelId, state) => Math.round(BIKE[modelId].price * (state?.wholesale ?? WHOLESALE));
export const capacity = (state, i) => Math.min(SPOTS.length, BASE_CAPACITY[i] + (state.locations[i].capacityBonus || 0));
export const pendingFor = (state, i) => state.orders.filter((o) => o.loc === i);
export const usedSpace = (state, i) => state.locations[i].bikes.length + pendingFor(state, i).length;
export const freeSpace = (state, i) => capacity(state, i) - usedSpace(state, i);
export const isUnlocked = (modelId, i) => BIKE[modelId].loc <= LOCATIONS[i].id;

/** Next 2:00 AM at least `leadHours` after `t`. */
export function deliveryTime(t, leadHours = DELIVERY.leadHours) {
  const earliest = t + leadHours * 3600e3;
  const d = new Date(earliest);
  let at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), DELIVERY.hour).getTime();
  if (at < earliest) at = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, DELIVERY.hour).getTime();
  return at;
}

export function orderBike(state, i, modelId, now) {
  if (!BIKE[modelId]) return { ok: false, reason: 'Unknown bike.' };
  if (!state.locations[i]?.owned) return { ok: false, reason: "You don't own this location yet." };
  if (!isUnlocked(modelId, i)) return { ok: false, reason: `Unlocks at Location ${BIKE[modelId].loc}.` };
  if (freeSpace(state, i) <= 0) return { ok: false, reason: 'Showroom is full. Upgrade Storage to fit more bikes.' };
  const cost = supplierCost(modelId, state);
  if (state.cash < cost) return { ok: false, reason: 'Not enough cash.' };
  state.cash -= cost;
  const order = { uid: state.nextUid++, model: modelId, loc: i, cost, orderedAt: now, arriveAt: deliveryTime(now, state.deliveryLeadHours ?? DELIVERY.leadHours) };
  state.orders.push(order);
  return { ok: true, order };
}

export function cancelOrder(state, uid) {
  const k = state.orders.findIndex((o) => o.uid === uid);
  if (k < 0) return false;
  state.cash += state.orders[k].cost;
  state.orders.splice(k, 1);
  return true;
}

const freeSpot = (state, i) => {
  const taken = new Set(state.locations[i].bikes.map((b) => b.spot));
  return SPOTS.slice(0, capacity(state, i)).find((s) => !taken.has(s.id))?.id ?? null;
};

/** Deliver every order due by `t`, placing bikes into free display spots. */
export function deliverDue(state, t) {
  const due = state.orders.filter((o) => o.arriveAt <= t).sort((a, b) => a.arriveAt - b.arriveAt);
  const delivered = [];
  for (const o of due) {
    const spot = freeSpot(state, o.loc);
    if (!spot) continue; // can't happen (space is reserved at order time) but never lose a bike
    state.locations[o.loc].bikes.push({ uid: o.uid, model: o.model, spot, condition: 100, detailed: false, paid: o.cost, at: o.arriveAt, source: 'supplier', reserved: null });
    state.orders.splice(state.orders.indexOf(o), 1);
    delivered.push(o);
  }
  return delivered;
}

/** Move a bike to another spot (swapping if taken). Only while closed. */
export function moveBike(state, i, uid, spotId, now) {
  if (isOpenAt(now)) return { ok: false, reason: 'Bikes can only be rearranged while the dealership is closed (6 PM - 9 AM).' };
  const loc = state.locations[i];
  const bike = loc.bikes.find((b) => b.uid === uid);
  const idx = SPOTS.findIndex((s) => s.id === spotId);
  if (!bike || idx < 0 || idx >= capacity(state, i)) return { ok: false, reason: 'That spot is not available.' };
  const other = loc.bikes.find((b) => b.spot === spotId);
  if (other) other.spot = bike.spot;
  bike.spot = spotId;
  return { ok: true, swapped: !!other };
}

// Deliveries happen inside the engine's time advance (live or offline), in time order.
addPointRunner((state, t, report) => { report.delivered.push(...deliverDue(state, t)); });
