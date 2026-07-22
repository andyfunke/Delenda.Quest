"use client";

import { useState } from "react";

export function RecordActions({slug,url,summary,credential}:{slug:string;url:string;summary:string;credential:{name:string;issuer:string;issueDate:string;credentialId:string}}){
  const[notice,setNotice]=useState("");
  const copy=async(value:string,message:string)=>{await navigator.clipboard.writeText(value);setNotice(message);window.setTimeout(()=>setNotice(""),1800)};
  const share=async()=>{if(navigator.share){await navigator.share({title:credential.name,text:summary,url});return}await copy(`${summary}\n${url}`,"SHARE OBJECT COPIED")};
  return <>
    <section className="record-actions" aria-label="Campaign Record actions">
      <button onClick={()=>void copy(url,"RECORD LINK COPIED")}>COPY LINK</button>
      <button onClick={()=>void copy(`${summary}\n${url}`,"RESULT OBJECT COPIED")}>COPY RESULT</button>
      <button onClick={()=>void share()}>SHARE</button>
      <a href={`/?challenge=${encodeURIComponent(slug)}`}>PLAY THIS CAMPAIGN</a>
      <button onClick={()=>window.print()}>DOWNLOAD CERTIFICATE</button>
      <button disabled title="Activation requires the DELENDA.QUEST LinkedIn Page issuer identity.">ADD TO LINKEDIN // LATENT</button>
    </section>
    {notice&&<p className="record-copy-notice" role="status">{notice}</p>}
    <section className="linkedin-shell">
      <header><small>LINKEDIN LICENSES &amp; CERTIFICATIONS SHELL</small><b>ISSUER ACTIVATION PENDING</b></header>
      <div><span>NAME</span><b>{credential.name}</b><button onClick={()=>void copy(credential.name,"CERTIFICATE NAME COPIED")}>COPY</button></div>
      <div><span>ISSUING ORGANIZATION</span><b>{credential.issuer}</b><button onClick={()=>void copy(credential.issuer,"ISSUER COPIED")}>COPY</button></div>
      <div><span>ISSUE DATE</span><b>{credential.issueDate}</b><button onClick={()=>void copy(credential.issueDate,"ISSUE DATE COPIED")}>COPY</button></div>
      <div><span>CREDENTIAL ID</span><b>{credential.credentialId}</b><button onClick={()=>void copy(credential.credentialId,"CREDENTIAL ID COPIED")}>COPY</button></div>
      <div><span>CREDENTIAL URL</span><b>{url}</b><button onClick={()=>void copy(url,"CREDENTIAL URL COPIED")}>COPY</button></div>
      <p>The credential is fully issued and verifiable here. The LinkedIn handoff remains dormant until the DELENDA.QUEST LinkedIn Page supplies the official issuer identity.</p>
    </section>
  </>;
}
