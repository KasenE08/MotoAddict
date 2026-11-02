// Pixel-styled modal dialogs.
import { fill } from './icons.js';

export async function openModal({ title, body, actions = [], onClose, cls = '' }) {
  closeModal();
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap hud-el';
  wrap.innerHTML = await fill(`
    <div class="modal ${cls}" role="dialog" aria-label="${title}">
      <div class="m-head"><span>${title}</span><button class="m-x" aria-label="Close">{{x:22}}</button></div>
      <div class="m-body">${body}</div>
      ${actions.length ? `<div class="m-actions">${actions.map((a, i) => `<button class="btn ${a.kind || ''}" data-i="${i}">${a.label}</button>`).join('')}</div>` : ''}
    </div>`);
  const close = () => { wrap.remove(); onClose?.(); };
  wrap.querySelector('.m-x').onclick = close;
  wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) close(); });
  wrap.querySelectorAll('.m-actions .btn').forEach((b) => { b.onclick = () => { const a = actions[+b.dataset.i]; if (a.onClick?.(wrap) !== false) close(); }; });
  document.getElementById('game').appendChild(wrap);
  return wrap;
}

export function closeModal() { document.querySelectorAll('.modal-wrap').forEach((m) => m.remove()); }

// Messages queue up so none are lost; each shows for ~2 seconds.
const queue = [];
let showing = false;
export function toast(text) {
  if (queue.length >= 4) queue.shift();
  if (queue.includes(text)) return;
  queue.push(text);
  if (!showing) next();
}
function next() {
  const text = queue.shift();
  if (text === undefined) { showing = false; return; }
  showing = true;
  document.querySelectorAll('.toast').forEach((old) => old.remove());
  const t = document.createElement('div');
  t.className = 'toast hud-el';
  t.textContent = text;
  document.getElementById('game').appendChild(t);
  const ms = queue.length ? 1500 : 2000;
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => { t.remove(); next(); }, ms + 350);
}
