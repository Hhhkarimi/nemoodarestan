import {writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {initial,colorFor} from '../shared/series/model.ts';
import {calendarTable} from '../shared/calendar/math.ts';
import {heatColor,heatDomain} from '../shared/radial/math.ts';
import {ternaryPoints,ternaryPosition} from '../shared/ternary/math.ts';
import {root} from './run.mjs';
const wrap=content=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 324">${content}</svg>`;
const cal=initial('calendar-heatmap'),table=calendarTable(cal.rows,cal.settings),domain=heatDomain(table.yearCells.map((c,index)=>({...c,index})),cal.settings);
await writeFile(resolve(root,'public/previews/calendar-heatmap.svg'),wrap(table.months.map((month,i)=>month.cells.map(c=>{const at=month.offset+c.day-1,x=17+(i%4)*145+(6-at%7)*18,y=12+Math.floor(i/4)*104+Math.floor(at/7)*14;return `<rect x="${x}" y="${y}" width="15" height="11" rx="1" fill="${c.value===null?cal.settings.missingColor:heatColor(c.value,domain,cal.settings)}"/>`;}).join('')).join('')));
const ternary=initial('ternary'),side=310,ht=side*Math.sqrt(3)/2,left=145,top=22,grids=[];
for(let axis=0;axis<3;axis++)for(let p=.2;p<1;p+=.2){const a=[0,0,0],b=[0,0,0];a[axis]=b[axis]=p;a[(axis+1)%3]=1-p;b[(axis+2)%3]=1-p;const x=ternaryPosition(...a,side),y=ternaryPosition(...b,side);grids.push(`<path d="M${left+x.x} ${top+x.y}L${left+y.x} ${top+y.y}" stroke="#aebfb4" stroke-opacity=".4"/>`);}
await writeFile(resolve(root,'public/previews/ternary.svg'),wrap(`<path d="M${left+side/2} ${top}L${left} ${top+ht}L${left+side} ${top+ht}Z" fill="none" stroke="#718b7a" stroke-width="2"/>${grids.join('')}${ternaryPoints(ternary.rows).map(p=>{const pt=ternaryPosition(p.a,p.b,p.c,side);return `<circle cx="${left+pt.x}" cy="${top+pt.y}" r="6" fill="${colorFor(ternary,p.row.group)}" stroke="#faf9f5" stroke-width="1.5"/>`;}).join('')}`));
console.log('Calendar Heatmap and Ternary previews generated from studio samples.');
