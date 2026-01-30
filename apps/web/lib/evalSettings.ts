import fs from "fs/promises";
import path from "path";

export type EvalWeights = {
  structure: number;
  specificity: number;
  humanizer: number;
  medicalLegal: number;
  seo: number;
};

export type EvalSettings = {
  enabled: boolean;
  weights: EvalWeights;
  notes: string;
};

const DEFAULTS: EvalSettings = {
  enabled: true,
  weights: {
    structure: 25,
    specificity: 20,
    humanizer: 15,
    medicalLegal: 25,
    seo: 15,
  },
  notes:
    "구조(공감→정보→실천), 구체성(수치/비유), Humanizer(리듬/대화체), Medical/Legal, SEO 자연스러움 기준으로 평가",
};

function repoRoot() {
  return path.resolve(process.cwd(), "../..");
}

function settingsPath() {
  return path.join(repoRoot(), "data", "settings", "eval.json");
}

export async function readEvalSettings(): Promise<EvalSettings> {
  const p = settingsPath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  try {
    const raw = await fs.readFile(p, "utf-8");
    const v = JSON.parse(raw);
    const w = v.weights || {};
    return {
      ...DEFAULTS,
      ...v,
      enabled: v.enabled !== false,
      weights: {
        structure: Number(w.structure ?? DEFAULTS.weights.structure),
        specificity: Number(w.specificity ?? DEFAULTS.weights.specificity),
        humanizer: Number(w.humanizer ?? DEFAULTS.weights.humanizer),
        medicalLegal: Number(w.medicalLegal ?? DEFAULTS.weights.medicalLegal),
        seo: Number(w.seo ?? DEFAULTS.weights.seo),
      },
    };
  } catch {
    await fs.writeFile(p, JSON.stringify(DEFAULTS, null, 2), "utf-8");
    return DEFAULTS;
  }
}

export async function writeEvalSettings(value: EvalSettings) {
  const p = settingsPath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(value, null, 2), "utf-8");
}
