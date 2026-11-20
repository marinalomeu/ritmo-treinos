'use client';
import { useState, type FormEvent } from 'react';
import { ArrowRight, Dumbbell, LockKeyhole, LoaderCircle } from 'lucide-react';
import { createAuthClient } from '@neondatabase/auth/next';

const authClient = createAuthClient();

export default function Login() {
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const submit=async(e:FormEvent)=>{
    e.preventDefault();setBusy(true);setError('');
    try {
      const result = await authClient.signIn.email({ email:email.trim().toLowerCase(), password });
      if (result.error) throw new Error(result.error.message || 'Credenciais inválidas.');
      window.location.replace('/');
    } catch(err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
      setBusy(false);
    }
  };
  return <main className="login-page"><div className="login-card">
    <div className="login-mark"><Dumbbell size={25}/></div>
    <div className="logo-word">ritmo<span>.</span></div>
    <div className="login-kicker">SEU DIÁRIO DE TREINOS</div>
    <h1>Seu progresso começa aqui.</h1>
    <p>Acesse com seu e-mail e sua senha pessoal. Novas contas são liberadas somente por convite.</p>
    <form onSubmit={submit}>
      <label htmlFor="login-email">E-mail</label>
      <div className="password-wrap"><input id="login-email" type="email" autoComplete="username" placeholder="voce@exemplo.com" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
      <label htmlFor="login-password">Senha</label>
      <div className="password-wrap"><LockKeyhole size={17}/><input id="login-password" type="password" autoComplete="current-password" placeholder="Sua senha" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
      {error && <p className="error-text" role="alert">{error}</p>}
      <button className="btn btn-primary" disabled={busy || !email || !password} type="submit">
        {busy?<LoaderCircle className="spin" size={16}/>:<ArrowRight size={16}/>} Entrar
      </button>
    </form>
    <p className="login-note"><a href="/recuperar-senha">Esqueci minha senha</a></p><p className="login-note"><a href="/ativar-conta">Primeiro acesso da proprietária</a></p><p className="login-note">Não tem uma conta? Solicite um convite à administradora do ritmo.</p>
  </div></main>;
}
