import fs from "fs/promises";
import path from "path";

export type RoutineSlot = {
  name: string;
  time: string; // HH:MM
  prompt: string;
};

export type RoutineSettings = {
  enabled: boolean;
  timezone: string;
  slots: RoutineSlot[];
};

const DEFAULTS: RoutineSettings = {
  enabled: true,
  timezone: "Asia/Seoul",
  slots: [
    {
      name: "테니스 후",
      time: "07:30",
      prompt: "오늘 테니스는 어땠나요? (통증/컨디션/코치 피드백/동작 포인트)",
    },
    {
      name: "오전 진료 후",
      time: "13:30",
      prompt: "오늘 오전 진료에서 인상 깊었던 케이스가 있나요? (익명/핵심 패턴/환자 질문)",
    },
    {
      name: "웨이트 후",
      time: "21:30",
      prompt: "오늘 웨이트는 어땠나요? (루틴/무게/통증/다음에 바꿀 점)",
    },
  ],
};

function repoRoot() {
  return path.resolve(process.cwd(), "../..");
}

function routinePath() {
  return path.join(repoRoot(), "data", "settings", "routine.json");
}

export async function readRoutineSettings(): Promise<RoutineSettings> {
  const p = routinePath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  try {
    const raw = await fs.readFile(p, "utf-8");
    const v = JSON.parse(raw);
    return { ...DEFAULTS, ...v, slots: Array.isArray(v.slots) ? v.slots : DEFAULTS.slots };
  } catch {
    await fs.writeFile(p, JSON.stringify(DEFAULTS, null, 2), "utf-8");
    return DEFAULTS;
  }
}

export async function writeRoutineSettings(value: RoutineSettings) {
  const p = routinePath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(value, null, 2), "utf-8");
}
