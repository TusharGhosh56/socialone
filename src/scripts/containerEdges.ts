// Measures the page's real left/right content edge by reading a live
// `.container-x` element's own box — every `.container-x` on the page is
// identically sized/centered (same class, same viewport), so any single
// instance's rect is canonical for the whole page. This is deliberately a
// measurement, not a re-derivation of `.container-x`'s clamp()/max-width
// formula (that hand-duplication was the source of FlowChart's canvas-vs-
// content drift, fixed separately in flowChart.ts's getContentPad()).
export function measureContainerX(): { left: number; right: number } | null {
  const sample = document.querySelector<HTMLElement>('.container-x');
  if (!sample) return null;
  const rect = sample.getBoundingClientRect();
  // .container-x's own border-box spans the full available width (up to its
  // max-width) — the CONTENT edge (where children like headings actually
  // sit) is inset from that by its own padding-inline, so that padding must
  // be added back in, not just the box's own left/right.
  const pad = parseFloat(getComputedStyle(sample).paddingLeft) || 0;
  return { left: rect.left + pad + window.scrollX, right: rect.right - pad + window.scrollX };
}
