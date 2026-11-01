import { describe, it, expect } from 'vitest';
import { paintBike, spokes, FRAME_LINES, VARIANTS, H2_SPECS } from '../../preview/js/bike.js';
import { nearest } from '../../preview/js/styles/pixel.js';
import { iso } from '../../preview/js/styles/iso.js';
import { flat } from '../../preview/js/styles/flat.js';
import { neon } from '../../preview/js/styles/neon.js';
import { comic } from '../../preview/js/styles/comic.js';

const balanced = (svg) => {
  const open = (svg.match(/<(?!\/)(?![^>]*\/>)[a-zA-Z][^>]*>/g) || []).length;
  const close = (svg.match(/<\/[a-zA-Z]+>/g) || []).length;
  return open === close;
};

describe('H2 artwork', () => {
  it('has 5 split spokes (10 segments) per wheel', () => {
    expect(spokes(0, 0, 5, 20).match(/M/g)).toHaveLength(10);
  });
  it('has a triangulated trellis frame', () => {
    expect(FRAME_LINES.length).toBe(13);
  });
  it('paints every bike variant as balanced SVG', () => {
    for (const v of Object.values(VARIANTS)) expect(balanced(paintBike({ ...v, tire: '#000', rim: '#111', rimInner: '#222', hub: '#333', disc: '#444', caliper: '#555', swingarm: '#666', engine: '#777', seat: '#888', fork: '#999', forkLow: '#aaa', dark: '#000', glass: '#bbb', light: '#fff', exhaust: '#ccc' }, { outline: 2 }))).toBe(true);
  });
  it('uses real Ninja H2 specs', () => {
    expect(H2_SPECS).toMatchObject({ cc: 998, hp: 228, price: 32700 });
  });
});

describe('pixel palette quantizer', () => {
  it('maps colors to the nearest palette entry', () => {
    expect(nearest(0, 0, 0)).toEqual([0x12, 0x0b, 0x1c]);
    expect(nearest(250, 250, 250)).toEqual([0xff, 0xff, 0xff]);
    expect(nearest(120, 230, 90)).toEqual([0x7c, 0xe3, 0x5b]);
  });
});

describe('vector styles', () => {
  for (const st of [iso, flat, neon, comic]) {
    it(`${st.name}: scene, bike and icon are well-formed SVG`, () => {
      for (const out of [st.scene(), st.bike(), st.icon()]) {
        expect(out.startsWith('<svg')).toBe(true);
        expect(balanced(out)).toBe(true);
      }
    });
  }
  it('numbers the styles 1-5 uniquely', () => {
    expect([iso, flat, neon, comic].map((s) => s.num).sort()).toEqual([1, 2, 4, 5]);
  });
});

describe('pixel iso projection', async () => {
  const { P, textW } = await import('../../preview/js/pixeliso.js');
  it('uses a 2:1 isometric grid with whole-pixel vertices', () => {
    const [x0, y0] = P(0, 0), [x1, y1] = P(1, 0), [x2, y2] = P(0, 1);
    expect([x1 - x0, y1 - y0]).toEqual([12, 6]);
    expect([x2 - x0, y2 - y0]).toEqual([-12, 6]);
    expect(P(0, 0, 1)[1]).toBe(y0 - 12);
  });
  it('measures pixel-font text width', () => {
    expect(textW('MOTOADDICT')).toBe(41);
    expect(textW('+$32,700')).toBeGreaterThan(20);
  });
});

describe('3D bikes', async () => {
  const { flatten, extrude, bikeMesh, renderBike3D } = await import('../../preview/js/bike3d.js');
  it('flattens SVG paths into polygons', () => {
    expect(flatten('M0,0 L10,0 L10,10 Z')).toEqual([[0, 0], [10, 0], [10, 10]]);
    expect(flatten('M0,0 Q5,10 10,0', 4)).toHaveLength(5);
  });
  it('extrudes a square into a closed box with outward normals', () => {
    const f = extrude([[166, 177], [266, 177], [266, 77], [166, 77]], -0.1, 0.1, 'x');
    expect(f).toHaveLength(6);
    for (const face of f.slice(2)) {
      const c = face.pts.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[2] / 4], [0, 0]);
      // normal points away from the box centre (u=0.42, w=0.42)
      expect((c[0] - 0.419) * face.n[0] + (c[1] - 0.419) * face.n[2]).toBeGreaterThan(0);
    }
  });
  it('builds a full mesh and renders it from any heading', () => {
    expect(bikeMesh().length).toBeGreaterThan(300);
    for (const deg of [0, 45, 90, 180, 270]) {
      const r = renderBike3D('h2', (deg * Math.PI) / 180, 12);
      const filled = r.cb.filter(Boolean).length;
      expect(filled).toBeGreaterThan(100);
      expect(r.W).toBeLessThan(60);
    }
  });
});
