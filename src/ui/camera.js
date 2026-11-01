// Drag (or mouse-wheel) to pan around the dealership map.
export function makeCamera(viewport, layer, mapW, mapH, scale = 2) {
  let x = 0, y = 0, drag = null;
  const clamp = () => {
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    x = Math.min(0, Math.max(vw - mapW * scale, x));
    y = Math.min(0, Math.max(vh - mapH * scale, y));
  };
  const apply = () => { clamp(); layer.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`; };
  const cam = {
    /** Centre the view on a map pixel. */
    lookAt(mx, my) { x = viewport.clientWidth / 2 - mx * scale; y = viewport.clientHeight / 2 - my * scale; apply(); },
    get pos() { return { x, y }; },
    refresh: apply,
  };
  viewport.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.hud-el')) return;
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x, y };
    viewport.setPointerCapture(e.pointerId);
    viewport.classList.add('dragging');
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    x = drag.x + (e.clientX - drag.sx); y = drag.y + (e.clientY - drag.sy);
    apply();
  });
  const end = (e) => { if (drag && e.pointerId === drag.id) { drag = null; viewport.classList.remove('dragging'); } };
  viewport.addEventListener('pointerup', end);
  viewport.addEventListener('pointercancel', end);
  viewport.addEventListener('wheel', (e) => { e.preventDefault(); x -= e.deltaX; y -= e.deltaY; apply(); }, { passive: false });
  window.addEventListener('resize', apply);
  return cam;
}
