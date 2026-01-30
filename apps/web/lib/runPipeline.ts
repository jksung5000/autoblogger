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
import { exportNaverFromMarkdown } from "./naverExport";
import { writeExport } from "./artifactFiles";
import { ensurePlaceholders, fetchImagesForDraft, injectImages, extractPlaceholders } from "./images";
import { fetchPubmedRefs, formatRefsMarkdown, verifyRefs } from "./pubmed";
import { appendGateReport, evaluateStage } from "./stageGate";

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
  let topicMd = generateTopicCard({
    title: art0.title,
    seedType: art0.seedType,
    loopCount: art0.loopCount,
    evalFixes: art0.evalFixes,
  });
  {
    const g = evaluateStage("topic", topicMd);
    topicMd = appendGateReport(topicMd, "topic", g.score, g.checks);
    await updateArtifact(id, { stage: "topic", bodyMarkdown: topicMd, running: true, stageScores: { topic: g.score } });
    await sleep(120);
    if (g.score < 80) {
      await updateArtifact(id, { running: false });
      return;
    }
  }

  // Outline packet derived from topic
  let outlineMd = generateOutlinePacket({ title: art0.title, seedType: art0.seedType, topicMd });
  {
    const g = evaluateStage("outline", outlineMd);
    outlineMd = appendGateReport(outlineMd, "outline", g.score, g.checks);
    await updateArtifact(id, { stage: "outline", bodyMarkdown: outlineMd, stageScores: { outline: g.score } });
    await sleep(160);
    if (g.score < 80) {
      await updateArtifact(id, { running: false });
      return;
    }
  }

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

    // ensure image placeholders from outline exist (step 3 requirement)
    draftMd = ensurePlaceholders(draftMd, extractPlaceholders(outlineMd));

    {
      const g = evaluateStage("draft", draftMd);
      const withGate = appendGateReport(draftMd, "draft", g.score, g.checks);
      await updateArtifact(id, { stage: "draft", loopCount, bodyMarkdown: withGate, stageScores: { draft: g.score } });
      await sleep(220);
      if (g.score < 80) {
        await updateArtifact(id, { running: false });
        return;
      }
    }

    const review = generateReviewComments(draftMd);
    {
      const g = evaluateStage("review", review.reviewMd);
      const withGate = appendGateReport(review.reviewMd, "review", g.score, g.checks);
      await updateArtifact(id, { stage: "review", bodyMarkdown: withGate, stageScores: { review: g.score } });
      await sleep(160);
      if (g.score < 80) {
        await updateArtifact(id, { running: false });
        return;
      }
    }

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
    {
      const evalMd =
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
          : `### 결과\n통과 → Ready로 진행\n`);

      const g = evaluateStage("eval", evalMd);
      const withGate = appendGateReport(evalMd, "eval", g.score, g.checks);
      await updateArtifact(id, {
        stage: "eval",
        evalScore: score,
        evalBreakdown: breakdown,
        evalReasons: reasons,
        evalFixes: fixes,
        bodyMarkdown: withGate,
        stageScores: { eval: g.score },
      });
      await sleep(160);
      if (g.score < 80) {
        await updateArtifact(id, { running: false });
        return;
      }
    }

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

  // Ready (final draft candidate) — now with images + references
  // 1) Fetch images and inject (step 3)
  const img = await fetchImagesForDraft({ baseId: id, draftMd });
  let readyMd = injectImages(
    draftMd,
    img.downloaded.map((d) => ({ file: d.file, license: d.license }))
  );

  // 2) PubMed references (step 4)
  const refs = await fetchPubmedRefs({ seedType: art0.seedType, topicHint: art0.title, limit: 3 });
  readyMd = readyMd + formatRefsMarkdown(refs);
  const refQa = verifyRefs({ topic: art0.title, refs });

  // 3) Gate score for ready (step 6)
  {
    const g = evaluateStage("ready", readyMd);
    const extraChecks = refQa.failures.map((f, i) => ({ key: `refqa_${i}`, label: f, pass: false }));
    const checks = refQa.ok ? g.checks : [...g.checks, ...extraChecks];
    const score = refQa.ok ? g.score : Math.min(g.score, 79);

    readyMd = appendGateReport(readyMd, "ready", score, checks);
    await updateArtifact(id, {
      stage: "ready",
      bodyMarkdown:
        readyMd +
        `\n\n---\n` +
        `최종 점수: ${finalScore ?? "-"} (minScore ${minScore}, loops ${Math.min(loopCount, maxLoops)}/${maxLoops})\n`,
      stageScores: { ready: score },
    });
    await sleep(150);

    if (score < 80) {
      await updateArtifact(id, { running: false });
      return;
    }
  }

  // Naver export (generate real files)
  const naver = exportNaverFromMarkdown({ markdown: readyMd, title: art0.title });
  await writeExport(id, "naver_full.html", naver.fullHtml);
  await writeExport(id, "naver_body.html", naver.bodyHtml);
  await writeExport(id, "hashtags.txt", naver.hashtags + "\n");

  await updateArtifact(id, {
    stage: "naver",
    bodyMarkdown:
      readyMd +
      `\n\n---\n` +
      `(Naver export 생성됨)\n- exports/naver_full.html\n- exports/naver_body.html\n- exports/hashtags.txt\n`,
  });
  await sleep(120);

  // Published (final)
  {
    const g = evaluateStage("published", readyMd);
    const publishedMd = appendGateReport(readyMd, "published", g.score, g.checks);
    await updateArtifact(id, {
      stage: "published",
      bodyMarkdown:
        publishedMd +
        `\n\n---\n` +
        `최종 점수: ${finalScore ?? "-"}\n` +
        `루프 횟수: ${Math.min(loopCount, maxLoops)}/${maxLoops}\n`,
      running: false,
      stageScores: { published: g.score },
    });
  }
}

