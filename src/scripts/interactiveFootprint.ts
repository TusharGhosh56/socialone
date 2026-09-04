// interactiveFootprint.ts — Drives interactive global hub selection, D3/TopoJSON white vector world map,
// animated connecting golden arcs, and clean floating hover dossier tooltip.

declare const d3: any;
declare const topojson: any;

export interface HubData {
  id: string;
  name: string;
  country: string;
  role: string;
  established: string;
  coordinates: [number, number]; // [lon, lat]
  region: 'asia' | 'africa' | 'europe' | 'americas';
  badge: string;
}

export const HUBS: HubData[] = [
  {
    id: 'india',
    name: 'India HQ & Core Lab',
    country: 'India',
    role: 'Global founding headquarters, applied AI labs & core engineering center',
    established: '2010',
    coordinates: [78.9629, 20.5937],
    region: 'asia',
    badge: 'Founding HQ & AI Lab',
  },
  {
    id: 'us',
    name: 'North America Hub',
    country: 'United States',
    role: 'Global public sector advisory, multilateral partnerships & strategy',
    established: '2016',
    coordinates: [-77.0369, 38.9072],
    region: 'americas',
    badge: 'Advisory & Multilaterals',
  },
  {
    id: 'uk',
    name: 'UK & Europe Office',
    country: 'United Kingdom',
    role: 'Development finance, policy evaluation & multilateral engagements',
    established: '2018',
    coordinates: [-0.1278, 51.5074],
    region: 'europe',
    badge: 'Policy & Evaluation',
  },
  {
    id: 'kenya',
    name: 'East Africa Regional Hub',
    country: 'Kenya',
    role: 'Sub-Saharan Africa delivery hub, Community Compass & field operations',
    established: '2019',
    coordinates: [36.8219, -1.2921],
    region: 'africa',
    badge: 'Field Ops & Community Compass',
  },
  {
    id: 'bangladesh',
    name: 'South Asia Delivery Hub',
    country: 'Bangladesh',
    role: 'Last-mile data networks, institutional systems & governance implementation',
    established: '2020',
    coordinates: [90.3563, 23.6850],
    region: 'asia',
    badge: 'Last-Mile Implementation',
  },
];

const CONNECTIONS: [string, string][] = [
  ['us', 'uk'],
  ['uk', 'india'],
  ['india', 'kenya'],
  ['india', 'bangladesh'],
  ['uk', 'kenya'],
];

export async function initInteractiveFootprint(): Promise<void> {
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

  // 2. Vector World Map Setup with D3 + TopoJSON
  const svgEl = root.querySelector<SVGSVGElement>('#footprint-vector-svg');
  const container = root.querySelector<HTMLElement>('.footprint-map-card');
  const tooltip = root.querySelector<HTMLElement>('#footprint-rich-tooltip');
  if (!svgEl || !container) return;

  if (typeof d3 === 'undefined' || typeof topojson === 'undefined') {
    setTimeout(initInteractiveFootprint, 120);
    return;
  }

  const width = container.clientWidth || 1000;
  const height = Math.min(620, Math.max(440, width * 0.52));

  const svg = d3.select(svgEl);
  svg.selectAll('*').remove();
  svg.attr('viewBox', `0 0 ${width} ${height}`);

  // Gradients and Defs
  const defs = svg.append('defs');

  const hubGlow = defs.append('radialGradient')
    .attr('id', 'fpHubGlowWhite')
    .attr('cx', '50%')
    .attr('cy', '50%')
    .attr('r', '50%');
  hubGlow.append('stop').attr('offset', '0%').attr('stop-color', '#B3820A').attr('stop-opacity', 0.85);
  hubGlow.append('stop').attr('offset', '100%').attr('stop-color', '#B3820A').attr('stop-opacity', 0);

  const arcGrad = defs.append('linearGradient')
    .attr('id', 'fpArcGradWhite')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '100%')
    .attr('y2', '100%');
  arcGrad.append('stop').attr('offset', '0%').attr('stop-color', '#B3820A').attr('stop-opacity', 0.9);
  arcGrad.append('stop').attr('offset', '100%').attr('stop-color', '#D19C33').attr('stop-opacity', 0.4);

  // Projection setup
  const projection = d3.geoNaturalEarth1();
  const path = d3.geoPath(projection);

  try {
    const topo = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then((r) => r.json());
    const geoFeatures = topojson.feature(topo, topo.objects.countries).features.filter(
      (d: any) => d.properties.name !== 'Antarctica'
    );

    projection.fitSize([width - 40, height - 30], { type: 'FeatureCollection', features: geoFeatures });

    const mapGroup = svg.append('g').attr('class', 'map-world-group').attr('transform', 'translate(20, 15)');

    // Render Countries (White / Light styling matching partner map)
    const activeCountries = ['India', 'United States of America', 'United Kingdom', 'Kenya', 'Bangladesh'];

    mapGroup.append('g')
      .attr('class', 'countries-layer')
      .selectAll('path')
      .data(geoFeatures)
      .join('path')
      .attr('d', path)
      .attr('fill', (d: any) => {
        return activeCountries.includes(d.properties.name) ? '#BFD9F2' : '#F0F4F8';
      })
      .attr('stroke', (d: any) => {
        return activeCountries.includes(d.properties.name) ? '#B3820A' : '#78A9E0';
      })
      .attr('stroke-width', (d: any) => {
        return activeCountries.includes(d.properties.name) ? 1.0 : 0.45;
      })
      .attr('class', 'country-boundary transition-colors duration-300');

    // Calculate Projected Points for Hubs
    const hubPositions: Record<string, [number, number]> = {};
    HUBS.forEach((hub) => {
      const pos = projection(hub.coordinates);
      if (pos) hubPositions[hub.id] = pos;
    });

    // Render Connecting Inter-Hub Arcs with animated dash
    const arcsGroup = mapGroup.append('g').attr('class', 'network-arcs');
    CONNECTIONS.forEach(([fromId, toId]) => {
      const p1 = hubPositions[fromId];
      const p2 = hubPositions[toId];
      if (!p1 || !p2) return;

      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      const cx = (p1[0] + p2[0]) / 2 - dy * 0.22;
      const cy = (p1[1] + p2[1]) / 2 - Math.abs(dx) * 0.18;

      const pathData = `M${p1[0]},${p1[1]} Q${cx},${cy} ${p2[0]},${p2[1]}`;

      const arcPath = arcsGroup.append('path')
        .attr('d', pathData)
        .attr('fill', 'none')
        .attr('stroke', 'url(#fpArcGradWhite)')
        .attr('stroke-width', 2.2)
        .attr('stroke-dasharray', '6,6');

      if (!reduceMotion) {
        arcPath.append('animate')
          .attr('attributeName', 'stroke-dashoffset')
          .attr('from', '240')
          .attr('to', '0')
          .attr('dur', '8s')
          .attr('repeatCount', 'indefinite');
      }
    });

    // Render Hub Pins & Nodes with Native SVG Pulsing Radar Rings
    const nodesGroup = mapGroup.append('g').attr('class', 'hubs-layer');

    const showTooltip = (hub: HubData, [px, py]: [number, number]) => {
      if (!tooltip) return;
      const titleEl = tooltip.querySelector('.tooltip-title');
      const roleEl = tooltip.querySelector('.tooltip-role');
      const yearEl = tooltip.querySelector('.tooltip-year');
      const countryEl = tooltip.querySelector('.tooltip-country');

      if (titleEl) titleEl.textContent = hub.name;
      if (roleEl) roleEl.textContent = hub.role;
      if (yearEl) yearEl.textContent = `Established ${hub.established}`;
      if (countryEl) countryEl.textContent = hub.country;

      tooltip.style.opacity = '1';
      tooltip.style.pointerEvents = 'auto';

      const containerRect = container.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();

      let left = px + 20;
      let top = py + 15 - tooltipRect.height - 15;

      if (left + tooltipRect.width > containerRect.width - 20) {
        left = px + 20 - tooltipRect.width - 15;
      }
      if (top < 15) {
        top = py + 15 + 25;
      }

      tooltip.style.left = `${Math.max(15, left)}px`;
      tooltip.style.top = `${Math.max(15, top)}px`;
    };

    const hideTooltip = () => {
      if (tooltip) {
        tooltip.style.opacity = '0';
        tooltip.style.pointerEvents = 'none';
      }
    };

    HUBS.forEach((hub) => {
      const pos = hubPositions[hub.id];
      if (!pos) return;

      const node = nodesGroup.append('g')
        .attr('class', 'map-node group cursor-default select-none')
        .attr('data-map-node', hub.id)
        .style('outline', 'none');

      if (!reduceMotion) {
        // Radar Pulse Ring 1
        const ripple1 = node.append('circle')
          .attr('cx', pos[0])
          .attr('cy', pos[1])
          .attr('r', 6)
          .attr('fill', 'none')
          .attr('stroke', '#B3820A')
          .attr('stroke-width', 2)
          .attr('opacity', 0.9);

        ripple1.append('animate')
          .attr('attributeName', 'r')
          .attr('from', '6')
          .attr('to', '30')
          .attr('dur', '2.6s')
          .attr('repeatCount', 'indefinite');

        ripple1.append('animate')
          .attr('attributeName', 'opacity')
          .attr('from', '0.9')
          .attr('to', '0')
          .attr('dur', '2.6s')
          .attr('repeatCount', 'indefinite');

        ripple1.append('animate')
          .attr('attributeName', 'stroke-width')
          .attr('from', '2.2')
          .attr('to', '0.4')
          .attr('dur', '2.6s')
          .attr('repeatCount', 'indefinite');

        // Staggered Radar Pulse Ring 2 (1.3s delay)
        const ripple2 = node.append('circle')
          .attr('cx', pos[0])
          .attr('cy', pos[1])
          .attr('r', 6)
          .attr('fill', 'none')
          .attr('stroke', '#B3820A')
          .attr('stroke-width', 2)
          .attr('opacity', 0.9);

        ripple2.append('animate')
          .attr('attributeName', 'r')
          .attr('from', '6')
          .attr('to', '30')
          .attr('dur', '2.6s')
          .attr('begin', '1.3s')
          .attr('repeatCount', 'indefinite');

        ripple2.append('animate')
          .attr('attributeName', 'opacity')
          .attr('from', '0.9')
          .attr('to', '0')
          .attr('dur', '2.6s')
          .attr('begin', '1.3s')
          .attr('repeatCount', 'indefinite');

        ripple2.append('animate')
          .attr('attributeName', 'stroke-width')
          .attr('from', '2.2')
          .attr('to', '0.4')
          .attr('dur', '2.6s')
          .attr('begin', '1.3s')
          .attr('repeatCount', 'indefinite');
      }

      // Glow Halo
      node.append('circle')
        .attr('cx', pos[0])
        .attr('cy', pos[1])
        .attr('r', 11)
        .attr('fill', 'url(#fpHubGlowWhite)')
        .attr('class', 'node-glow');

      // Solid Core Pin
      node.append('circle')
        .attr('cx', pos[0])
        .attr('cy', pos[1])
        .attr('r', 5.5)
        .attr('fill', '#B3820A')
        .attr('stroke', '#0A192F')
        .attr('stroke-width', 2)
        .attr('class', 'node-core drop-shadow-sm transition-all duration-200');

      // Permanent Country Label on Map
      node.append('text')
        .attr('x', pos[0])
        .attr('y', pos[1] + 18)
        .attr('text-anchor', 'middle')
        .attr('fill', '#0A192F')
        .attr('font-size', '10')
        .attr('font-weight', '700')
        .attr('letter-spacing', '0.5')
        .attr('class', 'select-none pointer-events-none drop-shadow-xs')
        .text(hub.country);

      // Event Listeners for Rich Tooltip (Hover only)
      node.on('mouseenter', () => showTooltip(hub, pos));
      node.on('mouseleave', hideTooltip);

      // Make sure clicking the dots does nothing (no focus, no rectangle outline)
      node.on('mousedown', (event: any) => {
        if (event && event.preventDefault) event.preventDefault();
      });
      node.on('click', (event: any) => {
        if (event && event.preventDefault) event.preventDefault();
        if (event && event.stopPropagation) event.stopPropagation();
      });
    });

  } catch (err) {
    console.error('Failed to load world map data:', err);
  }
}

if (typeof document !== 'undefined') {
  initInteractiveFootprint();
  document.addEventListener('astro:page-load', initInteractiveFootprint);
}
