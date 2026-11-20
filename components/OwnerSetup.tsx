'use client';
import {useState,type FormEvent} from 'react';
import {createAuthClient} from '@neondatabase/auth/next';
import {Dumbbell,LoaderCircle} from 'lucide-react';

const auth=createAuthClient();
type Step='email'|'verify'|'password'|'done';

export default function OwnerSetup(){
  const [step,setStep]=useState<Step>('email');
  const [email,setEmail]=useState('');
  const [otp,setOtp]=useState('');
  const [password,setPassword]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const normalizedEmail=email.trim().toLowerCase();

  async function submit(event:FormEvent){
    event.preventDefault();
    setBusy(true);setError('');
    try{
      if(step==='email'){
        const response=await auth.emailOtp.sendVerificationOtp({
          email:normalizedEmail,type:'email-verification'
        });
        if(response.error)throw new Error(response.error.message||'Não foi possível enviar o código.');
        setStep('verify');setOtp('');
      }else if(step==='verify'){
        const response=await auth.emailOtp.verifyEmail({email:normalizedEmail,otp:otp.trim()});
        if(response.error)throw new Error(response.error.message||'Código inválido ou expirado.');
        const reset=await auth.forgetPassword.emailOtp({email:normalizedEmail});
        if(reset.error)throw new Error(reset.error.message||'Não foi possível enviar o código para criar a senha.');
        setOtp('');setStep('password');
      }else if(step==='password'){
        if(password.length<8)throw new Error('A senha precisa de pelo menos 8 caracteres.');
        const response=await auth.emailOtp.resetPassword({email:normalizedEmail,otp:otp.trim(),password});
        if(response.error)throw new Error(response.error.message||'Código inválido ou expirado.');
        const signed=await auth.signIn.email({email:normalizedEmail,password});
        if(signed.error)throw new Error(signed.error.message||'Senha definida. Entre pelo login.');
        const activated=await fetch('/api/owner/activate',{method:'POST'});
        if(!activated.ok){
          const body=await activated.json().catch(()=>({error:'Não foi possível ativar esta conta.'}));
          throw new Error(body.error||'Não foi possível ativar esta conta.');
        }
        setStep('done');
        window.location.replace('/');
      }
    }catch(e){
      setError(e instanceof Error?e.message:'Não foi possível concluir a ativação.');
    }finally{
      setBusy(false);
    }
  }

  return <main className="login-page"><div className="login-card">
    <div className="login-mark"><Dumbbell size={25}/></div>
    <div className="logo-word">ritmo<span>.</span></div>
    <div className="login-kicker">PRIMEIRO ACESSO</div>
    <h1>Ativar conta proprietária</h1>
    <p>Ativação reservada à conta previamente autorizada. O acesso só será liberado após verificação por e-mail e definição da senha.</p>
    {step==='done'?<p>Conta ativada. Redirecionando...</p>:<form onSubmit={submit}>
      <label htmlFor="owner-email">E-mail autorizado</label>
      <input id="owner-email" type="email" autoComplete="email" value={email}
        onChange={e=>setEmail(e.target.value)} readOnly={step!=='email'} required />
      {step==='verify'&&<>
        <p>Informe o código de verificação enviado ao e-mail.</p>
        <label htmlFor="owner-verify-otp">Código de verificação</label>
        <input id="owner-verify-otp" inputMode="numeric" autoComplete="one-time-code"
          value={otp} onChange={e=>setOtp(e.target.value)} required />
      </>}
      {step==='password'&&<>
        <p>Informe o segundo código, enviado para definir sua senha.</p>
        <label htmlFor="owner-reset-otp">Código para criar senha</label>
        <input id="owner-reset-otp" inputMode="numeric" autoComplete="one-time-code"
          value={otp} onChange={e=>setOtp(e.target.value)} required />
        <label htmlFor="owner-new-password">Nova senha</label>
        <input id="owner-new-password" type="password" autoComplete="new-password"
          minLength={8} value={password} onChange={e=>setPassword(e.target.value)} required />
      </>}
      {error&&<p role="alert" className="error-text">{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy&&<LoaderCircle size={16} className="spin"/>}
        {step==='email'?'Enviar código de verificação':
          step==='verify'?'Verificar e enviar código de senha':'Definir senha e ativar'}
      </button>
    </form>}
    <p className="login-note"><a href="/">Voltar ao login</a></p>
  </div></main>;
}
