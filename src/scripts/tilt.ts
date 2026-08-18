// Shared pointer-tracked 3D tilt for card-style elements. Any element with
// `data-tilt` gets a subtle perspective rotation that follows the cursor,
// plus a small lift; resets on pointerleave. Skipped for touch/coarse
// pointers and reduced-motion (CSS :hover fallbacks still apply).
export function initTilt(): void {
  if ((window as unknown as { __aplydTilt?: boolean }).__aplydTilt) return;
  (window as unknown as { __aplydTilt?: boolean }).__aplydTilt = true;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  if (reduce || coarse) return;

  const STRENGTH = 7; // max degrees of rotation
  const LIFT = 6; // px

  const bind = (el: HTMLElement) => {
    if (el.dataset.tiltBound) return;
    el.dataset.tiltBound = 'true';

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform =
        `perspective(900px) rotateX(${(-py * STRENGTH).toFixed(2)}deg) ` +
        `rotateY(${(px * STRENGTH).toFixed(2)}deg) translateY(-${LIFT}px)`;
    };
    const onLeave = () => {
      el.style.transform = '';
    };

    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave, { passive: true });
  };

  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach(bind);

  // catch cards added after initial load (e.g. view-transitions)
  document.addEventListener('astro:page-load', () => {
    document.querySelectorAll<HTMLElement>('[data-tilt]').forEach(bind);
  });
}
