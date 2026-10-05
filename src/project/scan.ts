import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

export interface ProjectScan {
  root: string;
  files: number;
  manifests: string[];
  testFiles: string[];
  workflows: string[];
  deploymentConfigs: string[];
  scripts: Record<string,string>;
}

export async function scanProject(root: string): Promise<ProjectScan> {
  const manifests: string[] = [], testFiles: string[] = [], workflows: string[] = [], deploymentConfigs: string[] = [];
  let files = 0;
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if ([".git","node_modules","dist",".next","coverage"].includes(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) { await walk(full); continue; }
      files += 1;
      const p = relative(root, full).replaceAll("\\","/");
      if (/^(package\.json|pyproject\.toml|requirements.*\.txt|Cargo\.toml|go\.mod)$/.test(p)) manifests.push(p);
      if (/(^|\/)(test|tests|spec|__tests__)(\/|\.)|\.(test|spec)\.[^.]+$/i.test(p)) testFiles.push(p);
      if (p.startsWith(".github/workflows/")) workflows.push(p);
      if (/(^|\/)(vercel\.json|Dockerfile|docker-compose\.ya?ml|fly\.toml|railway\.json)$/i.test(p)) deploymentConfigs.push(p);
    }
  }
  const info = await stat(root);
  if (!info.isDirectory()) throw new Error("Project root must be a directory.");
  await walk(root);
  let scripts: Record<string,string> = {};
  try {
    const pkg = JSON.parse(await readFile(join(root,"package.json"),"utf8")) as {scripts?:Record<string,string>};
    scripts = pkg.scripts ?? {};
  } catch { /* non-Node projects are valid */ }
  return { root, files, manifests: manifests.sort(), testFiles: testFiles.sort(), workflows: workflows.sort(), deploymentConfigs: deploymentConfigs.sort(), scripts };
}
