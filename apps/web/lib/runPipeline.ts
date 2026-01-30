import { getArtifact, updateArtifact } from "./store";
import { readPipelineSettings } from "./pipelineSettings";
import { readEvalSettings } from "./evalSettings";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function scoreForLoop(loopIndex: number) {
  // MVP scoring: tends to improve with loops, but not guaranteed
  const base = 52 + loopIndex * 6;
  const jitter = Math.floor(Math.random() * 18); // 0..17
  return Math.min(99, base + jitter);
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

  // Ensure we have a topic body at least
  if (art0.stage !== "topic") {
    await updateArtifact(id, { stage: "topic" });
    await sleep(150);
  }

  // Base manuscript (this evolves; we don't create unrelated content per stage)
  let manuscript =
    `# ${art0.title}\n\n` +
    `오늘처럼 유난히 추운 날, 몸이 코트에서 바로 안 따라오는 날이 있죠.\n` +
    `특히 하체 웨이트(햄스트링) 다음날이면 ‘첫 스텝’ 반응이 둔한 느낌이 더 커질 수 있어요.\n\n` +
    `혹시 형님도 이런 날, 겪어보신 적 있으신가요?\n\n` +
    `## 이 글에서 얻는 것\n` +
    `- 몸이 늦게 풀리는 날이 생기는 이유(근육통/피로/추위)\n` +
    `- 테니스에서 컨디션을 안전하게 조절하는 방법\n` +
    `- 이런 신호면 쉬어야 하는 기준\n\n`;

  // Outline (manuscript + outline section)
  await updateArtifact(id, {
    stage: "outline",
    bodyMarkdown:
      manuscript +
      `## Outline\n` +
      `1) 왜 ‘첫 스텝’이 늦어질까\n` +
      `2) 하체 웨이트 다음날(특히 햄스트링) 컨디션\n` +
      `3) 추운 날씨가 워밍업 시간을 늘리는 이유\n` +
      `4) 오늘은 어떻게 조절할까(실전 루틴)\n` +
      `5) 이런 신호면 중단/상담\n`,
  });
  await sleep(200);

  // Loop segment (draft -> review -> eval). Draft and review both retain the evolved manuscript.
  for (let i = 0; i < maxLoops; i++) {
    loopCount = i + 1;

    // Draft: expand manuscript
    manuscript =
      manuscript +
      `## 왜 이런 날이 생길까요?\n` +
      `근육통이 남아있는 날은 ‘아픈 것’만 문제가 아닐 수 있어요.\n` +
      `반응이 늦습니다.\n\n` +
      `추운 날씨는 이 시간을 더 길게 만들어요.\n` +
      `몸이 ‘따뜻해지는 데’ 시간이 걸리니까요.\n\n` +
      `## 구체적으로(수치/비유)\n` +
      `저는 이런 날, 워밍업을 보통보다 10~15분 더 잡습니다.\n` +
      `이게 ‘대충’이 아니라, 반응이 살아나는 시점까지 시간을 확보하는 느낌이에요.\n\n` +
      `## 오늘은 이렇게 해보세요(3단계)\n` +
      `1) 지금(집/라커룸): 10~15분 더 데우기(가동성 + 가벼운 점프)\n` +
      `2) 코트: 게임보다 레슨/패턴 연습 비중을 높이기\n` +
      `3) 중단 신호: 날카로운 통증/찌릿함/힘 빠짐이 동반되면 멈추기\n\n` +
      `---\n\n### 안내\n` +
      `이 글은 일반 정보입니다. 개인별 원인/진단/치료는 다를 수 있습니다.\n`;

    await updateArtifact(id, { stage: "draft", loopCount, bodyMarkdown: manuscript });
    await sleep(250);

    // Review: keep the same manuscript + add review comments section (so user sees the evolved 글 + 코멘트)
    const reviewComments =
      `\n\n## Review Comments (보완 포인트)\n` +
      `- 도입에서 ‘얻는 것 3가지’가 더 선명한지 확인\n` +
      `- 숫자/비유가 1개 이상 들어갔는지 확인\n` +
      `- 문장 리듬: 짧은 문장 1~2개 더 섞기\n` +
      `- 과장/단정 표현 제거 + 개인차/상담 안내 유지\n`;

    await updateArtifact(id, { stage: "review", bodyMarkdown: manuscript + reviewComments });
    await sleep(200);

    // Eval
    const score = scoreForLoop(i);
    finalScore = score;

    const w = evalSettings.weights;
    const breakdown = {
      structure: Math.min(w.structure, Math.floor((w.structure * (score / 100)) * 0.9 + Math.random() * (w.structure * 0.2))),
      specificity: Math.min(w.specificity, Math.floor((w.specificity * (score / 100)) * 0.9 + Math.random() * (w.specificity * 0.2))),
      humanizer: Math.min(w.humanizer, Math.floor((w.humanizer * (score / 100)) * 0.9 + Math.random() * (w.humanizer * 0.2))),
      medicalLegal: Math.min(w.medicalLegal, Math.floor((w.medicalLegal * (score / 100)) * 0.9 + Math.random() * (w.medicalLegal * 0.2))),
      seo: Math.min(w.seo, Math.floor((w.seo * (score / 100)) * 0.9 + Math.random() * (w.seo * 0.2))),
    };

    const reasons = [
      score < minScore
        ? "독자 이득/구체 수치/실천 가이드 중 일부가 더 선명해질 여지가 있음"
        : "구조(공감→정보→실천)가 안정적이고, 실천 가이드가 명확함",
      "의학/법무 리스크 문구는 과장 없이 유지 필요",
    ];

    const fixes = score < minScore
      ? [
          "본문 중간에 구체 수치/비유 1개를 추가(예: 워밍업 10~15분, 추위에서 반응이 돌아오는 체감)",
          "독자 참여 문장 2개 이상 확보(만져보세요/체크해보세요)",
          "섹션 제목을 더 직관적으로(‘왜 늦어질까/오늘은 어떻게 할까/이런 신호면 중단’)"
        ]
      : [
          "현재 톤 유지 + 반복 문장만 다듬기",
        ];

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
          ? `### 결과\n점수 미달 → 보완 후 다시 Topic부터 루프\n`
          : `### 결과\n통과 → Ready로 진행\n`),
    });
    await sleep(200);

    if (score >= minScore) break;

    // Loop back to topic, but keep same artifact.
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

  // Ready (keep evolved manuscript)
  await updateArtifact(id, {
    stage: "ready",
    bodyMarkdown:
      manuscript +
      `\n\n---\n` +
      `최종 점수: ${finalScore ?? "-"} (minScore ${minScore}, loops ${Math.min(loopCount, maxLoops)}/${maxLoops})\n`,
  });
  await sleep(150);

  // Naver (still placeholder, but keep the evolved manuscript visible)
  await updateArtifact(id, {
    stage: "naver",
    bodyMarkdown:
      manuscript +
      `\n\n---\n` +
      `(Naver export 예정)\n- naver_full.html\n- naver_body.html\n- hashtags.txt\n`,
  });
  await sleep(120);

  // Published (final)
  await updateArtifact(id, {
    stage: "published",
    bodyMarkdown:
      manuscript +
      `\n\n---\n` +
      `최종 점수: ${finalScore ?? "-"}\n` +
      `루프 횟수: ${Math.min(loopCount, maxLoops)}/${maxLoops}\n`,
    running: false,
  });
}
