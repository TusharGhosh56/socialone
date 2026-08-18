// Trust metrics (§9 §2). `value` is the count-up target; `suffix` renders after.
export interface Metric {
  value: number;
  suffix: string;
  label: string;
}

export const metrics: Metric[] = [
  { value: 440, suffix: '+', label: 'Projects delivered' },
  { value: 240, suffix: '+', label: 'Institutions served' },
  { value: 16, suffix: '+', label: 'Years of experience' },
  { value: 5, suffix: '', label: 'Continents' },
  { value: 120, suffix: '+', label: 'Experts' },
];
