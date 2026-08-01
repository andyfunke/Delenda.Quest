import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const OPERATIONS = new Set([
  "search",
  "maps",
  "photos",
  "open",
  "cite",
  "save",
  "analog",
]);

type LocRecord = {
  id?: string;
  title?: string;
  date?: string;
  contributor?: string[];
  description?: string[] | string;
  url?: string;
};

const bounded = (value: string, maximum: number) =>
  value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maximum);

const recordText = (record: LocRecord, index: number) => {
  const description = Array.isArray(record.description)
    ? record.description[0]
    : record.description;
  return [
    `${index + 1}. ${bounded(record.title ?? "Untitled record", 240)}`,
    record.date ? `DATE: ${bounded(record.date, 80)}` : "",
    record.contributor?.length
      ? `CONTRIBUTOR: ${bounded(record.contributor.slice(0, 3).join(", "), 240)}`
      : "",
    description ? `NOTE: ${bounded(description, 360)}` : "",
    record.url ? `SOURCE: ${bounded(record.url, 500)}` : "",
    record.id ? `RECORD: ${bounded(record.id, 500)}` : "",
  ].filter(Boolean).join("\n");
};

export async function GET(request: NextRequest) {
  const operation = bounded(request.nextUrl.searchParams.get("operation") ?? "", 16).toLowerCase();
  const query = bounded(request.nextUrl.searchParams.get("query") ?? "", 180);
  if (!OPERATIONS.has(operation) || !query)
    return NextResponse.json({ error: "invalid archive request" }, { status: 400 });

  const collection = operation === "maps" ? "maps" : operation === "photos" ? "photos" : "search";
  const endpoint = new URL(`https://www.loc.gov/${collection}/`);
  endpoint.searchParams.set("fo", "json");
  endpoint.searchParams.set("c", "5");
  endpoint.searchParams.set("q", query);

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: 3600, cacheEverything: true },
    } as RequestInit);
    if (!response.ok)
      return NextResponse.json({ error: "archive upstream unavailable" }, { status: 502 });
    const body = await response.json() as { results?: LocRecord[] };
    const records = (body.results ?? []).slice(0, 5);
    const text = records.length
      ? [
          `LIBRARY OF CONGRESS // ${operation.toUpperCase()} // ${query}`,
          "READ ONLY PRIMARY-SOURCE CATALOG RESULTS",
          "",
          ...records.map(recordText),
        ].join("\n\n")
      : `LIBRARY OF CONGRESS // ${operation.toUpperCase()} // ${query}\nNO CATALOG RESULTS`;
    return NextResponse.json(
      { source: "Library of Congress", operation, query, records, text },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } },
    );
  } catch {
    return NextResponse.json({ error: "archive request failed safely" }, { status: 502 });
  }
}
