// heroVideoCarousel.ts — cross-fades between the Terminal's domain videos
// and synchronizes HUD telemetry metadata and tab states.
const INTERVAL = 6000;

export function initHeroVideoCarousel(): void {
  const hero = document.getElementById('hero');
  if (!hero) return;

  const videos = Array.from(hero.querySelectorAll<HTMLVideoElement>('[data-hero-video]'));
  const tabs = Array.from(hero.querySelectorAll<HTMLButtonElement>('[data-domain-idx]'));
  if (videos.length < 2) return;

  const statusEl = hero.querySelector<HTMLElement>('[data-hud-status]');
  const locEl = hero.querySelector<HTMLElement>('[data-hud-loc]');
  const numEl = hero.querySelector<HTMLElement>('[data-hud-domain-num]');
  const titleEl = hero.querySelector<HTMLElement>('[data-hud-domain-title]');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  let currentIndex = videos.findIndex((v) => v.classList.contains('is-active'));
  if (currentIndex < 0) currentIndex = 0;

  let timer: number | undefined;

  function setActive(nextIndex: number) {
    if (nextIndex === currentIndex) return;

    videos[currentIndex]?.classList.remove('is-active');
    tabs[currentIndex]?.classList.remove('is-active');

    currentIndex = nextIndex;

    const activeTab = tabs[currentIndex];
    videos[currentIndex]?.classList.add('is-active');
    activeTab?.classList.add('is-active');

    if (activeTab) {
      if (statusEl && activeTab.dataset.domainStatus) statusEl.textContent = activeTab.dataset.domainStatus;
      if (locEl && activeTab.dataset.domainLoc) locEl.textContent = activeTab.dataset.domainLoc;
      if (numEl) numEl.textContent = String(currentIndex + 1).padStart(2, '0');
      if (titleEl && activeTab.dataset.domainTitle) titleEl.textContent = activeTab.dataset.domainTitle;
    }
  }

  function startCycle() {
    stopCycle();
    timer = window.setInterval(() => {
      const next = (currentIndex + 1) % videos.length;
      setActive(next);
    }, INTERVAL);
  }

  function stopCycle() {
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
  }

  // Tab click handlers
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetIdx = parseInt(tab.dataset.domainIdx || '0', 10);
      setActive(targetIdx);
      startCycle(); // reset interval after manual interaction
    });
  });

  startCycle();
}
