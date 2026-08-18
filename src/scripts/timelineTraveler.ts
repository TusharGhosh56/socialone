// timelineTraveler.ts — a small gold dot that continuously retraces the
// Foundation section's timeline (the 2010s/2021/2022/2025 stops,
// index.astro's "8 · BACKED BY ATHENA" section). Same repeating-traveler
// mechanic as FlowChartV2's own idle-loop dot (drawRepeatingTraveler in
// src/components/FlowChartV2/flowChartV2.ts) — gap-then-travel cycle,
// easeInOutCubic per leg — just driving a plain DOM element's `left`/`top`
// instead of a canvas, since this timeline has no canvas of its own. Sized
// smaller than FlowChartV2's own (already-decreased) traveler, per explicit
// product decision — DOT_SIZE below is a fixed px value, not derived from
// any station's own hub radius the way FlowChartV2's traveler is.
//
// Mode-agnostic (unlike an earlier version, which only ran at sm+/640px and
// stayed disabled below it): index.astro lays the 4 stops out as a
// horizontal row at sm+ and a vertical single column below that — measure()
// reads each stop's own real (x,y) via getBoundingClientRect() rather than
// assuming an axis, so the SAME lerp-between-consecutive-stops logic below
// drives `left` at sm+ (y constant) and `top` on mobile (x constant)
// without a mode branch, same "measure, don't reconstruct" instinct
// FlowChartV2's own layout uses for the same desktop/mobile split.
//
// measure() also does one other, unrelated job on mobile: pulling the real
// dots (and their vertical connecting line) out to sit exactly on
// flowLine.ts's own left rail (see that function's own comment) — bundled
// in here rather than a separate module purely because it needs the exact
// same resize/load/fonts.ready measurement cadence this function already
// has wired up.
//
// Doesn't start traveling until all 4 stops have finished appearing — those
// 4 `<li data-flow-fade>` elements get their own `.is-visible` toggled by
// flowLine.ts's flourish mechanism as the page-wide master line's drawn
// length passes each one (scroll-progress-driven, not time-based), and that
// toggle is reversible (removed again if scrolled back up past the trigger
// point) — so this checks the live class state every frame rather than
// waiting for a one-off "done" event, and resets its own start time while
// waiting so the cycle always begins fresh (gap, then travel) at the moment
// all 4 finish appearing, same "restart cleanly on every re-entry" instinct
// as FlowChartV2's own genesis sequence.

import { railPad } from './flowLine';

// Same effective pacing as FlowChartV2's own repeating traveler (that
// module's TRAVEL_LOOP_MS/TRAVEL_GAP_MS, post its own SPEED multiplier) —
// recomputed here independently rather than imported, so this module stays
// decoupled from FlowChartV2's internals; "same effect" means same feel,
// not a shared runtime dependency.
const SPEED = 1.3 / 0.7;
const TRAVEL_LOOP_MS = 7000 / SPEED;
const TRAVEL_GAP_MS = 2200 / SPEED;
const TRAVEL_CYCLE = TRAVEL_GAP_MS + TRAVEL_LOOP_MS;

// Same cut line index.astro's own timeline markup uses to switch from the
// sm+ horizontal row to the mobile vertical column.
const MOBILE_BREAKPOINT = 640;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface Point {
  x: number;
  y: number;
}

export function initTimelineTraveler(): void {
  const section = document.getElementById('about');
  const wrap = section?.querySelector<HTMLElement>('[data-timeline-wrap]');
  const dot = section?.querySelector<HTMLElement>('[data-timeline-traveler]');
  const lineV = section?.querySelector<HTMLElement>('.timeline-line-v');
  // Same 4 <li>s flowLine.ts's own flourish mechanism toggles `.is-visible`
  // on (`#about ol li[data-flow-fade]`) — reused directly rather than a
  // separate selector, so "all revealed" always means the exact same thing
  // this module and flowLine.ts each mean by it.
  const stopLis = section ? Array.from(section.querySelectorAll<HTMLElement>('ol li[data-flow-fade]')) : [];
  const stops = stopLis.map((li) => li.querySelector<HTMLElement>('span.bg-gold')).filter((s): s is HTMLElement => !!s);
  if (!section || !wrap || !dot || stops.length < 2 || stops.length !== stopLis.length) return;

  const allStopsRevealed = () => stopLis.every((li) => li.classList.contains('is-visible'));

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let stopPts: Point[] = [];
  let legCount = 0;
  let visible = false;
  let running = false;
  let raf = 0;
  let t0 = 0;

  function measure() {
    // Mobile: pull the dots (and their connecting vertical line) out to sit
    // exactly ON flowLine.ts's own left rail — per explicit product
    // decision, so the master line's vertical run through the timeline
    // needs no jog at all, same as every other left-rail section heading.
    // railPad() is the SAME real measurement flowLine.ts's own rail uses
    // (exported from that module specifically for this reuse), not a
    // reconstructed formula — it's independent of --container-pad (tracks
    // the header's floating logomark instead), so this can't be expressed
    // as a fixed CSS offset. sm+ clears the override so the CSS layout
    // (dot at the li's own edge, line at left-[5px]) governs unmodified.
    const mobile = document.documentElement.clientWidth < MOBILE_BREAKPOINT;
    const wrapRect = wrap!.getBoundingClientRect();
    if (mobile) {
      const railX = railPad() - wrapRect.left;
      if (lineV) lineV.style.left = `${railX}px`;
      stops.forEach((s) => {
        s.style.left = `${railX - s.offsetWidth / 2}px`;
      });
    } else {
      if (lineV) lineV.style.left = '';
      stops.forEach((s) => {
        s.style.left = '';
      });
    }
    stopPts = stops.map((s) => {
      const r = s.getBoundingClientRect();
      return { x: r.left + r.width / 2 - wrapRect.left, y: r.top + r.height / 2 - wrapRect.top };
    });
    legCount = stopPts.length - 1;
  }

  function frame(t: number) {
    if (visible && legCount > 0 && allStopsRevealed()) {
      // t0 only ever gets set to a real timestamp HERE, the first frame all
      // 4 stops are already revealed — everywhere else below resets it to 0,
      // so the cycle always starts fresh (gap, then travel) from that exact
      // moment rather than jumping in mid-cycle.
      if (!t0) t0 = t;
      const elapsed = t - t0;
      const cyclePos = elapsed % TRAVEL_CYCLE;
      const legT = (cyclePos - TRAVEL_GAP_MS) / TRAVEL_LOOP_MS;
      if (cyclePos < TRAVEL_GAP_MS || legT >= 1) {
        dot!.style.opacity = '0';
      } else {
        const legFloat = clamp01(legT) * legCount;
        const legIndex = Math.min(legCount - 1, Math.floor(legFloat));
        const localT = easeInOutCubic(legFloat - legIndex);
        const from = stopPts[legIndex];
        const to = stopPts[legIndex + 1];
        dot!.style.opacity = '1';
        dot!.style.left = `${lerp(from.x, to.x, localT)}px`;
        dot!.style.top = `${lerp(from.y, to.y, localT)}px`;
      }
    } else {
      t0 = 0;
      dot!.style.opacity = '0';
    }

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
        visible = e.isIntersecting;
        if (visible) start();
        else stop();
      }
    },
    { threshold: 0.1 },
  );
  io.observe(section);

  let resizeTimer = 0;
  window.addEventListener(
    'resize',
    () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(measure, 120);
    },
    { passive: true },
  );
  measure();
  window.addEventListener('load', measure);
  document.fonts?.ready?.then(measure);
}
