'use client';
import {useState,type FormEvent} from 'react';
import {createAuthClient} from '@neondatabase/auth/next';
const auth=createAuthClient();
export default function PasswordReset(){
  const [email,setEmail]=useState('');
  const [otp,setOtp]=useState('');
  const [password,setPassword]=useState('');
  const [step,setStep]=useState(0);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function submit(e:FormEvent){
    e.preventDefault();setBusy(true);setError('');
    try{
      if(step===0){
        const r=await auth.forgetPassword.emailOtp({email:email.trim().toLowerCase()});
        if(r.error)throw new Error(r.error.message||'Não foi possível enviar o código.');
        setStep(1);
      }else{
        if(password.length<8)throw new Error('A senha precisa de ao menos 8 caracteres.');
        const r=await auth.emailOtp.resetPassword({email:email.trim().toLowerCase(),otp,password});
        if(r.error)throw new Error(r.error.message||'Não foi possível redefinir a senha.');
        setStep(2);
      }
    }catch(err){setError(err instanceof Error?err.message:'Falha na recuperação.');}
    finally{setBusy(false);}
  }
  return <main className="login-page"><div className="login-card">
    <div className="logo-word">ritmo<span>.</span></div><div className="login-kicker">RECUPERAR ACESSO</div>
    <h1>Esqueceu sua senha?</h1>
    {step===2?<p>Senha atualizada. <a href="/">Faça login.</a></p>:<form onSubmit={submit}>
      <label htmlFor="reset-email">Seu e-mail</label>
      <input id="reset-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required readOnly={step===1}/>
      {step===1&&<>
        <label htmlFor="reset-otp">Código recebido</label>
        <input id="reset-otp" value={otp} onChange={e=>setOtp(e.target.value)} autoComplete="one-time-code" required/>
        <label htmlFor="reset-pass">Nova senha</label>
        <input id="reset-pass" type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} required/>
      </>}
      {error&&<p className="error-text" role="alert">{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={busy}>{step===0?'Enviar código':'Redefinir senha'}</button>
    </form>}
    <p className="login-note"><a href="/">Voltar ao login</a></p>
  </div></main>;
}
