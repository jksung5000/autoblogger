import fs from "fs/promises";
import path from "path";

export type PipelineSettings = {
  enabled: boolean;
  maxLoops: number; // default 5
  minScore: number; // default 70
};

const DEFAULTS: PipelineSettings = {
  enabled: true,
  maxLoops: 5,
  minScore: 70,
};

function repoRoot() {
  return path.resolve(process.cwd(), "../..");
}

function settingsPath() {
  return path.join(repoRoot(), "data", "settings", "pipeline.json");
}

export async function readPipelineSettings(): Promise<PipelineSettings> {
  const p = settingsPath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  try {
    const raw = await fs.readFile(p, "utf-8");
    const v = JSON.parse(raw);
    return {
      ...DEFAULTS,
      ...v,
      maxLoops: Math.max(0, Math.min(50, Number(v.maxLoops ?? DEFAULTS.maxLoops))),
      minScore: Math.max(0, Math.min(100, Number(v.minScore ?? DEFAULTS.minScore))),
      enabled: v.enabled !== false,
    };
  } catch {
    await fs.writeFile(p, JSON.stringify(DEFAULTS, null, 2), "utf-8");
    return DEFAULTS;
  }
}

export async function writePipelineSettings(value: PipelineSettings) {
  const p = settingsPath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(value, null, 2), "utf-8");
}
