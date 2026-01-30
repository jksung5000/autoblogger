import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export type Stage =
  | "topic"
  | "outline"
  | "draft"
  | "review"
  | "eval"
  | "ready"
  | "naver"
  | "published";
export type SeedType = "tennis" | "weights" | "cases" | "custom";

export interface Artifact {
  id: string;
  stage: Stage;
  title: string;
  seedType: SeedType;
  bodyMarkdown: string;
  createdAt: string;
  updatedAt: string;

  // loop/visual hints (MVP)
  running?: boolean;
  loopCount?: number;

  // Eval
  evalScore?: number | null;
  evalBreakdown?: {
    structure?: number;
    specificity?: number;
    humanizer?: number;
    medicalLegal?: number;
    seo?: number;
  } | null;
  evalReasons?: string[];
  evalFixes?: string[];
}

type StoreShape = {
  artifacts: Record<string, Artifact>;
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

function artifactDir(id: string) {
  return path.join(repoRoot(), "data", "artifacts", id);
}

function stageFile(id: string, stage: Stage) {
  return path.join(artifactDir(id), `${stage}.md`);
}

async function persistStageFile(art: Artifact) {
  const dir = artifactDir(art.id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(stageFile(art.id, art.stage), art.bodyMarkdown || "", "utf-8");
  // keep a convenient entry point for "개인 기록" usage
  // only update when we're at topic stage (avoid overwriting with draft/review/etc)
  if (art.stage === "topic") {
    await fs.writeFile(path.join(dir, "topic.mf.md"), art.bodyMarkdown || "", "utf-8");
  }
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
    running: false,
    loopCount: 0,
    evalScore: null,
  };
  s.artifacts[id] = art;
  await writeStore(s);
  await persistStageFile(art);
  return art;
}

export async function updateArtifact(
  id: string,
  patch: Partial<Pick<Artifact, "title" | "bodyMarkdown" | "stage" | "running" | "loopCount" | "evalScore" | "evalBreakdown" | "evalReasons" | "evalFixes">>
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
    running: patch.running ?? art.running,
    loopCount: patch.loopCount ?? art.loopCount,
    evalScore: patch.evalScore ?? art.evalScore,
    evalBreakdown: patch.evalBreakdown ?? art.evalBreakdown,
    evalReasons: patch.evalReasons ?? art.evalReasons,
    evalFixes: patch.evalFixes ?? art.evalFixes,
    updatedAt: now,
  };
  await writeStore(s);
  await persistStageFile(s.artifacts[id]);
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

  // visual hint: "loop is running"
  await updateArtifact(id, { running: true });

  let to = nextStage(art.stage);

  // MVP loop rule: eval score < 70 => back to topic
  if (to === "eval") {
    const score = Math.floor(50 + Math.random() * 50); // 50~99
    const nextBody = generatePlaceholder(art, to);
    await updateArtifact(id, { stage: to, bodyMarkdown: nextBody, evalScore: score });

    if (score < 70) {
      const looped = (art.loopCount || 0) + 1;
      const backBody = `# ${art.title}\n\n(Eval 점수 미달: ${score}점)\n\n보완 포인트를 반영해 Topic부터 다시 시작합니다.\n`;
      await updateArtifact(id, { stage: "topic", bodyMarkdown: backBody, loopCount: looped });
      to = "topic";
    }

    await updateArtifact(id, { running: false });
    return getArtifact(id);
  }

  const generated = generatePlaceholder(art, to);
  const updated = await updateArtifact(id, { stage: to, bodyMarkdown: generated, running: false });
  return updated;
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
    case "review":
      return (
        header +
        "## Review(사람 검토)\n" +
        "- 과장/단정 표현 제거\n" +
        "- 독자 관점에서 헷갈리는 부분 표시\n" +
        "- 근거/예시 추가 필요 여부 체크\n"
      );
    case "eval":
      return (
        header +
        "## Eval(자동 체크)\n" +
        "- 가독성/구조/리스크 점수\n" +
        "- 미달이면 loop\n"
      );
    case "ready":
      return (
        header +
        "(Ready 후보 — 검증/이미지/네이버 HTML export는 다음 단계에서 연결)\n\n" +
        art.bodyMarkdown
      );
    case "naver":
      return (
        header +
        "(Naver 패키지 — MVP에서는 파일 생성 대신 placeholder로 표시)\n\n" +
        "- naver_full.html\n- naver_body.html\n- hashtags.txt\n"
      );
    case "published":
      return header + "(Published — 자동 업로드는 추후)\n";
    default:
      return art.bodyMarkdown;
  }
}
