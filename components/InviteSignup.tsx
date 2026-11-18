'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {createAuthClient} from '@neondatabase/auth/next';
import {Dumbbell,LoaderCircle} from 'lucide-react';
const auth=createAuthClient();

export default function InviteSignup({token}:{token:string}) {
  const [email,setEmail]=useState('');
  const [name,setName]=useState('');
  const [password,setPassword]=useState('');
  const [otp,setOtp]=useState('');
  const [phase,setPhase]=useState<'signup'|'verify'|'done'>('signup');
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{
    let active=true;
    fetch('/api/invitations/activate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})})
      .then(async response=>{const body=await response.json();if(!response.ok)throw new Error(body.error||'Convite inválido.');return body;})
      .then(body=>{if(active)setEmail(body.email);})
      .catch(e=>{if(active)setError(e instanceof Error?e.message:'Convite inválido.');})
      .finally(()=>{if(active)setBusy(false);});
    return()=>{active=false};
  },[token]);
  async function submit(event:FormEvent){
    event.preventDefault();setBusy(true);setError('');
    try{
      if(phase==='signup'){
        if(password.length<12||name.trim().length<2)throw new Error('Informe seu nome e use uma senha com pelo menos 12 caracteres.');
        const result=await auth.signUp.email({email,name:name.trim(),password});
        if(result.error)throw new Error(result.error.message||'Não foi possível criar a conta.');
        setPhase('verify');
      }else if(phase==='verify'){
        const verified=await auth.emailOtp.verifyEmail({email,otp:otp.trim()});
        if(verified.error)throw new Error(verified.error.message||'Código inválido.');
        const signed=await auth.signIn.email({email,password});
        if(signed.error)throw new Error(signed.error.message||'E-mail verificado. Entre com seu e-mail e senha.');
        setPhase('done');
        window.location.replace('/');
      }
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível concluir o cadastro.');}
    finally{setBusy(false);}
  }
  async function resend(){
    setBusy(true);setError('');
    try{
      const result=await auth.emailOtp.sendVerificationOtp({email,type:'email-verification'});
      if(result.error)throw new Error(result.error.message||'Não foi possível reenviar o código.');
    }catch(e){setError(e instanceof Error?e.message:'Falha no envio.');}
    finally{setBusy(false);}
  }
  return <main className="login-page"><div className="login-card">
    <div className="login-mark"><Dumbbell size={25}/></div>
    <div className="logo-word">ritmo<span>.</span></div>
    <div className="login-kicker">CONVITE PESSOAL</div>
    <h1>Bem-vindo ao ritmo.</h1>
    {busy&&!email?<p>Validando convite...</p>:!email?<p role="alert">{error||'Este convite não está disponível.'}</p>:
      phase==='done'?<p>Conta verificada. Entrando...</p>:<form onSubmit={submit}>
        {phase==='signup'?<>
          <p>Seus treinos serão privados e independentes dos demais usuários.</p>
          <label htmlFor="invite-email">E-mail do convite</label>
          <input id="invite-email" value={email} readOnly />
          <label htmlFor="invite-name">Seu nome</label>
          <input id="invite-name" value={name} maxLength={100} onChange={e=>setName(e.target.value)} required />
          <label htmlFor="invite-pass">Sua senha</label>
          <input id="invite-pass" type="password" autoComplete="new-password" minLength={12}
            value={password} onChange={e=>setPassword(e.target.value)} required />
        </>:<>
          <p>Digite o código enviado para <strong>{email}</strong>.</p>
          <label htmlFor="invite-otp">Código de verificação</label>
          <input id="invite-otp" inputMode="numeric" autoComplete="one-time-code"
            value={otp} onChange={e=>setOtp(e.target.value)} required />
        </>}
        {error&&<p className="error-text" role="alert">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy&&<LoaderCircle size={16} className="spin"/>}
          {phase==='signup'?'Criar minha conta':'Verificar e entrar'}
        </button>
      </form>}
    {email&&phase==='verify'&&<button className="logout-link" disabled={busy} type="button" onClick={()=>void resend()}>Reenviar código</button>}
    <p className="login-note"><a href="/">Já tem uma conta? Entrar</a></p>
  </div></main>;
}
