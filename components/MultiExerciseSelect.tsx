'use client';
import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {Check,ChevronDown,Search,X} from 'lucide-react';
import {normalizeExerciseName} from '../lib/exerciseCatalog';

export type MultiExerciseOption={key:string;name:string;description?:string};
export default function MultiExerciseSelect({options,selectedKeys,onToggle,label,placeholder='Buscar exercícios',disabled=false,max=40}:{
  options:MultiExerciseOption[];selectedKeys:string[];onToggle:(key:string)=>void;
  label:string;placeholder?:string;disabled?:boolean;max?:number;
}){
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState('');
  const ref=useRef<HTMLDivElement>(null);
  const listId=useId();
  const filtered=useMemo(()=>{
    const q=normalizeExerciseName(query);
    const matching=q.length?options.filter(o=>normalizeExerciseName(o.name).includes(q)):options;
    return matching.slice().sort((a,b)=>{
      const ac=selectedKeys.includes(a.key),bc=selectedKeys.includes(b.key);
      return Number(bc)-Number(ac)||a.name.localeCompare(b.name,'pt-BR');
    }).slice(0,120);
  },[options,selectedKeys,query]);
  useEffect(()=>{
    if(!open)return;
    const onOutside=(e:PointerEvent)=>{if(!ref.current?.contains(e.target as Node))setOpen(false);};
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};
    document.addEventListener('pointerdown',onOutside);
    document.addEventListener('keydown',escape);
    return ()=>{document.removeEventListener('pointerdown',onOutside);document.removeEventListener('keydown',escape);};
  },[open]);
  return <div className="multi-exercise" ref={ref}>
    <label className="input-label">{label}</label>
    <button type="button" className="multi-exercise-trigger" aria-haspopup="listbox" aria-expanded={open}
      aria-controls={open?listId:undefined} disabled={disabled} onClick={()=>setOpen(!open)}>
      <span>{selectedKeys.length?selectedKeys.length+' exercícios selecionados':'Selecionar exercícios'}</span>
      <ChevronDown size={17} className={open?'is-open':''}/>
    </button>
    {selectedKeys.length>0&&<div className="multi-exercise-chips" aria-label="Exercícios selecionados">
      {selectedKeys.map(key=>{const item=options.find(o=>o.key===key);return item?<span className="multi-exercise-chip" key={key}>
        <span>{item.name}</span><button type="button" disabled={disabled} aria-label={'Remover '+item.name} onClick={()=>onToggle(key)}><X size={13}/></button>
      </span>:null;})}
    </div>}
    {open&&!disabled&&<div className="multi-exercise-menu">
      <div className="multi-exercise-search"><Search size={17}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)}
        placeholder={placeholder} aria-label="Pesquisar exercícios"/></div>
      <div className="multi-exercise-menu-heading">{selectedKeys.length}/{max} selecionados</div>
      <div className="multi-exercise-results" role="listbox" aria-label={label} aria-multiselectable="true" id={listId}>
        {filtered.map(item=>{const selected=selectedKeys.includes(item.key);return <button
          type="button" role="option" aria-selected={selected} key={item.key}
          className={'multi-exercise-option'+(selected?' is-selected':'')}
          disabled={!selected&&selectedKeys.length>=max} onClick={()=>onToggle(item.key)}>
          <span className="multi-exercise-check">{selected&&<Check size={14}/>}</span>
          <span className="multi-exercise-option-name">{item.name}{item.description&&<small>{item.description}</small>}</span>
        </button>;})}
        {filtered.length===0&&<p className="multi-exercise-no-results">Nenhum exercício encontrado.</p>}
      </div>
      <button className="multi-exercise-close" type="button" onClick={()=>{setOpen(false);setQuery('');}}>Concluir seleção</button>
    </div>}
  </div>;
}
