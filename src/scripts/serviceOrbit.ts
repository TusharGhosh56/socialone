// serviceOrbit.ts — "What We Do"'s radial infographic (ServiceOrbit.astro).
// Four service dots ride a slow, continuously-rotating ring around the same
// centre point flowLine.ts's `.connect-dot` anchors its "what-we-do"
// milestone to — this file never touches that element or flowLine.ts
// itself, purely visual. Each dot's own content is counter-rotated in CSS
// (matching duration, opposite direction — see .orbit__counter-spin in
// ServiceOrbit.astro) so labels stay upright while still riding the ring.
//
// Hovering/focusing/tapping a dot pauses BOTH rotations (freezing the whole
// group in place — a moving hover target is unusable) and reveals a small
// white tooltip positioned radially outward from wherever that dot
// currently sits, computed live from its real bounding rect rather than
// baked to its "home" angle, since the ring can be at any rotation when the
// user actually interacts with it.

const TOOLTIP_OFFSET = 88; // px the tooltip is pushed out beyond the dot's own centre
const VIEWPORT_MARGIN = 16; // px the tooltip is kept clear of the viewport edge

export function initServiceOrbit(): void {
  const orbits = document.querySelectorAll<HTMLElement>('[data-orbit]');
  if (!orbits.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  orbits.forEach((orbit) => {
    const spin = orbit.querySelector<HTMLElement>('[data-orbit-spin]');
    const dots = Array.from(orbit.querySelectorAll<HTMLElement>('[data-orbit-dot]'));
    if (!spin || !dots.length) return;

    function positionTooltip(dot: HTMLElement) {
      const tooltip = dot.parentElement?.querySelector<HTMLElement>('[data-orbit-tooltip]');
      if (!tooltip) return;
      const orbitRect = orbit.getBoundingClientRect();
      const dotRect = dot.getBoundingClientRect();
      const cx = orbitRect.left + orbitRect.width / 2;
      const cy = orbitRect.top + orbitRect.height / 2;
      const dotCx = dotRect.left + dotRect.width / 2;
      const dotCy = dotRect.top + dotRect.height / 2;
      const dx = dotCx - cx;
      const dy = dotCy - cy;
      const dist = Math.hypot(dx, dy) || 1;
      let ttx = (dx / dist) * TOOLTIP_OFFSET;
      let tty = (dy / dist) * TOOLTIP_OFFSET;

      // Clamp so the tooltip's own box never runs past the viewport edge —
      // matters most for dots near the left/right edge of the orbit on
      // narrower md-range viewports, where a fixed radial offset can push a
      // ~13rem-wide card half off-screen. Measured against the tooltip's
      // OWN current box (its width/height don't change with position, only
      // its resting-vs-active scale does, which is a small enough delta to
      // ignore here) rather than a hardcoded card size, so this keeps working
      // if the tooltip's copy or max-width ever changes.
      const ttRect = tooltip.getBoundingClientRect();
      const halfW = ttRect.width / 2;
      const halfH = ttRect.height / 2;
      const targetCx = dotCx + ttx;
      const targetCy = dotCy + tty;
      const minX = VIEWPORT_MARGIN + halfW;
      const maxX = window.innerWidth - VIEWPORT_MARGIN - halfW;
      const minY = VIEWPORT_MARGIN + halfH;
      const maxY = window.innerHeight - VIEWPORT_MARGIN - halfH;
      const clampedCx = Math.min(Math.max(targetCx, minX), Math.max(minX, maxX));
      const clampedCy = Math.min(Math.max(targetCy, minY), Math.max(minY, maxY));
      ttx += clampedCx - targetCx;
      tty += clampedCy - targetCy;

      tooltip.style.setProperty('--tt-dx', `${ttx}px`);
      tooltip.style.setProperty('--tt-dy', `${tty}px`);
    }

    function setActive(dot: HTMLElement | null) {
      spin!.classList.toggle('is-paused', !!dot && !reduce);
      orbit.classList.toggle('is-glowing', !!dot);
      dots.forEach((d) => {
        const isActive = d === dot;
        d.classList.toggle('is-active', isActive);
        if (isActive) positionTooltip(d);
      });
    }

    dots.forEach((dot) => {
      dot.addEventListener('pointerenter', () => setActive(dot));
      dot.addEventListener('pointerleave', () => setActive(null));
      dot.addEventListener('focus', () => setActive(dot));
      dot.addEventListener('blur', () => setActive(null));
      // Mouse/keyboard are already covered by the events above — this only
      // adds an explicit open/close toggle for touch, which has no "leave"
      // event to close a tooltip a tap just opened.
      dot.addEventListener('click', (e) => {
        if (window.matchMedia('(hover: hover)').matches) return;
        e.preventDefault();
        const willOpen = !dot.classList.contains('is-active');
        setActive(willOpen ? dot : null);
      });
    });

    window.addEventListener(
      'resize',
      () => {
        const active = dots.find((d) => d.classList.contains('is-active'));
        if (active) positionTooltip(active);
      },
      { passive: true },
    );
  });
}
