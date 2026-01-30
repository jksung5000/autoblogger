import Link from "next/link";
import { stageExists, readStageMarkdown, readExportIfExists } from "../../../lib/artifactFiles";
import { getArtifact } from "../../../lib/store";
import type { Stage } from "../../../lib/store";

const STAGES: Stage[] = [
  "topic",
  "outline",
  "draft",
  "review",
  "eval",
  "ready",
  "naver",
  "published",
];

function label(stage: Stage) {
  return stage.toUpperCase();
}

function stageAccent(stage: Stage) {
  switch (stage) {
    case "topic":
      return "bg-sky-500";
    case "outline":
      return "bg-violet-500";
    case "draft":
      return "bg-amber-500";
    case "review":
      return "bg-fuchsia-500";
    case "eval":
      return "bg-rose-500";
    case "ready":
      return "bg-emerald-500";
    case "naver":
      return "bg-lime-500";
    case "published":
      return "bg-zinc-600";
  }
}

export default async function FlowPage({
  params,
}: {
  params: Promise<{ baseId: string }>;
}) {
  const { baseId } = await params;

  const base = await getArtifact(baseId);
  const currentStage = base?.stage || "topic";
  const loopCount = base?.loopCount || 0;

  const nodes = await Promise.all(
    STAGES.map(async (s, idx) => {
      const exists = await stageExists(baseId, s);
      const md = exists ? await readStageMarkdown(baseId, s) : "";
      const snippet = md
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .find((l) => !l.startsWith("#"))
        ?.slice(0, 160);

      const hasExports = s === "naver" ? Boolean(await readExportIfExists(baseId, "naver_body.html")) : false;

      return {
        stage: s,
        exists,
        snippet: snippet || "",
        hasExports,
        step: idx + 1,
        isCurrent: s === currentStage,
        accent: stageAccent(s),
      };
    })
  );

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-start justify-between gap-4">
          <div>
            <Link className="underline" href="/">← Kanban</Link>
            <h1 className="text-2xl font-semibold mt-2">Flow</h1>
            <p className="text-sm text-neutral-600 font-mono">{baseId}</p>
            <p className="text-xs text-neutral-500 mt-1">
              current: <b>{currentStage}</b> {loopCount ? `· loops: ${loopCount}` : ""}
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link className="underline" href={`/preview/${baseId}`}>Preview</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-4 max-w-3xl">
          {nodes.map((n, idx) => (
            <div key={n.stage} className="relative pl-10">
              {/* vertical spine */}
              {idx > 0 ? <div className="absolute left-[18px] -top-4 h-4 w-[2px] bg-zinc-300" /> : null}
              {idx < nodes.length - 1 ? <div className="absolute left-[18px] top-8 bottom-0 w-[2px] bg-zinc-300" /> : null}

              {/* node dot */}
              <div className={`absolute left-[10px] top-5 h-4 w-4 rounded-full ring-4 ring-white ${n.accent}`} />

              <div
                className={
                  `rounded-2xl border bg-white shadow-sm overflow-hidden ` +
                  (n.exists ? "" : "opacity-60 ") +
                  (n.isCurrent ? " ring-2 ring-black/10" : "")
                }
              >
                <div className="flex">
                  {/* left accent bar */}
                  <div className={`w-1 ${n.accent}`} />

                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-neutral-500">Step {n.step}</div>
                        <div className="font-semibold flex items-center gap-2">
                          <span>{label(n.stage)}</span>
                          {n.isCurrent ? (
                            <span className="text-[11px] px-2 py-[2px] rounded-full bg-black text-white">current</span>
                          ) : null}
                        </div>
                        {n.snippet ? (
                          <div className="text-sm text-neutral-700 mt-1 break-words">
                            {n.snippet}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-2 items-end shrink-0">
                        <Link className="underline text-sm" href={`/artifact/${baseId}:${n.stage}`}>열기</Link>
                        {(n.stage === "ready" || n.stage === "naver" || n.stage === "published") && n.exists ? (
                          <Link className="underline text-sm" href={`/preview/${baseId}?stage=${n.stage}`}>프리뷰</Link>
                        ) : null}
                        {n.stage === "naver" && n.hasExports ? (
                          <Link className="underline text-sm" href={`/api/exports?baseId=${baseId}`}>exports</Link>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-dashed p-3 text-xs text-neutral-600">
                      목적: {n.stage}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* loop return line (visual) */}
          {loopCount ? (
            <div className="relative pl-10">
              <div className="absolute left-[18px] top-1 h-8 w-[2px] bg-zinc-300" />
              <div className="text-xs text-neutral-500">
                ↩︎ loop 발생({loopCount}) — Eval 결과에 따라 Topic으로 되돌아가 다시 개선합니다.
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
