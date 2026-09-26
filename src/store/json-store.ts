import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

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
  const directory = dirname(path);
  await mkdir(directory, { recursive: true });
  const temporary = join(directory, `.forge-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, JSON.stringify(value, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
    await rename(temporary, path);
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}
