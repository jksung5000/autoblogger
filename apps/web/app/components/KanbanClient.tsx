"use client";

import { useEffect, useMemo, useState } from "react";
import { marked } from "marked";

type Stage =
  | "topic"
  | "outline"
  | "draft"
  | "review"
  | "eval"
  | "ready"
  | "naver"
  | "published";

type SeedType = "tennis" | "weights" | "cases" | "custom";

type Artifact = {
  id: string;
  stage: Stage;
  title: string;
  seedType: SeedType;
  bodyMarkdown: string;
  createdAt: string;
  updatedAt: string;
  running?: boolean;
  loopCount?: number;
  evalScore?: number | null;
};

type SortKey = "updated" | "created" | "title";

const STAGES: Array<{ stage: Stage; n: number; title: string; desc: string }> = [
  { stage: "topic", n: 1, title: "Topic", desc: "토픽 카드(개인 기록/블로그 씨앗)" },
  { stage: "outline", n: 2, title: "Outline", desc: "글 뼈대/섹션 목적" },
  { stage: "draft", n: 3, title: "Draft", desc: "초안(가독성/리듬)" },
  { stage: "review", n: 4, title: "Review", desc: "사람 검토/보완 포인트" },
  { stage: "eval", n: 5, title: "Eval", desc: "점수/리스크 체크(미달 시 loop)" },
  { stage: "ready", n: 6, title: "Ready", desc: "게시 후보(정리/최종)" },
  { stage: "naver", n: 7, title: "Naver", desc: "네이버 업로드 패키지" },
  { stage: "published", n: 8, title: "Published", desc: "발행 기록" },
];

function stageColor(stage: Stage) {
  switch (stage) {
    case "topic":
      return { border: "border-sky-300", head: "bg-sky-50", tag: "bg-sky-100" };
    case "outline":
      return { border: "border-violet-300", head: "bg-violet-50", tag: "bg-violet-100" };
    case "draft":
      return { border: "border-amber-300", head: "bg-amber-50", tag: "bg-amber-100" };
    case "review":
      return { border: "border-fuchsia-300", head: "bg-fuchsia-50", tag: "bg-fuchsia-100" };
    case "eval":
      return { border: "border-rose-300", head: "bg-rose-50", tag: "bg-rose-100" };
    case "ready":
      return { border: "border-emerald-300", head: "bg-emerald-50", tag: "bg-emerald-100" };
    case "naver":
      return { border: "border-lime-300", head: "bg-lime-50", tag: "bg-lime-100" };
    case "published":
      return { border: "border-zinc-300", head: "bg-zinc-50", tag: "bg-zinc-100" };
  }
}

export default function KanbanClient({ initial }: { initial: Artifact[] }) {
  const [artifacts, setArtifacts] = useState<Artifact[]>(initial);
  const [q, setQ] = useState("");
  const [seed, setSeed] = useState<SeedType | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [collapsed, setCollapsed] = useState<Record<Stage, boolean>>(() => {
    try {
      const raw = localStorage.getItem("kanban.collapsed.v2");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [modal, setModal] = useState<{
    kind: "artifact" | "prompt";
    title: string;
    html: string;
  } | null>(null);

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await fetch("/api/artifacts", { cache: "no-store" });
        const json = await res.json();
        setArtifacts(json.artifacts || []);
      } catch {
        // ignore
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    localStorage.setItem("kanban.collapsed.v2", JSON.stringify(collapsed));
  }, [collapsed]);

  const filtered = useMemo(() => {
    const nq = q.trim().toLowerCase();

    let list = artifacts;
    if (seed !== "all") list = list.filter((a) => a.seedType === seed);
    if (nq) {
      list = list.filter((a) =>
        `${a.title}\n${a.bodyMarkdown}`.toLowerCase().includes(nq)
      );
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortKey === "title") return a.title.localeCompare(b.title);
      if (sortKey === "created") return b.createdAt.localeCompare(a.createdAt);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
    return sorted;
  }, [artifacts, q, seed, sortKey]);

  const grouped = useMemo(() => {
    const map = new Map<Stage, Artifact[]>();
    for (const s of STAGES) map.set(s.stage, []);
    for (const a of filtered) {
      map.get(a.stage)?.push(a);
    }
    return map;
  }, [filtered]);

  async function openPrompt(stage: Stage) {
    const res = await fetch(`/api/prompts?stage=${stage}`, { cache: "no-store" });
    const json = await res.json();
    setModal({
      kind: "prompt",
      title: `${stage.toUpperCase()} prompt`,
      html: marked.parse(String(json.text || "")) as string,
    });
  }

  function openArtifact(a: Artifact) {
    setModal({
      kind: "artifact",
      title: `${a.title}  (${a.stage})`,
      html: marked.parse(a.bodyMarkdown || "") as string,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="검색(제목/본문)"
            className="border rounded px-3 py-2 bg-white w-[260px]"
          />
          <select
            value={seed}
            onChange={(e) => setSeed(e.target.value as any)}
            className="border rounded px-3 py-2 bg-white"
          >
            <option value="all">seed: all</option>
            <option value="custom">custom</option>
            <option value="tennis">tennis</option>
            <option value="weights">weights</option>
            <option value="cases">cases</option>
          </select>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as any)}
            className="border rounded px-3 py-2 bg-white"
          >
            <option value="updated">sort: updated</option>
            <option value="created">sort: created</option>
            <option value="title">sort: title</option>
          </select>
        </div>

        <div className="text-sm text-neutral-600">
          cards: <b>{filtered.length}</b>
        </div>
      </div>

      <section className="flex gap-4 overflow-x-auto pb-2">
        {STAGES.map(({ stage, n, title, desc }) => {
          const c = stageColor(stage);
          const isCollapsed = !!collapsed[stage];
          const cards = grouped.get(stage) || [];

          return (
            <div
              key={stage}
              className={`min-w-[320px] max-w-[320px] border rounded bg-white ${c.border}`}
            >
              <div className={`p-3 border-b ${c.head} ${c.border}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-neutral-600">
                      Step {n}
                    </div>
                    <h2 className="font-semibold">
                      {title} <span className="text-xs text-neutral-500">({cards.length})</span>
                    </h2>
                    <p className="text-xs text-neutral-600 mt-1">{desc}</p>
                  </div>

                  <div className="flex flex-col gap-2 items-end">
                    <button
                      className="text-xs px-2 py-1 rounded border bg-white"
                      onClick={() => openPrompt(stage)}
                      title="이 단계 프롬프트 보기"
                    >
                      Prompt
                    </button>
                    <button
                      className="text-xs px-2 py-1 rounded border bg-white"
                      onClick={() =>
                        setCollapsed((prev) => ({ ...prev, [stage]: !prev[stage] }))
                      }
                      title="컬럼 접기/펼치기"
                    >
                      {isCollapsed ? "Expand" : "Collapse"}
                    </button>
                  </div>
                </div>
              </div>

              {isCollapsed ? (
                <div className="p-3 text-sm text-neutral-500">(collapsed)</div>
              ) : (
                <div className="p-3 space-y-2">
                  {cards.length === 0 ? (
                    <p className="text-sm text-neutral-500">비어있음</p>
                  ) : null}

                  {cards.map((a) => {
                    const isLooping = a.stage === "eval" && (a.evalScore ?? 0) < 70;
                    return (
                      <div
                        key={a.id}
                        className={`border rounded p-3 bg-neutral-50 relative ${
                          a.running ? "animate-pulse border-black" : "border-neutral-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            className="font-medium text-left underline underline-offset-2"
                            onClick={() => openArtifact(a)}
                            title="팝업으로 보기"
                          >
                            {a.title}
                          </button>

                          <span className={`text-[11px] px-2 py-0.5 rounded ${c.tag}`}>
                            {a.seedType}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-[11px] text-neutral-600">
                            {a.loopCount ? `loop:${a.loopCount}` : ""}
                            {a.evalScore != null ? ` score:${a.evalScore}` : ""}
                            {isLooping ? "  ↩︎ to topic" : ""}
                          </div>

                          <div className="flex gap-2">
                            <form action={`/artifact/${a.id}`}>
                              <button className="text-xs px-2 py-1 rounded border" title="상세 페이지">
                                ↗
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {modal ? (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-6"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded shadow-lg w-full max-w-3xl max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">{modal.title}</div>
              <button className="text-sm px-2 py-1 border rounded" onClick={() => setModal(null)}>
                닫기
              </button>
            </div>
            <div className="p-4 prose max-w-none" dangerouslySetInnerHTML={{ __html: modal.html }} />
          </div>
        </div>
      ) : null}

      <div className="text-xs text-neutral-500">
        ※ loop/실시간 표현은 MVP 단계에서 “폴링 기반”으로 구현 중입니다(1초마다 상태 갱신).
      </div>
    </div>
  );
}
