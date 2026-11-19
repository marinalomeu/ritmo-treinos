'use client';
import { useMemo, useState } from 'react';
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

export default function ExercisePicker({value,selectedKey,items,usedKeys,busy=false,onType,onSelect,onCreate}:Props){
  const [focused,setFocused]=useState(false);
  const [modality,setModality]=useState<Modality>('Academia');
  const [creating,setCreating]=useState(false);
  const query=normalizeExerciseName(value);
  const matches=useMemo(()=>query.length===0?[]:items.filter(item=>normalizeExerciseName(item.name).includes(query)).slice(0,8),[items,query]);
  const exact=items.some(item=>normalizeExerciseName(item.name)===query);
  const selected=items.some(item=>item.key===selectedKey&&normalizeExerciseName(item.name)===query);
  const canCreate=query.length>0&&!exact&&!selected&&!creating&&!busy;
  const create=async()=>{
    if(!canCreate)return;
    setCreating(true);
    try{await onCreate(value.trim(),modality);setFocused(false);}
    finally{setCreating(false);}
  };
  return <div className="exercise-picker">
    <label>NOME
      <input
        autoComplete="off"
        maxLength={100}
        value={value}
        placeholder="Digite para buscar ou criar"
        aria-label="Buscar exercício na biblioteca"
        aria-expanded={focused&&matches.length>0}
        onChange={e=>{onType(e.target.value);setFocused(true);}}
        onFocus={()=>setFocused(true)}
        onBlur={()=>window.setTimeout(()=>setFocused(false),120)}
      />
    </label>
    {focused&&matches.length>0&&<div className="exercise-picker-options" role="listbox" aria-label="Exercícios encontrados">
      {matches.map(item=><button
        type="button"
        key={item.key}
        role="option"
        aria-selected={selectedKey===item.key}
        disabled={busy||(usedKeys.includes(item.key)&&selectedKey!==item.key)}
        onMouseDown={e=>e.preventDefault()}
        onClick={()=>{onSelect(item);setFocused(false);}}
      ><strong>{item.name}</strong><small>{usedKeys.includes(item.key)&&selectedKey!==item.key?'Já está nesta ficha':item.origin==='global'?'Catálogo geral':item.origin==='personal'?'Meu exercício':'Minhas fichas'}</small></button>)}
    </div>}
    {canCreate&&<div className="exercise-picker-new">
      <select value={modality} onChange={e=>setModality(e.target.value as Modality)} aria-label="Modalidade do novo exercício">
        {MODALITIES.map(m=><option key={m} value={m}>{m}</option>)}
      </select>
      <button type="button" disabled={busy} onClick={()=>void create()}>+ Salvar “{value.trim()}” só para mim</button>
    </div>}
    {selected&&<small className="exercise-picker-linked">Exercício vinculado: séries e PRs usam a mesma identidade entre fichas.</small>}
    {query&&!selected&&exact&&<small className="exercise-picker-hint">Escolha o exercício sugerido para reutilizar o histórico.</small>}
  </div>;
}
