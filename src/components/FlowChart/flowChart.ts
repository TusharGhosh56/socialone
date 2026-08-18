// FlowChart — continuously-running left-to-right flow diagram, no mouse
// interactivity, no glow, no stroke/outline (bar the AI/Impact station's
// radiating rings and Ownership's orbit track, the deliberate exceptions).
// All dots sit within the page's normal left/right margins.
//
// Architecture: every persistent element's opacity is a PURE function of
// gElapsed (elapsed ms since this playthrough started) and a fixed reveal
// threshold — `reveal(at, gElapsed, dur)`. There is exactly one formula per
// element, used every single frame with no branching between "still
// forming" and "already formed" states. This is deliberate: an earlier
// version computed a local fade-in during formation and then handed off to
// a *different* fade-in (restarting from 0) once a `formed` flag flipped —
// causing a one-frame pop-to-invisible "blink" at every station handoff.
// Don't reintroduce a second alpha code path for the same element.
//
// The traveler is stateful/transient (phase-branched on which leg it's on,
// but still a pure function of gElapsed) — both traveler functions now
// RETURN their current x (or null when not actively travelling) so frame()
// can drive the "highlight the label the dot is passing" effect off a
// single shared value instead of duplicating the phase logic.
//
// Runs on its own real-time clock, independent of the page-wide master line
// (flowLine.ts) — it only reads this section's entry/exit page-coordinates
// via getFlowWaypoints() to route its path through here.
//
// Seven stations, evenly spaced along one trunk line, each with its own
// bespoke motif and (bar Impact) its own halo colour drawn from PASTELS:
//   1. Data        — grey-turned-pastel 8-dot diamond halo fades in, each
//                     dot emits a spark that converges to assemble the gold
//                     hub dot.
//   2. Institution  — 4 dots at compass points form a static square "frame"
//                     around the hub (structure, not motion).
//   3. Workflow     — two concentric 3-dot loops, counter-rotating (an
//                     ongoing process/cycle at two scales).
//   4. Delivery     — 3 dots at one shared radius, 120° apart around the
//                     hub (an equilateral triangle whose forward point aims
//                     at Evidence, reading as a completed arrow), pulsing
//                     in a repeating beat.
//   5. Evidence     — scattered dots converge into a single ring (no inner
//                     ring).
//   6. Ownership    — a single satellite dot in a slow, wide orbit, with a
//                     visible static ring marking the orbit path itself.
//   7. Impact       — continuous radiating gold rings, the finale — no
//                     halo dots of its own, so it keeps the gold that every
//                     other station's halo has moved away from.
// Every station's hub dot gets its own icon drawn over it once loaded (see
// STATION_ICON_FILES) — the canvas keeps working with plain dots if the
// icon files don't exist yet, no error, just nothing extra drawn.
// The full sequence plays once every time the section scrolls into view —
// including re-entries after scrolling away — then every station keeps its
// own idle loop while a lightweight traveler keeps re-tracing the trunk.

const GOLD = '212, 156, 51';

const STATION_LABELS = ['Data', 'Institution', 'Workflow', 'Delivery', 'Evidence', 'Ownership', 'Impact'];
const PASTELS = ['#F5E9D1', '#E8EAF1', '#DCEDE8', '#F7DCE2', '#EAE3F5', '#FCE7CF', '#DDEAF7', '#EFE0F7'];
// One colour per station's halo/satellite dots (hub dot always stays gold).
// Impact has no halo dots — its motif is the rings alone — so it keeps
// nothing here; drawPersistent's Impact block just uses GOLD directly.
const STATION_COLORS = [PASTELS[0], PASTELS[1], PASTELS[2], PASTELS[3], PASTELS[4], PASTELS[5]];

// One shared satellite-dot size across every station's halo/motif — Data's
// grid and Institution's frame used to be a good deal smaller than this
// (and Data's touched the hub outright); standardizing avoids that.
const HALO_DOT_R = 5.4;

// Icons drawn over every hub dot once loaded — see public/icons/flow/. A
// missing file just never satisfies `img.complete && naturalWidth`, so
// nothing extra is drawn; the plain hub dot underneath is unaffected.
const ICON_BASE = '/icons/flow/';
const STATION_ICON_FILES = ['data', 'institution', 'workflow', 'delivery', 'evidence', 'ownership', 'impact'];

// How close (px, canvas-local) the traveler needs to be to a station's x
// for that station's label to highlight.
const HIGHLIGHT_THRESHOLD = 40;

// permanent structured grid around the Data hub (two 4-point diamonds) —
// widened so it clears the hub dot itself with room to spare (previously
// scaled down enough that the innermost points touched it).
const GRID_OFFSETS = [
  { x: 0, y: -46 },
  { x: -34, y: -34 },
  { x: 34, y: -34 },
  { x: 0, y: -22 },
  { x: 0, y: 22 },
  { x: -34, y: 34 },
  { x: 34, y: 34 },
  { x: 0, y: 46 },
];

// Evidence — a single ring (the old inner ring is gone), converged into
// from a scatter of the same 10 points.
const RING_OUTER_COUNT = 10;
const RING_OUTER_RADIUS = 50;
const RING_OUTER_SPEED = -0.1;
const SCATTER_OFFSETS = [
  { x: -85, y: 60 },
  { x: -100, y: -10 },
  { x: -45, y: -50 },
  { x: 50, y: -45 },
  { x: 65, y: 15 },
  { x: 20, y: 60 },
  { x: -40, y: 45 },
  { x: -60, y: -5 },
  { x: 10, y: -30 },
  { x: -5, y: 75 },
];

// Institution — 4 dots at compass points forming a static frame.
const INSTITUTION_OFFSETS = [
  { x: 0, y: -38 },
  { x: 38, y: 0 },
  { x: 0, y: 38 },
  { x: -38, y: 0 },
];

// Workflow — two concentric 3-dot loops, counter-rotating.
const WORKFLOW_DOT_COUNT = 3;
const WORKFLOW_RX = 34;
const WORKFLOW_RY = 19;
const WORKFLOW_SPEED = 0.55;
const WORKFLOW_RX2 = 58;
const WORKFLOW_RY2 = 32;
const WORKFLOW_SPEED2 = -0.35;

// Delivery — 3 dots at one shared radius, 120° apart: the tip (0°) points
// right, toward Evidence, the next station; the other two trail behind.
// Together with the hub they form a true equilateral triangle. `phase`
// staggers the pulse so the two trailing dots beat first, then the tip —
// a repeating "dispatch toward the tip" motion.
const DELIVERY_RADIUS = 30;
const DELIVERY_DOTS = [
  { angle: 0, phase: 0.35 },
  { angle: (2 * Math.PI) / 3, phase: 0 },
  { angle: (4 * Math.PI) / 3, phase: 0 },
];
const DELIVERY_PULSE_CYCLE = 1.5; // seconds per beat

// Ownership — a single satellite, further out than before, with a visible
// static ring marking the orbit path itself.
const OWNERSHIP_ORBIT_RADIUS = 42;
const OWNERSHIP_ORBIT_SPEED = 0.22;

// Global animation speed multiplier — 1 = original pace. This is a
// cumulative "30% faster again" on top of the already-1/0.7-fast pace from
// the previous pass: 1.3 / 0.7 ≈ 1.857×, i.e. every duration below is ~54%
// as long as the very first (pre-any-speedup) baseline. Applied to every
// genesis-timeline duration below AND to elapsedSec itself (see frame()).
const SPEED = 1.3 / 0.7;

// ---- one-shot formation timeline (ms) — cumulative, named durations ----
const D = {
  startDelay: 500 / SPEED,
  dataGridFade: 550 / SPEED,
  dataAssemble: 750 / SPEED,
  travel1: 850 / SPEED, // Data -> Institution
  institutionForm: 550 / SPEED,
  travel2: 850 / SPEED, // Institution -> Workflow
  workflowForm: 600 / SPEED,
  travel3: 850 / SPEED, // Workflow -> Delivery
  deliveryForm: 600 / SPEED,
  travel4: 900 / SPEED, // Delivery -> Evidence
  evidenceConverge: 900 / SPEED,
  evidenceHubPause: 350 / SPEED,
  travel5: 850 / SPEED, // Evidence -> Ownership
  ownershipForm: 550 / SPEED,
  travel6: 950 / SPEED, // Ownership -> Impact
  impactForm: 700 / SPEED,
};
const G = (() => {
  let acc = 0;
  const at = (key: keyof typeof D) => (acc += D[key]);
  return {
    startEnd: at('startDelay'),
    dataGridEnd: at('dataGridFade'),
    dataFormEnd: at('dataAssemble'),
    travel1End: at('travel1'),
    institutionFormEnd: at('institutionForm'),
    travel2End: at('travel2'),
    workflowFormEnd: at('workflowForm'),
    travel3End: at('travel3'),
    deliveryFormEnd: at('deliveryForm'),
    travel4End: at('travel4'),
    evidenceFormEnd: at('evidenceConverge'),
    evidenceHubAt: at('evidenceHubPause'),
    travel5End: at('travel5'),
    ownershipFormEnd: at('ownershipForm'),
    travel6End: at('travel6'),
    impactFormEnd: at('impactForm'),
  };
})();
const GENESIS_TOTAL = G.impactFormEnd;

// repeating traveler (after genesis) — gap-first so it doesn't feel like
// it's already mid-lap the instant the first playthrough finishes.
const TRAVEL_LOOP_MS = 7000 / SPEED;
const TRAVEL_GAP_MS = 2200 / SPEED;
const TRAVEL_CYCLE = TRAVEL_GAP_MS + TRAVEL_LOOP_MS;
const TRAVEL_LEG_COUNT = 6;

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const reveal = (at: number, gElapsed: number, dur = 450) => clamp01((gElapsed - at) / dur);

interface Layout {
  centerY: number;
  // seven evenly-spaced x's along the trunk, one per STATION_LABELS entry.
  stationX: number[];
}

export interface FlowPoint {
  x: number;
  y: number;
}

// The page-wide master line (src/scripts/flowLine.ts) reads this section's
// entry/exit page-coordinates to route its own path through here — only the
// first (Data) and last (Impact) points are actually consumed today, but
// the full station list is returned anyway so the contract stays
// self-documenting.
let _getFlowWaypoints: () => FlowPoint[] = () => [];

export function getFlowWaypoints(): FlowPoint[] {
  return _getFlowWaypoints();
}

export function initFlowChart(): void {
  const section = document.querySelector<HTMLElement>('[data-flow]');
  const canvas = document.querySelector<HTMLCanvasElement>('[data-flow-canvas]');
  const labelsRoot = document.querySelector<HTMLElement>('[data-flow-labels]');
  if (!section || !canvas || !labelsRoot) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  if (reduce || !ctx) {
    section.classList.remove('is-anim');
    return;
  }

  // Preloaded once per init; drawIcon() below just no-ops until each one
  // finishes loading (or forever, if the file doesn't exist).
  const icons: HTMLImageElement[] = STATION_ICON_FILES.map((name) => {
    const img = new Image();
    img.src = `${ICON_BASE}${name}.svg`;
    return img;
  });

  let W = 0,
    H = 0,
    dpr = 1;
  let layout: Layout = { centerY: 0, stationX: [0, 0, 0, 0, 0, 0, 0] };
  let labelEls: Record<string, HTMLElement> = {};
  let spreadScale = 1;

  let running = false;
  let raf = 0;
  let t0 = 0;
  let visibleOnce = false;
  let genesisStart: number | null = null;

  function getContentPad(): number {
    const sample = document.querySelector<HTMLElement>('.container-x');
    if (!sample) return 24;
    const parsed = parseFloat(getComputedStyle(sample).paddingLeft);
    return Number.isFinite(parsed) ? parsed : 24;
  }

  function computeLayout(w: number, h: number, pad: number): Layout {
    const centerY = h / 2;
    const left = pad;
    const right = w - pad;
    const span = Math.max(160, right - left);
    const stationX = STATION_LABELS.map((_, i) => left + (span * i) / (STATION_LABELS.length - 1));
    return { centerY, stationX };
  }

  function buildLabels() {
    labelsRoot!.innerHTML = '';
    labelEls = {};
    const make = (key: string, text: string, x: number, y: number) => {
      const el = document.createElement('span');
      el.className = 'flow__label flow__label--trunk';
      el.textContent = text;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      labelsRoot!.appendChild(el);
      labelEls[key] = el;
    };
    const trunkLabelY = layout.centerY + 64;
    STATION_LABELS.forEach((label, i) => make(keyOf(i), label, layout.stationX[i], trunkLabelY));
  }

  function keyOf(i: number): string {
    return STATION_LABELS[i].toLowerCase();
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas!.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas!.width = Math.round(W * dpr);
    canvas!.height = Math.round(H * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout = computeLayout(W, H, getContentPad());
    const gapBetweenStations = layout.stationX[1] - layout.stationX[0];
    spreadScale = Math.max(0.32, Math.min(1, gapBetweenStations / 190));
    buildLabels();
  }

  function setReveal(key: string, alpha: number) {
    const el = labelEls[key];
    if (el) el.style.setProperty('--reveal', String(alpha));
  }

  function updateHighlight(travelerX: number | null) {
    layout.stationX.forEach((x, i) => {
      const near = travelerX !== null && Math.abs(travelerX - x) < HIGHLIGHT_THRESHOLD;
      labelEls[keyOf(i)]?.classList.toggle('flow__label--active', near);
    });
  }

  // flat fill, no stroke, no glow — every dot on this canvas looks like this
  function drawDot(x: number, y: number, r: number, fill: string, alpha: number) {
    if (alpha <= 0.003) return;
    ctx!.globalAlpha = clamp01(alpha);
    ctx!.fillStyle = fill;
    ctx!.beginPath();
    ctx!.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
    ctx!.fill();
    ctx!.globalAlpha = 1;
  }

  function drawIcon(stationIndex: number, x: number, y: number, size: number, alpha: number) {
    const img = icons[stationIndex];
    if (!img || !img.complete || !img.naturalWidth || alpha <= 0.003) return;
    ctx!.globalAlpha = clamp01(alpha);
    ctx!.drawImage(img, x - size / 2, y - size / 2, size, size);
    ctx!.globalAlpha = 1;
  }

  const dotR = () => Math.max(9, Math.min(W, H) * 0.028);

  function ringPos(i: number, count: number, elapsedSec: number, radius: number, speed: number, cx: number, cy: number) {
    const rr = radius * spreadScale;
    const ang = (i / count) * Math.PI * 2 + elapsedSec * speed;
    return { x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr };
  }

  // ---- everything except the traveler: pure function of gElapsed/elapsedSec ----
  function drawPersistent(gElapsed: number, elapsedSec: number) {
    const r = dotR();
    const [dataX, institutionX, workflowX, deliveryX, evidenceX, ownershipX, impactX] = layout.stationX;
    const cy = layout.centerY;
    const s = spreadScale;
    const iconSize = (formA: number) => r * (0.5 + formA * 0.5) * 1.3;

    // Station 1 — Data: grid fades in, then a yellow hub assembles at centre
    const gridA = reveal(G.startEnd, gElapsed, D.dataGridFade);
    if (gridA > 0) {
      GRID_OFFSETS.forEach((g, i) => {
        const pulse = 0.82 + 0.18 * Math.sin(elapsedSec * 1.0 + i * 0.65);
        drawDot(dataX + g.x * s, cy + g.y * s, HALO_DOT_R * s * pulse, STATION_COLORS[0], gridA * 0.9);
      });
      const assembleT = clamp01((gElapsed - G.dataGridEnd) / D.dataAssemble);
      if (assembleT > 0 && assembleT < 1) {
        GRID_OFFSETS.forEach((g, i) => {
          const stagger = i * 0.06;
          const dt = clamp01((assembleT - stagger) / Math.max(0.001, 1 - stagger));
          if (dt <= 0) return;
          const eased = easeOutCubic(dt);
          const sx = lerp(dataX + g.x * s, dataX, eased);
          const sy = lerp(cy + g.y * s, cy, eased);
          drawDot(sx, sy, Math.max(1.6, HALO_DOT_R * s * 0.55), `rgba(${GOLD}, 1)`, gridA * (1 - eased * 0.3));
        });
      }
    }
    const dataA = reveal(G.dataGridEnd, gElapsed, D.dataAssemble);
    setReveal('data', dataA);
    if (dataA > 0) {
      const hubR = r * (0.5 + dataA * 0.5) * (1 + Math.sin(elapsedSec * 1.3) * 0.06);
      drawDot(dataX, cy, hubR, `rgba(${GOLD}, 1)`, 1);
      drawIcon(0, dataX, cy, iconSize(dataA), dataA);
    }

    // Station 2 — Institution: 4 dots at compass points, a static "frame"
    // (no rotation) with only a slow breathing pulse.
    const institutionA = reveal(G.travel1End, gElapsed, D.institutionForm);
    setReveal('institution', institutionA);
    if (institutionA > 0) {
      INSTITUTION_OFFSETS.forEach((o, i) => {
        const pulse = 0.85 + 0.15 * Math.sin(elapsedSec * 0.8 + i * 1.1);
        drawDot(institutionX + o.x * s, cy + o.y * s, HALO_DOT_R * s * pulse, STATION_COLORS[1], institutionA * 0.85);
      });
      const hubR = r * (0.5 + institutionA * 0.5) * 0.85 * (1 + Math.sin(elapsedSec * 1.1) * 0.05);
      drawDot(institutionX, cy, hubR, `rgba(${GOLD}, 1)`, 1);
      drawIcon(1, institutionX, cy, iconSize(institutionA), institutionA);
    }

    // Station 3 — Workflow: two concentric 3-dot loops, counter-rotating —
    // an ongoing process/cycle at two scales, runs indefinitely once formed.
    const workflowA = reveal(G.travel2End, gElapsed, D.workflowForm);
    setReveal('workflow', workflowA);
    if (workflowA > 0) {
      for (let i = 0; i < WORKFLOW_DOT_COUNT; i++) {
        const ang1 = (i / WORKFLOW_DOT_COUNT) * Math.PI * 2 + elapsedSec * WORKFLOW_SPEED;
        drawDot(
          workflowX + Math.cos(ang1) * WORKFLOW_RX * s,
          cy + Math.sin(ang1) * WORKFLOW_RY * s,
          HALO_DOT_R * s,
          STATION_COLORS[2],
          workflowA * 0.85,
        );
        const ang2 = (i / WORKFLOW_DOT_COUNT) * Math.PI * 2 + elapsedSec * WORKFLOW_SPEED2;
        drawDot(
          workflowX + Math.cos(ang2) * WORKFLOW_RX2 * s,
          cy + Math.sin(ang2) * WORKFLOW_RY2 * s,
          HALO_DOT_R * s,
          STATION_COLORS[2],
          workflowA * 0.7,
        );
      }
      const hubR = r * (0.5 + workflowA * 0.5) * 0.85 * (1 + Math.sin(elapsedSec * 1.2) * 0.05);
      drawDot(workflowX, cy, hubR, `rgba(${GOLD}, 1)`, 1);
      drawIcon(2, workflowX, cy, iconSize(workflowA), workflowA);
    }

    // Station 4 — Delivery: 3 dots 120° apart around the hub (an
    // equilateral triangle whose forward point aims at Evidence), pulsing
    // in a repeating beat — the two trailing dots first, then the tip.
    const deliveryA = reveal(G.travel3End, gElapsed, D.deliveryForm);
    setReveal('delivery', deliveryA);
    if (deliveryA > 0) {
      DELIVERY_DOTS.forEach((d) => {
        const ph = (((elapsedSec / DELIVERY_PULSE_CYCLE + d.phase) % 1) + 1) % 1;
        const pulse = Math.max(0, 1 - ph * 2.2);
        const x = deliveryX + Math.cos(d.angle) * DELIVERY_RADIUS * s;
        const y = cy + Math.sin(d.angle) * DELIVERY_RADIUS * s;
        drawDot(x, y, HALO_DOT_R * s, STATION_COLORS[3], deliveryA * (0.3 + pulse * 0.7));
      });
      const hubR = r * (0.5 + deliveryA * 0.5) * 0.85 * (1 + Math.sin(elapsedSec * 1.3) * 0.05);
      drawDot(deliveryX, cy, hubR, `rgba(${GOLD}, 1)`, 1);
      drawIcon(3, deliveryX, cy, iconSize(deliveryA), deliveryA);
    }

    // Station 5 — Evidence: scatter fades in, then converges into a single
    // ring (colour: this station's own assigned pastel, not a per-dot mix).
    const scatterA = reveal(G.deliveryFormEnd, gElapsed, 700);
    if (scatterA > 0) {
      const convergeT = clamp01((gElapsed - G.travel4End) / D.evidenceConverge);
      SCATTER_OFFSETS.forEach((sc, i) => {
        const stagger = i * 0.04;
        const dt = clamp01((convergeT - stagger) / Math.max(0.001, 1 - stagger));
        const eased = easeOutCubic(dt);
        const target = ringPos(i, RING_OUTER_COUNT, elapsedSec, RING_OUTER_RADIUS, RING_OUTER_SPEED, evidenceX, cy);
        const x = lerp(evidenceX + sc.x * s, target.x, eased);
        const y = lerp(cy + sc.y * s, target.y, eased);
        drawDot(x, y, HALO_DOT_R * s, STATION_COLORS[4], scatterA);
      });
    }
    const evidenceA = reveal(G.evidenceFormEnd, gElapsed, D.evidenceHubPause);
    setReveal('evidence', evidenceA);
    if (evidenceA > 0) {
      const hubR = r * (0.5 + evidenceA * 0.5) * 0.85;
      drawDot(evidenceX, cy, hubR, `rgba(${GOLD}, 1)`, 1);
      drawIcon(4, evidenceX, cy, iconSize(evidenceA), evidenceA);
    }

    // Station 6 — Ownership: a single satellite in a slow, wide orbit, with
    // a visible static ring marking the orbit path itself.
    const ownershipA = reveal(G.travel5End, gElapsed, D.ownershipForm);
    setReveal('ownership', ownershipA);
    if (ownershipA > 0) {
      const orbitR = OWNERSHIP_ORBIT_RADIUS * s;
      ctx!.strokeStyle = STATION_COLORS[5];
      ctx!.globalAlpha = clamp01(ownershipA * 0.35);
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.arc(ownershipX, cy, orbitR, 0, Math.PI * 2);
      ctx!.stroke();
      ctx!.globalAlpha = 1;

      const ang = elapsedSec * OWNERSHIP_ORBIT_SPEED;
      drawDot(ownershipX + Math.cos(ang) * orbitR, cy + Math.sin(ang) * orbitR, HALO_DOT_R * s, STATION_COLORS[5], ownershipA * 0.85);
      const hubR = r * (0.5 + ownershipA * 0.5) * 0.85 * (1 + Math.sin(elapsedSec * 1.0) * 0.05);
      drawDot(ownershipX, cy, hubR, `rgba(${GOLD}, 1)`, 1);
      drawIcon(5, ownershipX, cy, iconSize(ownershipA), ownershipA);
    }

    // Station 7 — Impact: continuous radiating rings, the finale — no halo
    // dots of its own, so it's the one station that stays plain gold.
    const impactA = reveal(G.travel6End, gElapsed, D.impactForm);
    setReveal('impact', impactA);
    if (impactA > 0) {
      for (let k = 0; k < 3; k++) {
        const ph = (elapsedSec / 2.6 + k / 3) % 1;
        const rr = ph * r * 6.2;
        const ringAlpha = (1 - ph) * 0.6 * impactA;
        if (ringAlpha > 0.01) {
          ctx!.strokeStyle = `rgba(${GOLD}, ${ringAlpha})`;
          ctx!.lineWidth = 2;
          ctx!.beginPath();
          ctx!.arc(impactX, cy, rr, 0, Math.PI * 2);
          ctx!.stroke();
        }
      }
      const hubR = r * (0.5 + impactA * 0.5);
      drawDot(impactX, cy, hubR, `rgba(${GOLD}, 1)`, 1);
      drawIcon(6, impactX, cy, iconSize(impactA), impactA);
    }
  }

  // ---- the traveler: the one transient, phase-branched moving element ----
  // Returns its current x (canvas-local) so frame() can highlight whichever
  // label it's passing, or null when it isn't actively travelling.
  function drawGenesisTraveler(gElapsed: number, elapsedSec: number): number | null {
    const r = dotR();
    const [dataX, institutionX, workflowX, deliveryX, evidenceX, ownershipX, impactX] = layout.stationX;
    const cy = layout.centerY;

    if (gElapsed >= G.dataFormEnd && gElapsed < G.travel1End) {
      const localT = easeInOutCubic(clamp01((gElapsed - G.dataFormEnd) / D.travel1));
      const x = lerp(dataX, institutionX, localT);
      drawDot(x, cy, r * 0.75, `rgba(${GOLD}, 1)`, 1);
      return x;
    }
    if (gElapsed >= G.institutionFormEnd && gElapsed < G.travel2End) {
      const localT = easeInOutCubic(clamp01((gElapsed - G.institutionFormEnd) / D.travel2));
      const x = lerp(institutionX, workflowX, localT);
      drawDot(x, cy, r * 0.75, `rgba(${GOLD}, 1)`, 1);
      return x;
    }
    if (gElapsed >= G.workflowFormEnd && gElapsed < G.travel3End) {
      const localT = easeInOutCubic(clamp01((gElapsed - G.workflowFormEnd) / D.travel3));
      const x = lerp(workflowX, deliveryX, localT);
      drawDot(x, cy, r * 0.75, `rgba(${GOLD}, 1)`, 1);
      return x;
    }
    if (gElapsed >= G.deliveryFormEnd && gElapsed < G.travel4End) {
      const localT = easeInOutCubic(clamp01((gElapsed - G.deliveryFormEnd) / D.travel4));
      const x = lerp(deliveryX, evidenceX, localT);
      drawDot(x, cy, r * 0.75, `rgba(${GOLD}, 1)`, 1);
      return x;
    }
    if (gElapsed >= G.evidenceHubAt && gElapsed < G.travel5End) {
      const localT = easeInOutCubic(clamp01((gElapsed - G.evidenceHubAt) / D.travel5));
      const x = lerp(evidenceX, ownershipX, localT);
      drawDot(x, cy, r * 0.75, `rgba(${GOLD}, 1)`, 1);
      return x;
    }
    if (gElapsed >= G.ownershipFormEnd && gElapsed < G.travel6End) {
      // The one "special" leg — a faint double-ring trail builds
      // anticipation into the Impact finale.
      const localT = easeInOutCubic(clamp01((gElapsed - G.ownershipFormEnd) / D.travel6));
      const x = lerp(ownershipX, impactX, localT);
      for (let k = 0; k < 2; k++) {
        const ph = (elapsedSec * 0.9 + k * 0.5) % 1;
        const rr = ph * r * 3;
        const a = (1 - ph) * 0.45;
        ctx!.strokeStyle = `rgba(${GOLD}, ${a})`;
        ctx!.lineWidth = 1.5;
        ctx!.beginPath();
        ctx!.arc(x, cy, rr, 0, Math.PI * 2);
        ctx!.stroke();
      }
      drawDot(x, cy, r * 0.75, `rgba(${GOLD}, 1)`, 1);
      return x;
    }
    return null;
  }

  // ---- repeating traveler: re-traces the trunk once idle ----
  function drawRepeatingTraveler(postElapsed: number): number | null {
    const r = dotR();
    const cyclePos = postElapsed % TRAVEL_CYCLE;
    if (cyclePos < TRAVEL_GAP_MS) return null; // gap-first
    const t = (cyclePos - TRAVEL_GAP_MS) / TRAVEL_LOOP_MS;
    if (t >= 1) return null;

    const legFloat = clamp01(t) * TRAVEL_LEG_COUNT;
    const legIndex = Math.min(TRAVEL_LEG_COUNT - 1, Math.floor(legFloat));
    const localT = easeInOutCubic(legFloat - legIndex);
    const x = lerp(layout.stationX[legIndex], layout.stationX[legIndex + 1], localT);
    drawDot(x, layout.centerY, r * 0.7, `rgba(${GOLD}, 1)`, 1);
    return x;
  }

  function frame(t: number) {
    if (!t0) t0 = t;
    const elapsedMs = t - t0;
    const elapsedSec = (elapsedMs / 1000) * SPEED;

    ctx!.clearRect(0, 0, W, H);

    let travelerX: number | null = null;
    if (visibleOnce) {
      if (genesisStart === null) genesisStart = elapsedMs;
      const gElapsed = elapsedMs - genesisStart;
      drawPersistent(gElapsed, elapsedSec);
      travelerX = gElapsed < GENESIS_TOTAL ? drawGenesisTraveler(gElapsed, elapsedSec) : drawRepeatingTraveler(gElapsed - GENESIS_TOTAL);
    }
    updateHighlight(travelerX);

    if (running) raf = requestAnimationFrame(frame);
  }

  const start = () => {
    if (running) return;
    running = true;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          visibleOnce = true;
          genesisStart = null; // restart the whole sequence every time it re-enters
          start();
        } else {
          stop();
        }
      }
    },
    { threshold: 0.1 },
  );
  io.observe(section);
  document.addEventListener('visibilitychange', () =>
    document.hidden ? stop() : io.takeRecords().length === 0 && start(),
  );

  window.addEventListener('resize', resize, { passive: true });
  resize();
  start();

  // The page-wide master line (flowLine.ts) reads this section's real
  // per-station page-coordinates once (on measure/resize) to route its own
  // path through here — it does not drive this section's animation.
  _getFlowWaypoints = () => {
    const rect = canvas!.getBoundingClientRect();
    const pageY = rect.top + window.scrollY + layout.centerY;
    const toPage = (x: number) => ({ x: rect.left + window.scrollX + x, y: pageY });
    return layout.stationX.map(toPage);
  };

  (window as unknown as { __flow?: unknown }).__flow = { start, stop };
}
