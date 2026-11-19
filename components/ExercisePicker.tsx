'use client';
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import type { CatalogExercise } from '../lib/exerciseCatalog';
import { normalizeExerciseName } from '../lib/exerciseCatalog';
import type { Modality } from '../lib/personalRecords';
import { MODALITIES } from '../lib/personalRecords';

type Props={
  value:string;
  selectedKey:string;
  items:CatalogExercise[];
  usedKeys:string[];
  busy?:boolean;
  onType:(name:string)=>void;
  onSelect:(exercise:CatalogExercise)=>void;
  onCreate:(name:string,modality:Modality)=>Promise<void>;
};

// Prioriza começo do nome, depois começo de palavra, por último trecho interno.
// Usa o mesmo catálogo e as mesmas chaves, sem criar exercícios duplicados.
export function rankExerciseMatches(items:CatalogExercise[],search:string){
  const query=normalizeExerciseName(search);
  if(query.length<2)return [];
  const rank=(name:string)=>{
    const normalized=normalizeExerciseName(name);
    if(normalized===query)return 0;
    if(normalized.startsWith(query))return 1;
    if(normalized.split(/\s+/).some(word=>word.startsWith(query)))return 2;
    if(normalized.includes(query))return 3;
    return 4;
  };
  return items
    .map(item=>({item,rank:rank(item.name)}))
    .filter(row=>row.rank<4)
    .sort((a,b)=>a.rank-b.rank||a.item.name.localeCompare(b.item.name,'pt-BR'))
    .slice(0,8)
    .map(row=>row.item);
}

const sourceLabel=(origin:CatalogExercise['origin'])=>
  origin==='global'?'Catálogo geral':origin==='personal'?'Meu exercício':'Minhas fichas';

export default function ExercisePicker({value,selectedKey,items,usedKeys,busy=false,onType,onSelect,onCreate}:Props){
  const root=useRef<HTMLDivElement>(null);
  const resultsId=useId();
  const [focused,setFocused]=useState(false);
  const [modality,setModality]=useState<Modality>('Academia');
  const [creating,setCreating]=useState(false);
  const [creatingForm,setCreatingForm]=useState(false);
  const [activeIndex,setActiveIndex]=useState(-1);
  const query=normalizeExerciseName(value);
  const matches=useMemo(()=>rankExerciseMatches(items,value),[items,value]);
  const exact=items.some(item=>normalizeExerciseName(item.name)===query);
  const selected=items.some(item=>item.key===selectedKey&&normalizeExerciseName(item.name)===query);
  const canCreate=query.length>=3&&!exact&&!selected&&!creating&&!busy;
  const open=focused&&query.length>=2&&!selected;

  const choose=(item:CatalogExercise)=>{
    if(busy||(usedKeys.includes(item.key)&&selectedKey!==item.key))return;
    onSelect(item);
    setFocused(false);
    setCreatingForm(false);
    setActiveIndex(-1);
  };
  const create=async()=>{
    if(!canCreate)return;
    setCreating(true);
    try{
      await onCreate(value.trim(),modality);
      setFocused(false);
      setCreatingForm(false);
      setActiveIndex(-1);
    }finally{setCreating(false);}
  };
  const onInputKeyDown=(event:KeyboardEvent<HTMLInputElement>)=>{
    if(event.key==='Escape'){
      setFocused(false);
      setCreatingForm(false);
      setActiveIndex(-1);
      return;
    }
    if(!open||matches.length===0)return;
    if(event.key==='ArrowDown'){
      event.preventDefault();
      setActiveIndex(i=>Math.min(i+1,matches.length-1));
    }else if(event.key==='ArrowUp'){
      event.preventDefault();
      setActiveIndex(i=>Math.max(0,i-1));
    }else if(event.key==='Enter'&&activeIndex>=0){
      event.preventDefault();
      choose(matches[activeIndex]);
    }
  };

  return <div className="exercise-picker" ref={root}>
    <label>NOME
      <span className="exercise-picker-input-wrap">
        <Search size={17} aria-hidden="true"/>
        <input
          autoComplete="off"
          maxLength={100}
          value={value}
          placeholder="Buscar exercício no catálogo"
          aria-label="Buscar exercício na biblioteca"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open?resultsId:undefined}
          onKeyDown={onInputKeyDown}
          onChange={e=>{
            onType(e.target.value);
            setFocused(true);
            setCreatingForm(false);
            setActiveIndex(-1);
          }}
          onFocus={()=>setFocused(true)}
          onBlur={event=>{
            if(root.current?.contains(event.relatedTarget as Node))return;
            window.setTimeout(()=>setFocused(false),160);
          }}
        />
      </span>
    </label>
    {focused&&query.length===1&&<small className="exercise-picker-help">Digite mais uma letra para buscar no catálogo.</small>}
    {open&&<div className="exercise-picker-dropdown">
      <div className="exercise-picker-dropdown-heading">
        <span>{matches.length?'EXERCÍCIOS ENCONTRADOS':'SEM RESULTADOS'}</span>
        {matches.length>0&&<span>{matches.length} sugestões</span>}
      </div>
      {matches.length>0?<div className="exercise-picker-options" role="listbox" id={resultsId} aria-label="Exercícios encontrados">
        {matches.map((item,index)=>{
          const unavailable=usedKeys.includes(item.key)&&selectedKey!==item.key;
          return <button
            className={activeIndex===index?'exercise-picker-option active':'exercise-picker-option'}
            type="button"
            key={item.key}
            role="option"
            aria-selected={selectedKey===item.key}
            disabled={busy||unavailable}
            onMouseDown={event=>event.preventDefault()}
            onMouseEnter={()=>setActiveIndex(index)}
            onClick={()=>choose(item)}
          >
            <span className="exercise-picker-option-name">{item.name}</span>
            <span className={unavailable?'exercise-picker-origin is-unavailable':'exercise-picker-origin'}>{unavailable?'Já está na ficha':sourceLabel(item.origin)}</span>
            {selectedKey===item.key&&<Check size={15} aria-hidden="true"/>}
          </button>;
        })}
      </div>:<p className="exercise-picker-empty">Nenhum exercício com esse nome. Verifique a escrita ou crie um exercício pessoal.</p>}
      {canCreate&&<div className="exercise-picker-footer">
        {!creatingForm?<button
          type="button"
          className="exercise-picker-create-trigger"
          onMouseDown={event=>event.preventDefault()}
          onClick={()=>setCreatingForm(true)}
        ><Plus size={16}/><span>Não encontrou? <strong>Criar “{value.trim()}”</strong></span></button>:<div className="exercise-picker-create-form">
          <p>Novo exercício só para você</p>
          <select value={modality} onChange={e=>setModality(e.target.value as Modality)} aria-label="Modalidade do novo exercício">
            {MODALITIES.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <button type="button" disabled={busy||creating} onMouseDown={event=>event.preventDefault()} onClick={()=>void create()}>
            {creating?'Salvando…':'Salvar exercício pessoal'}
          </button>
        </div>}
      </div>}
      {!canCreate&&query.length===2&&!exact&&<p className="exercise-picker-create-hint">Digite pelo menos 3 letras para criar um exercício.</p>}
    </div>}
    {selected&&<small className="exercise-picker-linked"><Check size={13} aria-hidden="true"/> Exercício selecionado. Seu histórico será reutilizado.</small>}
    {query&&!selected&&exact&&<small className="exercise-picker-hint">Selecione o exercício da lista para manter o histórico e os recordes.</small>}
  </div>;
}
