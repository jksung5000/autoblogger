import { NextResponse } from "next/server";
import { runPipeline } from "../../../lib/runPipeline";
import { readPipelineSettings } from "../../../lib/pipelineSettings";

export async function POST(req: Request) {
  const body = await req.json();
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });

  const settings = await readPipelineSettings();
  if (!settings.enabled) return NextResponse.json({ ok: false, error: "pipeline disabled" }, { status: 400 });

  // fire-and-forget (dev node server). Updates store progressively for UI polling.
  runPipeline(id).catch((e) => console.error("runPipeline failed", e));

  return NextResponse.json({ ok: true });
}
