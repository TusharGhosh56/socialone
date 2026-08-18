// FAQ (§9 FAQ block + §12). Questions are verbatim from the spec.
//
// TODO (§16): the spec references a "copy deck" for VERBATIM full answers that
// was not included in design.md. The answers below are drafted to be accurate
// and consistent with the on-page copy so the section + FAQPage JSON-LD work
// today. Replace each `answer` with the official verbatim copy when available.
export interface Faq {
  question: string;
  answer: string;
}

export const faqs: Faq[] = [
  {
    question: 'What is APLYD?',
    answer:
      'APLYD is the applied-AI practice of Athena Infonomics. We help governments and impact-focused institutions apply artificial intelligence to improve decisions, strengthen public systems, and build lasting institutional capability.',
  },
  {
    question: 'What does APLYD do?',
    answer:
      'We help institutions move from AI ambition to real-world impact across four areas: strategy and readiness, implementation and delivery, AI engineering, and evaluation and assurance. In practice that means understanding where AI can create value, deploying solutions inside real institutions, building practical AI systems for public services, and measuring performance, safety, fairness, and impact.',
  },
  {
    question: 'What is applied AI for the public sector?',
    answer:
      'Applied AI for the public sector means using artificial intelligence to improve concrete public decisions and services — not building technology for its own sake. It starts from the decision that needs to improve and the person who makes it, and applies AI only where it adds real value within the budgets, systems, and constraints governments actually operate in.',
  },
  {
    question: 'How can governments implement AI responsibly?',
    answer:
      'Responsible AI implementation in government combines clear strategy, delivery that fits real institutions, and independent evaluation of performance, safety, fairness, and impact. It keeps humans in the loop for consequential decisions, measures outcomes in the open, and transfers the skills and governance needed to sustain the work over time.',
  },
  {
    question: 'What is institutional AI capability?',
    answer:
      'Institutional AI capability is an organisation’s durable ability to adopt, govern, and sustain AI over time — the people, processes, tools, and governance that let it run and improve AI-enabled work without depending on outside help. Building this capability, rather than the technology alone, is usually the hardest and most important part of public-sector AI.',
  },
  {
    question: 'Why do AI pilots fail to scale?',
    answer:
      'AI pilots often fail to scale because the challenge is rarely the technology itself. Many initiatives remain pilots or struggle to become part of everyday decision-making because institutions lack the capability to adopt, govern, and sustain them — insights arrive too late, projects are not designed for real budgets and systems, and knowledge stays fragmented.',
  },
  {
    question: 'How do you evaluate AI systems?',
    answer:
      'We evaluate AI systems through independent measurement and audit of performance, safety, fairness, and impact. That includes testing accuracy and fairness across relevant groups — for example across grades, dialects, and gender — and building practical safeguards so leaders can trust what AI is doing and prove it to the public.',
  },
  {
    question: 'How can development organizations adopt AI?',
    answer:
      'Development organisations can adopt AI by starting with the decisions and services they want to improve, designing for local context and real constraints, and pairing implementation with independent evaluation. Embedding delivery networks in the field and transferring capability to local teams helps solutions survive beyond the pilot and scale.',
  },
  {
    question: 'What is human-in-the-loop AI?',
    answer:
      'Human-in-the-loop AI keeps people in control of consequential decisions, using AI to inform and support human judgement rather than replace it. It is central to how we apply AI in public services — for example in AI advisory systems where officials and frontline workers review and act on AI-generated insights.',
  },
  {
    question: 'What is responsible AI implementation?',
    answer:
      'Responsible AI implementation means deploying AI in ways that are effective, accountable, and trustworthy: designed for the institution’s real context, measured openly for performance, safety, fairness, and impact, and governed so the institution can sustain and improve it. It leaves teams stronger and able to run the work themselves.',
  },
];
