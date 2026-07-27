import GameClient from "../GameClient";
import {
  authenticatedSignInPath,
  authenticatedSignOutPath,
  getChatGPTUser,
} from "../chatgpt-auth";

export const dynamic = "force-dynamic";

type GamePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const returnPath = (values: Record<string, string | string[] | undefined>) => {
  const params = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(values)) {
    for (const value of Array.isArray(rawValue) ? rawValue : [rawValue])
      if (typeof value === "string") params.append(key, value);
  }
  const query = params.toString();
  return `/game${query ? `?${query}` : ""}`;
};

async function AuthenticatedGame({ returnTo }: { returnTo: string }) {
  // The game surface is public: anonymous visitors get a fully playable client
  // backed by device-local saves, and a valid identity unlocks cross-device
  // sync, service records, and social play. Identity is optional here rather
  // than a hard gate.
  const user = await getChatGPTUser();
  const logoutPath = user
    ? authenticatedSignOutPath(user)
    : await authenticatedSignInPath(returnTo);
  return <GameClient logoutPath={logoutPath} signedIn={!!user} />;
}

export default async function GamePage({ searchParams }: GamePageProps) {
  const values = await searchParams;
  return <AuthenticatedGame returnTo={returnPath(values)} />;
}
