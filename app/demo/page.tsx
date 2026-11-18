'use client';
import { useState, type FormEvent } from 'react';
import { ArrowRight, Dumbbell, LockKeyhole } from 'lucide-react';
import WorkoutApp from '../../components/WorkoutApp';
export default function DemoPage() {
  const [unlocked,setUnlocked]=useState(false);
  const [password,setPassword]=useState('teste');
  const [error,setError]=useState('');
  const submit=(event:FormEvent)=>{
    event.preventDefault();
    if(password !== 'teste') {setError('Para conhecer a demonstração, use a senha: teste');return;}
    setUnlocked(true);
  };
  if(unlocked)return <WorkoutApp mode="showcase"/>;
  return <main className="login-page"><div className="login-card">
    <div className="login-mark"><Dumbbell size={25}/></div>
    <div className="logo-word">ritmo<span>.</span></div>
    <div className="login-kicker">DEMONSTRAÇÃO PÚBLICA</div>
    <h1>Explore o ritmo.</h1>
    <p>Conheça as fichas, o histórico e os gráficos com cinco treinos fictícios. Nenhum dado pessoal é mostrado.</p>
    <form onSubmit={submit}>
      <label htmlFor="demo-password">Senha de teste</label>
      <div className="password-wrap"><LockKeyhole size={17}/><input id="demo-password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="off"/></div>
      {error&&<p className="error-text" role="alert">{error}</p>}
      <button className="btn btn-primary" type="submit"><ArrowRight size={16}/> Entrar na demonstração</button>
    </form>
    <p className="login-note">Senha: <strong>teste</strong> · Ambiente fictício e separado do perfil pessoal.</p>
  </div></main>;
}
