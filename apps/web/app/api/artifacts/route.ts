import { NextResponse } from "next/server";
import { listArtifacts } from "../../../lib/store";
import { artifactToStageCards } from "../../../lib/kanban";

export async function GET() {
  const artifacts = await listArtifacts();
  const cards = (await Promise.all(artifacts.map(artifactToStageCards))).flat();
  return NextResponse.json({ artifacts, cards });
}
