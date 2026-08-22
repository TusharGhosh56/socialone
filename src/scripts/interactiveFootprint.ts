// interactiveFootprint.ts — Drives interactive global hub selection, map node highlights,
// animated SVG arc pulses, and count-up metric tickers for the Footprint section.

export interface HubData {
  id: string;
  name: string;
  country: string;
  role: string;
  established?: string;
  x: number; // percentage coordinates (0 - 100)
  y: number;
  region: 'asia' | 'africa' | 'europe' | 'americas';
}

export const HUBS: HubData[] = [
  {
    id: 'india',
    name: 'India HQ & Core Lab',
    country: 'India',
    role: 'Global founding headquarters, applied AI labs & core engineering center',
    established: '2010',
    x: 71.0,
    y: 41.5,
    region: 'asia',
  },
  {
    id: 'us',
    name: 'North America Hub',
    country: 'United States',
    role: 'Global public sector advisory, multilateral partnerships & strategy',
    established: '2016',
    x: 25.5,
    y: 34.5,
    region: 'americas',
  },
  {
    id: 'uk',
    name: 'UK & Europe Office',
    country: 'United Kingdom',
    role: 'Development finance, policy evaluation & multilateral engagements',
    established: '2018',
    x: 48.5,
    y: 25.0,
    region: 'europe',
  },
  {
    id: 'kenya',
    name: 'East Africa Regional Hub',
    country: 'Kenya',
    role: 'Sub-Saharan Africa delivery hub, Community Compass & field operations',
    established: '2019',
    x: 56.8,
    y: 54.5,
    region: 'africa',
  },
  {
    id: 'bangladesh',
    name: 'South Asia Delivery Hub',
    country: 'Bangladesh',
    role: 'Last-mile data networks, institutional systems & governance implementation',
    established: '2020',
    x: 74.2,
    y: 41.0,
    region: 'asia',
  },
];

export function initInteractiveFootprint(): void {
  const root = document.querySelector<HTMLElement>('[data-interactive-footprint]');
  if (!root) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Metric Counter Count-Up on Scroll
  const metricEls = root.querySelectorAll<HTMLElement>('[data-metric-target]');
  let counted = false;

  const runCounters = () => {
    if (counted) return;
    counted = true;

    metricEls.forEach((el) => {
      const rawTarget = el.getAttribute('data-metric-target') || '0';
      const isPlus = rawTarget.includes('+');
      const targetNum = parseInt(rawTarget.replace(/\D/g, ''), 10);
      if (isNaN(targetNum)) return;

      if (reduceMotion) {
        el.textContent = rawTarget;
        return;
      }

      const duration = 1600;
      const startTime = performance.now();

      const update = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(easeOut * targetNum);
        el.textContent = `${current}${isPlus ? '+' : ''}`;

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          el.textContent = rawTarget;
        }
      };

      requestAnimationFrame(update);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          runCounters();
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );
  observer.observe(root);

  // 2. Hub Selection and Map Highlighting
  const hubButtons = root.querySelectorAll<HTMLButtonElement>('[data-hub-id]');
  const mapNodes = root.querySelectorAll<SVGGElement>('[data-map-node]');
  const hubTooltip = root.querySelector<HTMLElement>('[data-hub-tooltip]');
  const tooltipTitle = root.querySelector<HTMLElement>('[data-tooltip-title]');
  const tooltipRole = root.querySelector<HTMLElement>('[data-tooltip-role]');
  const tooltipYear = root.querySelector<HTMLElement>('[data-tooltip-year]');
  const filterBtns = root.querySelectorAll<HTMLButtonElement>('[data-region-filter]');

  let activeHubId = 'india';

  const selectHub = (hubId: string) => {
    activeHubId = hubId;
    const hub = HUBS.find((h) => h.id === hubId);
    if (!hub) return;

    hubButtons.forEach((btn) => {
      const isActive = btn.getAttribute('data-hub-id') === hubId;
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.classList.toggle('is-active', isActive);
    });

    mapNodes.forEach((node) => {
      const isNodeActive = node.getAttribute('data-map-node') === hubId;
      node.classList.toggle('is-active', isNodeActive);
    });

    if (tooltipTitle) tooltipTitle.textContent = hub.name;
    if (tooltipRole) tooltipRole.textContent = hub.role;
    if (tooltipYear) tooltipYear.textContent = hub.established ? `Established ${hub.established}` : '';

    if (hubTooltip) {
      hubTooltip.classList.add('is-visible');
    }
  };

  hubButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const hubId = btn.getAttribute('data-hub-id');
      if (hubId) selectHub(hubId);
    });
    btn.addEventListener('mouseenter', () => {
      const hubId = btn.getAttribute('data-hub-id');
      if (hubId) selectHub(hubId);
    });
  });

  mapNodes.forEach((node) => {
    node.addEventListener('click', () => {
      const hubId = node.getAttribute('data-map-node');
      if (hubId) selectHub(hubId);
    });
    node.addEventListener('mouseenter', () => {
      const hubId = node.getAttribute('data-map-node');
      if (hubId) selectHub(hubId);
    });
  });

  // 3. Region Filter
  filterBtns.forEach((fBtn) => {
    fBtn.addEventListener('click', () => {
      const region = fBtn.getAttribute('data-region-filter');
      filterBtns.forEach((b) => b.classList.toggle('is-active', b === fBtn));

      if (region === 'all') {
        mapNodes.forEach((n) => (n.style.opacity = '1'));
        hubButtons.forEach((b) => (b.style.opacity = '1'));
      } else {
        const matchingHubs = HUBS.filter((h) => h.region === region);
        mapNodes.forEach((n) => {
          const id = n.getAttribute('data-map-node');
          const matches = matchingHubs.some((h) => h.id === id);
          n.style.opacity = matches ? '1' : '0.2';
        });
        hubButtons.forEach((b) => {
          const id = b.getAttribute('data-hub-id');
          const matches = matchingHubs.some((h) => h.id === id);
          b.style.opacity = matches ? '1' : '0.35';
        });
        if (matchingHubs.length > 0) {
          selectHub(matchingHubs[0].id);
        }
      }
    });
  });

  selectHub('india');
}
