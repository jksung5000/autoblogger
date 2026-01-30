import { NextResponse } from "next/server";
import { listArtifacts } from "../../../lib/store";

export async function GET() {
  const artifacts = await listArtifacts();
  return NextResponse.json({ artifacts });
}
