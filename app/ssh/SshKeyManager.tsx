"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Credential={id:string;label:string;algorithm:string;fingerprint:string;createdAt:number;lastUsedAt:number|null;revokedAt:number|null};

export function SshKeyManager(){
  const[credentials,setCredentials]=useState<Credential[]>([]);
  const[label,setLabel]=useState("My computer");
  const[publicKey,setPublicKey]=useState("");
  const[notice,setNotice]=useState("");
  const[busy,setBusy]=useState(false);

  const load=useCallback(async()=>{
    const response=await fetch("/api/ssh/credentials",{cache:"no-store"});
    const payload=await response.json() as {credentials?:Credential[];error?:string};
    if(!response.ok)throw new Error(payload.error??"SSH credentials are unavailable.");
    setCredentials(payload.credentials??[]);
  },[]);

  useEffect(()=>{void load().catch(error=>setNotice(error instanceof Error?error.message:"SSH credentials are unavailable."))},[load]);

  const register=async(event:FormEvent)=>{
    event.preventDefault();setBusy(true);setNotice("");
    try{
      const response=await fetch("/api/ssh/credentials",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({label,publicKey})});
      const payload=await response.json() as {error?:string};
      if(!response.ok)throw new Error(payload.error??"SSH key registration failed.");
      setPublicKey("");await load();setNotice("SSH KEY REGISTERED // AVA REMOTE COMMAND AUTHORIZED");
    }catch(error){setNotice(error instanceof Error?error.message:"SSH key registration failed.")}finally{setBusy(false)}
  };

  const revoke=async(id:string)=>{
    setBusy(true);setNotice("");
    try{
      const response=await fetch("/api/ssh/credentials",{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({id})});
      const payload=await response.json() as {error?:string};
      if(!response.ok)throw new Error(payload.error??"SSH key revocation failed.");
      await load();setNotice("SSH KEY REVOKED");
    }catch(error){setNotice(error instanceof Error?error.message:"SSH key revocation failed.")}finally{setBusy(false)}
  };

  return <main className="module account-page" data-module="SSH">
    <header><span className="eyebrow">Ava remote command // public-key authentication</span><h1>SSH Access</h1><p>Register a public key, then connect with a normal OpenSSH client. The gateway exposes Ava only. It does not provide a host shell, port forwarding, SFTP, or SCP.</p></header>
    <section className="account-window os-window">
      <div className="os-titlebar"><span>AVA REMOTE COMMAND</span><b>PUBLIC KEY ONLY</b></div>
      <section className="module-report"><div><small>HOST</small><b>ssh.delenda.quest</b></div><div><small>USER</small><b>play</b></div><div><small>COMMAND</small><b>ssh play@ssh.delenda.quest</b></div></section>
      <div className="account-layout">
        <section className="account-credentials">
          <h2>Register key</h2>
          <form onSubmit={register}>
            <label><span>KEY LABEL</span><input value={label} maxLength={60} onChange={event=>setLabel(event.target.value)}/></label>
            <label><span>PUBLIC KEY</span><textarea required rows={6} spellCheck={false} placeholder="ssh-ed25519 AAAAC3... you@computer" value={publicKey} onChange={event=>setPublicKey(event.target.value)}/><small>Paste the contents of a .pub file. Private keys never leave your computer.</small></label>
            <button disabled={busy||!publicKey.trim()}>{busy?"WORKING…":"AUTHORIZE KEY →"}</button>
          </form>
        </section>
        <section className="friends-panel">
          <header><div><small>AUTHORIZED MACHINES</small><h2>{credentials.filter(item=>!item.revokedAt).length} active keys</h2></div></header>
          {credentials.length?<div className="friend-list">{credentials.map(item=><article key={item.id}><div><b>{item.label}</b><small>{item.fingerprint}</small><small>{item.revokedAt?`REVOKED ${new Date(item.revokedAt).toLocaleString()}`:item.lastUsedAt?`LAST USED ${new Date(item.lastUsedAt).toLocaleString()}`:`ADDED ${new Date(item.createdAt).toLocaleString()}`}</small></div>{!item.revokedAt?<button disabled={busy} onClick={()=>void revoke(item.id)}>REVOKE</button>:null}</article>)}</div>:<p className="account-empty">NO SSH KEYS REGISTERED</p>}
          {notice?<p className="account-notice" role="status">{notice}</p>:null}
        </section>
      </div>
      <footer className="account-actions"><div><b>CONNECTION CONTRACT</b><small>Every command uses the same Ava kernel and campaign state as the web interface. Consequential orders still require prepare and confirm.</small></div><a className="os-primary" href="/game?account=1">RETURN TO ACCOUNT →</a></footer>
    </section>
  </main>;
}
