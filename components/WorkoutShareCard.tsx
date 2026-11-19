'use client';
import { useMemo, useState } from 'react';
import { CalendarDays, Check, Clock3, Download, Dumbbell, Layers3, ListChecks, Moon, Share2, Sun, TrendingUp, Type, X } from 'lucide-react';
import type { SessionDetail } from '../lib/templates';
import { DEFAULT_SHARE_OPTIONS, numericShareTarget, shareMetricValues, shareSelectionCount, visibleShareExercises, SHARE_THEMES,
  workoutShareSummary, type ShareMetric, type ShareOptions, type ShareSummary, type ShareVisual } from '../lib/workoutShare';

const cap=(value:string)=>value.charAt(0).toLocaleUpperCase('pt-BR')+value.slice(1);
const formatDate=(day:string)=>{
  const [year,month,date]=day.split('-');
  return `${date}.${month}.${year}`;
};
const trimName=(name:string,max=45)=>name.length<=max?name:`${name.slice(0,max-1).trimEnd()}…`;

function roundedRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);
}
function drawWrapped(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,maxWidth:number,lineHeight:number,lines=2){
  const words=text.split(/\s+/);let line='';let emitted=0;
  const rows:string[]=[];
  for(const word of words){
    const next=line?`${line} ${word}`:word;
    if(ctx.measureText(next).width>maxWidth&&line){rows.push(line);line=word;}else line=next;
  }
  if(line)rows.push(line);
  for(const row of rows.slice(0,lines)){ctx.fillText(row,x,y+emitted*lineHeight);emitted++;}
}

async function pngPoster(detail:SessionDetail,visual:ShareVisual,options:ShareOptions,
  summary:ShareSummary){
  const c=document.createElement('canvas');
  c.width=1080;c.height=1920;
  const ctx=c.getContext('2d');
  if(!ctx)throw new Error('Não foi possível criar imagem neste navegador.');
  const w=c.width,h=c.height;
  const metrics=shareMetricValues(summary,options);
  const exercises=visibleShareExercises(summary,metrics.length);
  const colors=SHARE_THEMES[visual];
  const grad=ctx.createLinearGradient(0,0,w,h);
  grad.addColorStop(0,colors.gradient[0]);grad.addColorStop(.55,colors.gradient[1]);grad.addColorStop(1,colors.gradient[2]);
  ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle=colors.ring;ctx.lineWidth=3;
  for(const r of [360,490,650]){ctx.beginPath();ctx.arc(w+100,h*.19,r,0,Math.PI*2);ctx.stroke();}
  ctx.fillStyle=colors.logo;ctx.font='800 57px Manrope, sans-serif';ctx.fillText('ritmo.',75,115);
  ctx.fillStyle=colors.subtitle;ctx.font='700 22px DM Sans, sans-serif';
  ctx.fillText('SEU DIÁRIO DE TREINOS',78,155);
  ctx.fillStyle=colors.kicker;ctx.font='800 24px DM Sans, sans-serif';
  ctx.fillText('TREINO REGISTRADO'+(options.showDate?'  ·  '+formatDate(detail.session.performed_on):''),76,470);
  const hero=650;
  ctx.fillStyle=colors.headline;ctx.font='800 106px Manrope, sans-serif';
  ctx.fillText('FEITO NO',72,hero);ctx.fillText('MEU RITMO.',72,hero+112);
  if(options.showWorkoutName){
    ctx.fillStyle=colors.secondary;ctx.font='600 32px DM Sans, sans-serif';
    drawWrapped(ctx,cap(detail.session.template_name),78,hero+190,w-150,42,2);
  }
  const top=939;
  let metricBottom=top;
  if(metrics.length){
    const cols=metrics.length===4?2:metrics.length;
    const rows=Math.ceil(metrics.length/cols);
    const rowHeight=145;
    const boxHeight=rows*rowHeight+28;
    metricBottom=top+boxHeight;
    ctx.fillStyle=colors.metricsBackground;
    roundedRect(ctx,65,top,w-130,boxHeight,30);ctx.fill();
    metrics.forEach((metric,i)=>{
      const col=i%cols,row=Math.floor(i/cols);
      const cellWidth=(w-184)/cols,x=97+col*cellWidth;
      const y=top+27+row*rowHeight;
      ctx.fillStyle=colors.metricLabel;ctx.font='700 19px DM Sans, sans-serif';
      ctx.fillText(metric.label,x,y+12);
      let size=48;
      ctx.fillStyle=colors.metricValue;
      do{ctx.font=`800 ${size}px Manrope, sans-serif`;if(ctx.measureText(metric.value).width<cellWidth-16)break;size-=2;}while(size>23);
      ctx.fillText(metric.value,x,y+77);
    });
  }
  if(options.showExercises){
    const y=metrics.length?metricBottom+78:1005;
    const lineHeight=46;
    ctx.fillStyle=colors.exerciseHeading;ctx.font='700 22px DM Sans, sans-serif';
    ctx.fillText('NESTE TREINO',76,y-32);
    ctx.fillStyle=colors.exerciseText;ctx.font='600 27px DM Sans, sans-serif';
    for(const [i,entry] of exercises.entries.entries()){
      const target=options.showExerciseTargets?numericShareTarget(entry.target):null;
      const label=target?`${entry.name} · ${target}`:entry.name;
      ctx.fillText('·  '+trimName(label,47),78,y+i*lineHeight);
    }
    if(exercises.extra){
      ctx.fillStyle=colors.extra;ctx.font='600 23px DM Sans, sans-serif';
      ctx.fillText(`+ ${exercises.extra} outros exercícios`,78,y+exercises.entries.length*lineHeight);
    }
  }
  const foot=h-125;
  ctx.fillStyle=colors.footer;ctx.font='600 26px DM Sans, sans-serif';
  ctx.fillText('Um treino de cada vez. Uma evolução de cada vez.',76,foot);
  const blob=await new Promise<Blob|null>(resolve=>c.toBlob(resolve,'image/png'));
  if(!blob)throw new Error('Não foi possível exportar a arte.');
  return new File([blob],`ritmo-treino-${detail.session.performed_on}-${visual}.png`,{type:'image/png'});
}

export default function WorkoutShareCard({detail,onClose}:{detail:SessionDetail;onClose:()=>void}){
  const [visual,setVisual]=useState<ShareVisual>('dark');
  const [options,setOptions]=useState<ShareOptions>(()=>({
    ...DEFAULT_SHARE_OPTIONS,metrics:{...DEFAULT_SHARE_OPTIONS.metrics}
  }));
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const summary=useMemo(()=>workoutShareSummary(detail),[detail]);
  const metrics=shareMetricValues(summary,options);
  const selectedCount=shareSelectionCount(options);
  const [selectionHint,setSelectionHint]=useState(false);
  const exercises=visibleShareExercises(summary,metrics.length);
  const metricColumns=metrics.length===4?2:Math.max(1,metrics.length);
  const updateShareOption=(key:'showWorkoutName'|'showDate'|'showExercises'|ShareMetric)=>{
    const isMetric=key in options.metrics;
    const current=isMetric?options.metrics[key as ShareMetric]:
      options[key as 'showWorkoutName'|'showDate'|'showExercises'];
    if(current&&shareSelectionCount(options)<=2){
      setSelectionHint(true);
      return;
    }
    setSelectionHint(false);
    if(isMetric){
      setOptions(previous=>({...previous,metrics:{...previous.metrics,[key]:!previous.metrics[key as ShareMetric]}}));
    }else{
      const field=key as 'showWorkoutName'|'showDate'|'showExercises';
      setOptions(previous=>({...previous,[field]:!previous[field]}));
    }
  };
  const toggleTargets=()=>setOptions(previous=>({...previous,showExerciseTargets:!previous.showExerciseTargets}));
  const choices=[
    {key:'time',label:'Tempo de treino',Icon:Clock3,active:options.metrics.time},
    {key:'volume',label:'Volume de carga',Icon:TrendingUp,active:options.metrics.volume},
    {key:'exerciseCount',label:'Quantidade de exercícios',Icon:Dumbbell,active:options.metrics.exerciseCount},
    {key:'sets',label:'Séries concluídas',Icon:Layers3,active:options.metrics.sets},
    {key:'showExercises',label:'Lista de exercícios',Icon:ListChecks,active:options.showExercises},
    {key:'showWorkoutName',label:'Nome do treino',Icon:Type,active:options.showWorkoutName},
    {key:'showDate',label:'Data do treino',Icon:CalendarDays,active:options.showDate},
  ] as const;
  const exportCard=async(share:boolean)=>{
    setBusy(true);setError('');
    try{
      const file=await pngPoster(detail,visual,options,summary);
      if(share&&typeof navigator.share==='function'&&navigator.canShare?.({files:[file]})){
        try{await navigator.share({files:[file],title:'Meu treino no Ritmo'});return;}
        catch(e){if((e as Error).name==='AbortError')return;}
      }
      const url=URL.createObjectURL(file);
      const anchor=document.createElement('a');
      anchor.href=url;anchor.download=file.name;document.body.append(anchor);anchor.click();anchor.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),3000);
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível gerar sua imagem.');}
    finally{setBusy(false);}
  };
  return <div className="modal-backdrop workout-share-backdrop">
    <div className="modal workout-share-modal" role="dialog" aria-modal="true" aria-labelledby="share-workout-title">
      <div className="modal-head workout-share-head">
        <div><p className="overline">REGISTRO CONCLUÍDO</p><h2 id="share-workout-title">Mais um treino no seu ritmo.</h2>
          <p>Uma conquista que merece ser compartilhada.</p></div>
        <button className="close-btn" type="button" onClick={onClose} aria-label="Fechar"><X size={18}/></button>
      </div>
      <div className="share-layout">
        <div className={`share-poster share-poster-${visual}`} aria-label={`Prévia vertical 9:16 do seu card de treino, visual ${visual==='dark'?'escuro':'claro'}`}>
          <div className="share-poster-art"><span className="share-poster-logo">ritmo<span>.</span></span>
            <small>SEU DIÁRIO DE TREINOS</small></div>
          <div className="share-poster-main">
            <span className="share-poster-kicker">TREINO REGISTRADO{options.showDate&&<> · {formatDate(detail.session.performed_on)}</>}</span>
            <strong>FEITO NO<br/>MEU RITMO<span>.</span></strong>
            {options.showWorkoutName&&<p>{cap(detail.session.template_name)}</p>}
          </div>
          {metrics.length>0&&<div className="share-poster-metrics"
            style={{gridTemplateColumns:`repeat(${metricColumns},minmax(0,1fr))`}}>
            {metrics.map(metric=><div key={metric.key}>
              <small>{metric.label}</small><strong>{metric.value}</strong>
            </div>)}
          </div>}
          {options.showExercises&&<div className="share-poster-exercises">
            <small>NESTE TREINO</small>
            {exercises.entries.map(entry=><span key={entry.key}>
              · {entry.name}{options.showExerciseTargets&&numericShareTarget(entry.target)&&<em> · {numericShareTarget(entry.target)}</em>}
            </span>)}
            {exercises.extra>0&&<span className="share-poster-more">+ {exercises.extra} outros exercícios</span>}
          </div>}
          <div className="share-poster-footer">Um treino de cada vez. Uma evolução de cada vez.</div>
        </div>
        <div className="share-editor">
          <div className="share-editor-section"><span className="overline">VISUAL</span>
            <div className="share-visual-options" role="group" aria-label="Aparência do card">
              <button type="button" className={visual==='dark'?'selected':''} aria-pressed={visual==='dark'}
                onClick={()=>setVisual('dark')}><Moon size={17}/> Escuro</button>
              <button type="button" className={visual==='light'?'selected':''} aria-pressed={visual==='light'}
                onClick={()=>setVisual('light')}><Sun size={17}/> Claro</button>
            </div>
            <small className="share-visual-caption">Card vertical · 9:16</small>
          </div>
          <div className="share-editor-section">
            <div className="share-select-header">
              <span className="overline">O QUE MOSTRAR NO CARD?</span>
              <span className="share-selected-counter">{selectedCount} selecionadas</span>
            </div>
            <div className="share-options-grid" role="group" aria-label="Informações a compartilhar">
              {choices.map(({key,label,Icon,active})=><button key={key} type="button"
                className={active?'share-info-card is-active':'share-info-card'}
                aria-pressed={active} aria-label={label+(active?' (selecionado)':'')}
                onClick={()=>updateShareOption(key)}>
                <span className="share-info-icon"><Icon size={17} aria-hidden="true"/></span>
                <span className="share-info-label">{label}</span>
                <span className="share-info-indicator" aria-hidden="true">{active&&<Check size={13}/>}</span>
              </button>)}
            </div>
            <small className={selectionHint?'share-minimum-help is-visible':'share-minimum-help'} role="status">
              Selecione no mínimo duas informações para compartilhar.
            </small>
            {options.showExercises&&<button type="button"
              className={options.showExerciseTargets?'share-target-option is-active':'share-target-option'}
              aria-pressed={options.showExerciseTargets} onClick={toggleTargets}>
              <span className="share-info-indicator" aria-hidden="true">
                {options.showExerciseTargets&&<Check size={13}/>}
              </span>
              <span>Incluir os números das metas dos exercícios
                <small>Ex.: Agachamento · 10. Não são repetições realizadas.</small>
              </span>
            </button>}
          </div>
          <p className="share-privacy">A prévia muda conforme suas escolhas. Nenhuma informação pessoal é incluída, e nada será publicado automaticamente.</p>
          {error&&<p className="template-alert" role="alert">{error}</p>}
          <button className="btn btn-primary" disabled={busy} type="button" onClick={()=>void exportCard(true)}>
            <Share2 size={17}/> {busy?'Gerando arte…':'Compartilhar meu treino'}
          </button>
          <button className="btn btn-outline-template" disabled={busy} type="button" onClick={()=>void exportCard(false)}>
            <Download size={16}/> Baixar imagem PNG
          </button>
          <button className="share-continue" type="button" onClick={onClose}>Ver detalhes e atualizar meus PRs</button>
        </div>
      </div>
    </div>
  </div>;
}
