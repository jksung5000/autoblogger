import { NextResponse } from "next/server";
import { readPrompt } from "../../../lib/prompts";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const stage = url.searchParams.get("stage") || "topic";
  const text = await readPrompt(stage);
  return NextResponse.json({ stage, text });
}
