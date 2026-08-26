// ambientSpotlight.ts — GPU-Accelerated Cursor Spotlight (Strictly Scoped to Light Dotted Sections)
export function initAmbientSpotlight(): void {
  const canvases = document.querySelectorAll<HTMLElement>('[data-ambient-canvas]');
  if (canvases.length === 0) return;

  // Skip on touch/mobile devices with coarse pointers
  if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

  canvases.forEach((canvas) => {
    const spotlight = canvas.querySelector<HTMLElement>('[data-ambient-spotlight]');
    if (!spotlight) return;

    let targetX = -1000;
    let targetY = -1000;
    let currentX = -1000;
    let currentY = -1000;
    let isMoving = false;
    let isInside = false;
    let rafId: number | null = null;
    const HALF_SIZE = 350; // Half of the 700px spotlight

    function onPointerMove(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();

      // If pointer is outside the light canvas (e.g. over hero or blue sections), hide immediately
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        if (isInside) {
          isInside = false;
          spotlight!.style.opacity = '0';
        }
        return;
      }

      // Pointer is strictly inside the light dotted section!
      targetX = e.clientX - rect.left - HALF_SIZE;
      targetY = e.clientY - rect.top - HALF_SIZE;

      if (!isInside) {
        isInside = true;
        spotlight!.style.opacity = '1';
      }

      if (!isMoving) {
        isMoving = true;
        animate();
      }
    }

    function onPointerLeave() {
      isInside = false;
      spotlight!.style.opacity = '0';
      isMoving = false;
      if (rafId) cancelAnimationFrame(rafId);
    }

    function animate() {
      currentX += (targetX - currentX) * 0.16;
      currentY += (targetY - currentY) * 0.16;

      spotlight!.style.transform = `translate3d(${currentX.toFixed(1)}px, ${currentY.toFixed(1)}px, 0)`;

      if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
        rafId = requestAnimationFrame(animate);
      } else {
        isMoving = false;
      }
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    canvas.addEventListener('pointerleave', onPointerLeave);
  });
}

if (typeof document !== 'undefined') {
  initAmbientSpotlight();
  document.addEventListener('astro:page-load', initAmbientSpotlight);
}
