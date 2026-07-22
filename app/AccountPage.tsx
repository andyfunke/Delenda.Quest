"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type AccountSnapshot={
  authenticated:boolean;
  signIn?:string;
  email?:string;
  displayName?:string;
  allowFriends?:boolean;
  friends?:Array<{email:string;displayName:string}>;
  pending?:Array<{email:string;createdAt:number}>;
};

export function AccountPage({onNewCampaign}:{onNewCampaign:()=>void}){
  const[data,setData]=useState<AccountSnapshot|null>(null);
  const[inviteEmail,setInviteEmail]=useState("");
  const[notice,setNotice]=useState("");
  const[busy,setBusy]=useState(false);

  const load=useCallback(async()=>{
    try{
      const response=await fetch("/api/account",{cache:"no-store"});
      setData(await response.json() as AccountSnapshot);
    }catch{
      setData({authenticated:false,signIn:"/signin-with-chatgpt?return_to=%2F%3Faccount%3D1"});
    }
  },[]);

  useEffect(()=>{void load()},[load]);

  const invite=async(event:FormEvent)=>{
    event.preventDefault();setBusy(true);setNotice("");
    try{
      const response=await fetch("/api/account",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:inviteEmail})});
      const result=await response.json() as {error?:string;registered?:boolean;inviteeEmail?:string;subject?:string;body?:string};
      if(!response.ok)throw new Error(result.error??"Invite failed.");
      setNotice(result.registered?"FRIEND ADDED // EMAIL HANDOFF READY":"INVITATION RECORDED // FRIENDSHIP ACTIVATES WHEN THAT ADDRESS REGISTERS");
      setInviteEmail("");await load();
      window.location.assign(`mailto:${encodeURIComponent(result.inviteeEmail??"")}?subject=${encodeURIComponent(result.subject??"")}&body=${encodeURIComponent(result.body??"")}`);
    }catch(error){setNotice(error instanceof Error?error.message:"Invite failed.")}finally{setBusy(false)}
  };

  const remove=async(email:string)=>{
    setBusy(true);setNotice("");
    try{await fetch("/api/account",{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({email})});await load();setNotice("FRIENDSHIP REMOVED FOR BOTH ACCOUNTS")}finally{setBusy(false)}
  };

  const setAllowFriends=async(allowFriends:boolean)=>{
    if(!data?.authenticated)return;
    const previous=data.allowFriends??true;setData({...data,allowFriends});setBusy(true);setNotice("");
    try{
      const response=await fetch("/api/account",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({allowFriends})});
      const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error??"Account setting failed.");
      setNotice(allowFriends?"FRIEND INVITATIONS ENABLED":"NEW FRIEND INVITATIONS DISABLED");
    }catch(error){setData(current=>current?{...current,allowFriends:previous}:current);setNotice(error instanceof Error?error.message:"Account setting failed.")}finally{setBusy(false)}
  };

  return <div className="module account-page" data-module="ACCOUNT"><header><span className="eyebrow">Command identity // social continuity</span><h1>Account</h1><p>Identity, reciprocal friendships, and campaign continuity.</p></header><section className="account-window os-window"><div className="os-titlebar"><span>ACCOUNT CONTROL PANEL</span><b>{data?.authenticated?"AUTHENTICATED":"SIGN-IN REQUIRED"}</b></div><section className="module-report"><div><small>ACCOUNT</small><b>{data?.email??"NOT SIGNED IN"}</b></div><div><small>ACTIVE FRIENDS</small><b>{data?.friends?.length??0}</b></div><div><small>PENDING INVITES</small><b>{data?.pending?.length??0}</b></div><div><small>CAMPAIGN</small><b>RENEWABLE</b></div></section>{!data?<div className="account-loading">LOADING ACCOUNT…</div>:!data.authenticated?<section className="account-signin"><h2>Sign in to maintain friendships.</h2><p>Campaign play remains available on this device. Account identity and reciprocal friendships use your ChatGPT sign-in.</p><a className="os-primary" href={data.signIn??"/signin-with-chatgpt?return_to=%2F%3Faccount%3D1"}>SIGN IN WITH CHATGPT →</a></section>:<div className="account-layout"><section className="account-credentials"><h2>Credentials</h2><label><span>EMAIL ADDRESS</span><input value={data.email??""} readOnly/><small>Verified by the connected identity provider.</small></label><label><span>PASSWORD</span><input value="••••••••••••" type="password" readOnly/><small>Managed by sign-in. DELENDA.QUEST never stores your password.</small></label><label className="account-toggle"><input type="checkbox" checked={data.allowFriends??true} disabled={busy} onChange={event=>void setAllowFriends(event.target.checked)}/><span><b>ALLOW FRIENDS</b><small>Accept reciprocal invitations and enable social campaign features.</small></span></label><a href="/signout-with-chatgpt?return_to=%2F">SIGN OUT</a></section><section className="friends-panel"><header><div><small>FRIENDS LIST // RECIPROCAL</small><h2>{data.friends?.length??0} connected</h2></div></header>{data.friends?.length?<div className="friend-list">{data.friends.map(friend=><article key={friend.email}><div><b>{friend.displayName}</b><small>{friend.email}</small></div><button disabled={busy} onClick={()=>void remove(friend.email)}>REMOVE FOR BOTH</button></article>)}</div>:<p className="account-empty">NO FRIENDS YET // INVITE SOMEONE BY EMAIL</p>}{data.pending?.length?<div className="pending-invites"><h3>PENDING REGISTRATION</h3>{data.pending.map(invitation=><span key={invitation.email}>{invitation.email}</span>)}</div>:null}<form onSubmit={invite}><label htmlFor="friend-email">INVITE FRIEND</label><div><input id="friend-email" type="email" required disabled={busy||!(data.allowFriends??true)} placeholder="friend@example.com" value={inviteEmail} onChange={event=>setInviteEmail(event.target.value)}/><button disabled={busy||!(data.allowFriends??true)}>{busy?"WORKING…":"INVITE →"}</button></div><small>The friendship is one relationship stored for both accounts. Delivery opens through your configured mail client.</small></form>{notice&&<p className="account-notice" role="status">{notice}</p>}</section></div>}<footer className="account-actions"><div><b>CAMPAIGN CONTINUITY</b><small>Renewing generates a new authored campaign. No construction variables are exposed.</small></div><button onClick={onNewCampaign}>NEW CAMPAIGN →</button></footer></section></div>;
}
