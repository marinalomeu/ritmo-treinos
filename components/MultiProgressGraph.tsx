'use client';
import { BarChart3 } from 'lucide-react';
import type { HistoryData, Unit } from '../lib/templates';
type Item={key:string;name:string;unit:Unit};
type Point=HistoryData['progress'][number];
const fmt=(n:number)=>Number.isInteger(n)?String(n):n.toLocaleString('pt-BR',{maximumFractionDigits:1});
export default function MultiProgressGraph({items,progress}:{items:Item[];progress:Point[]}){
  const series=items.map(item=>({item,points:progress.filter(p=>p.exercise_key===item.key).slice().sort((a,b)=>a.performed_on.localeCompare(b.performed_on))}));
  const populated=series.filter(s=>s.points.length);
  if(!populated.length)return <div className="chart-empty"><BarChart3 size={29}/><strong>Sem registros para a seleção</strong><p>Conclua séries com carga para visualizar a evolução dos exercícios escolhidos.</p></div>;
  const mixed=new Set(items.map(i=>i.unit)).size>1;
  const dates=[...new Set(populated.flatMap(s=>s.points.map(p=>p.performed_on)))].sort();
  const values=populated.flatMap(s=>s.points.map(p=>mixed?(s.points[0].weight_kg?100*p.weight_kg/s.points[0].weight_kg:100):p.weight_kg));
  const min=Math.min(...values),max=Math.max(...values),pad=Math.max((max-min)*.15,Math.abs(max)*.08,1),lo=Math.max(0,min-pad),hi=max+pad;
  const W=760,H=270,L=53,R=24,T=24,B=42;
  const x=(date:string)=>L+(dates.length===1?(W-L-R)/2:dates.indexOf(date)*(W-L-R)/(dates.length-1));
  const y=(v:number)=>T+(hi-v)/(hi-lo)*(H-T-B);
  const colors=['#805776','#438878','#bd864c','#637ab1','#a45e76','#6c7560','#8e6aaa','#397b8c'];
  return <><p className="comparison-caption">{mixed?'Comparação percentual (primeiro registro de cada exercício = 100%). Unidades distintas não são somadas.':`Comparação por carga registrada (${items[0]?.unit==='assist_kg'?'kg de assistência':items[0]?.unit||'kg'}).`}</p>
    <div className="comparison-legend">{series.map((s,i)=><div key={s.item.key}><span style={{background:colors[i%colors.length]}}/><strong>{s.item.name}</strong><small>{s.points.length?`${fmt(s.points[s.points.length-1].weight_kg)} ${s.item.unit==='assist_kg'?'kg assist.':s.item.unit}`:'Sem dados'}</small></div>)}</div>
    <div className="svg-scroll"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico comparativo de evolução dos exercícios selecionados" className="progress-svg">
      {[0,1,2,3,4].map(i=><g key={i}><line x1={L} x2={W-R} y1={T+i*(H-T-B)/4} y2={T+i*(H-T-B)/4} stroke="#e8e0e4" strokeDasharray="4 5"/><text x={L-8} y={T+i*(H-T-B)/4+4} textAnchor="end" fontSize="11" fill="#827781">{fmt(hi-i*(hi-lo)/4)}{mixed?'%':''}</text></g>)}
      {series.map((s,i)=>{const color=colors[i%colors.length];const norm=(p:Point)=>mixed?(s.points[0].weight_kg?100*p.weight_kg/s.points[0].weight_kg:100):p.weight_kg;return <g key={s.item.key}>{s.points.length>1&&<polyline fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={s.points.map(p=>`${x(p.performed_on)},${y(norm(p))}`).join(' ')}/>}
        {s.points.map(p=><circle key={p.session_id} cx={x(p.performed_on)} cy={y(norm(p))} r="4.5" fill={color} stroke="#fff" strokeWidth="2"><title>{s.item.name} · {p.performed_on.split('-').reverse().join('/')} · {fmt(p.weight_kg)} {s.item.unit} {mixed?`(${fmt(norm(p))}%)`:''}</title></circle>)}</g>;})}
      {dates.map((d,i)=>(dates.length<=7||i===0||i===dates.length-1||i%Math.ceil(dates.length/7)===0)?<text key={d} x={x(d)} y={H-14} fontSize="11" textAnchor="middle" fill="#807681">{d.slice(5).split('-').reverse().join('/')}</text>:null)}
    </svg></div>
  </>;
}
