// preloader.ts — drives Preloader.astro's initial-load sequence: stroke
// draw-in (dot + triangle finish together, since both are handed the same
// duration regardless of each path's own length) → fill → dot pulsates for
// at least two full cycles, and until window 'load' has fired too (whichever
// is later — even a fully-cached load must still show two full pulses before
// morphing) — UNLESS 'load' still hasn't fired ~1s after the pulses finish
// (a slow connection can take far longer than that to fully load), in which
// case it proceeds anyway rather than leaving the preloader stuck
// indefinitely — → FLIP-morphs the mark's measured on-screen box onto the
// header's real wordmark mark (also measured live — never a hardcoded
// scale, since the two source SVGs have different viewBoxes) → overlay
// fades out.
//
// The stroke draw-in is animated via the Web Animations API
// (element.animate(...)), not a CSS class + transition. Two earlier attempts
// at the CSS route both failed in ways that only showed up in some
// environments (dev vs. production, different load speeds): first, an
// inline-set stroke-dashoffset can never be overridden by a class-based
// stylesheet rule (inline always wins the cascade); then, even driving the
// value change directly from JS, the transition needs the browser to have
// already committed a distinct "before" style recalculation before the
// value changes, which a rAF (even double-nested) or a forced synchronous
// reflow still didn't guarantee everywhere. A WAAPI Animation sidesteps all
// of this — it always starts explicitly from its first keyframe, with no
// dependency on any prior committed style or paint timing, and its
// `.finished` promise gives an exact completion signal instead of a
// setTimeout guessing at a duration.

function unionRect(a: DOMRect, b: DOMRect) {
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  const right = Math.max(a.right, b.right);
  const bottom = Math.max(a.bottom, b.bottom);
  return { left, top, width: right - left, height: bottom - top };
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function initPreloader(): void {
  const root = document.querySelector<HTMLElement>('[data-preloader]');
  if (!root) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    root.remove();
    return;
  }

  const dot = root.querySelector<SVGCircleElement>('[data-preloader-dot]');
  const tri = root.querySelector<SVGPolygonElement>('[data-preloader-tri]');
  const inner = root.querySelector<HTMLElement>('[data-preloader-mark-inner]');
  if (!dot || !tri || !inner) {
    root.remove();
    return;
  }

  const styles = getComputedStyle(root);
  const readMs = (name: string, fallback: number) => parseFloat(styles.getPropertyValue(name)) || fallback;
  const readStr = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  const DRAW_MS = readMs('--draw-ms', 3400);
  const DRAW_EASE = readStr('--draw-ease', 'cubic-bezier(0.33, 1, 0.68, 1)');
  const FILL_MS = readMs('--fill-ms', 650);
  const PULSE_MS = readMs('--pulse-ms', 1800);
  const MORPH_MS = readMs('--morph-ms', 850);
  const MIN_PULSE_CYCLES = 2;

  // Compensate the scrollbar this removes with matching padding-right, so the
  // page's content width doesn't change while the scrollbar is gone — without
  // this, anything elsewhere on the page that caches a horizontal measurement
  // at init (e.g. approachBurst.ts's origin, via alignWhatWeDoBurst() in
  // index.astro) initializes against a wider (scrollbar-less) viewport while
  // the preloader is up, then silently drifts out of alignment once normal
  // scrolling resumes and the scrollbar reappears — since removing/restoring
  // a scrollbar via `overflow` doesn't fire a `resize` event, nothing
  // recalculates until a REAL resize (e.g. browser zoom) forces it to.
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.overflow = 'hidden';
  if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

  const dotLen = dot.getTotalLength();
  const triLen = tri.getTotalLength();
  dot.style.strokeDasharray = `${dotLen}`;
  tri.style.strokeDasharray = `${triLen}`;

  const finish = () => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    // Final resync, tied to the preloader's own guaranteed-late completion
    // (at minimum DRAW_MS + FILL_MS + MIN_PULSE_CYCLES*PULSE_MS ≈ 7.6s in) —
    // by now everything on the page (fonts, images, anything still settling)
    // has had far longer to finish than a `load` or `fonts.ready` listener
    // alone guarantees, so this is the most reliable point to force a fresh
    // resize-driven recompute of anything (like approachBurst.ts's origin)
    // that only recalculates on a real resize event.
    window.dispatchEvent(new Event('resize'));
    root.classList.add('is-done');
    root.addEventListener('transitionend', () => root.remove(), { once: true });
    setTimeout(() => root.remove(), 900); // fallback if transitionend never fires
  };

  function morph() {
    const headerWordmark = document.querySelector('[data-header-wordmark] svg');
    const headerDot = headerWordmark?.querySelector('circle');
    const headerTri = headerWordmark?.querySelector('polygon');
    if (!headerDot || !headerTri) {
      finish();
      return;
    }

    const from = unionRect(dot!.getBoundingClientRect(), tri!.getBoundingClientRect());
    const to = unionRect(headerDot.getBoundingClientRect(), headerTri.getBoundingClientRect());

    const scale = to.width / from.width;
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);

    root.classList.remove('is-pulsing');

    // Tie the overlay's fade-out to the transform transition's REAL
    // completion (transitionend), not a hardcoded setTimeout guess — a guess
    // can drift out of sync with the actual travel animation, which is
    // exactly what made the page fade in before the mark had visually
    // finished travelling to the header. The timeout below is only a
    // fallback in case transitionend never fires for some reason.
    let settled = false;
    const onTransitionEnd = (e: Event) => {
      if (e.target !== inner || (e as TransitionEvent).propertyName !== 'transform' || settled) return;
      settled = true;
      finish();
    };
    inner!.addEventListener('transitionend', onTransitionEnd);
    setTimeout(() => {
      if (settled) return;
      settled = true;
      inner!.removeEventListener('transitionend', onTransitionEnd);
      finish();
    }, MORPH_MS + 400);

    inner!.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
  }

  let reachedMinPulses = false;
  let pageLoaded = document.readyState === 'complete';
  let morphed = false;

  // Guards morph() against firing twice — maybeMorph() (the normal path)
  // and the grace-period timeout below can both end up eligible to call it.
  const runMorphOnce = () => {
    if (morphed) return;
    morphed = true;
    morph();
  };

  const maybeMorph = () => {
    if (reachedMinPulses && pageLoaded) runMorphOnce();
  };

  if (!pageLoaded) {
    window.addEventListener(
      'load',
      () => {
        pageLoaded = true;
        maybeMorph();
      },
      { once: true },
    );
  }

  // On a slow connection, window 'load' can take far longer than the
  // animation itself (it waits on every image/video/font on the page), which
  // left the preloader — and the body scroll-lock under it — stuck
  // indefinitely. Once the animation's own minimum pulses are done, give
  // 'load' a short grace period to catch up (avoids revealing a still-
  // loading, layout-shifting page on merely-slow connections), then proceed
  // regardless if it hasn't fired — so the preloader can never hang longer
  // than animation time + this grace period, no matter how slow the load is.
  const LOAD_GRACE_MS = 1000;
  const armLoadGraceTimeout = () => {
    setTimeout(() => {
      if (!pageLoaded) pageLoaded = true;
      runMorphOnce();
    }, LOAD_GRACE_MS);
  };

  async function run() {
    root.classList.add('is-drawing'); // fades .preloader__mark in via CSS

    const drawOptions: KeyframeAnimationOptions = { duration: DRAW_MS, easing: DRAW_EASE, fill: 'forwards' };
    const dotDraw = dot!.animate([{ strokeDashoffset: dotLen }, { strokeDashoffset: 0 }], drawOptions);
    const triDraw = tri!.animate([{ strokeDashoffset: triLen }, { strokeDashoffset: 0 }], drawOptions);
    await Promise.all([dotDraw.finished, triDraw.finished]).catch(() => {});

    root.classList.add('is-filling');
    await wait(FILL_MS);

    root.classList.add('is-pulsing');
    await wait(PULSE_MS * MIN_PULSE_CYCLES);
    reachedMinPulses = true;
    maybeMorph();
    armLoadGraceTimeout();
  }

  run();
}
