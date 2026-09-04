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
  curved?: boolean;
  gap?: boolean;
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
export function getContentLeft(): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 64;
  }

  // Measure all container-x elements on the page to find the minimum content text left edge
  const containers = document.querySelectorAll<HTMLElement>('.container-x');
  let minLeft = Infinity;

  for (const c of containers) {
    const rect = c.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const style = window.getComputedStyle(c);
      const pl = parseFloat(style.paddingLeft) || 0;
      const textLeft = rect.left + pl;
      if (textLeft > 0 && textLeft < minLeft) {
        minLeft = textLeft;
      }
    }
  }

  // Fallback: check main headings or content blocks
  if (minLeft === Infinity) {
    const headings = document.querySelectorAll<HTMLElement>('main h1, main h2, main p');
    for (const h of headings) {
      const r = h.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.left > 0 && r.left < minLeft) {
        minLeft = r.left;
      }
    }
  }

  const clientW = document.documentElement.clientWidth;
  return minLeft !== Infinity ? minLeft : Math.max(32, clientW * 0.05);
}

export function railPad(): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 24;
  }

  const contentLeft = getContentLeft();
  const clientW = document.documentElement.clientWidth;

  // 1. Narrow/mobile viewports (< 768px) or extremely tight margin (contentLeft <= 36px):
  // Keep the rail tightly parked against the extreme left edge (8px-10px),
  // leaving comfortable clearance before text starts at 16px - 36px.
  if (clientW < 768 || contentLeft <= 36) {
    return Math.max(8, Math.min(10, Math.floor(contentLeft * 0.35)));
  }

  // 2. Medium and desktop viewports (>= 768px):
  // The rail line and its halo (radius 14px) must have at least 26px of clean margin from contentLeft.
  // When contentLeft is moderate (e.g. 58px on a 1036px screen), place it at ~24px, leaving 34px of clear space!
  // When contentLeft is large (e.g. 160px on wide screen), cap it at 48px.
  const idealGutterPad = Math.floor(contentLeft - 30);
  return Math.max(14, Math.min(48, idealGutterPad));
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
function pushCtaConnection(list: Milestone[], ctaOrGetter: HTMLElement | null | (() => HTMLElement | null), entryRail: 'left' | 'right' = 'left', prefix = 'cta') {
  const getCta = () => (typeof ctaOrGetter === 'function' ? ctaOrGetter() : ctaOrGetter);
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
  const railXFn = entryRail === 'left' ? railLeftX : railRightX;

  if (!isDesktop) {
    // Mobile / Tablet: Clean left rail connection at card level without horizontal text intersection
    list.push({
      key: `${prefix}-cta-mobile-connect`,
      dot: true,
      getPoint: () => {
        const cta = getCta();
        if (!cta) return null;
        const cr = cta.getBoundingClientRect();
        if (cr.height === 0) return null;
        return { x: railLeftX(), y: cr.top + 24 + window.scrollY };
      },
    });
    return;
  }

  // Desktop (lg+): 90-degree jog entering straight through the card border into the interior port
  list.push({
    key: `${prefix}-cta-rail-level`,
    dot: false,
    getPoint: () => {
      const cta = getCta();
      if (!cta) return null;
      const cr = cta.getBoundingClientRect();
      if (cr.height === 0) return null;
      return { x: railXFn(), y: cr.top + 52 + window.scrollY };
    },
  });

  list.push({
    key: `${prefix}-cta-port`,
    dot: true,
    getPoint: () => {
      const cta = getCta();
      if (!cta) return null;
      const cr = cta.getBoundingClientRect();
      if (cr.height === 0) return null;
      const portX = entryRail === 'left'
        ? cr.left + 36 + window.scrollX
        : cr.right - 36 + window.scrollX;
      return { x: portX, y: cr.top + 52 + window.scrollY };
    },
  });
}

// 1. Built for Government: Hero (Left) -> 60/40 Sticky Showcase (Act 1: Stalls -> Act 2: Built for Gov) -> Beyond Gov Monument (Left) -> Final CTA
function buildBuiltForGovMilestones(): Milestone[] {
  const heroH1 = document.querySelector<HTMLElement>('main h1');
  const showcase = document.getElementById('bfg-sticky-showcase');
  const stallsMobile = document.getElementById('stalls-heading-mobile');
  const archMobile = document.getElementById('arch-h2-mobile');
  const sec3 = document.querySelector<HTMLElement>('main .gradient-navy-mesh')?.closest('section') || document.querySelector<HTMLElement>('main section:nth-of-type(3)');
  const cta = document.querySelector<HTMLElement>('main .final-cta-card, main section:last-of-type a');

  const list: Milestone[] = [];
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

  // Hero on Left Rail
  list.push({
    key: 'bfg-hero',
    getPoint: () => {
      if (!heroH1) return null;
      const r = heroH1.getBoundingClientRect();
      return { x: railLeftX(), y: r.top + r.height / 2 + window.scrollY };
    },
  });

  if (isDesktop && showcase) {
    const getShowcaseTop = () => showcase.getBoundingClientRect().top + window.scrollY;
    const getShowcaseHeight = () => Math.max(1, showcase.offsetHeight - window.innerHeight);

    // Act 1: "Why AI stalls inside institutions" on Left Rail
    list.push({
      key: 'bfg-act1-heading',
      dot: true,
      getPoint: () => {
        const top = getShowcaseTop();
        return { x: railLeftX(), y: top + window.innerHeight * 0.45 };
      },
    });

    // Act 2: "What built for government means" on Left Rail
    list.push({
      key: 'bfg-act2-heading',
      dot: true,
      getPoint: () => {
        const top = getShowcaseTop();
        const scrollH = getShowcaseHeight();
        return { x: railLeftX(), y: top + scrollH * 0.55 + window.innerHeight * 0.45 };
      },
    });

    // Showcase exit on Left Rail
    list.push({
      key: 'bfg-showcase-exit',
      dot: false,
      getPoint: () => {
        const top = getShowcaseTop();
        return { x: railLeftX(), y: top + showcase.offsetHeight };
      },
    });
  } else {
    // Mobile / Tablet: Clean sequential milestones on Left Rail
    if (stallsMobile) {
      list.push({
        key: 'bfg-stalls-heading-mobile',
        dot: true,
        getPoint: () => ({ x: railLeftX(), y: stallsMobile.getBoundingClientRect().top + 16 + window.scrollY }),
      });
    }
    if (archMobile) {
      list.push({
        key: 'bfg-arch-heading-mobile',
        dot: true,
        getPoint: () => ({ x: railLeftX(), y: archMobile.getBoundingClientRect().top + 16 + window.scrollY }),
      });
    }
  }

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

// 2. How We Work: Hero (Left) -> 4 Alternating Principle Cards (Zigzags Left <-> Right in gaps on Desktop) -> Final CTA
function buildHowWeWorkMilestones(): Milestone[] {
  const heroH1 = document.querySelector<HTMLElement>('main h1');
  const principles = Array.from(document.querySelectorAll<HTMLElement>('main article.principle-row'));
  const cta = document.querySelector<HTMLElement>('main .final-cta-card, main section:last-of-type a');
  const list: Milestone[] = [];
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

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
    const targetRail: 'left' | 'right' = (isDesktop && idx % 2 !== 0) ? 'right' : 'left';

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

  // Final CTA plugged into card interior
  pushCtaConnection(list, cta, currentRail, 'hww');

  return list;
}

// 3. Purpose & Direction: Hero (Left) -> Mission Monument (Left) -> Sector Heading (Left) -> Top Splitter Manifold (Center on Desktop) -> 3 Sector Stream -> Bottom Combiner Manifold (Center) -> Jog to Left Rail -> Vision Heading (Left Rail) -> Final CTA (Left Rail Plug)
function buildPurposeAndDirectionMilestones(): Milestone[] {
  const heroH1 = document.querySelector<HTMLElement>('main h1');
  const missionText = document.getElementById('mission-text-block') || document.getElementById('siena-mission-stage');
  const visionCard = document.getElementById('siena-vision-image-card');
  const visionText = document.getElementById('vision-text-block') || document.getElementById('siena-vision-stage');
  const sectorGrid = document.getElementById('sector-horizons-section') || document.querySelector<HTMLElement>('[data-sector-prism]');
  const cta = document.querySelector<HTMLElement>('main .final-cta-card');
  const list: Milestone[] = [];

  // 1. Hero on Left Rail
  list.push({
    key: 'pad-hero',
    getPoint: () => {
      if (!heroH1) return null;
      return { x: railLeftX(), y: heroH1.getBoundingClientRect().top + heroH1.getBoundingClientRect().height / 2 + window.scrollY };
    },
  });

  // 2. Mission Section on Left Rail
  if (missionText) {
    const heading = missionText.querySelector('h2');
    list.push({
      key: 'pad-mission',
      dot: true,
      getPoint: () => {
        const hr = heading?.getBoundingClientRect() ?? missionText.getBoundingClientRect();
        return { x: railLeftX(), y: hr.top + 20 + window.scrollY };
      },
    });

    // Smooth horizontal jog across to Right Rail between Mission and Vision
    if (visionCard || visionText) {
      const getJogToVisionY = () => {
        const mr = missionText.getBoundingClientRect();
        const vr = (visionCard || visionText)!.getBoundingClientRect();
        return (mr.bottom + vr.top) / 2 + window.scrollY;
      };

      list.push({
        key: 'pad-jog-vis-start',
        dot: false,
        getPoint: () => ({ x: railLeftX(), y: getJogToVisionY() }),
      });
      list.push({
        key: 'pad-jog-vis-end',
        dot: false,
        getPoint: () => ({ x: railRightX(), y: getJogToVisionY() }),
      });
    }
  }

  // 3. Vision Section on Right Rail (directly following Mission)
  if (visionText) {
    const heading = visionText.querySelector('h2');
    list.push({
      key: 'pad-vision-heading',
      dot: true,
      getPoint: () => {
        const hr = heading?.getBoundingClientRect() ?? visionText.getBoundingClientRect();
        return { x: railRightX(), y: hr.top + 20 + window.scrollY };
      },
    });

    // Smooth horizontal jog back to Left Rail before Sector Horizons
    if (sectorGrid) {
      const getJogToSectorsY = () => {
        const vr = visionText.getBoundingClientRect();
        const sr = sectorGrid.getBoundingClientRect();
        return (vr.bottom + sr.top) / 2 + window.scrollY;
      };

      list.push({
        key: 'pad-jog-sec-start',
        dot: false,
        getPoint: () => ({ x: railRightX(), y: getJogToSectorsY() }),
      });
      list.push({
        key: 'pad-jog-sec-end',
        dot: false,
        getPoint: () => ({ x: railLeftX(), y: getJogToSectorsY() }),
      });
    }
  }

  // 4. Sector Horizons Deck on Left Rail
  if (sectorGrid) {
    list.push({
      key: 'pad-sectors-level',
      dot: true,
      getPoint: () => {
        const gr = sectorGrid.getBoundingClientRect();
        return { x: railLeftX(), y: gr.top + 60 + window.scrollY };
      },
    });
  }

  // 5. Final CTA plugged into card interior
  pushCtaConnection(list, cta, 'left', 'pad');

  return list;
}

// 4. Our Approach: Left Rail Entry -> Sticky Framework Gap -> Right Rail Exit -> CTA
function buildOurApproachMilestones(): Milestone[] {
  const heroH1 = document.querySelector<HTMLElement>('main h1');
  const frameworkOuter = document.querySelector<HTMLElement>('.framework-sticky-outer') || document.getElementById('framework-horizontal-root');
  const cta = document.querySelector<HTMLElement>('main .final-cta-card');
  const list: Milestone[] = [];

  // 1. Hero start point on Left Rail
  list.push({
    key: 'oa-hero',
    getPoint: () => {
      if (!heroH1) return null;
      const hr = heroH1.getBoundingClientRect();
      return { x: railLeftX(), y: hr.top + hr.height / 2 + window.scrollY };
    },
  });

  if (frameworkOuter) {
    // 2. Continuous Left Rail down to the top of the sticky framework container
    list.push({
      key: 'oa-framework-entry',
      dot: false,
      getPoint: () => {
        const fr = frameworkOuter.getBoundingClientRect();
        return { x: railLeftX(), y: fr.top + window.scrollY };
      },
    });

    // 3. Gap across the horizontal framework to the Right Rail exit
    // (Both Card 1 entry trail and Card 4 exit trail are dynamically handled by ApproachStageExplorer.astro)
    list.push({
      key: 'oa-framework-exit',
      gap: true,
      dot: false,
      getPoint: () => {
        const fr = frameworkOuter.getBoundingClientRect();
        return { x: railRightX(), y: fr.bottom + window.scrollY };
      },
    });
  }

  // 4. Final CTA plugged into card interior from Right Rail
  pushCtaConnection(list, cta, 'right', 'oa');

  return list;
}

// 5. 16 Years of Proof: Hero (Left Rail) -> Bedrock Heading (Left Rail) -> The Vertical Trail Dynamically Morphs Into the Semi-Circle Arc -> What APLYD Adds (Left Rail) -> Global Reach Heading -> Global Footprint Map -> Final CTA (Left Rail Plug)
function build16YearsMilestones(): Milestone[] {
  const heroH1 = document.querySelector<HTMLElement>('main h1');
  const bedrockHeading = document.getElementById('bedrock-heading') || document.querySelector<HTMLElement>('#bedrock-section h2');
  const bedrockContainer = document.getElementById('bedrock-interactive-container') || document.getElementById('bedrock-section');
  const addsSection = document.getElementById('aplyd-adds-section');
  const globalHeading = document.getElementById('global-heading') || document.querySelector<HTMLElement>('#global-reach-section h2');
  const matrixWrap = document.getElementById('footprint-matrix-wrap') || document.getElementById('global-map-console') || document.querySelector<HTMLElement>('#global-reach-section');
  const cta = document.querySelector<HTMLElement>('main .final-cta-card, main section:last-of-type a');
  const list: Milestone[] = [];

  // 1. Hero on Left Rail
  list.push({
    key: 'proof-hero',
    getPoint: () => {
      if (!heroH1) return null;
      const r = heroH1.getBoundingClientRect();
      return { x: railLeftX(), y: r.top + r.height / 2 + window.scrollY };
    },
  });

  // 2. Top of Bedrock Section (where the semi-circle starts flush with the rail)
  list.push({
    key: 'proof-bedrock-top',
    dot: false,
    getPoint: () => {
      if (!bedrockContainer) return null;
      const rect = bedrockContainer.getBoundingClientRect();
      return { x: railLeftX(), y: rect.top + window.scrollY };
    },
  });

  // 4. Bottom of Bedrock Section (Gap across the showcase section — NO vertical line drawn here!)
  list.push({
    key: 'proof-bedrock-bottom',
    dot: false,
    gap: true,
    getPoint: () => {
      if (!bedrockContainer) return null;
      const rect = bedrockContainer.getBoundingClientRect();
      return { x: railLeftX(), y: rect.bottom + window.scrollY };
    },
  });

  // 5. What APLYD Adds on Left Rail (picks up seamlessly from the ending of the semi-circle)
  if (addsSection) {
    list.push({
      key: 'proof-adds',
      getPoint: () => {
        const h = addsSection.querySelector('h2') ?? addsSection;
        return { x: railLeftX(), y: h.getBoundingClientRect().top + 16 + window.scrollY };
      },
    });
  }

  // 5. Global Reach Heading on Left Rail
  list.push({
    key: 'proof-global-heading',
    getPoint: () => {
      if (!globalHeading) return null;
      return { x: railLeftX(), y: globalHeading.getBoundingClientRect().top + 16 + window.scrollY };
    },
  });

  // 6. Global Footprint Matrix on Left Rail
  list.push({
    key: 'proof-matrix-left',
    getPoint: () => {
      if (!matrixWrap) return null;
      return { x: railLeftX(), y: matrixWrap.getBoundingClientRect().top + 60 + window.scrollY };
    },
  });

  // 7. Final CTA plugged into card interior
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

// 6b. Our Partners: Hero -> Metrics -> Map -> Central Spine Interconnected Bus (Through Partner Grid Gutter) -> Final CTA
function buildPartnersMilestones(): Milestone[] {
  const heroH1 = document.querySelector<HTMLElement>('main h1');
  const metricsSection = document.getElementById('partners-metrics-section');
  const mapSection = document.getElementById('partner-map-section');
  const networkSection = document.getElementById('regional-network');
  const networkHeading = networkSection?.querySelector('h2');
  const grid = networkSection?.querySelector('.grid');
  const card0 = document.getElementById('partner-card-0');
  const card2 = document.getElementById('partner-card-2');
  const card4 = document.getElementById('partner-card-4');
  const cta = document.querySelector<HTMLElement>('main .final-cta-card, main section:last-of-type a');
  const list: Milestone[] = [];

  // 1. Hero on Left Rail
  list.push({
    key: 'partners-hero',
    getPoint: () => {
      if (!heroH1) return null;
      const r = heroH1.getBoundingClientRect();
      if (r.height === 0) return null;
      return { x: railLeftX(), y: r.top + r.height / 2 + window.scrollY };
    },
  });

  // 2. Metrics Section on Left Rail
  if (metricsSection) {
    list.push({
      key: 'partners-metrics',
      getPoint: () => {
        const r = metricsSection.getBoundingClientRect();
        if (r.height === 0) return null;
        return { x: railLeftX(), y: r.top + 40 + window.scrollY };
      },
    });
  }

  // 3. Map Section on Left Rail
  if (mapSection) {
    list.push({
      key: 'partners-map',
      getPoint: () => {
        const r = mapSection.getBoundingClientRect();
        if (r.height === 0) return null;
        return { x: railLeftX(), y: r.top + 32 + window.scrollY };
      },
    });
  }

  // 4. Central Spine Interconnected Bus (Through Partner Grid Gutter)
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  if (isDesktop && networkSection && grid && card0 && card2 && card4) {
    const getNetworkTopY = () => {
      const nr = networkSection.getBoundingClientRect();
      return nr.top - 24 + window.scrollY;
    };

    const getGridCenterX = () => {
      const gr = grid.getBoundingClientRect();
      return gr.left + gr.width / 2 + window.scrollX;
    };

    // Jog from Left Rail to Centerline ABOVE the title (no vertical line next to title)
    list.push({
      key: 'partners-jog-to-center-start',
      dot: false,
      getPoint: () => ({ x: railLeftX(), y: getNetworkTopY() }),
    });

    list.push({
      key: 'partners-center-entry-dot',
      dot: true,
      getPoint: () => ({ x: getGridCenterX(), y: getNetworkTopY() }),
    });

    // Row 1 Center Node (Between Global Reach & Multi-Region)
    list.push({
      key: 'partners-center-row-0',
      dot: true,
      getPoint: () => {
        const r0 = card0.getBoundingClientRect();
        return { x: getGridCenterX(), y: r0.top + r0.height / 2 + window.scrollY };
      },
    });

    // Row 2 Center Node (Between South Asia & Africa)
    list.push({
      key: 'partners-center-row-1',
      dot: true,
      getPoint: () => {
        const r2 = card2.getBoundingClientRect();
        return { x: getGridCenterX(), y: r2.top + r2.height / 2 + window.scrollY };
      },
    });

    // Row 3 Center Node (Between Americas & MENA)
    list.push({
      key: 'partners-center-row-2',
      dot: true,
      getPoint: () => {
        const r4 = card4.getBoundingClientRect();
        return { x: getGridCenterX(), y: r4.top + r4.height / 2 + window.scrollY };
      },
    });

    const getGridBottomY = () => {
      const gr = grid.getBoundingClientRect();
      return gr.bottom + 28 + window.scrollY;
    };

    list.push({
      key: 'partners-center-exit-dot',
      dot: true,
      getPoint: () => ({ x: getGridCenterX(), y: getGridBottomY() }),
    });

    // Jog back to Left Rail
    list.push({
      key: 'partners-jog-back-to-rail',
      dot: false,
      getPoint: () => ({ x: railLeftX(), y: getGridBottomY() }),
    });
  } else {
    // Mobile: Clean Left Rail alignment
    [card0, card2, card4].forEach((card, idx) => {
      if (card) {
        list.push({
          key: `partners-mobile-row-${idx}`,
          dot: true,
          getPoint: () => {
            const r = card.getBoundingClientRect();
            return { x: railLeftX(), y: r.top + 40 + window.scrollY };
          },
        });
      }
    });
  }

  // 6. Final CTA plugged into card interior from Left Rail
  pushCtaConnection(list, cta, 'left', 'partners');

  return list;
}

// 7. Our Capabilities (Overview): Hero (Left) -> Top Splitter Manifold (Center on Desktop) -> 3 Sector Triad -> Bottom Combiner Manifold (Center) -> Jog to Left Rail -> Final CTA (Left Rail Plug)
function buildCapabilitiesOverviewMilestones(): Milestone[] {
  const heroH1 = document.querySelector<HTMLElement>('main h1');
  const sec = document.getElementById('sector-overview-section');
  const grid = document.getElementById('sector-overview-grid') || sec?.querySelector('.grid');
  const cta = document.querySelector<HTMLElement>('main .final-cta-card');
  const list: Milestone[] = [];
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

  list.push({
    key: 'cap-hero',
    getPoint: () => {
      if (!heroH1) return null;
      return { x: railLeftX(), y: heroH1.getBoundingClientRect().top + heroH1.getBoundingClientRect().height / 2 + window.scrollY };
    },
  });

  if (isDesktop && grid) {
    const getTopSplitterY = () => {
      const gr = grid.getBoundingClientRect();
      return gr.top - 36 + window.scrollY;
    };

    list.push({
      key: 'cap-split-jog-start',
      dot: false,
      getPoint: () => ({ x: railLeftX(), y: getTopSplitterY() }),
    });
    list.push({
      key: 'cap-3way-splitter',
      getPoint: () => ({ x: screenCenterX(), y: getTopSplitterY() }),
    });

    // Center Channel travels through Card 1 (Nonprofits)
    list.push({
      key: 'cap-sectors-mid-dot',
      getPoint: () => {
        const gr = grid.getBoundingClientRect();
        return { x: screenCenterX(), y: gr.top + gr.height * 0.48 + window.scrollY };
      },
    });

    const getBottomCombinerY = () => {
      const gr = grid.getBoundingClientRect();
      return gr.bottom + 36 + window.scrollY;
    };

    list.push({
      key: 'cap-3way-combiner',
      dot: false,
      getPoint: () => ({ x: screenCenterX(), y: getBottomCombinerY() }),
    });
    list.push({
      key: 'cap-combiner-to-rail',
      dot: false,
      getPoint: () => ({ x: railLeftX(), y: getBottomCombinerY() }),
    });
  }

  pushCtaConnection(list, cta, 'left', 'cap');
  return list;
}

function getVisibleSectorHeroH1(): HTMLElement | null {
  const activeHero = document.querySelector<HTMLElement>('.sector-hero-block:not(.hidden) h1, .sector-hero-block:not([style*="display: none"]) h1');
  if (activeHero && activeHero.getBoundingClientRect().height > 0) {
    return activeHero;
  }
  const allH1s = Array.from(document.querySelectorAll<HTMLElement>('main h1'));
  return allH1s.find((h) => h.getBoundingClientRect().height > 0) || allH1s[0] || null;
}

function getVisibleHorizonDeck(): HTMLElement | null {
  const visibleBody = document.querySelector<HTMLElement>('.sector-body-block:not(.hidden), .sector-body-block:not([style*="display: none"])');
  if (visibleBody) {
    const deck = visibleBody.querySelector<HTMLElement>('.horizon-deck, .kinetic-horizon-studio');
    if (deck) return deck;
  }
  return document.querySelector<HTMLElement>('.horizon-deck, .kinetic-horizon-studio');
}

function getVisibleSectorCta(): HTMLElement | null {
  const visibleCta = document.querySelector<HTMLElement>('.sector-cta-block:not(.hidden) .final-cta-card, .sector-cta-block:not([style*="display: none"]) .final-cta-card');
  if (visibleCta && visibleCta.getBoundingClientRect().height > 0) {
    return visibleCta;
  }
  const allCards = Array.from(document.querySelectorAll<HTMLElement>('.final-cta-card'));
  return allCards.find((c) => c.offsetParent !== null && c.getBoundingClientRect().height > 0) || document.querySelector<HTMLElement>('main .final-cta-card');
}

// 8. Sector Capabilities Dedicated Hubs (Government, Nonprofits, Philanthropy): Clean Left Rail Spine with Horizon Alignment
function buildSectorCapabilitiesMilestones(): Milestone[] {
  const list: Milestone[] = [];

  // 1. Hero start point on Left Rail (dynamic to active visible sector H1)
  list.push({
    key: 'sec-hero',
    getPoint: () => {
      const heroH1 = getVisibleSectorHeroH1();
      if (!heroH1) return null;
      const r = heroH1.getBoundingClientRect();
      if (r.height === 0) return null;
      return { x: railLeftX(), y: r.top + r.height / 2 + window.scrollY };
    },
  });

  // 2. Sector Capabilities Lead text on Left Rail
  list.push({
    key: 'sec-lead-anchor',
    getPoint: () => {
      const visibleBody = document.querySelector<HTMLElement>('.sector-body-block:not(.hidden), .sector-body-block:not([style*="display: none"])');
      const lead = visibleBody?.querySelector('p');
      if (!lead) return null;
      const lr = lead.getBoundingClientRect();
      if (lr.height === 0) return null;
      return { x: railLeftX(), y: lr.top + 16 + window.scrollY };
    },
  });

  // 3. Kinetic Horizon Deck Anchor along Left Rail
  list.push({
    key: 'sec-horizon-entry',
    getPoint: () => {
      const deck = getVisibleHorizonDeck();
      if (!deck) return null;
      const dr = deck.getBoundingClientRect();
      if (dr.height === 0) return null;
      return { x: railLeftX(), y: dr.top + 80 + window.scrollY };
    },
  });

  list.push({
    key: 'sec-horizon-mid',
    getPoint: () => {
      const deck = getVisibleHorizonDeck();
      if (!deck) return null;
      const dr = deck.getBoundingClientRect();
      if (dr.height === 0) return null;
      return { x: railLeftX(), y: dr.top + dr.height / 2 + window.scrollY };
    },
  });

  pushCtaConnection(list, getVisibleSectorCta, 'left', 'sec');
  return list;
}

function getVisibleCaseStudyDossiers(): HTMLElement[] {
  const visibleBody = document.querySelector<HTMLElement>('.ai-body-block:not(.hidden)');
  if (visibleBody) {
    return Array.from(visibleBody.querySelectorAll<HTMLElement>('.case-study-editorial'));
  }
  return Array.from(document.querySelectorAll<HTMLElement>('.case-study-editorial')).filter(
    (c) => c.offsetParent !== null && c.getBoundingClientRect().height > 0
  );
}

function getVisibleAiCta(): HTMLElement | null {
  const visibleCta = document.querySelector<HTMLElement>('.final-cta-card');
  if (visibleCta && visibleCta.getBoundingClientRect().height > 0) {
    return visibleCta;
  }
  return document.querySelector<HTMLElement>('main .final-cta-card, main section:last-of-type a');
}

// 9. AI in Action Directory Hub (/ai-in-action) — 3-Column Serpentine Circuit Weave
function buildAiInActionDirectoryMilestones(): Milestone[] {
  const heroH1 = document.querySelector<HTMLElement>('main h1');
  const cta = document.querySelector<HTMLElement>('main .final-cta-card');
  const list: Milestone[] = [];

  list.push({
    key: 'ai-dir-hero',
    getPoint: () => {
      if (!heroH1) return null;
      return { x: railLeftX(), y: heroH1.getBoundingClientRect().top + heroH1.getBoundingClientRect().height / 2 + window.scrollY };
    },
  });

  const isDesktop = () => document.documentElement.clientWidth >= 1024;

  const getCardCenter = (idx: number) => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.ai-directory-card'));
    const card = cards[idx];
    if (!card) return null;
    const cr = card.getBoundingClientRect();
    if (cr.height === 0) return null;
    return {
      x: cr.left + cr.width / 2 + window.scrollX,
      y: cr.top + cr.height / 2 + window.scrollY,
    };
  };

  if (typeof window !== 'undefined' && isDesktop()) {
    // Desktop: Serpentine Weave across 3-Column Grid
    // Row 1: Left (Card 0: Education) -> Center (Card 1: Agriculture) -> Right (Card 2: MSMEs)
    // Row 2: Right (Card 5: M&E) -> Center (Card 4: Public Services) -> Left (Card 3: Utilities)
    
    // Top Row: 0 -> 1 -> 2
    [0, 1, 2].forEach((idx) => {
      list.push({
        key: `ai-dir-card-${idx}`,
        getPoint: () => getCardCenter(idx),
      });
    });

    // Bottom Row: 5 -> 4 -> 3
    [5, 4, 3].forEach((idx) => {
      list.push({
        key: `ai-dir-card-${idx}`,
        getPoint: () => getCardCenter(idx),
      });
    });

    // Drop down Left Rail before final CTA plug
    list.push({
      key: 'ai-dir-post-grid-jog',
      dot: false,
      getPoint: () => {
        const c3 = getCardCenter(3);
        if (!c3) return null;
        return { x: railLeftX(), y: c3.y + 120 };
      },
    });
  } else {
    // Mobile / Tablet: Sequential Rail Track
    for (let idx = 0; idx < 6; idx++) {
      list.push({
        key: `ai-dir-card-${idx}`,
        getPoint: () => {
          const cards = Array.from(document.querySelectorAll<HTMLElement>('.ai-directory-card'));
          const card = cards[idx];
          if (!card) return null;
          const cr = card.getBoundingClientRect();
          if (cr.height === 0) return null;
          return { x: railLeftX(), y: cr.top + 48 + window.scrollY };
        },
      });
    }
  }

  pushCtaConnection(list, cta, 'left', 'ai-dir');
  return list;
}

function getVisibleAiHeroH1(): HTMLElement | null {
  const activeHero = document.querySelector<HTMLElement>('.ai-hero-block:not(.hidden) h1, .ai-hero-block:not([style*="display: none"]) h1');
  if (activeHero && activeHero.getBoundingClientRect().height > 0) {
    return activeHero;
  }
  const allH1s = Array.from(document.querySelectorAll<HTMLElement>('main h1'));
  return allH1s.find((h) => h.getBoundingClientRect().height > 0) || allH1s[0] || null;
}

// 10. AI in Action Dedicated Category Case Studies (/ai-in-action/[category]) — Multi-Act Narrative S-Weave
function buildAiInActionCategoryMilestones(): Milestone[] {
  const list: Milestone[] = [];
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

  list.push({
    key: 'ai-cat-hero',
    getPoint: () => {
      const heroH1 = getVisibleAiHeroH1();
      if (!heroH1) return null;
      const r = heroH1.getBoundingClientRect();
      if (r.height === 0) return null;
      return { x: railLeftX(), y: r.top + r.height / 2 + window.scrollY };
    },
  });

  const dossiers = getVisibleCaseStudyDossiers();
  dossiers.forEach((dossier, idx) => {
    // Act 1: Dossier Header on Left Rail
    list.push({
      key: `ai-dossier-${idx}-header`,
      getPoint: () => {
        const liveDossiers = getVisibleCaseStudyDossiers();
        const d = liveDossiers[idx] || dossier;
        if (!d) return null;
        const hr = d.querySelector('.dossier-header-block')?.getBoundingClientRect() ?? d.getBoundingClientRect();
        if (hr.height === 0) return null;
        return { x: railLeftX(), y: hr.top + 28 + window.scrollY };
      },
    });

    if (isDesktop) {
      // Act 2: Metadata Ribbon Horizontal Traverse (Left Rail -> Right Rail)
      list.push({
        key: `ai-dossier-${idx}-ribbon-start`,
        dot: false,
        getPoint: () => {
          const liveDossiers = getVisibleCaseStudyDossiers();
          const d = liveDossiers[idx] || dossier;
          if (!d) return null;
          const rr = d.querySelector('.dossier-ribbon-block')?.getBoundingClientRect();
          if (!rr || rr.height === 0) return null;
          return { x: railLeftX(), y: rr.top + rr.height / 2 + window.scrollY };
        },
      });

      list.push({
        key: `ai-dossier-${idx}-ribbon-end`,
        dot: true,
        getPoint: () => {
          const liveDossiers = getVisibleCaseStudyDossiers();
          const d = liveDossiers[idx] || dossier;
          if (!d) return null;
          const rr = d.querySelector('.dossier-ribbon-block')?.getBoundingClientRect();
          if (!rr || rr.height === 0) return null;
          return { x: railRightX(), y: rr.top + rr.height / 2 + window.scrollY };
        },
      });

      // Act 3: Institutional Delivery (Right Rail)
      list.push({
        key: `ai-dossier-${idx}-delivery`,
        getPoint: () => {
          const liveDossiers = getVisibleCaseStudyDossiers();
          const d = liveDossiers[idx] || dossier;
          if (!d) return null;
          const delBox = d.querySelector('.dossier-delivery-box')?.getBoundingClientRect();
          if (!delBox || delBox.height === 0) return null;
          return { x: railRightX(), y: delBox.top + 50 + window.scrollY };
        },
      });

      // Act 3 Jog: Cross from Right Rail to Left Rail between 2-col grid and impact monument
      list.push({
        key: `ai-dossier-${idx}-cross-jog-right`,
        dot: false,
        getPoint: () => {
          const liveDossiers = getVisibleCaseStudyDossiers();
          const d = liveDossiers[idx] || dossier;
          if (!d) return null;
          const delBox = d.querySelector('.dossier-delivery-box')?.getBoundingClientRect();
          const impBox = d.querySelector('.dossier-impact-box')?.getBoundingClientRect();
          if (!delBox || !impBox) return null;
          const gapY = (delBox.bottom + impBox.top) / 2 + window.scrollY;
          return { x: railRightX(), y: gapY };
        },
      });

      list.push({
        key: `ai-dossier-${idx}-cross-jog-left`,
        dot: false,
        getPoint: () => {
          const liveDossiers = getVisibleCaseStudyDossiers();
          const d = liveDossiers[idx] || dossier;
          if (!d) return null;
          const delBox = d.querySelector('.dossier-delivery-box')?.getBoundingClientRect();
          const impBox = d.querySelector('.dossier-impact-box')?.getBoundingClientRect();
          if (!delBox || !impBox) return null;
          const gapY = (delBox.bottom + impBox.top) / 2 + window.scrollY;
          return { x: railLeftX(), y: gapY };
        },
      });
    }

    // Act 4: Public Value & Lasting Impact Callout on Left Rail
    list.push({
      key: `ai-dossier-${idx}-impact`,
      getPoint: () => {
        const liveDossiers = getVisibleCaseStudyDossiers();
        const d = liveDossiers[idx] || dossier;
        if (!d) return null;
        const impBox = d.querySelector('.dossier-impact-box')?.getBoundingClientRect();
        if (!impBox || impBox.height === 0) return null;
        return { x: railLeftX(), y: impBox.top + 50 + window.scrollY };
      },
    });
  });

  pushCtaConnection(list, getVisibleAiCta, 'left', 'ai-cat');
  return list;
}

// 11. Dedicated Contact Page Milestone Generator (/contact)
// Clean single-rail left spine that frames the narrative down the left rail,
// perfectly aligned with the hero H1, Direct Channels card, and Our Offices,
// without slicing across the interactive contact form or map.
function buildContactMilestones(): Milestone[] {
  const heroH1 = document.querySelector<HTMLElement>('main h1');
  const directChannelsH2 = document.getElementById('contact-form-h2') || document.querySelector<HTMLElement>('h2#contact-form-h2');
  const officesH2 = document.getElementById('offices-h2') || document.querySelector<HTMLElement>('h2#offices-h2');
  const officeAddress = document.querySelector<HTMLElement>('[data-office-address]');
  const list: Milestone[] = [];

  // 1. Hero H1 on Left Rail
  list.push({
    key: 'contact-hero',
    getPoint: () => {
      if (!heroH1) return null;
      const r = heroH1.getBoundingClientRect();
      return { x: railLeftX(), y: r.top + r.height / 2 + window.scrollY };
    },
  });

  // 2. Direct Channels Heading on Left Rail
  list.push({
    key: 'contact-direct-channels',
    getPoint: () => {
      if (!directChannelsH2) return null;
      const r = directChannelsH2.getBoundingClientRect();
      return { x: railLeftX(), y: r.top + 16 + window.scrollY };
    },
  });

  // 3. Our Offices Heading on Left Rail
  list.push({
    key: 'contact-offices-heading',
    getPoint: () => {
      if (!officesH2) return null;
      const r = officesH2.getBoundingClientRect();
      return { x: railLeftX(), y: r.top + 16 + window.scrollY };
    },
  });

  // 4. Terminal milestone at office location info on Left Rail
  list.push({
    key: 'contact-offices-terminal',
    dot: true,
    getPoint: () => {
      if (!officeAddress) return null;
      const r = officeAddress.getBoundingClientRect();
      return { x: railLeftX(), y: r.top + r.height / 2 + window.scrollY };
    },
  });

  return list;
}

// 12. Dedicated Articles & Journal Milestone Generator (/insights/articles)
function buildArticlesMilestones(): Milestone[] {
  const heroH1 = document.querySelector<HTMLElement>('main h1');
  const coverStory = document.getElementById('cover-story-section');
  const archiveSec = document.getElementById('articles-archive-section');
  const archiveH2 = archiveSec?.querySelector('h2');
  const grid = document.getElementById('articles-grid');
  const cta = document.querySelector<HTMLElement>('main .final-cta-card');
  const list: Milestone[] = [];

  // 1. Hero on Left Rail
  list.push({
    key: 'articles-hero',
    getPoint: () => {
      if (!heroH1) return null;
      return { x: railLeftX(), y: heroH1.getBoundingClientRect().top + heroH1.getBoundingClientRect().height / 2 + window.scrollY };
    },
  });

  // 2. Cover Story on Left Rail
  if (coverStory) {
    list.push({
      key: 'articles-cover-story',
      getPoint: () => {
        const r = coverStory.getBoundingClientRect();
        return { x: railLeftX(), y: r.top + 80 + window.scrollY };
      },
    });

    // Smooth horizontal jog across to Right Rail between Cover Story and Archive
    const getTransitionY = () => {
      const cr = coverStory.getBoundingClientRect();
      const ar = archiveSec ? archiveSec.getBoundingClientRect() : cr;
      return (cr.bottom + ar.top) / 2 + window.scrollY;
    };

    list.push({
      key: 'articles-jog-start',
      dot: false,
      getPoint: () => ({ x: railLeftX(), y: getTransitionY() }),
    });
    list.push({
      key: 'articles-jog-end',
      dot: false,
      getPoint: () => ({ x: railRightX(), y: getTransitionY() }),
    });
  }

  // 3. Archive Heading on Right Rail
  if (archiveH2) {
    list.push({
      key: 'articles-archive-heading',
      getPoint: () => {
        const r = archiveH2.getBoundingClientRect();
        return { x: railRightX(), y: r.top + 16 + window.scrollY };
      },
    });
  }

  // 4. Continue down Right Rail alongside the 3-column articles grid
  if (grid) {
    list.push({
      key: 'articles-grid-mid',
      dot: false,
      getPoint: () => {
        const r = grid.getBoundingClientRect();
        return { x: railRightX(), y: r.top + r.height * 0.5 + window.scrollY };
      },
    });
    list.push({
      key: 'articles-grid-end',
      dot: false,
      getPoint: () => {
        const r = grid.getBoundingClientRect();
        return { x: railRightX(), y: r.bottom - 40 + window.scrollY };
      },
    });
  }

  // 5. Final CTA plugged into card interior
  pushCtaConnection(list, cta, 'right', 'articles');

  return list;
}

// 13. Dedicated Research & Reports Milestone Generator (/insights/research-and-reports)
function buildResearchMilestones(): Milestone[] {
  const heroH1 = document.querySelector<HTMLElement>('main h1');
  const flagshipSec = document.getElementById('flagship-report-section');
  const repoSec = document.getElementById('reports-section');
  const repoH2 = repoSec?.querySelector('h2');
  const grid = document.getElementById('reports-grid');
  const cta = document.querySelector<HTMLElement>('main .final-cta-card');
  const list: Milestone[] = [];

  // 1. Hero on Left Rail
  list.push({
    key: 'research-hero',
    getPoint: () => {
      if (!heroH1) return null;
      return { x: railLeftX(), y: heroH1.getBoundingClientRect().top + heroH1.getBoundingClientRect().height / 2 + window.scrollY };
    },
  });

  // 2. Flagship Benchmark on Left Rail
  if (flagshipSec) {
    list.push({
      key: 'research-flagship',
      getPoint: () => {
        const r = flagshipSec.getBoundingClientRect();
        return { x: railLeftX(), y: r.top + 80 + window.scrollY };
      },
    });

    // Smooth horizontal jog across to Right Rail between Flagship and Publications
    const getTransitionY = () => {
      const fr = flagshipSec.getBoundingClientRect();
      const rr = repoSec ? repoSec.getBoundingClientRect() : fr;
      return (fr.bottom + rr.top) / 2 + window.scrollY;
    };

    list.push({
      key: 'research-jog-start',
      dot: false,
      getPoint: () => ({ x: railLeftX(), y: getTransitionY() }),
    });
    list.push({
      key: 'research-jog-end',
      dot: false,
      getPoint: () => ({ x: railRightX(), y: getTransitionY() }),
    });
  }

  // 3. Publications Heading on Right Rail
  if (repoH2) {
    list.push({
      key: 'research-repo-heading',
      getPoint: () => {
        const r = repoH2.getBoundingClientRect();
        return { x: railRightX(), y: r.top + 16 + window.scrollY };
      },
    });
  }

  // 4. Continue down Right Rail alongside the Publications grid
  if (grid) {
    list.push({
      key: 'research-grid-mid',
      dot: false,
      getPoint: () => {
        const r = grid.getBoundingClientRect();
        return { x: railRightX(), y: r.top + r.height * 0.5 + window.scrollY };
      },
    });
    list.push({
      key: 'research-grid-end',
      dot: false,
      getPoint: () => {
        const r = grid.getBoundingClientRect();
        return { x: railRightX(), y: r.bottom - 40 + window.scrollY };
      },
    });
  }

  // 5. Final CTA plugged into card interior
  pushCtaConnection(list, cta, 'right', 'research');

  return list;
}

// 14. Dedicated News & Updates Milestone Generator (/insights/news-and-updates)
function buildNewsMilestones(): Milestone[] {
  const heroH1 = document.querySelector<HTMLElement>('main h1');
  const newsSec = document.getElementById('news-section');
  const mediaCard = document.getElementById('media-inquiry-card');
  const newsItems = Array.from(document.querySelectorAll<HTMLElement>('.news-item'));
  const cta = document.querySelector<HTMLElement>('main .final-cta-card');
  const list: Milestone[] = [];
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

  // 1. Hero on Left Rail
  list.push({
    key: 'news-hero',
    getPoint: () => {
      if (!heroH1) return null;
      return { x: railLeftX(), y: heroH1.getBoundingClientRect().top + heroH1.getBoundingClientRect().height / 2 + window.scrollY };
    },
  });

  if (isDesktop && mediaCard) {
    const track = document.getElementById('media-sidebar-track') || mediaCard;
    const getTopJogY = () => {
      const tr = track.getBoundingClientRect();
      return tr.top - 40 + window.scrollY;
    };
    const getCardCenterX = () => {
      const tr = track.getBoundingClientRect();
      return tr.left + tr.width / 2 + window.scrollX;
    };
    const getCardTopY = () => {
      const tr = track.getBoundingClientRect();
      return tr.top + window.scrollY;
    };

    // 2. Horizontal jog across top of section directly to the middle top X of the card
    list.push({
      key: 'news-jog-top-start',
      dot: false,
      getPoint: () => ({ x: railLeftX(), y: getTopJogY() }),
    });
    list.push({
      key: 'news-jog-top-end',
      dot: false,
      getPoint: () => ({ x: getCardCenterX(), y: getTopJogY() }),
    });

    // 3. Connect straight DOWN into the MIDDLE TOP of the card!
    list.push({
      key: 'news-card-top-dock',
      dot: true,
      getPoint: () => ({ x: getCardCenterX(), y: getCardTopY() }),
    });

    // 4. Trail continues straight down the column as the card moves down with scroll leaving behind the trail
    if (newsItems.length > 2) {
      const midItem = newsItems[Math.floor(newsItems.length / 2)];
      list.push({
        key: 'news-stream-mid',
        dot: false,
        getPoint: () => {
          const ir = midItem.getBoundingClientRect();
          return { x: getCardCenterX(), y: ir.top + ir.height / 2 + window.scrollY };
        },
      });

      const lastItem = newsItems[newsItems.length - 1];
      list.push({
        key: 'news-stream-lower',
        dot: false,
        getPoint: () => {
          const ir = lastItem.getBoundingClientRect();
          return { x: getCardCenterX(), y: ir.bottom - 40 + window.scrollY };
        },
      });
    }

    // 5. Lastly, connects straight down into the final CTA card (no stray right-hand rail line!)
    list.push({
      key: 'news-cta-top',
      dot: false,
      getPoint: () => {
        if (!cta) return null;
        const cr = cta.getBoundingClientRect();
        return { x: getCardCenterX(), y: cr.top + window.scrollY };
      },
    });

    list.push({
      key: 'news-cta-port',
      dot: true,
      getPoint: () => {
        if (!cta) return null;
        const cr = cta.getBoundingClientRect();
        return { x: getCardCenterX(), y: cr.top + 48 + window.scrollY };
      },
    });
  } else {
    // Mobile / Tablet: Left rail stream to CTA
    if (newsItems.length > 0) {
      const firstItem = newsItems[0];
      list.push({
        key: 'news-stream-start',
        getPoint: () => {
          const r = firstItem.getBoundingClientRect();
          return { x: railLeftX(), y: r.top + 36 + window.scrollY };
        },
      });

      const midIndex = Math.floor(newsItems.length / 2);
      const midItem = newsItems[midIndex];
      list.push({
        key: 'news-stream-mid',
        dot: false,
        getPoint: () => {
          const r = midItem.getBoundingClientRect();
          return { x: railLeftX(), y: r.top + r.height / 2 + window.scrollY };
        },
      });

      const lastItem = newsItems[newsItems.length - 1];
      list.push({
        key: 'news-stream-end',
        dot: false,
        getPoint: () => {
          const r = lastItem.getBoundingClientRect();
          return { x: railLeftX(), y: r.bottom - 40 + window.scrollY };
        },
      });
    }

    pushCtaConnection(list, cta, 'left', 'news');
  }

  return list;
}

// 15. Intelligent Multi-Rail General Subpage Generator (For Careers, etc.)
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

  const lastSec = validSections.length > 0 ? validSections[validSections.length - 1] : null;
  const bottomCta = lastSec?.querySelector<HTMLElement>('.final-cta-card, a.btn, a[href*="/contact"], .future-cta__trigger');
  if (bottomCta && list.length > 0) {
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
      if (pts.length) return pts[pts.length - 1].y;
      const flowSec = document.getElementById('flow') || document.querySelector('[data-flow2]');
      if (flowSec) {
        const r = flowSec.getBoundingClientRect();
        return r.top + r.height / 2 + window.scrollY;
      }
      return null;
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
  if (pathname.includes('/about/our-partners')) {
    return buildPartnersMilestones();
  }
  if (pathname.includes('/services/our-approach')) {
    return buildOurApproachMilestones();
  }
  if (document.getElementById('sector-overview-grid') !== null || pathname.endsWith('/services/our-capabilities') || pathname.endsWith('/services/our-capabilities/')) {
    return buildCapabilitiesOverviewMilestones();
  }
  if (document.querySelector('[data-sector-view]') !== null || pathname.includes('/services/our-capabilities/')) {
    return buildSectorCapabilitiesMilestones();
  }
  if (document.getElementById('ai-directory-grid') !== null || pathname === '/ai-in-action' || pathname === '/ai-in-action/') {
    return buildAiInActionDirectoryMilestones();
  }
  if (document.querySelector('[data-ai-category-view]') !== null || pathname.includes('/ai-in-action/')) {
    return buildAiInActionCategoryMilestones();
  }
  if (document.getElementById('contact-form') !== null || pathname.includes('/contact')) {
    return buildContactMilestones();
  }
  if (pathname.includes('/insights/articles') || (pathname.includes('/insights') && document.getElementById('articles-archive-section') !== null)) {
    return buildArticlesMilestones();
  }
  if (pathname.includes('/insights/research-and-reports') || document.getElementById('flagship-report-section') !== null) {
    return buildResearchMilestones();
  }
  if (pathname.includes('/insights/news-and-updates') || document.getElementById('news-section') !== null) {
    return buildNewsMilestones();
  }

  // 3. Fallback for other subpages (Careers, etc.)
  return buildGeneralSubpageMilestones();
}

let activeFlowLineInstance: { remeasure: () => void } | null = null;

if (typeof document !== 'undefined') {
  document.addEventListener('astro:before-swap', () => {
    activeFlowLineInstance = null;
  });
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

  if (activeFlowLineInstance && svg.dataset.flowLineInit === 'true') {
    activeFlowLineInstance.remeasure();
    return;
  }
  svg.dataset.flowLineInit = 'true';

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

  interface ActiveBranch {
    pathEl: SVGPathElement;
    built: BuiltPath;
    startKey: string;
    endKey: string;
  }
  let activeBranches: ActiveBranch[] = [];

  function renderBranches() {
    if (!branchesRoot) return;
    branchesRoot.innerHTML = '';
    activeBranches = [];
    const SVGNS = 'http://www.w3.org/2000/svg';



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
      leftBranch.setAttribute('class', 'flow-line-branch flow-line-branch-left flow-line-branch-sector');
      branchesRoot.appendChild(leftBranch);
      const bLeft = buildRoundedPath(toOrthogonal([{ x: cx, y: topY }, { x: c0x, y: topY }, { x: c0x, y: botY }, { x: cx, y: botY }]).points, CORNER_RADIUS);
      activeBranches.push({ pathEl: leftBranch, built: bLeft, startKey: 'pad-3way-splitter', endKey: 'pad-3way-combiner' });

      // Right Branch: Splitter cx -> Card 2 Center X -> Down Card 2 -> Combiner cx
      const rightBranch = document.createElementNS(SVGNS, 'path');
      rightBranch.setAttribute('class', 'flow-line-branch flow-line-branch-right flow-line-branch-sector');
      branchesRoot.appendChild(rightBranch);
      const bRight = buildRoundedPath(toOrthogonal([{ x: cx, y: topY }, { x: c2x, y: topY }, { x: c2x, y: botY }, { x: cx, y: botY }]).points, CORNER_RADIUS);
      activeBranches.push({ pathEl: rightBranch, built: bRight, startKey: 'pad-3way-splitter', endKey: 'pad-3way-combiner' });

      // Top Diverging Corner Dots
      const dotTopL = document.createElementNS(SVGNS, 'circle');
      dotTopL.setAttribute('cx', String(c0x));
      dotTopL.setAttribute('cy', String(topY));
      dotTopL.setAttribute('class', 'flow-line-branch-dot flow-line-pad-corner-top');
      branchesRoot.appendChild(dotTopL);

      const dotTopR = document.createElementNS(SVGNS, 'circle');
      dotTopR.setAttribute('cx', String(c2x));
      dotTopR.setAttribute('cy', String(topY));
      dotTopR.setAttribute('class', 'flow-line-branch-dot flow-line-pad-corner-top');
      branchesRoot.appendChild(dotTopR);

      // Bottom Converging Corner Dots
      const dotBotL = document.createElementNS(SVGNS, 'circle');
      dotBotL.setAttribute('cx', String(c0x));
      dotBotL.setAttribute('cy', String(botY));
      dotBotL.setAttribute('class', 'flow-line-branch-dot flow-line-pad-corner-bot');
      branchesRoot.appendChild(dotBotL);

      const dotBotR = document.createElementNS(SVGNS, 'circle');
      dotBotR.setAttribute('cx', String(c2x));
      dotBotR.setAttribute('cy', String(botY));
      dotBotR.setAttribute('class', 'flow-line-branch-dot flow-line-pad-corner-bot');
      branchesRoot.appendChild(dotBotR);

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

    // 3. Capabilities Overview 3-Way Splitter and Combiner Branches
    const capGrid = document.getElementById('sector-overview-grid');
    const capCard0 = capGrid?.querySelector<HTMLElement>('.sector-overview-card-0');
    const capCard1 = capGrid?.querySelector<HTMLElement>('.sector-overview-card-1');
    const capCard2 = capGrid?.querySelector<HTMLElement>('.sector-overview-card-2');

    if (capGrid && capCard0 && capCard1 && capCard2 && document.documentElement.clientWidth >= 1024) {
      const gr = capGrid.getBoundingClientRect();
      const c0r = capCard0.getBoundingClientRect();
      const c2r = capCard2.getBoundingClientRect();

      const topY = gr.top - 36 + window.scrollY;
      const botY = gr.bottom + 36 + window.scrollY;
      const cx = screenCenterX();
      const c0x = c0r.left + c0r.width / 2 + window.scrollX;
      const c2x = c2r.left + c2r.width / 2 + window.scrollX;

      // Left Branch: Splitter cx -> Card 0 Center X -> Down Card 0 -> Combiner cx
      const leftBranch = document.createElementNS(SVGNS, 'path');
      leftBranch.setAttribute('class', 'flow-line-branch flow-line-branch-left flow-line-branch-cap');
      branchesRoot.appendChild(leftBranch);
      const bCapLeft = buildRoundedPath(toOrthogonal([{ x: cx, y: topY }, { x: c0x, y: topY }, { x: c0x, y: botY }, { x: cx, y: botY }]).points, CORNER_RADIUS);
      activeBranches.push({ pathEl: leftBranch, built: bCapLeft, startKey: 'cap-3way-splitter', endKey: 'cap-3way-combiner' });

      // Right Branch: Splitter cx -> Card 2 Center X -> Down Card 2 -> Combiner cx
      const rightBranch = document.createElementNS(SVGNS, 'path');
      rightBranch.setAttribute('class', 'flow-line-branch flow-line-branch-right flow-line-branch-cap');
      branchesRoot.appendChild(rightBranch);
      const bCapRight = buildRoundedPath(toOrthogonal([{ x: cx, y: topY }, { x: c2x, y: topY }, { x: c2x, y: botY }, { x: cx, y: botY }]).points, CORNER_RADIUS);
      activeBranches.push({ pathEl: rightBranch, built: bCapRight, startKey: 'cap-3way-splitter', endKey: 'cap-3way-combiner' });

      // Top Diverging Corner Dots
      const dotTopCapL = document.createElementNS(SVGNS, 'circle');
      dotTopCapL.setAttribute('cx', String(c0x));
      dotTopCapL.setAttribute('cy', String(topY));
      dotTopCapL.setAttribute('class', 'flow-line-branch-dot flow-line-cap-corner-top');
      branchesRoot.appendChild(dotTopCapL);

      const dotTopCapR = document.createElementNS(SVGNS, 'circle');
      dotTopCapR.setAttribute('cx', String(c2x));
      dotTopCapR.setAttribute('cy', String(topY));
      dotTopCapR.setAttribute('class', 'flow-line-branch-dot flow-line-cap-corner-top');
      branchesRoot.appendChild(dotTopCapR);

      // Bottom Converging Corner Dots
      const dotBotCapL = document.createElementNS(SVGNS, 'circle');
      dotBotCapL.setAttribute('cx', String(c0x));
      dotBotCapL.setAttribute('cy', String(botY));
      dotBotCapL.setAttribute('class', 'flow-line-branch-dot flow-line-cap-corner-bot');
      branchesRoot.appendChild(dotBotCapL);

      const dotBotCapR = document.createElementNS(SVGNS, 'circle');
      dotBotCapR.setAttribute('cx', String(c2x));
      dotBotCapR.setAttribute('cy', String(botY));
      dotBotCapR.setAttribute('class', 'flow-line-branch-dot flow-line-cap-corner-bot');
      branchesRoot.appendChild(dotBotCapR);

      // Terminal status dots on Card 0 and Card 2 badges
      const badge0 = capCard0.querySelector('.sector-overview-badge');
      const badge0r = badge0?.getBoundingClientRect() ?? c0r;
      const badge0Y = badge0r.top + badge0r.height / 2 + window.scrollY;

      const t0 = document.createElementNS(SVGNS, 'circle');
      t0.setAttribute('cx', String(c0x));
      t0.setAttribute('cy', String(badge0Y));
      t0.setAttribute('r', '4');
      t0.setAttribute('class', 'flow-line-terminal-dot flow-line-terminal-cap-0');
      branchesRoot.appendChild(t0);

      const t2 = document.createElementNS(SVGNS, 'circle');
      t2.setAttribute('cx', String(c2x));
      t2.setAttribute('cy', String(badge0Y));
      t2.setAttribute('r', '4');
      t2.setAttribute('class', 'flow-line-terminal-dot flow-line-terminal-cap-2');
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
    const curvedFlags = withPoints.map((m) => !!m.curved);
    const { points: expandedPoints, indexMap } = toOrthogonal(points, curvedFlags);
    const gapFlags = indexMap.map((expandedIdx, origIdx) => !!withPoints[origIdx]?.gap);
    // Expand gapFlags for all points
    const fullGapFlags = new Array(expandedPoints.length).fill(false);
    indexMap.forEach((expIdx, origIdx) => {
      if (withPoints[origIdx]?.gap) {
        const prevExpIdx = origIdx > 0 ? indexMap[origIdx - 1] : 0;
        for (let k = prevExpIdx + 1; k <= expIdx; k++) {
          fullGapFlags[k] = true;
        }
      }
    });
    built = buildRoundedPath(expandedPoints, CORNER_RADIUS, fullGapFlags);
    milestoneCumulative = indexMap.map((expandedIdx) => built.cumulativeLengths[expandedIdx]);

    activationScrollY = withPoints.map((_, i) => points[i].y - window.innerHeight * ACTIVATION_FRACTION);

    renderDots(withPoints, points);
    renderBranches();
    flourishes = buildFlourishes();
    if (built.totalLength > 0) {
      svg.classList.add('is-ready');
    }
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

    // Dynamic partialD draw-in for all active branched routes (keeps dotted stroke-dasharray styling)
    activeBranches.forEach((b) => {
      const startIdx = currentMilestonesWithPoints.findIndex((m) => m.key === b.startKey);
      const endIdx = currentMilestonesWithPoints.findIndex((m) => m.key === b.endKey || m.key.includes('combiner-to-rail'));
      if (startIdx >= 0) {
        const startAt = milestoneCumulative[startIdx] ?? 0;
        const endAt = endIdx >= 0 && endIdx !== startIdx ? (milestoneCumulative[endIdx] ?? startAt + 48) : startAt + 48;
        const span = Math.max(1, endAt - startAt);
        const progress = Math.min(1, Math.max(0, (currentLength - startAt) / span));

        if (progress > 0) {
          b.pathEl.setAttribute('d', partialD(b.built, progress * b.built.totalLength));
          b.pathEl.classList.add('is-active');
          b.pathEl.style.opacity = '1';
        } else {
          b.pathEl.setAttribute('d', '');
          b.pathEl.classList.remove('is-active');
          b.pathEl.style.opacity = '0';
        }
      }
    });


    // 2. 3-Way sector splitter and combiner power states (Purpose & Direction)
    const padSplitterIdx = currentMilestonesWithPoints.findIndex((m) => m.key === 'pad-3way-splitter');
    const padCombinerIdx = currentMilestonesWithPoints.findIndex((m) => m.key === 'pad-3way-combiner' || m.key === 'pad-combiner-to-rail');
    if (padSplitterIdx >= 0 && padCombinerIdx >= 0) {
      const splitAt = milestoneCumulative[padSplitterIdx] ?? 0;
      const combineAt = milestoneCumulative[padCombinerIdx] ?? 0;
      const span = Math.max(1, combineAt - splitAt);
      const progress = Math.min(1, Math.max(0, (currentLength - splitAt) / span));

      const isTopLit = progress >= 0.05;
      const isMidway = progress >= 0.15;
      const isBotLit = progress >= 0.85;

      branchesRoot?.querySelectorAll('.flow-line-pad-corner-top').forEach((d) => d.classList.toggle('is-ignited', isTopLit));
      branchesRoot?.querySelectorAll('.flow-line-terminal-sector-0, .flow-line-terminal-sector-2').forEach((d) => d.classList.toggle('is-ignited', isMidway));
      branchesRoot?.querySelectorAll('.flow-line-pad-corner-bot').forEach((d) => d.classList.toggle('is-ignited', isBotLit));
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

    // 5. Capabilities Overview 3-Way sector splitter and combiner power states
    const capSplitterIdx = currentMilestonesWithPoints.findIndex((m) => m.key === 'cap-3way-splitter');
    const capCombinerIdx = currentMilestonesWithPoints.findIndex((m) => m.key === 'cap-3way-combiner' || m.key === 'cap-combiner-to-rail');
    if (capSplitterIdx >= 0 && capCombinerIdx >= 0) {
      const splitAt = milestoneCumulative[capSplitterIdx] ?? 0;
      const combineAt = milestoneCumulative[capCombinerIdx] ?? 0;
      const span = Math.max(1, combineAt - splitAt);
      const progress = Math.min(1, Math.max(0, (currentLength - splitAt) / span));

      const isTopLit = progress >= 0.05;
      const isMidway = progress >= 0.15;
      const isBotLit = progress >= 0.85;

      branchesRoot?.querySelectorAll('.flow-line-cap-corner-top').forEach((d) => d.classList.toggle('is-ignited', isTopLit));
      branchesRoot?.querySelectorAll('.flow-line-terminal-cap-0, .flow-line-terminal-cap-2').forEach((d) => d.classList.toggle('is-ignited', isMidway));
      branchesRoot?.querySelectorAll('.flow-line-cap-corner-bot').forEach((d) => d.classList.toggle('is-ignited', isBotLit));
      document.querySelectorAll('.sector-overview-card').forEach((c) => c.classList.toggle('is-powered', isMidway));
    }

    // 6. Sector Capabilities Dedicated Hubs sequential card power activation
    for (let idx = 0; idx < 6; idx++) {
      const cIdx = currentMilestonesWithPoints.findIndex((m) => m.key === `sec-cap-${idx}`);
      if (cIdx >= 0) {
        const cAt = milestoneCumulative[cIdx] ?? 0;
        const isReached = currentLength >= cAt - 8;
        const cards = document.querySelectorAll<HTMLElement>(`.capability-card-${idx}`);
        cards.forEach((c) => c.classList.toggle('is-powered', isReached));
      }
    }

    // 7. AI in Action Directory Cards power activation
    for (let idx = 0; idx < 6; idx++) {
      const cIdx = currentMilestonesWithPoints.findIndex((m) => m.key === `ai-dir-card-${idx}`);
      if (cIdx >= 0) {
        const cAt = milestoneCumulative[cIdx] ?? 0;
        const isReached = currentLength >= cAt - 8;
        const card = document.querySelector<HTMLElement>(`.ai-directory-card-${idx}`);
        card?.classList.toggle('is-powered', isReached);
      }
    }

    // 8. AI in Action Category Case Study Dossiers multi-act power activation
    const visibleDossiers = getVisibleCaseStudyDossiers();
    visibleDossiers.forEach((dossier, idx) => {
      const headIdx = currentMilestonesWithPoints.findIndex((m) => m.key === `ai-dossier-${idx}-header`);
      const ribIdx = currentMilestonesWithPoints.findIndex((m) => m.key === `ai-dossier-${idx}-ribbon-end` || m.key === `ai-dossier-${idx}-ribbon-start`);
      const delIdx = currentMilestonesWithPoints.findIndex((m) => m.key === `ai-dossier-${idx}-delivery`);
      const impIdx = currentMilestonesWithPoints.findIndex((m) => m.key === `ai-dossier-${idx}-impact`);

      if (headIdx >= 0) {
        const at = milestoneCumulative[headIdx] ?? 0;
        dossier.classList.toggle('is-powered', currentLength >= at - 8);
      }
      if (ribIdx >= 0) {
        const at = milestoneCumulative[ribIdx] ?? 0;
        dossier.querySelector('.dossier-ribbon-block')?.classList.toggle('is-powered', currentLength >= at - 8);
      }
      if (delIdx >= 0) {
        const at = milestoneCumulative[delIdx] ?? 0;
        dossier.querySelector('.dossier-delivery-box')?.classList.toggle('is-powered', currentLength >= at - 8);
        dossier.querySelector('.dossier-context-box')?.classList.toggle('is-powered', currentLength >= at - 8);
      }
      if (impIdx >= 0) {
        const at = milestoneCumulative[impIdx] ?? 0;
        dossier.querySelector('.dossier-impact-box')?.classList.toggle('is-powered', currentLength >= at - 8);
      }
    });
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

  function updateDockedCards() {
    const dockedCards = document.querySelectorAll<HTMLElement>('.trail-docked-card');
    if (dockedCards.length === 0) return;
    const mediaDockDot = dotsRoot?.querySelector<SVGCircleElement>('[data-flow-dot="news-card-top-dock"]');
    if (mediaDockDot) {
      const isLit = mediaDockDot.classList.contains('is-ignited');
      dockedCards.forEach((c) => c.classList.toggle('is-trail-ignited', isLit));
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
    updateDockedCards();
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

  activeFlowLineInstance = { remeasure: measure };

  document.fonts?.ready?.then(() => {
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
