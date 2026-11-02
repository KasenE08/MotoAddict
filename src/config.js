// Game-wide constants. Balance numbers that later phases tune live here.
export const SAVE_VERSION = 3;
export const OPEN_HOUR = 9; // 9 AM local time
export const CLOSE_HOUR = 18; // 6 PM local time
export const OFFLINE_CAP_HOURS = { base: 4, max: 10 };
export const START_CASH = 20000; // enough to fill the first 4 display spots with entry-level bikes

// The 5 dealership locations (fixed; the game is not endless).
// baseRate: flat passive income ($/min while open). 0 now that real sales exist.
export const LOCATIONS = [
  { id: 1, name: 'Rust Row', blurb: 'Poor, rundown side of town', baseRate: 0 },
  { id: 2, name: 'Millbrook', blurb: 'Lower-middle class neighbourhood', baseRate: 0 },
  { id: 3, name: 'Maple Heights', blurb: 'Middle-class suburbs', baseRate: 0 },
  { id: 4, name: 'Crestview Hills', blurb: 'Upper class, nice houses', baseRate: 0 },
  { id: 5, name: 'Gilded Bay', blurb: 'Mansions everywhere', baseRate: 0 },
];

// ---- Phase 3: supplier + showroom ----
export const BASE_CAPACITY = [4, 6, 8, 10, 12]; // display spots per location (Storage upgrade adds more)
export const WHOLESALE = 0.8; // supplier price = 80% of MSRP (Supplier discounts upgrade lowers it)
export const DELIVERY = { hour: 2, leadHours: 6 }; // trucks arrive 2 AM; order at least 6h ahead

// ---- Phase 4: customers + sales (per location) ----
// arrivals: customers per open hour · budget: median $ (log-normal spread)
export const CUSTOMERS = [
  { arrivals: 6, budget: 6500 },
  { arrivals: 8, budget: 9500 },
  { arrivals: 10, budget: 14000 },
  { arrivals: 12, budget: 22000 },
  { arrivals: 14, budget: 40000 },
];
export const SALES = {
  budgetSpread: 0.35, // log-normal sigma
  financeStretch: 0.05, // customers can stretch this far over budget (finance manager adds more)
  brandLoyal: 0.35, // share of customers with a favourite brand
  serveMinutes: [2, 4], // browsing + talking with a salesperson
  patienceMinutes: [4, 8], // how long they wait for a free salesperson
  buyChance: 0.32, // base chance to buy a bike they want (salesmen add more)
  spotBonus: { feature: 0.15, window: 0.08, floor: 0 },
  haggleChance: 0.35, // share of buyers who haggle
  haggleSeconds: 25, // how long they wait for your answer
  offer: [0.05, 0.15], // haggle offers are 5-15% under list
  counterAccept: 0.55, // chance a counter (half-way) is accepted
  lastOfferChance: 0.6, // otherwise chance they make one last offer
  refusePayFull: 0.25, // refusing: chance they pay full price anyway
  gearChance: { browser: 0.12, buyer: 0.4 },
  gear: [40, 400], // $ before the location wealth multiplier
  tradeInPerHour: 0.4, // same at every location
  tradeInMinutes: 3, // how long the offer stays open
};
