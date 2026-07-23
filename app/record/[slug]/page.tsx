import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicCampaignRecord } from "../../../db/campaign-records";
import { RecordActions } from "./RecordActions";

const host="https://delenda-quest.andrew-i-funke.chatgpt.site";
const label=(value:string)=>value.replaceAll("-"," ").replace(/\b\w/g,letter=>letter.toUpperCase());

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const{slug}=await params,record=await publicCampaignRecord(slug);if(!record)return{title:"Campaign Record Not Found // DELENDA.QUEST"};
  const title=`${record.outcome.toUpperCase()} // ${label(record.theater)} // Campaign Score ${record.campaignScore.toLocaleString()}`;
  const description=`${record.pseudonym} completed ${record.campaignId} in ${record.days} days and ranked ${record.campaignRank} of ${record.cohortSize}.`;
  return{title,description,alternates:{canonical:`${host}/record/${slug}`},openGraph:{title,description,url:`${host}/record/${slug}`,siteName:"DELENDA.QUEST",type:"article"}};
}

export default async function CampaignRecordPage({params}:{params:Promise<{slug:string}>}){
  const{slug}=await params,record=await publicCampaignRecord(slug);if(!record)notFound();
  const issueDate=new Date(record.completedAt).toLocaleDateString("en-US",{month:"long",year:"numeric"});
  const credential={name:`Campaign Command Certificate: ${record.outcome==="victory"?"Victory":"Defeat"} in ${label(record.theater)}`,issuer:"DELENDA.QUEST",issueDate,credentialId:`DQ-${record.publicSlug}`};
  const summary=`DELENDA.QUEST // ${record.campaignId}\n${record.outcome.toUpperCase()} · DAY ${record.days}\nCampaign Score: ${record.campaignScore.toLocaleString()} · Rank ${record.campaignRank}/${record.cohortSize}\nPlayer Rating: ${record.uberscore.toLocaleString()} · Global Rank ${record.globalRank}/${record.commanderCount}\n${record.forcePreserved.toFixed(1)}% Forces Preserved · ${record.front>=0?"+":""}${record.front.toFixed(1)} km`;
  return <main className="public-record">
    <header className="record-masthead"><span>DELENDA.QUEST // SANCTIONED CAMPAIGN ARTIFACT</span><b>PUBLIC RECORD {record.publicSlug}</b></header>
    <article className="record-certificate">
      <div className="record-seal">DQ</div><small>CAMPAIGN COMMAND CERTIFICATE</small>
      <h1>{record.outcome}</h1><p>{record.pseudonym} assumed command in <b>{label(record.theater)}</b> and brought Campaign Record <b>{record.campaignId}</b> to {record.outcome} on Day {record.days}.</p>
      <section className="record-scoreboard"><div><span>CAMPAIGN SCORE</span><b>{record.campaignScore.toLocaleString()}</b><small>RANK {record.campaignRank} / {record.cohortSize}</small></div><div><span>PLAYER RATING EARNED</span><b>+{record.uberscoreEarned.toLocaleString()}</b><small>{record.friendCount} FRIENDS // ×{record.friendMultiplier.toFixed(2)}</small></div><div><span>CUMULATIVE PLAYER RATING</span><b>{record.uberscore.toLocaleString()}</b><small>GLOBAL RANK {record.globalRank} / {record.commanderCount}</small></div></section>
      <section className="record-result-grid"><div><span>FORCE PRESERVED</span><b>{record.forcePreserved.toFixed(1)}%</b></div><div><span>FINAL LINE</span><b>{record.front>=0?"+":""}{record.front.toFixed(1)} KM</b></div><div><span>DURATION</span><b>{record.days} DAYS</b></div><div><span>SCORING LAW</span><b>{record.scoringVersion.toUpperCase()}</b></div></section>
      <footer><span>ISSUED {new Date(record.completedAt).toLocaleDateString()}</span><span>SIMULATION ACCOMPLISHMENT // NOT A MILITARY OR PROFESSIONAL ACCREDITATION</span></footer>
    </article>
    <RecordActions slug={record.publicSlug} url={`${host}/record/${record.publicSlug}`} summary={summary} credential={credential}/>
    <section className="decision-comparison"><header><small>END-STATE DISCLOSURE</small><h2>Your orders against the cohort</h2><p>Percentages include only commanders who encountered the same decision in the same sealed campaign. They become visible after completion and never guide an active run.</p></header>{record.decisionComparisons.length?<div>{record.decisionComparisons.map(decision=><article key={decision.decisionId}><small>{decision.decisionLabel}</small><h3>{decision.choiceLabel}</h3><p>YOUR ORDER</p><div>{decision.choices.map(choice=><span className={choice.choiceId===decision.choiceId?"selected":""} key={choice.choiceId}><b>{choice.percent}%</b>{choice.choiceLabel}<small>{choice.count} / {decision.encountered}</small></span>)}</div></article>)}</div>:<p className="record-empty">No comparable decisions were stored for this run.</p>}</section>
    <footer className="record-provenance"><div><span>CONTENT VERSION</span><b>{record.contentVersion}</b></div><div><span>CAMPAIGN ID</span><b>{record.campaignId}</b></div><div><span>ADVERSARY</span><b>{label(record.adversary)}</b></div><div><span>STATE</span><b>{label(record.archetype)}</b></div><p>This page is the canonical hosted artifact. Scores and orders are immutable. Cohort rank and decision percentages update as more commanders complete the same campaign. It contains no account identifier and no route back to the private profile.</p></footer>
  </main>;
}
