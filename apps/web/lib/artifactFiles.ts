import fs from "fs/promises";
import path from "path";
import type { Stage } from "./store";

export function repoRoot() {
  // apps/web -> repo root
  return path.resolve(process.cwd(), "../..");
}

export function artifactDir(baseId: string) {
  return path.join(repoRoot(), "data", "artifacts", baseId);
}

export function stageFile(baseId: string, stage: Stage) {
  return path.join(artifactDir(baseId), `${stage}.md`);
}

export async function readStageMarkdown(baseId: string, stage: Stage) {
  return await fs.readFile(stageFile(baseId, stage), "utf-8");
}

export async function stageExists(baseId: string, stage: Stage) {
  try {
    await fs.access(stageFile(baseId, stage));
    return true;
  } catch {
    return false;
  }
}

export function exportsDir(baseId: string) {
  return path.join(artifactDir(baseId), "exports");
}

export function exportFile(baseId: string, name: string) {
  return path.join(exportsDir(baseId), name);
}

export async function readExportIfExists(baseId: string, name: string) {
  try {
    return await fs.readFile(exportFile(baseId, name), "utf-8");
  } catch {
    return null;
  }
}

export async function writeExport(baseId: string, name: string, content: string) {
  await fs.mkdir(exportsDir(baseId), { recursive: true });
  await fs.writeFile(exportFile(baseId, name), content, "utf-8");
}
