// stepCarousel.ts — expanding-card carousel for How We Work's steps. Only
// one card is ever `.is-active` at a time; all the actual sizing/animation
// is plain CSS (flex-grow/flex-basis transitions, see StepCarousel.astro) —
// this toggles that one class per click/auto-advance.
//
// Autoplay: once the carousel first scrolls into view, it waits for the
// entrance reveal to settle (ENTER_SETTLE_DELAY) and then auto-advances
// every AUTOPLAY_INTERVAL ms — paused while the pointer is hovering the
// carousel (resumes fresh on mouse-leave) and while it's scrolled out of
// view. Any manual navigation (arrows, clicking OR hovering a collapsed
// card) resets the interval so the next auto-advance is a full interval
// away from that action, not stacked against whatever was already
// in-flight — "if the user selects any card, it should continue switching
// from that card." Disabled entirely under prefers-reduced-motion (click/
// arrow controls still work either way — only the two POINTER-MOVEMENT-
// driven triggers, autoplay and hover-select, are motion-gated).
//
// Hovering a card is a trigger too, not just click — but debounced
// (HOVER_SELECT_DELAY) so sweeping the mouse across several collapsed
// cards on the way to somewhere else (e.g. the arrow buttons) doesn't
// waterfall through each one; the hover has to actually linger briefly to
// commit.

const AUTOPLAY_INTERVAL = 5000;
const ENTER_SETTLE_DELAY = 450; // roughly when the entrance reveal below finishes
const HOVER_SELECT_DELAY = 150;

export function initStepCarousel(): void {
  const root = document.querySelector<HTMLElement>('[data-carousel-root]');
  const track = document.querySelector<HTMLElement>('[data-carousel-track]');
  if (!root || !track) return;

  const cards = Array.from(track.querySelectorAll<HTMLElement>('[data-carousel-card]'));
  const prevBtn = root.querySelector<HTMLButtonElement>('[data-carousel-prev]');
  const nextBtn = root.querySelector<HTMLButtonElement>('[data-carousel-next]');
  const N = cards.length;
  if (!N) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let activeIndex = 0;

  function render() {
    cards.forEach((card, i) => card.classList.toggle('is-active', i === activeIndex));
  }

  function goTo(i: number) {
    activeIndex = ((i % N) + N) % N;
    render();
  }
  const next = () => goTo(activeIndex + 1);
  const prev = () => goTo(activeIndex - 1);

  // Autoplay
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
  // Single source of truth for "should autoplay be running right now" —
  // called after every state change (visibility, hover, manual nav) rather
  // than each of those trying to independently start/stop it.
  function maybeStart() {
    if (visible && !hovering) startAutoplay();
    else stopAutoplay();
  }
  // Manual navigation resets the clock (startAutoplay() always clears any
  // existing interval first) rather than just leaving whatever was already
  // counting down in place.
  function userGoTo(i: number) {
    goTo(i);
    maybeStart();
  }
  const userNext = () => userGoTo(activeIndex + 1);
  const userPrev = () => userGoTo(activeIndex - 1);

  prevBtn?.addEventListener('click', userPrev);
  nextBtn?.addEventListener('click', userNext);
  // Collapsed cards are themselves clickable (only meaningful for those —
  // clicking the already-active one is just a no-op re-render) AND
  // hover-selectable, debounced so a mouse just passing through doesn't
  // trigger a switch (see HOVER_SELECT_DELAY above). Gated behind !reduce
  // like autoplay — an unintentional hover shouldn't animate content for
  // visitors who've asked for reduced motion, unlike a deliberate click.
  let hoverTimer: number | null = null;
  cards.forEach((card, i) => {
    card.addEventListener('click', () => userGoTo(i));
    if (!reduce) {
      card.addEventListener('mouseenter', () => {
        if (hoverTimer !== null) window.clearTimeout(hoverTimer);
        hoverTimer = window.setTimeout(() => {
          hoverTimer = null;
          userGoTo(i);
        }, HOVER_SELECT_DELAY);
      });
      card.addEventListener('mouseleave', () => {
        if (hoverTimer !== null) {
          window.clearTimeout(hoverTimer);
          hoverTimer = null;
        }
      });
    }
  });

  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      userNext();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      userPrev();
    }
  });

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

  render(); // sets the first card's .is-active class on load, not just on first interaction

  (window as unknown as { __stepCarousel?: unknown }).__stepCarousel = { goTo, next, prev };
}
