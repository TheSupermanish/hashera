// Loads the optional on-chain deployment record (server/deployment.json),
// written by the contracts deploy script. Absent in a chain-less dev run, so
// every caller treats null as "no on-chain path configured".

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Deployment } from "../types";

let cached: Deployment | null | undefined;

export function loadDeployment(): Deployment | null {
  if (cached !== undefined) return cached;
  try {
    const path = fileURLToPath(new URL("../deployment.json", import.meta.url));
    cached = JSON.parse(readFileSync(path, "utf8")) as Deployment;
  } catch {
    cached = null;
  }
  return cached;
}
