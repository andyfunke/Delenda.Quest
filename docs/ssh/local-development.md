# SSH local development

## In-process server (current)

```ts
import { initialState } from "../../app/game";
import { DelendaSshServer } from "../../packages/ssh-server/src";

const campaigns = new Map();
const server = new DelendaSshServer({
  loadCampaign: (playerId) => campaigns.get(playerId) ?? initialState(),
  saveCampaign: (playerId, state) => campaigns.set(playerId, state),
});

const key = server.store.addKey({
  id: "key-1",
  playerId: "player@example.com",
  label: "laptop",
  algorithm: "ssh-ed25519",
  publicKey: "ssh-ed25519 AAAA... local-dev",
});

const auth = server.authenticate(key.publicKey);
const opened = server.openSession({
  playerId: key.playerId,
  credentialId: key.id,
  interactive: true,
});
const result = server.handleLine(opened.sessionId, "brief");
console.log(result.text);
```

## Native gateway test

```bash
bash scripts/test-substrate.sh
docker build --file packages/ssh-gateway/Dockerfile --tag delenda-ssh-gateway:test .
bash scripts/test-native-ssh-gateway.sh delenda-ssh-gateway:test
```

The substrate suite validates internal structured cognitive evidence and
failure redaction. The container test performs a real local OpenSSH handshake
and asserts canonical Ava text through the gateway API fixture. The internal
attestation object is not rendered to the SSH client.

## Production

The checked-in Fly deployment and `ssh.delenda.quest` listener are documented
in `docs/ssh/deployment.md`. Relevant `main` pushes run both contracts before
deploying and then check the live port 22 listener.

## Deferred distribution

- Homebrew / store packaging
