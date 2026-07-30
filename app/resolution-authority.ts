export type ResolutionGrantAuthorityFact={
  id:string;
  ownerEmail:string;
  accountDayKey:string;
  expiresAt:number;
  consumedAt:number|null;
  invalidatedAt:number|null;
};

export const persistedResolutionGrantId=(value:unknown)=>
  typeof value==="string"&&/^[a-zA-Z0-9-]{16,80}$/.test(value)
    ?value
    :"";

export const resolutionGrantAuthorityIssue=(
  grant:ResolutionGrantAuthorityFact|null|undefined,
  input:{
    grantId:string;
    ownerEmail:string;
    accountDayKey:string;
    now:number;
  },
)=>{
  if(!grant||grant.id!==input.grantId)return"GRANT_ABSENT";
  if(grant.ownerEmail!==input.ownerEmail)return"GRANT_OWNER_MISMATCH";
  if(grant.accountDayKey!==input.accountDayKey)return"GRANT_DAY_MISMATCH";
  if(grant.consumedAt!==null)return"GRANT_REPLAYED";
  if(grant.invalidatedAt!==null)return"GRANT_INVALIDATED";
  if(grant.expiresAt<=input.now)return"GRANT_EXPIRED";
  return null;
};

export const resolutionAdvanceBelongsToGrant=(
  campaign:{
    campaignId:string;
    revision:number;
    lastResolutionGrantMarker:string|null;
  }|null|undefined,
  grant:{
    marker:string;
    campaignId:string;
    campaignRevision:number;
  },
)=>
  !!campaign&&
  campaign.campaignId===grant.campaignId&&
  campaign.revision===grant.campaignRevision+1&&
  campaign.lastResolutionGrantMarker===grant.marker;
