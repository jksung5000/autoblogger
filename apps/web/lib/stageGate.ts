import type { Stage } from "./store";
import { extractPlaceholders } from "./images";

export type StageCheck = { key: string; label: string; pass: boolean; note?: string };

export function evaluateStage(stage: Stage, md: string): { score: number; checks: StageCheck[] } {
  const checks: StageCheck[] = [];

  function has(re: RegExp, key: string, label: string) {
    const pass = re.test(md);
    checks.push({ key, label, pass });
    return pass;
  }

  if (stage === "topic") {
    const a = has(/##\s+1~2줄 요약/, "summary", "요약 섹션");
    const b = has(/##\s+핵심 메시지/, "thesis", "핵심 메시지 섹션");
    const c = has(/##\s+Outline/, "outline", "Outline 섹션");
    const d = has(/##\s+체크리스트/, "checklist", "체크리스트 섹션");
    const e = has(/##\s+태그/, "tags", "태그 섹션");
    const score = [a, b, c, d, e].filter(Boolean).length * 20;
    return { score, checks };
  }

  if (stage === "outline") {
    const a = has(/##\s+이미지 제안\(플레이스홀더\)/, "images", "이미지 플레이스홀더 포함");
    const b = has(/\[IMAGE: query="[^"]+"/, "ph", "[IMAGE: ...] 라인 존재");
    const c = has(/##\s+SEO/, "seo", "SEO 섹션");
    const d = has(/내부링크 정책/, "links", "내부링크 정책 명시");
    const score = [a, b, c, d].filter(Boolean).length * 25;
    return { score, checks };
  }

  if (stage === "draft") {
    const a = has(/이 글에서 얻는 것\(3가지\)/, "takeaways", "이 글에서 얻는 것(3가지)");
    const b = has(/\d/, "number", "숫자/수치 예시");
    const c = has(/\?/, "question", "질문 1개 이상");
    const d = has(/###\s+안내/, "notice", "안내(개인차/상담)");
    const ph = extractPlaceholders(md).length;
    checks.push({ key: "imagePlaceholders", label: "이미지 플레이스홀더(2+) 포함", pass: ph >= 2, note: `count=${ph}` });
    const score = [a, b, c, d, ph >= 2].filter(Boolean).length * 20;
    return { score, checks };
  }

  if (stage === "ready") {
    const a = has(/###\s+안내/, "notice", "안내 포함");
    const img = /!\[\]\((images\/img_\d+\.(jpg|jpeg|png|webp))\)/i.test(md);
    checks.push({ key: "images", label: "이미지 삽입(최소 1개)", pass: img });
    const refs = (md.match(/https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)\//g) || []).length;
    checks.push({ key: "refs", label: "PubMed 레퍼런스 3개", pass: refs >= 3, note: `count=${refs}` });
    const score = [a, img, refs >= 3].filter(Boolean).length * 34;
    return { score: Math.min(100, score), checks };
  }

  // default
  const score = 80;
  checks.push({ key: "default", label: "기본 통과(임시)", pass: true });
  return { score, checks };
}

export function appendGateReport(md: string, stage: Stage, score: number, checks: StageCheck[]) {
  const lines = [
    "\n\n---\n",
    `## Step Gate (${stage})\n`,
    `- score: ${score} (pass >= 80)\n`,
    "\n### checklist\n",
    ...checks.map((c) => `- [${c.pass ? "x" : " "}] ${c.label}${c.note ? ` (${c.note})` : ""}`),
    "",
  ];
  return md + lines.join("\n");
}
