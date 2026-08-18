// footerMark.ts — sizes the big standalone logomark in the footer's bottom-
// right corner to exactly 60% of the footer's own real rendered height, per
// explicit product decision — not a clamp()/vw approximation, since the
// footer's height is fully content-driven (auto) and can shift with copy
// changes, font loading, etc. Same "measure, don't reconstruct" discipline
// as alignWhatWeDoBurst()/positionFoundationRings() (index.astro).
//
// Also shortens the base row (the "APLYD · By Athena Infonomics | © ..."
// line) so it stops clear of the mark rather than running underneath it —
// the mark sits absolutely positioned bottom-right INSIDE the same
// (relatively positioned) container-x the base row lives in, so once the
// mark's own real width is known (from its just-set height + the SVG's own
// intrinsic aspect ratio), the gap between them is measured directly rather
// than guessed.
const MARK_HEIGHT_RATIO = 0.6;
const GAP = 32; // px clearance kept between the base row's text and the mark

export function initFooterMark(): void {
  const footer = document.querySelector<HTMLElement>('[data-footer]');
  const mark = footer?.querySelector<HTMLElement>('[data-footer-mark]');
  const base = footer?.querySelector<HTMLElement>('[data-footer-base]');
  if (!footer || !mark || !base) return;

  function size() {
    if (getComputedStyle(mark!).display === 'none') {
      // Hidden below sm (see the markup) — nothing to clear, let the base
      // row use its natural full width.
      base!.style.maxWidth = 'none';
      return;
    }
    const footerHeight = footer!.getBoundingClientRect().height;
    mark!.style.height = `${footerHeight * MARK_HEIGHT_RATIO}px`;

    const markLeft = mark!.getBoundingClientRect().left;
    const baseLeft = base!.getBoundingClientRect().left;
    const available = markLeft - baseLeft - GAP;
    base!.style.maxWidth = available > 0 ? `${available}px` : 'none';
  }

  size();
  window.addEventListener('resize', size, { passive: true });
  window.addEventListener('load', size);
  document.fonts?.ready?.then(size);
}
