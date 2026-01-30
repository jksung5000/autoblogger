import { NextResponse } from "next/server";
import { readPipelineSettings, writePipelineSettings } from "../../../../lib/pipelineSettings";

export async function GET() {
  const value = await readPipelineSettings();
  return NextResponse.json({ value });
}

export async function PUT(req: Request) {
  const body = await req.json();
  await writePipelineSettings(body.value);
  return NextResponse.json({ ok: true });
}
