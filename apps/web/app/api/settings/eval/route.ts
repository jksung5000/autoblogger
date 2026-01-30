import { NextResponse } from "next/server";
import { readEvalSettings, writeEvalSettings } from "../../../../lib/evalSettings";

export async function GET() {
  const value = await readEvalSettings();
  return NextResponse.json({ value });
}

export async function PUT(req: Request) {
  const body = await req.json();
  await writeEvalSettings(body.value);
  return NextResponse.json({ ok: true });
}
