import { NextResponse } from "next/server";
import { readRoutineSettings, writeRoutineSettings } from "../../../../lib/settings";

export async function GET() {
  const value = await readRoutineSettings();
  return NextResponse.json({ value });
}

export async function PUT(req: Request) {
  const body = await req.json();
  await writeRoutineSettings(body.value);
  return NextResponse.json({ ok: true });
}
