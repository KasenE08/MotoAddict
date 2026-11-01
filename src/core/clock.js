// Single source of "now". The device clock is the truth; a dev-only offset
// (enabled with ?dev=1) lets testers jump through the day.
let offset = 0;
export const now = () => Date.now() + offset;
export const setDevOffset = (ms) => { offset = ms; };
export const getDevOffset = () => offset;
