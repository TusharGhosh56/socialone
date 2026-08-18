// heroVideoCarousel.ts — cross-fades between the Hero's background videos
// (VIDEO_SOURCES in HeroFlow.astro, currently 6) every 7s, looping back to
// the first after the last — driven by videos.length throughout, so the
// count can change there without touching this file. All <video>
// elements are mounted and playing simultaneously the whole time (see
// HeroFlow.astro) — this only toggles which one is `.is-active` (a plain
// CSS opacity transition, see heroFlow.css), so the incoming video is
// already mid-playback and there's no load/seek delay at the moment of the
// fade. Disabled under prefers-reduced-motion — the first video just plays
// on its own, no cycling.

const INTERVAL = 7000;

export function initHeroVideoCarousel(): void {
  const videos = Array.from(document.querySelectorAll<HTMLVideoElement>('[data-hero-video]'));
  if (videos.length < 2) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  let index = videos.findIndex((v) => v.classList.contains('is-active'));
  if (index < 0) index = 0;

  window.setInterval(() => {
    videos[index].classList.remove('is-active');
    index = (index + 1) % videos.length;
    videos[index].classList.add('is-active');
  }, INTERVAL);
}
