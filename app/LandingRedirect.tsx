"use client";

import { useEffect } from "react";

const gameQueryKeys = [
  "account",
  "challenge",
  "seed",
  "standalone",
  "wiki",
];

export function LandingRedirect() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!gameQueryKeys.some((key) => params.has(key))) return;
    window.location.replace(`/game${window.location.search}${window.location.hash}`);
  }, []);

  return null;
}
