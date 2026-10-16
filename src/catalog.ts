import raw from '../catalog.json';
export interface Chart {
  id: string; title: string; englishTitle: string; category: string; categoryLabel: string;
  useCase: string; description: string; tags: string[]; formats: string[]; inputs: string;
  directory: string; buildArgs: string[]; entry: string; preview: string; source?: string; sourceCommit?: string;
}
export const charts: readonly Chart[] = raw;
export const normalize = (value: string): string => value.normalize('NFKC').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\u200c\u200d\u064b-\u065f]/g,'').toLocaleLowerCase('fa').trim();
export function matches(chart: Chart, query: string, category: string): boolean {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const text = normalize([chart.title, chart.englishTitle, chart.description, chart.categoryLabel, ...chart.tags, ...chart.formats].join(' '));
  return (category === 'all' || chart.category === category) && terms.every(term => text.includes(term));
}
export function chartFromPath(path: string): Chart | undefined {
  const match = /^\/studio\/([a-z0-9-]+)\/?$/.exec(path);
  return match ? charts.find(chart => chart.id === match[1]) : undefined;
}
