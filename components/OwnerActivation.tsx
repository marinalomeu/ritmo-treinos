'use client';
import {useState,type FormEvent} from 'react';
import {createAuthClient} from '@neondatabase/auth/next';
import {Dumbbell,LoaderCircle} from 'lucide-react';

const auth=createAuthClient();
type Stage='email'|'verify'|'password-code'|'password'|'activate'|'finished';

export default function OwnerActivation(){
  const [stage,setStage]=useState<Stage>('email');
  const [email,setEmail]=useState('');
  const [otp,setOtp]=useState('');
  const [password,setPassword]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');

  async function submit(event:FormEvent){
    event.preventDefault();
    setBusy(true);setError('');setMessage('');
    try{
      const normalized=email.trim().toLowerCase();
      if(stage==='email'){
        const result=await auth.emailOtp.sendVerificationOtp({email:normalized,type:'email-verification'});
        if(result.error)throw new Error(result.error.message||'Não foi possível enviar a verificação.');
        setStage('verify');
        setMessage('Se este e-mail estiver cadastrado, você receberá um código para confirmar o endereço.');
      }else if(stage==='verify'){
        const result=await auth.emailOtp.verifyEmail({email:normalized,otp:otp.trim()});
        if(result.error)throw new Error(result.error.message||'Código inválido ou expirado.');
        setOtp('');
        setStage('password-code');
        setMessage('E-mail confirmado. Agora você pode definir a senha.');
      }else if(stage==='password-code'){
        const result=await auth.forgetPassword.emailOtp({email:normalized});
        if(result.error)throw new Error(result.error.message||'Não foi possível enviar o código de senha.');
        setStage('password');
        setMessage('Confira seu e-mail para obter o código de definição de senha.');
      }else if(stage==='password'){
        if(password.length<12)throw new Error('A senha deve ter pelo menos 12 caracteres.');
        const result=await auth.emailOtp.resetPassword({email:normalized,otp:otp.trim(),password});
        if(result.error)throw new Error(result.error.message||'Não foi possível definir a senha.');
        setOtp('');
        setStage('activate');
        setMessage('Senha definida. A próxima etapa validará seu login e ativará o perfil de testes.');
      }else if(stage==='activate'){
        const signIn=await auth.signIn.email({email:normalized,password});
        if(signIn.error)throw new Error(signIn.error.message||'Não foi possível autenticar.');
        const response=await fetch('/api/owner/activate',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
        const data=await response.json().catch(()=>({error:'Não foi possível concluir a ativação.'}));
        if(!response.ok)throw new Error(data.error||'Ativação não autorizada.');
        setPassword('');
        setStage('finished');
      }
    }catch(err){setError(err instanceof Error?err.message:'Não foi possível concluir esta etapa.');}
    finally{setBusy(false);}
  }

  const stageLabels:Record<Stage,string>={
    email:'1. Confirmar e-mail',
    verify:'2. Validar código',
    'password-code':'3. Solicitar código para senha',
    password:'4. Definir sua senha',
    activate:'5. Confirmar acesso',
    finished:'Conta ativada'
  };
  const startStep=stage==='email';
  return <main className="login-page"><div className="login-card">
    <div className="login-mark"><Dumbbell size={25}/></div>
    <div className="logo-word">ritmo<span>.</span></div>
    <div className="login-kicker">ATIVAÇÃO DA CONTA ADMINISTRADORA</div>
    <h1>{stageLabels[stage]}</h1>
    {stage==='finished'?<>
      <p>Seu e-mail foi validado e sua conta foi ativada no ambiente de testes.</p>
      <a className="btn btn-primary" href="/">Acessar o ritmo.</a>
    </>:<>
      <p>Essa ativação acontece apenas no ambiente de testes; ela não altera seu acesso atual.</p>
      <form onSubmit={submit}>
        <label htmlFor="activation-email">E-mail da administradora</label>
        <input id="activation-email" type="email" required value={email}
          onChange={e=>setEmail(e.target.value)} readOnly={!startStep} autoComplete="username"
          placeholder="seu@email.com"/>
        {(stage==='verify'||stage==='password')&&<>
          <label htmlFor="activation-code">Código recebido por e-mail</label>
          <input id="activation-code" inputMode="numeric" autoComplete="one-time-code"
            required value={otp} onChange={e=>setOtp(e.target.value)} />
        </>}
        {(stage==='password'||stage==='activate')&&<>
          <label htmlFor="activation-password">Sua nova senha</label>
          <input id="activation-password" type="password" autoComplete="new-password"
            minLength={12} required value={password} onChange={e=>setPassword(e.target.value)} />
        </>}
        {message&&<p role="status">{message}</p>}
        {error&&<p className="error-text" role="alert">{error}</p>}
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy&&<LoaderCircle className="spin" size={16}/>}
          {stage==='email'?'Enviar verificação':
            stage==='verify'?'Confirmar e-mail':
            stage==='password-code'?'Enviar código para senha':
            stage==='password'?'Definir senha':'Validar login e ativar'}
        </button>
      </form>
      {stage==='verify'&&<button type="button" className="logout-link" disabled={busy}
        onClick={async()=>{
          setError('');setMessage('');setBusy(true);
          try{
            const r=await auth.emailOtp.sendVerificationOtp({email:email.trim().toLowerCase(),type:'email-verification'});
            if(r.error)throw new Error(r.error.message||'Não foi possível reenviar.');
            setMessage('Enviamos um novo código.');setOtp('');
          }catch(err){setError(err instanceof Error?err.message:'Falha ao reenviar.');}
          finally{setBusy(false);}
        }}>Reenviar código</button>}
      <p className="login-note">Nunca compartilhe sua senha ou códigos de verificação.</p>
    </>}
  </div></main>;
}
