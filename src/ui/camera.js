// Camera: drag to pan, pinch (or trackpad pinch / ctrl+wheel) to zoom, tap to select.
// While pinching the zoom is smooth; on release it settles on a whole-number
// scale so pixel art stays crisp.
export function makeCamera(viewport, layer, mapW, mapH, { scale = 2, min = 1, max = 4, onTap } = {}) {
  let x = 0, y = 0, s = scale;
  const pts = new Map(); // active pointers
  let gesture = null, moved = 0;

  const minScale = () => Math.max(min, viewport.clientWidth / mapW, viewport.clientHeight / mapH);
  const clamp = () => {
    s = Math.min(max, Math.max(minScale(), s));
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    x = Math.min(0, Math.max(vw - mapW * s, x));
    y = Math.min(0, Math.max(vh - mapH * s, y));
  };
  const apply = () => { clamp(); layer.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) scale(${s})`; };
  // keep the map point under (cx, cy) fixed while changing scale
  const zoomAt = (ns, cx, cy) => {
    const mx = (cx - x) / s, my = (cy - y) / s;
    s = Math.min(max, Math.max(minScale(), ns));
    x = cx - mx * s; y = cy - my * s;
    apply();
  };
  const snap = (cx, cy) => {
    const lo = minScale();
    let t = Math.round(s);
    if (t < lo) t = lo;
    if (t > max) t = max;
    viewport.classList.add('snapping');
    zoomAt(t, cx, cy);
    setTimeout(() => viewport.classList.remove('snapping'), 160);
  };
  const local = (e) => { const r = viewport.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const two = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a[0] - b[0], a[1] - b[1]), cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2 }; };

  viewport.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.hud-el')) return;
    try { viewport.setPointerCapture(e.pointerId); } catch { /* synthetic pointers */ }
    pts.set(e.pointerId, local(e));
    if (pts.size === 1) { const [px, py] = local(e); gesture = { kind: 'pan', sx: px, sy: py, x, y }; moved = 0; }
    if (pts.size === 2) { const t = two(); gesture = { kind: 'pinch', d: t.d, s, cx: t.cx, cy: t.cy, x, y }; moved = 99; }
    viewport.classList.add('dragging');
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, local(e));
    if (gesture?.kind === 'pan' && pts.size === 1) {
      const [px, py] = local(e);
      moved = Math.max(moved, Math.hypot(px - gesture.sx, py - gesture.sy));
      x = gesture.x + (px - gesture.sx); y = gesture.y + (py - gesture.sy);
      apply();
    } else if (gesture?.kind === 'pinch' && pts.size === 2) {
      const t = two();
      // scale about the starting midpoint, and follow the midpoint as it moves
      const ns = gesture.s * (t.d / gesture.d);
      const mx = (gesture.cx - gesture.x) / gesture.s, my = (gesture.cy - gesture.y) / gesture.s;
      s = Math.min(max, Math.max(minScale(), ns));
      x = t.cx - mx * s; y = t.cy - my * s;
      apply();
    }
  });
  const end = (e) => {
    if (!pts.has(e.pointerId)) return;
    const [px, py] = local(e);
    pts.delete(e.pointerId);
    if (gesture?.kind === 'pinch') {
      if (pts.size === 0) { snap(gesture.cx, gesture.cy); gesture = null; }
      else { const [p] = [...pts.values()]; gesture = { kind: 'pan', sx: p[0], sy: p[1], x, y, afterPinch: { cx: gesture.cx, cy: gesture.cy } }; }
    } else if (gesture?.kind === 'pan' && pts.size === 0) {
      if (gesture.afterPinch) snap(gesture.afterPinch.cx, gesture.afterPinch.cy); // fingers lifted one at a time
      else if (moved < 8 && onTap) onTap((px - x) / s, (py - y) / s);
      gesture = null;
    }
    if (pts.size === 0) viewport.classList.remove('dragging');
  };
  viewport.addEventListener('pointerup', end);
  viewport.addEventListener('pointercancel', end);
  let wheelSnap;
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const [cx, cy] = local(e);
    if (e.ctrlKey) { // trackpad pinch or ctrl+scroll
      zoomAt(s * Math.exp(-e.deltaY * 0.01), cx, cy);
      clearTimeout(wheelSnap);
      wheelSnap = setTimeout(() => snap(cx, cy), 180);
    } else { x -= e.deltaX; y -= e.deltaY; apply(); }
  }, { passive: false });
  // stop iOS Safari from zooming the whole page
  for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, (e) => e.preventDefault());
  window.addEventListener('resize', apply);

  return {
    lookAt(mx, my) { x = viewport.clientWidth / 2 - mx * s; y = viewport.clientHeight / 2 - my * s; apply(); },
    zoomTo(ns) { zoomAt(ns, viewport.clientWidth / 2, viewport.clientHeight / 2); },
    get pos() { return { x, y, s }; },
    refresh: apply,
  };
}
