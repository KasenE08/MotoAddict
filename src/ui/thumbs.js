// Cached bike pictures (3D render -> data URL) for cards and lists.
import { renderBike3D } from '../render/bike3d.js';

const cache = new Map();
export function thumb(id, T = 22, deg = -22) {
  const k = `${id}|${T}|${deg}`;
  if (!cache.has(k)) cache.set(k, renderBike3D(id, (deg * Math.PI) / 180, T).c.toDataURL());
  return cache.get(k);
}
export const img = (id, T, cls = 'th') => `<img class="${cls}" src="${thumb(id, T)}" alt="">`;
