const encoder=new TextEncoder();
const MAX_CLOCK_SKEW_MS=60_000;

const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,"0")).join("");
const validRequestId=(value:string)=>/^[A-Za-z0-9._:-]{12,120}$/.test(value);

export async function signSshAuthorityRequest(secret:string,timestamp:string,requestId:string,body:string){
  const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return hex(await crypto.subtle.sign("HMAC",key,encoder.encode(`${timestamp}.${requestId}.${body}`)));
}

export async function verifySshAuthorityRequest(input:{secret:string;timestamp:string;requestId:string;body:string;signature:string;now?:number}){
  if(input.secret.length<32||!validRequestId(input.requestId)||!/^[0-9]{10,16}$/.test(input.timestamp)||!/^[a-f0-9]{64}$/i.test(input.signature))return false;
  const at=Number(input.timestamp),now=input.now??Date.now();
  if(!Number.isFinite(at)||Math.abs(now-at)>MAX_CLOCK_SKEW_MS)return false;
  const expected=await signSshAuthorityRequest(input.secret,input.timestamp,input.requestId,input.body);
  const a=encoder.encode(expected.toLowerCase()),b=encoder.encode(input.signature.toLowerCase());
  if(a.length!==b.length)return false;
  let mismatch=0;
  for(let index=0;index<a.length;index++)mismatch|=a[index]^b[index];
  return mismatch===0;
}
