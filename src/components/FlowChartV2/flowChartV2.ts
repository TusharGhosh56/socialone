// FlowChartV2 — trimmed duplicate of the original FlowChart (see the
// archived version at src/components/FlowChart/, commented out in
// index.astro rather than deleted). Same architecture end to end (pure-
// function-of-gElapsed persistent elements, phase-branched traveler, restart-
// on-every-reentry IntersectionObserver, SPEED multiplier) — only the station
// roster, sizing, and copy changed. See flowChart.ts's own header comment for
// the full architecture rationale; not repeated here.
//
// Four stations now (down from seven) — Institution, Delivery, and Ownership
// were dropped per product decision. Ownership's own motif (a single
// satellite dot in a slow wide orbit, with a static ring marking the orbit
// path) wasn't fully discarded — its orbiting dot was folded into Impact's
// finale alongside the radiating rings, though the static orbit-path ring
// itself was later dropped too (see Station 4 below):
//   1. Data      — grey-turned-pastel 8-dot diamond halo fades in, each dot
//                   emits a spark that converges to assemble the gold hub.
//                   Displayed title/subtitle: "Foundation" / "Trusted data
//                   systems".
//   2. Workflow  — two concentric 3-dot loops, counter-rotating. Displayed
//                   as "Field Intelligence" / "Ground reality".
//   3. Evidence  — scattered dots converge into a single ring. Displayed as
//                   "Decision Intelligence" / "AI inside government
//                   workflows".
//   4. Impact    — continuous radiating gold rings (the "ripple", the
//                   finale) PLUS Ownership's old satellite dot (its own
//                   static orbit ring removed). Displayed as "Institutional
//                   Capability" / "Government owns and improves the system".
// The internal station identity keys (STATION_LABELS, used by every
// gElapsed/reveal/keyOf lookup) are unrelated to this displayed copy
// (STATION_TEXT) — renaming the on-screen title/subtitle never touches the
// animation-timeline plumbing.
//
// Station titles+subtitles render ABOVE the trunk now (were below, single-
// line), with more clearance from the animation than the original ever had
// (LABEL_GAP below) — and the four stations sit closer together than the
// original's full-width spread (STATION_SPAN_SCALE below), both per
// explicit product decision. Subtitles are also hover-gated (per a later,
// separate request): hidden by default, fading+sliding in only once the
// pointer sits within hoverRadius() of that station's own canvas point —
// see updateStationHover() and the CSS's .flow2__label--hovered rule.
// Titles are unaffected; they still just follow the label block's own
// --reveal fade-in.
//
// Stations are drawn ~1.3x larger than the original (SCALE below) — offsets/
// radii scale with it too, not just the dot radius, so bigger dots don't
// collide with the hub or each other (a real bug the original hit once at
// its own larger scale — see that file's own comment on this).
//
// Below MOBILE_BREAKPOINT the trunk runs vertically down the canvas centre
// instead of horizontally, stations stacked top to bottom with labels above
// each one — the horizontal layout left too little room per station on a
// phone-width screen for titles like "Institutional Capability". Every draw
// function reads a per-station (x,y) point (Layout.stationPts) rather than
// a shared centerY plus per-station x, so the same code draws either mode;
// only computeLayout()/buildLabels()/resize() branch on layout.mobile. The
// mobile stage's height is content-driven (JS-set on .flow2__stage, see
// resize()) rather than the desktop 100vh treatment, since 4 stacked
// stations with real label text need more room than one mobile viewport.

const GOLD = '212, 156, 51';

// Internal station identity keys — unrelated to the DISPLAYED copy (see
// STATION_TEXT below). Kept as the original short names since every
// gElapsed/reveal/highlight lookup (setReveal('data', ...), keyOf(), etc.)
// is keyed off these — renaming the on-screen text shouldn't have to touch
// any of that animation-timeline plumbing.
const STATION_LABELS = ['Data', 'Workflow', 'Evidence', 'Impact'];
// Title + subtitle actually rendered above each station (per explicit product
// copy) — parallel array, same order/length as STATION_LABELS.
const STATION_TEXT: { title: string; subtitle: string }[] = [
  { title: 'Foundation', subtitle: 'Trusted data systems' },
  { title: 'Field Intelligence', subtitle: 'Ground reality' },
  { title: 'Decision Intelligence', subtitle: 'AI inside government workflows' },
  { title: 'Institutional Capability', subtitle: 'Government owns and improves the system' },
];
const PASTELS = ['#F5E9D1', '#E8EAF1', '#DCEDE8', '#F7DCE2', '#EAE3F5', '#FCE7CF', '#DDEAF7', '#EFE0F7'];
// Same pastel-per-identity mapping the original used (Data/Workflow/Evidence/
// Ownership kept their own original indices) so the surviving stations —
// and the folded-in Ownership satellite — look the same colour as before.
const STATION_COLORS = [PASTELS[0], PASTELS[2], PASTELS[4]]; // Data, Workflow, Evidence
const IMPACT_SATELLITE_COLOR = PASTELS[5]; // was Ownership's own colour

// Bigger stations: one multiplier applied to every dot radius AND every
// offset/orbit radius below, so scaling up doesn't just make dots bigger in
// place — it also pushes them further from the hub, same "measure twice"
// lesson the original's own halo-collision bug taught.
const SCALE = 1.3;
const scalePts = (pts: { x: number; y: number }[]) => pts.map((p) => ({ x: p.x * SCALE, y: p.y * SCALE }));

const HALO_DOT_R = 5.4 * SCALE;

// The traveling dot itself (both the one-shot genesis traveler and the
// repeating idle-loop one) — decreased per explicit product decision, so it
// reads as a distinctly smaller "signal" than the stations it passes
// through rather than a near-hub-sized dot. Independent of SCALE above
// (that governs station size, not the traveler).
const TRAVELER_R_SCALE = 0.45;

const ICON_BASE = '/icons/flow/';
const STATION_ICON_FILES = ['data', 'workflow', 'evidence', 'impact'];

const HIGHLIGHT_THRESHOLD = 40;

// Stations sit closer together than the original's full-width spread (per
// explicit product decision) — shrinks the span computeLayout() distributes
// them across, centered in the same available width rather than left-
// anchored, so the tighter cluster still reads as centred on the canvas.
const STATION_SPAN_SCALE = 0.7;

// Title+subtitle now render ABOVE the trunk (was below) with more clearance
// than the original's single-line label ever needed — this is the distance
// from the trunk's centerY up to the BOTTOM of the two-line text block.
const LABEL_GAP = 112;

// Mobile layout (below this, the trunk runs vertically down the canvas
// centre instead of horizontally) — same 640px cut line StepCarousel's own
// mobile accordion and timelineTraveler.ts's SM_BREAKPOINT already use for
// "narrow phone layout" elsewhere in this codebase.
const MOBILE_BREAKPOINT = 640;
// Vertical distance from the canvas top to the FIRST station's centre —
// sized to clear that station's own label block (rendered ABOVE it, see
// MOBILE_LABEL_GAP) without clipping against the stage's own top edge.
const MOBILE_TOP_MARGIN = 140;
// Vertical distance between successive station centres. Must clear (a) the
// previous station's own largest motif reach — Impact's ripple is the
// biggest at r*6.2 (~85px at this scale) — and (b) the current station's
// own label block sitting above it — comfortably true at this value with
// real headroom to spare, confirmed by measuring rendered labels never
// overlapping a neighbour's motif once built.
const MOBILE_STATION_GAP = 230;
// Impact's ripple (the largest motif reach anywhere, r*6.2 ≈ 85px at this
// scale) is the last thing drawn, so the bottom margin has to clear IT
// specifically, not the ~65px typical station reach the station gap itself
// is sized around.
const MOBILE_BOTTOM_MARGIN = 100;
// Shorter than the desktop LABEL_GAP (112) — the desktop value has to clear
// a horizontal row shared across 4 stations; here each label sits alone
// directly above its own dot, so it only needs to clear that one station's
// own motif, not the whole row's tallest. Bumped 48 -> 64 -> 80 across two
// rounds of explicit product decisions (more breathing room between the
// title/subtitle block and its own dot) — the label block itself also got
// noticeably SHORTER in the same round this went to 80 (title+subtitle
// forced to one line each in flowChartV2.css, no more wrap-reservation
// slack), so there was extra headroom to spend here without crowding the
// previous station's own motif.
const MOBILE_LABEL_GAP = 80;

// Data — permanent structured grid around the hub (two 4-point diamonds).
const GRID_OFFSETS = scalePts([
  { x: 0, y: -46 },
  { x: -34, y: -34 },
  { x: 34, y: -34 },
  { x: 0, y: -22 },
  { x: 0, y: 22 },
  { x: -34, y: 34 },
  { x: 34, y: 34 },
  { x: 0, y: 46 },
]);

// Evidence — a single ring, converged into from a scatter of the same points.
const RING_OUTER_COUNT = 10;
const RING_OUTER_RADIUS = 50 * SCALE;
const RING_OUTER_SPEED = -0.1;
const SCATTER_OFFSETS = scalePts([
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
]);

// Workflow — two concentric 3-dot loops, counter-rotating.
const WORKFLOW_DOT_COUNT = 3;
const WORKFLOW_RX = 34 * SCALE;
const WORKFLOW_RY = 19 * SCALE;
const WORKFLOW_SPEED = 0.55;
const WORKFLOW_RX2 = 58 * SCALE;
const WORKFLOW_RY2 = 32 * SCALE;
const WORKFLOW_SPEED2 = -0.35;

// Impact's folded-in satellite — was Ownership's own orbit; radius/speed
// carried over unchanged bar the SCALE bump.
const IMPACT_SATELLITE_ORBIT_RADIUS = 42 * SCALE;
const IMPACT_SATELLITE_ORBIT_SPEED = 0.22;

// Global animation speed multiplier — see flowChart.ts's own comment; carried
// over unchanged so this duplicate paces identically to the original.
const SPEED = 1.3 / 0.7;

// ---- one-shot formation timeline (ms) — cumulative, named durations ----
const D = {
  startDelay: 500 / SPEED,
  dataGridFade: 550 / SPEED,
  dataAssemble: 750 / SPEED,
  travel1: 850 / SPEED, // Data -> Workflow
  workflowForm: 600 / SPEED,
  travel2: 850 / SPEED, // Workflow -> Evidence
  evidenceConverge: 900 / SPEED,
  evidenceHubPause: 350 / SPEED,
  travel3: 950 / SPEED, // Evidence -> Impact (the anticipation leg)
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
    workflowFormEnd: at('workflowForm'),
    travel2End: at('travel2'),
    evidenceFormEnd: at('evidenceConverge'),
    evidenceHubAt: at('evidenceHubPause'),
    travel3End: at('travel3'),
    impactFormEnd: at('impactForm'),
  };
})();
const GENESIS_TOTAL = G.impactFormEnd;

// repeating traveler (after genesis) — gap-first, same convention as the original.
const TRAVEL_LOOP_MS = 7000 / SPEED;
const TRAVEL_GAP_MS = 2200 / SPEED;
const TRAVEL_CYCLE = TRAVEL_GAP_MS + TRAVEL_LOOP_MS;
const TRAVEL_LEG_COUNT = 3;

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const reveal = (at: number, gElapsed: number, dur = 450) => clamp01((gElapsed - at) / dur);

// Generalized so desktop (horizontal trunk, shared y) and mobile (vertical
// trunk, shared x) can share every draw function below — each just reads
// its own station's real (x,y) point instead of a shared centerY plus a
// per-station x. `mobile` flags which mode buildLabels()/resize() should
// use; `stageHeight` is only set in mobile mode, where the stage's height
// is content-driven (JS-set) rather than the CSS flex:1/min-height:100vh
// desktop treatment.
interface Layout {
  stationPts: FlowPoint[];
  mobile: boolean;
  stageHeight?: number;
}

export interface FlowPoint {
  x: number;
  y: number;
}

// The page-wide master line (src/scripts/flowLine.ts) reads this section's
// entry/exit page-coordinates to route its own path through here — see
// flowChart.ts's own comment; unchanged contract, new module.
let _getFlowWaypoints: () => FlowPoint[] = () => [];

export function getFlowWaypoints(): FlowPoint[] {
  const livePts = _getFlowWaypoints();
  if (livePts && livePts.length > 0) return livePts;

  // Instant synchronous DOM fallback so flowLine has immediate valid coordinates
  // even on the very first frame before animation loops initialize:
  if (typeof document !== 'undefined') {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-flow2-canvas]');
    const section = document.querySelector<HTMLElement>('[data-flow2]');
    if (canvas && section) {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || window.innerWidth || 1200;
      const h = rect.height || (rect.bottom - rect.top) || 600;
      const pad = 24;

      if (w < MOBILE_BREAKPOINT) {
        const trunkX = rect.left + window.scrollX + w / 2;
        return [0, 1, 2, 3].map((i) => ({
          x: trunkX,
          y: rect.top + window.scrollY + MOBILE_TOP_MARGIN + MOBILE_STATION_GAP * i,
        }));
      }

      const centerY = rect.top + window.scrollY + h / 2;
      const left = pad;
      const right = w - pad;
      const fullSpan = Math.max(160, right - left);
      const span = fullSpan * STATION_SPAN_SCALE;
      const spanLeft = left + (fullSpan - span) / 2;
      const stationX = [0, 1, 2, 3].map((i) => rect.left + window.scrollX + spanLeft + (span * i) / 3);
      return stationX.map((x) => ({ x, y: centerY }));
    }
  }

  return [];
}

export function initFlowChart(): void {
  const section = document.querySelector<HTMLElement>('[data-flow2]');
  const canvas = document.querySelector<HTMLCanvasElement>('[data-flow2-canvas]');
  const labelsRoot = document.querySelector<HTMLElement>('[data-flow2-labels]');
  const stageEl = document.querySelector<HTMLElement>('[data-flow2-stage]');
  if (!section || !canvas || !labelsRoot || !stageEl) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  if (reduce || !ctx) {
    section.classList.remove('is-anim');
    return;
  }

  const icons: HTMLImageElement[] = STATION_ICON_FILES.map((name) => {
    const img = new Image();
    img.src = `${ICON_BASE}${name}.svg`;
    return img;
  });

  let W = 0,
    H = 0,
    dpr = 1;
  let layout: Layout = { stationPts: [], mobile: false };
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

  // Shared by resize() (which needs the total height BEFORE the canvas rect
  // it measures everything else from) and computeLayout() (which needs the
  // same per-station Y values) — kept as one function so the two can never
  // drift apart.
  function mobileStationY(): number[] {
    return STATION_LABELS.map((_, i) => MOBILE_TOP_MARGIN + MOBILE_STATION_GAP * i);
  }

  function computeLayout(w: number, h: number, pad: number): Layout {
    if (w < MOBILE_BREAKPOINT) {
      // Vertical trunk down the canvas centre — stations stacked top to
      // bottom instead of left to right, per explicit product decision
      // (the horizontal layout left ~78px between stations on a 375px
      // screen, nowhere near enough for titles like "Institutional
      // Capability"). stageHeight is real content height, not a viewport
      // fraction — resize() applies it to .flow2__stage directly so the
      // section grows taller than 100vh rather than cramming 4 stations
      // into one screen's worth of height.
      const trunkX = w / 2;
      const stationY = mobileStationY();
      const stageHeight = stationY[stationY.length - 1] + MOBILE_BOTTOM_MARGIN;
      return { stationPts: stationY.map((y) => ({ x: trunkX, y })), mobile: true, stageHeight };
    }
    const centerY = h / 2;
    const left = pad;
    const right = w - pad;
    const fullSpan = Math.max(160, right - left);
    const span = fullSpan * STATION_SPAN_SCALE;
    const spanLeft = left + (fullSpan - span) / 2; // centre the tightened cluster
    const stationX = STATION_LABELS.map((_, i) => spanLeft + (span * i) / (STATION_LABELS.length - 1));
    return { stationPts: stationX.map((x) => ({ x, y: centerY })), mobile: false };
  }

  function buildLabels() {
    labelsRoot!.innerHTML = '';
    labelEls = {};
    const make = (key: string, title: string, subtitle: string, x: number) => {
      const el = document.createElement('div');
      el.className = 'flow2__label flow2__label--trunk';
      el.style.left = `${x}px`;
      const titleEl = document.createElement('span');
      titleEl.className = 'flow2__label-title';
      titleEl.textContent = title;
      const subtitleEl = document.createElement('span');
      subtitleEl.className = 'flow2__label-subtitle';
      subtitleEl.textContent = subtitle;
      el.appendChild(titleEl);
      el.appendChild(subtitleEl);
      labelsRoot!.appendChild(el);
      labelEls[key] = el;
    };
    STATION_TEXT.forEach((t, i) => make(keyOf(i), t.title, t.subtitle, layout.stationPts[i].x));

    if (layout.mobile) {
      // Each label sits directly above its OWN dot — no shared row to
      // align across (unlike desktop's horizontal trunk), so every block
      // just measures its own height and sits MOBILE_LABEL_GAP above its
      // own station's y.
      STATION_TEXT.forEach((_, i) => {
        const el = labelEls[keyOf(i)];
        const h = el.getBoundingClientRect().height;
        el.style.top = `${layout.stationPts[i].y - MOBILE_LABEL_GAP - h}px`;
      });
      return;
    }

    // Titles (and, as a direct consequence, subtitles) align across all 4
    // stations on the same line — per explicit product decision — rather
    // than each block independently bottom-anchored to the trunk, which let
    // a short 1-line title ("Foundation") sit lower than a 2-line one
    // ("Institutional Capability") since both were anchored by their own
    // BOTTOM edge at the same Y. .flow2__label-title's own `min-height`
    // (flowChartV2.css) reserves room for 2 lines regardless of actual line
    // count, so a 1-line title's visible text still starts at the same Y as
    // a 2-line one's — that's what makes the subtitles land in a shared row
    // too, without needing any subtitle-specific alignment logic.
    // maxBlockHeight is a real measured DOM height (not a guessed
    // constant) — same "measure, don't reconstruct" discipline as
    // getContentPad()/positionFoundationRings() elsewhere in this project —
    // so the fixed top Y still guarantees LABEL_GAP of clearance from the
    // trunk even for whichever station's block renders tallest.
    const maxBlockHeight = Math.max(...Object.values(labelEls).map((el) => el.getBoundingClientRect().height));
    const topY = layout.stationPts[0].y - LABEL_GAP - maxBlockHeight;
    Object.values(labelEls).forEach((el) => {
      el.style.top = `${topY}px`;
    });
  }

  function keyOf(i: number): string {
    return STATION_LABELS[i].toLowerCase();
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pad = getContentPad();
    // Two-pass measure: mobile mode needs to SET the stage's height (it's
    // content-driven there, not the desktop flex:1/min-height:100vh
    // treatment) before the "real" rect used for the canvas buffer and
    // layout math is read back — otherwise this would measure the stage's
    // stale pre-resize height on every mode change.
    const probeRect = canvas!.getBoundingClientRect();
    if (probeRect.width < MOBILE_BREAKPOINT) {
      const stationY = mobileStationY();
      stageEl!.style.height = `${stationY[stationY.length - 1] + MOBILE_BOTTOM_MARGIN}px`;
    } else {
      stageEl!.style.height = '';
    }
    const rect = canvas!.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas!.width = Math.round(W * dpr);
    canvas!.height = Math.round(H * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout = computeLayout(W, H, pad);
    const gapBetweenStations = Math.hypot(
      layout.stationPts[1].x - layout.stationPts[0].x,
      layout.stationPts[1].y - layout.stationPts[0].y,
    );
    spreadScale = Math.max(0.32, Math.min(1, gapBetweenStations / 190));
    buildLabels();
  }

  function setReveal(key: string, alpha: number) {
    const el = labelEls[key];
    if (el) el.style.setProperty('--reveal', String(alpha));
  }

  function updateHighlight(travelerPt: FlowPoint | null) {
    layout.stationPts.forEach((p, i) => {
      const near = travelerPt !== null && Math.hypot(travelerPt.x - p.x, travelerPt.y - p.y) < HIGHLIGHT_THRESHOLD;
      labelEls[keyOf(i)]?.classList.toggle('flow2__label--active', near);
    });
  }

  // Subtitle fade+slide-in on hover (per explicit product decision) — the
  // station itself is canvas-drawn, not a real per-station DOM element, so
  // "hovering the station" is two separate hit-tests, either one counts:
  // (a) the pointer sitting within a radius of the station's own (x,y)
  // point on the canvas, same proximity-check shape as updateHighlight()
  // above (which does the same thing for the traveling dot's active-label
  // state, just against live pointer coordinates instead of the traveler's
  // current x) — scales with dotR() so bigger stations (SCALE) get a
  // proportionally bigger hover zone matching their visual footprint; or
  // (b) the pointer sitting directly over the label block itself (title
  // and/or the subtitle's own reserved space) — added per explicit follow-
  // up request, since the label sits LABEL_GAP above the dot and a hover
  // there is otherwise nowhere near dot-radius range. .flow2__labels has
  // pointer-events:none (so the canvas below still receives the move
  // events, which is what this whole hover mechanism relies on), so this
  // just needs a plain client-rect containment check against the label
  // element itself, no coordinate-space conversion — getBoundingClientRect
  // and PointerEvent.clientX/Y are already in the same (viewport) space.
  function hoverRadius(): number {
    return Math.max(40, dotR() * 1.8);
  }
  function updateStationHover(x: number | null, y: number | null, clientX: number | null, clientY: number | null) {
    layout.stationPts.forEach((p, i) => {
      const el = labelEls[keyOf(i)];
      if (!el) return;
      const overDot = x !== null && y !== null && Math.hypot(x - p.x, y - p.y) < hoverRadius();
      let overLabel = false;
      if (clientX !== null && clientY !== null) {
        const r = el.getBoundingClientRect();
        overLabel = clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
      }
      el.classList.toggle('flow2__label--hovered', overDot || overLabel);
    });
  }

  // Same dual hit-test as updateStationHover() above (dot proximity OR
  // label-rect containment), just returning WHICH station index was hit
  // (or null) instead of setting classes directly — used by the tap-to-
  // toggle mechanism below for touch/coarse-pointer devices, which have no
  // real hover to drive updateStationHover()'s continuous pointermove
  // version.
  function stationHitIndex(clientX: number, clientY: number): number | null {
    const rect = canvas!.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    for (let i = 0; i < layout.stationPts.length; i++) {
      const p = layout.stationPts[i];
      const el = labelEls[keyOf(i)];
      const overDot = Math.hypot(x - p.x, y - p.y) < hoverRadius();
      const overLabel = !!el && (() => {
        const r = el.getBoundingClientRect();
        return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
      })();
      if (overDot || overLabel) return i;
    }
    return null;
  }

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

  // Ceiling added on top of the original's floor-only clamp: full-height
  // removed the old clamp(300px,40vh,460px) cap on the stage, so on a very
  // tall/narrow viewport min(W,H) can now grow much larger than the original
  // ever saw — without a ceiling the hub could balloon absurdly on those.
  const dotR = () => Math.max(9 * SCALE, Math.min(56, Math.min(W, H) * 0.028 * SCALE));

  function ringPos(i: number, count: number, elapsedSec: number, radius: number, speed: number, cx: number, cy: number) {
    const rr = radius * spreadScale;
    const ang = (i / count) * Math.PI * 2 + elapsedSec * speed;
    return { x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr };
  }

  // ---- everything except the traveler: pure function of gElapsed/elapsedSec ----
  function drawPersistent(gElapsed: number, elapsedSec: number) {
    const r = dotR();
    const [dataP, workflowP, evidenceP, impactP] = layout.stationPts;
    const s = spreadScale;
    const iconSize = (formA: number) => r * (0.5 + formA * 0.5) * 1.3;

    // Station 1 — Data: grid fades in, then a yellow hub assembles at centre.
    const gridA = reveal(G.startEnd, gElapsed, D.dataGridFade);
    if (gridA > 0) {
      GRID_OFFSETS.forEach((g, i) => {
        const pulse = 0.82 + 0.18 * Math.sin(elapsedSec * 1.0 + i * 0.65);
        drawDot(dataP.x + g.x * s, dataP.y + g.y * s, HALO_DOT_R * s * pulse, STATION_COLORS[0], gridA * 0.9);
      });
      const assembleT = clamp01((gElapsed - G.dataGridEnd) / D.dataAssemble);
      if (assembleT > 0 && assembleT < 1) {
        GRID_OFFSETS.forEach((g, i) => {
          const stagger = i * 0.06;
          const dt = clamp01((assembleT - stagger) / Math.max(0.001, 1 - stagger));
          if (dt <= 0) return;
          const eased = easeOutCubic(dt);
          const sx = lerp(dataP.x + g.x * s, dataP.x, eased);
          const sy = lerp(dataP.y + g.y * s, dataP.y, eased);
          drawDot(sx, sy, Math.max(1.6, HALO_DOT_R * s * 0.55), `rgba(${GOLD}, 1)`, gridA * (1 - eased * 0.3));
        });
      }
    }
    const dataA = reveal(G.dataGridEnd, gElapsed, D.dataAssemble);
    setReveal('data', dataA);
    if (dataA > 0) {
      const hubR = r * (0.5 + dataA * 0.5) * (1 + Math.sin(elapsedSec * 1.3) * 0.06);
      drawDot(dataP.x, dataP.y, hubR, `rgba(${GOLD}, 1)`, 1);
      drawIcon(0, dataP.x, dataP.y, iconSize(dataA), dataA);
    }

    // Station 2 — Workflow: two concentric 3-dot loops, counter-rotating —
    // an ongoing process/cycle at two scales, runs indefinitely once formed.
    const workflowA = reveal(G.travel1End, gElapsed, D.workflowForm);
    setReveal('workflow', workflowA);
    if (workflowA > 0) {
      for (let i = 0; i < WORKFLOW_DOT_COUNT; i++) {
        const ang1 = (i / WORKFLOW_DOT_COUNT) * Math.PI * 2 + elapsedSec * WORKFLOW_SPEED;
        drawDot(
          workflowP.x + Math.cos(ang1) * WORKFLOW_RX * s,
          workflowP.y + Math.sin(ang1) * WORKFLOW_RY * s,
          HALO_DOT_R * s,
          STATION_COLORS[1],
          workflowA * 0.85,
        );
        const ang2 = (i / WORKFLOW_DOT_COUNT) * Math.PI * 2 + elapsedSec * WORKFLOW_SPEED2;
        drawDot(
          workflowP.x + Math.cos(ang2) * WORKFLOW_RX2 * s,
          workflowP.y + Math.sin(ang2) * WORKFLOW_RY2 * s,
          HALO_DOT_R * s,
          STATION_COLORS[1],
          workflowA * 0.7,
        );
      }
      const hubR = r * (0.5 + workflowA * 0.5) * 0.85 * (1 + Math.sin(elapsedSec * 1.2) * 0.05);
      drawDot(workflowP.x, workflowP.y, hubR, `rgba(${GOLD}, 1)`, 1);
      drawIcon(1, workflowP.x, workflowP.y, iconSize(workflowA), workflowA);
    }

    // Station 3 — Evidence: scatter fades in, then converges into a single
    // ring (colour: this station's own assigned pastel, not a per-dot mix).
    const scatterA = reveal(G.workflowFormEnd, gElapsed, 700);
    if (scatterA > 0) {
      const convergeT = clamp01((gElapsed - G.travel2End) / D.evidenceConverge);
      SCATTER_OFFSETS.forEach((sc, i) => {
        const stagger = i * 0.04;
        const dt = clamp01((convergeT - stagger) / Math.max(0.001, 1 - stagger));
        const eased = easeOutCubic(dt);
        const target = ringPos(i, RING_OUTER_COUNT, elapsedSec, RING_OUTER_RADIUS, RING_OUTER_SPEED, evidenceP.x, evidenceP.y);
        const x = lerp(evidenceP.x + sc.x * s, target.x, eased);
        const y = lerp(evidenceP.y + sc.y * s, target.y, eased);
        drawDot(x, y, HALO_DOT_R * s, STATION_COLORS[2], scatterA);
      });
    }
    const evidenceA = reveal(G.evidenceFormEnd, gElapsed, D.evidenceHubPause);
    setReveal('evidence', evidenceA);
    if (evidenceA > 0) {
      const hubR = r * (0.5 + evidenceA * 0.5) * 0.85;
      drawDot(evidenceP.x, evidenceP.y, hubR, `rgba(${GOLD}, 1)`, 1);
      drawIcon(2, evidenceP.x, evidenceP.y, iconSize(evidenceA), evidenceA);
    }

    // Station 4 — Impact: continuous radiating rings (the "ripple"), the
    // finale, PLUS Ownership's old satellite dot folded in alongside them
    // (both gated on the same impactA reveal — they arrive together).
    // Ownership's own static orbit-path ring (the pale outlined circle
    // marking where the satellite travels) was dropped per explicit product
    // decision — only the orbiting dot itself survives here now.
    const impactA = reveal(G.travel3End, gElapsed, D.impactForm);
    setReveal('impact', impactA);
    if (impactA > 0) {
      for (let k = 0; k < 3; k++) {
        // Ripple period doubled (2.6s -> 5.2s) — half speed, per explicit
        // product decision.
        const ph = (elapsedSec / 5.2 + k / 3) % 1;
        const rr = ph * r * 6.2;
        const ringAlpha = (1 - ph) * 0.6 * impactA;
        if (ringAlpha > 0.01) {
          ctx!.strokeStyle = `rgba(${GOLD}, ${ringAlpha})`;
          ctx!.lineWidth = 2;
          ctx!.beginPath();
          ctx!.arc(impactP.x, impactP.y, rr, 0, Math.PI * 2);
          ctx!.stroke();
        }
      }

      const satelliteOrbitR = IMPACT_SATELLITE_ORBIT_RADIUS * s;
      const satAng = elapsedSec * IMPACT_SATELLITE_ORBIT_SPEED;
      drawDot(
        impactP.x + Math.cos(satAng) * satelliteOrbitR,
        impactP.y + Math.sin(satAng) * satelliteOrbitR,
        HALO_DOT_R * s,
        IMPACT_SATELLITE_COLOR,
        impactA * 0.85,
      );

      const hubR = r * (0.5 + impactA * 0.5);
      drawDot(impactP.x, impactP.y, hubR, `rgba(${GOLD}, 1)`, 1);
      drawIcon(3, impactP.x, impactP.y, iconSize(impactA), impactA);
    }
  }

  // ---- the traveler: the one transient, phase-branched moving element ----
  // Returns the traveler's real (x,y) point (not just x) so updateHighlight
  // can do a proper 2D proximity check — needed once stations can vary in
  // either axis depending on layout mode (desktop: same y, varying x;
  // mobile: same x, varying y).
  function drawGenesisTraveler(gElapsed: number, elapsedSec: number): FlowPoint | null {
    const r = dotR();
    const [dataP, workflowP, evidenceP, impactP] = layout.stationPts;

    if (gElapsed >= G.dataFormEnd && gElapsed < G.travel1End) {
      const localT = easeInOutCubic(clamp01((gElapsed - G.dataFormEnd) / D.travel1));
      const x = lerp(dataP.x, workflowP.x, localT);
      const y = lerp(dataP.y, workflowP.y, localT);
      drawDot(x, y, r * TRAVELER_R_SCALE, `rgba(${GOLD}, 1)`, 1);
      return { x, y };
    }
    if (gElapsed >= G.workflowFormEnd && gElapsed < G.travel2End) {
      const localT = easeInOutCubic(clamp01((gElapsed - G.workflowFormEnd) / D.travel2));
      const x = lerp(workflowP.x, evidenceP.x, localT);
      const y = lerp(workflowP.y, evidenceP.y, localT);
      drawDot(x, y, r * TRAVELER_R_SCALE, `rgba(${GOLD}, 1)`, 1);
      return { x, y };
    }
    if (gElapsed >= G.evidenceHubAt && gElapsed < G.travel3End) {
      // The one "special" leg — a faint double-ring trail builds
      // anticipation into the Impact finale (was Ownership -> Impact).
      const localT = easeInOutCubic(clamp01((gElapsed - G.evidenceHubAt) / D.travel3));
      const x = lerp(evidenceP.x, impactP.x, localT);
      const y = lerp(evidenceP.y, impactP.y, localT);
      for (let k = 0; k < 2; k++) {
        const ph = (elapsedSec * 0.9 + k * 0.5) % 1;
        const rr = ph * r * 3;
        const a = (1 - ph) * 0.45;
        ctx!.strokeStyle = `rgba(${GOLD}, ${a})`;
        ctx!.lineWidth = 1.5;
        ctx!.beginPath();
        ctx!.arc(x, y, rr, 0, Math.PI * 2);
        ctx!.stroke();
      }
      drawDot(x, y, r * TRAVELER_R_SCALE, `rgba(${GOLD}, 1)`, 1);
      return { x, y };
    }
    return null;
  }

  // ---- repeating traveler: re-traces the trunk once idle ----
  function drawRepeatingTraveler(postElapsed: number): FlowPoint | null {
    const r = dotR();
    const cyclePos = postElapsed % TRAVEL_CYCLE;
    if (cyclePos < TRAVEL_GAP_MS) return null; // gap-first
    const t = (cyclePos - TRAVEL_GAP_MS) / TRAVEL_LOOP_MS;
    if (t >= 1) return null;

    const legFloat = clamp01(t) * TRAVEL_LEG_COUNT;
    const legIndex = Math.min(TRAVEL_LEG_COUNT - 1, Math.floor(legFloat));
    const localT = easeInOutCubic(legFloat - legIndex);
    const fromP = layout.stationPts[legIndex];
    const toP = layout.stationPts[legIndex + 1];
    const x = lerp(fromP.x, toP.x, localT);
    const y = lerp(fromP.y, toP.y, localT);
    drawDot(x, y, r * TRAVELER_R_SCALE, `rgba(${GOLD}, 1)`, 1);
    return { x, y };
  }

  function frame(t: number) {
    if (!t0) t0 = t;
    const elapsedMs = t - t0;
    const elapsedSec = (elapsedMs / 1000) * SPEED;

    ctx!.clearRect(0, 0, W, H);

    let travelerPt: FlowPoint | null = null;
    if (visibleOnce) {
      if (genesisStart === null) genesisStart = elapsedMs;
      const gElapsed = elapsedMs - genesisStart;
      drawPersistent(gElapsed, elapsedSec);
      travelerPt = gElapsed < GENESIS_TOTAL ? drawGenesisTraveler(gElapsed, elapsedSec) : drawRepeatingTraveler(gElapsed - GENESIS_TOTAL);
    }
    updateHighlight(travelerPt);

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

  // Same (hover: none), (pointer: coarse) gate as tilt.ts/cardSpotlight.ts —
  // touch devices have no meaningful hover, so the continuous-pointermove
  // version is skipped entirely rather than leaving a dead listener that
  // can never fire the intended way. Instead, touch/coarse-pointer devices
  // get a tap-to-toggle version below — per explicit product decision,
  // since without SOME interaction the subtitle would just be permanently
  // unreachable on mobile (a plain click event covers real tap behavior on
  // touch browsers, no separate touch-event plumbing needed).
  if (!window.matchMedia('(hover: none), (pointer: coarse)').matches) {
    canvas.addEventListener(
      'pointermove',
      (e) => {
        const rect = canvas!.getBoundingClientRect();
        updateStationHover(e.clientX - rect.left, e.clientY - rect.top, e.clientX, e.clientY);
      },
      { passive: true },
    );
    canvas.addEventListener('pointerleave', () => updateStationHover(null, null, null, null));
  } else {
    // One independent open/closed flag per station — tapping a station's
    // dot or its title/subtitle toggles JUST that one (any number can be
    // open at once), tapping the same station again closes it. Reuses
    // stationHitIndex()'s exact same dual hit-test (dot proximity OR
    // label-rect containment) the desktop hover path uses, and drives the
    // SAME .flow2__label--hovered class the CSS already keys its
    // opacity/transform reveal off of — only the trigger (tap vs. hover)
    // differs between the two branches of this gate.
    const stationOpen: boolean[] = STATION_LABELS.map(() => false);
    canvas.addEventListener('click', (e) => {
      const i = stationHitIndex(e.clientX, e.clientY);
      if (i === null) return;
      stationOpen[i] = !stationOpen[i];
      labelEls[keyOf(i)]?.classList.toggle('flow2__label--hovered', stationOpen[i]);
    });
  }

  // The page-wide master line (flowLine.ts) reads this section's real
  // per-station page-coordinates once (on measure/resize) to route its own
  // path through here — it does not drive this section's animation.
  _getFlowWaypoints = () => {
    const rect = canvas!.getBoundingClientRect();
    return layout.stationPts.map((p) => ({ x: rect.left + window.scrollX + p.x, y: rect.top + window.scrollY + p.y }));
  };

  (window as unknown as { __flow2?: unknown }).__flow2 = { start, stop };
}
