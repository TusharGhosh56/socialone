// src/data/capabilities.ts — Master dataset for all 3 institutional sectors (100% Verbatim Copy)
export interface CapabilityItem {
  num: string;
  id: string;
  title: string;
  p1: string;
  p2: string;
  image: string;
  imageAlt: string;
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
    heroLead: "We work with government institutions across the full AI implementation journey, from assessing readiness and identifying the right use cases to building systems and establishing the capability to operate and improve them over time. The four capabilities below represent the key components of that journey. Engagements may draw on one or several, depending on the institution's needs. In practice, they are closely connected, with evidence and learning from one informing the next.",
    sectionLead: "The four capabilities below represent the key components of that journey. Engagements may draw on one or several, depending on the institution's needs. In practice, they are closely connected, with evidence and learning from one informing the next.",
    capabilities: [
      {
        num: '01',
        id: 'readiness',
        title: 'AI portfolio and readiness',
        p1: "Before anything is built, we assess where AI can create meaningful value and what it will take to implement it effectively. This includes the institution's mandate, data maturity and ownership, existing infrastructure, workflows and workforce.",
        p2: 'We use this assessment to identify and prioritise the decisions and services where AI has a credible role, and develop a sequenced roadmap covering use cases, data and infrastructure requirements, and procurement. The aim is to establish a clear basis for investment before resources are committed to implementation',
        image: '/src/assets/images/capabilities/ai.png',
        imageAlt: 'Institutional AI readiness assessment and governance roadmap',
      },
      {
        num: '02',
        id: 'solutions',
        title: 'Public-service solutions',
        p1: 'When a use case is ready to move forward, we design and build solutions around the needs of the public service. This can include advisory and planning systems, triage and supervision tools, and data integrations that connect with existing MIS and operational systems.',
        p2: 'Interoperability, security and decision rights are addressed as part of the system design, alongside the product and technical architecture. The result is a documented solution with the architecture, requirements and controls needed for implementation, operation and future development.',
        image: '/src/assets/images/built-for-gov/photo-1524178232363-1fb2b075b655.png',
        imageAlt: 'Frontline public service delivery and civic digital solutions',
      },
      {
        num: '03',
        id: 'field-design',
        title: 'Field evidence and service design',
        p1: 'Effective public services depend on how systems work in practice. We study users and workflows in their actual delivery settings, bringing together evidence from frontline teams and the people who use the service.',
        p2: 'This evidence informs co-design and prototyping with the people who will operate and use the system. We also establish the supporting foundations required for responsible implementation, including data standards, security controls, governance and standard operating procedures. The focus is not only on the tool, but on the service environment in which it needs to work.',
        image: '/src/assets/images/capabilities/hero-fieldwork.jpg',
        imageAlt: 'Field researchers gathering evidence from frontline workers and citizens',
      },
      {
        num: '04',
        id: 'capability',
        title: 'Capability and ownership',
        p1: 'Sustained adoption requires institutional capability, not continued dependence on an external provider. We build ownership into the engagement from the outset, with clear product responsibilities, user training and the support structures required to operate the system.',
        p2: 'We also help institutions develop the capacity to assess model quality, fairness and public outcomes over time. The objective is to leave teams with the knowledge, operating routines and assurance mechanisms needed to manage and improve the system independently.',
        image: '/src/assets/images/how-we-work-page/building.png',
        imageAlt: 'Institutional capacity building and sovereign codebase handover',
      },
    ],
    ctaText: 'See it in practice',
    ctaHref: '/ai-in-action/public-services-government',
    ctaTitle: 'See it in practice',
    ctaDesc: 'Explore how applied AI systems operate inside real public service delivery.',
  },
  nonprofits: {
    id: 'nonprofits',
    label: 'For Nonprofits',
    href: '/services/our-capabilities/nonprofits',
    pillBadge: 'Our Capabilities · For Nonprofits',
    heroH1: 'For nonprofits: make AI useful across strategy and delivery',
    heroLead: 'We work with nonprofits and development organisations to apply AI across strategy, programme operations and delivery. Our work spans the journey from identifying where AI can create value to building the systems, capabilities and safeguards required for responsible adoption, and measuring what changes in practice.',
    sectionLead: 'The four capabilities below support nonprofits at different points in their AI adoption journey—from setting priorities to building systems and measuring impact.',
    capabilities: [
      {
        num: '01',
        id: 'strategy',
        title: 'Strategy and prioritisation',
        p1: 'Organisations often have substantial programme evidence across evaluations, partner reports and operational data, but limited capacity to bring it together for strategic decision-making. We synthesise this evidence to identify decisions where AI can create meaningful value, and assess opportunities against organisational priorities, resources and readiness.',
        p2: 'We then develop an AI opportunity portfolio and, where useful, use scenario analysis to support strategic and resource decisions. The resulting roadmap sequences adoption around clear priorities, evidence and organisational capacity.',
        image: '/src/assets/images/capabilities/strategy_priority.jpg',
        imageAlt: 'Nonprofit institutional strategy and programme readiness assessment',
      },
      {
        num: '02',
        id: 'operations',
        title: 'Operations and partner support',
        p1: 'We begin by understanding the workflows through which programmes are delivered, including the roles, information and processes that support day-to-day operations. This informs the design of knowledge retrieval systems, programme operations copilots and tools that strengthen coordination and support across partner networks.',
        p2: 'Solutions are prototyped in real delivery environments and designed around the practical conditions of implementation, including differences in data, connectivity and organisational capacity. The objective is to develop systems that integrate with existing workflows and can be adopted across diverse delivery contexts.',
        image: '/src/assets/images/capabilities/operations.png',
        imageAlt: 'Programme operations co-design and partner coordination workflows',
      },
      {
        num: '03',
        id: 'adoption',
        title: 'Responsible adoption',
        p1: 'Responsible adoption begins with understanding the conditions in which an AI system will operate. We assess data maturity, define appropriate human oversight and evaluate technology options against requirements for privacy, safety and equity, alongside functional and operational considerations.',
        p2: "We establish the governance arrangements, safeguards and operating procedures required for responsible use, while building the capability of product owners and users to manage the system in practice. This embeds responsibility within the organisation's operating model rather than treating it as a separate compliance exercise.",
        image: '/src/assets/images/how-we-work-page/evaluation.png',
        imageAlt: 'Responsible AI adoption safeguards and operational governance',
      },
      {
        num: '04',
        id: 'learning',
        title: 'Learning and scale',
        p1: 'Once a system is in use, we assess performance across the model, users, workflows and the outcomes it is intended to support. This provides evidence on system performance, adoption, operational constraints and areas requiring improvement.',
        p2: 'Findings are translated into an improvement backlog and used to inform decisions on further development and scale. Expansion is based on evidence of performance, adoption and organisational readiness, rather than deployment alone.',
        image: '/src/assets/images/how-we-work-page/evidence.png',
        imageAlt: 'Programme learning, performance verification and scale decision making',
      },
    ],
    ctaText: 'See it in practice',
    ctaHref: '/ai-in-action/monitoring-evaluation-responsible-ai',
    ctaTitle: 'See it in practice',
    ctaDesc: 'Explore how monitoring, evaluation and responsible AI support lasting impact.',
  },
  philanthropy: {
    id: 'philanthropy',
    label: 'For Philanthropy',
    href: '/services/our-capabilities/philanthropy',
    pillBadge: 'Our Capabilities · For Philanthropy',
    heroH1: 'For philanthropy: turn portfolio evidence into better decisions',
    heroLead: 'We work with funders who want their portfolios to make better decisions, not simply to fund more technology. The four capabilities below move from reading the evidence across a portfolio to the independent assurance that keeps the next allocation honest.',
    sectionLead: 'The four capabilities below support funders at different points in their investment cycle—from reading portfolio evidence to building shared infrastructure and conducting independent assurance.',
    capabilities: [
      {
        num: '01',
        id: 'strategy',
        title: 'Portfolio strategy',
        p1: "A fund's influence tends to concentrate in a handful of decisions that move money and shape a field. We read the evidence across the whole portfolio to find those decisions, rather than treating each grant in isolation, and look for where AI could strengthen them.",
        p2: "The opportunity view we build is grounded in the fund's own strategy, not a generic technology agenda dropped on top of it. What a funder is left with is a clear line from evidence, to the decisions that matter, to the roadmap that would fund them.",
        image: '/src/assets/images/purpose-direction/donate.png',
        imageAlt: 'Philanthropic portfolio strategy and investment decision intelligence',
      },
      {
        num: '02',
        id: 'infrastructure',
        title: 'Ecosystem infrastructure',
        p1: 'Funders often pay several grantees to build the same thing four times over, then wonder why none of it is maintained. Where a data system, a shared tool or a knowledge platform could serve many grantees at once, we design and build it as shared infrastructure.',
        p2: 'That includes a clear model for how the infrastructure is governed, reused and kept alive after the initial grant. Done well, it spreads cost, raises the floor for smaller grantees who could never build it alone, and leaves something durable in the field rather than a set of one-off tools that expire with their funding.',
        image: '/src/assets/images/cases/08-agriculture-systems.jpg',
        imageAlt: 'Shared digital public infrastructure and cross-grantee platforms',
      },
      {
        num: '03',
        id: 'capability',
        title: 'Grantee capability',
        p1: 'Tools that grantees do not truly own tend to stall the moment a grant ends. We run workshops and hands-on support so grantees genuinely hold the tools they are given, understand how they work, and can keep them running.',
        p2: 'Alongside that, we set responsible-AI guardrails practical enough for a stretched team to actually follow, rather than a compliance checklist that gets ignored. The aim is capability that outlasts the funding, not a dependency that has to be renewed with every cycle.',
        image: '/src/assets/images/how-we-work-page/transfer.png',
        imageAlt: 'Grantee capability building and hands-on operational workshops',
      },
      {
        num: '04',
        id: 'assurance',
        title: 'Independent assurance',
        p1: 'Finally, we measure what actually changed for the people a portfolio is meant to serve, not just what was built or delivered. We test quality, fairness and adoption, and report back plainly, including when the honest answer is that something did not work.',
        p2: "Because we keep this work separate from delivery, a funder gets a read it can trust and defend, and each allocation is better informed than the last. Over time, that is what turns a portfolio's evidence into better decisions rather than better reporting.",
        image: '/src/assets/images/capabilities/independant.jpg',
        imageAlt: 'Independent algorithmic assurance and portfolio evaluation',
      },
    ],
    ctaText: 'See it in practice',
    ctaHref: '/ai-in-action/monitoring-evaluation-responsible-ai',
    ctaTitle: 'See it in practice',
    ctaDesc: 'Explore how monitoring, evaluation and responsible AI support lasting impact.',
  },
};
