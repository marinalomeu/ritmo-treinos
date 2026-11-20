'use client';
import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export type ExerciseOption = {key:string;name:string;description?:string};
export default function ExerciseMultiSelect({options,selected,onChange,label='Selecionar exercícios',placeholder='Buscar exercícios...',max=40}:{
  options:ExerciseOption[];selected:string[];onChange:(keys:string[])=>void;label?:string;placeholder?:string;max?:number;
}){
  const [open,setOpen]=useState(false);
  const [search,setSearch]=useState('');
  const filtered=useMemo(()=>options.filter(o=>o.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))),[options,search]);
  const toggle=(key:string)=>onChange(selected.includes(key)?selected.filter(x=>x!==key):selected.length>=max?selected:[...selected,key]);
  return <div className="multi-exercise">
    <button type="button" className="multi-exercise-trigger" aria-expanded={open} aria-label={label} onClick={()=>setOpen(v=>!v)}>
      <span>{selected.length? `${selected.length} ${selected.length===1?'exercício selecionado':'exercícios selecionados'}`:label}</span><ChevronDown size={17}/>
    </button>
    {selected.length>0&&<div className="multi-exercise-chips">{selected.map(key=>{const item=options.find(o=>o.key===key);return item?<span className="multi-exercise-chip" key={key}>{item.name}<button type="button" aria-label={`Remover ${item.name}`} onClick={()=>toggle(key)}><X size={12}/></button></span>:null;})}</div>}
    {open&&<div className="multi-exercise-panel"><label className="multi-exercise-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={placeholder} aria-label="Buscar exercícios"/></label>
      <div className="multi-exercise-options">{filtered.length?filtered.map(o=><button type="button" role="checkbox" aria-checked={selected.includes(o.key)} key={o.key} className="multi-exercise-option" disabled={!selected.includes(o.key)&&selected.length>=max} onClick={()=>toggle(o.key)}><span className={`multi-exercise-check ${selected.includes(o.key)?'checked':''}`}>{selected.includes(o.key)&&<Check size={13}/>}</span><span><strong>{o.name}</strong>{o.description&&<small>{o.description}</small>}</span></button>):<p className="multi-exercise-empty">Nenhum exercício encontrado.</p>}</div>
      <div className="multi-exercise-actions"><small>{selected.length} de {max} selecionados</small><button type="button" onClick={()=>setOpen(false)}>Concluir</button></div>
    </div>}
  </div>;
}
