// HeroFlow — cantor8-style radial line-field on Canvas 2D.
//
// • Data sits at the origin; spokes radiate outward. Mapping by radius:
//   Data(0) → Evidence → Human expertise → AI insights → Better decisions,
//   with the four people (Farmer/Teacher/Health worker/Citizen) on the rim.
// • Ambient: the whole field drifts subtly and reacts to the cursor — spokes
//   near the pointer flex toward it and brighten (the "alive" cantor8 feel).
// • On hover the five-stage sequence fades in along the spoke under the cursor.
// • Scroll-linked reveal: origin rises from the bottom (upper half only) to the
//   centre (full circle); hero text fades out as the circle centres.
// • Off-screen / hidden-tab → paused. Reduced-motion / no-JS → static SVG.

const GOLD = '212, 156, 51'; // #D19C33 rgb
const DEEP_GOLD = '168, 120, 38'; // #A87826 rgb
const NAVY = '#232B65';
const MID_NAVY = '#4A538A';

const STAGES = ['Data', 'Evidence', 'Human expertise', 'AI insights', 'Better decisions'];
const PEOPLE = ['Farmer', 'Teacher', 'Health worker', 'Citizen'];
// radial band positions (fraction of R) for the 5 stage labels — kept in the
// inner half so they sit close to Data and never collide with the rim people.
const STAGE_R = [0.0, 0.15, 0.27, 0.39, 0.51];
// rim anchor angles for the four people (upper hemisphere-friendly spread)
const PEOPLE_ANGLE = [-Math.PI * 0.82, -Math.PI * 0.6, -Math.PI * 0.4, -Math.PI * 0.18];

interface Spoke {
  a: number; // base angle
  len: number; // length as fraction of R
  w: number; // line width
  alpha: number; // base opacity
  seed: number; // per-spoke phase for shimmer
  dot: number; // end-dot radius
  mid: number; // fractional position of one intermediate dot (0 = none)
}

export function initHeroFlow(): void {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const canvas = document.querySelector<HTMLCanvasElement>('[data-hero-canvas]');
  if (!hero || !canvas) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  if (reduce || !ctx) {
    hero.classList.remove('is-anim'); // reveal static fallback
    return;
  }

  // Touch devices can't hover — reveal the stage sequence as the circle centres.
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  // ---- state ----
  let W = 0,
    H = 0,
    dpr = 1;
  let R = 0;
  let originX = 0,
    originY = 0;
  let spokes: Spoke[] = [];

  // pointer (canvas px) + eased hover strength + eased label opacity
  let px = -1,
    py = -1;
  let hover = 0; // 0..1 eased
  let hoverTarget = 0;
  let hoverAngle = 0; // eased angle of the "active" spoke

  let progress = 0; // scroll reveal 0..1
  let running = false;
  let raf = 0;
  let t0 = 0;

  const rand = (min: number, max: number) => min + Math.random() * (max - min);

  function buildField() {
    // spoke count scales with area but is capped for perf
    const count = Math.min(200, Math.max(90, Math.round((W * H) / 9000)));
    spokes = [];
    for (let i = 0; i < count; i++) {
      // even angular spread + jitter so it reads as a burst, not a fan
      const a = (i / count) * Math.PI * 2 + rand(-0.02, 0.02);
      spokes.push({
        a,
        len: rand(0.5, 1.0),
        w: rand(0.6, 1.5),
        // faint at rest (req 4): the field is a delicate texture until hovered,
        // when nearby spokes glow bright.
        alpha: rand(0.05, 0.16),
        seed: rand(0, Math.PI * 2),
        dot: Math.random() < 0.65 ? rand(1.4, 3.0) : 0,
        mid: Math.random() < 0.35 ? rand(0.4, 0.85) : 0,
      });
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2); // cap DPR for perf
    const rect = canvas!.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas!.width = Math.round(W * dpr);
    canvas!.height = Math.round(H * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(W, H) * 0.46;
    buildField();
  }

  function onScroll() {
    // progress across the sticky travel (the 100vh below the pinned stage)
    const wrap = hero!.querySelector<HTMLElement>('.hero__scroll');
    if (!wrap) return;
    const top = wrap.getBoundingClientRect().top; // 0 at start, negative as we scroll
    const travel = wrap.offsetHeight - window.innerHeight;
    progress = travel > 0 ? Math.min(Math.max(-top / travel, 0), 1) : 0;

    // Two-screen choreography (req 1):
    //  • screen 1 "Intelligence, Applied" lead fades/rises out (0 → 0.35)
    //  • screen 2 H1 block fades/slides in (0.45 → 0.9), left-aligned
    const lead = Math.max(0, 1 - progress / 0.35);
    const main = Math.max(0, Math.min(1, (progress - 0.45) / 0.45));
    hero!.style.setProperty('--lead', String(lead));
    hero!.style.setProperty('--lead-y', `${progress * -30}px`);
    hero!.style.setProperty('--main', String(main));
    hero!.style.setProperty('--main-x', `${(1 - main) * -24}px`);
    hero!.style.setProperty('--cue', String(Math.max(0, 1 - progress * 4)));
    hero!.classList.toggle('main-on', main > 0.6); // enable CTA pointer events
  }

  // eased helper
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

  function frame(t: number) {
    if (!t0) t0 = t;
    const time = (t - t0) / 1000;

    // Origin stays horizontally centred (req 3 — no right-shift). It rises from
    // the bottom (upper half on the landing) up past centre, so after the first
    // scroll the Data dot + the lower half of the circle are in view.
    originX = W / 2;
    originY = lerp(H * 1.0, H * 0.3, progress);
    // radius is larger on the landing (fans up to fill the frame), settling to
    // the centred full-circle size as the origin rises.
    const Rp = R * (1 + (1 - progress) * 0.32);

    // touch: drive the reveal from scroll progress, sequence pointing down
    if (isTouch) {
      hoverTarget = progress > 0.4 ? 1 : 0;
      hoverAngle = Math.PI * 0.5;
    }

    // ease pointer-driven values
    hover = lerp(hover, hoverTarget, 0.08);
    if (!isTouch && hoverTarget > 0) {
      const pa = Math.atan2(py - originY, px - originX);
      // ease toward pointer angle (shortest path)
      let d = pa - hoverAngle;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      hoverAngle += d * 0.15;
    }

    ctx!.clearRect(0, 0, W, H);

    // warm radial glow at the origin (moves with the circle)
    const glow = ctx!.createRadialGradient(originX, originY, 0, originX, originY, Rp * 1.15);
    glow.addColorStop(0, 'rgba(245, 233, 209, 0.55)');
    glow.addColorStop(0.4, 'rgba(209, 156, 51, 0.10)');
    glow.addColorStop(1, 'rgba(245, 233, 209, 0)');
    ctx!.fillStyle = glow;
    ctx!.fillRect(0, 0, W, H);

    // ---- slow outward pulse (req 5): soft gold rings expand from Data + fade ----
    const PULSE = 4.5; // seconds per ring
    for (let k = 0; k < 2; k++) {
      const ph = ((time / PULSE) + k * 0.5) % 1;
      const rr = ph * Rp * 1.05;
      const alpha = (1 - ph) * 0.16;
      if (alpha > 0.004 && rr > 4) {
        ctx!.shadowColor = `rgba(${GOLD}, ${alpha})`;
        ctx!.shadowBlur = 14;
        ctx!.strokeStyle = `rgba(${GOLD}, ${alpha})`;
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.arc(originX, originY, rr, 0, Math.PI * 2);
        ctx!.stroke();
      }
    }
    ctx!.shadowBlur = 0;

    // ---- spokes ----
    for (const s of spokes) {
      const shimmer = Math.sin(time * 0.6 + s.seed) * 0.015;
      let ang = s.a + shimmer;

      // cursor reactivity: nearest spokes flex toward the pointer + brighten
      let boost = 0;
      if (hover > 0.01) {
        let da = ang - hoverAngle;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        const prox = Math.max(0, 1 - Math.abs(da) / 0.5); // within ~28°
        boost = prox * hover;
        ang += da < 0 ? boost * 0.06 : -boost * 0.06; // subtle bend toward cursor
      }

      const len = Rp * s.len * (1 + boost * 0.08);
      // start a few px out from the origin so lines don't pile into a muddy dot
      const sx = originX + Math.cos(ang) * 8;
      const sy = originY + Math.sin(ang) * 8;
      const ex = originX + Math.cos(ang) * len;
      const ey = originY + Math.sin(ang) * len;

      // req 4: bright + glowing only where hovered; faint otherwise
      const a = Math.min(0.95, s.alpha + boost * 0.85);
      ctx!.shadowBlur = boost > 0.03 ? 6 + boost * 16 : 0;
      ctx!.shadowColor = `rgba(${GOLD}, ${boost})`;
      const grad = ctx!.createLinearGradient(sx, sy, ex, ey);
      grad.addColorStop(0, `rgba(${DEEP_GOLD}, ${a})`);
      grad.addColorStop(1, `rgba(${GOLD}, ${a * 0.45})`);
      ctx!.strokeStyle = grad;
      ctx!.lineWidth = s.w + boost * 0.9;
      ctx!.beginPath();
      ctx!.moveTo(sx, sy);
      ctx!.lineTo(ex, ey);
      ctx!.stroke();

      if (s.dot) {
        ctx!.fillStyle = `rgba(${GOLD}, ${Math.min(0.95, a + 0.2)})`;
        ctx!.beginPath();
        ctx!.arc(ex, ey, s.dot + boost * 1.4, 0, Math.PI * 2);
        ctx!.fill();
      }
      if (s.mid) {
        const mx = originX + Math.cos(ang) * len * s.mid;
        const my = originY + Math.sin(ang) * len * s.mid;
        ctx!.fillStyle = `rgba(${DEEP_GOLD}, ${a * 0.8})`;
        ctx!.beginPath();
        ctx!.arc(mx, my, 1.1, 0, Math.PI * 2);
        ctx!.fill();
      }
    }
    ctx!.shadowBlur = 0; // don't blur the core/labels below

    // ---- core (Data) ----
    const core = ctx!.createRadialGradient(originX, originY, 0, originX, originY, 14);
    core.addColorStop(0, `rgba(${GOLD}, 0.95)`);
    core.addColorStop(1, `rgba(${GOLD}, 0)`);
    ctx!.fillStyle = core;
    ctx!.beginPath();
    ctx!.arc(originX, originY, 14, 0, Math.PI * 2);
    ctx!.fill();
    ctx!.fillStyle = `rgba(${DEEP_GOLD}, 1)`;
    ctx!.beginPath();
    ctx!.arc(originX, originY, 3.5, 0, Math.PI * 2);
    ctx!.fill();

    // ---- people labels on the rim (always faint; brighter near the active spoke) ----
    ctx!.textAlign = 'center';
    ctx!.textBaseline = 'middle';
    ctx!.font = "700 12px Lato, system-ui, sans-serif";
    for (let i = 0; i < PEOPLE.length; i++) {
      const ang = PEOPLE_ANGLE[i];
      const lx = originX + Math.cos(ang) * (Rp + 22);
      const ly = originY + Math.sin(ang) * (Rp + 22);
      if (ly < -10 || ly > H + 10) continue; // off-screen (upper-half phase)
      let near = 0;
      if (hover > 0.01) {
        let da = ang - hoverAngle;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        near = Math.max(0, 1 - Math.abs(da) / 0.4) * hover;
      }
      ctx!.fillStyle = `rgba(35, 43, 101, ${0.35 + near * 0.55})`;
      ctx!.fillText(PEOPLE[i].toUpperCase(), lx, ly);
    }

    // ---- stage sequence along the active spoke (fades in on hover) ----
    if (hover > 0.02) {
      const ca = Math.cos(hoverAngle);
      const sa = Math.sin(hoverAngle);
      ctx!.font = "700 13px Lato, system-ui, sans-serif";
      for (let i = 0; i < STAGES.length; i++) {
        const rr = Rp * STAGE_R[i];
        const lx = originX + ca * rr;
        const ly = originY + sa * rr - (i === 0 ? 16 : 0);
        // small pill behind the label for legibility over the lines
        const label = STAGES[i];
        const wpx = ctx!.measureText(label).width + 14;
        ctx!.fillStyle = `rgba(255, 255, 255, ${0.78 * hover})`;
        roundRect(ctx!, lx - wpx / 2, ly - 11, wpx, 22, 11);
        ctx!.fill();
        ctx!.fillStyle = `rgba(${i === 0 ? DEEP_GOLD : '35, 43, 101'}, ${hover})`;
        ctx!.fillText(label, lx, ly);
      }
    }

    if (running) raf = requestAnimationFrame(frame);
  }

  function roundRect(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // ---- pointer ----
  const onPointerMove = (e: PointerEvent) => {
    const rect = canvas!.getBoundingClientRect();
    px = e.clientX - rect.left;
    py = e.clientY - rect.top;
    hoverTarget = 1;
  };
  const onPointerLeave = () => {
    hoverTarget = 0;
  };
  canvas.addEventListener('pointermove', onPointerMove, { passive: true });
  canvas.addEventListener('pointerleave', onPointerLeave, { passive: true });
  // let scroll gestures pass through the canvas
  canvas.style.touchAction = 'pan-y';

  const start = () => {
    if (running) return;
    running = true;
    t0 = 0;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  // pause off-screen + when tab hidden
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) e.isIntersecting ? start() : stop();
    },
    { threshold: 0 },
  );
  io.observe(hero);
  document.addEventListener('visibilitychange', () =>
    document.hidden ? stop() : io.takeRecords().length === 0 && start(),
  );

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  resize();
  onScroll();
  start();

  // Debug hook: lets tooling freeze the RAF loop to capture a stable frame.
  (window as unknown as { __hero?: unknown }).__hero = { start, stop };
}
