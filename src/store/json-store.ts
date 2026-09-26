import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error: unknown) {
    const code = error && typeof error === "object" && "code" in error
      ? (error as { code?: string }).code
      : undefined;
    if (code === "ENOENT") return fallback;
    throw error;
  }
}

export async function writeJson<T>(path: string, value: T): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}
