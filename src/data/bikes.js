// Bike roster: real sport bikes, 125cc-1000cc. Prices are US MSRP where an official
// figure was found (latest model year available); `priceNote` marks estimates.
// `loc` = the location where the bike unlocks at the supplier (cheaper bikes stay
// available everywhere). Top speeds are commonly-cited figures (makers rarely publish them).
//
// `look` drives the bike's own 3D model + iconic paint:
//   body/body2/accent: main paint, lower fairing, stripes · rim: wheel color
//   size: overall scale · tail: [rise, length] · nose: [length, drop]
//   frame: 'spar' | 'trellis' | 'none' · frameColor
//   exhaust: 'big' | 'side' | 'under' · single: single-sided swingarm
//   belly: lower fairing covers the engine · wings: winglets · noMirrors (track bike)

const Y_BLUE = { body: '#2747b0', body2: '#16181d', accent: '#e8eef8', rim: '#2747b0', frame: 'spar', frameColor: '#2e323d' };
const K_GREEN = { body: '#5fbf2a', body2: '#16181d', accent: '#f4f4f4', rim: '#16181d', frame: 'spar', frameColor: '#16181d' };
const H_TRI = { body: '#c8141c', body2: '#1d4fc4', accent: '#f4f4f4', rim: '#16181d', frame: 'spar', frameColor: '#2e323d' };
const B_MOTO = { body: '#f2f4f7', body2: '#1c69d4', accent: '#e0262c', rim: '#16181d', frame: 'spar', frameColor: '#8f97a8' };
const A_DARK = { body: '#1b1b1f', body2: '#7a1f9b', accent: '#e8333b', rim: '#16181d', frame: 'spar', frameColor: '#2e323d' };
const D_RED = { body: '#d0181e', body2: '#d0181e', accent: '#f4f4f4', rim: '#16181d', frame: 'none', frameColor: '#16181d' };

export const BIKES = [
  // ---- Yamaha ----
  { id: 'yzf-r125', brand: 'Yamaha', name: 'YZF-R125', cc: 125, hp: 15, mph: 74, price: 5199, priceNote: 'EU-only model; price converted', loc: 1, color: 'Icon Blue', look: { ...Y_BLUE, size: 0.84, tail: [2, 0.95], belly: true, exhaust: 'side' } },
  { id: 'yzf-r3', brand: 'Yamaha', name: 'YZF-R3', cc: 321, hp: 42, mph: 112, price: 5499, loc: 1, color: 'Team Yamaha Blue', look: { ...Y_BLUE, size: 0.9, tail: [4, 0.95], belly: true, exhaust: 'side' } },
  { id: 'yzf-r7', brand: 'Yamaha', name: 'YZF-R7', cc: 689, hp: 72, mph: 135, price: 9399, loc: 2, color: 'Team Yamaha Blue', look: { ...Y_BLUE, size: 0.96, tail: [8, 0.9], nose: [1.05, 2], belly: true, exhaust: 'side' } },
  { id: 'yzf-r6', brand: 'Yamaha', name: 'YZF-R6', cc: 599, hp: 117, mph: 160, price: 12199, priceNote: 'last street-legal MSRP (2020)', loc: 3, color: 'Team Yamaha Blue', look: { ...Y_BLUE, size: 0.97, tail: [12, 0.85], nose: [1.08, 0], belly: true, exhaust: 'under' } },
  { id: 'yzf-r9', brand: 'Yamaha', name: 'YZF-R9', cc: 890, hp: 117, mph: 155, price: 12499, loc: 3, color: 'Team Yamaha Blue', look: { ...Y_BLUE, size: 0.98, tail: [9, 0.9], nose: [1.05, 2], belly: true, exhaust: 'side', wings: true } },
  { id: 'yzf-r1', brand: 'Yamaha', name: 'YZF-R1', cc: 998, hp: 197, mph: 186, price: 19199, loc: 4, color: 'Team Yamaha Blue', look: { ...Y_BLUE, size: 1, tail: [11, 0.88], nose: [1.06, 0], belly: true, exhaust: 'side' } },
  { id: 'yzf-r1m', brand: 'Yamaha', name: 'YZF-R1M', cc: 998, hp: 197, mph: 186, price: 27899, loc: 5, color: 'Carbon / Liquid Metal', look: { body: '#8a93a6', body2: '#1a1c22', accent: '#3a6fe0', rim: '#1a1c22', frame: 'spar', frameColor: '#4b5161', size: 1, tail: [11, 0.88], nose: [1.06, 0], belly: true, exhaust: 'side', wings: true } },
  // ---- Kawasaki ----
  { id: 'ninja-125', brand: 'Kawasaki', name: 'Ninja 125', cc: 125, hp: 15, mph: 75, price: 4799, priceNote: 'EU-only model; price converted', loc: 1, color: 'Lime Green', look: { ...K_GREEN, size: 0.84, tail: [1, 1], belly: true, exhaust: 'side' } },
  { id: 'ninja-500', brand: 'Kawasaki', name: 'Ninja 500', cc: 451, hp: 45, mph: 112, price: 5399, loc: 1, color: 'Lime Green', look: { ...K_GREEN, size: 0.9, tail: [3, 1], belly: true, exhaust: 'side' } },
  { id: 'ninja-650', brand: 'Kawasaki', name: 'Ninja 650', cc: 649, hp: 67, mph: 130, price: 8899, loc: 2, color: 'KRT Lime Green', look: { ...K_GREEN, size: 0.94, tail: [4, 0.98], belly: false, exhaust: 'side' } },
  { id: 'zx-4rr', brand: 'Kawasaki', name: 'Ninja ZX-4RR', cc: 399, hp: 77, mph: 125, price: 9999, loc: 2, color: 'KRT Lime Green', look: { ...K_GREEN, size: 0.9, tail: [9, 0.9], nose: [1.05, 0], belly: true, exhaust: 'side' } },
  { id: 'zx-6r', brand: 'Kawasaki', name: 'Ninja ZX-6R', cc: 636, hp: 124, mph: 160, price: 11399, loc: 3, color: 'KRT Lime Green', look: { ...K_GREEN, size: 0.97, tail: [10, 0.9], nose: [1.06, 0], belly: true, exhaust: 'side' } },
  { id: 'zx-10r', brand: 'Kawasaki', name: 'Ninja ZX-10R', cc: 998, hp: 203, mph: 186, price: 17799, loc: 4, color: 'KRT Lime Green', look: { ...K_GREEN, size: 1, tail: [11, 0.88], nose: [1.08, 0], belly: true, exhaust: 'side', wings: true } },
  { id: 'ninja-h2', brand: 'Kawasaki', name: 'Ninja H2', cc: 998, hp: 228, mph: 209, price: 32700, loc: 5, color: 'Mirror Coated Spark Black', look: { body: '#15171d', body2: '#15171d', accent: '#7ce35b', rim: '#16181d', frame: 'trellis', frameColor: '#5fbf2a', size: 1, tail: [0, 1], exhaust: 'big', single: true, belly: false, chrome: true } },
  { id: 'ninja-h2r', brand: 'Kawasaki', name: 'Ninja H2R', cc: 998, hp: 310, mph: 249, price: 59100, priceNote: 'closed-course only', loc: 5, color: 'Mirror Coated Matte Spark Black', look: { body: '#2b2f39', body2: '#15171d', accent: '#7ce35b', rim: '#16181d', frame: 'trellis', frameColor: '#5fbf2a', size: 1, tail: [0, 1], exhaust: 'big', single: true, belly: false, wings: true, noMirrors: true, chrome: true } },
  // ---- Honda ----
  { id: 'cbr300r', brand: 'Honda', name: 'CBR300R', cc: 286, hp: 30, mph: 100, price: 5199, priceNote: 'last US MSRP', loc: 1, color: 'Grand Prix Red', look: { ...H_TRI, size: 0.88, tail: [2, 1], belly: true, exhaust: 'side' } },
  { id: 'cbr500r', brand: 'Honda', name: 'CBR500R', cc: 471, hp: 47, mph: 112, price: 7499, priceNote: 'estimate', loc: 2, color: 'Grand Prix Red', look: { ...H_TRI, size: 0.92, tail: [5, 0.95], belly: true, exhaust: 'side' } },
  { id: 'cbr650r', brand: 'Honda', name: 'CBR650R', cc: 649, hp: 94, mph: 140, price: 9299, loc: 2, color: 'Grand Prix Red', look: { ...H_TRI, size: 0.95, tail: [5, 0.95], belly: false, exhaust: 'side' } },
  { id: 'cbr600rr', brand: 'Honda', name: 'CBR600RR', cc: 599, hp: 119, mph: 160, price: 12199, loc: 3, color: 'Grand Prix Red (HRC)', look: { ...H_TRI, size: 0.97, tail: [12, 0.86], nose: [1.06, 0], belly: true, exhaust: 'side', wings: true } },
  { id: 'cbr1000rr-r', brand: 'Honda', name: 'CBR1000RR-R Fireblade SP', cc: 999, hp: 215, mph: 186, price: 28999, loc: 5, color: 'Grand Prix Red (HRC)', look: { ...H_TRI, size: 1, tail: [12, 0.86], nose: [1.1, 0], belly: true, exhaust: 'side', wings: true, rim: '#c9a227' } },
  // ---- BMW ----
  { id: 'g310rr', brand: 'BMW', name: 'G 310 RR', cc: 313, hp: 34, mph: 99, price: 4299, priceNote: 'not sold in US; price converted', loc: 1, color: 'Style Sport', look: { ...B_MOTO, size: 0.86, tail: [3, 1], belly: true, exhaust: 'side' } },
  { id: 's1000rr', brand: 'BMW', name: 'S 1000 RR', cc: 999, hp: 207, mph: 188, price: 20745, priceNote: 'unconfirmed', loc: 4, color: 'Light White / M Motorsport', look: { ...B_MOTO, size: 1, tail: [10, 0.88], nose: [1.08, 0], belly: true, exhaust: 'side', wings: true } },
  { id: 'm1000rr', brand: 'BMW', name: 'M 1000 RR', cc: 999, hp: 215, mph: 192, price: 33995, priceNote: 'unconfirmed', loc: 5, color: 'Light White / M Motorsport', look: { ...B_MOTO, size: 1, tail: [11, 0.86], nose: [1.1, 0], belly: true, exhaust: 'side', wings: true, rim: '#1c69d4' } },
  // ---- Aprilia ----
  { id: 'rs125', brand: 'Aprilia', name: 'RS 125', cc: 125, hp: 15, mph: 80, price: 5099, priceNote: 'EU-only model; price converted', loc: 1, color: 'Black / Red GP Replica', look: { ...A_DARK, body2: '#c8141c', size: 0.84, tail: [6, 0.9], belly: true, exhaust: 'under' } },
  { id: 'rs457', brand: 'Aprilia', name: 'RS 457', cc: 457, hp: 47, mph: 118, price: 6799, loc: 1, color: 'Prismatic Dark', look: { ...A_DARK, size: 0.9, tail: [7, 0.9], belly: true, exhaust: 'side', wings: true } },
  { id: 'rs660', brand: 'Aprilia', name: 'RS 660', cc: 659, hp: 105, mph: 150, price: 11649, loc: 3, color: 'Lava Red', look: { ...A_DARK, body: '#c8141c', body2: '#1b1b1f', accent: '#7a1f9b', size: 0.95, tail: [9, 0.88], belly: true, exhaust: 'under', wings: true } },
  { id: 'rsv4-rr', brand: 'Aprilia', name: 'RSV4 RR', cc: 999, hp: 201, mph: 186, price: 18999, priceNote: 'last 999cc model (2020)', loc: 4, color: 'Ascari Black', look: { ...A_DARK, body2: '#c8141c', size: 1, tail: [11, 0.86], nose: [1.06, 0], belly: true, exhaust: 'side' } },
  // ---- Ducati ----
  { id: 'panigale-v2', brand: 'Ducati', name: 'Panigale V2', cc: 890, hp: 120, mph: 160, price: 15995, loc: 3, color: 'Ducati Red', look: { ...D_RED, size: 0.98, tail: [13, 0.82], nose: [1.04, 2], belly: true, exhaust: 'under', single: true } },
  { id: 'supersport-950', brand: 'Ducati', name: 'SuperSport 950', cc: 937, hp: 110, mph: 155, price: 15295, priceNote: 'estimate', loc: 3, color: 'Ducati Red', look: { ...D_RED, frame: 'trellis', frameColor: '#16181d', size: 0.98, tail: [5, 0.95], belly: false, exhaust: 'side', single: true } },
  { id: 'panigale-v2s', brand: 'Ducati', name: 'Panigale V2 S', cc: 890, hp: 120, mph: 160, price: 18995, loc: 4, color: 'Ducati Red', look: { ...D_RED, size: 0.98, tail: [13, 0.82], nose: [1.04, 2], belly: true, exhaust: 'under', single: true, rim: '#c9a227' } },
  { id: 'panigale-v4r', brand: 'Ducati', name: 'Panigale V4 R', cc: 998, hp: 218, mph: 199, price: 44995, priceNote: 'estimate', loc: 5, color: 'Ducati Red', look: { ...D_RED, size: 1, tail: [14, 0.82], nose: [1.06, 2], belly: true, exhaust: 'side', single: true, wings: true } },
];

export const BRANDS = ['Yamaha', 'Kawasaki', 'Honda', 'BMW', 'Aprilia', 'Ducati'];
export const BIKE = Object.fromEntries(BIKES.map((b) => [b.id, b]));
export const bikesForLocation = (locNo) => BIKES.filter((b) => b.loc <= locNo);
