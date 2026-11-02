// Per-location dealership layout, generated from the showroom size.
// Everything that needs a position (rooms, doors, display spots, staff posts,
// customer paths) comes from here so each location can be bigger and richer.

const SIZES = [[14, 10], [16, 11], [18, 12], [20, 13], [22, 14]];
const FEATURES = [1, 1, 2, 2, 3];
export const MAX_SPOTS = [10, 14, 18, 20, 22];

const cache = new Map();

export function getLayout(i) {
  if (cache.has(i)) return cache.get(i);
  const [SW, SD] = SIZES[i];
  const rooms = [
    { id: 'show', x0: 0, y0: 0, x1: SW, y1: SD },
    { id: 'parts', x0: SW, y0: 0, x1: SW + 6, y1: 6 },
    { id: 'service', x0: SW, y0: 6, x1: SW + 8, y1: SD + 3 },
    { id: 'detail', x0: SW + 6, y0: 0, x1: SW + 12, y1: 6 },
    { id: 'security', x0: SW, y0: -5, x1: SW + 5, y1: 0 },
    { id: 'storage', x0: 0, y0: -6, x1: SW, y1: 0 },
    { id: 'finance', x0: -6, y0: 0, x1: 0, y1: 5 },
    { id: 'lounge', x0: -6, y0: 5, x1: 0, y1: SD + 1 },
    { id: 'rest', x0: -6, y0: -4, x1: 0, y1: 0 },
  ];
  const door = Math.floor(SW / 2) - 1; // front entrance: two tiles at x = door, door + 1
  const doors = new Set([
    `x:${SD}:${door}`, `x:${SD}:${door + 1}`, // front entrance
    `y:0:${SD - 2}`, // showroom <-> lounge
    'y:0:2', // showroom <-> finance
    `y:${SW}:2`, // showroom <-> parts
    `y:${SW}:${SD - 2}`, // showroom <-> service (staff)
    `x:0:${SW - 2}`, // showroom <-> storage
    'x:0:-3', // restrooms <-> finance
    `x:${SD + 3}:${SW + 3}`, `x:${SD + 3}:${SW + 4}`, // service roll-up door
    `x:6:${SW + 8}`, `x:6:${SW + 9}`, // detailing bay door
    `y:${SW + 5}:-2`, // security office
    'y:0:-2', // restrooms <-> storage side
    `y:-6:${SD - 1}`, // lounge outside door
  ]);
  const glass = (k) => {
    const [ax, c, a] = k.split(':');
    if (ax === 'x' && +c === SD && +a >= 0 && +a < SW) return true; // showroom storefront
    if (ax === 'x' && +c === SD + 1 && +a >= -6 && +a < 0) return true; // lounge windows
    return false;
  };

  // ---- display spots ----
  const spots = [];
  const nF = FEATURES[i], fy = SD * 0.42;
  for (let k = 0; k < nF; k++) spots.push({ id: `F${k + 1}`, kind: 'feature', x: (SW * (k + 1)) / (nF + 1), y: fy, h: -20, label: 'Turntable' });
  for (let x = 2.6, k = 1; x < SW - 1.6; x += 2.8, k++) spots.push({ id: `B${k}`, kind: 'floor', x, y: 1.15, h: -25, label: 'Back wall' });
  const dc = door + 1;
  for (let x = 2.4, k = 1; x < SW - 1.6; x += 2.6) if (Math.abs(x - dc) >= 2.2) spots.push({ id: `W${k++}`, kind: 'window', x, y: SD - 1.25, h: -25, label: 'Front window' });
  for (let y = 3.8, k = 1; y < SD - 2.6; y += 2.6, k++) spots.push({ id: `S${k}`, kind: 'floor', x: 1.15, y, h: 65, label: 'Side wall' });
  const podiums = Math.max(0, MAX_SPOTS[i] - spots.length);
  for (let k = 0; k < podiums; k++) spots.push({ id: `P${k + 1}`, kind: 'floor', x: (SW * (k + 1)) / (podiums + 1) + 0.6, y: fy + 3.0, h: 200, label: 'Podium' });
  // order spots unlock in: featured, back wall, window, side, podium (alternating for a balanced look)
  const order = ['F', 'B', 'W', 'S', 'P'];
  spots.sort((a, b) => order.indexOf(a.id[0]) - order.indexOf(b.id[0]) || Math.abs(a.x - SW / 2) - Math.abs(b.x - SW / 2));
  spots.length = MAX_SPOTS[i];
  for (const s of spots) {
    const [dx, dy] = s.kind === 'feature' ? [1.1, 2.2] : s.id[0] === 'B' ? [0.3, 1.6] : s.id[0] === 'S' ? [1.6, 0.4] : s.id[0] === 'P' ? [-1.2, 1.4] : [0.3, -1.4];
    s.vx = s.x + dx;
    s.vy = s.y + dy;
  }

  const L = {
    i, SW, SD, rooms, doors, glass, spots, door,
    spot: Object.fromEntries(spots.map((s) => [s.id, s])),
    // people paths + staff posts (tile coords)
    doorOut: [door + 1, SD + 2.6], doorIn: [door + 1, SD - 0.5],
    wait: (id) => [door - 0.6 + (id % 3) * 0.8, SD - 1.9 - (id % 2) * 0.6],
    desk: { x: SW - 1.5, y: SD - 4.5 }, // reception desk (customer side is x - 0.7)
    deskCustomer: [SW - 2.4, SD - 3.4],
    salesIdle: (k) => [SW - 3.2 - k * 0.9, 3.0 + (k % 2) * 0.8],
    finance: [-3.4, 1.6], financeGuest: [-3.4, 3.4],
    marketing: [-1.4, 1.2],
    partsClerk: [SW + 2.6, 3.0], partsCounter: { x: SW + 1.6, y: 3.4 },
    lifts: [[SW + 3, 7.0], [SW + 3, 9.8], [SW + 3, 12.6]].filter(([, y]) => y < SD + 2),
    mechanic: (k) => [SW + 5.6, 8.0 + k * 2.8],
    detailBay: [SW + 9, 3], detailer: (k) => [SW + 10.4 - k, 3.6],
    security: [SW + 2.2, -3.6], patrol: [[2, 2.4], [SW - 2, 2.4], [SW - 2, SD - 3], [2, SD - 3]],
    janitorIdle: (k) => [SW - 1.2 - k * 0.7, 1.2 + k * 0.5],
    trash: (k) => [2.2 + ((k * 3.7) % (SW - 4)), 2.6 + ((k * 2.3) % (SD - 4.5))],
    plaza: { x0: 0, y0: SD, x1: SW, y1: SD + 5 },
    parking: { x0: -10, y0: SD + 5, x1: SW + 14, y1: SD + 10 },
    focus: [SW / 2, SD / 2], // where the camera starts
  };
  cache.set(i, L);
  return L;
}

export const roomAt = (L, x, y) => L.rooms.find((r) => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1);
