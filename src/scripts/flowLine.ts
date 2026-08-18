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
import { buildRoundedPath, partialD, toOrthogonal, type BuiltPath, type Point } from './flowLinePath';
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

// Only three vertical rails exist anywhere on the page — left, right, and
// centre (railLeftX/railRightX/screenCenterX). Every vertical run in the
// path must sit on one of these; FlowChart's own horizontal trunk (between
// flow-entry/flow-exit) is the sole exception, since it traces the canvas's
// own content-edge-aligned dots, not a rail. Wherever the route needs to
// move from one rail to another, that transition is an explicit hidden
// waypoint pair here (not left to toOrthogonal's default corner placement),
// so the turn happens exactly where intended rather than wherever the next
// real milestone's Y happens to be.
function buildMilestones(): Milestone[] {
  // Reverted per explicit request back to 0 — a previous session had tried
  // offsetting this a bit PAST the section's real top edge (jogging exactly
  // at the boundary read as invisible, coinciding with the section's own
  // edge), but the jog should track the section's actual start with no
  // offset.
  const HOW_WE_WORK_JOG_OFFSET = 0;
  const howWeWorkTop = () => {
    const section = document.getElementById('how-we-work');
    return section ? section.getBoundingClientRect().top + window.scrollY + HOW_WE_WORK_JOG_OFFSET : null;
  };
  // The Challenge section (id="why-aplyd" — holds the repurposed Why APLYD
  // copy now, see index.astro's "3 · THE CHALLENGE" comment) and What We Do
  // both need their own top edge for a mid-section rail jog, same idea as
  // how-we-work-start/jog below.
  const challengeTop = () => {
    const section = document.getElementById('why-aplyd');
    return section ? section.getBoundingClientRect().top + window.scrollY : null;
  };
  const whatWeDoTop = () => {
    const section = document.getElementById('what-we-do');
    return section ? section.getBoundingClientRect().top + window.scrollY : null;
  };
  // Desktop (md+, 768px — the same breakpoint ServiceOrbit/ServiceCard
  // themselves switch on): jog into the centre rail at the section's own
  // top edge, same as always (whatWeDoTop() — the centre rail then runs
  // straight through the ServiceOrbit infographic's own visual middle).
  // Mobile: ServiceOrbit is hidden and ServiceCard's plain grid shows
  // instead, so jogging at the section's top edge would land well before
  // the heading/subheading even appear — per explicit product decision,
  // jog later instead, in the empty gap between the subheading and the
  // first card ("Strategy & Direction"). Computed as the real midpoint
  // between the subheading's own bottom edge (id="what-subhead", added
  // specifically for this — ServiceCard's own card titles are ALSO <h3>s
  // in this section, so a plain tag selector would be ambiguous) and the
  // card grid's own top edge (.connect-wrap), not a guessed margin value.
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
  // AI in Action's own bottom edge — into its empty bottom padding, after
  // the case carousel. Used to jog from the left rail to the right rail
  // before Our Team, in empty space rather than at Team's own heading
  // height. This section is what now sits directly above Our Team — the
  // Foundation section (heading/paragraph/rotating rings) that used to sit
  // between them, and before that its own timeline, are both archived; see
  // index.astro's "ARCHIVED — ORIGINAL FOUNDATION SECTION" comment.
  const caseStudiesBottom = () => {
    const section = document.getElementById('ai-in-action');
    return section ? section.getBoundingClientRect().bottom + window.scrollY : null;
  };
  // Selects on .future-cta__trigger (a stable class already used by this
  // button's own hover-video :has() selector in index.astro), not
  // a[href="#contact"] — that href now points to /contact (the new Get in
  // Touch page), so an href-based selector here would silently stop
  // matching. section#contact stays as the scoping id even though the
  // button no longer links to that fragment.
  const finalCtaY = () => pageY(q('section#contact .future-cta__trigger'));

  const list: Milestone[] = [
    // Selects on .hero-cta-primary (a class added to this Button instance
    // specifically so flowLine.ts can find it) rather than a[href="#contact"]
    // — same reasoning as finalCtaY below, now that this button links to
    // /contact instead of the #contact fragment.
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
    // Extend the trunk's exit out to the right rail BEFORE turning down —
    // the vertical drop to Trust happens entirely on the right rail.
    { key: 'flow-exit-rail', dot: false, getPoint: fixedPoint(railRightX, flowExitY) },
    { key: 'trust', getPoint: atFixedX('#trust .grid', railRightX) },
    // Jog from the right rail to the left rail exactly at the Challenge
    // section's own top edge — same "turn on entry, dot on the heading"
    // convention as how-we-work-start/jog below. This used to dogleg to the
    // CENTRE rail instead, because the old Challenge section was a two-
    // column layout (text/pointer-cards straddling the line) — now that
    // this section is a plain single-column heading (the repurposed Why
    // APLYD content, see index.astro), it gets the same left-rail treatment
    // as How We Work/Case Studies/Foundations below.
    { key: 'challenge-turn', dot: false, getPoint: fixedPoint(railRightX, challengeTop) },
    { key: 'challenge-jog', dot: false, getPoint: fixedPoint(railLeftX, challengeTop) },
    { key: 'challenge', getPoint: atFixedX('#why-h2', railLeftX) },
    // Jog back from the left rail to the centre rail exactly at What We
    // Do's own top edge — mirrors how-we-work-start/jog's centre→left jog
    // below, just left→centre. What We Do's own dot then sits on the centre
    // rail exactly, forcing x here to remove any residual drift from its
    // real DOM position. It runs straight down to How We Work's own jog
    // below — the click-controlled carousel in between (StepCarousel.astro)
    // plays no part in scroll at all and has no milestone/dot of its own;
    // the line just draws straight through at the normal scroll-driven
    // rate, same as any other stretch of the page.
    { key: 'what-we-do-turn', dot: false, getPoint: fixedPoint(railLeftX, whatWeDoJogY) },
    { key: 'what-we-do-jog', dot: false, getPoint: fixedPoint(screenCenterX, whatWeDoJogY) },
    { key: 'what-we-do', getPoint: atFixedX('.connect-dot', screenCenterX) },
    // Jog from the centre rail to the left rail exactly at the point the
    // navy "How We Work" section BEGINS — the turn happens on entry to the
    // section, not at its end, then runs straight down the left rail
    // through the whole section and on to Case Studies' heading.
    { key: 'how-we-work-start', dot: false, getPoint: fixedPoint(screenCenterX, howWeWorkTop) },
    { key: 'how-we-work-jog', dot: false, getPoint: fixedPoint(railLeftX, howWeWorkTop) },
    // A real milestone dot once on the left rail, in line with the "How we
    // work" title itself — same convention as case-studies below (a
    // heading's own Y, pinned to the rail's fixed X).
    { key: 'how-we-work-title', getPoint: atFixedX('#how-h2', railLeftX) },
    { key: 'case-studies', getPoint: atFixedX('#cases-h2', railLeftX) },
    // Continue straight down the left rail through the rest of AI in
    // Action (the case carousel, no milestone of its own) to the
    // section's own bottom edge, THEN jog right — same single-waypoint
    // idiom as every other mid-section rail jog on this page (toOrthogonal
    // auto-inserts the vertical leg on the PRIOR point's rail before
    // turning, so only the turn's own destination needs stating).
    { key: 'case-studies-jog', dot: false, getPoint: fixedPoint(railRightX, caseStudiesBottom) },
    // The line is already on the right rail here and stays there all the
    // way to the final CTA — no jog needed. Our Team's milestone dot just
    // sits on that same right rail, in line with its own heading (per
    // explicit product decision — an earlier version jogged over to the
    // left rail like How We Work/Case Studies/Foundations do, which turned
    // out to be an unwanted detour, not the intended look here).
    { key: 'team', getPoint: atFixedX('#team-h2', railRightX) },
    // Straight down the right rail to the final CTA's own height, then jog
    // left to end behind the button (dot:false — the button gets its own
    // stacking context in index.astro so it paints on top of the line here).
    { key: 'cta-rail-end', dot: false, getPoint: fixedPoint(railRightX, finalCtaY) },
    { key: 'final-cta', dot: false, getPoint: () => pagePoint(q('section#contact .future-cta__trigger'), 'center') },
  ];
  return list;
}

export function initFlowLine(): void {
  if ((window as unknown as { __aplydFlowLine?: boolean }).__aplydFlowLine) return;
  (window as unknown as { __aplydFlowLine?: boolean }).__aplydFlowLine = true;

  const svg = document.querySelector<SVGSVGElement>('.flow-line-svg');
  const path = document.querySelector<SVGPathElement>('.flow-line-path');
  const dotsRoot = document.querySelector<SVGGElement>('.flow-line-dots');
  if (!svg || !path || !dotsRoot) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let built: BuiltPath = { segments: [], cumulativeLengths: [], totalLength: 0 };
  // cumulative length AT each ORIGINAL milestone (post orthogonal-expansion
  // index mapping already applied) — everything downstream (activation
  // bracketing, flourish triggers) reads this instead of built.cumulativeLengths
  // directly, since synthetic corner points shift indices in the latter.
  let milestoneCumulative: number[] = [];
  let activationScrollY: number[] = [];
  let currentLength = 0;
  let targetLength = 0;
  let raf = 0;
  let running = false;
  let flourishes: Flourish[] = [];

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

    const { points: expandedPoints, indexMap } = toOrthogonal(points);
    built = buildRoundedPath(expandedPoints, CORNER_RADIUS);
    milestoneCumulative = indexMap.map((expandedIdx) => built.cumulativeLengths[expandedIdx]);

    activationScrollY = withPoints.map((_, i) => points[i].y - window.innerHeight * ACTIVATION_FRACTION);

    renderDots(withPoints, points);
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
    // The Foundation timeline's per-dot [data-flow-fade] flourish (which
    // used to live here) is gone along with the timeline itself — see
    // index.astro's "ARCHIVED — ORIGINAL TIMELINE" comment. Same for the
    // old Challenge section's per-pointer flourish before it (also
    // archived) — that content now uses plain Reveal like every other
    // section's cards instead of scroll-position-driven fades. Nothing
    // currently needs this list, but the function is kept (rather than
    // deleted outright, along with the `flourishes`/`updateFlourishes()`
    // plumbing that reads it) since this is where a future section-
    // specific flourish would go again.
    return [];
  }

  function updateFlourishes() {
    for (const f of flourishes) {
      f.el.classList.toggle(f.className, currentLength >= f.getTriggerLength() - FLOURISH_LEAD);
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
    });
  }

  function renderAll() {
    path!.setAttribute('d', partialD(built, currentLength));
    updateDotOpacity();
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
