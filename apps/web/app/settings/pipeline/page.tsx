"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Switch } from "../../../components/ui/switch";

type PipelineSettings = {
  enabled: boolean;
  maxLoops: number;
  minScore: number;
};

const DEFAULTS: PipelineSettings = {
  enabled: true,
  maxLoops: 5,
  minScore: 70,
};

export default function PipelineSettingsPage() {
  const [value, setValue] = useState<PipelineSettings>(DEFAULTS);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/settings/pipeline", { cache: "no-store" });
      const j = await r.json();
      setValue(j.value);
    })();
  }, []);

  async function onSave() {
    setStatus("saving");
    try {
      await fetch("/api/settings/pipeline", {
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
          <h1 className="text-2xl font-semibold mt-2">Pipeline / Eval Loop 설정</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Eval 점수 기준으로 루프를 최대 N회까지 돌립니다(파일은 같은 카드/폴더를 업데이트).
          </p>
        </div>

        <Button onClick={onSave} disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Save"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">기본</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">파이프라인 실행 활성화</div>
              <div className="text-sm text-muted-foreground">OFF면 Run 버튼이 동작하지 않습니다.</div>
            </div>
            <Switch checked={value.enabled} onCheckedChange={(v) => setValue({ ...value, enabled: v })} />
          </div>

          <div className="grid gap-2">
            <div className="font-medium">최대 루프 횟수(maxLoops)</div>
            <Input
              type="number"
              value={value.maxLoops}
              onChange={(e) => setValue({ ...value, maxLoops: Number(e.target.value) })}
            />
          </div>

          <div className="grid gap-2">
            <div className="font-medium">통과 점수(minScore)</div>
            <Input
              type="number"
              value={value.minScore}
              onChange={(e) => setValue({ ...value, minScore: Number(e.target.value) })}
            />
          </div>

          {status === "error" ? <div className="text-sm text-red-600">저장 실패</div> : null}
        </CardContent>
      </Card>
    </main>
  );
}
