import React, {useEffect, useState} from 'react';
import {fa, number} from './model';

interface Props {id:string;label:string;value:number;min:number;max:number;onChange:(value:number)=>void}
export function FontSizeField({id,label,value,min,max,onChange}:Props) {
  const [draft,setDraft]=useState(fa(value));
  useEffect(()=>setDraft(fa(value)),[value]);
  function commit(){const n=number(draft);if(Number.isFinite(n)){const next=Math.min(max,Math.max(min,Math.round(n)));onChange(next);setDraft(fa(next));}else setDraft(fa(value));}
  return <div className="field font-size-field"><label htmlFor={id}>{label} <span className="small">(پیکسل)</span></label><div className="font-size-controls"><input type="range" aria-label={`${label} با لغزنده`} min={min} max={max} value={value} onChange={e=>onChange(Number(e.target.value))}/><input id={id} inputMode="numeric" value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}} aria-describedby={`${id}-bounds`}/></div><span id={`${id}-bounds`} className="sr-only">از {fa(min)} تا {fa(max)} پیکسل</span></div>;
}
