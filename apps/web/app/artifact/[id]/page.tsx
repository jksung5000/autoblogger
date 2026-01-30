import Link from "next/link";
import { getArtifact } from "../../../lib/store";
import { readStageMarkdown } from "../../../lib/artifactFiles";

function parseId(id: string) {
  const m = String(id).split(":");
  if (m.length >= 2) {
    return { baseId: m[0], stage: m[1] };
  }
  return { baseId: id, stage: null as string | null };
}

export default async function ArtifactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsed = parseId(id);

  // stage-card view (baseId:stage) — read from saved stage markdown
  if (parsed.stage) {
    const stage = parsed.stage as any;
    const md = await readStageMarkdown(parsed.baseId, stage);

    return (
      <main className="p-6 space-y-6 bg-zinc-50 min-h-screen">
        <header className="flex items-start justify-between gap-4">
          <div>
            <Link className="underline" href="/">
              ← Kanban
            </Link>
            <h1 className="text-2xl font-semibold mt-2">{parsed.baseId}</h1>
            <p className="text-sm text-neutral-600">stage: <b>{stage}</b></p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link className="underline" href={`/flow/${parsed.baseId}`}>Flow</Link>
            {(stage === "ready" || stage === "naver" || stage === "published") ? (
              <Link className="underline" href={`/preview/${parsed.baseId}?stage=${stage}`}>Preview</Link>
            ) : null}
          </div>
        </header>

        <section className="rounded-xl border bg-white shadow-sm p-4">
          <pre className="whitespace-pre-wrap break-words text-sm">{md}</pre>
        </section>
      </main>
    );
  }

  // base artifact edit view (legacy)
  const art = await getArtifact(id);

  if (!art) {
    return (
      <main className="p-6">
        <p className="mb-4">Artifact not found.</p>
        <Link className="underline" href="/">
          Back
        </Link>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <Link className="underline" href="/">
            ← Kanban
          </Link>
          <h1 className="text-2xl font-semibold mt-2">{art.title}</h1>
          <p className="text-sm text-neutral-500">
            stage: <b>{art.stage}</b> · seed: {art.seedType}
          </p>
        </div>

        <div className="flex gap-3 text-sm">
          <Link className="underline" href={`/flow/${art.id}`}>Flow</Link>
          <Link className="underline" href={`/preview/${art.id}`}>Preview</Link>
        </div>
      </header>

      <section className="rounded-xl border bg-white shadow-sm p-4">
        <pre className="whitespace-pre-wrap break-words text-sm">{art.bodyMarkdown}</pre>
      </section>
    </main>
  );
}
