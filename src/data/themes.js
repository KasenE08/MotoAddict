// Visual theme per location: each one looks clearly more expensive than the last.
// floors[n] = showroom floor at flooring upgrade level n (two checker colours).
export const THEMES = [
  { // 1 · Rust Row — poor, rundown
    name: 'Rust Row',
    extL: '#a8553a', extR: '#7a3a28', extT: '#c9b8a0', extEdge: '#8f4a32',
    intL: '#d8cfb8', intR: '#b9ae98', intT: '#e8e0cc',
    grass: ['#8a9a4a', '#7a8a3e', '#9aaa58'], dirt: '#9a7a52', lot: '#a8a49a', lot2: '#96928a', road: '#4a4a50', roadLine: '#d8c870', sidewalk: '#9a968e',
    floors: [['#9a968c', '#8c887e'], ['#c8c2b4', '#b4ae9e'], ['#d8d2c4', '#c4beb0'], ['#e2dccf', '#d2ccbe'], ['#e8e3d8', '#dcd6ca'], ['#efeae0', '#e3ded4'], ['#f2eee6', '#e6e2da']],
    plaza: ['#b4ac98', '#a49c88'], trees: 'scraggly', neighbours: 'shacks', fence: 'chain', cracks: true,
    rugs: '#7a4a3a', couch: '#6b5a4a', accent: '#c4382b',
  },
  { // 2 · Millbrook — lower-middle class
    name: 'Millbrook',
    extL: '#d8c8a0', extR: '#b4a47c', extT: '#ece2c8', extEdge: '#3a5fc4',
    intL: '#efe9da', intR: '#d6cfbe', intT: '#faf6ec',
    grass: ['#6aa83e', '#5a9632', '#7ab84c'], dirt: '#a8763e', lot: '#c4c6cc', lot2: '#b4b6bc', road: '#3d3f48', roadLine: '#ffd23f', sidewalk: '#c2c4ca',
    floors: [['#a2a4aa', '#94969c'], ['#d8dade', '#c6c8ce'], ['#e2e4e8', '#cfd2d8'], ['#e8eaee', '#d6d9de'], ['#eef0f3', '#dee1e6'], ['#f2f4f6', '#e4e7ea'], ['#f6f7f8', '#e9ecee']],
    plaza: ['#d2c4a4', '#c2b494'], trees: 'round', neighbours: 'houses', fence: 'wood',
    rugs: '#3a5fc4', couch: '#5a6a8a', accent: '#3a5fc4',
  },
  { // 3 · Maple Heights — middle class (the approved mockup)
    name: 'Maple Heights',
    extL: '#e8b06a', extR: '#c27a3a', extT: '#fff1a8', extEdge: '#e2a050',
    intL: '#f4f0e6', intR: '#d5dae3', intT: '#ffffff',
    grass: ['#5fae3a', '#4f9a30', '#78c44a'], dirt: '#a8763e', lot: '#d5dae3', lot2: '#c4cad6', road: '#3a3d48', roadLine: '#ffd23f', sidewalk: '#c4cad6',
    floors: [['#a2a9b8', '#9299a8'], ['#e6e9ef', '#cfd5e0'], ['#ebeef3', '#d6dbe5'], ['#f0f2f6', '#dde1ea'], ['#f4f6f9', '#e3e7ee'], ['#f7f8fb', '#e8ebf1'], ['#fafbfd', '#eef0f5']],
    plaza: ['#e2cfa8', '#d2bb8e'], trees: 'round', neighbours: 'houses', fence: 'hedge',
    rugs: '#c4382b', couch: '#e04a3a', accent: '#c4382b',
  },
  { // 4 · Crestview Hills — upper class
    name: 'Crestview Hills',
    extL: '#eceae4', extR: '#c8c4bc', extT: '#ffffff', extEdge: '#4b5161',
    intL: '#f6f4ee', intR: '#dcd8d0', intT: '#ffffff',
    grass: ['#4fae4a', '#3f9a3e', '#68c460'], dirt: '#8a6a4a', lot: '#e2e0da', lot2: '#d2d0ca', road: '#2e3038', roadLine: '#f4f0e6', sidewalk: '#dad8d2',
    floors: [['#b8b4ac', '#aaa69e'], ['#ece8e0', '#dcd6cc'], ['#f2eee6', '#e2dccf'], ['#f6f2ea', '#e6e0d4'], ['#f2ece0', '#d8ccb4'], ['#f6f0e4', '#e0d4bc'], ['#faf4e8', '#e8dcc4']],
    plaza: ['#e8e2d4', '#d8d0bc'], trees: 'palm', neighbours: 'villas', fence: 'hedge',
    rugs: '#1d2d6b', couch: '#2e3a5e', accent: '#1d2d6b',
  },
  { // 5 · Gilded Bay — extreme wealth
    name: 'Gilded Bay',
    extL: '#f6f2ea', extR: '#d8d0c0', extT: '#fff6d8', extEdge: '#d4a017',
    intL: '#fbf8f1', intR: '#e6dfcf', intT: '#fffdf6',
    grass: ['#46b84e', '#38a442', '#5ccc62'], dirt: '#8a6a4a', lot: '#f0ebe0', lot2: '#e2dccf', road: '#26282e', roadLine: '#d4a017', sidewalk: '#e8e2d4',
    floors: [['#c8c0b0', '#b8b0a0'], ['#f2ede2', '#e6dfd0'], ['#f6f1e6', '#2a2a30'], ['#faf5ea', '#1e1e24'], ['#fbf6ea', '#efe0b8'], ['#fdf8ee', '#f2e2b0'], ['#fffaf0', '#f0dca0']],
    plaza: ['#f2ebdc', '#e2d6bc'], trees: 'palm', neighbours: 'mansions', fence: 'gold',
    rugs: '#7a1f2b', couch: '#5a1420', accent: '#d4a017',
  },
];
