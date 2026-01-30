import fs from "fs/promises";
import path from "path";

const STAGES = [
  "system",
  "topic",
  "outline",
  "draft",
  "review",
  "eval",
  "ready",
  "naver",
  "published",
] as const;

function repoRoot() {
  return path.resolve(process.cwd(), "../..");
}

function promptPath(stage: string) {
  return path.join(repoRoot(), "data", "prompts", `${stage}.md`);
}

export async function ensurePrompts() {
  const dir = path.join(repoRoot(), "data", "prompts");
  await fs.mkdir(dir, { recursive: true });

  await Promise.all(
    STAGES.map(async (s) => {
      const p = promptPath(s);
      try {
        await fs.access(p);
      } catch {
        await fs.writeFile(
          p,
          `# ${s} prompt\n\n(여기에 ${s} 단계 전달 프롬프트를 작성합니다.)\n`,
          "utf-8"
        );
      }
    })
  );
}

export async function readPrompt(stage: string) {
  await ensurePrompts();
  const normalized = STAGES.includes(stage as any) ? stage : "topic";
  return fs.readFile(promptPath(normalized), "utf-8");
}
