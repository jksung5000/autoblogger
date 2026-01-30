import Link from "next/link";
import { listArtifacts, Stage } from "../lib/store";
import { actionCreateArtifact, actionAdvanceStage } from "./actions";

const STAGES: Stage[] = ["topic", "outline", "draft", "ready", "published"];

export default async function Home() {
  const artifacts = await listArtifacts();

  const grouped = Object.fromEntries(
    STAGES.map((s) => [s, artifacts.filter((a) => a.stage === s)])
  ) as Record<Stage, typeof artifacts>;

  return (
    <main className="p-6 space-y-6 bg-zinc-50 min-h-screen">
      <header className="flex items-start justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">autoblogger</h1>
          <p className="text-sm text-neutral-600">
            MVP: UI + data 연결 + stage loop(placeholder 생성)
          </p>
        </div>

        <form action={actionCreateArtifact} className="flex gap-2 items-center">
          <input
            name="title"
            placeholder="새 카드 제목"
            className="border rounded px-3 py-2 bg-white"
          />
          <select name="seedType" className="border rounded px-3 py-2 bg-white">
            <option value="custom">custom</option>
            <option value="tennis">tennis</option>
            <option value="weights">weights</option>
            <option value="cases">cases</option>
          </select>
          <button className="px-4 py-2 rounded bg-black text-white">생성</button>
        </form>
      </header>

      <section className="flex gap-4 overflow-x-auto pb-2">
        {STAGES.map((stage) => (
          <div
            key={stage}
            className="min-w-[300px] max-w-[300px] border rounded p-3 bg-white"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold capitalize">{stage}</h2>
              <span className="text-xs text-neutral-500">
                {grouped[stage].length}
              </span>
            </div>

            <div className="space-y-2">
              {grouped[stage].map((a) => (
                <div key={a.id} className="border rounded p-3 bg-neutral-50">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/artifact/${a.id}`}
                      className="font-medium underline underline-offset-2"
                    >
                      {a.title}
                    </Link>
                    <span className="text-[11px] text-neutral-500">
                      {a.seedType}
                    </span>
                  </div>

                  <div className="mt-2 flex justify-end">
                    <form action={actionAdvanceStage}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="text-xs px-2 py-1 rounded border">
                        다음→
                      </button>
                    </form>
                  </div>
                </div>
              ))}

              {grouped[stage].length === 0 ? (
                <p className="text-sm text-neutral-500">비어있음</p>
              ) : null}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
