import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {compute,defaults,sample,number,parseRows,validate} from '../src/model';
describe('Persian data and weighted Voronoi',()=>{
 it('reads Persian/Arabic numerals and decimal separators',()=>{assert.equal(number('۱٬۲۳۴٫۵'),1234.5);assert.equal(number('١٢'),12);assert.ok(Number.isNaN(number('')));});
 it('imports quoted Persian CSV',()=>{const rows=parseRows('نام,گروه,مقدار\n"خانه، اجاره",ضروری,۳۵');assert.equal(rows[0].name,'خانه، اجاره');assert.equal(number(rows[0].value),35);});
 it('rejects invalid weights and names',()=>{assert.equal(validate([{id:'x',name:'',group:'',value:'0'}]).length,2);assert.throws(()=>parseRows('[{"name":"x","value":-1}]'));});
 it('creates deterministic, complete polygons with accurate areas',()=>{for(const shape of ['circle','rectangle','hexagon']){const a=compute(sample,{...defaults,shape});const b=compute(sample,{...defaults,shape});assert.equal(a.cells.length,sample.length);assert.ok(a.error<.025,`${shape}: ${a.error}`);assert.deepEqual(a.cells[0].polygon,b.cells[0].polygon);assert.ok(a.cells.every(c=>c.polygon.length>=3&&c.area>0));}});
 it('handles one leaf and drilldown',()=>{const a=compute([sample[0]],defaults);assert.ok(a.error<1e-8);const b=compute(sample,defaults,'آینده');assert.equal(b.cells.length,2);assert.equal(b.total,23);});
});
