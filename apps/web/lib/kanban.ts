import fs from "fs/promises";
import path from "path";
import { Artifact, Stage } from "./store";

export type KanbanCard = {
  // base artifact id
  baseId: string;
  // unique per stage card
  id: string;
  stage: Stage;

  // display
  baseTitle: string;
  cardTitle: string;
  snippet: string;

  seedType: Artifact["seedType"];
  bodyMarkdown: string;
  updatedAt: string;

  // status/eval
  running?: boolean;
  loopCount?: number;
  evalScore?: number | null;
  evalBreakdown?: Artifact["evalBreakdown"];
  evalReasons?: string[];
  evalFixes?: string[];
};

const STAGES: Stage[] = [
  "topic",
  "outline",
  "draft",
  "review",
  "eval",
  "ready",
  "naver",
  "published",
];

function repoRoot() {
  return path.resolve(process.cwd(), "../..");
}

function artifactDir(baseId: string) {
  return path.join(repoRoot(), "data", "artifacts", baseId);
}

async function readIfExists(p: string) {
  try {
    return await fs.readFile(p, "utf-8");
  } catch {
    return null;
  }
}

async function mtimeIso(p: string) {
  try {
    const st = await fs.stat(p);
    return st.mtime.toISOString();
  } catch {
    return new Date(0).toISOString();
  }
}

function firstMeaningfulLine(md: string) {
  const lines = md.split(/\r?\n/).map((l) => l.trim());
  for (const l of lines) {
    if (!l) continue;
    if (l.startsWith("#")) continue;
    if (l.startsWith("-")) return l.replace(/^[-*]\s+/, "");
    return l;
  }
  return "";
}

function stageLabel(stage: Stage) {
  switch (stage) {
    case "topic":
      return "Topic";
    case "outline":
      return "Outline";
    case "draft":
      return "Draft";
    case "review":
      return "Review";
    case "eval":
      return "Eval";
    case "ready":
      return "Ready";
    case "naver":
      return "Naver";
    case "published":
      return "Published";
  }
}

export async function artifactToStageCards(art: Artifact): Promise<KanbanCard[]> {
  const baseDir = artifactDir(art.id);
  const cards: KanbanCard[] = [];

  for (const stage of STAGES) {
    const p = path.join(baseDir, `${stage}.md`);
    const md = await readIfExists(p);
    if (!md) continue;

    const label = stageLabel(stage);
    const extra =
      stage === "eval" && art.evalScore != null
        ? ` · score ${art.evalScore}`
        : stage === "draft" && art.loopCount
          ? ` · v${art.loopCount}`
          : "";

    const snippetRaw = firstMeaningfulLine(md);
    const snippet = snippetRaw.length > 120 ? snippetRaw.slice(0, 120) + "…" : snippetRaw;

    cards.push({
      baseId: art.id,
      id: `${art.id}:${stage}`,
      stage,
      baseTitle: art.title,
      cardTitle: `${label}${extra}`,
      snippet,
      seedType: art.seedType,
      bodyMarkdown: md,
      updatedAt: await mtimeIso(p),
      running: art.running,
      loopCount: art.loopCount,
      evalScore: art.evalScore,
      evalBreakdown: art.evalBreakdown,
      evalReasons: art.evalReasons,
      evalFixes: art.evalFixes,
    });
  }

  return cards;
}
