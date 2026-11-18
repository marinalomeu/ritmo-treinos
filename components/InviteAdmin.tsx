'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {Copy,Plus,Trash2,LoaderCircle} from 'lucide-react';
type Invite={id:string;email:string;status:string;expires_at:string};
export default function InviteAdmin(){
  const [items,setItems]=useState<Invite[]>([]);
  const [email,setEmail]=useState('');
  const [url,setUrl]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function refresh(){
    const response=await fetch('/api/admin/invitations',{cache:'no-store'});
    const body=await response.json();
    if(!response.ok)throw new Error(body.error||'Não foi possível carregar os convites.');
    setItems(body.invitations||[]);
  }
  useEffect(()=>{refresh().catch(e=>setError(e.message));},[]);
  async function add(event:FormEvent){
    event.preventDefault();setBusy(true);setError('');setUrl('');
    try{
      const response=await fetch('/api/admin/invitations',{method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||'Não foi possível criar o convite.');
      setUrl(body.invite_url);setEmail('');await refresh();
    }catch(e){setError(e instanceof Error?e.message:'Erro ao criar convite.');}
    finally{setBusy(false);}
  }
  async function revoke(id:string){
    if(!window.confirm('Deseja revogar este convite?'))return;
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/admin/invitations',{method:'PATCH',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
      if(!response.ok)throw new Error('Não foi possível revogar.');
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:'Erro ao revogar.');}
    finally{setBusy(false);}
  }
  return <main className="login-page"><div className="login-card" style={{maxWidth:650}}>
    <div className="logo-word">ritmo<span>.</span></div><div className="login-kicker">ADMINISTRAÇÃO</div>
    <h1>Convidar amigos</h1>
    <p>Apenas pessoas que você convidar poderão criar contas. O histórico de cada uma continua privado.</p>
    <form onSubmit={add}>
      <label htmlFor="friend-email">E-mail do convidado</label>
      <input id="friend-email" type="email" value={email} onChange={e=>setEmail(e.target.value)}
        placeholder="amigo@exemplo.com" required />
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy?<LoaderCircle size={16} className="spin"/>:<Plus size={16}/>} Criar convite
      </button>
    </form>
    {url&&<div style={{marginTop:18}}>
      <p><strong>Link exclusivo:</strong> copie-o agora e envie à pessoa convidada.</p>
      <input readOnly aria-label="Link de convite" value={url}/>
      <button className="btn btn-primary" type="button" onClick={()=>void navigator.clipboard.writeText(url)}>
        <Copy size={16}/> Copiar link
      </button>
    </div>}
    {error&&<p className="error-text" role="alert">{error}</p>}
    <h2 style={{marginTop:30}}>Convites</h2>
    {items.length===0?<p>Nenhum convite criado.</p>:items.map(item=>
      <div key={item.id} style={{display:'flex',justifyContent:'space-between',gap:12,padding:'12px 0',borderBottom:'1px solid #e4deda'}}>
        <div><strong>{item.email}</strong><p className="login-note">{item.status} · Até {new Date(item.expires_at).toLocaleDateString('pt-BR')}</p></div>
        {item.status==='pending'&&<button disabled={busy} type="button" title="Revogar" onClick={()=>void revoke(item.id)}><Trash2 size={16}/></button>}
      </div>
    )}
    <p className="login-note"><a href="/">Voltar ao aplicativo</a></p>
  </div></main>;
}
