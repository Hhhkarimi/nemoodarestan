declare module 'd3-voronoi-treemap' {
 import type {HierarchyNode} from 'd3-hierarchy';
 interface Generator { (root: HierarchyNode<unknown>): void; clip(points: [number,number][]): Generator; convergenceRatio(value:number): Generator; maxIterationCount(value:number): Generator; minWeightRatio(value:number): Generator; prng(value:()=>number): Generator; }
 export function voronoiTreemap(): Generator;
}
