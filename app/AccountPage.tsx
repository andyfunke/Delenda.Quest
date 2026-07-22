"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type AccountSnapshot={
  authenticated:boolean;
  signIn?:string;
  email?:string;
  displayName?:string;
  allowFriends?:boolean;
  friends?:Array<{email:string;displayName:string}>;
  pending?:Array<{email:string;createdAt:number}>;
};

type CampaignRecord={
  format:"delenda.quest.campaign.v1";
  id:string;
  title:string;
  description?:string;
  access:"private"|"friends";
  updatedAt:string;
  entries?:unknown[];
  ownerEmail?:string;
  editable?:boolean;
  [key:string]:unknown;
};

const CAMPAIGNS_KEY="delenda.quest.campaign-packs.v1";
const ACTIVE_CAMPAIGN_KEY="delenda.quest.active-campaign-pack.v1";

const localCampaigns=()=>{
  try{return JSON.parse(window.localStorage.getItem(CAMPAIGNS_KEY)??"[]") as CampaignRecord[]}catch{return[]}
};

export function AccountPage({onNewCampaign}:{onNewCampaign:()=>void}){
  const[data,setData]=useState<AccountSnapshot|null>(null);
  const[remoteCampaigns,setRemoteCampaigns]=useState<CampaignRecord[]>([]);
  const[deviceCampaigns,setDeviceCampaigns]=useState<CampaignRecord[]>([]);
  const[inviteEmail,setInviteEmail]=useState("");
  const[notice,setNotice]=useState("");
  const[busy,setBusy]=useState(false);

  const load=useCallback(async()=>{
    try{
      const[accountResponse,campaignResponse]=await Promise.all([fetch("/api/account",{cache:"no-store"}),fetch("/api/campaigns",{cache:"no-store"})]);
      setData(await accountResponse.json() as AccountSnapshot);
      const library=await campaignResponse.json() as {campaigns?:CampaignRecord[]};
      setRemoteCampaigns(library.campaigns??[]);
    }catch{
      setData({authenticated:false,signIn:"/signin-with-chatgpt?return_to=%2F%3Faccount%3D1"});
    }
    setDeviceCampaigns(localCampaigns());
  },[]);

  useEffect(()=>{void load()},[load]);

  const campaigns=useMemo(()=>{
    const merged=new Map<string,CampaignRecord>();
    deviceCampaigns.forEach(campaign=>merged.set(campaign.id,{...campaign,editable:true}));
    remoteCampaigns.forEach(campaign=>merged.set(campaign.id,campaign));
    return [...merged.values()].sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt));
  },[deviceCampaigns,remoteCampaigns]);

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

  const playCampaign=(campaign:CampaignRecord)=>{
    const portable=Object.fromEntries(Object.entries(campaign).filter(([key])=>key!=="ownerEmail"&&key!=="editable")) as CampaignRecord;
    const stored=localCampaigns();
    window.localStorage.setItem(CAMPAIGNS_KEY,JSON.stringify([...stored.filter(item=>item.id!==campaign.id),portable]));
    window.localStorage.setItem(ACTIVE_CAMPAIGN_KEY,JSON.stringify(portable));
    window.location.assign(`/?campaignPack=${encodeURIComponent(campaign.id)}`);
  };

  return <div className="module account-page" data-module="ACCOUNT"><header><span className="eyebrow">Command identity // social continuity</span><h1>Account</h1><p>Identity, reciprocal friendships, and campaign administration.</p></header><section className="account-window os-window"><div className="os-titlebar"><span>ACCOUNT CONTROL PANEL</span><b>{data?.authenticated?"AUTHENTICATED":"SIGN-IN REQUIRED"}</b></div><section className="module-report"><div><small>ACCOUNT</small><b>{data?.email??"NOT SIGNED IN"}</b></div><div><small>ACTIVE FRIENDS</small><b>{data?.friends?.length??0}</b></div><div><small>PENDING INVITES</small><b>{data?.pending?.length??0}</b></div><div><small>CAMPAIGNS</small><b>{campaigns.length}</b></div></section>{!data?<div className="account-loading">LOADING ACCOUNT…</div>:!data.authenticated?<section className="account-signin"><h2>Sign in to maintain friendships.</h2><p>Campaign play remains available on this device. Account identity, reciprocal friendships, and friend-shared campaigns use your ChatGPT sign-in.</p><a className="os-primary" href={data.signIn??"/signin-with-chatgpt?return_to=%2F%3Faccount%3D1"}>SIGN IN WITH CHATGPT →</a></section>:<div className="account-layout"><section className="account-credentials"><h2>Credentials</h2><label><span>EMAIL ADDRESS</span><input value={data.email??""} readOnly/><small>Verified by the connected identity provider.</small></label><label><span>PASSWORD</span><input value="••••••••••••" type="password" readOnly/><small>Managed by sign-in. DELENDA.QUEST never stores your password.</small></label><label className="account-toggle"><input type="checkbox" checked={data.allowFriends??true} disabled={busy} onChange={event=>void setAllowFriends(event.target.checked)}/><span><b>ALLOW FRIENDS</b><small>Accept reciprocal invitations and make friend-shared campaign access available.</small></span></label><a href="/signout-with-chatgpt?return_to=%2F">SIGN OUT</a></section><section className="friends-panel"><header><div><small>FRIENDS LIST // RECIPROCAL</small><h2>{data.friends?.length??0} connected</h2></div></header>{data.friends?.length?<div className="friend-list">{data.friends.map(friend=><article key={friend.email}><div><b>{friend.displayName}</b><small>{friend.email}</small></div><button disabled={busy} onClick={()=>void remove(friend.email)}>REMOVE FOR BOTH</button></article>)}</div>:<p className="account-empty">NO FRIENDS YET // INVITE SOMEONE BY EMAIL</p>}{data.pending?.length?<div className="pending-invites"><h3>PENDING REGISTRATION</h3>{data.pending.map(invitation=><span key={invitation.email}>{invitation.email}</span>)}</div>:null}<form onSubmit={invite}><label htmlFor="friend-email">INVITE FRIEND</label><div><input id="friend-email" type="email" required disabled={busy||!(data.allowFriends??true)} placeholder="friend@example.com" value={inviteEmail} onChange={event=>setInviteEmail(event.target.value)}/><button disabled={busy||!(data.allowFriends??true)}>{busy?"WORKING…":"INVITE →"}</button></div><small>The friendship is one relationship stored for both accounts. Delivery opens through your configured mail client.</small></form>{notice&&<p className="account-notice" role="status">{notice}</p>}</section></div>}
      <section className="account-campaigns"><header><div><small>MY CAMPAIGNS // OWNED + FRIEND-SHARED</small><h2>{campaigns.length} available</h2></div><Link href="/campaign-editor?mode=import">UPLOAD CAMPAIGN</Link></header>{campaigns.length?<div>{campaigns.map(campaign=><article key={campaign.id}><div><small>{campaign.ownerEmail&&campaign.ownerEmail!==data?.email?`SHARED BY ${campaign.ownerEmail}`:campaign.access==="friends"?"SHARED WITH FRIENDS":"PRIVATE"}</small><b>{campaign.title}</b><span>{campaign.entries?.length??0} campaign records // updated {new Date(campaign.updatedAt).toLocaleDateString()}</span></div><button onClick={()=>playCampaign(campaign)}>PLAY</button>{campaign.editable!==false?<Link href={`/campaign-editor?id=${encodeURIComponent(campaign.id)}`}>EDIT</Link>:<Link href={`/campaign-editor?id=${encodeURIComponent(campaign.id)}`}>INSPECT / COPY</Link>}</article>)}</div>:<p className="account-empty">NO AUTHORED CAMPAIGNS // CREATE OR UPLOAD A PORTABLE CAMPAIGN</p>}</section>
      <footer className="account-actions"><div><b>CAMPAIGN ADMINISTRATION</b><small>Owned campaigns sync when signed in; portable files remain yours.</small></div><Link href="/campaign-editor">CAMPAIGN EDITOR</Link><Link href="/campaign-editor?mode=import">IMPORT CAMPAIGN</Link><button onClick={onNewCampaign}>NEW CAMPAIGN →</button></footer></section></div>;
}
