"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Bubblette } from "./Bubblette";

type AccountSnapshot={
  authenticated:boolean;
  signIn?:string;
  email?:string;
  alias?:string;
  timeZone?:string;
  timeZoneConfigured?:boolean;
  pendingTimeZone?:string|null;
  timeZoneEffectiveAt?:number|null;
  nextAliasChangeAt?:number;
  socialEnabled?:boolean;
  telemetryEnabled?:boolean;
  allowFriends?:boolean;
  friends?:Array<{alias:string}>;
  pendingCount?:number;
};

type ServiceRecordEntry={
  publicSlug:string;pseudonym:string;campaignId:string;outcome:"victory"|"defeat"|"abandoned";days:number;campaignScore:number;uberscoreEarned:number;friendCount:number;friendMultiplier:number;campaignRank:number;cohortSize:number;forcePreserved:number;front:number;completedAt:number;
};
type ServiceRecord={uberscore:number;globalRank:number;commanderCount:number;records:ServiceRecordEntry[]};
type SshCredential={id:string;label:string;algorithm:string;fingerprint:string;createdAt:number;lastUsedAt:number|null;revokedAt:number|null};

function AccountTerm({id,label,summary}:{id:string;label:string;summary:string}){return <Bubblette id={id} title={label} summary={summary} className="account-term">{label}</Bubblette>}

export function AccountPage({onNewCampaign}:{onNewCampaign:()=>void}){
  const[data,setData]=useState<AccountSnapshot|null>(null);
  const[service,setService]=useState<ServiceRecord|null>(null);
  const[inviteEmail,setInviteEmail]=useState("");
  const[notice,setNotice]=useState("");
  const[aliasDraft,setAliasDraft]=useState("");
  const[timeZoneDraft,setTimeZoneDraft]=useState("UTC");
  const[busy,setBusy]=useState(false);
  const[accountNow,setAccountNow]=useState(Date.now);
  const[sshCredentials,setSshCredentials]=useState<SshCredential[]>([]);
  const[pairCode,setPairCode]=useState("");
  const[pairLabel,setPairLabel]=useState("Command device");

  const load=useCallback(async()=>{
    try{
      const response=await fetch("/api/account",{cache:"no-store"});
      const account=await response.json() as AccountSnapshot;setData(account);
      if(account.alias)setAliasDraft(account.alias);
      if(account.timeZone)setTimeZoneDraft(account.timeZone);
      if(account.authenticated){
        const[records,ssh]=await Promise.all([fetch("/api/campaign-records",{cache:"no-store"}),fetch("/api/ssh/pair",{cache:"no-store"})]);
        if(records.ok)setService(await records.json() as ServiceRecord);
        if(ssh.ok){const result=await ssh.json() as {credentials?:SshCredential[]};setSshCredentials(result.credentials??[])}
      }
    }catch{
      setData({authenticated:false,signIn:"/api/session?return_to=%2Fgame%3Faccount%3D1"});
    }
  },[]);

  useEffect(()=>{void load()},[load]);
  useEffect(()=>{const code=new URLSearchParams(window.location.search).get("ssh_pair");if(code)setPairCode(code)},[]);
  useEffect(()=>{
    const timer=window.setInterval(()=>setAccountNow(Date.now()),60_000);
    return()=>window.clearInterval(timer);
  },[]);

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

  const remove=async(alias:string)=>{
    setBusy(true);setNotice("");
    try{await fetch("/api/account",{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({alias})});await load();setNotice("FRIENDSHIP REMOVED FOR BOTH ACCOUNTS")}finally{setBusy(false)}
  };
  const changeAlias=async()=>{
    setBusy(true);setNotice("");
    try{const response=await fetch("/api/account",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({alias:aliasDraft})});const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error??"Alias change failed.");await load();setNotice("PLAYER ALIAS UPDATED");}catch(error){setNotice(error instanceof Error?error.message:"Alias change failed.")}finally{setBusy(false)}
  };
  const timeZones=useMemo(()=>{
    const supported=typeof Intl!=="undefined"&&"supportedValuesOf" in Intl
      ? Intl.supportedValuesOf("timeZone")
      : ["UTC","America/Los_Angeles","America/Denver","America/Chicago","America/New_York","Europe/London","Europe/Berlin","Asia/Tokyo","Australia/Sydney"];
    return [...new Set([data?.timeZone??"UTC",...supported])];
  },[data?.timeZone]);
  const changeTimeZone=async()=>{
    setBusy(true);setNotice("");
    try{
      const response=await fetch("/api/account",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({timeZone:timeZoneDraft})});
      const result=await response.json() as {error?:string;timeZone?:string;pendingTimeZone?:string|null;timeZoneEffectiveAt?:number|null};if(!response.ok)throw new Error(result.error??"Time zone change failed.");
      await load();
      if(result.timeZone===timeZoneDraft)window.dispatchEvent(new CustomEvent("account-time-zone-changed",{detail:timeZoneDraft}));
      setNotice(result.pendingTimeZone?`TIME ZONE CHANGE QUEUED // ACTIVATES ${new Date(result.timeZoneEffectiveAt??0).toLocaleString()}`:"PRIVATE DAY BOUNDARY UPDATED");
    }catch(error){setNotice(error instanceof Error?error.message:"Time zone change failed.")}finally{setBusy(false)}
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

  const pairSsh=async(event:FormEvent)=>{
    event.preventDefault();setBusy(true);setNotice("");
    try{const response=await fetch("/api/ssh/pair",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code:pairCode,label:pairLabel})});const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error??"SSH pairing failed.");setPairCode("");await load();setNotice("SSH COMMAND DEVICE AUTHORIZED");}catch(error){setNotice(error instanceof Error?error.message:"SSH pairing failed.")}finally{setBusy(false)}
  };
  const revokeSsh=async(id:string)=>{
    setBusy(true);setNotice("");
    try{const response=await fetch("/api/ssh/pair",{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({id})});const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error??"SSH revocation failed.");await load();setNotice("SSH COMMAND DEVICE REVOKED");}catch(error){setNotice(error instanceof Error?error.message:"SSH revocation failed.")}finally{setBusy(false)}
  };

  const friendCount=data?.friends?.length??0,friendMultiplier=1+Math.min(10,friendCount)*.05;
  return <div className="module account-page" data-module="ACCOUNT"><header><span className="eyebrow">Command identity // social continuity</span><h1>Account</h1><p>Private identity, reciprocal friendships, Player Rating, and permanent Campaign Records.</p></header><section className="account-window os-window"><div className="os-titlebar"><span>ACCOUNT CONTROL PANEL</span><b>{data?.authenticated?"AUTHENTICATED":"SIGN-IN REQUIRED"}</b></div><section className="module-report"><div><small>PLAYER ALIAS</small><b>{data?.alias??"NOT SIGNED IN"}</b></div><div><small><AccountTerm id="uberscore" label="PLAYER RATING" summary="Cumulative account standing earned from campaign performance and social multipliers."/></small><b>{service?.uberscore.toLocaleString()??"0"}</b></div><div><small>GLOBAL RANK</small><b>{service?.records.length?`${service.globalRank} / ${service.commanderCount}`:"UNRANKED"}</b></div><div><small><AccountTerm id="friend-multiplier" label="FRIEND MULTIPLIER" summary="Each reciprocal friend adds 5% to Player Rating earned, up to ×1.50."/></small><b>×{friendMultiplier.toFixed(2)}</b></div></section>{!data?<div className="account-loading">LOADING ACCOUNT…</div>:!data.authenticated?<section className="account-signin"><h2>Sign in to maintain a Service Record.</h2><p>Campaign play remains available on this device. Permanent records, Player Rating, exact-campaign challenges, and reciprocal friendships use your private browser session.</p><a className="os-primary" href={data.signIn??"/api/session?return_to=%2F%3Faccount%3D1"}>START SESSION →</a></section>:<><div className="account-layout"><section className="account-credentials"><h2>Identity</h2><label><span>PLAYER ALIAS</span><input value={aliasDraft} onChange={event=>setAliasDraft(event.target.value)}/><small>Generated automatically. One change is permitted every 30 days.</small></label><button disabled={busy||aliasDraft===data.alias||accountNow<(data.nextAliasChangeAt??0)} onClick={()=>void changeAlias()}>CHANGE ALIAS</button><label><span>EMAIL ADDRESS</span><input value={data.email??""} readOnly/><small>Visible only to you. It never appears in public records, telemetry, administration, or another player&apos;s friends list.</small></label><label><span>PRIVATE TIME ZONE</span><select value={timeZoneDraft} onChange={event=>setTimeZoneDraft(event.target.value)}>{timeZones.map(zone=><option value={zone} key={zone}>{zone.replaceAll("_"," ")}</option>)}</select><small>Your campaign clock and automatic day boundary use midnight here. Aphorisms rotate whenever the campaign day advances. This setting is private and is not available to administration.</small></label><button disabled={busy||timeZoneDraft===data.timeZone} onClick={()=>void changeTimeZone()}>SET DAY BOUNDARY</button><label className="account-toggle"><input type="checkbox" checked={data.allowFriends??true} disabled={busy||!data.socialEnabled} onChange={event=>void setAllowFriends(event.target.checked)}/><span><b>ALLOW FRIENDS</b><small>Accept reciprocal invitations and enable social campaign features.</small></span></label><a href="/api/session?logout=1&return_to=%2F">SIGN OUT</a></section><section className="friends-panel"><header><div><small>FRIENDS // PRIVATE AND RECIPROCAL</small><h2>{friendCount} connected // ×{friendMultiplier.toFixed(2)}</h2></div></header><p className="friend-rule">Each connected friend adds 5% to Player Rating earned at campaign close, up to ten friends. Only player aliases appear here. The friends graph is never public or available to administration.</p>{data.friends?.length?<div className="friend-list">{data.friends.map(friend=><article key={friend.alias}><div><b>{friend.alias}</b></div><button disabled={busy} onClick={()=>void remove(friend.alias)}>REMOVE FOR BOTH</button></article>)}</div>:<p className="account-empty">NO FRIENDS YET // INVITE SOMEONE BY EMAIL</p>}{data.pendingCount?<div className="pending-invites"><h3>{data.pendingCount} PENDING REGISTRATION</h3></div>:null}<form onSubmit={invite}><label htmlFor="friend-email">INVITE FRIEND</label><div><input id="friend-email" type="email" required disabled={busy||!(data.allowFriends??true)||!data.socialEnabled} placeholder="friend@example.com" value={inviteEmail} onChange={event=>setInviteEmail(event.target.value)}/><button disabled={busy||!(data.allowFriends??true)||!data.socialEnabled}>{busy?"WORKING…":"INVITE →"}</button></div><small>The address is used only to establish the reciprocal connection and is never displayed to other players or in administration.</small></form>{notice&&<p className="account-notice" role="status">{notice}</p>}</section></div><section className="ssh-access service-record"><header><div><small>NATIVE COMMAND CHANNEL</small><h2>SSH Access</h2></div><b>{sshCredentials.filter(key=>!key.revokedAt).length} AUTHORIZED DEVICES</b></header><p className="friend-rule">Connect with <code>ssh play@ssh.delenda.quest</code>. An unknown key receives a one-time pairing code. Authorize it here; the SSH server never exposes a host shell.</p><form onSubmit={pairSsh}><label htmlFor="ssh-pair-code">PAIRING CODE</label><div><input id="ssh-pair-code" required maxLength={8} placeholder="ABCDEFGH" value={pairCode} onChange={event=>setPairCode(event.target.value.toUpperCase())}/><input aria-label="Device label" required maxLength={64} value={pairLabel} onChange={event=>setPairLabel(event.target.value)}/><button disabled={busy}>{busy?"WORKING…":"AUTHORIZE →"}</button></div></form>{sshCredentials.length?<div className="friend-list">{sshCredentials.map(key=><article key={key.id}><div><b>{key.label}</b><small>{key.algorithm} // {key.fingerprint}</small><small>{key.revokedAt?"REVOKED":key.lastUsedAt?`LAST USED ${new Date(key.lastUsedAt).toLocaleString()}`:"AUTHORIZED // NOT YET USED"}</small></div>{!key.revokedAt?<button disabled={busy} onClick={()=>void revokeSsh(key.id)}>REVOKE</button>:null}</article>)}</div>:<p className="account-empty">NO SSH DEVICES AUTHORIZED</p>}</section><section className="service-record"><header><div><small>PERMANENT PROFILE LEDGER</small><h2><AccountTerm id="service-record" label="Service Record" summary="Every completed run and its rating, permanently attached to this profile."/></h2></div><b>{service?.records.length??0} COMPLETED RUNS</b></header>{service?.records.length?<div>{service.records.map(record=><article key={record.publicSlug} className={record.outcome}><div className="record-result"><small>{new Date(record.completedAt).toLocaleDateString()} // {record.campaignId}</small><h3>{record.outcome.toUpperCase()}</h3><span>DAY {record.days} // {record.forcePreserved.toFixed(1)}% OPENING FORCE REMAINING // {record.front>=0?"+":""}{record.front.toFixed(1)} KM</span></div><div><small>CAMPAIGN PERFORMANCE</small><b>{record.campaignScore.toLocaleString()}</b><span>RANK {record.campaignRank} / {record.cohortSize}</span></div><div><small>PLAYER RATING EARNED</small><b>+{record.uberscoreEarned.toLocaleString()}</b><span>{record.friendCount} FRIENDS // ×{record.friendMultiplier.toFixed(2)}</span></div><a href={`/record/${record.publicSlug}`}>OPEN RECORD →</a></article>)}</div>:<p className="account-empty">NO COMPLETED RUNS // CAMPAIGN RECORDS ARE ISSUED AT VICTORY OR DEFEAT</p>}</section></>}<footer className="account-actions"><div><b>CAMPAIGN CONTINUITY</b><small>Starting over issues partial Player Rating credit for played days before opening the new campaign.</small></div><button onClick={onNewCampaign}>NEW CAMPAIGN →</button></footer></section></div>;
}
