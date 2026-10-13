// The interface stays out of the picture: a few small buttons in a corner (hour, season, quality, controls), the list of
// controls behind the third, a one-line hint that leaves at the first step, and two thumbs on a touch screen.
// Faint at rest; the buttons carry their keys, and while the mouse is looking around they say how to free it.
// Styles are in index.html.
const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICON = {
  eve: [
    svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>'),
    svg('<path d="M20 14.2A8 8 0 1 1 9.8 4a6.4 6.4 0 0 0 10.2 10.2z"/>'),
  ],
  snow: [
    svg('<path d="M5 19C5 11 10 6 19 5c0 9-5 14-14 14zM5 19l8-8"/>'),
    svg('<path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17M10 3.5l2 2 2-2M10 20.5l2-2 2 2"/>'),
  ],
};
const CHEVRON = [svg('<path d="M14.5 6l-6 6 6 6"/>'), svg('<path d="M9.5 6l6 6-6 6"/>')];
const PLAY = [svg('<path d="M8 5.5v13l10-6.5z"/>'), svg('<path d="M8.5 5.5v13M15.5 5.5v13"/>')];
const GEAR = svg('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>');
const NAME = { eve: ['Day', 'Evening'], snow: ['Summer', 'Winter'] };
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };

// rows: [code, label, key, value()?, keyboardOnly?] - a row does what its key does (act(code))
// view(): { i, n, playing } - which of the chosen stills, of how many, and whether the slideshow runs
// quality(): { name, pinned } - the level as it reads, and whether the url holds it (src/quality.js)
export function buildUI({ canvas, act, rows, mode, view, quality, onLook }) {
  const root = el('div'); root.id = 'ui';
  const bar = el('div', 'ui-bar'), panel = el('div', 'ui-panel');
  const sync = () => {
    const m = mode();
    for (const k of ['eve', 'snow']) {
      btn[k].innerHTML = ICON[k][m[k]] + `<kbd>${k === 'eve' ? 'N' : 'M'}</kbd>`;
      btn[k].setAttribute('aria-label', `${k === 'eve' ? 'Time of day' : 'Season'}: ${NAME[k][m[k]]}`);
      btn[k].setAttribute('aria-pressed', m[k] ? 'true' : 'false');
    }
    const ql = quality();
    gear.title = ql.pinned ? 'Quality is set by the url (msaa / scale)' : `Quality: ${ql.name} (U)`;
    gear.setAttribute('aria-label', `Quality: ${ql.name}`);
    gear.disabled = ql.pinned;
    const w = view();
    count.innerHTML = `${w.i}<small>/</small>${w.n}`;
    play.innerHTML = PLAY[+w.playing] + '<kbd>C</kbd>';
    play.title = (w.playing ? 'Stop the slideshow' : 'Slideshow of viewpoints') + ' (C)';
    play.setAttribute('aria-pressed', w.playing ? 'true' : 'false');
    for (const [v, get] of values) v.textContent = get();
  };
  const press = (b, code) => b.addEventListener('click', (e) => { e.stopPropagation(); act(code); b.blur(); sync(); });

  const btn = {}, values = [];
  bar.appendChild(el('div', 'ui-esc', '<kbd>Esc</kbd> frees the mouse'));
  // viewpoints: back, which of how many (also steps on), on, and the slideshow
  const views = el('div', 'ui-group'), count = el('button', 'ui-count'), play = el('button', 'ui-btn');
  for (const [b, code, title, html] of [[el('button'), 'KeyB', 'Previous viewpoint (B)', CHEVRON[0]], [count, 'KeyV', 'Next viewpoint (V)'], [el('button'), 'KeyV', 'Next viewpoint (V)', CHEVRON[1] + '<kbd>V</kbd>'], [play, 'KeyC']]) {
    b.type = 'button';
    if (title) { b.title = title; b.setAttribute('aria-label', title); }
    if (html) b.innerHTML = html;
    press(b, code);
    if (b !== play) views.appendChild(b);
  }
  bar.append(views, play);
  for (const [k, code] of [['eve', 'KeyN'], ['snow', 'KeyM']]) {
    const b = btn[k] = el('button', 'ui-btn');
    b.type = 'button';
    b.title = k === 'eve' ? 'Time of day (N)' : 'Season (M)';
    press(b, code);
    bar.appendChild(b);
  }
  const gear = el('button', 'ui-btn', GEAR + '<kbd>U</kbd>');
  gear.type = 'button';
  press(gear, 'KeyU');
  bar.appendChild(gear);
  const help = el('button', 'ui-btn', '?');
  help.type = 'button'; help.title = 'Controls (?)'; help.setAttribute('aria-expanded', 'false');
  const open = (on) => { root.classList.toggle('open', on); help.setAttribute('aria-expanded', on ? 'true' : 'false'); if (on) sync(); };
  help.addEventListener('click', (e) => { e.stopPropagation(); open(!root.classList.contains('open')); help.blur(); });
  bar.appendChild(help);

  panel.appendChild(el('div', 'ui-note ui-keys', 'Click to look · <kbd>WASD</kbd> move · <kbd>Shift</kbd> run · <kbd>Q</kbd>/<kbd>E</kbd> down/up in flight · <kbd>Esc</kbd> frees the mouse'));
  panel.appendChild(el('div', 'ui-note ui-touch', 'Left thumb walks (push further to run) · right thumb looks · in flight you go where you look'));
  for (const [code, label, key, get, keysOnly] of rows) {
    const r = el('button', 'ui-row' + (keysOnly ? ' ui-keys' : ''));
    r.type = 'button';
    r.appendChild(el('span', '', label));
    if (get) { const v = el('i'); values.push([v, get]); r.appendChild(v); }
    r.appendChild(el('kbd', '', key));
    press(r, code);
    panel.appendChild(r);
  }

  const hint = el('div', 'ui-hint', '<span class="ui-keys">Click to look around · WASD to move</span><span class="ui-touch">Left thumb to walk · right thumb to look</span>');
  // (its time runs from the moment the picture is first seen, not from behind the loading screen)
  let hintTimer = 0;
  addEventListener('scene-ready', () => { hintTimer = setTimeout(() => hint.classList.add('gone'), 12000); }, { once: true });
  const began = () => { clearTimeout(hintTimer); hintTimer = setTimeout(() => hint.classList.add('gone'), 1500); };

  const ring = el('div', 'ui-stick', '<b></b>'), nub = ring.firstChild;
  root.append(bar, panel, hint, ring);
  document.body.appendChild(root);

  addEventListener('keydown', (e) => {
    if (e.code === 'Escape') open(false);
    if (e.code === 'Slash') open(!root.classList.contains('open'));
    if (/^Key[WASD]$/.test(e.code)) began();
  });
  document.addEventListener('pointerlockchange', () => {
    const away = document.pointerLockElement === canvas;
    root.classList.toggle('away', away);
    if (away) began();
  });

  // ---- touch: a thumb that goes down on the left half is a stick (where it lands is its centre), any other looks
  const R = 46, stick = { x: 0, y: 0, run: false };
  let moveId = null, lookId = null, ox = 0, oy = 0, lx = 0, ly = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    open(false);
    began();
    if (moveId === null && e.clientX < innerWidth / 2) {
      moveId = e.pointerId; ox = e.clientX; oy = e.clientY;
      ring.style.left = ox + 'px'; ring.style.top = oy + 'px'; nub.style.transform = '';
      ring.classList.add('on');
    } else if (lookId === null) { lookId = e.pointerId; lx = e.clientX; ly = e.clientY; }
    else return;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId === moveId) {
      const dx = e.clientX - ox, dy = e.clientY - oy, l = Math.hypot(dx, dy), k = l > R ? R / l : 1;
      // (a small dead centre; past the rim the pace is a walk, well past it a run)
      const a = l < 0.15 * R ? 0 : k / R;
      stick.x = dx * a; stick.y = dy * a; stick.run = l > 1.9 * R;
      nub.style.transform = `translate(${dx * k}px,${dy * k}px)`;
    } else if (e.pointerId === lookId) {
      onLook(e.clientX - lx, e.clientY - ly);
      lx = e.clientX; ly = e.clientY;
    }
  });
  const lift = (e) => {
    if (e.pointerId === moveId) { moveId = null; stick.x = stick.y = 0; stick.run = false; ring.classList.remove('on'); }
    if (e.pointerId === lookId) lookId = null;
  };
  canvas.addEventListener('pointerup', lift);
  canvas.addEventListener('pointercancel', lift);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  sync();
  return { sync, stick, show: (on) => { root.hidden = !on; } };
}
