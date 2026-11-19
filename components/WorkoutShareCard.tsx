'use client';
import { useMemo, useState } from 'react';
import { Download, Image as ImageIcon, Share2, X } from 'lucide-react';
import type { SessionDetail } from '../lib/templates';
import { DEFAULT_SHARE_OPTIONS, formatVolume, shareMetricValues, visibleShareExercises,
  workoutShareSummary, type ShareMetric, type ShareOptions, type ShareSummary } from '../lib/workoutShare';

type Format='story'|'feed';
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

async function pngPoster(detail:SessionDetail,format:Format,options:ShareOptions,
  summary:ShareSummary,manualVolumeKg:number|null){
  const c=document.createElement('canvas');
  const story=format==='story';
  c.width=1080;c.height=story?1920:1080;
  const ctx=c.getContext('2d');
  if(!ctx)throw new Error('Não foi possível criar imagem neste navegador.');
  const w=c.width,h=c.height;
  const metrics=shareMetricValues(summary,options,manualVolumeKg);
  const exercises=visibleShareExercises(summary,format,metrics.length);
  const grad=ctx.createLinearGradient(0,0,w,h);
  grad.addColorStop(0,'#463047');grad.addColorStop(.55,'#684b62');grad.addColorStop(1,'#93738a');
  ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='rgba(255,255,255,.09)';ctx.lineWidth=3;
  for(const r of [360,490,650]){ctx.beginPath();ctx.arc(w+100,h*.19,r,0,Math.PI*2);ctx.stroke();}
  ctx.fillStyle='#f9eff5';ctx.font='800 57px Manrope, sans-serif';ctx.fillText('ritmo.',75,115);
  ctx.fillStyle='#d9bfd0';ctx.font='700 22px DM Sans, sans-serif';
  ctx.fillText('SEU DIÁRIO DE TREINOS',78,155);
  ctx.fillStyle='#efdae7';ctx.font='800 24px DM Sans, sans-serif';
  ctx.fillText('TREINO REGISTRADO'+(options.showDate?'  ·  '+formatDate(detail.session.performed_on):''),76,story?470:260);
  const hero=story?650:392;
  ctx.fillStyle='#fffafc';ctx.font='800 106px Manrope, sans-serif';
  ctx.fillText('FEITO NO',72,hero);ctx.fillText('MEU RITMO.',72,hero+112);
  if(options.showWorkoutName){
    ctx.fillStyle='#e5d1dd';ctx.font='600 32px DM Sans, sans-serif';
    drawWrapped(ctx,cap(detail.session.template_name),78,hero+190,w-150,42,2);
  }
  const top=story?939:620;
  let metricBottom=top;
  if(metrics.length){
    const cols=metrics.length===4?2:metrics.length;
    const rows=Math.ceil(metrics.length/cols);
    const rowHeight=story?145:110;
    const boxHeight=rows*rowHeight+28;
    metricBottom=top+boxHeight;
    ctx.fillStyle='rgba(255,250,252,.10)';
    roundedRect(ctx,65,top,w-130,boxHeight,30);ctx.fill();
    metrics.forEach((metric,i)=>{
      const col=i%cols,row=Math.floor(i/cols);
      const cellWidth=(w-184)/cols,x=97+col*cellWidth;
      const y=top+27+row*rowHeight;
      ctx.fillStyle='#f1dce7';ctx.font='700 19px DM Sans, sans-serif';
      ctx.fillText(metric.label,x,y+12);
      let size=story?48:42;
      ctx.fillStyle='#fffafc';
      do{ctx.font=`800 ${size}px Manrope, sans-serif`;if(ctx.measureText(metric.value).width<cellWidth-16)break;size-=2;}while(size>23);
      ctx.fillText(metric.value,x,y+77);
    });
  }
  if(options.showExercises){
    const y=metrics.length?(metricBottom+(story?78:50)):(story?1005:685);
    const lineHeight=story?46:35;
    ctx.fillStyle='#e8d6e1';ctx.font='700 22px DM Sans, sans-serif';
    ctx.fillText('NESTE TREINO',76,y-32);
    ctx.fillStyle='#fffafc';ctx.font=`600 ${story?27:24}px DM Sans, sans-serif`;
    for(const [i,entry] of exercises.entries.entries()){
      const label=options.showExerciseTargets?
        `${entry.name} · meta: ${entry.target}`:entry.name;
      ctx.fillText('·  '+trimName(label,story?47:42),78,y+i*lineHeight);
    }
    if(exercises.extra){
      ctx.fillStyle='#ebd5e2';ctx.font='600 23px DM Sans, sans-serif';
      ctx.fillText(`+ ${exercises.extra} outros exercícios`,78,y+exercises.entries.length*lineHeight);
    }
  }
  const foot=story?h-125:h-50;
  ctx.fillStyle='#ead3e1';ctx.font='600 26px DM Sans, sans-serif';
  ctx.fillText('Um treino de cada vez. Uma evolução de cada vez.',76,foot);
  const blob=await new Promise<Blob|null>(resolve=>c.toBlob(resolve,'image/png'));
  if(!blob)throw new Error('Não foi possível exportar a arte.');
  return new File([blob],`ritmo-treino-${detail.session.performed_on}-${format}.png`,{type:'image/png'});
}

export default function WorkoutShareCard({detail,onClose}:{detail:SessionDetail;onClose:()=>void}){
  const [format,setFormat]=useState<Format>('story');
  const [options,setOptions]=useState<ShareOptions>(()=>({
    ...DEFAULT_SHARE_OPTIONS,metrics:{...DEFAULT_SHARE_OPTIONS.metrics}
  }));
  const [manualVolume,setManualVolume]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const summary=useMemo(()=>workoutShareSummary(detail),[detail]);
  const manualNumber=Number(manualVolume.trim().replace(',','.'));
  const manualVolumeKg=manualVolume.trim()&&Number.isFinite(manualNumber)&&manualNumber>0&&manualNumber<=1e9?
    manualNumber:null;
  const metrics=shareMetricValues(summary,options,manualVolumeKg);
  const exercises=visibleShareExercises(summary,format,metrics.length);
  const metricColumns=metrics.length===4?2:Math.max(1,metrics.length);
  const toggleMetric=(key:ShareMetric)=>setOptions(previous=>({
    ...previous,metrics:{...previous.metrics,[key]:!previous.metrics[key]}
  }));
  const toggle=(key:'showWorkoutName'|'showDate'|'showExercises'|'showExerciseTargets')=>
    setOptions(previous=>({...previous,[key]:!previous[key]}));
  const exportCard=async(share:boolean)=>{
    setBusy(true);setError('');
    try{
      const file=await pngPoster(detail,format,options,summary,manualVolumeKg);
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
        <div className={`share-poster share-poster-${format}`} aria-label="Prévia do seu card de treino">
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
              · {entry.name}{options.showExerciseTargets&&<em> · meta: {entry.target}</em>}
            </span>)}
            {exercises.extra>0&&<span className="share-poster-more">+ {exercises.extra} outros exercícios</span>}
          </div>}
          <div className="share-poster-footer">Um treino de cada vez. Uma evolução de cada vez.</div>
        </div>
        <div className="share-editor">
          <div className="share-editor-section"><span className="overline">FORMATO</span>
            <div className="share-format-options">
              <button type="button" className={format==='story'?'selected':''} aria-pressed={format==='story'}
                onClick={()=>setFormat('story')}><ImageIcon size={16}/> Story · 9:16</button>
              <button type="button" className={format==='feed'?'selected':''} aria-pressed={format==='feed'}
                onClick={()=>setFormat('feed')}><ImageIcon size={16}/> Feed · 1:1</button>
            </div>
          </div>
          <div className="share-editor-section">
            <span className="overline">O QUE MOSTRAR NO CARD?</span>
            <div className="share-options-grid">
              <label className="share-option"><input type="checkbox" checked={options.showWorkoutName}
                onChange={()=>toggle('showWorkoutName')}/><span>Nome do treino</span></label>
              <label className="share-option"><input type="checkbox" checked={options.showDate}
                onChange={()=>toggle('showDate')}/><span>Data do treino</span></label>
              <label className="share-option"><input type="checkbox" checked={options.metrics.time}
                onChange={()=>toggleMetric('time')}/><span>Tempo de treino</span></label>
              <label className="share-option"><input type="checkbox" checked={options.metrics.exerciseCount}
                onChange={()=>toggleMetric('exerciseCount')}/><span>Quantidade de exercícios</span></label>
              <label className="share-option"><input type="checkbox" checked={options.metrics.sets}
                onChange={()=>toggleMetric('sets')}/><span>Séries concluídas</span></label>
              <label className="share-option"><input type="checkbox" checked={options.metrics.volume}
                onChange={()=>toggleMetric('volume')}/><span>Volume de carga (kg)</span></label>
              <label className="share-option"><input type="checkbox" checked={options.showExercises}
                onChange={()=>toggle('showExercises')}/><span>Lista de exercícios</span></label>
            </div>
            {options.metrics.volume&&<div className="share-volume-editor">
              <p>{summary.volumeKg!==null?
                `Calculado: ${formatVolume(summary.volumeKg)}${summary.volumePartial?' (parcial — há séries sem repetições anotadas)':''}.`:
                'Este treino não tem carga e repetições realizadas suficientes para cálculo automático.'}
                {' '}Volume = soma da carga externa (kg) × repetições anotadas, inclusive séries parciais.</p>
              <label>Informar outro volume, se preferir (kg)
                <input type="text" inputMode="decimal" value={manualVolume} maxLength={16}
                  placeholder={summary.volumeKg!==null?'Usar volume calculado':'Ex.: 1250'}
                  onChange={e=>setManualVolume(e.target.value)}/>
              </label>
              {manualVolume.trim()&&manualVolumeKg===null&&<small role="alert">Informe um valor positivo válido.</small>}
              {manualVolumeKg!==null&&<small>Este valor aparecerá como “Volume informado”.</small>}
              {summary.volumeKg===null&&manualVolumeKg===null&&<small>Informe um volume para incluí-lo no card.</small>}
            </div>}
            {options.showExercises&&<label className="share-option share-suboption">
              <input type="checkbox" checked={options.showExerciseTargets}
                onChange={()=>toggle('showExerciseTargets')}/>
              <span>Mostrar também as metas dos exercícios <small>(útil para WODs · não são repetições executadas)</small></span>
            </label>}
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
