import { redirect } from "next/navigation";

type RootPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RootPage({ searchParams }: RootPageProps) {
  const values = await searchParams;
  const params = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(values)) {
    for (const value of Array.isArray(rawValue) ? rawValue : [rawValue])
      if (typeof value === "string") params.append(key, value);
  }

  const query = params.toString();
  redirect(`/game${query ? `?${query}` : ""}`);
}
