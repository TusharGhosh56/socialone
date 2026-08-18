// What APLYD does — 4 service cards (§9 §4). Copy verbatim.
export interface Service {
  title: string;
  body: string;
}

export const services: Service[] = [
  {
    title: 'Strategy & Direction',
    body: 'Identify the problems worth solving and build a clear path from ambition to action.',
  },
  {
    title: 'Field & Delivery',
    body: 'Bring together local knowledge and real-world evidence to shape better decisions.',
  },
  {
    title: 'Design, Build & Scale',
    body: 'Build solutions that fit existing systems and can grow with the institution.',
  },
  {
    title: 'Evaluation & Assurance',
    body: 'Measure results independently so future decisions are based on evidence.',
  },
];
