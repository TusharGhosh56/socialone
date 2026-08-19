// goldWaveform.ts — abstract gold particle waveform, Canvas 2D ambient
// background. Used behind AI in Action and Our Foundation (About) — any
// number of [data-gold-waveform] containers, each with its own
// [data-gold-waveform-canvas] child, get their own independent instance
// (own field, own rAF loop, own IntersectionObserver) via bind(). Same
// lifecycle conventions as approachBurst.ts: DPR-aware resize,
// IntersectionObserver + visibilitychange pause/resume, prefers-reduced-
// motion → hidden (static CSS background covers that case, canvas left
// untouched).
//
// Visual: a handful of thin, softly-glowing gold strands sweep horizontally
// across the section, each one's amplitude itself breathing over a slower
// second sine so the strands converge/fan out into a woven ribbon rather
// than a flat repeating wave. A sparse layer of particles rides along the
// strands, drifting left-to-right and looping, for the "particle" half of
// the effect. Everything is a pure function of elapsed time (time since
// this run started animating) — no phase-branching between "just started"
// and "been running a while."

const GOLD = '209, 156, 51'; // #D19C33 rgb
const DEEP_GOLD = '168, 120, 38'; // #A87826 rgb

const STRAND_COUNT = 9;
const PARTICLES_PER_STRAND = 5;
const EDGE_FADE = 0.12; // fraction of width over which strands fade in/out at each edge

interface Strand {
  yFrac: number; // base vertical position, fraction of canvas height
  freq: number; // spatial frequency along x
  phase: number;
  speed: number; // phase drift per second
  amp: number; // base amplitude, px
  envFreq: number; // slow amplitude-breathing frequency (per px)
  envPhase: number;
  envSpeed: number; // breathing drift per second
  alpha: number;
  width: number;
}

interface Particle {
  strand: number;
  t: number; // 0..1 position along x, wraps
  speed: number; // per second
  r: number;
  alpha: number;
}

// One independent instance per [data-gold-waveform] container — own field,
// own rAF loop, own IntersectionObserver — so multiple sections can run
// this ambient background at once without sharing state. `alphaMul` scales
// every alpha this instance draws with — the strand/particle alpha ranges
// below were tuned to read against a dark navy background; an instance on a
// light background (e.g. the preloader, via `data-gold-waveform-alpha`) needs
// a higher multiplier to stay visible, without changing the two existing
// dark-background instances, which default to 1 (unchanged).
function bind(container: HTMLElement, canvas: HTMLCanvasElement, alphaMul = 1): void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  if (reduce || !ctx) return; // static background CSS covers this case

  let W = 0,
    H = 0,
    dpr = 1;
  let strands: Strand[] = [];
  let particles: Particle[] = [];

  let running = false;
  let raf = 0;
  let t0 = 0;

  const rand = (min: number, max: number) => min + Math.random() * (max - min);

  function buildField() {
    strands = [];
    for (let i = 0; i < STRAND_COUNT; i++) {
      strands.push({
        yFrac: rand(0.12, 0.88),
        freq: rand(0.0016, 0.0032),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.12, 0.28) * (Math.random() < 0.5 ? 1 : -1),
        amp: rand(18, 46),
        envFreq: rand(0.0005, 0.0011),
        envPhase: rand(0, Math.PI * 2),
        envSpeed: rand(0.03, 0.08),
        alpha: rand(0.08, 0.22),
        width: rand(0.8, 1.6),
      });
    }
    particles = [];
    strands.forEach((_, si) => {
      for (let p = 0; p < PARTICLES_PER_STRAND; p++) {
        particles.push({
          strand: si,
          t: rand(0, 1),
          speed: rand(0.02, 0.05),
          r: rand(1.2, 2.4),
          alpha: rand(0.35, 0.75),
        });
      }
    });
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildField();
  }

  // Amplitude envelope: breathes between ~35% and 100% of the strand's base
  // amplitude, and fades to 0 within EDGE_FADE of either edge so strands
  // never look clipped at the section's own boundary.
  function envelopeAt(s: Strand, x: number, time: number): number {
    const breathe = 0.35 + 0.65 * Math.pow(Math.sin(x * s.envFreq + s.envPhase + time * s.envSpeed), 2);
    const edge = Math.min(1, Math.min(x / (W * EDGE_FADE), (W - x) / (W * EDGE_FADE)));
    return breathe * Math.max(0, edge);
  }

  function yAt(s: Strand, x: number, time: number): number {
    const amp = s.amp * envelopeAt(s, x, time);
    return s.yFrac * H + Math.sin(x * s.freq + s.phase + time * s.speed) * amp;
  }

  function frame(t: number) {
    if (!t0) t0 = t;
    const time = (t - t0) / 1000;

    ctx!.clearRect(0, 0, W, H);

    const STEP = 6;
    for (const s of strands) {
      ctx!.beginPath();
      for (let x = 0; x <= W; x += STEP) {
        const y = yAt(s, x, time);
        if (x === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      const env0 = envelopeAt(s, W / 2, time);
      const a = Math.min(1, s.alpha * (0.4 + 0.6 * env0) * alphaMul);
      ctx!.strokeStyle = `rgba(${GOLD}, ${a})`;
      ctx!.lineWidth = s.width;
      ctx!.stroke();
    }

    for (const p of particles) {
      p.t += p.speed * (1 / 60);
      if (p.t > 1) p.t -= 1;
      const s = strands[p.strand];
      const x = p.t * W;
      const y = yAt(s, x, time);
      const env = envelopeAt(s, x, time);
      const a = Math.min(1, p.alpha * env * alphaMul);
      if (a <= 0.01) continue;
      ctx!.fillStyle = `rgba(${DEEP_GOLD}, ${a})`;
      ctx!.beginPath();
      ctx!.arc(x, y, p.r, 0, Math.PI * 2);
      ctx!.fill();
    }

    if (running) raf = requestAnimationFrame(frame);
  }

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
  io.observe(container);
  document.addEventListener('visibilitychange', () =>
    document.hidden ? stop() : io.takeRecords().length === 0 && start(),
  );

  window.addEventListener('resize', resize, { passive: true });
  resize();
  start();
}

export function initGoldWaveform(): void {
  document.querySelectorAll<HTMLElement>('[data-gold-waveform]:not([data-gold-waveform-bound])').forEach((container) => {
    container.setAttribute('data-gold-waveform-bound', '');
    const canvas = container.querySelector<HTMLCanvasElement>('[data-gold-waveform-canvas]');
    const alphaMul = parseFloat(container.dataset.goldWaveformAlpha || '1') || 1;
    if (canvas) bind(container, canvas, alphaMul);
  });
}
