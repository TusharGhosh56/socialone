// caseCarousel.ts — peek/slide carousel for AI in Action's case studies.
// activeExtended is always the CENTRE card's position in the EXTENDED track
// (real cards + CLONE_COUNT cloned cards prepended/appended at each end —
// see CaseCarousel.astro for why: a linear DOM row can't visually wrap on
// its own, so navigating past the real last card slides into a clone of
// the first card, then this silently snaps the track back to the real
// card at the same visual position once that slide finishes, transition
// disabled for one frame so the snap itself is invisible). However many
// immediate neighbours the current breakpoint keeps fully visible (1 on
// mobile, 3 on desktop, i.e. active ± 1) render full-size via .is-near,
// with the card just beyond that peeking in at reduced scale/opacity (CSS
// handles the visual treatment — see CaseCarousel.astro; this only ever
// toggles .is-active/.is-near per card and sets the track's transform).
//
// Card width is sized off .container-x's own real width (so the fully-
// visible cards line up with the section's heading, like Trust's stat
// card/numbers), and the track's translateX off that same measured card
// width — neither a hardcoded per-breakpoint formula, so "N cards fit
// container-x" holds at any actual screen width, not just whatever vw a
// media query assumed. The viewport itself stays full-bleed, so the peek
// cards show through in whatever margin exists outside container-x.
// Recomputed on resize.
//
// Autoplay/hover-pause/reduced-motion follow the exact same pattern as
// stepCarousel.ts (How We Work's carousel) — see that file for the fuller
// rationale; not repeated here.

const AUTOPLAY_INTERVAL = 5000;
const ENTER_SETTLE_DELAY = 450;

export function initCaseCarousel(): void {
  const root = document.querySelector<HTMLElement>('[data-case-carousel-root]');
  const viewport = document.querySelector<HTMLElement>('[data-case-carousel-viewport]');
  const track = document.querySelector<HTMLElement>('[data-case-carousel-track]');
  if (!root || !viewport || !track) return;

  const cards = Array.from(track.querySelectorAll<HTMLElement>('[data-case-carousel-card]'));
  const prevBtn = root.querySelector<HTMLButtonElement>('[data-case-carousel-prev]');
  const nextBtn = root.querySelector<HTMLButtonElement>('[data-case-carousel-next]');
  const extendedTotal = cards.length;
  const CLONE_COUNT = parseInt(root.dataset.cloneCount || '0', 10);
  const N = extendedTotal - 2 * CLONE_COUNT; // real card count
  if (!N || extendedTotal < 1) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktopQuery = window.matchMedia('(min-width: 1024px)');
  const SLIDE_MS = parseFloat(getComputedStyle(root).getPropertyValue('--slide-ms')) || 500;

  let activeExtended = CLONE_COUNT; // real card 0's position in the extended track
  let snapTimer: number | null = null;

  const cardsVisible = () => (desktopQuery.matches ? 3 : 1);

  // The 3 (or 1, on mobile) fully-visible cards are sized to exactly fill
  // .container-x's own real width — measured live (same "measure, don't
  // reconstruct" convention as Trust's stat card / alignWhatWeDoBurst /
  // positionFoundationRings), not derived from the full-bleed viewport —
  // so they line up with the section's heading above them, same as Trust's
  // stat numbers. The viewport itself stays full-bleed (see .case-carousel
  // __viewport's clip-path in CaseCarousel.astro), so whatever margin space
  // exists outside .container-x is where the peek cards show through —
  // deliberately uncapped/natural rather than a fixed target percentage,
  // per explicit product decision (varies with how much wider the screen
  // is than container-x's 1200px cap).
  const containerEl = root!.closest('section')?.querySelector<HTMLElement>('.container-x') ?? null;

  function updateCardWidth() {
    // Content width, not container-x's outer box width — container-x has
    // real padding-inline (global.css's --container-pad), so its box is
    // wider than the text column the cards need to match. Sizing off the
    // outer box here while updateTrackPosition() anchors the left edge to
    // the padded content edge would overshoot the content's right edge by
    // both paddings combined (left inset shifts the whole group right,
    // width doesn't shrink to compensate).
    let containerWidth: number;
    if (containerEl) {
      const pad = parseFloat(getComputedStyle(containerEl).paddingLeft) || 0;
      containerWidth = containerEl.getBoundingClientRect().width - 2 * pad;
    } else {
      containerWidth = viewport!.getBoundingClientRect().width;
    }
    const visible = cardsVisible();
    const gap = parseFloat(getComputedStyle(track!).columnGap || getComputedStyle(track!).gap) || 0;
    const cardWidth = (containerWidth - (visible - 1) * gap) / visible;
    track!.style.setProperty('--card-w', `${cardWidth}px`);
  }

  function updateTrackPosition() {
    // getComputedStyle, not getBoundingClientRect — peek/near cards are
    // visually scaled down via CSS transform (see CaseCarousel.astro),
    // which shrinks their PAINTED box but not their LAYOUT width (transform
    // never affects flex layout, only paint) — getBoundingClientRect would
    // measure the scaled-down paint size for any card that isn't currently
    // full-size, silently corrupting the slot width used to position every
    // card in the row.
    const cardWidth = parseFloat(getComputedStyle(cards[0]).width);
    const gap = parseFloat(getComputedStyle(track!).columnGap || getComputedStyle(track!).gap) || 0;
    const slot = cardWidth + gap;
    // Anchored on .container-x's own CONTENT edge (its box left + its own
    // padding-inline — see containerEdges.ts's measureContainerX, same
    // "measure, don't reconstruct" idea, kept inline here since that helper
    // returns scroll-absolute coordinates and this needs viewport-relative
    // ones to match getBoundingClientRect() elsewhere in this function),
    // not the viewport's centre — centering the active card only LOOKS
    // right when the full-bleed viewport happens to be perfectly symmetric
    // around container-x, which isn't guaranteed (scrollbar width,
    // rounding, etc. can throw it off), and not container-x's own outer
    // box edge either — container-x has real padding-inline (global.css's
    // --container-pad, up to 4rem), so the heading text inside it sits
    // inset from that outer edge, not flush with it. Per explicit product
    // decision, the FIRST fully-visible card (the left-near card on
    // desktop, the active card itself on mobile where it's the only
    // fully-visible one) lines up flush with that same text edge.
    const visible = cardsVisible();
    const leadingCount = Math.floor((visible - 1) / 2);
    const firstVisibleExtended = activeExtended - leadingCount;
    const containerLeft = containerEl
      ? containerEl.getBoundingClientRect().left +
        (parseFloat(getComputedStyle(containerEl).paddingLeft) || 0) -
        viewport!.getBoundingClientRect().left
      : 0;
    const translateX = containerLeft - firstVisibleExtended * slot;
    track!.style.transform = `translateX(${translateX}px)`;
  }

  function render() {
    cards.forEach((card) => {
      const extendedIndex = parseInt(card.dataset.extendedIndex || '0', 10);
      const dist = extendedIndex - activeExtended;
      card.classList.toggle('is-active', dist === 0);
      card.classList.toggle('is-near', Math.abs(dist) === 1);
    });
    updateTrackPosition();
  }

  // After the slide animation finishes, if we've moved into the cloned
  // region at either end, jump back to the equivalent real card at the
  // SAME visual position — transition disabled for one frame (and a forced
  // reflow in between) so this jump is never seen, only the two identical-
  // looking clone/real cards swapping places invisibly mid-transition-gap.
  function snapIfNeeded() {
    let snapped = false;
    if (activeExtended >= CLONE_COUNT + N) {
      activeExtended -= N;
      snapped = true;
    } else if (activeExtended < CLONE_COUNT) {
      activeExtended += N;
      snapped = true;
    }
    if (snapped) {
      // .is-snapping (CSS) disables BOTH the track's transform transition
      // and every card's transform/opacity transition — render() below
      // moves .is-active/.is-near onto a different (real, not clone)
      // element, so it's not just the track's position that needs the
      // transition suppressed, or the card classes swapping would itself
      // visibly cross-fade/rescale over --slide-ms right after the "jump."
      root!.classList.add('is-snapping');
      render(); // re-evaluates classes AND track position for the new activeExtended
      void track!.offsetHeight; // force reflow before re-enabling transitions
      root!.classList.remove('is-snapping');
    }
  }

  function goTo(extendedIndex: number) {
    activeExtended = extendedIndex;
    render();
    if (snapTimer !== null) window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(snapIfNeeded, SLIDE_MS + 30);
  }
  const next = () => goTo(activeExtended + 1);
  const prev = () => goTo(activeExtended - 1);

  // Autoplay — identical structure to stepCarousel.ts.
  let autoplayTimer: number | null = null;
  let hovering = false;
  let visible = false;
  let everStarted = false;

  function stopAutoplay() {
    if (autoplayTimer !== null) {
      window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }
  function startAutoplay() {
    stopAutoplay();
    autoplayTimer = window.setInterval(next, AUTOPLAY_INTERVAL);
  }
  function maybeStart() {
    if (visible && !hovering) startAutoplay();
    else stopAutoplay();
  }
  function userGoTo(i: number) {
    goTo(i);
    maybeStart();
  }
  const userNext = () => userGoTo(activeExtended + 1);
  const userPrev = () => userGoTo(activeExtended - 1);

  prevBtn?.addEventListener('click', userPrev);
  nextBtn?.addEventListener('click', userNext);

  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      userNext();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      userPrev();
    }
  });

  let resizeTimer: number | null = null;
  window.addEventListener(
    'resize',
    () => {
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        updateCardWidth();
        updateTrackPosition();
      }, 100);
    },
    { passive: true },
  );

  if (!reduce) {
    root.addEventListener('mouseenter', () => {
      hovering = true;
      maybeStart();
    });
    root.addEventListener('mouseleave', () => {
      hovering = false;
      maybeStart();
    });

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          visible = e.isIntersecting;
          if (visible && !everStarted) {
            everStarted = true;
            window.setTimeout(maybeStart, ENTER_SETTLE_DELAY);
          } else {
            maybeStart();
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(root);
  }

  updateCardWidth();
  render();

  // Initial updateCardWidth() can measure containerEl before it's settled to
  // its final width (e.g. during the preloader's scroll-lock — see CLAUDE.md's
  // scroll-lock-shifts-width gotcha), and unlike a real user resize, nothing
  // else forces a recompute afterward. Same load/fonts.ready resync as
  // alignWhatWeDoBurst()/positionFoundationRings() in index.astro, for the
  // same reason.
  window.addEventListener('load', () => {
    updateCardWidth();
    updateTrackPosition();
  });
  document.fonts?.ready?.then(() => {
    updateCardWidth();
    updateTrackPosition();
  });

  (window as unknown as { __caseCarousel?: unknown }).__caseCarousel = { goTo, next, prev };
}
