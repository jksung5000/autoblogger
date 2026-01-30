import { getArtifact, updateArtifact } from "./store";
import { readPipelineSettings } from "./pipelineSettings";

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

  // Outline
  await updateArtifact(id, {
    stage: "outline",
    bodyMarkdown: `# ${art0.title}\n\n## Outline\n- 도입: 공감 + 질문\n- 중간: 구체 정보(수치/비유 1개)\n- 마무리: 실천 가이드\n`,
  });
  await sleep(200);

  // Loop segment
  for (let i = 0; i < maxLoops; i++) {
    loopCount = i + 1;

    // Draft
    await updateArtifact(id, {
      stage: "draft",
      loopCount,
      bodyMarkdown:
        `# ${art0.title}\n\n` +
        `## 도입\n` +
        `추운 날, 몸이 바로 안 풀리는 날이 있죠.\n` +
        `하체 웨이트 다음날이면 더 그럴 수 있어요.\n\n` +
        `혹시 오늘, 첫 스텝이 늦는 느낌이 있으셨나요?\n\n` +
        `## 중간(구체 정보)\n` +
        `워밍업은 ‘몇 분’보다 ‘몸이 언제 반응하느냐’가 기준입니다.\n` +
        `저는 보통 10~15분을 더 잡습니다.\n\n` +
        `## 실천 가이드\n` +
        `- 첫 10~15분은 강도 낮게, 몸의 반응부터 확인\n` +
        `- 둔하면 게임보다 레슨/패턴 연습 비중을 높이기\n` +
        `- 날카로운 통증/찌릿함/힘 빠짐이면 중단\n\n` +
        `---\n\n### 안내\n` +
        `이 글은 일반 정보입니다. 개인별 원인/진단/치료는 다를 수 있습니다.\n`,
    });
    await sleep(250);

    // Review
    await updateArtifact(id, {
      stage: "review",
      bodyMarkdown:
        `# ${art0.title}\n\n## Review\n` +
        `- 과장/단정 표현 제거\n` +
        `- 독자 이득(얻는 것)이 초반에 보이는지\n` +
        `- 숫자/비유 1개 이상 포함 여부\n` +
        `- 문장 리듬(짧은 문장) 섞였는지\n`,
    });
    await sleep(200);

    // Eval
    const score = scoreForLoop(i);
    finalScore = score;
    await updateArtifact(id, {
      stage: "eval",
      evalScore: score,
      bodyMarkdown:
        `# ${art0.title}\n\n## Eval\n` +
        `- score: ${score}\n` +
        `- rule: pass if score >= ${minScore}\n` +
        (score < minScore
          ? `\n### 결과\n점수 미달 → 보완 후 다시 Topic부터 루프\n`
          : `\n### 결과\n통과 → Ready로 진행\n`),
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

  // Ready
  await updateArtifact(id, {
    stage: "ready",
    bodyMarkdown:
      `# ${art0.title}\n\n` +
      `(Ready 후보 — MVP)\n\n` +
      `최종 점수: ${finalScore ?? "-"} (minScore ${minScore}, loops ${Math.min(loopCount, maxLoops)}/${maxLoops})\n`,
  });
  await sleep(150);

  // Naver
  await updateArtifact(id, {
    stage: "naver",
    bodyMarkdown:
      `# ${art0.title}\n\n(Naver placeholder)\n- naver_full.html\n- naver_body.html\n- hashtags.txt\n`,
  });
  await sleep(120);

  // Published
  await updateArtifact(id, {
    stage: "published",
    bodyMarkdown:
      `# ${art0.title}\n\n(Published placeholder)\n\n최종 점수: ${finalScore ?? "-"}\n루프 횟수: ${Math.min(loopCount, maxLoops)}/${maxLoops}\n`,
    running: false,
  });
}
