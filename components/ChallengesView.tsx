'use client';
import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Flag, Play, Search, Timer, Trophy } from 'lucide-react';
import { CHALLENGES, type ChallengeDefinition } from '../lib/challengeTemplates';

type Step={name:string;amount:number;unit:string;round?:number;block?:number;station?:number;zone?:number;loadKg?:Record<string,number>;loadKgPerHand?:Record<string,number>;rxLoadKg?:Record<string,number>;targetHeightM?:Record<string,number>;resistance?:Record<string,{xebex:number;torque:number}>;scoreUnit?:string};
type Challenge={id:string;name:string;modality:string;format:string;steps:Step[];notes?:string;rounds?:number;timeCapSeconds?:number;divisions?:string[];sources?:string[];standard?:string};
const challenges=CHALLENGES as ChallengeDefinition[];
const divisions=[['women_open','Feminino Open'],['men_open','Masculino Open'],['women_pro','Feminino Pro'],['men_pro','Masculino Pro'],['women','Feminino RX'],['men','Masculino RX']] as const;
const fmt=(n:number)=>n.toLocaleString('pt-BR',{maximumFractionDigits:2});
const formatStep=(s:Step)=>`${fmt(s.amount)} ${s.unit==='reps'?'reps':s.unit}`;
const fmtFormat=(c:Challenge)=>c.format==='amrap'?'AMRAP':c.format==='for_time'?'For Time':c.format==='total_reps'?'Máximo de repetições':c.format==='distance'?'Distância':'Sequencial';
export default function ChallengesView({onStart,disabled=false}:{onStart:(challenge:ChallengeDefinition,division:string)=>Promise<void>;disabled?:boolean}){
  const [starting,setStarting]=useState(false);
  const [startError,setStartError]=useState('');
  const [category,setCategory]=useState('Todos');
  const [search,setSearch]=useState('');
  const [activeId,setActiveId]=useState<string|null>(null);
  const [division,setDivision]=useState('women_open');
  const categories=['Todos',...new Set(challenges.map(c=>c.modality))];
  const filtered=useMemo(()=>challenges.filter(c=>(category==='Todos'||c.modality===category)&&c.name.toLowerCase().includes(search.toLowerCase())),[category,search]);
  const selected=challenges.find(c=>c.id===activeId);
  const hasLoadReference=(challenge:ChallengeDefinition)=>challenge.steps.some(s=>s.rxLoadKg||s.loadKg||s.loadKgPerHand)||Boolean(challenge.commonBarbellLoadKg||challenge.ruckKg||challenge.optionalVestKg);
  const start=async()=>{if(!selected)return;setStartError('');setStarting(true);try{await onStart(selected,division);}catch(e){setStartError(e instanceof Error?e.message:'Não foi possível iniciar o desafio.');}finally{setStarting(false);}};
  const load=(s:Step)=>{const key=division.includes('women')?'women':'men';
    const val=(v?:Record<string,number>)=>v?.[division]??v?.[key];
    const base=val(s.loadKg)??val(s.rxLoadKg)??val(selected?.commonBarbellLoadKg);
    const hand=val(s.loadKgPerHand);
    const height=val(s.targetHeightM);
    const resistance=s.resistance?.[key];
    return [base!==undefined?`${fmt(base)} kg`:null,hand!==undefined?`2 × ${fmt(hand)} kg`:null,height!==undefined?`alvo ${fmt(height)} m`:null,resistance?`Xebex ${resistance.xebex} / Torque ${resistance.torque}`:null].filter(Boolean).join(' · ');
  };
  return <section className="challenges-area">
    {selected?<>
      <button type="button" className="back-link" onClick={()=>setActiveId(null)}><ArrowLeft size={16}/> Todos os desafios</button>
      <p className="overline">{selected.modality.toUpperCase()} · {fmtFormat(selected)}</p><h1 className="challenges-title">{selected.name}</h1>
      <p className="challenges-intro">Ficha de referência com a sequência e os alvos desta prova ou benchmark.</p>
      {selected.divisions?.length&&<label className="challenge-division">DIVISÃO<select value={division} onChange={e=>setDivision(e.target.value)}>{divisions.filter(d=>selected.divisions!.includes(d[0])).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>}
      {!selected.divisions?.length&&hasLoadReference(selected)&&<label className="challenge-division">REFERÊNCIA DE CARGA<select value={division} onChange={e=>setDivision(e.target.value)}><option value="women">Feminino RX</option><option value="men">Masculino RX</option></select></label>}
      <div className="challenge-detail-summary">{selected.rounds&&<span>{selected.rounds} rounds</span>}{selected.timeCapSeconds&&<span>{selected.timeCapSeconds/60} minutos</span>}<span>{selected.steps.length} etapas na prescrição</span></div>
      <div className="challenge-steps">{selected.steps.map((s,i)=><div key={i} className="challenge-step"><span className="challenge-step-number">{String(i+1).padStart(2,'0')}</span><div><strong>{s.name}</strong><small>{[s.round?`Round ${s.round}`:null,s.block?`Bloco ${s.block}`:null,s.station?`Estação ${s.station}`:null,s.zone?`Zona ${s.zone}`:null].filter(Boolean).join(' · ')}</small></div><div className="challenge-step-prescription"><strong>{formatStep(s)}</strong>{load(s)&&<small>{load(s)}</small>}</div></div>)}</div>
      {selected.notes&&<p className="challenge-footnote">{selected.notes}</p>}
      {startError&&<p className="template-alert" role="alert">{startError}</p>}
      <div className="challenge-start-actions"><button type="button" className="btn btn-primary" disabled={starting||disabled} onClick={()=>void start()}><Play size={16}/> {starting?'Iniciando...':'Iniciar este desafio'}</button><p>Abre como treino do dia. Você pode editar as cargas, e a ficha não será adicionada às suas fichas pessoais.</p></div>
      <p className="challenge-footnote">Prescrição de referência: pode exigir adaptação individual e conferência do regulamento da edição escolhida. O registro competitivo de tempo, distância e rounds será habilitado em uma etapa própria.</p>
    </>:<>
      <p className="overline">SAIA DA ROTINA</p><h1 className="challenges-title">Em Outro Ritmo.</h1>
      <p className="challenges-intro">Explore provas e benchmarks famosos, conheça a ficha de cada desafio e encontre sua próxima meta.</p>
      <div className="challenge-filters"><label><Search size={16}/><input aria-label="Buscar desafios" placeholder="Buscar desafio..." value={search} onChange={e=>setSearch(e.target.value)}/></label><div>{categories.map(c=><button type="button" key={c} className={category===c?'selected':''} onClick={()=>setCategory(c)}>{c}</button>)}</div></div>
      <div className="challenge-grid">{filtered.map(c=><button type="button" key={c.id} className="challenge-card" onClick={()=>{setActiveId(c.id);setDivision(c.divisions?.[0]||'women');}}><span className="challenge-card-icon">{c.modality==='Corrida'?<Timer size={20}/>:c.modality==='CrossFit'?<Trophy size={20}/>:<Flag size={20}/>}</span><small>{c.modality}</small><strong>{c.name}</strong><span>{fmtFormat(c)} <ChevronRight size={15}/></span></button>)}</div>
      {!filtered.length&&<p className="challenge-footnote">Nenhum desafio encontrado.</p>}
    </>}
  </section>;
}
