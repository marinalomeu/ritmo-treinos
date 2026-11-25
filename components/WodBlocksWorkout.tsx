'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, Clock3, Play } from 'lucide-react';
import { getSession, saveWodAction, type Mode } from '../lib/clientStore';
import type { SessionDetail } from '../lib/templates';
import { WOD_FORMATS, wodCursor, wodScore, wodTarget, type WodAction, type WodBlock, type WodState } from '../lib/wodBlocks';
import { loadForDisplay, loadForStorage } from '../lib/weightUnits';
import NumericField from './NumericField';

const clock = (milliseconds: number) => {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

type Props = {
  detail: SessionDetail & {wod: WodState};
  mode: Mode;
  now: number;
  busy: boolean;
  onChanged: (detail: SessionDetail) => void;
  onBusy: (busy: boolean) => void;
};

export default function WodBlocksWorkout({detail, mode, now, busy, onChanged, onBusy}: Props) {
  const {wod, session} = detail;
  const active = session.status === 'active' ? wod.progress.findIndex(part => part.endedAt === null) : -1;
  const sending = useRef(false);
  const [error, setError] = useState('');
  async function submit(block: number, change: Omit<WodAction,'revision'|'block'>) {
    if (sending.current || busy) return;
    sending.current = true;
    onBusy(true);
    setError('');
    try {
      await saveWodAction(mode, session.id, {...change, revision:wod.revision, block});
      onChanged(await getSession(mode, session.id));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível registrar a etapa.');
      try { onChanged(await getSession(mode, session.id)); } catch { /* A próxima ação permite tentar de novo. */ }
    } finally {
      sending.current = false;
      onBusy(false);
    }
  }
  return <section className="wod-block-workout" aria-label="Blocos do treino">
    {error && <p role="alert" className="template-alert">{error}</p>}
    {wod.plan.map((block, index) => {
      const progress = wod.progress[index];
      const status = index === active ? '' : progress.startedAt === null ? 'Não iniciado'
        : wodScore(block, progress.endedAt === null ? {...progress,endedAt:Date.parse(session.finished_at??'')||now} : progress);
      const cursor = wodCursor(block, progress, now);
      return <article className="exercise-card wod-block-card" key={index}>
        <header><div><p className="overline">BLOCO {index+1}</p><h3>{WOD_FORMATS[block.format]}</h3></div>
          {block.rounds !== null && <span>{block.rounds} voltas</span>}
          {block.durationSeconds !== null && <span>{clock(block.durationSeconds * 1000)}</span>}
        </header>
        {(index === active || progress.results.length === 0) && <ol className="wod-stations">
          {block.exercises.map(exercise => <li key={exercise.key}>{exercise.name} · {exercise.target}
            {block.format === 'linear' && exercise.sets > 1 ? ` × ${exercise.sets} séries` : ''}</li>)}
        </ol>}
        {index === active
          ? <BlockControls key={`${index}:${cursor.slot}:${wod.revision}`} block={block} progress={progress}
              now={now} busy={busy} submit={action=>void submit(index,action)}/>
          : <p className="wod-score">{status}</p>}
        {progress.results.length > 0 && <details className="wod-block-results">
          <summary>Execução registrada ({progress.results.length})</summary>
          <ol>{progress.results.map(result => {
            const exercise = block.exercises[result.exercise];
            const unit = exercise.unit === 'assist_kg' ? 'kg assist.' : exercise.unit;
            const period = block.format === 'emom' ? `Minuto ${result.slot+1} · `
              : block.format === 'linear' ? '' : `Volta ${Math.floor(result.slot/block.exercises.length)+1} · `;
            return <li key={result.slot}>{period}{exercise.name} · {result.value} {wodTarget(exercise.target)?.metric}
              {result.weight === null ? '' : ` · ${loadForDisplay(result.weight,exercise.unit)} ${unit}`}
              {!result.complete && ' · parcial'}</li>;
          })}</ol>
        </details>}
      </article>;
    })}
  </section>;
}

function BlockControls({block, progress, now, busy, submit}: {
  block: WodBlock; progress: WodState['progress'][number]; now:number; busy:boolean;
  submit:(action:Omit<WodAction,'revision'|'block'>)=>void;
}) {
  const cursor = wodCursor(block,progress,now);
  const exercise = block.exercises[cursor.exerciseIndex];
  const target = wodTarget(exercise.target)!;
  const [weight,setWeight] = useState(()=>loadForDisplay(exercise.defaultLoad,exercise.unit));
  const [partial,setPartial] = useState(false);
  const [value,setValue] = useState<number|null>(null);

  if (progress.startedAt === null) return <button type="button" className="btn btn-primary" onClick={()=>submit({kind:'start'})} disabled={busy}>
    <Play size={16}/> Iniciar bloco
  </button>;

  const resting = (progress.readyAt ?? 0) > now;
  const elapsed = block.durationSeconds === null ? cursor.elapsed : Math.min(cursor.elapsed,block.durationSeconds*1000);
  const round = Math.floor(cursor.slot / block.exercises.length)+1;
  const countdown = block.format === 'emom' && !cursor.expired ? 60000 - elapsed % 60000
    : block.durationSeconds === null ? elapsed : block.durationSeconds*1000-elapsed;
  const canRecord = !resting && !cursor.alreadyLogged;
  const canPartial = canRecord && value !== null && value > 0 && value <= target.value;
  const record = (kind:'record'|'end', actual:number) => submit({
    kind, slot:cursor.slot, value:actual, weight:loadForStorage(weight,exercise.unit)
  });

  return <div className="wod-block-controls">
    <div className="wod-clock"><Clock3 size={19}/>
      <strong>{resting ? `Descanso ${clock(progress.readyAt!-now)}` : cursor.expired ? 'Tempo encerrado' : clock(countdown)}</strong>
      {block.format === 'emom' && <span>Minuto {cursor.slot+1} de {block.durationSeconds!/60}</span>}
      {block.format !== 'emom' && block.format !== 'linear' && <span>Volta {round}{block.rounds !== null ? ` de ${block.rounds}` : ''}</span>}
    </div>
    <p><strong>{exercise.name}</strong> · {exercise.target}</p>
    {cursor.alreadyLogged && !cursor.expired && <p>Aguarde o próximo minuto.</p>}
    {(canRecord && exercise.unit !== 'none') && <label>Carga ({exercise.unit})
      <NumericField decimal maxLength={7} value={weight} onValue={setWeight} disabled={busy}/>
    </label>}
    {!partial && canRecord && !cursor.expired && <button type="button" className="btn btn-primary" disabled={busy} onClick={()=>record('record',target.value)}>
      <CheckCircle2 size={16}/> Concluir exercício
    </button>}
    {canRecord && (partial
      ? <div className="wod-partial">
          <label>Quanto você realizou ({target.metric})<NumericField decimal={target.metric==='m'} maxLength={10}
            value={value} onValue={setValue} disabled={busy}/></label>
          <button type="button" className="btn btn-primary" disabled={busy||!canPartial}
            onClick={()=>record(block.format==='emom'&&!cursor.expired?'record':'end',value!)}>
            {block.format==='emom'&&!cursor.expired?'Registrar neste minuto':'Registrar e encerrar bloco'}
          </button>
          <button type="button" className="btn btn-outline-template" disabled={busy} onClick={()=>setPartial(false)}>Cancelar parcial</button>
        </div>
      : <button type="button" className="btn btn-outline-template" disabled={busy} onClick={()=>setPartial(true)}>{block.format==='emom'&&!cursor.expired?'Registrar parcial do minuto':'Registrar progresso final'}</button>)}
    <button type="button" className="btn btn-outline-template" disabled={busy}
      onClick={()=>{if(cursor.expired||window.confirm('Encerrar este bloco com o progresso já registrado?'))submit({kind:'end'});}}>
      Encerrar bloco
    </button>
  </div>;
}
