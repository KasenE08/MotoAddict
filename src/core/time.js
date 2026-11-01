// Real-world opening hours (local device time): open 9:00-18:00 every day.
import { OPEN_HOUR, CLOSE_HOUR } from '../config.js';

const atHour = (ms, h) => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h).getTime(); };
const nextDay = (ms) => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(); };

export function isOpenAt(ms) {
  const h = new Date(ms).getHours();
  return h >= OPEN_HOUR && h < CLOSE_HOUR;
}

/** Open windows [{start, end, day}] overlapping (a, b]. Handles DST via local Date math. */
export function openWindows(a, b) {
  const out = [];
  if (!(b > a)) return out;
  let day = atHour(a, 0);
  for (let guard = 0; day < b && guard < 4000; guard++) {
    const open = atHour(day, OPEN_HOUR), close = atHour(day, CLOSE_HOUR);
    const s = Math.max(a, open), e = Math.min(b, close);
    if (e > s) out.push({ start: s, end: e, day: dayKey(day) });
    day = nextDay(day);
  }
  return out;
}

export const openMsBetween = (a, b) => openWindows(a, b).reduce((n, w) => n + (w.end - w.start), 0);

/** Opening/closing moments in (a, b], oldest first: [{type: 'open'|'close', at}] */
export function boundaries(a, b) {
  const out = [];
  if (!(b > a)) return out;
  let day = atHour(a, 0);
  for (let guard = 0; day <= b && guard < 4000; guard++) {
    const open = atHour(day, OPEN_HOUR), close = atHour(day, CLOSE_HOUR);
    if (open > a && open <= b) out.push({ type: 'open', at: open });
    if (close > a && close <= b) out.push({ type: 'close', at: close });
    day = nextDay(day);
  }
  return out;
}

/** Next time the shop opens or closes after ms. */
export function nextChange(ms) {
  if (isOpenAt(ms)) return { type: 'close', at: atHour(ms, CLOSE_HOUR) };
  const today = atHour(ms, OPEN_HOUR);
  return { type: 'open', at: ms < today ? today : atHour(nextDay(ms), OPEN_HOUR) };
}

export function dayKey(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 0..1 darkness for the day/night tint, following the real clock. */
export function nightLevel(ms) {
  const d = new Date(ms), h = d.getHours() + d.getMinutes() / 60;
  if (h >= 7 && h < 17) return 0;
  if (h >= 17 && h < 20) return ((h - 17) / 3) * 0.75; // dusk
  if (h >= 5 && h < 7) return (1 - (h - 5) / 2) * 0.75; // dawn
  return 0.75;
}
