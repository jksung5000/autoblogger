import Link from "next/link";
import { listArtifacts } from "../lib/store";
import KanbanClient from "./components/KanbanClient";

export default async function Home() {
  const artifacts = await listArtifacts();

  return (
    <main className="p-6 space-y-6 bg-zinc-50 min-h-screen">
      <header className="flex items-start justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">autoblogger</h1>
          <p className="text-sm text-neutral-600">
            Step UI(번호/요약/컬러) + Focus + Prompt viewer + Filter/Sort + Popup
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link className="text-sm underline" href="/settings">
            Settings
          </Link>
        </div>
      </header>

      <KanbanClient initial={artifacts as any} />
    </main>
  );
}
