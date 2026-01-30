"use server";

import { revalidatePath } from "next/cache";
import {
  createArtifact,
  getArtifact,
  updateArtifact,
  advanceArtifactStage,
} from "../lib/store";

export async function actionCreateArtifact(formData: FormData) {
  const title = String(formData.get("title") || "Untitled").trim();
  const seedTypeRaw = String(formData.get("seedType") || "custom");
  const seedType = ["tennis", "weights", "cases", "custom"].includes(seedTypeRaw)
    ? (seedTypeRaw as any)
    : "custom";

  await createArtifact({ title, seedType });
  revalidatePath("/");
}

export async function actionUpdateArtifact(formData: FormData) {
  const id = String(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  const bodyMarkdown = String(formData.get("bodyMarkdown") || "");
  if (!id) return;
  await updateArtifact(id, { title, bodyMarkdown });
  revalidatePath(`/artifact/${id}`);
  revalidatePath("/");
}

export async function actionAdvanceStage(formData: FormData) {
  const id = String(formData.get("id"));
  if (!id) return;

  const art = await getArtifact(id);
  if (!art) return;

  await advanceArtifactStage(id);
  revalidatePath(`/artifact/${id}`);
  revalidatePath("/");
}
