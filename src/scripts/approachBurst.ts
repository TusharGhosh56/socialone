// approachBurst.ts — cantor8-style radial line-field burst, Canvas 2D.
// Has moved homes a few times (Hero/FlowChart, then How We Work, now What
// We Do — see index.astro's alignWhatWeDoBurst()) but the component itself
// stays generic: it just looks for [data-approach-burst]/[data-approach-canvas]
// wherever they are, draws its origin at that container's own centre, and
// reacts to the pointer across whichever <section> the container lives in
// (derived via `container.closest('section')`, not a hardcoded id — that
// was a real bug for one release after the What We Do move, when this still
// hardcoded `#how-we-work` and silently kept listening on the wrong,
// now-burst-less section). Currently sized/positioned by
// alignWhatWeDoBurst() to be full section-width, symmetric around
// What We Do's `.connect-dot` (the same point flowLine.ts's milestone
// anchors to), so this canvas's own centre lands exactly there.
//
// • Ambient: the whole field drifts subtly and reacts to the cursor — spokes
//   near the pointer flex toward it and brighten.
// • Slow outward pulse of gold rings from the origin.
// • Off-screen / hidden-tab → paused. Reduced-motion / no-JS → hidden
//   (container keeps a plain static gradient background, see CSS).

const GOLD = '212, 156, 51'; // #D19C33 rgb
const DEEP_GOLD = '168, 120, 38'; // #A87826 rgb

// The canvas box itself is stretched full-bleed across the whole section
// (index.astro's alignHowWeWorkHeading) so there's no visible edge/seam.
// Spoke DENSITY (not the burst's radius — see the R comment in resize())
// is still capped off this width, so the field doesn't get needlessly
// crowded just because the box is now much wider than what a comfortable
// spoke count was originally tuned for.
const REACH_CAP = 560;

interface Spoke {
  a: number;
  len: number;
  w: number;
  alpha: number;
  seed: number;
  dot: number;
  mid: number;
}

export function initApproachBurst(): void {
  const container = document.querySelector<HTMLElement>('[data-approach-burst]');
  const canvas = document.querySelector<HTMLCanvasElement>('[data-approach-canvas]');
  // Derived from the container itself rather than a hardcoded id — this
  // used to be `document.getElementById('how-we-work')` from when the
  // burst lived there; after it moved to What We Do, that hardcoded id
  // silently kept pointing at How We Work's (now burst-less) section, so
  // the pointer-reactivity zone was listening on the wrong section entirely.
  const section = container?.closest('section') ?? null;
  if (!container || !canvas || !section) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  if (reduce || !ctx) return; // static background CSS covers this case

  let W = 0,
    H = 0,
    dpr = 1;
  let R = 0;
  let originX = 0,
    originY = 0;
  let spokes: Spoke[] = [];

  let px = -1,
    py = -1;
  let hover = 0;
  let hoverTarget = 0;
  let hoverAngle = 0;

  let running = false;
  let raf = 0;
  let t0 = 0;

  const rand = (min: number, max: number) => min + Math.random() * (max - min);

  function buildField(reachW: number) {
    const count = Math.min(160, Math.max(60, Math.round((reachW * H) / 6500)));
    spokes = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand(-0.02, 0.02);
      spokes.push({
        a,
        len: rand(0.5, 1.0),
        w: rand(0.6, 1.5),
        alpha: rand(0.05, 0.16),
        seed: rand(0, Math.PI * 2),
        dot: Math.random() < 0.65 ? rand(1.4, 3.0) : 0,
        mid: Math.random() < 0.35 ? rand(0.4, 0.85) : 0,
      });
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas!.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas!.width = Math.round(W * dpr);
    canvas!.height = Math.round(H * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

    // PREVIEW: originX moved from the left edge (0) to dead centre (W/2)
    // so it can be compared against the current left-anchored look before
    // deciding which to keep — revert to `originX = 0;` to go back.
    //
    // R is a true circle, sized off HALF the box's own HEIGHT (not width —
    // the box is now much wider than it is tall) so every spoke, at any
    // angle, is guaranteed to fit inside the box with a little margin to
    // spare, instead of overshooting the top/bottom edges. This trades
    // away some horizontal reach versus the box's full width, but that's
    // the right trade: a smaller circle reads as a burst, a giant ellipse
    // stretched to fit a short-and-wide box just reads as distorted.
    const reachW = Math.min(W, REACH_CAP);
    originX = W / 2;
    originY = H / 2;
    R = Math.max(60, (H / 2) * 0.96);

    buildField(reachW);
  }

  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

  function frame(t: number) {
    if (!t0) t0 = t;
    const time = (t - t0) / 1000;

    hover = lerp(hover, hoverTarget, 0.08);
    if (hoverTarget > 0) {
      const pa = Math.atan2(py - originY, px - originX);
      let d = pa - hoverAngle;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      hoverAngle += d * 0.15;
    }

    ctx!.clearRect(0, 0, W, H);

    // Glow reaches fully transparent 30% sooner than the spokes/rings do
    // (0.7x their reach) — the warm wash fades out before the outer edge
    // of the burst rather than stretching all the way out to it.
    const glow = ctx!.createRadialGradient(originX, originY, 0, originX, originY, R * 1.15 * 0.7);
    glow.addColorStop(0, 'rgba(245, 233, 209, 0.55)');
    glow.addColorStop(0.4, 'rgba(209, 156, 51, 0.10)');
    glow.addColorStop(1, 'rgba(245, 233, 209, 0)');
    ctx!.fillStyle = glow;
    ctx!.fillRect(0, 0, W, H);

    const PULSE = 4.5;
    for (let k = 0; k < 2; k++) {
      const ph = (time / PULSE + k * 0.5) % 1;
      const rr = ph * R * 1.05;
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

    for (const s of spokes) {
      const shimmer = Math.sin(time * 0.6 + s.seed) * 0.015;
      let ang = s.a + shimmer;

      let boost = 0;
      if (hover > 0.01) {
        let da = ang - hoverAngle;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        const prox = Math.max(0, 1 - Math.abs(da) / 0.5);
        boost = prox * hover;
        ang += da < 0 ? boost * 0.06 : -boost * 0.06;
      }

      const len = R * s.len * (1 + boost * 0.08);
      const sx = originX + Math.cos(ang) * 8;
      const sy = originY + Math.sin(ang) * 8;
      const ex = originX + Math.cos(ang) * len;
      const ey = originY + Math.sin(ang) * len;

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
    ctx!.shadowBlur = 0;

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

    if (running) raf = requestAnimationFrame(frame);
  }

  // Listen on the WHOLE section, not just this box, so the burst reacts to
  // the pointer anywhere in How We Work (over the heading, the cards, etc.)
  // — px/py stay relative to the CANVAS's own rect (canvas-local math),
  // same cross-element-reactivity technique used when this burst spanned
  // Hero+FlowChart.
  const onPointerMove = (e: PointerEvent) => {
    const rect = canvas!.getBoundingClientRect();
    px = e.clientX - rect.left;
    py = e.clientY - rect.top;
    hoverTarget = 1;
  };
  const onPointerLeave = () => {
    hoverTarget = 0;
  };
  section.addEventListener('pointermove', onPointerMove, { passive: true });
  section.addEventListener('pointerleave', onPointerLeave, { passive: true });
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

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) e.isIntersecting ? start() : stop();
    },
    { threshold: 0 },
  );
  io.observe(section);
  document.addEventListener('visibilitychange', () =>
    document.hidden ? stop() : io.takeRecords().length === 0 && start(),
  );

  window.addEventListener('resize', resize, { passive: true });
  resize();
  start();

  (window as unknown as { __approachBurst?: unknown }).__approachBurst = { start, stop };
}
