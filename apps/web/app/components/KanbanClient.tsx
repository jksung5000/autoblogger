"use client";

import { useEffect, useMemo, useState } from "react";
import { marked } from "marked";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Separator } from "../../components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../../components/ui/sheet";
import { Switch } from "../../components/ui/switch";
import { useUiSettings } from "./UiSettings";

type Stage =
  | "topic"
  | "outline"
  | "draft"
  | "review"
  | "eval"
  | "ready"
  | "naver"
  | "published";

type PromptKey = Stage | "system";

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
  evalBreakdown?: {
    structure?: number;
    specificity?: number;
    humanizer?: number;
    medicalLegal?: number;
    seo?: number;
  } | null;
  evalReasons?: string[];
  evalFixes?: string[];
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
  const { settings, setSettings } = useUiSettings();
  const [artifacts, setArtifacts] = useState<Artifact[]>(initial);
  const [q, setQ] = useState("");
  const [seed, setSeed] = useState<SeedType | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [collapsed, setCollapsed] = useState<Record<Stage, boolean>>(() => {
    try {
      const raw = localStorage.getItem("kanban.collapsed.v3");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [modal, setModal] = useState<{
    kind: "artifact" | "prompt" | "eval";
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
    localStorage.setItem("kanban.collapsed.v3", JSON.stringify(collapsed));
  }, [collapsed]);

  function isFocusMode(map: Record<Stage, boolean>) {
    const values = STAGES.map((s) => !!map[s.stage]);
    const collapsedCount = values.filter(Boolean).length;
    return collapsedCount > 0 && collapsedCount < values.length;
  }

  function focusAround(target: Stage) {
    const idx = STAGES.findIndex((s) => s.stage === target);
    const keep = new Set<Stage>();
    if (idx >= 0) {
      keep.add(STAGES[idx].stage);
      if (idx - 1 >= 0) keep.add(STAGES[idx - 1].stage);
      if (idx + 1 < STAGES.length) keep.add(STAGES[idx + 1].stage);
    } else {
      keep.add(target);
    }

    const next: Record<Stage, boolean> = {} as any;
    for (const s of STAGES) next[s.stage] = !keep.has(s.stage);
    return next;
  }

  function expandAll() {
    const next: Record<Stage, boolean> = {} as any;
    for (const s of STAGES) next[s.stage] = false;
    return next;
  }

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

  async function openPrompt(key: PromptKey) {
    const res = await fetch(`/api/prompts?stage=${key}`, { cache: "no-store" });
    const json = await res.json();
    const label = key === "system" ? "SYSTEM" : key.toUpperCase();
    setModal({
      kind: "prompt",
      title: `${label} prompt`,
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

  function openEval(a: Artifact) {
    const md =
      `# Eval Report\n\n` +
      `- score: ${a.evalScore ?? "-"}\n` +
      (a.evalBreakdown
        ? `\n## breakdown\n` +
          `- structure: ${a.evalBreakdown.structure ?? "-"}\n` +
          `- specificity: ${a.evalBreakdown.specificity ?? "-"}\n` +
          `- humanizer: ${a.evalBreakdown.humanizer ?? "-"}\n` +
          `- medicalLegal: ${a.evalBreakdown.medicalLegal ?? "-"}\n` +
          `- seo: ${a.evalBreakdown.seo ?? "-"}\n`
        : "") +
      (a.evalReasons?.length
        ? `\n## why\n` + a.evalReasons.map((r) => `- ${r}`).join("\n") + "\n"
        : "") +
      (a.evalFixes?.length
        ? `\n## fixes\n` + a.evalFixes.map((f) => `- ${f}`).join("\n") + "\n"
        : "");

    setModal({
      kind: "eval",
      title: `${a.title} (Eval)` ,
      html: marked.parse(md) as string,
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => openPrompt("system")}>
                System Prompt
              </Button>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">UI Settings</Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[360px]">
                  <SheetHeader>
                    <SheetTitle>UI Settings</SheetTitle>
                  </SheetHeader>

                  <div className="mt-6 grid gap-6 text-sm">
                    <div className="grid gap-2">
                      <div className="font-medium">Theme</div>
                      <div className="flex items-center justify-between">
                        <div className="text-muted-foreground">Dark mode</div>
                        <Switch
                          checked={settings.theme === "dark"}
                          onCheckedChange={(v) =>
                            setSettings((prev) => ({ ...prev, theme: v ? "dark" : "light" }))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <div className="font-medium">Column width</div>
                      <div className="text-muted-foreground">{settings.columnWidth}px</div>
                      <input
                        type="range"
                        min={260}
                        max={520}
                        value={settings.columnWidth}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, columnWidth: Number(e.target.value) }))
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <div className="font-medium">Density</div>
                      <Select
                        value={settings.density}
                        onValueChange={(v) =>
                          setSettings((prev) => ({ ...prev, density: v as any }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="density" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="comfortable">comfortable</SelectItem>
                          <SelectItem value="compact">compact</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <div className="font-medium">Reset</div>
                      <Button
                        variant="outline"
                        onClick={() =>
                          setSettings({ theme: "light", columnWidth: 320, density: "comfortable" })
                        }
                      >
                        Reset to default
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="text-sm text-muted-foreground">
                cards: <b className="text-foreground">{filtered.length}</b>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="검색(제목/본문)"
                className="w-[260px]"
              />

              <Select value={seed} onValueChange={(v) => setSeed(v as any)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="seed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">seed: all</SelectItem>
                  <SelectItem value="custom">custom</SelectItem>
                  <SelectItem value="tennis">tennis</SelectItem>
                  <SelectItem value="weights">weights</SelectItem>
                  <SelectItem value="cases">cases</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortKey} onValueChange={(v) => setSortKey(v as any)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">sort: updated</SelectItem>
                  <SelectItem value="created">sort: created</SelectItem>
                  <SelectItem value="title">sort: title</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />
          <CardTitle className="text-base">Kanban</CardTitle>
        </CardHeader>
      </Card>

      <section
        className={`flex gap-4 overflow-x-auto pb-2 ${
          settings.density === "compact" ? "[&_.col-body]:p-2" : ""
        }`}
        style={{ width: "100%" }}
      >
        {STAGES.map(({ stage, n, title, desc }) => {
          const c = stageColor(stage);
          const isCollapsed = !!collapsed[stage];
          const cards = grouped.get(stage) || [];

          const colWidth = isCollapsed ? 56 : undefined;

          return (
            <Card
              key={stage}
              className={`${c.border} ${isCollapsed ? "overflow-hidden" : ""}`}
              style={
                isCollapsed
                  ? { minWidth: colWidth, maxWidth: colWidth }
                  : { minWidth: "var(--kanban-col-width)", maxWidth: "var(--kanban-col-width)" }
              }
            >
              <CardHeader className={`border-b ${c.head} ${c.border} ${isCollapsed ? "p-2" : "space-y-2"}`}>
                {isCollapsed ? (
                  <button
                    className="w-full h-[260px] flex items-center justify-center"
                    onClick={() => setCollapsed((prev) => ({ ...prev, [stage]: false }))}
                    title="펼치기"
                  >
                    <div
                      className="text-xs font-semibold tracking-wide text-muted-foreground"
                      style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
                    >
                      {`Step ${n} · ${title}`}
                    </div>
                  </button>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Step {n}</div>
                      <CardTitle className="text-base">
                        {title} <span className="text-xs text-muted-foreground">({cards.length})</span>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                    </div>

                    <div className="flex flex-col gap-2 items-end">
                      {stage === "eval" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => (window.location.href = "/settings/eval")}
                          title="평가 방법(가중치/기준) 설정"
                        >
                          Eval Settings
                        </Button>
                      ) : null}
                      <Button variant="outline" size="sm" onClick={() => openPrompt(stage)}>
                        Prompt
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCollapsed((prev) => {
                            const focused = isFocusMode(prev);
                            const allCollapsedOrAllOpen =
                              STAGES.every((s) => !!prev[s.stage]) ||
                              STAGES.every((s) => !prev[s.stage]);

                            if (!focused && allCollapsedOrAllOpen) return focusAround(stage);
                            return expandAll();
                          })
                        }
                        title="좌우 collapse: 해당 컬럼과 좌/우만 남기고 접기 (토글)"
                      >
                        Focus
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>

              {isCollapsed ? null : (
                <CardContent className="col-body p-3 space-y-2">
                  {cards.length === 0 ? (
                    <p className="text-sm text-neutral-500">비어있음</p>
                  ) : null}

                  {cards.map((a) => {
                    const isLooping = a.stage === "eval" && (a.evalScore ?? 0) < 70;
                    return (
                      <Card
                        key={a.id}
                        className={`bg-muted/40 relative ${
                          a.running ? "animate-pulse ring-2 ring-primary" : ""
                        }`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <Button
                              variant="link"
                              className="p-0 h-auto font-medium text-left"
                              onClick={() => openArtifact(a)}
                              title="팝업으로 보기"
                            >
                              {a.title}
                            </Button>

                            <Badge variant="secondary" className="text-[11px]">
                              {a.seedType}
                            </Badge>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                              {a.loopCount ? <span>{`loop:${a.loopCount}`}</span> : null}
                              {a.evalScore != null ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2 text-[11px]"
                                  onClick={() => openEval(a)}
                                  title="Eval 상세(항목별 점수/이유/개선)"
                                >
                                  score: {a.evalScore}
                                </Button>
                              ) : null}
                              {isLooping ? "↩︎ to topic" : ""}
                            </div>

                            <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              title="Run full pipeline"
                              onClick={async () => {
                                await fetch("/api/run", {
                                  method: "POST",
                                  headers: { "content-type": "application/json" },
                                  body: JSON.stringify({ id: a.id }),
                                });
                              }}
                            >
                              Run
                            </Button>

                            <form action={`/artifact/${a.id}`}>
                              <Button variant="outline" size="sm" title="상세 페이지">
                                ↗
                              </Button>
                            </form>
                          </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          );
        })}
      </section>

      <Dialog open={!!modal} onOpenChange={(open) => (!open ? setModal(null) : null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{modal?.title}</DialogTitle>
          </DialogHeader>
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: modal?.html || "" }}
          />
        </DialogContent>
      </Dialog>

      <div className="text-xs text-neutral-500">
        ※ loop/실시간 표현은 MVP 단계에서 “폴링 기반”으로 구현 중입니다(1초마다 상태 갱신).
      </div>
    </div>
  );
}
