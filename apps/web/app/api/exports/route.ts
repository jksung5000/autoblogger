import { NextResponse } from "next/server";
import { readExportIfExists } from "../../../lib/artifactFiles";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const baseId = String(url.searchParams.get("baseId") || "");
  if (!baseId) return NextResponse.json({ ok: false, error: "missing baseId" }, { status: 400 });

  const full = await readExportIfExists(baseId, "naver_full.html");
  const body = await readExportIfExists(baseId, "naver_body.html");
  const hashtags = await readExportIfExists(baseId, "hashtags.txt");

  return NextResponse.json({
    ok: true,
    baseId,
    files: {
      "naver_full.html": full,
      "naver_body.html": body,
      "hashtags.txt": hashtags,
    },
  });
}
