"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Switch } from "../../../components/ui/switch";
import { Textarea } from "../../../components/ui/textarea";

type EvalSettings = {
  enabled: boolean;
  weights: {
    structure: number;
    specificity: number;
    humanizer: number;
    medicalLegal: number;
    seo: number;
  };
  notes: string;
};

const DEFAULTS: EvalSettings = {
  enabled: true,
  weights: { structure: 25, specificity: 20, humanizer: 15, medicalLegal: 25, seo: 15 },
  notes: "",
};

export default function EvalSettingsPage() {
  const [value, setValue] = useState<EvalSettings>(DEFAULTS);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/settings/eval", { cache: "no-store" });
      const j = await r.json();
      setValue(j.value);
    })();
  }, []);

  async function onSave() {
    setStatus("saving");
    try {
      await fetch("/api/settings/eval", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value }),
      });
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 900);
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link className="text-sm underline" href="/settings">
            ← Settings
          </Link>
          <h1 className="text-2xl font-semibold mt-2">Eval(평가 방법) 설정</h1>
          <p className="text-sm text-muted-foreground mt-1">
            항목별 가중치/설명(평가 기준)을 조정합니다.
          </p>
        </div>

        <Button onClick={onSave} disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Save"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">활성화</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">OFF면 Eval 항목별 점수 산정/표시가 단순화됩니다.</div>
          <Switch checked={value.enabled} onCheckedChange={(v) => setValue({ ...value, enabled: v })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">가중치(합계 100 권장)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {(
            [
              ["structure", "Structure(공감→정보→실천)"],
              ["specificity", "Specificity(수치/비유)"],
              ["humanizer", "Humanizer(리듬/대화체)"],
              ["medicalLegal", "Medical/Legal"],
              ["seo", "SEO(자연스러움)"],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="grid gap-2">
              <div className="font-medium">{label}</div>
              <Input
                type="number"
                value={value.weights[k]}
                onChange={(e) =>
                  setValue({
                    ...value,
                    weights: { ...value.weights, [k]: Number(e.target.value) },
                  })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">설명/메모</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={value.notes}
            onChange={(e) => setValue({ ...value, notes: e.target.value })}
            className="min-h-[140px]"
            placeholder="평가 기준을 사람이 이해하기 쉽게 적어두세요."
          />
          {status === "error" ? <div className="text-sm text-red-600 mt-2">저장 실패</div> : null}
        </CardContent>
      </Card>
    </main>
  );
}
