// Display spots in the showroom (tile coords). Spots unlock in this order as
// capacity grows. kind: 'feature' (turntable), 'window' (front glass), 'floor'.
export const SPOTS = [
  { id: 'F', kind: 'feature', x: 6.2, y: 5.0, h: -20, label: 'Turntable' },
  { id: 'B2', kind: 'floor', x: 5.4, y: 1.15, h: -25, label: 'Back wall' },
  { id: 'B3', kind: 'floor', x: 8.2, y: 1.15, h: -25, label: 'Back wall' },
  { id: 'B1', kind: 'floor', x: 2.6, y: 1.15, h: -25, label: 'Back wall' },
  { id: 'W2', kind: 'window', x: 4.9, y: 8.75, h: -25, label: 'Front window' },
  { id: 'W3', kind: 'window', x: 9.3, y: 8.75, h: -25, label: 'Front window' },
  { id: 'B4', kind: 'floor', x: 11.0, y: 1.15, h: -25, label: 'Back wall' },
  { id: 'L1', kind: 'floor', x: 1.15, y: 4.2, h: 65, label: 'Side wall' },
  { id: 'W1', kind: 'window', x: 2.4, y: 8.75, h: -25, label: 'Front window' },
  { id: 'W4', kind: 'window', x: 11.8, y: 8.75, h: -25, label: 'Front window' },
  { id: 'L2', kind: 'floor', x: 1.15, y: 6.8, h: 65, label: 'Side wall' },
  { id: 'P1', kind: 'floor', x: 10.4, y: 5.0, h: 200, label: 'Podium' },
];
export const SPOT = Object.fromEntries(SPOTS.map((s) => [s.id, s]));
export const KIND_LABEL = { feature: 'Featured', window: 'Window', floor: 'Floor' };
