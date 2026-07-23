"use client";
import { FormEvent, useEffect, useRef, useState } from "react";

type Target={x:number;y:number;route:string;elementKey:string;elementText:string;gridX:number;gridY:number};
const elementKey=(element:HTMLElement)=>{
  const path: string[]=[];let node:HTMLElement|null=element;
  while(node&&path.length<4){
    const stable=node.dataset.telemetry||node.dataset.semantic||node.id;
    path.unshift(stable?`${node.tagName.toLowerCase()}[${stable}]`:node.tagName.toLowerCase());
    node=node.parentElement;
  }
  return path.join(">");
};

export function BugReporter({module,interfaceMode}:{module:string;interfaceMode:"command"|"briefing"}){
  const[menu,setMenu]=useState<Target|null>(null),[reporting,setReporting]=useState<Target|null>(null),[text,setText]=useState(""),[sending,setSending]=useState(false);
  const textarea=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>{
    const open=(event:MouseEvent)=>{
      if(event.shiftKey)return;
      event.preventDefault();
      const element=(event.target as Element|null)?.closest<HTMLElement>("*")??document.body;
      setMenu({x:event.clientX,y:event.clientY,route:location.pathname+location.search,elementKey:elementKey(element),elementText:(element.innerText||element.getAttribute("aria-label")||"").trim().replace(/\s+/g," ").slice(0,240),gridX:Math.min(9,Math.floor(event.clientX/Math.max(1,innerWidth)*10)),gridY:Math.min(9,Math.floor(event.clientY/Math.max(1,innerHeight)*10))});
    };
    const close=()=>setMenu(null);
    document.addEventListener("contextmenu",open);document.addEventListener("click",close);
    return()=>{document.removeEventListener("contextmenu",open);document.removeEventListener("click",close)};
  },[]);
  useEffect(()=>{if(reporting)textarea.current?.focus()},[reporting]);
  const close=()=>{if(sending)return;setReporting(null);setText("")};
  const send=async(event:FormEvent)=>{
    event.preventDefault();if(!reporting||!text.trim())return;setSending(true);
    try{
      const response=await fetch("/api/bug-reports",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...reporting,module,interfaceMode,reportText:text})});
      if(response.ok){setSending(false);setReporting(null);setText("");return}
    }finally{setSending(false)}
  };
  return <>
    {menu&&<button className="bug-context-item" style={{left:Math.min(menu.x,innerWidth-220),top:Math.min(menu.y,innerHeight-44)}} onClick={event=>{event.stopPropagation();setReporting(menu);setMenu(null)}}>SUBMIT BUG REPORT</button>}
    {reporting&&<div className="bug-report-scrim" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}><form className="bug-report-box" onSubmit={send}><textarea ref={textarea} value={text} onChange={event=>setText(event.target.value)} aria-label="Bug report" /><div><button type="submit" disabled={sending||!text.trim()}>Send</button><button type="button" disabled={sending} onClick={close}>Cancel</button></div></form></div>}
  </>;
}
