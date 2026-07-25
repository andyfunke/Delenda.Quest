import GameClient from "../GameClient";
import { requireChatGPTUser } from "../chatgpt-auth";

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
  await requireChatGPTUser(returnTo);
  return <GameClient />;
}

export default async function GamePage({ searchParams }: GamePageProps) {
  const values = await searchParams;
  return <AuthenticatedGame returnTo={returnPath(values)} />;
}
