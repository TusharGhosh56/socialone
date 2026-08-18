// cardSpotlight.ts — cursor-tracked gold radial gradient for [data-spotlight]
// cards (currently: Why APLYD's principle cards). Sets --spot-x/--spot-y
// CSS custom properties from the pointer's position relative to the card;
// the actual gradient/shape lives in each component's own CSS, keyed off
// those vars, and its opacity is driven by CSS :hover/:focus-visible alone
// — this script only ever writes a position, never toggles visibility.
// Skipped for touch/coarse pointers, which have no meaningful hover position
// (the CSS hover fallback still shows/hides the layer, just centred by
// default). An element with a `data-spotlight-radius` attribute (a fraction
// of its own height, e.g. "0.3333") also gets --spot-r written/kept in sync
// on resize — optional (no current consumer; Why APLYD's cards have no such
// attribute and use a fixed radius in their own CSS instead).
export function initCardSpotlight(): void {
  if ((window as unknown as { __aplydCardSpotlight?: boolean }).__aplydCardSpotlight) return;
  (window as unknown as { __aplydCardSpotlight?: boolean }).__aplydCardSpotlight = true;

  const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  if (coarse) return;

  const bind = (el: HTMLElement) => {
    if (el.dataset.spotlightBound) return;
    el.dataset.spotlightBound = 'true';

    const radiusFraction = el.dataset.spotlightRadius ? parseFloat(el.dataset.spotlightRadius) : null;
    if (radiusFraction) {
      const updateRadius = () => el.style.setProperty('--spot-r', `${el.clientHeight * radiusFraction}px`);
      updateRadius();
      window.addEventListener('resize', updateRadius, { passive: true });
    }

    el.addEventListener(
      'pointermove',
      (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--spot-x', `${e.clientX - r.left}px`);
        el.style.setProperty('--spot-y', `${e.clientY - r.top}px`);
      },
      { passive: true },
    );
  };

  document.querySelectorAll<HTMLElement>('[data-spotlight]').forEach(bind);
  // catch cards added after initial load (e.g. view-transitions)
  document.addEventListener('astro:page-load', () => {
    document.querySelectorAll<HTMLElement>('[data-spotlight]').forEach(bind);
  });
}
