import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ProjectScan } from "./scan.js";
import type { Verification } from "./verification.js";

export interface ChangeRecord {
  id: string;
  summary: string;
  createdAt: string;
  commit?: string;
}

export interface ForgeProjectState {
  schemaVersion: 1;
  projectRoot: string;
  updatedAt: string;
  scan?: ProjectScan;
  changes: ChangeRecord[];
  verifications: Verification[];
}

export async function readProjectState(path: string): Promise<ForgeProjectState | null> {
  try {
    const raw = JSON.parse(await readFile(path, "utf8")) as ForgeProjectState;
    if (raw.schemaVersion !== 1 || !Array.isArray(raw.changes) || !Array.isArray(raw.verifications)) {
      throw new Error("Unsupported or malformed Forge project state.");
    }
    return raw;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeProjectState(path: string, state: ForgeProjectState): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temp = path + ".tmp";
  await writeFile(temp, JSON.stringify(state, null, 2) + "\n", { mode: 0o600 });
  await rename(temp, path);
}

export function initialProjectState(projectRoot: string): ForgeProjectState {
  return { schemaVersion: 1, projectRoot, updatedAt: new Date().toISOString(), changes: [], verifications: [] };
}
