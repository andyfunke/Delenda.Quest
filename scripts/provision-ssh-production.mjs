import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const railwayToken = process.env.RAILWAY_API_TOKEN ?? "";
const cloudflareToken = process.env.CLOUDFLARE_API_TOKEN ?? "";
const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const projectName = process.env.RAILWAY_PROJECT_NAME ?? "Delenda Quest SSH";
const serviceName = process.env.RAILWAY_SERVICE_NAME ?? "delenda-ssh";
const zoneName = process.env.CLOUDFLARE_ZONE_NAME ?? "delenda.quest";
const sshHostname = process.env.SSH_PUBLIC_HOST ?? `ssh.${zoneName}`;
const authorityUrl = process.env.SSH_AUTHORITY_URL ?? `https://${zoneName}`;
const railwayEndpoint = "https://backboard.railway.com/graphql/v2";
const cloudflareEndpoint = "https://api.cloudflare.com/client/v4";

for (const [name, value] of Object.entries({ RAILWAY_API_TOKEN: railwayToken, CLOUDFLARE_API_TOKEN: cloudflareToken, CLOUDFLARE_ACCOUNT_ID: cloudflareAccountId })) {
  if (!value) throw new Error(`${name} is required for autonomous SSH production activation.`);
}

const command = (file, args, options = {}) => execFileSync(file, args, { encoding: "utf8", stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit", env: { ...process.env, RAILWAY_API_TOKEN: railwayToken, CLOUDFLARE_API_TOKEN: cloudflareToken, CLOUDFLARE_ACCOUNT_ID: cloudflareAccountId }, ...options });

async function railway(query, variables = {}) {
  const response = await fetch(railwayEndpoint, { method: "POST", headers: { authorization: `Bearer ${railwayToken}`, "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length) throw new Error(`Railway API failure: ${JSON.stringify(payload.errors ?? payload)}`);
  return payload.data;
}

async function cloudflare(path, init = {}) {
  const response = await fetch(`${cloudflareEndpoint}${path}`, { ...init, headers: { authorization: `Bearer ${cloudflareToken}`, "content-type": "application/json", ...(init.headers ?? {}) } });
  const payload = await response.json();
  if (!response.ok || !payload.success) throw new Error(`Cloudflare API failure ${path}: ${JSON.stringify(payload.errors ?? payload)}`);
  return payload.result;
}

async function projectState(projectId) {
  return (await railway(`query project($id:String!){project(id:$id){id name environments{edges{node{id name}}} services{edges{node{id name}}}}}`, { id: projectId })).project;
}

function hostKeyBase64() {
  const directory = mkdtempSync(join(tmpdir(), "delenda-ssh-host-"));
  const key = join(directory, "host");
  try {
    command("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-f", key]);
    return readFileSync(key).toString("base64");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const projects = (await railway(`query{projects{edges{node{id name}}}}`)).projects.edges.map(({ node }) => node);
let project = projects.find((item) => item.name === projectName);
if (!project) project = await railway(`mutation create($input:ProjectCreateInput!){projectCreate(input:$input){id name}}`, { input: { name: projectName } }).then((data) => data.projectCreate);

let state = await projectState(project.id);
let environment = state.environments.edges.map(({ node }) => node).find((item) => item.name.toLowerCase() === "production") ?? state.environments.edges[0]?.node;
if (!environment) {
  environment = await railway(`mutation create($input:EnvironmentCreateInput!){environmentCreate(input:$input){id name}}`, { input: { projectId: project.id, name: "production" } }).then((data) => data.environmentCreate);
}
let service = state.services.edges.map(({ node }) => node).find((item) => item.name === serviceName);
if (!service) service = await railway(`mutation create($input:ServiceCreateInput!){serviceCreate(input:$input){id name}}`, { input: { projectId: project.id, name: serviceName } }).then((data) => data.serviceCreate);

const existingVariables = (await railway(`query variables($projectId:String!,$environmentId:String!,$serviceId:String){variables(projectId:$projectId,environmentId:$environmentId,serviceId:$serviceId)}`, { projectId: project.id, environmentId: environment.id, serviceId: service.id })).variables ?? {};
const authoritySecret = existingVariables.SSH_AUTHORITY_SECRET || randomBytes(48).toString("base64url");
const hostKey = existingVariables.SSH_HOST_KEY_BASE64 || hostKeyBase64();
const riskSalt = existingVariables.SSH_REMOTE_RISK_SALT || randomBytes(32).toString("base64url");
await railway(`mutation upsert($input:VariableCollectionUpsertInput!){variableCollectionUpsert(input:$input)}`, { input: { projectId: project.id, environmentId: environment.id, serviceId: service.id, variables: { PORT: "2222", RAILWAY_DOCKERFILE_PATH: "Dockerfile.ssh", REQUIRE_STABLE_HOST_KEY: "1", SSH_AUTHORITY_URL: authorityUrl, SSH_AUTHORITY_SECRET: authoritySecret, SSH_HOST_KEY_BASE64: hostKey, SSH_REMOTE_RISK_SALT: riskSalt } } });

let proxies = (await railway(`query proxies($serviceId:String!,$environmentId:String!){tcpProxies(serviceId:$serviceId,environmentId:$environmentId){id domain proxyPort applicationPort}}`, { serviceId: service.id, environmentId: environment.id })).tcpProxies;
let proxy = proxies.find((item) => item.applicationPort === 2222);
if (!proxy) proxy = await railway(`mutation create($input:TCPProxyCreateInput!){tcpProxyCreate(input:$input){id domain proxyPort applicationPort}}`, { input: { serviceId: service.id, environmentId: environment.id, applicationPort: 2222 } }).then((data) => data.tcpProxyCreate);

command("npx", ["-y", "@railway/cli@4.65.0", "up", "--project", project.id, "--environment", environment.id, "--service", service.id, "--detach", "--json"]);

command("npm", ["run", "build"]);
command("npx", ["wrangler", "d1", "migrations", "apply", "delenda-quest", "--remote", "--config", "wrangler.jsonc", "--yes"]);
command("npx", ["wrangler", "deploy", "--config", "dist/server/wrangler.json"]);
const secretResult = spawnSync("npx", ["wrangler", "secret", "put", "SSH_AUTHORITY_SECRET", "--config", "dist/server/wrangler.json"], { input: `${authoritySecret}\n`, encoding: "utf8", stdio: ["pipe", "inherit", "inherit"], env: { ...process.env, CLOUDFLARE_API_TOKEN: cloudflareToken, CLOUDFLARE_ACCOUNT_ID: cloudflareAccountId } });
if (secretResult.status !== 0) throw new Error("Could not synchronize the SSH authority secret to Cloudflare.");

const zones = await cloudflare(`/zones?name=${encodeURIComponent(zoneName)}&account.id=${encodeURIComponent(cloudflareAccountId)}`);
const zone = zones[0];
if (!zone) throw new Error(`Cloudflare zone ${zoneName} is not visible to the deployment credential.`);
const spectrumBody = { dns: { type: "CNAME", name: sshHostname }, protocol: "tcp/22", origin_dns: { name: proxy.domain, ttl: 1200 }, origin_port: proxy.proxyPort, proxy_protocol: "off", tls: "off", ip_firewall: false };
const spectrumApps = await cloudflare(`/zones/${zone.id}/spectrum/apps`);
const currentApp = spectrumApps.find((item) => item.dns?.name === sshHostname && item.protocol === "tcp/22");
if (currentApp) await cloudflare(`/zones/${zone.id}/spectrum/apps/${currentApp.id}`, { method: "PUT", body: JSON.stringify(spectrumBody) });
else await cloudflare(`/zones/${zone.id}/spectrum/apps`, { method: "POST", body: JSON.stringify(spectrumBody) });

let reachable = false;
for (let attempt = 0; attempt < 30; attempt++) {
  const result = spawnSync("ssh-keyscan", ["-T", "3", "-p", "22", sshHostname], { encoding: "utf8" });
  if (result.status === 0 && result.stdout.includes("ssh-ed25519")) { reachable = true; break; }
  await new Promise((resolve) => setTimeout(resolve, 10_000));
}
if (!reachable) throw new Error(`Native SSH did not become reachable at ${sshHostname}:22.`);

console.log(JSON.stringify({ ok: true, projectId: project.id, environmentId: environment.id, serviceId: service.id, railwayOrigin: `${proxy.domain}:${proxy.proxyPort}`, publicEndpoint: `${sshHostname}:22` }, null, 2));
