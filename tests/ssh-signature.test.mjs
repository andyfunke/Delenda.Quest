import assert from "node:assert/strict";
import test from "node:test";
const signatures=await import(process.env.DELENDA_SSH_SIGNATURE_BUNDLE);
const secret="signature-test-secret-0123456789abcdef";

test("SSH authority signatures authenticate exact request bytes",async()=>{
  const timestamp="1800000000000",requestId="request-1234567890",body='{"action":"open"}';
  const signature=await signatures.signSshAuthorityRequest(secret,timestamp,requestId,body);
  assert.equal(await signatures.verifySshAuthorityRequest({secret,timestamp,requestId,body,signature,now:Number(timestamp)}),true);
  assert.equal(await signatures.verifySshAuthorityRequest({secret,timestamp,requestId,body:body+" ",signature,now:Number(timestamp)}),false);
});

test("SSH authority signatures reject stale and malformed requests",async()=>{
  const timestamp="1800000000000",requestId="request-1234567890",body="{}";
  const signature=await signatures.signSshAuthorityRequest(secret,timestamp,requestId,body);
  assert.equal(await signatures.verifySshAuthorityRequest({secret,timestamp,requestId,body,signature,now:Number(timestamp)+60_001}),false);
  assert.equal(await signatures.verifySshAuthorityRequest({secret,timestamp,requestId:"bad",body,signature,now:Number(timestamp)}),false);
});
