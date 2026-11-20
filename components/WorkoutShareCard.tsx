'use client';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Clock3, Download, Dumbbell, Layers3, ListChecks, Moon, Share2, Sun, TrendingUp, Type, MapPin, X } from 'lucide-react';
import type { SessionDetail } from '../lib/templates';
import { DEFAULT_SHARE_OPTIONS, numericShareTarget, shareMetricValues, shareSelectionCount, visibleShareExercises, SHARE_THEMES,
  workoutShareSummary, SHARE_PALETTES, SHARE_COMPOSITIONS, shareAwardLabels,
  type ShareComposition, type ShareEligibility, type ShareMetric, type ShareOptions, type ShareSummary, type ShareVisual } from '../lib/workoutShare';

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
  summary:ShareSummary,composition:ShareComposition,eligibility:ShareEligibility|null,showBestBadge=false){
  const c=document.createElement('canvas');
  c.width=1170;c.height=2058;
  if(document.fonts?.ready)await document.fonts.ready;
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
  ctx.fillStyle=colors.logo;ctx.font='800 57px Manrope, sans-serif';ctx.fillText('ritmo.',75,275);
  ctx.fillStyle=colors.subtitle;ctx.font='700 22px DM Sans, sans-serif';
  ctx.fillText('SEU DIÁRIO DE TREINOS',78,315);
  // Mesma composição da prévia: conteúdo agrupado na faixa inferior, sem vazio abaixo.
  // Com mais exercícios/métricas, deslocar os blocos superiores para preservar a margem do rodapé.
  const extraRows=options.showExercises?Math.min(exercises.entries.length+Number(exercises.extra>0),8):0;
  const rows=metrics.length===4?2:1;
  const badges=shareAwardLabels(composition,eligibility);
  const top=Math.max(780,1705-(rows-1)*158-extraRows*65-(options.showGymName?44:0)-(badges.length?50:0));
  const hero=top-(options.showWorkoutName?260:175)-(options.showGymName?45:0);
  ctx.fillStyle=colors.kicker;ctx.font='800 24px DM Sans, sans-serif';
  ctx.fillText('TREINO REGISTRADO'+(options.showDate?'  ·  '+formatDate(detail.session.performed_on):''),76,hero-185);
  ctx.fillStyle=colors.headline;ctx.font='800 106px Manrope, sans-serif';
  ctx.fillText('FEITO NO',72,hero-92);ctx.fillText('MEU RITMO.',72,hero+20);
  let labelY=hero+98;
  if(options.showWorkoutName){
    ctx.fillStyle=colors.secondary;ctx.font='600 32px DM Sans, sans-serif';
    drawWrapped(ctx,cap(detail.session.template_name),78,labelY,w-150,42,2);
    labelY+=84;
  }
  if(options.showGymName&&detail.session.gym_name){
    ctx.fillStyle=colors.secondary;ctx.font='600 28px DM Sans, sans-serif';
    drawWrapped(ctx,detail.session.gym_name,78,labelY,w-150,38,1);
  }
  if(showBestBadge){
    ctx.fillStyle=colors.headline;ctx.font='800 44px Manrope, sans-serif';
    ctx.fillText('DESAFIO CONCLUÍDO · EM UM NOVO RITMO.',76,top-215,1020);
    ctx.font='600 24px DM Sans, sans-serif';ctx.fillText('Novo recorde pessoal neste desafio',77,top-165,1020);
  }
  if(badges.length){
    const badgeTop=top-(badges.length===3?148:94);
    const blocks=badges.length===3?[[badges[0],76,badgeTop,440,104],[badges[1],534,badgeTop,518,45],[badges[2],534,badgeTop+59,518,45]] as const:badges.map(value=>[value,76,badgeTop,850,63] as const);
    for(const [label,bx,by,bw,bh] of blocks){
      ctx.fillStyle=colors.metricsBackground;roundedRect(ctx,bx,by,bw,bh,21);ctx.fill();
      ctx.strokeStyle=colors.ring;ctx.stroke();
      ctx.fillStyle=colors.headline;ctx.font='800 27px Manrope, sans-serif';ctx.fillText(label,bx+23,by+bh/2+9,bw-40);
    }
  }
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
    const y=metrics.length?metricBottom+68:top+68;
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
  return new File([blob],`ritmo-treino-${detail.session.performed_on}-${visual}-${composition}.png`,{type:'image/png'});
}


/**
 * Story especial da primeira conclusão: dados somente do servidor e composição fixa.
 * A arte não aceita edição de tempo, distância ou data.
 */
async function specialChallengePoster(detail:SessionDetail,name:string,summary:ShareSummary,showTime:boolean):Promise<File>{
  const canvas=document.createElement('canvas');canvas.width=1170;canvas.height=2058;
  if(document.fonts?.ready)await document.fonts.ready;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas indisponível.');
  const w=canvas.width,h=canvas.height,ink='#304c38',pale='#eef4e5';
  const background=ctx.createLinearGradient(0,0,w,h);
  background.addColorStop(0,'#f1f5e8');background.addColorStop(.55,'#e5eed9');background.addColorStop(1,'#d6e6cb');
  ctx.fillStyle=background;ctx.fillRect(0,0,w,h);
  ctx.fillStyle='rgba(142,183,136,.12)';
  ctx.beginPath();ctx.ellipse(-130,-120,650,440,-.3,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(1270,1960,500,420,-.3,0,Math.PI*2);ctx.fill();
  ctx.textAlign='center';ctx.fillStyle=ink;ctx.font='800 105px Manrope, sans-serif';ctx.fillText('ritmo.',w/2,205);
  const ribbon=ctx.createLinearGradient(0,390,0,980);ribbon.addColorStop(0,'#a7bea2');ribbon.addColorStop(1,'#5b8c69');
  ctx.fillStyle=ribbon;ctx.beginPath();ctx.moveTo(445,390);ctx.lineTo(570,675);ctx.lineTo(470,745);ctx.lineTo(310,450);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(710,390);ctx.lineTo(600,675);ctx.lineTo(700,745);ctx.lineTo(855,450);ctx.closePath();ctx.fill();
  const gold=ctx.createRadialGradient(500,900,40,585,915,285);
  gold.addColorStop(0,'#f9e9ab');gold.addColorStop(.52,'#d8ba6a');gold.addColorStop(.82,'#b28c42');gold.addColorStop(1,'#f4da91');
  ctx.shadowColor='rgba(35,53,30,.24)';ctx.shadowBlur=35;ctx.shadowOffsetY=15;
  ctx.fillStyle=gold;ctx.beginPath();ctx.arc(w/2,930,260,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.strokeStyle='#fff0c2';ctx.lineWidth=8;ctx.beginPath();ctx.arc(w/2,930,245,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle='#977432';ctx.lineWidth=3;ctx.beginPath();ctx.arc(w/2,930,225,0,Math.PI*2);ctx.stroke();
  const short=name.replace(/^.*?(\d+\s*(?:km|k|milhas)).*$/i,'$1');
  const medalText=short===name?(detail.session.challenge_id?.includes('triathlon')?'TRI':detail.session.challenge_id?.includes('hyrox')?'HYROX':detail.session.challenge_id?.includes('murph')?'MURPH':'★'):short.toUpperCase();
  ctx.fillStyle='#735c2a';ctx.font='800 93px Manrope, sans-serif';
  ctx.fillText(medalText.slice(0,8),w/2,967,450);
  ctx.fillStyle=ink;ctx.font='800 120px Manrope, sans-serif';ctx.fillText(name.toUpperCase().slice(0,24),w/2,1398,1080);
  ctx.font='italic 58px DM Sans, sans-serif';ctx.fillText('Conquistei no meu ritmo',w/2,1505);
  ctx.fillStyle='#f5f8f0';roundedRect(ctx,75,1610,1020,170,37);ctx.fill();
  ctx.fillStyle=ink;ctx.font='700 40px DM Sans, sans-serif';
  const dt=detail.session.performed_on.split('-').reverse().join('/');
  if(showTime){ctx.fillText('TEMPO · '+summary.elapsed,347,1708,510);ctx.fillText('DATA · '+dt,828,1708,510);}
  else ctx.fillText('DATA · '+dt,w/2,1708,950);
  ctx.fillStyle='#cedfc0';roundedRect(ctx,260,1867,650,88,44);ctx.fill();
  ctx.fillStyle=ink;ctx.font='700 39px DM Sans, sans-serif';ctx.fillText('☆  1ª vez nesse desafio',w/2,1926,600);
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!blob)throw new Error('Não foi possível gerar a imagem.');
  return new File([blob],'ritmo-primeira-conquista-'+detail.session.performed_on+'.png',{type:'image/png'});
}

export default function WorkoutShareCard({detail,onClose}:{detail:SessionDetail;onClose:()=>void}){
  const [eligibility,setEligibility]=useState<ShareEligibility|null>(null);
  const [visual,setVisual]=useState<ShareVisual>('dark-green');
  const [showChallengeTime,setShowChallengeTime]=useState(true);
  const [showBestBadge,setShowBestBadge]=useState(false);
  const isChallenge=Boolean(detail.session.challenge_id);
  const firstChallenge=Boolean(isChallenge&&eligibility?.challengeFirst);
  const bestChallenge=Boolean(isChallenge&&eligibility?.challengeBest&&!eligibility?.challengeFirst);
  const challengeName=detail.session.template_name.replace(/^(Desafio|Prova)\s*[:·-]\s*/i,'').trim();
  const [composition,setComposition]=useState<ShareComposition>('training');

  const [eligibilityError,setEligibilityError]=useState(false);
  useEffect(()=>{
    let alive=true;
    fetch('/api/share/eligibility?session_id='+encodeURIComponent(detail.session.id),{cache:'no-store'})
      .then(async r=>{if(!r.ok)throw new Error('Sem resultados de conquistas.');return r.json() as Promise<ShareEligibility>;})
      .then(result=>{if(alive)setEligibility(result);})
      .catch(()=>{if(alive)setEligibilityError(true);});
    return()=>{alive=false;};
  },[detail.session.id]);
  const awards=shareAwardLabels(composition,eligibility);
  const isAllowed=(type:ShareComposition,available=eligibility)=>{
    const option=SHARE_COMPOSITIONS.find(x=>x.value===type);
    return type==='training'||Boolean(available&&option?.requires.every(key=>Boolean(available[key])));
  };
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
  const updateShareOption=(key:'showWorkoutName'|'showGymName'|'showDate'|'showExercises'|ShareMetric)=>{
    const isMetric=key in options.metrics;
    const current=isMetric?options.metrics[key as ShareMetric]:
      options[key as 'showWorkoutName'|'showGymName'|'showDate'|'showExercises'];
    if(current&&shareSelectionCount(options)<=2){
      setSelectionHint(true);
      return;
    }
    setSelectionHint(false);
    if(isMetric){
      setOptions(previous=>({...previous,metrics:{...previous.metrics,[key]:!previous.metrics[key as ShareMetric]}}));
    }else{
      const field=key as 'showWorkoutName'|'showGymName'|'showDate'|'showExercises';
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
    ...(detail.session.gym_name?[{key:'showGymName' as const,label:'Academia / local',Icon:MapPin,active:options.showGymName}]:[]),
  ] as const;
  const exportCard=async(share:boolean)=>{
    setBusy(true);setError('');
    try{
      let verified=eligibility;
      if(isChallenge||composition!=='training'){
        const r=await fetch('/api/share/eligibility?session_id='+encodeURIComponent(detail.session.id),{cache:'no-store'});
        if(!r.ok)throw new Error('Não foi possível confirmar sua conquista.');
        verified=await r.json() as ShareEligibility;
        if(!verified?.challengeFirst&&!isAllowed(composition,verified))throw new Error('Esta conquista ainda não está disponível para seu treino.');
      }
      const file=isChallenge&&verified?.challengeFirst
        ?await specialChallengePoster(detail,challengeName,summary,showChallengeTime)
        :await pngPoster(detail,visual,options,summary,composition,verified,showBestBadge&&Boolean(verified?.challengeBest));
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
        {firstChallenge?<div className="challenge-special-poster" aria-label="Story da primeira conclusão do desafio">
          <strong className="challenge-special-logo">ritmo.</strong>
          <div className="challenge-special-medal"><span>{detail.session.challenge_id?.includes('triathlon')?'TRI':detail.session.challenge_id?.includes('hyrox')?'HYROX':detail.session.challenge_id?.includes('murph')?'MURPH':challengeName.match(/\d+\s*(?:km|k|milhas)/i)?.[0]||'★'}</span></div>
          <div className="challenge-special-main"><strong>{challengeName}</strong><em>Conquistei no meu ritmo</em></div>
          <div className="challenge-special-results">{showChallengeTime&&<span>Tempo · {summary.elapsed}</span>}<span>Data · {formatDate(detail.session.performed_on)}</span></div>
          <div className="challenge-special-first">☆ 1ª vez nesse desafio</div>
        </div>:<div className={`share-poster share-poster-${visual}`} aria-label={`Prévia vertical do Story, paleta ${SHARE_PALETTES.find(p=>p.value===visual)?.label}`}>
          <div className="share-poster-art"><span className="share-poster-logo">ritmo<span>.</span></span>
            <small>SEU DIÁRIO DE TREINOS</small></div>
          <div className="share-poster-main">
            <span className="share-poster-kicker">TREINO REGISTRADO{options.showDate&&<> · {formatDate(detail.session.performed_on)}</>}</span>
            <strong>FEITO NO<br/>MEU RITMO<span>.</span></strong>
            {options.showWorkoutName&&<p>{cap(detail.session.template_name)}</p>}
            {options.showGymName&&detail.session.gym_name&&<p className="share-poster-gym">{detail.session.gym_name}</p>}
          </div>
          {showBestBadge&&bestChallenge&&<div className="challenge-best-badge"><strong>DESAFIO CONCLUÍDO · Em um novo ritmo.</strong><small>Novo recorde pessoal neste desafio</small></div>}
          {awards.length>0&&<div className={'share-poster-awards '+(awards.length===3?'is-combined':'')}>
            {awards.map((award,i)=><span key={award} className={'share-poster-award award-'+i}>{award}</span>)}
          </div>}
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
        </div>}
        <div className="share-editor">
          {firstChallenge?<div className="share-editor-section"><strong>Primeira conquista deste desafio</strong><p>Story especial verde-claro. Distância, tempo e data são calculados a partir do treino registrado.</p><label><input type="checkbox" checked={showChallengeTime} onChange={e=>setShowChallengeTime(e.target.checked)}/> Mostrar tempo realizado</label></div>:<><div className="share-editor-section"><span className="overline">VISUAL</span>
            <div className="share-visual-options share-five-palettes" role="group" aria-label="Paletas oficiais">
              {SHARE_PALETTES.map(p=><button type="button" key={p.value} className={visual===p.value?'selected':''}
                aria-pressed={visual===p.value} onClick={()=>setVisual(p.value)}>{p.label}</button>)}
            </div>
            <small className="share-visual-caption">Story vertical · 1170 × 2058</small>
            <div className="share-composition-options" role="group" aria-label="Versão do Story">
              {SHARE_COMPOSITIONS.map(c=>{
                const allowed=isAllowed(c.value);
                return <button type="button" key={c.value} disabled={!allowed}
                  aria-pressed={composition===c.value} className={composition===c.value?'selected':''}
                  title={allowed?'':eligibilityError?'Não foi possível confirmar suas conquistas.':'Disponível quando esta conquista for atingida.'}
                  onClick={()=>setComposition(c.value)}>{c.label}{!allowed&&<small> Ainda não conquistado</small>}</button>;
              })}
            </div>
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
          {bestChallenge&&<label className="share-best-option"><input type="checkbox" checked={showBestBadge} onChange={e=>setShowBestBadge(e.target.checked)}/> Exibir selo “Em um novo ritmo.” — novo recorde comprovado</label>}
          </>}
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
