import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export type Stage = "topic" | "outline" | "draft" | "ready" | "published";
export type SeedType = "tennis" | "weights" | "cases" | "custom";

export interface Artifact {
  id: string;
  stage: Stage;
  title: string;
  seedType: SeedType;
  bodyMarkdown: string;
  createdAt: string;
  updatedAt: string;
}

type StoreShape = {
  artifacts: Record<string, Artifact>;
};

const STAGES: Stage[] = ["topic", "outline", "draft", "ready", "published"];

function repoRoot() {
  // apps/web -> repo root
  return path.resolve(process.cwd(), "../..");
}

function storePath() {
  return path.join(repoRoot(), "var", "state", "store.json");
}

async function ensureStore() {
  const p = storePath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  try {
    await fs.access(p);
  } catch {
    const init: StoreShape = { artifacts: {} };
    await fs.writeFile(p, JSON.stringify(init, null, 2), "utf-8");
  }
}

async function readStore(): Promise<StoreShape> {
  await ensureStore();
  const raw = await fs.readFile(storePath(), "utf-8");
  return JSON.parse(raw) as StoreShape;
}

async function writeStore(store: StoreShape) {
  await ensureStore();
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2), "utf-8");
}

export async function listArtifacts(): Promise<Artifact[]> {
  const s = await readStore();
  return Object.values(s.artifacts).sort(
    (a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt)
  );
}

export async function getArtifact(id: string): Promise<Artifact | null> {
  const s = await readStore();
  return s.artifacts[id] ?? null;
}

export async function createArtifact(input: {
  title: string;
  seedType: SeedType;
}): Promise<Artifact> {
  const s = await readStore();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const art: Artifact = {
    id,
    stage: "topic",
    title: input.title || "Untitled",
    seedType: input.seedType,
    bodyMarkdown: `# ${input.title || "Untitled"}\n\n(Topic card 초안)\n`,
    createdAt: now,
    updatedAt: now,
  };
  s.artifacts[id] = art;
  await writeStore(s);
  return art;
}

export async function updateArtifact(
  id: string,
  patch: Partial<Pick<Artifact, "title" | "bodyMarkdown" | "stage">>
): Promise<Artifact | null> {
  const s = await readStore();
  const art = s.artifacts[id];
  if (!art) return null;
  const now = new Date().toISOString();
  s.artifacts[id] = {
    ...art,
    ...patch,
    title: patch.title ?? art.title,
    bodyMarkdown: patch.bodyMarkdown ?? art.bodyMarkdown,
    stage: (patch.stage as any) ?? art.stage,
    updatedAt: now,
  };
  await writeStore(s);
  return s.artifacts[id];
}

function nextStage(stage: Stage): Stage {
  const idx = STAGES.indexOf(stage);
  if (idx < 0) return "topic";
  return STAGES[Math.min(idx + 1, STAGES.length - 1)];
}

export async function advanceArtifactStage(id: string): Promise<Artifact | null> {
  const art = await getArtifact(id);
  if (!art) return null;

  const to = nextStage(art.stage);
  const generated = generatePlaceholder(art, to);
  return updateArtifact(id, { stage: to, bodyMarkdown: generated });
}

function generatePlaceholder(art: Artifact, to: Stage): string {
  const header = `# ${art.title}\n\n`;

  switch (to) {
    case "outline":
      return (
        header +
        "## 아웃라인(초안)\n" +
        "- 도입: 공감/문제 제기\n" +
        "- 본문: 핵심 개념 3가지\n" +
        "- 마무리: 실천 가이드(체크리스트)\n"
      );
    case "draft":
      return (
        header +
        "## 도입\n" +
        "요즘 이런 상황, 한 번쯤 겪으셨을 겁니다.\n\n" +
        "## 본문\n" +
        "(여기에 설명을 채웁니다 — 이후 LLM/레퍼런스로 강화)\n\n" +
        "## 마무리\n" +
        "오늘부터 할 수 있는 3가지 체크리스트로 정리합니다.\n"
      );
    case "ready":
      return (
        header +
        "(Ready 후보 — 검증/이미지/네이버 HTML export는 다음 단계에서 연결)\n\n" +
        art.bodyMarkdown +
        "\n\n---\n" +
        "출처: Wikimedia Commons · (라이선스)\n"
      );
    case "published":
      return header + "(Published — MVP에서는 파일 export까지만, 자동 업로드는 추후)\n";
    default:
      return art.bodyMarkdown;
  }
}
