import Link from "next/link";
import { readExportIfExists, readStageMarkdown } from "../../../lib/artifactFiles";

function clampStage(s: string | null) {
  const ok = new Set(["ready", "naver", "published"]);
  return ok.has(String(s)) ? String(s) : "ready";
}

function clampView(s: string | null) {
  const ok = new Set(["auto", "pc", "mobile"]);
  return ok.has(String(s)) ? (String(s) as any) : "auto";
}

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ baseId: string }>;
  searchParams: Promise<{ stage?: string; view?: string }>;
}) {
  const { baseId } = await params;
  const sp = await searchParams;
  const stage = clampStage(sp.stage ?? null);
  const view = clampView(sp.view ?? null);

  // for naver/published we prefer exported HTML if exists
  const bodyHtml =
    stage === "naver" || stage === "published"
      ? await readExportIfExists(baseId, "naver_body.html")
      : null;

  const md = await readStageMarkdown(baseId, stage as any);

  const mobileStyle = view === "mobile" ? { width: 420 } : view === "pc" ? { width: 980 } : { width: 820 };

  return (
    <main className="min-h-screen bg-zinc-100">
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link className="text-sm underline" href="/">← Kanban</Link>
            <div className="text-sm text-neutral-600">
              Preview · <b>{stage}</b> · <span className="font-mono">{baseId}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Link className="underline" href={`/preview/${baseId}?stage=${stage}&view=pc`}>PC</Link>
            <Link className="underline" href={`/preview/${baseId}?stage=${stage}&view=mobile`}>Mobile</Link>
            <Link className="underline" href={`/preview/${baseId}?stage=ready&view=${view}`}>Ready</Link>
            <Link className="underline" href={`/preview/${baseId}?stage=naver&view=${view}`}>Naver</Link>
            <Link className="underline" href={`/preview/${baseId}?stage=published&view=${view}`}>Published</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mx-auto" style={mobileStyle}>
          <div className="rounded-xl bg-white shadow-sm border overflow-hidden">
            {bodyHtml ? (
              <div className="p-6" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            ) : (
              <article className="p-6">
                {/* rendered in client popup normally; here show markdown as-is for now */}
                <pre className="whitespace-pre-wrap break-words text-sm">{md}</pre>
              </article>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
