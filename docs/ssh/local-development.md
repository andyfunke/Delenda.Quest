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

## Tests

```bash
bash scripts/test-substrate.sh
```

## Deferred

- Binding `ssh.delenda.quest` and production TCP listener
- Account page UI for key fingerprints (data layer exists)
- Homebrew / store packaging
