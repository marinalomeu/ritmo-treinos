'use client';
import { useState, type FormEvent } from 'react';
import { ArrowRight, Dumbbell, LockKeyhole, LoaderCircle } from 'lucide-react';
export default function Login(){
  const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const submit=async(e:FormEvent)=>{
    e.preventDefault();setBusy(true);setError('');
    try {const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Acesso negado');window.location.reload();}
    catch(err){setError(err instanceof Error?err.message:'Erro ao entrar');setBusy(false);}
  };
  return <main className="login-page"><div className="login-card">
    <div className="login-mark"><Dumbbell size={25}/></div>
    <div className="logo-word">ritmo<span>.</span></div><div className="login-kicker">SEU DIÁRIO DE TREINOS</div>
    <h1>Seu progresso começa aqui.</h1><p>Entre para registrar suas séries, acompanhar cargas e consultar seus treinos anteriores.</p>
    <form onSubmit={submit}><label htmlFor="pass">Senha de acesso</label><div className="password-wrap"><LockKeyhole size={17}/><input id="pass" autoComplete="current-password" type="password" placeholder="Sua senha" value={password} onChange={e=>setPassword(e.target.value)} required/></div>
    {error&&<p className="error-text" role="alert">{error}</p>}
    <button className="btn btn-primary" disabled={busy||!password} type="submit">{busy?<LoaderCircle size={16} className="spin"/>:<ArrowRight size={16}/>} Entrar</button></form>
    <p className="login-note">A senha fica apenas no servidor. O histórico é armazenado no seu banco Neon.</p>
  </div></main>;
}
