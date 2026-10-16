import {test} from 'node:test';
import assert from 'node:assert/strict';
import {numberValue,parseCSV,matrixFor,validate,layoutMatrix} from '../src/data.ts';
import {chord,chordDirected} from 'd3-chord';
test('Persian and Arabic grouped decimal values',()=>{assert.equal(numberValue('۱٬۲۳۴٫۵'),1234.5);assert.equal(numberValue('٢٥٠'),250);});
test('quoted CSV and Persian header',()=>{assert.deepEqual(parseCSV('مبدأ,مقصد,مقدار\n"فروش, شرق","واحد ""الف""",۱۲\n'),[{source:'فروش, شرق',target:'واحد "الف"',value:'۱۲'}]);assert.throws(()=>parseCSV('"a,b,1'));});
test('duplicates aggregate and reciprocal cycles survive',()=>{const flows=[{source:'الف',target:'ب',value:'۱۰'},{source:'الف',target:'ب',value:'۵'},{source:'ب',target:'الف',value:'۲'}];assert.equal(validate(flows),'');assert.deepEqual(matrixFor(flows).matrix,[[0,15],[2,0]]);});
test('invalid and empty values rejected',()=>{for(const value of ['','-1','Infinity','متن','۰'])assert.ok(validate([{source:'الف',target:'ب',value}]));assert.ok(validate([]));});
test('ordinary and directed charts count both endpoints correctly',()=>{const matrix=[[10,120],[25,0]];const ordinary=chord()(layoutMatrix(matrix,false));assert.deepEqual(ordinary.groups.map(g=>g.value),[155,145]);assert.equal(ordinary.length,2);const directed=chordDirected()(layoutMatrix(matrix,true));assert.deepEqual(directed.groups.map(g=>g.value),[165,145]);assert.equal(directed.length,3);});

