'use client';
import { useMemo, useState } from 'react';
import { Download, Image as ImageIcon, Share2, X } from 'lucide-react';
import type { SessionDetail } from '../lib/templates';

type Format='story'|'feed';
const cap=(value:string)=>value.charAt(0).toLocaleUpperCase('pt-BR')+value.slice(1);
const duration=(started:string,finished:string|null)=>{
  const elapsed=Math.max(0,Math.floor((Date.parse(finished||started)-Date.parse(started))/1000));
  return {min:Math.floor(elapsed/60),text:`${String(Math.floor(elapsed/3600)).padStart(2,'0')}:${String(Math.floor((elapsed%3600)/60)).padStart(2,'0')}`};
};
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
async function pngPoster(detail:SessionDetail,format:Format,includeExercises:boolean){
  const c=document.createElement('canvas');const story=format==='story';
  c.width=1080;c.height=story?1920:1080;
  const ctx=c.getContext('2d');if(!ctx)throw new Error('Não foi possível criar imagem neste navegador.');
  const w=c.width,h=c.height;
  const grad=ctx.createLinearGradient(0,0,w,h);
  grad.addColorStop(0,'#463047');grad.addColorStop(.55,'#684b62');grad.addColorStop(1,'#93738a');
  ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='rgba(255,255,255,.09)';ctx.lineWidth=3;
  for(const r of [360,490,650]){ctx.beginPath();ctx.arc(w+100,h*.19,r,0,Math.PI*2);ctx.stroke();}
  ctx.fillStyle='#f9eff5';ctx.font='800 57px Manrope, sans-serif';ctx.fillText('ritmo.',75,115);
  ctx.fillStyle='#d9bfd0';ctx.font='700 22px DM Sans, sans-serif';ctx.fillText('SEU DIÁRIO DE TREINOS',78,155);
  ctx.fillStyle='#efdae7';ctx.font='800 24px DM Sans, sans-serif';ctx.fillText('TREINO REGISTRADO  ·  '+formatDate(detail.session.performed_on),76,story?470:280);
  const hero=story?650:408;
  ctx.fillStyle='#fffafc';ctx.font='800 106px Manrope, sans-serif';
  ctx.fillText('FEITO NO',72,hero);
  ctx.fillText('MEU RITMO.',72,hero+115);
  ctx.fillStyle='#e5d1dd';ctx.font='600 32px DM Sans, sans-serif';
  drawWrapped(ctx,cap(detail.session.template_name),78,hero+195,w-150,43,2);
  const statY=story?1010:690;
  ctx.fillStyle='rgba(255,250,252,.10)';
  roundedRect(ctx,65,statY-86,w-130,250,34);ctx.fill();
  const labels=[['TEMPO',duration(detail.session.started_at,detail.session.finished_at).text],
    ['EXERCÍCIOS',String(new Set(detail.sets.map(s=>s.exercise_key)).size)],
    ['SÉRIES FEITAS',String(detail.sets.filter(s=>s.completed).length)]];
  labels.forEach(([label,value],i)=>{
    const x=113+i*310;ctx.fillStyle='#f1dce7';ctx.font='700 19px DM Sans, sans-serif';ctx.fillText(label,x,statY-20);
    ctx.fillStyle='#fffafc';ctx.font='800 48px Manrope, sans-serif';ctx.fillText(value,x,statY+61);
  });
  if(includeExercises){
    const names=[...new Set(detail.sets.map(s=>s.exercise_name))].slice(0,story?4:2);
    const y=story?1305:915;
    ctx.fillStyle='#e8d6e1';ctx.font='700 22px DM Sans, sans-serif';ctx.fillText('NESTE TREINO',76,y-50);
    ctx.font='600 27px DM Sans, sans-serif';ctx.fillStyle='#fffafc';
    names.forEach((name,i)=>ctx.fillText('·  '+trimName(name,39),78,y+43*i));
  }
  const foot=story?h-125:h-50;
  ctx.fillStyle='#ead3e1';ctx.font='600 26px DM Sans, sans-serif';ctx.fillText('Um treino de cada vez. Uma evolução de cada vez.',76,foot);
  const blob=await new Promise<Blob|null>(resolve=>c.toBlob(resolve,'image/png'));
  if(!blob)throw new Error('Não foi possível exportar a arte.');
  return new File([blob],`ritmo-treino-${detail.session.performed_on}-${format}.png`,{type:'image/png'});
}
export default function WorkoutShareCard({detail,onClose}:{detail:SessionDetail;onClose:()=>void}){
  const [format,setFormat]=useState<Format>('story');
  const [includeExercises,setIncludeExercises]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const stats=useMemo(()=>({
    duration:duration(detail.session.started_at,detail.session.finished_at).text,
    exercises:new Set(detail.sets.map(s=>s.exercise_key)).size,
    sets:detail.sets.filter(s=>s.completed).length,
    names:[...new Set(detail.sets.map(s=>s.exercise_name))].slice(0,4)
  }),[detail]);
  const exportCard=async(share:boolean)=>{
    setBusy(true);setError('');
    try{
      const file=await pngPoster(detail,format,includeExercises);
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
            <span className="share-poster-kicker">TREINO REGISTRADO · {formatDate(detail.session.performed_on)}</span>
            <strong>FEITO NO<br/>MEU RITMO<span>.</span></strong>
            <p>{cap(detail.session.template_name)}</p>
          </div>
          <div className="share-poster-metrics">
            <div><small>TEMPO</small><strong>{stats.duration}</strong></div>
            <div><small>EXERCÍCIOS</small><strong>{stats.exercises}</strong></div>
            <div><small>SÉRIES FEITAS</small><strong>{stats.sets}</strong></div>
          </div>
          {includeExercises&&<div className="share-poster-exercises">
            <small>NESTE TREINO</small>{stats.names.slice(0,format==='story'?4:2).map(name=><span key={name}>· {name}</span>)}
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
          <label className="share-toggle"><input type="checkbox" checked={includeExercises}
            onChange={e=>setIncludeExercises(e.target.checked)}/>
            <span><strong>Mostrar os exercícios</strong><small>Desmarcado por padrão. Seu nome, e-mail e cargas nunca entram no card.</small></span>
          </label>
          <p className="share-privacy">Nada será publicado automaticamente. Você escolhe se quer baixar ou compartilhar a imagem.</p>
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
