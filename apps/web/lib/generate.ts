import type { SeedType, Stage } from "./store";

const SEO_MUST = [
  "광화문",
  "종로",
  "화이팅 통증의학과",
  "통증의학과",
  "정형외과",
  "충격파",
  "도수",
  "주사",
];

const INTERNAL_LINK_POLICY =
  "문맥/토픽 상관성이 매우 높을 때만 내부링크 추가(억지 금지, 0개 허용)";

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hasNumber(s: string) {
  return /\d/.test(s);
}

function ensureNumberExample(seedType: SeedType) {
  // keep stable & actionable
  if (seedType === "tennis") return "워밍업을 평소보다 10~15분 더 잡아보세요.";
  if (seedType === "weights") return "워밍업을 평소보다 10~15분 더 길게 잡고, 메인 세트는 1~2세트 줄여보세요.";
  return "체감 강도가 7/10 이상이면(숨이 차고 대화가 끊기는 정도), 그 날은 강도를 한 단계 낮추는 게 안전합니다.";
}

function empathyHook(seedType: SeedType, title: string) {
  const t = `${title}`.toLowerCase();
  if (seedType === "tennis") {
    if (/(햄스트링|hamstring|하체|첫\s*스텝|스텝)/.test(t)) {
      return "하체 운동 다음날, 코트에서 첫 스텝이 늦게 나오는 느낌… 겪어보신 적 있으신가요?";
    }
    return "테니스 치러 갔는데, 몸이 생각보다 안 따라오는 날… 있으셨죠?";
  }
  if (seedType === "weights") {
    return "운동은 하고 싶은데, 특정 부위가 먼저 뻐근해서 ‘오늘은 강도를 낮춰야 하나?’ 고민되는 날이 있죠.";
  }
  return "같은 동작을 해도 유독 불편한 날이 있어요. 그럴 때 기준이 없으면 더 불안해집니다.";
}

function takeaways(seedType: SeedType) {
  if (seedType === "tennis") {
    return [
      "몸이 늦게 풀리는 날이 생기는 이유(피로/근육통/추위)",
      "테니스에서 컨디션을 안전하게 조절하는 3단계 루틴",
      "이런 신호면 쉬거나 진료를 고려해야 하는 기준",
    ];
  }
  if (seedType === "weights") {
    return [
      "운동 중 ‘불편함’이 생기는 대표 패턴",
      "오늘 세션을 망치지 않는 조절 방법",
      "악화 신호/진료 필요 신호",
    ];
  }
  return [
    "증상을 ‘패턴’으로 이해하는 방법",
    "지금 당장 할 수 있는 실천 포인트",
    "악화 신호와 다음 단계(진료/재활) 기준",
  ];
}

function tags(seedType: SeedType) {
  if (seedType === "tennis") return ["테니스", "부상예방", "워밍업", "운동일지"].join(", ");
  if (seedType === "weights") return ["웨이트", "근육통", "회복", "운동일지"].join(", ");
  return ["통증", "재활", "자가관리"].join(", ");
}

export function generateTopicCard(input: {
  title: string;
  seedType: SeedType;
  loopCount?: number;
  evalFixes?: string[];
}): string {
  const { title, seedType } = input;

  const summary = `${title} 상황에서, 오늘 당장 안전하게 조절할 기준과 루틴을 정리합니다.`;
  const thesis = pick([
    "컨디션이 떨어진 날엔 ‘강행’보다 ‘조절’이 실력과 몸을 같이 지키는 방법입니다.",
    "불편함은 신호입니다. 해석하고 조절하면 악화를 막을 수 있어요.",
  ]);

  const outline =
    seedType === "tennis"
      ? [
          "왜 첫 스텝/반응이 늦어질까(피로/근육통/추위)",
          "하체 웨이트 다음날(특히 햄스트링) 체크 포인트",
          "워밍업 시간을 늘려야 하는 이유",
          "오늘 코트에서의 ‘강도 조절’ 3단계",
          "중단/진료 신호",
          "(필요 시) 회복 루틴(스트레칭/수분/수면)",
        ]
      : [
          "증상이 생기는 대표 패턴(부하/자세/회복)",
          "오늘 운동을 조절하는 기준",
          "자가 체크(만져보기/움직여보기)",
          "3단계 대응(집/운동/진료)",
          "예방 루틴",
        ];

  const checklist = [
    "오늘 컨디션을 0~10으로 점수 매기고(주관적), 7 이상이면 강도/볼륨을 낮춘다",
    ensureNumberExample(seedType),
    "날카로운 통증/찌릿함/힘 빠짐이 동반되면 중단한다",
  ];

  const patch = input.evalFixes?.length
    ? `\n\n## 이번 루프 보완 포인트(Eval 기반)\n${input.evalFixes
        .slice(0, 5)
        .map((x) => `- ${x}`)
        .join("\n")}\n`
    : "";

  return (
    `# Topic Card\n\n` +
    `## 1~2줄 요약\n- ${summary}\n\n` +
    `## 핵심 메시지\n- ${thesis}\n\n` +
    `## Outline\n${outline.slice(0, 8).map((s, i) => `${i + 1}) ${s}`).join("\n")}\n\n` +
    `## 체크리스트\n${checklist.map((c) => `- ${c}`).join("\n")}\n\n` +
    `## 태그\n- ${tags(seedType)}\n` +
    patch
  );
}

export function generateOutlinePacket(input: {
  title: string;
  seedType: SeedType;
  topicMd: string;
}): string {
  const { title, seedType } = input;

  const oneLine = pick(takeaways(seedType));

  const outline =
    seedType === "tennis"
      ? [
          "도입: 공감 2~3문장 + 질문 1개 + ‘이 글에서 얻는 것 3가지’",
          "왜 몸이 늦게 풀리는지(피로/근육통/추위) — 쉬운 말로",
          "숫자/비유 1개(예: 워밍업 10~15분 추가) + 독자 참여(체크해보세요)",
          "오늘 코트에서 조절하는 3단계(집/코트/중단 신호)",
          "마무리: 예방이 최선 + 진료 안내(과장 없이)",
        ]
      : [
          "도입: 공감 + 질문 + 얻는 것 3가지",
          "핵심 개념(왜/무엇/어떻게)",
          "구체 정보(숫자/비유) + 독자 참여",
          "실천 체크리스트(3~6개)",
          "진료 필요 신호 + 치료 옵션 가이드(홍보 아님)",
        ];

  const images =
    seedType === "tennis"
      ? [
          `- [IMAGE: query="tennis warm up" alt="테니스 워밍업" caption="워밍업이 길어지는 날엔 이유가 있습니다." slot="hook"]`,
          `- [IMAGE: query="hamstring anatomy" alt="햄스트링" caption="하체 피로가 남으면 반응이 늦게 느껴질 수 있어요." slot="mechanism"]`,
          `- [IMAGE: query="dynamic stretching" alt="다이나믹 스트레칭" caption="짧게, 안전하게, 단계적으로." slot="checklist"]`,
        ]
      : [
          `- [IMAGE: query="stretching" alt="스트레칭" caption="가볍게 풀어주는 것부터." slot="hook"]`,
          `- [IMAGE: query="muscle anatomy" alt="근육" caption="과부하가 쌓이면 신호가 옵니다." slot="mechanism"]`,
          `- [IMAGE: query="exercise checklist" alt="체크리스트" caption="오늘은 이렇게 조절해보세요." slot="checklist"]`,
        ];

  const seo = SEO_MUST.map((s) => `- ${s}`).join("\n");

  return (
    `# Outline Packet\n\n` +
    `## 제목\n${title}\n\n` +
    `## 한줄 요약\n${oneLine}\n\n` +
    `## 아웃라인\n${outline.map((s) => `- ${s}`).join("\n")}\n\n` +
    `## 이미지 제안(플레이스홀더)\n${images.join("\n")}\n\n` +
    `## SEO(자연스럽게)\n${seo}\n\n` +
    `## 내부링크 정책\n${INTERNAL_LINK_POLICY}\n`
  );
}

export function generateDraft(input: {
  title: string;
  seedType: SeedType;
  topicMd: string;
  outlineMd: string;
}): string {
  const { title, seedType } = input;
  const hook = empathyHook(seedType, title);
  const numLine = ensureNumberExample(seedType);

  const take = takeaways(seedType);

  const visitSignals = [
    "통증이 1~2주 이상 지속되거나 점점 심해짐",
    "저림/감각 이상/근력 저하가 동반됨",
    "일상 동작에서도 통증이 반복됨(문고리 돌리기/물건 들기 등)",
    "운동 볼륨을 줄여도 재발을 반복함",
  ];

  const treatments = [
    "충격파: 만성 과사용/부착부 통증에서 보조적으로 고려",
    "도수(수기/운동치료 포함): 사용 패턴 교정 + 운동치료 설계",
    "주사: 통증 조절이 필요하거나 염증 양상이 뚜렷할 때 의료진 판단 하 선택",
  ];

  const seoLine =
    `광화문·종로 쪽에서 통증의학과/정형외과 상담이 필요하면, ` +
    `상태에 따라 충격파/도수/주사 같은 옵션을 의료진과 상의하는 흐름이 일반적입니다(홍보 목적 아님).`;

  const checklist =
    seedType === "tennis"
      ? [
          "집/라커룸에서 10~15분 더 데우기(가동성 + 가벼운 점프)",
          "코트에서는 게임보다 패턴 연습 비중을 높이기",
          "첫 스텝이 늦으면, 볼에 늦게 들어가지 말고 스플릿 스텝을 0.5박 빠르게",
          "날카로운 통증/찌릿함/힘 빠짐이 동반되면 중단",
        ]
      : [
          "통증이 나는 동작은 ‘고집’하지 않고 대체 동작으로 바꾸기",
          "메인 세트 볼륨을 1~2세트 줄여 회복 여지를 남기기",
          "통증이 ‘찌릿/저림’으로 바뀌면 중단",
        ];

  // minimal but complete structure; avoid too many headings (2~4)
  return (
    `# ${title}\n\n` +
    `${hook}\n` +
    `오늘은 몸이 안 따라오는 날에도, **안전하게 조절하는 기준**을 정리해드립니다.\n\n` +
    `이 글에서 얻는 것(3가지)\n` +
    take.map((x) => `- ${x}`).join("\n") +
    `\n\n` +
    `## 왜 몸이 늦게 풀릴까요?\n` +
    `근육통이 남아있는 날은 ‘아픈 것’만 문제가 아닐 수 있어요. 반응이 늦습니다.\n` +
    `추운 날씨는 이 시간을 더 길게 만들기도 합니다.\n\n` +
    `## 오늘 바로 적용(숫자 + 참여)\n` +
    `${numLine}\n` +
    `그리고 한 번만 체크해보세요.\n` +
    `- 스플릿 스텝이 평소보다 늦는지\n` +
    `- 첫 2~3발이 ‘무겁게’ 느껴지는지\n\n` +
    `## 오늘은 이렇게 조절해보세요\n` +
    checklist.map((c) => `- ${c}`).join("\n") +
    `\n\n` +
    `## 이런 신호면 진료를 권합니다\n` +
    visitSignals.map((s) => `- ${s}`).join("\n") +
    `\n\n` +
    `치료는 상태에 따라 달라집니다. ${seoLine}\n` +
    `\n` +
    `참고로 의료진이 언급하는 치료 옵션은 보통 이런 범주입니다.\n` +
    treatments.map((t) => `- ${t}`).join("\n") +
    `\n\n` +
    `예방이 최선입니다. ‘되게’ 하기보다 ‘안전하게’ 오래 가는 쪽이 결국 실력도 지켜줍니다.\n\n` +
    `---\n\n` +
    `### 안내\n` +
    `이 글은 일반 정보입니다. 개인별 원인/진단/치료는 다를 수 있습니다. 증상이 지속되거나 악화되면 전문의 상담이 필요합니다.\n`
  );
}

export function generateReviewComments(draftMd: string): { reviewMd: string; reasons: string[]; fixes: string[] } {
  const failures: string[] = [];
  const fixes: string[] = [];

  if (!/이 글에서 얻는 것/.test(draftMd)) {
    failures.push("초반에 ‘이 글에서 얻는 것’이 보이지 않음");
    fixes.push("도입 직후 ‘이 글에서 얻는 것(3가지)’ 섹션을 추가");
  }
  if (!hasNumber(draftMd)) {
    failures.push("구체 수치/숫자 예시가 부족함");
    fixes.push("워밍업 10~15분/세트 1~2세트 조절처럼 숫자 1개 이상 추가");
  }
  if (!/### 안내/.test(draftMd)) {
    failures.push("개인차/상담 안내 문구 누락");
    fixes.push("말미에 안내 문구(일반 정보/개인차/상담)를 포함");
  }
  if (failures.length === 0) {
    fixes.push("반복 문장만 줄이고, 짧은 문장 1~2개 더 섞기");
  }

  const reviewMd =
    draftMd +
    `\n\n## Review Comments (보완 포인트)\n` +
    (failures.length
      ? failures.map((f) => `- 발견: ${f}`).join("\n") + "\n"
      : "- 발견: 큰 문제 없음\n") +
    (fixes.length ? fixes.map((f) => `- 수정: ${f}`).join("\n") : "");

  return { reviewMd, reasons: failures.length ? failures : ["구조/가독성/리스크 문구가 안정적임"], fixes };
}

export function scoreDraft(draftMd: string): {
  score: number;
  breakdown: { structure: number; specificity: number; humanizer: number; medicalLegal: number; seo: number };
  failures: string[];
  fixes: string[];
} {
  const failures: string[] = [];
  const fixes: string[] = [];

  const hasTake = /이 글에서 얻는 것/.test(draftMd);
  const hasSections = /##\s+왜/.test(draftMd) && /##\s+오늘/.test(draftMd) && /##\s+이런 신호면/.test(draftMd);
  const structure = (hasTake ? 10 : 5) + (hasSections ? 12 : 6);

  const specificity = hasNumber(draftMd) ? 18 : 8;
  if (!hasNumber(draftMd)) {
    failures.push("숫자/수치 예시가 부족");
    fixes.push("10~15분, 1~2세트 등 숫자 1개 이상 포함");
  }

  const humanizer = /\?/.test(draftMd) ? 10 : 6;

  const medicalLegal = /### 안내/.test(draftMd) ? 22 : 10;
  if (!/### 안내/.test(draftMd)) {
    failures.push("안내(일반 정보/개인차/상담) 누락");
    fixes.push("말미에 안내 문구 추가");
  }

  const seoHits = SEO_MUST.filter((k) => draftMd.includes(k)).length;
  const seo = Math.min(15, 5 + seoHits);

  const score = Math.max(0, Math.min(99, structure + specificity + humanizer + medicalLegal + seo));

  if (!hasTake) {
    failures.push("초반에 독자 이득이 명확하지 않음");
    fixes.push("도입 직후 ‘이 글에서 얻는 것(3가지)’ 추가");
  }

  return {
    score,
    breakdown: {
      structure: Math.min(25, structure),
      specificity: Math.min(20, specificity),
      humanizer: Math.min(15, humanizer),
      medicalLegal: Math.min(25, medicalLegal),
      seo: Math.min(15, seo),
    },
    failures,
    fixes,
  };
}

export function minReqForStage(stage: Stage) {
  switch (stage) {
    case "topic":
      return ["요약 1~2문장", "핵심 메시지", "아웃라인 5~8", "체크리스트 3+", "태그"].join(", ");
    case "outline":
      return ["아웃라인 확정", "이미지 2~3(플레이스홀더)", "SEO 키워드", "내부링크 정책"].join(", ");
    case "draft":
      return ["공감+질문", "숫자/수치 1+", "실천 체크리스트", "진료 신호", "안내 문구"].join(", ");
    case "review":
      return ["과장/단정 제거", "헷갈림 포인트", "보완 지시"].join(", ");
    case "eval":
      return ["0~100 점수", "항목별 breakdown", "failures/fixes"].join(", ");
    case "ready":
      return ["최종 글 1본", "형식/표현 정리", "게시 후보"].join(", ");
    case "naver":
      return ["네이버용 HTML", "해시태그"].join(", ");
    case "published":
      return ["발행 기록/최종본"].join(", ");
  }
}
