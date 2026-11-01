// Game-wide constants. Balance numbers that later phases tune live here.
export const SAVE_VERSION = 1;
export const OPEN_HOUR = 9; // 9 AM local time
export const CLOSE_HOUR = 18; // 6 PM local time
export const OFFLINE_CAP_HOURS = { base: 4, max: 10 };
export const START_CASH = 15000;

// The 5 dealership locations (fixed; the game is not endless).
// baseRate is a placeholder passive income ($/min while open) until sales,
// service and staff income arrive in Phases 4-5.
export const LOCATIONS = [
  { id: 1, name: 'Rust Row', blurb: 'Poor, rundown side of town', baseRate: 10 },
  { id: 2, name: 'Millbrook', blurb: 'Lower-middle class neighbourhood', baseRate: 0 },
  { id: 3, name: 'Maple Heights', blurb: 'Middle-class suburbs', baseRate: 0 },
  { id: 4, name: 'Crestview Hills', blurb: 'Upper class, nice houses', baseRate: 0 },
  { id: 5, name: 'Gilded Bay', blurb: 'Mansions everywhere', baseRate: 0 },
];
