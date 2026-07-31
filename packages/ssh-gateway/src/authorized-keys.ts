import { authorizeRemoteKey, readGatewayConfig } from "./remote-store";

const [algorithm,keyData]=process.argv.slice(2);
const validAlgorithm=typeof algorithm==="string"&&/^(ssh-ed25519|ecdsa-sha2-nistp256|ssh-rsa)$/.test(algorithm);
const validKey=typeof keyData==="string"&&/^[A-Za-z0-9+/]+={0,2}$/.test(keyData);

if(validAlgorithm&&validKey){
  try{
    const config=await readGatewayConfig();
    const credential=await authorizeRemoteKey(config,algorithm,keyData);
    const player=Buffer.from(credential.playerId,"utf8").toString("base64url");
    const id=credential.credentialId.replace(/[^a-zA-Z0-9._:-]/g,"");
    if(player&&id){
      const command=`node /app/packages/ssh-gateway/dist/session.mjs --player ${player} --credential ${id}`;
      process.stdout.write(`command="${command}",no-agent-forwarding,no-port-forwarding,no-X11-forwarding,no-user-rc ${algorithm} ${keyData}\n`);
    }
  }catch{
    // OpenSSH treats empty output as an authorization miss. Do not disclose why.
  }
}
