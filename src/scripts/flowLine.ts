// The page-wide flowing connector line. Measures a fixed route of "milestone"
// anchors (existing DOM elements — section headings, CTAs, FlowChart's own
// trunk endpoints, etc.), builds one Manhattan/orthogonal (90°-turns-only)
// rounded-corner path through them (flowLinePath.ts), and eases its drawn
// length toward a scroll-derived target every frame. This module owns the
// scroll-progress math, including reversibly toggling every other local
// flourish (What We Do's spokes, How We Work's per-row rail, the Timeline's
// per-item fade, the Challenge's per-pointer fade) once the line's drawn
// length passes each one's trigger point — this replaced the old
// toggleReveal.ts, which drove the same classes off independent viewport
// intersection instead of this shared progress scalar.
//
// FlowChart's own canvas animation is deliberately NOT driven by this module
// (per explicit direction) — it runs on its own real-time clock and resets
// whenever scrolled out of view, same as before this page-wide line existed.
// This module only reads its entry/exit page-coordinates (getFlowWaypoints)
// to route the path through it.
import { buildRoundedPath, partialD, toOrthogonal, pointAtLength, type BuiltPath, type Point } from './flowLinePath';
// Repointed to FlowChartV2 (the live duplicate) — the archived original at
// ../components/FlowChart/flowChart no longer renders, so its own
// getFlowWaypoints would stay stuck returning [] forever.
import { getFlowWaypoints } from '../components/FlowChartV2/flowChartV2';

// 0 = sharp, unrounded corners — buildRoundedPath's fillet() treats any
// radius below 1e-6 as "no fillet" and falls back to a plain straight
// corner, so this alone is enough (no other code path change needed).
const CORNER_RADIUS = 0;
const ACTIVATION_FRACTION = 0.72; // milestone "reached" once this far down the viewport
const EASE_K = 0.15;
const REST_EPSILON = 0.5; // px — below this, stop ticking the rAF loop
const DOT_R = 5;
const FLOURISH_LEAD = 20; // px of path length a flourish triggers *before* its exact point

interface Milestone {
  key: string;
  getPoint: () => Point | null;
  // false for points that only shape the path (station stops, turns) rather
  // than mark a section's start — those don't get a rendered milestone dot.
  dot?: boolean;
}

interface Flourish {
  el: Element;
  className: string;
  getTriggerLength: () => number;
}

// `window.innerWidth` INCLUDES the scrollbar's width in this environment,
// but every actual layout (CSS %, margin:auto centering, etc.) resolves
// against `document.documentElement.clientWidth`, which excludes it — using
// innerWidth here silently drifted every rail/centre position by the
// scrollbar's width (~15px) versus the real rendered content. Always use
// clientWidth for anything meant to line up with real layout.
//
// The left rail specifically MEASURES the header's real floating logomark
// (#floating-mark) rather than recomputing its clamp(1.25rem,5vw,4rem)
// formula independently — avoids any drift between the two, and is the
// most literal reading of "stay in line with the logomark." MARK_CLEARANCE
// pulls the rail back from the mark's raw left edge — sitting exactly AT
// that edge put the rail's dots directly against the mark's badge (visibly
// touching it) whenever a scroll position placed one of the line's early
// dots at the same on-screen height as the fixed-position mark; this keeps
// the rail "in line with the logomark" (same design intent) without
// literally touching its rendered edge.
const MARK_CLEARANCE = 16;
// Exported so other on-page elements that need to sit exactly ON the rail
// (not just have the master line pass near them) can read the same real
// measurement instead of duplicating the mark-relative formula — see
// timelineTraveler.ts's alignment of the mobile timeline's own dots/rail
// line to this same x.
export function railPad(): number {
  const mark = document.querySelector<HTMLElement>('#floating-mark');
  if (mark) return mark.getBoundingClientRect().left - MARK_CLEARANCE;
  return Math.min(64, Math.max(20, document.documentElement.clientWidth * 0.05));
}
function railLeftX(): number {
  return railPad() + window.scrollX;
}
function railRightX(): number {
  return document.documentElement.clientWidth - railPad() + window.scrollX;
}
function screenCenterX(): number {
  return document.documentElement.clientWidth / 2 + window.scrollX;
}

// [data-reveal] (Reveal.astro) and [data-flow-fade] (global.css) both start
// life translated a fixed distance down (16px / 12px respectively) and
// animate to translateY(0) once revealed — nearly every milestone anchor
// (section headings, the What We Do connect-dot, the Foundation timeline's
// dots, ...) lives inside one or both of these. Measuring such an anchor
// BEFORE it's actually been revealed (i.e. on the very first measure() at
// page load, before the user has scrolled anywhere near it) reads its
// temporary pre-reveal position, permanently baking that few-px offset into
// the built path — nothing then corrects it until an unrelated resize event
// (browser zoom counts) forces a fresh measure() after the element has since
// settled, which is why "zoom out then in" appeared to fix it. Rather than
// hook re-measurement to reveal timing (fragile — [data-flow-fade] is
// reversible, so it can toggle back off mid-scroll, and re-measuring on
// every toggle would thrash/jitter the line), this walks up from the anchor
// and cancels out any not-yet-settled ancestor's CURRENT translateY —
// reading the live computed transform rather than hardcoding 16/12 so this
// keeps working if those values ever change, and needs no special-casing
// for prefers-reduced-motion (global.css forces transform:none there
// unconditionally, so the computed value is already 0).
// Exported so other on-page alignment code (index.astro's
// alignWhatWeDoBurst()) can correct for the same not-yet-revealed-ancestor
// drift without duplicating this logic.
export function settledOffsetY(el: Element): number {
  let offset = 0;
  let node: Element | null = el;
  while (node) {
    if ((node.hasAttribute('data-reveal') || node.hasAttribute('data-flow-fade')) && !node.classList.contains('is-visible')) {
      const t = getComputedStyle(node).transform;
      const m = t && t !== 'none' ? t.match(/^matrix\(([^)]+)\)$/) : null;
      if (m) {
        const parts = m[1].split(',').map((v) => parseFloat(v.trim()));
        if (parts.length >= 6) offset += parts[5];
      }
    }
    node = node.parentElement;
  }
  return offset;
}

function pagePoint(el: Element | null, xMode: 'left' | 'right' | 'center', yMode: 'top' | 'center' = 'center'): Point | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const x = xMode === 'left' ? r.left : xMode === 'right' ? r.right : (r.left + r.right) / 2;
  const y = (yMode === 'top' ? r.top : (r.top + r.bottom) / 2) - settledOffsetY(el);
  return { x: x + window.scrollX, y: y + window.scrollY };
}

function pageY(el: Element | null, yMode: 'top' | 'center' = 'center'): number | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return (yMode === 'top' ? r.top : (r.top + r.bottom) / 2) - settledOffsetY(el) + window.scrollY;
}

function q(selector: string): Element | null {
  return document.querySelector(selector);
}

// A milestone pinned to a fixed x (one of the rails, or screen-center)
// rather than to wherever its anchor element's own rect happens to sit.
function atFixedX(selector: string, x: () => number): Milestone['getPoint'] {
  return () => {
    const y = pageY(q(selector));
    return y === null ? null : { x: x(), y };
  };
}

// A milestone at the given element's own Y but a caller-supplied fixed X —
// used for hidden path-shaping points that aren't tied to any element at all
// (a section boundary, say) but still need a real Y to anchor to.
function fixedPoint(x: () => number, y: () => number | null): Milestone['getPoint'] {
  return () => {
    const yVal = y();
    return yVal === null ? null : { x: x(), y: yVal };
  };
}

function sectionTop(selector: string): number | null {
  const el = q(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.top - settledOffsetY(el) + window.scrollY;
}

// Only three vertical rails exist anywhere on the page — left, right, and
// centre (railLeftX/railRightX/screenCenterX). Every vertical run in the
// path must sit on one of these; FlowChart's own horizontal trunk (between
// flow-entry/flow-exit) is the sole exception, since it traces the canvas's
// own content-edge-aligned dots, not a rail. Wherever the route needs to
// move from one rail to another, that transition is an explicit hidden
// waypoint pair here (not left to toOrthogonal's default corner placement),
// so the turn happens exactly where intended rather than wherever the next
// ============================================================================
// BESPOKE SUBPAGE MILESTONE GENERATORS
// ============================================================================

// Helper: Route directly into the CTA Card interior with a terminal connection port
function pushCtaConnection(list: Milestone[], cta: HTMLElement | null, entryRail: 'left' | 'right' = 'left', prefix = 'cta') {
  if (!cta) return;
  const railXFn = entryRail === 'left' ? railLeftX : railRightX;

  // 1) Align on rail with the CTA header level
  list.push({
    key: `${prefix}-cta-rail-level`,
    dot: false,
    getPoint: () => {
      const cr = cta.getBoundingClientRect();
      return { x: railXFn(), y: cr.top + 52 + window.scrollY };
    },
  });

  // 2) 90-degree jog entering straight through the card border into the interior
  list.push({
    key: `${prefix}-cta-port`,
    dot: true,
    getPoint: () => {
      const cr = cta.getBoundingClientRect();
      const portX = entryRail === 'left'
        ? cr.left + 36 + window.scrollX
        : cr.right - 36 + window.scrollX;
      return { x: portX, y: cr.top + 52 + window.scrollY };
    },
  });
}

// 1. Built for Government: Hero (Left) -> Diagnostic Studio (Left) -> Sec 2 Heading (Left) -> Jog Horizontally Before Pics -> Center Channel between Dual Cards -> Power Splitter Hub -> Beyond Gov Monument (Center) -> Final CTA
function buildBuiltForGovMilestones(): Milestone[] {
  const heroH1 = document.querySelector<HTMLElement>('main h1');
  const sec1 = document.getElementById('operational-reality') || document.querySelector<HTMLElement>('main section:nth-of-type(1)');
  const sec2 = document.getElementById('architectural-requirements') || document.querySelector<HTMLElement>('#dual-pillars')?.closest('section');
  const archHeading = document.getElementById('arch-h2') || sec2?.querySelector('h2');
  const archDesc = document.getElementById('arch-desc') || sec2?.querySelector('p');
  const cardGrid = document.getElementById('dual-pillars') || sec2?.querySelector('.pillar-grid') || sec2?.querySelector('.grid');
  const card1 = document.querySelector<HTMLElement>('.pillar-card-1');
  const card2 = document.querySelector<HTMLElement>('.pillar-card-2');
  const sec3 = document.querySelector<HTMLElement>('main .gradient-navy-mesh')?.closest('section') || document.querySelector<HTMLElement>('main section:nth-of-type(3)');
  const cta = document.querySelector<HTMLElement>('main .final-cta-card, main section:last-of-type a');

  const list: Milestone[] = [];

  // Hero on Left Rail
  list.push({
    key: 'bfg-hero',
    getPoint: () => {
      if (!heroH1) return null;
      const r = heroH1.getBoundingClientRect();
      return { x: railLeftX(), y: r.top + r.height / 2 + window.scrollY };
    },
  });

  // Section 1: Heading on Left Rail
  list.push({
    key: 'bfg-sec1-heading',
    getPoint: () => {
      const h = sec1?.querySelector('h2') ?? sec1;
      if (!h) return null;
      return { x: railLeftX(), y: h.getBoundingClientRect().top + 16 + window.scrollY };
    },
  });

  // Section 2: Heading on Left Rail
  list.push({
    key: 'bfg-sec2-heading',
    getPoint: () => {
      if (!archHeading) return null;
      return { x: railLeftX(), y: archHeading.getBoundingClientRect().top + 16 + window.scrollY };
    },
  });

  // Center Gap X between the two cards (or screen center on mobile)
  const getCenterGapX = () => {
    if (card1 && card2 && document.documentElement.clientWidth >= 1024) {
      const r1 = card1.getBoundingClientRect();
      const r2 = card2.getBoundingClientRect();
      return (r1.right + r2.left) / 2 + window.scrollX;
    }
    return screenCenterX();
  };

  // Horizontal Jog Y in the gap BEFORE the cards/pics
  const getJogY = () => {
    if (archDesc && cardGrid) {
      const dr = archDesc.getBoundingClientRect();
      const gr = cardGrid.getBoundingClientRect();
      return (dr.bottom + gr.top) / 2 + window.scrollY;
    }
    if (cardGrid) {
      return cardGrid.getBoundingClientRect().top - 28 + window.scrollY;
    }
    return null;
  };

  // 1) Turn 90 deg right from left rail before the pics
  list.push({
    key: 'bfg-cards-jog-start',
    dot: false,
    getPoint: () => {
      const jy = getJogY();
      return jy === null ? null : { x: railLeftX(), y: jy };
    },
  });

  // 2) Reach center between the two cards
  list.push({
    key: 'bfg-cards-jog-center',
    dot: false,
    getPoint: () => {
      const jy = getJogY();
      return jy === null ? null : { x: getCenterGapX(), y: jy };
    },
  });

  // 3) Travel down between the two cards to the Power Splitter Hub
  const getSplitterY = () => {
    if (card1) {
      const port = card1.querySelector('.pillar-power-terminal') || card1.querySelector('.pillar-badge');
      if (port) {
        const pr = port.getBoundingClientRect();
        return pr.top + pr.height / 2 + window.scrollY;
      }
      const cr = card1.getBoundingClientRect();
      return cr.top + 42 + window.scrollY;
    }
    if (cardGrid) {
      return cardGrid.getBoundingClientRect().top + 60 + window.scrollY;
    }
    return null;
  };

  list.push({
    key: 'bfg-power-splitter',
    dot: true,
    getPoint: () => {
      const sy = getSplitterY();
      return sy === null ? null : { x: getCenterGapX(), y: sy };
    },
  });

  // 4) Continue down the center aisle past the cards
  const getCardsBottomY = () => {
    if (cardGrid) {
      return cardGrid.getBoundingClientRect().bottom + 24 + window.scrollY;
    }
    return null;
  };

  list.push({
    key: 'bfg-cards-bottom',
    dot: false,
    getPoint: () => {
      const by = getCardsBottomY();
      return by === null ? null : { x: getCenterGapX(), y: by };
    },
  });

  // Section 3: Jog back to Left Rail in the gap below the cards
  list.push({
    key: 'bfg-monument-jog-left',
    dot: false,
    getPoint: () => {
      const by = getCardsBottomY();
      return by === null ? null : { x: railLeftX(), y: by };
    },
  });

  // Section 3: Beyond Government Heading on Left Rail
  list.push({
    key: 'bfg-monument-heading',
    getPoint: () => {
      const heading = sec3?.querySelector('h2');
      if (!heading) return null;
      return { x: railLeftX(), y: heading.getBoundingClientRect().top + 16 + window.scrollY };
    },
  });

  // Final CTA plugged into card interior
  pushCtaConnection(list, cta, 'left', 'bfg');

  return list;
}

// 2. How We Work: Hero (Left) -> 4 Alternating Principle Cards (Zigzags Left <-> Right in gaps) -> Final CTA (Right Rail Plug)
function buildHowWeWorkMilestones(): Milestone[] {
  const heroH1 = document.querySelector<HTMLElement>('main h1');
  const principles = Array.from(document.querySelectorAll<HTMLElement>('main article.principle-row'));
  const cta = document.querySelector<HTMLElement>('main .final-cta-card, main section:last-of-type a');
  const list: Milestone[] = [];

  list.push({
    key: 'hww-hero',
    getPoint: () => {
      if (!heroH1) return null;
      const r = heroH1.getBoundingClientRect();
      return { x: railLeftX(), y: r.top + r.height / 2 + window.scrollY };
    },
  });

  let currentRail: 'left' | 'right' = 'left';

  principles.forEach((p, idx) => {
    const pr = p.getBoundingClientRect();
    const pTop = pr.top + window.scrollY;
    const heading = p.querySelector('h2');
    const targetRail: 'left' | 'right' = idx % 2 === 0 ? 'left' : 'right';

    if (targetRail !== currentRail && idx > 0) {
      const prevP = principles[idx - 1];
      const prevBottom = prevP.getBoundingClientRect().bottom + window.scrollY;
      const gapY = (prevBottom + pTop) / 2;
      const fromRail = currentRail === 'left' ? railLeftX : railRightX;
      const toRail = targetRail === 'left' ? railLeftX : railRightX;

      list.push({
        key: `hww-jog-start-${idx}`,
        dot: false,
        getPoint: () => ({ x: fromRail(), y: gapY }),
      });
      list.push({
        key: `hww-jog-end-${idx}`,
        dot: false,
        getPoint: () => ({ x: toRail(), y: gapY }),
      });
      currentRail = targetRail;
    }

    const activeRailFn = currentRail === 'left' ? railLeftX : railRightX;
    list.push({
      key: `hww-principle-${idx}`,
      getPoint: () => {
        const hr = heading?.getBoundingClientRect() ?? p.getBoundingClientRect();
        return { x: activeRailFn(), y: hr.top + 20 + window.scrollY };
      },
    });
  });

  // Final CTA plugged into card interior from Right Rail
  pushCtaConnection(list, cta, 'right', 'hww');

  return list;
}

// 3. Purpose & Direction: Hero (Left) -> Mission Monument (Left) -> Sector Heading (Left) -> Top Splitter Manifold (Center) -> 3 Sector Stream -> Bottom Combiner Manifold (Center) -> Jog to Left Rail -> Vision Heading (Left Rail) -> Final CTA (Left Rail Plug)
function buildPurposeAndDirectionMilestones(): Milestone[] {
  const heroH1 = document.querySelector<HTMLElement>('main h1');
  const missionMonument = document.querySelector<HTMLElement>('main .card-interactive-sheen');
  const sectorHeading = document.getElementById('sector-horizons-heading') || document.querySelector<HTMLElement>('#sector-horizons-section h2');
  const sectorGrid = document.getElementById('sector-horizons-grid') || document.querySelector<HTMLElement>('main .grid-cols-1.lg\\:grid-cols-3');
  const visionMonument = document.querySelector<HTMLElement>('main .gradient-navy-mesh');
  const cta = document.querySelector<HTMLElement>('main .final-cta-card');
  const list: Milestone[] = [];

  // Hero on Left Rail
  list.push({
    key: 'pad-hero',
    getPoint: () => {
      if (!heroH1) return null;
      return { x: railLeftX(), y: heroH1.getBoundingClientRect().top + heroH1.getBoundingClientRect().height / 2 + window.scrollY };
    },
  });

  // Mission Monument on Left Rail
  list.push({
    key: 'pad-mission',
    getPoint: () => {
      if (!missionMonument) return null;
      const mr = missionMonument.getBoundingClientRect();
      return { x: railLeftX(), y: mr.top + 60 + window.scrollY };
    },
  });

  // Sector Horizons Heading on Left Rail
  list.push({
    key: 'pad-sectors-heading',
    getPoint: () => {
      if (!sectorHeading) return null;
      return { x: railLeftX(), y: sectorHeading.getBoundingClientRect().top + 16 + window.scrollY };
    },
  });

  // Safe gap below the heading and above the 3 cards (Top Splitter Manifold)
  const getTopSplitterY = () => {
    if (!sectorHeading || !sectorGrid) return 0;
    const hr = sectorHeading.getBoundingClientRect();
    const gr = sectorGrid.getBoundingClientRect();
    return (hr.bottom + gr.top) / 2 + window.scrollY;
  };

  list.push({
    key: 'pad-split-jog-start',
    dot: false,
    getPoint: () => ({ x: railLeftX(), y: getTopSplitterY() }),
  });
  list.push({
    key: 'pad-3way-splitter',
    getPoint: () => ({ x: screenCenterX(), y: getTopSplitterY() }),
  });

  // Center Channel travels through the middle card (Card 2: Nonprofits)
  list.push({
    key: 'pad-sectors-mid-dot',
    getPoint: () => {
      if (!sectorGrid) return null;
      const gr = sectorGrid.getBoundingClientRect();
      return { x: screenCenterX(), y: gr.top + gr.height * 0.48 + window.scrollY };
    },
  });

  // Safe gap below the 3 cards and above the Vision Monument (Bottom Combiner Manifold)
  const getBottomCombinerY = () => {
    if (!sectorGrid || !visionMonument) return 0;
    const gr = sectorGrid.getBoundingClientRect();
    const vr = visionMonument.getBoundingClientRect();
    return (gr.bottom + vr.top) / 2 + window.scrollY;
  };

  list.push({
    key: 'pad-3way-combiner',
    dot: false,
    getPoint: () => ({ x: screenCenterX(), y: getBottomCombinerY() }),
  });

  // In the gap below the cards: Jog from Combiner back to Left Rail
  list.push({
    key: 'pad-combiner-to-rail',
    dot: false,
    getPoint: () => ({ x: railLeftX(), y: getBottomCombinerY() }),
  });

  // Vision Monument Heading on Left Rail (framing the vision on the left)
  list.push({
    key: 'pad-vision-heading',
    getPoint: () => {
      const heading = visionMonument?.querySelector('h2');
      if (!heading) return null;
      return { x: railLeftX(), y: heading.getBoundingClientRect().top + 16 + window.scrollY };
    },
  });

  // Final CTA plugged into card interior
  pushCtaConnection(list, cta, 'left', 'pad');

  return list;
}

// 4. Our Approach: Hero (Left) -> 4-Stage Explorer (Center Channel) -> Jog to Left Rail -> Assurance Monument (Left Rail) -> Final CTA (Left Rail Plug)
function buildOurApproachMilestones(): Milestone[] {
  const heroH1 = document.querySelector<HTMLElement>('main h1');
  const explorer = document.querySelector<HTMLElement>('[data-stage-explorer]');
  const monument = document.querySelector<HTMLElement>('main .gradient-navy-mesh');
  const cta = document.querySelector<HTMLElement>('main .final-cta-card');
  const list: Milestone[] = [];

  list.push({
    key: 'oa-hero',
    getPoint: () => {
      if (!heroH1) return null;
      return { x: railLeftX(), y: heroH1.getBoundingClientRect().top + heroH1.getBoundingClientRect().height / 2 + window.scrollY };
    },
  });

  // Jog into Stage Explorer Tab bar in the gap above
  list.push({
    key: 'oa-explorer-jog-start',
    dot: false,
    getPoint: () => {
      if (!explorer) return null;
      return { x: railLeftX(), y: explorer.getBoundingClientRect().top - 28 + window.scrollY };
    },
  });
  list.push({
    key: 'oa-explorer-jog-center',
    dot: false,
    getPoint: () => {
      if (!explorer) return null;
      return { x: screenCenterX(), y: explorer.getBoundingClientRect().top - 28 + window.scrollY };
    },
  });
  list.push({
    key: 'oa-explorer-dot',
    getPoint: () => {
      if (!explorer) return null;
      const er = explorer.getBoundingClientRect();
      return { x: screenCenterX(), y: er.top + 30 + window.scrollY };
    },
  });

  // In the gap below Stage Explorer: Jog back to Left Rail
  const getOaGapY = () => {
    if (!explorer || !monument) return 0;
    return (explorer.getBoundingClientRect().bottom + monument.getBoundingClientRect().top) / 2 + window.scrollY;
  };
  list.push({
    key: 'oa-monument-jog-start',
    dot: false,
    getPoint: () => ({ x: screenCenterX(), y: getOaGapY() }),
  });
  list.push({
    key: 'oa-monument-jog-left',
    dot: false,
    getPoint: () => ({ x: railLeftX(), y: getOaGapY() }),
  });

  // Independent Assurance Monument on Left Rail
  list.push({
    key: 'oa-monument-heading',
    getPoint: () => {
      const heading = monument?.querySelector('h2');
      if (!heading) return null;
      return { x: railLeftX(), y: heading.getBoundingClientRect().top + 16 + window.scrollY };
    },
  });

  // Final CTA plugged into card interior
  pushCtaConnection(list, cta, 'left', 'oa');

  return list;
}

// 5. 16 Years of Proof: Hero (Left) -> Bedrock Header (Left) -> Weaves 4 Foundation Cornerstones (Top-Left -> Top-Right -> Bottom-Right -> Bottom-Left) -> Global Reach Heading (Left) -> Global Footprint Map (Left Rail) -> Final CTA (Left Rail Plug)
function build16YearsMilestones(): Milestone[] {
  const heroH1 = document.querySelector<HTMLElement>('main h1');
  const bedrockHeading = document.getElementById('bedrock-heading') || document.querySelector<HTMLElement>('#bedrock-section h2');
  const card0 = document.querySelector<HTMLElement>('.bedrock-card-0');
  const card1 = document.querySelector<HTMLElement>('.bedrock-card-1');
  const card2 = document.querySelector<HTMLElement>('.bedrock-card-2');
  const card3 = document.querySelector<HTMLElement>('.bedrock-card-3');
  const globalHeading = document.getElementById('global-heading') || document.querySelector<HTMLElement>('#global-reach-section h2');
  const matrixWrap = document.getElementById('footprint-matrix-wrap') || document.getElementById('footprint-map-wrap') || document.querySelector<HTMLElement>('#global-reach-section .rounded-3xl');
  const cta = document.querySelector<HTMLElement>('main .final-cta-card, main section:last-of-type a');
  const list: Milestone[] = [];

  // Hero on Left Rail
  list.push({
    key: 'proof-hero',
    getPoint: () => {
      if (!heroH1) return null;
      const r = heroH1.getBoundingClientRect();
      return { x: railLeftX(), y: r.top + r.height / 2 + window.scrollY };
    },
  });

  // Bedrock Heading on Left Rail
  list.push({
    key: 'proof-bedrock-heading',
    getPoint: () => {
      if (!bedrockHeading) return null;
      return { x: railLeftX(), y: bedrockHeading.getBoundingClientRect().top + 16 + window.scrollY };
    },
  });

  // Check if 2-column layout is active (desktop/tablet)
  const isMultiCol = typeof window !== 'undefined' && window.innerWidth >= 768;

  if (isMultiCol && card0 && card1 && card2 && card3) {
    // 1. Enter Cornerstone 1 (Top-Left: Policy Research & Governance)
    list.push({
      key: 'proof-pillar-0',
      getPoint: () => {
        const r = card0.getBoundingClientRect();
        return { x: railLeftX(), y: r.top + 48 + window.scrollY };
      },
    });

    // 2. Horizontal crossover across aisle to Cornerstone 2 (Top-Right: Evidence & Learning)
    list.push({
      key: 'proof-jog-0-to-1',
      dot: false,
      getPoint: () => {
        const r0 = card0.getBoundingClientRect();
        return { x: railRightX(), y: r0.top + 48 + window.scrollY };
      },
    });
    list.push({
      key: 'proof-pillar-1',
      getPoint: () => {
        const r1 = card1.getBoundingClientRect();
        return { x: railRightX(), y: r1.top + 48 + window.scrollY };
      },
    });

    // 3. Drop vertically down along Right Rail to Cornerstone 4 (Bottom-Right: Field Intelligence)
    list.push({
      key: 'proof-pillar-3',
      getPoint: () => {
        const r3 = card3.getBoundingClientRect();
        return { x: railRightX(), y: r3.top + 48 + window.scrollY };
      },
    });

    // 4. Horizontal crossover back across aisle to Cornerstone 3 (Bottom-Left: Engineering & Systems)
    list.push({
      key: 'proof-jog-3-to-2',
      dot: false,
      getPoint: () => {
        const r3 = card3.getBoundingClientRect();
        return { x: railLeftX(), y: r3.top + 48 + window.scrollY };
      },
    });
    list.push({
      key: 'proof-pillar-2',
      getPoint: () => {
        const r2 = card2.getBoundingClientRect();
        return { x: railLeftX(), y: r2.top + 48 + window.scrollY };
      },
    });
  }

  // Global Reach Heading on Left Rail
  list.push({
    key: 'proof-global-heading',
    getPoint: () => {
      if (!globalHeading) return null;
      return { x: railLeftX(), y: globalHeading.getBoundingClientRect().top + 16 + window.scrollY };
    },
  });

  // Global Footprint Matrix on Left Rail
  list.push({
    key: 'proof-matrix-left',
    getPoint: () => {
      if (!matrixWrap) return null;
      return { x: railLeftX(), y: matrixWrap.getBoundingClientRect().top + 60 + window.scrollY };
    },
  });

  // Final CTA plugged into card interior
  pushCtaConnection(list, cta, 'left', 'proof');

  return list;
}

// 6. The People Behind APLYD: Clean Vertical Left Rail Spine
// Hero (Left) -> Group 0 Leadership (Left Rail) -> Group 1 AI & Digital (Left Rail) -> Group 2 Evaluation (Left Rail) -> Final CTA (Left Rail Plug)
function buildPeopleMilestones(): Milestone[] {
  const heroH1 = document.querySelector<HTMLElement>('main h1');
  const groupEls = Array.from(document.querySelectorAll<HTMLElement>('main section:nth-of-type(1) .space-y-8, main .space-y-8'));
  const cta = document.querySelector<HTMLElement>('main .final-cta-card, main section:last-of-type a');
  const list: Milestone[] = [];

  list.push({
    key: 'people-hero',
    getPoint: () => {
      if (!heroH1) return null;
      const r = heroH1.getBoundingClientRect();
      return { x: railLeftX(), y: r.top + r.height / 2 + window.scrollY };
    },
  });

  groupEls.forEach((g, idx) => {
    const heading = g.querySelector('h2');
    list.push({
      key: `people-group-${idx}`,
      getPoint: () => {
        const hr = heading?.getBoundingClientRect() ?? g.getBoundingClientRect();
        return { x: railLeftX(), y: hr.top + hr.height / 2 + window.scrollY };
      },
    });
  });

  // Final CTA plugged into card interior from Left Rail
  pushCtaConnection(list, cta, 'left', 'people');

  return list;
}

// 7. Intelligent Multi-Rail General Subpage Generator (For Sector Capabilities, AI in Action, Contact)
function buildGeneralSubpageMilestones(): Milestone[] {
  const list: Milestone[] = [];
  const heroH1 = document.querySelector<HTMLElement>('main h1');
  if (heroH1) {
    list.push({
      key: 'subpage-hero',
      getPoint: () => {
        const r = heroH1.getBoundingClientRect();
        return { x: railLeftX(), y: r.top + r.height / 2 + window.scrollY };
      },
    });
  }

  type RailType = 'left' | 'right' | 'center';
  const getRailX = (r: RailType) => (r === 'left' ? railLeftX() : r === 'right' ? railRightX() : screenCenterX());

  const sectionEls = Array.from(document.querySelectorAll<HTMLElement>('main section, main [data-story-section]'));
  const validSections = sectionEls.filter((sec) => {
    const isCta = sec.querySelector('.final-cta-card, .future-cta__trigger') !== null && sec === sectionEls[sectionEls.length - 1];
    return !isCta && sec.offsetHeight > 40;
  });

  let currentRail: RailType = 'left';

  validSections.forEach((sec, idx) => {
    const heading = sec.querySelector<HTMLElement>('h2, h3');
    const secRect = sec.getBoundingClientRect();
    const secTop = secRect.top + window.scrollY;

    const isMonument = sec.querySelector('.gradient-navy-mesh, .stage-explorer, [data-canvas-monument]') !== null;
    let nextRail: RailType;
    if (isMonument && document.documentElement.clientWidth >= 900) {
      nextRail = idx % 2 === 0 ? 'center' : 'right';
    } else {
      nextRail = idx % 2 === 0 ? 'left' : 'right';
    }

    if (nextRail !== currentRail && idx > 0) {
      const prevSec = validSections[idx - 1];
      const prevBottom = prevSec.getBoundingClientRect().bottom + window.scrollY;
      const gapY = Math.max(prevBottom + 16, (prevBottom + secTop) / 2);
      
      const fromRail = currentRail;
      const toRail = nextRail;

      list.push({
        key: `subpage-jog-start-${idx}`,
        dot: false,
        getPoint: () => ({ x: getRailX(fromRail), y: gapY }),
      });
      list.push({
        key: `subpage-jog-end-${idx}`,
        dot: false,
        getPoint: () => ({ x: getRailX(toRail), y: gapY }),
      });

      currentRail = nextRail;
    }

    const activeRail = currentRail;
    if (heading) {
      list.push({
        key: `subpage-sec-dot-${idx}`,
        getPoint: () => {
          const hr = heading.getBoundingClientRect();
          return { x: getRailX(activeRail), y: hr.top + 16 + window.scrollY };
        },
      });
    } else {
      list.push({
        key: `subpage-sec-mid-${idx}`,
        dot: false,
        getPoint: () => {
          const sr = sec.getBoundingClientRect();
          return { x: getRailX(activeRail), y: sr.top + sr.height / 2 + window.scrollY };
        },
      });
    }
  });

  const bottomCta = document.querySelector<HTMLElement>('main section:last-of-type .final-cta-card, main section:last-of-type a, main section:last-of-type button, main .btn, .future-cta__trigger');
  if (bottomCta) {
    const finalRail = currentRail;
    list.push({
      key: 'subpage-cta-jog',
      dot: false,
      getPoint: () => {
        const r = bottomCta.getBoundingClientRect();
        return { x: getRailX(finalRail), y: r.top + r.height / 2 + window.scrollY };
      },
    });
    list.push({
      key: 'subpage-cta',
      dot: false,
      getPoint: () => {
        const r = bottomCta.getBoundingClientRect();
        return { x: r.left + r.width / 2 + window.scrollX, y: r.top + r.height / 2 + window.scrollY };
      },
    });
  }

  return list;
}

function buildMilestones(): Milestone[] {
  if (typeof window === 'undefined') return [];
  const pathname = window.location.pathname;

  // 1. Homepage
  if (pathname === '/' || pathname === '' || document.querySelector('.hero-flow-stack') !== null || document.getElementById('trust') !== null) {
    const whatWeDoTop = () => sectionTop('#what-we-do');
    const howWeWorkTop = () => sectionTop('#how-we-work');
    const challengeTop = () => sectionTop('#why-aplyd');
    const whatWeDoJogY = () => {
      if (document.documentElement.clientWidth >= 768) return whatWeDoTop();
      const subhead = document.getElementById('what-subhead');
      const wrap = document.querySelector('.connect-wrap');
      if (!subhead || !wrap) return whatWeDoTop();
      const subRect = subhead.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      return (subRect.bottom + wrapRect.top) / 2 + window.scrollY;
    };
    const flowExitY = () => {
      const pts = getFlowWaypoints();
      return pts.length ? pts[pts.length - 1].y : null;
    };
    const caseStudiesBottom = () => {
      const section = document.getElementById('ai-in-action');
      return section ? section.getBoundingClientRect().bottom + window.scrollY : null;
    };
    const finalCtaY = () => pageY(q('section#contact .future-cta__trigger'));

    return [
      { key: 'hero-cta', getPoint: atFixedX('.hero__cta a.hero-cta-primary', railLeftX) },
      { key: 'flow-heading', getPoint: atFixedX('#flow-h2', railLeftX) },
      { key: 'flow-entry', dot: false, getPoint: () => getFlowWaypoints()[0] ?? null },
      {
        key: 'flow-exit',
        dot: false,
        getPoint: () => {
          const pts = getFlowWaypoints();
          return pts[pts.length - 1] ?? null;
        },
      },
      { key: 'flow-exit-rail', dot: false, getPoint: fixedPoint(railRightX, flowExitY) },
      { key: 'trust', getPoint: atFixedX('#trust .grid', railRightX) },
      { key: 'challenge-turn', dot: false, getPoint: fixedPoint(railRightX, challengeTop) },
      { key: 'challenge-jog', dot: false, getPoint: fixedPoint(railLeftX, challengeTop) },
      { key: 'challenge', getPoint: atFixedX('#why-h2', railLeftX) },
      { key: 'what-we-do-turn', dot: false, getPoint: fixedPoint(railLeftX, whatWeDoJogY) },
      { key: 'what-we-do-jog', dot: false, getPoint: fixedPoint(screenCenterX, whatWeDoJogY) },
      { key: 'what-we-do', getPoint: atFixedX('.connect-dot', screenCenterX) },
      { key: 'how-we-work-start', dot: false, getPoint: fixedPoint(screenCenterX, howWeWorkTop) },
      { key: 'how-we-work-jog', dot: false, getPoint: fixedPoint(railLeftX, howWeWorkTop) },
      { key: 'how-we-work-title', getPoint: atFixedX('#how-h2', railLeftX) },
      { key: 'case-studies', getPoint: atFixedX('#cases-h2', railLeftX) },
      { key: 'case-studies-jog', dot: false, getPoint: fixedPoint(railRightX, caseStudiesBottom) },
      { key: 'team', getPoint: atFixedX('#team-h2', railRightX) },
      { key: 'cta-rail-end', dot: false, getPoint: fixedPoint(railRightX, finalCtaY) },
      { key: 'final-cta', dot: false, getPoint: () => pagePoint(q('section#contact .future-cta__trigger'), 'center') },
    ];
  }

  // 2. Specific Subpage Generators for all About APLYD & Services pages
  if (document.getElementById('architectural-requirements') !== null || pathname.includes('/about/built-for-government')) {
    return buildBuiltForGovMilestones();
  }
  if (document.querySelector('article.principle-row') !== null || pathname.includes('/about/how-we-work')) {
    return buildHowWeWorkMilestones();
  }
  if (pathname.includes('/about/purpose-and-direction')) {
    return buildPurposeAndDirectionMilestones();
  }
  if (pathname.includes('/about/16-years-of-proof')) {
    return build16YearsMilestones();
  }
  if (pathname.includes('/about/people')) {
    return buildPeopleMilestones();
  }
  if (pathname.includes('/services/our-approach')) {
    return buildOurApproachMilestones();
  }

  // 3. Fallback for other subpages (Sector Capabilities, AI in Action, Contact)
  return buildGeneralSubpageMilestones();
}

export function initFlowLine(): void {
  const svg = document.querySelector<SVGSVGElement>('.flow-line-svg');
  const path = document.querySelector<SVGPathElement>('.flow-line-path');
  const branchesRoot = document.querySelector<SVGGElement>('.flow-line-branches');
  const dotsRoot = document.querySelector<SVGGElement>('.flow-line-dots');
  const headGroup = document.querySelector<SVGGElement>('.flow-line-head-group');
  const head = headGroup?.querySelector<SVGCircleElement>('.flow-line-head');
  const headHalo = headGroup?.querySelector<SVGCircleElement>('.flow-line-head-halo');
  if (!svg || !path || !dotsRoot) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let built: BuiltPath = { segments: [], cumulativeLengths: [], totalLength: 0 };
  let milestoneCumulative: number[] = [];
  let currentMilestonesWithPoints: Milestone[] = [];
  let activationScrollY: number[] = [];
  let currentLength = 0;
  let targetLength = 0;
  let raf = 0;
  let running = false;
  let flourishes: Flourish[] = [];

  function renderBranches() {
    if (!branchesRoot) return;
    branchesRoot.innerHTML = '';
    const SVGNS = 'http://www.w3.org/2000/svg';

    // 1. Built for Government Dual Pillar Branching
    const card1 = document.querySelector<HTMLElement>('.pillar-card-1');
    const card2 = document.querySelector<HTMLElement>('.pillar-card-2');
    if (card1 && card2 && document.documentElement.clientWidth >= 1024) {
      const r1 = card1.getBoundingClientRect();
      const r2 = card2.getBoundingClientRect();
      const centerGapX = (r1.right + r2.left) / 2 + window.scrollX;

      const port1 = card1.querySelector('.pillar-power-terminal') || card1.querySelector('.pillar-badge');
      const port1Rect = port1?.getBoundingClientRect() ?? r1;
      const portY = port1Rect.top + port1Rect.height / 2 - settledOffsetY(card1) + window.scrollY;

      const c1PortX = r1.right + window.scrollX;
      const c2PortX = r2.left + window.scrollX;

      // Left Power Conduit Path
      const p1 = document.createElementNS(SVGNS, 'path');
      p1.setAttribute('d', `M ${centerGapX} ${portY} L ${c1PortX} ${portY}`);
      p1.setAttribute('class', 'flow-line-branch flow-line-branch-left flow-line-branch-pillar');
      branchesRoot.appendChild(p1);
      const p1Len = p1.getTotalLength();
      p1.style.strokeDasharray = `${p1Len}`;
      p1.style.strokeDashoffset = `${p1Len}`;

      // Right Power Conduit Path
      const p2 = document.createElementNS(SVGNS, 'path');
      p2.setAttribute('d', `M ${centerGapX} ${portY} L ${c2PortX} ${portY}`);
      p2.setAttribute('class', 'flow-line-branch flow-line-branch-right flow-line-branch-pillar');
      branchesRoot.appendChild(p2);
      const p2Len = p2.getTotalLength();
      p2.style.strokeDasharray = `${p2Len}`;
      p2.style.strokeDashoffset = `${p2Len}`;

      // Left Terminal Dot on Card 1
      const t1 = document.createElementNS(SVGNS, 'circle');
      t1.setAttribute('cx', String(c1PortX));
      t1.setAttribute('cy', String(portY));
      t1.setAttribute('r', '4');
      t1.setAttribute('class', 'flow-line-terminal-dot flow-line-terminal-left flow-line-terminal-pillar');
      branchesRoot.appendChild(t1);

      // Right Terminal Dot on Card 2
      const t2 = document.createElementNS(SVGNS, 'circle');
      t2.setAttribute('cx', String(c2PortX));
      t2.setAttribute('cy', String(portY));
      t2.setAttribute('r', '4');
      t2.setAttribute('class', 'flow-line-terminal-dot flow-line-terminal-right flow-line-terminal-pillar');
      branchesRoot.appendChild(t2);
    }

    // 2. Purpose & Direction 3-Way Sector Splitter and Combiner Branches
    const sectorGrid = document.getElementById('sector-horizons-grid');
    const secCard0 = sectorGrid?.querySelector<HTMLElement>('.sector-card-0');
    const secCard1 = sectorGrid?.querySelector<HTMLElement>('.sector-card-1');
    const secCard2 = sectorGrid?.querySelector<HTMLElement>('.sector-card-2');
    const secHeading = document.getElementById('sector-horizons-heading');
    const secVision = document.querySelector<HTMLElement>('main .gradient-navy-mesh');

    if (sectorGrid && secCard0 && secCard1 && secCard2 && secHeading && secVision && document.documentElement.clientWidth >= 1024) {
      const hr = secHeading.getBoundingClientRect();
      const gr = sectorGrid.getBoundingClientRect();
      const vr = secVision.getBoundingClientRect();
      const c0r = secCard0.getBoundingClientRect();
      const c2r = secCard2.getBoundingClientRect();

      const topY = (hr.bottom + gr.top) / 2 + window.scrollY;
      const botY = (gr.bottom + vr.top) / 2 + window.scrollY;
      const cx = screenCenterX();
      const c0x = c0r.left + c0r.width / 2 + window.scrollX;
      const c2x = c2r.left + c2r.width / 2 + window.scrollX;

      // Left Branch: Splitter cx -> Card 0 Center X -> Down Card 0 -> Combiner cx
      const leftBranch = document.createElementNS(SVGNS, 'path');
      leftBranch.setAttribute('d', `M ${cx} ${topY} H ${c0x} V ${botY} H ${cx}`);
      leftBranch.setAttribute('class', 'flow-line-branch flow-line-branch-left flow-line-branch-sector');
      branchesRoot.appendChild(leftBranch);
      const lLen = leftBranch.getTotalLength();
      leftBranch.style.strokeDasharray = `${lLen}`;
      leftBranch.style.strokeDashoffset = `${lLen}`;

      // Right Branch: Splitter cx -> Card 2 Center X -> Down Card 2 -> Combiner cx
      const rightBranch = document.createElementNS(SVGNS, 'path');
      rightBranch.setAttribute('d', `M ${cx} ${topY} H ${c2x} V ${botY} H ${cx}`);
      rightBranch.setAttribute('class', 'flow-line-branch flow-line-branch-right flow-line-branch-sector');
      branchesRoot.appendChild(rightBranch);
      const rLen = rightBranch.getTotalLength();
      rightBranch.style.strokeDasharray = `${rLen}`;
      rightBranch.style.strokeDashoffset = `${rLen}`;

      // Terminal status dots on Card 0 and Card 2 badges
      const badge0 = secCard0.querySelector('.sector-badge');
      const badge0r = badge0?.getBoundingClientRect() ?? c0r;
      const badge0Y = badge0r.top + badge0r.height / 2 + window.scrollY;

      const t0 = document.createElementNS(SVGNS, 'circle');
      t0.setAttribute('cx', String(c0x));
      t0.setAttribute('cy', String(badge0Y));
      t0.setAttribute('r', '4');
      t0.setAttribute('class', 'flow-line-terminal-dot flow-line-terminal-sector-0');
      branchesRoot.appendChild(t0);

      const t2 = document.createElementNS(SVGNS, 'circle');
      t2.setAttribute('cx', String(c2x));
      t2.setAttribute('cy', String(badge0Y));
      t2.setAttribute('r', '4');
      t2.setAttribute('class', 'flow-line-terminal-dot flow-line-terminal-sector-2');
      branchesRoot.appendChild(t2);
    }
  }

  function measure() {
    const milestones = buildMilestones();
    const points: Point[] = [];
    const withPoints: Milestone[] = [];
    for (const m of milestones) {
      const p = m.getPoint();
      if (p) {
        points.push(p);
        withPoints.push(m);
      }
    }

    currentMilestonesWithPoints = withPoints;
    const { points: expandedPoints, indexMap } = toOrthogonal(points);
    built = buildRoundedPath(expandedPoints, CORNER_RADIUS);
    milestoneCumulative = indexMap.map((expandedIdx) => built.cumulativeLengths[expandedIdx]);

    activationScrollY = withPoints.map((_, i) => points[i].y - window.innerHeight * ACTIVATION_FRACTION);

    renderDots(withPoints, points);
    renderBranches();
    flourishes = buildFlourishes();
  }

  // Maps an arbitrary page-Y (not necessarily any milestone's own position)
  // to the path length that would be drawn once scroll brings that Y to the
  // same activation point milestones use — lets flourishes with no path
  // vertex of their own (the Challenge pointers) trigger at the correct
  // moment instead of guessing a fraction between two distant milestones.
  function lengthForScrollY(scrollY: number): number {
    if (activationScrollY.length === 0) return 0;
    if (scrollY <= activationScrollY[0]) return 0;
    const last = activationScrollY.length - 1;
    if (scrollY >= activationScrollY[last]) return built.totalLength;
    for (let i = 0; i < last; i++) {
      if (scrollY >= activationScrollY[i] && scrollY <= activationScrollY[i + 1]) {
        const span = activationScrollY[i + 1] - activationScrollY[i];
        const t = span < 1e-6 ? 1 : (scrollY - activationScrollY[i]) / span;
        return milestoneCumulative[i] + (milestoneCumulative[i + 1] - milestoneCumulative[i]) * t;
      }
    }
    return built.totalLength;
  }

  function buildFlourishes(): Flourish[] {
    return [];
  }

  function updateFlourishes() {
    for (const f of flourishes) {
      f.el.classList.toggle(f.className, currentLength >= f.getTriggerLength() - FLOURISH_LEAD);
    }

    // 1. Power splitter synchronization & dynamic draw-in (Built for Government)
    const splitterIdx = currentMilestonesWithPoints.findIndex((m) => m.key === 'bfg-power-splitter');
    if (splitterIdx >= 0) {
      const splitterAt = milestoneCumulative[splitterIdx] ?? 0;
      const progress = Math.min(1, Math.max(0, (currentLength - splitterAt) / 48));
      const isStarted = currentLength >= splitterAt - 4;

      branchesRoot?.querySelectorAll<SVGPathElement>('.flow-line-branch-pillar').forEach((b) => {
        b.classList.toggle('is-active', isStarted);
        const len = Number(b.style.strokeDasharray || b.getTotalLength());
        if (len > 0) {
          b.style.strokeDashoffset = String(len * (1 - progress));
        }
      });

      const isPowered = progress >= 0.7;
      branchesRoot?.querySelectorAll('.flow-line-terminal-pillar').forEach((d) => d.classList.toggle('is-ignited', isPowered));
      document.querySelectorAll('.pillar-card-1, .pillar-card-2').forEach((c) => c.classList.toggle('is-powered', isPowered));
    }

    // 2. 3-Way sector splitter and combiner dynamic flow animation (Purpose & Direction)
    const padSplitterIdx = currentMilestonesWithPoints.findIndex((m) => m.key === 'pad-3way-splitter');
    const padCombinerIdx = currentMilestonesWithPoints.findIndex((m) => m.key === 'pad-3way-combiner' || m.key === 'pad-combiner-to-rail');
    if (padSplitterIdx >= 0 && padCombinerIdx >= 0) {
      const splitAt = milestoneCumulative[padSplitterIdx] ?? 0;
      const combineAt = milestoneCumulative[padCombinerIdx] ?? 0;
      const span = Math.max(1, combineAt - splitAt);
      const progress = Math.min(1, Math.max(0, (currentLength - splitAt) / span));

      const isStarted = currentLength >= splitAt - 4;
      branchesRoot?.querySelectorAll<SVGPathElement>('.flow-line-branch-sector').forEach((b) => {
        b.classList.toggle('is-active', isStarted);
        const len = Number(b.style.strokeDasharray || b.getTotalLength());
        if (len > 0) {
          b.style.strokeDashoffset = String(len * (1 - progress));
        }
      });

      const isMidway = progress >= 0.15;
      branchesRoot?.querySelectorAll('.flow-line-terminal-sector-0, .flow-line-terminal-sector-2').forEach((d) => d.classList.toggle('is-ignited', isMidway));
      document.querySelectorAll('.sector-card').forEach((c) => c.classList.toggle('is-powered', isMidway));
    }

    // 3. How We Work 4 Principles sequential power activation
    for (let idx = 0; idx < 4; idx++) {
      const pIdx = currentMilestonesWithPoints.findIndex((m) => m.key === `hww-principle-${idx}`);
      if (pIdx >= 0) {
        const pAt = milestoneCumulative[pIdx] ?? 0;
        const isReached = currentLength >= pAt - 8;
        const row = document.getElementById(`principle-row-${idx}`);
        row?.classList.toggle('is-powered', isReached);
        row?.querySelector('.principle-card')?.classList.toggle('is-powered', isReached);
      }
    }

    // 4. The People Behind APLYD 3 Groups sequential power activation
    for (let idx = 0; idx < 3; idx++) {
      const gIdx = currentMilestonesWithPoints.findIndex((m) => m.key === `people-group-${idx}`);
      if (gIdx >= 0) {
        const gAt = milestoneCumulative[gIdx] ?? 0;
        const isReached = currentLength >= gAt - 8;
        const grp = document.getElementById(`people-group-${idx}`);
        grp?.classList.toggle('is-powered', isReached);
        grp?.querySelectorAll('.people-card').forEach((c) => c.classList.toggle('is-powered', isReached));
      }
    }
  }

  function renderDots(milestones: Milestone[], points: Point[]) {
    dotsRoot!.innerHTML = '';
    const SVGNS = 'http://www.w3.org/2000/svg';
    milestones.forEach((m, i) => {
      if (m.dot === false) return;
      const p = points[i];
      const circle = document.createElementNS(SVGNS, 'circle');
      circle.setAttribute('cx', String(p.x));
      circle.setAttribute('cy', String(p.y));
      circle.setAttribute('r', String(DOT_R));
      circle.setAttribute('class', 'flow-line-dot');
      circle.setAttribute('data-flow-dot', m.key);
      circle.setAttribute('data-flow-dot-index', String(i));
      dotsRoot!.appendChild(circle);
    });
  }

  function updateDotOpacity() {
    const dots = dotsRoot!.querySelectorAll<SVGCircleElement>('.flow-line-dot');
    dots.forEach((dot) => {
      const i = Number(dot.getAttribute('data-flow-dot-index'));
      const at = milestoneCumulative[i] ?? 0;
      const alpha = Math.max(0, Math.min(1, (currentLength - (at - 24)) / 24));
      dot.style.opacity = String(alpha);

      if (currentLength >= at - 4 && alpha > 0.6) {
        dot.classList.add('is-ignited');
      } else {
        dot.classList.remove('is-ignited');
      }
    });
  }

  function updateHead() {
    if (!headGroup || !head || !headHalo) return;
    if (currentLength <= 6 || built.totalLength === 0) {
      headGroup.setAttribute('opacity', '0');
      return;
    }
    const pt = pointAtLength(built, currentLength);
    if (pt) {
      headGroup.setAttribute('opacity', '1');
      head.setAttribute('cx', String(pt.x));
      head.setAttribute('cy', String(pt.y));
      headHalo.setAttribute('cx', String(pt.x));
      headHalo.setAttribute('cy', String(pt.y));
    } else {
      headGroup.setAttribute('opacity', '0');
    }
  }

  function updateFinalCard() {
    const finalElements = document.querySelectorAll<HTMLElement>(
      'main section:last-of-type .card-interactive-sheen, main section:last-of-type .final-cta-card, main section:last-of-type .rounded-3xl, section#contact .future-cta__trigger'
    );
    if (finalElements.length === 0 || built.totalLength === 0) return;
    const isReached = currentLength >= built.totalLength - 36;
    finalElements.forEach((el) => {
      el.classList.toggle('is-trail-ignited', isReached);
    });
  }

  function renderAll() {
    path!.setAttribute('d', partialD(built, currentLength));
    updateDotOpacity();
    updateHead();
    updateFinalCard();
    updateFlourishes();
  }

  function tick() {
    currentLength += (targetLength - currentLength) * EASE_K;
    renderAll();

    if (Math.abs(targetLength - currentLength) > REST_EPSILON) {
      raf = requestAnimationFrame(tick);
    } else {
      currentLength = targetLength;
      renderAll();
      running = false;
    }
  }

  function ensureTicking() {
    if (running) return;
    running = true;
    raf = requestAnimationFrame(tick);
  }

  function onScroll() {
    targetLength = lengthForScrollY(window.scrollY);
    ensureTicking();
  }

  let resizeTimer = 0;
  function onResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      measure();
      onScroll();
    }, 120);
  }

  measure();

  if (reduce) {
    currentLength = built.totalLength;
    renderAll();
    window.addEventListener(
      'resize',
      () => {
        measure();
        currentLength = built.totalLength;
        renderAll();
      },
      { passive: true },
    );
    return;
  }

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('load', () => {
    measure();
    onScroll();
  });

  // Debug hook (matches the __flow/__hero convention elsewhere in this
  // codebase) — lets tooling inspect the built path/progress without
  // depending on requestAnimationFrame actually being scheduled.
  (window as unknown as { __flowLine?: unknown }).__flowLine = {
    getBuilt: () => built,
    getActivation: () => activationScrollY,
    getCurrentLength: () => currentLength,
    getTargetLength: () => targetLength,
    getMilestoneCumulative: () => milestoneCumulative,
    lengthForScrollY,
    remeasure: measure,
  };
}
