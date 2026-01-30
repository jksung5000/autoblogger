import { getArtifact, updateArtifact } from "./store";
import { readPipelineSettings } from "./pipelineSettings";
import { readEvalSettings } from "./evalSettings";
import {
  generateDraft,
  generateOutlinePacket,
  generateReviewComments,
  generateTopicCard,
  scoreDraft,
} from "./generate";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runPipeline(id: string) {
  const settings = await readPipelineSettings();
  const minScore = settings.minScore ?? 70;
  const maxLoops = settings.maxLoops ?? 5;
  const evalSettings = await readEvalSettings();

  const art0 = await getArtifact(id);
  if (!art0) return;

  // prevent concurrent runs
  if (art0.running) return;

  await updateArtifact(id, { running: true });

  // Start from topic, but do NOT create new artifacts/files—overwrite the same ones.
  // We'll iterate draft/review/eval until pass or maxLoops.
  let loopCount = art0.loopCount || 0;
  let finalScore = art0.evalScore ?? null;

  // (Re)generate topic card each run/loop so stage files are always coherent
  const topicMd = generateTopicCard({
    title: art0.title,
    seedType: art0.seedType,
    loopCount: art0.loopCount,
    evalFixes: art0.evalFixes,
  });
  await updateArtifact(id, { stage: "topic", bodyMarkdown: topicMd, running: true });
  await sleep(120);

  // Outline packet derived from topic
  const outlineMd = generateOutlinePacket({ title: art0.title, seedType: art0.seedType, topicMd });
  await updateArtifact(id, { stage: "outline", bodyMarkdown: outlineMd });
  await sleep(160);

  // Loop segment (draft -> review -> eval) based on generated artifacts
  let draftMd = "";
  for (let i = 0; i < maxLoops; i++) {
    loopCount = i + 1;

    draftMd = generateDraft({
      title: art0.title,
      seedType: art0.seedType,
      topicMd,
      outlineMd,
    });

    await updateArtifact(id, { stage: "draft", loopCount, bodyMarkdown: draftMd });
    await sleep(220);

    const review = generateReviewComments(draftMd);
    await updateArtifact(id, { stage: "review", bodyMarkdown: review.reviewMd });
    await sleep(160);

    // Eval (heuristic; deterministic)
    const scored = scoreDraft(draftMd);
    const score = scored.score;
    finalScore = score;

    const w = evalSettings.weights;
    const breakdown = {
      structure: Math.min(w.structure, scored.breakdown.structure),
      specificity: Math.min(w.specificity, scored.breakdown.specificity),
      humanizer: Math.min(w.humanizer, scored.breakdown.humanizer),
      medicalLegal: Math.min(w.medicalLegal, scored.breakdown.medicalLegal),
      seo: Math.min(w.seo, scored.breakdown.seo),
    };

    const reasons = scored.failures.length
      ? scored.failures
      : ["구조(공감→정보→실천)가 안정적이고, 안내 문구/진료 신호가 포함됨"];

    const fixes = scored.fixes.length
      ? scored.fixes
      : ["반복 표현만 다듬고, 문장 길이(짧은 문장)를 1~2개 더 섞기"];
    await updateArtifact(id, {
      stage: "eval",
      evalScore: score,
      evalBreakdown: breakdown,
      evalReasons: reasons,
      evalFixes: fixes,
      bodyMarkdown:
        `# ${art0.title}\n\n## Eval\n` +
        `- score: ${score} (pass >= ${minScore})\n\n` +
        `### breakdown\n` +
        `- structure: ${breakdown.structure}/${w.structure}\n` +
        `- specificity: ${breakdown.specificity}/${w.specificity}\n` +
        `- humanizer: ${breakdown.humanizer}/${w.humanizer}\n` +
        `- medicalLegal: ${breakdown.medicalLegal}/${w.medicalLegal}\n` +
        `- seo: ${breakdown.seo}/${w.seo}\n\n` +
        `### why\n` +
        reasons.map((r) => `- ${r}`).join("\n") +
        `\n\n### fixes\n` +
        fixes.map((f) => `- ${f}`).join("\n") +
        `\n\n` +
        (score < minScore
          ? `### 결과\n점수 미달 → fixes 반영 후 다시 실행(Topic/Outline은 유지)\n`
          : `### 결과\n통과 → Ready로 진행\n`),
    });
    await sleep(160);

    if (score >= minScore) break;

    // MVP: we keep topic/outline stable, but store fixes on artifact so next run can reflect them.
    await updateArtifact(id, { stage: "topic", running: true });
    await sleep(80);
    await updateArtifact(id, {
      stage: "topic",
      bodyMarkdown:
        `# ${art0.title}\n\n` +
        `(Eval 점수 미달: ${score}점)\n\n` +
        `이번 루프에서는 “독자 이득/구체 수치/실천 가이드”를 더 선명하게 보강합니다.\n`,
    });
    await sleep(200);

    // Also regenerate outline quickly (simulate refining)
    await updateArtifact(id, {
      stage: "outline",
      bodyMarkdown:
        `# ${art0.title}\n\n## Outline(v${i + 2})\n` +
        `- 도입: 공감 + 질문 + 얻는 것\n` +
        `- 중간: 구체 수치/비유\n` +
        `- 마무리: 3단계 대응\n`,
    });
    await sleep(150);
  }

  // Ready (final draft candidate)
  await updateArtifact(id, {
    stage: "ready",
    bodyMarkdown:
      draftMd +
      `\n\n---\n` +
      `최종 점수: ${finalScore ?? "-"} (minScore ${minScore}, loops ${Math.min(loopCount, maxLoops)}/${maxLoops})\n`,
  });
  await sleep(150);

  // Naver (placeholder for now)
  await updateArtifact(id, {
    stage: "naver",
    bodyMarkdown:
      draftMd +
      `\n\n---\n` +
      `(Naver export 예정)\n- naver_full.html\n- naver_body.html\n- hashtags.txt\n`,
  });
  await sleep(120);

  // Published (final)
  await updateArtifact(id, {
    stage: "published",
    bodyMarkdown:
      draftMd +
      `\n\n---\n` +
      `최종 점수: ${finalScore ?? "-"}\n` +
      `루프 횟수: ${Math.min(loopCount, maxLoops)}/${maxLoops}\n`,
    running: false,
  });
}
