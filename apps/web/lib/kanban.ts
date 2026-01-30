import fs from "fs/promises";
import path from "path";
import { Artifact, Stage } from "./store";

export type KanbanCard = {
  // base artifact id
  baseId: string;
  // unique per stage card
  id: string;
  stage: Stage;
  title: string;
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

export async function artifactToStageCards(art: Artifact): Promise<KanbanCard[]> {
  const baseDir = artifactDir(art.id);
  const cards: KanbanCard[] = [];

  for (const stage of STAGES) {
    const p = path.join(baseDir, `${stage}.md`);
    const md = await readIfExists(p);
    if (!md) continue;

    cards.push({
      baseId: art.id,
      id: `${art.id}:${stage}`,
      stage,
      title: art.title,
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
