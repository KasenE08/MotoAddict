// Every gameplay modifier in one place: staff (counts + role levels), material
// upgrades (per location), company-wide upgrades and cleanliness/rating.
// Pure functions of state; nothing here mutates.
import { LOC_MULT, SALES, WHOLESALE, DELIVERY, OFFLINE_CAP_HOURS } from '../config.js';
import { MATERIAL, MAT } from '../data/upgrades.js';

export const g = (state, id) => state.glob?.[id] || 0; // company upgrade level
export const m = (state, i, id) => state.locations[i]?.mat?.[id] || 0; // material level
export const n = (state, i, role) => state.locations[i]?.staff?.[role] || 0; // employees hired
export const rl = (state, i, role) => state.locations[i]?.staffLvl?.[role] || 1; // role level 1..5
const lvlMult = (state, i, role, per = 0.15) => (1 + per * (rl(state, i, role) - 1)) * (1 + 0.08 * g(state, 'training'));

// ---- rating: cleanliness + comfort + reputation -> 1..5 stars ----
export function cleanliness(state, i) {
  const piles = state.locations[i]?.sim?.piles || 0;
  return Math.max(0, 1 - piles / 8);
}
export function comfortScore(state, i) {
  let have = 0, max = 0;
  for (const it of MATERIAL) if (it.comfort) { have += Math.min(m(state, i, it.id), it.levels); max += it.levels; }
  return max ? have / max : 0;
}
export function rating(state, i) {
  const r = 1 + 4 * (0.35 * cleanliness(state, i) + 0.4 * comfortScore(state, i) + 0.25 * Math.min(1, g(state, 'reputation') / 5 + 0.2));
  return Math.round(r * 10) / 10;
}
// 1 star -> x0.7 customers, 3 stars -> x1.0, 5 stars -> x1.3 (never zero)
export const ratingMult = (state, i) => 0.55 + 0.15 * rating(state, i);

// ---- customers ----
export function arrivalsMult(state, i) {
  let add = 0;
  for (const it of MATERIAL) if (it.arrivals) add += it.arrivals * m(state, i, it.id);
  add += 0.1 * n(state, i, 'receptionist') * lvlMult(state, i, 'receptionist') * (1 + 0.15 * m(state, i, 'office'));
  add += 0.18 * n(state, i, 'marketing') * lvlMult(state, i, 'marketing');
  add += [0, 0.12, 0.25, 0.4][g(state, 'advertising')] + 0.04 * g(state, 'loyalty');
  return (1 + add) * ratingMult(state, i);
}
export const servers = (state, i) => 1 + n(state, i, 'salesman');
export const buyBonus = (state, i) => Math.min(3, n(state, i, 'salesman')) * 0.05 * lvlMult(state, i, 'salesman');
export const financeStretch = (state, i) => SALES.financeStretch + 0.05 * g(state, 'financing') + (n(state, i, 'finance') ? (0.1 + 0.04 * (rl(state, i, 'finance') - 1)) * (1 + 0.08 * g(state, 'training')) * (1 + 0.15 * m(state, i, 'office')) : 0);
export const patienceMult = (state) => 1 + 0.2 * g(state, 'patience');
export const haggleSeconds = (state) => SALES.haggleSeconds + 3 * g(state, 'patience');
export const counterBonus = (state) => 0.06 * g(state, 'negotiation');
export const offerShrink = (state) => 1 - 0.12 * g(state, 'negotiation'); // offers closer to list
export const warrantyRate = (state) => 0.015 * g(state, 'warranty');
export const referralChance = (state) => 0.08 * g(state, 'referral');
export const listingsChance = (state) => 0.08 * g(state, 'listings');
export const gearChanceBonus = (state, i, buyer) => 0.06 * n(state, i, 'clerk') * lvlMult(state, i, 'clerk') + 0.02 * m(state, i, 'shelves') + 0.01 * g(state, 'loyalty') + (buyer ? 0.08 * g(state, 'upselling') : 0);
export const gearAmountMult = (state, i) => 1 + 0.2 * m(state, i, 'shelves') + 0.1 * g(state, 'upselling');

// ---- operations ----
export const wholesale = (state) => WHOLESALE - 0.015 * g(state, 'supplier');
export const leadHours = (state) => [DELIVERY.leadHours, 4, 2, 0][g(state, 'delivery')];
export const tradeInRateMult = (state) => 1 + 0.2 * g(state, 'tradeins');
export const tradeInCostMult = (state) => 1 - 0.04 * g(state, 'tradeins');
export const offlineCapHours = (state) => OFFLINE_CAP_HOURS.base + g(state, 'offlineCap');
export const offlineBoost = (state) => 0.1 * g(state, 'offlineBoost');
export const insuranceRate = (state) => [0, 0.25, 0.5, 0.75][g(state, 'insurance')];

// ---- staff money ----
export const wageMult = (state) => 1 - 0.07 * g(state, 'contracts');
export const quitChance = (state) => Math.max(0.002, 0.02 - 0.0035 * g(state, 'morale'));
export const hireFee = (role, i) => Math.round(role.fee * LOC_MULT[i]);
export const dailyWage = (state, role, i) => Math.round(role.wage * LOC_MULT[i] * wageMult(state));
export const roleUpgradeCost = (role, i, level) => Math.round(role.fee * 1.6 * LOC_MULT[i] * Math.pow(2.1, level - 1));

// ---- service work ($/min while open) ----
export const mechanicIncome = (state, i) => n(state, i, 'mechanic') * 2.5 * LOC_MULT[i] * lvlMult(state, i, 'mechanic', 0.25) * (1 + 0.25 * m(state, i, 'serviceBay'));
export const detailIncome = (state, i) => n(state, i, 'detailer') * 1.5 * LOC_MULT[i] * lvlMult(state, i, 'detailer', 0.25) * (1 + 0.25 * m(state, i, 'detailBay'));
export const repairPerHour = (state, i) => n(state, i, 'mechanic') * 10 * lvlMult(state, i, 'mechanic', 0.25) * (1 + 0.25 * m(state, i, 'serviceBay')); // condition points
export const detailPerHour = (state, i) => n(state, i, 'detailer') * 1.5 * lvlMult(state, i, 'detailer', 0.25) * (1 + 0.25 * m(state, i, 'detailBay')); // bikes
export const cleanPerHour = (state, i) => n(state, i, 'janitor') * 10 * lvlMult(state, i, 'janitor', 0.3); // piles

// ---- theft (closed hours) ----
export const theftSuccess = (state, i) => {
  const guards = n(state, i, 'guard') * 0.3 * lvlMult(state, i, 'guard', 0.1);
  return Math.max(0.03, 0.6 * (1 - Math.min(0.9, guards)) * (1 - 0.15 * m(state, i, 'cameras')));
};

// ---- costs that scale by location ----
export const matCost = (id, i, level) => Math.round(MAT[id].cost * LOC_MULT[i] * Math.pow(1.85, level));
