import Link from "next/link";
import { stageExists, readStageMarkdown, readExportIfExists } from "../../../lib/artifactFiles";
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

export default async function FlowPage({
  params,
}: {
  params: Promise<{ baseId: string }>;
}) {
  const { baseId } = await params;

  const nodes = await Promise.all(
    STAGES.map(async (s) => {
      const exists = await stageExists(baseId, s);
      const md = exists ? await readStageMarkdown(baseId, s) : "";
      const snippet = md
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .find((l) => !l.startsWith("#"))
        ?.slice(0, 140);

      const hasExports = s === "naver" ? Boolean(await readExportIfExists(baseId, "naver_body.html")) : false;

      return { stage: s, exists, snippet: snippet || "", hasExports };
    })
  );

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link className="underline" href="/">← Kanban</Link>
          <h1 className="text-2xl font-semibold mt-2">Flow</h1>
          <p className="text-sm text-neutral-600 font-mono">{baseId}</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link className="underline" href={`/preview/${baseId}`}>Preview</Link>
        </div>
      </header>

      <div className="mt-6 grid gap-3 max-w-3xl">
        {nodes.map((n, idx) => (
          <div key={n.stage} className="relative">
            {/* connector line */}
            {idx > 0 ? (
              <div className="absolute -top-3 left-5 h-3 w-[2px] bg-zinc-300" />
            ) : null}

            <div className={`rounded-xl border bg-white p-4 shadow-sm ${n.exists ? "" : "opacity-50"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-neutral-500">Step {idx + 1}</div>
                  <div className="font-semibold">{label(n.stage)}</div>
                  {n.snippet ? <div className="text-sm text-neutral-700 mt-1 line-clamp-2">{n.snippet}</div> : null}
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <Link className="underline text-sm" href={`/artifact/${baseId}:${n.stage}`}>열기</Link>
                  {(n.stage === "ready" || n.stage === "naver" || n.stage === "published") && n.exists ? (
                    <Link className="underline text-sm" href={`/preview/${baseId}?stage=${n.stage}`}>프리뷰</Link>
                  ) : null}
                  {n.stage === "naver" && n.hasExports ? (
                    <Link className="underline text-sm" href={`/api/exports?baseId=${baseId}`}>exports</Link>
                  ) : null}
                </div>
              </div>

              {/* wrap highlight */}
              <div className="mt-3 rounded-lg border border-dashed p-3 text-xs text-neutral-600">
                목적: {n.stage}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
