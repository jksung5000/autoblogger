import Link from "next/link";
import { getArtifact } from "../../../lib/store";
import { actionAdvanceStage, actionUpdateArtifact } from "../../../app/actions";

export default async function ArtifactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

        <form action={actionAdvanceStage}>
          <input type="hidden" name="id" value={art.id} />
          <button className="px-4 py-2 rounded bg-black text-white">
            다음 단계로(자동 생성)
          </button>
        </form>
      </header>

      <section className="grid gap-4">
        <form action={actionUpdateArtifact} className="grid gap-3">
          <input type="hidden" name="id" value={art.id} />

          <label className="grid gap-1">
            <span className="text-sm text-neutral-600">제목</span>
            <input
              name="title"
              defaultValue={art.title}
              className="border rounded px-3 py-2"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-neutral-600">본문(마크다운)</span>
            <textarea
              name="bodyMarkdown"
              defaultValue={art.bodyMarkdown}
              className="border rounded px-3 py-2 font-mono min-h-[420px]"
            />
          </label>

          <div>
            <button className="px-4 py-2 rounded border">저장</button>
          </div>
        </form>
      </section>
    </main>
  );
}
