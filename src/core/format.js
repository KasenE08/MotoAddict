// Number and time formatting for the HUD.
export function money(n) {
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a < 1e6) return `${sign}$${Math.floor(a).toLocaleString('en-US')}`;
  const units = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M']];
  for (const [v, u] of units) if (a >= v) return `${sign}$${(a / v).toFixed(a / v >= 100 ? 0 : 2)}${u}`;
  return `${sign}$${a}`;
}

export function duration(ms) {
  const m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m`;
  return `${Math.floor(ms / 1000)}s`;
}

export function clockText(ms) {
  const d = new Date(ms);
  let h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${ap}`;
}

export const hourText = (h) => `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`;
