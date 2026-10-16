import { numberValue } from './model.ts';
import type { Row } from './model.ts';
export interface Observation { x: number; weight: number }
export interface Distribution { name: string; observations: Observation[]; count: number; mean: number; median: number; bandwidth: number; points: [number,number][]; peak: number }
export function streamTable(rows: Row[], normalize = false): { groups: string[]; periods: string[]; values: number[][]; missing: number } {
  const groups = [...new Set(rows.map(r => r.group))], periods = [...new Set(rows.map(r => r.x))];
  const groupIndex = new Map(groups.map((v,i) => [v,i])), periodIndex = new Map(periods.map((v,i) => [v,i]));
  const values = periods.map(() => groups.map(() => 0));
  const seen = new Set<string>();
  for (const row of rows) { const i = periodIndex.get(row.x)!, j = groupIndex.get(row.group)!; values[i][j] += row.value; seen.add(`${i}:${j}`); }
  if (normalize) for (const series of values) { const total = series.reduce((n,v) => n+v,0); if (total) for (let j=0;j<series.length;j++) series[j] = series[j]/total*100; }
  return { groups, periods, values, missing: groups.length*periods.length-seen.size };
}
export function weightedQuantile(values: Observation[], p: number): number {
  const sorted = [...values].sort((a,b) => a.x-b.x), total = sorted.reduce((n,v) => n+v.weight,0);
  let cumulative = 0;
  for (const v of sorted) { cumulative += v.weight; if (cumulative >= p*total) return v.x; }
  return sorted.at(-1)!.x;
}
export function autoBandwidth(values: Observation[]): number {
  const total = values.reduce((n,v) => n+v.weight,0), squares = values.reduce((n,v) => n+v.weight*v.weight,0);
  const effective = total*total/squares, mean = values.reduce((n,v) => n+v.x*v.weight,0)/total;
  const deviation = Math.sqrt(values.reduce((n,v) => n+v.weight*(v.x-mean)**2,0)/total);
  const iqr = (weightedQuantile(values,.75)-weightedQuantile(values,.25))/1.34;
  const spread = Math.min(...[deviation,iqr].filter(v => v>0));
  const fallback = Math.max(Math.abs(mean)*.05, .1);
  return Math.max(1e-6, .9*(Number.isFinite(spread) ? spread : fallback)*Math.max(effective,1)**(-.2));
}
export function gaussianDensity(values: Observation[], x: number, bandwidth: number): number {
  const total = values.reduce((n,v) => n+v.weight,0);
  return values.reduce((n,v) => n+v.weight*Math.exp(-.5*((x-v.x)/bandwidth)**2),0)/(total*bandwidth*Math.sqrt(2*Math.PI));
}
export function distributions(rows: Row[], manualBandwidth = 0, samples = 180): { groups: Distribution[]; domain: [number,number] } {
  const grouped = new Map<string,Observation[]>();
  for (const row of rows) { if (!grouped.has(row.group)) grouped.set(row.group,[]); grouped.get(row.group)!.push({x:numberValue(row.x),weight:row.value}); }
  const all = [...grouped.values()].flat();
  let min = Infinity, max = -Infinity;
  for (const row of all) { min = Math.min(min,row.x); max = Math.max(max,row.x); }
  const bandwidth = Math.max(manualBandwidth || autoBandwidth(all), Math.max(Math.abs(min),Math.abs(max),1)*Number.EPSILON*64, 1e-6);
  const domain: [number,number] = [min-4*bandwidth,max+4*bandwidth];
  const groups = [...grouped].map(([name,observations]) => {
    const count = observations.reduce((n,v) => n+v.weight,0);
    const points: [number,number][] = Array.from({length:samples},(_,i) => {
      const x = domain[0]+i/(samples-1)*(domain[1]-domain[0]); return [x,gaussianDensity(observations,x,bandwidth)];
    });
    return {name,observations,count,mean:observations.reduce((n,v)=>n+v.x*v.weight,0)/count,median:weightedQuantile(observations,.5),bandwidth,points,peak:Math.max(...points.map(p=>p[1]))};
  });
  return {groups,domain};
}
