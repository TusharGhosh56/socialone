// src/data/capabilities.ts — Master dataset for all 3 institutional sectors
export interface CapabilityItem {
  num: string;
  id: string;
  title: string;
  p1: string;
  p2: string;
}

export interface SectorData {
  id: 'government' | 'nonprofits' | 'philanthropy';
  label: string;
  href: string;
  pillBadge: string;
  heroH1: string;
  heroLead: string;
  sectionLead: string;
  capabilities: CapabilityItem[];
  ctaText: string;
  ctaHref: string;
  ctaTitle: string;
  ctaDesc: string;
}

export const sectorDataList: Record<'government' | 'nonprofits' | 'philanthropy', SectorData> = {
  government: {
    id: 'government',
    label: 'For Government',
    href: '/services/our-capabilities/government',
    pillBadge: 'Our Capabilities · For Government',
    heroH1: 'For government: build AI into public systems and capability',
    heroLead: 'We work with government institutions across the full AI implementation journey, from assessing readiness and identifying the right use cases to building systems and establishing the capability to operate and improve them over time.',
    sectionLead: "The four capabilities below represent the key components of that journey. Engagements may draw on one or several, depending on the institution's needs. In practice, they are closely connected, with evidence and learning from one informing the next.",
    capabilities: [
      {
        num: '01',
        id: 'readiness',
        title: 'AI portfolio and readiness',
        p1: "Before anything is built, we assess where AI can create meaningful value and what it will take to implement it effectively. This includes the institution's mandate, data maturity and ownership, existing infrastructure, workflows and workforce.",
        p2: 'We use this assessment to identify and prioritise the decisions and services where AI has a credible role, and develop a sequenced roadmap covering use cases, data and infrastructure requirements, and procurement. The aim is to establish a clear basis for investment before resources are committed to implementation.',
      },
      {
        num: '02',
        id: 'solutions',
        title: 'Public-service solutions',
        p1: 'When a use case is ready to move forward, we design and build solutions around the needs of the public service. This can include advisory and planning systems, triage and supervision tools, and data integrations that connect with existing MIS and operational systems.',
        p2: 'Interoperability, security and decision rights are addressed as part of the system design, alongside the product and technical architecture. The result is a documented solution with the architecture, requirements and controls needed for implementation, operation and future development.',
      },
      {
        num: '03',
        id: 'field-design',
        title: 'Field evidence and service design',
        p1: 'A system is only as effective as its adoption in practice. We spend time where the service is delivered to understand frontline workflows, user constraints, language and connectivity realities, and operational incentives.',
        p2: 'We use these insights to design products that work in the field and create evidence-collection systems that track adoption, user experience and service delivery. This ensures implementation decisions are informed by data from the point of delivery.',
      },
      {
        num: '04',
        id: 'capability',
        title: 'Institutional AI capability',
        p1: 'AI systems require ongoing management, governance and improvement. We help institutions build the internal capability to own, operate and oversee their systems over time.',
        p2: 'This includes technical documentation, operating and governance routines, and targeted training for the teams responsible for managing, maintaining and using the system. The objective is durable institutional capacity, reducing reliance on external partners.',
      },
    ],
    ctaText: 'For nonprofits &rarr;',
    ctaHref: '/services/our-capabilities/nonprofits',
    ctaTitle: 'For Nonprofits',
    ctaDesc: 'Strengthen programme delivery with applied intelligence and field-tested data tools.',
  },
  nonprofits: {
    id: 'nonprofits',
    label: 'For Nonprofits',
    href: '/services/our-capabilities/nonprofits',
    pillBadge: 'Our Capabilities · For Nonprofits',
    heroH1: 'For nonprofits: strengthen programme delivery with applied intelligence',
    heroLead: 'We help nonprofit organisations use AI to improve programme performance, reach communities more effectively and build the internal systems to manage their data and digital tools.',
    sectionLead: 'The four capabilities below support nonprofits at different points in their AI adoption journey—from setting priorities to building systems and measuring impact.',
    capabilities: [
      {
        num: '01',
        id: 'readiness',
        title: 'Programme AI strategy and readiness',
        p1: 'We work with nonprofit leadership and programme teams to identify where AI can support organisational goals. This includes assessing programme data, workflows, staff capacity and resource constraints.',
        p2: 'We help define practical use cases, establish data requirements and create an adoption roadmap aligned with funding and delivery timelines.',
      },
      {
        num: '02',
        id: 'solutions',
        title: 'Programme solutions and tooling',
        p1: 'We build AI-enabled tools designed for nonprofit operating environments. These include frontline worker assistance, programme monitoring dashboards, resource allocation models and communication tools that work across low-connectivity and multi-language settings.',
        p2: 'Solutions are designed to integrate with existing data collection and reporting systems.',
      },
      {
        num: '03',
        id: 'field-design',
        title: 'Field testing and community-informed design',
        p1: 'We test and refine tools directly with programme participants and frontline staff. This ensures solutions are accessible, culturally appropriate and genuinely useful in daily operations.',
        p2: 'We design lightweight feedback loops that help organisations understand how tools are being used and where improvements are needed.',
      },
      {
        num: '04',
        id: 'capability',
        title: 'Organisational capacity and data practice',
        p1: 'We help nonprofits develop the internal skills, data practices and governance needed to manage AI tools responsibly.',
        p2: 'This includes staff training, data management frameworks and documentation that enable teams to maintain and adapt systems independently.',
      },
    ],
    ctaText: 'For philanthropy &rarr;',
    ctaHref: '/services/our-capabilities/philanthropy',
    ctaTitle: 'For Philanthropy',
    ctaDesc: 'Invest with evidence and build shared, sector-wide infrastructure for portfolio scale.',
  },
  philanthropy: {
    id: 'philanthropy',
    label: 'For Philanthropy',
    href: '/services/our-capabilities/philanthropy',
    pillBadge: 'Our Capabilities · For Philanthropy',
    heroH1: 'For philanthropy: invest with evidence and build sector-wide capability',
    heroLead: 'We work with foundations and philanthropic funders to inform AI strategy, evaluate grantee initiatives and support the development of shared infrastructure for the social sector.',
    sectionLead: 'The four capabilities below help funders navigate AI investment decisions, support grantee portfolios and measure the impact of their technology funding.',
    capabilities: [
      {
        num: '01',
        id: 'readiness',
        title: 'Portfolio AI strategy and landscape assessment',
        p1: 'We help funders understand the AI landscape within their focus areas, identifying high-potential opportunities, common barriers and ecosystem gaps.',
        p2: 'We support the development of investment theses, grantmaking criteria and portfolio-level theories of change that guide responsible and impactful funding.',
      },
      {
        num: '02',
        id: 'solutions',
        title: 'Grantee support and shared infrastructure',
        p1: 'We provide technical and strategic support to grantee organisations, helping them design, implement and evaluate AI initiatives.',
        p2: 'Where appropriate, we help develop shared data assets, open-source tools and common standards that benefit multiple organisations across a portfolio or sector.',
      },
      {
        num: '03',
        id: 'field-design',
        title: 'Independent evaluation and portfolio learning',
        p1: 'We evaluate the performance, adoption and impact of AI investments across grantee portfolios. Our evaluations are structurally independent, providing funders and grantees with objective evidence on what is working, what needs adjustment and what is ready for scale.',
        p2: 'We synthesize lessons across investments to inform future grantmaking.',
      },
      {
        num: '04',
        id: 'capability',
        title: 'Responsible AI frameworks and governance',
        p1: 'We help funders establish clear principles, assessment frameworks and governance standards for AI funding. This includes guidance on data ethics, algorithmic fairness, intellectual property and long-term sustainability.',
        p2: 'We support funders in setting expectations that protect public trust and promote equitable outcomes.',
      },
    ],
    ctaText: 'For government &rarr;',
    ctaHref: '/services/our-capabilities/government',
    ctaTitle: 'For Government',
    ctaDesc: 'Build AI into public systems, frontline decisions, and sovereign capabilities.',
  },
};
