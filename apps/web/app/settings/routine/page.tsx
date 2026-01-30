"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Switch } from "../../../components/ui/switch";

type RoutineSlot = { name: string; time: string; prompt: string };

type RoutineSettings = {
  enabled: boolean;
  timezone: string;
  slots: RoutineSlot[];
};

const DEFAULTS: RoutineSettings = {
  enabled: true,
  timezone: "Asia/Seoul",
  slots: [],
};

export default function RoutineSettingsPage() {
  const [value, setValue] = useState<RoutineSettings>(DEFAULTS);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/settings/routine", { cache: "no-store" });
      const j = await r.json();
      setValue(j.value);
    })();
  }, []);

  async function onSave() {
    setStatus("saving");
    try {
      await fetch("/api/settings/routine", {
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
          <h1 className="text-2xl font-semibold mt-2">사용자 루틴(시간) 설정</h1>
          <p className="text-sm text-muted-foreground mt-1">
            이 설정을 기반으로 (나중에) 시간 맞춰 자동 메시지/질문을 보냅니다.
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
              <div className="font-medium">루틴 메시지 활성화</div>
              <div className="text-sm text-muted-foreground">
                OFF면 스케줄러가 아무 메시지도 보내지 않습니다.
              </div>
            </div>
            <Switch
              checked={value.enabled}
              onCheckedChange={(v) => setValue({ ...value, enabled: v })}
            />
          </div>

          <div className="grid gap-2">
            <div className="font-medium">Timezone</div>
            <Input
              value={value.timezone}
              onChange={(e) => setValue({ ...value, timezone: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">슬롯</h2>
          <Button
            variant="outline"
            onClick={() =>
              setValue({
                ...value,
                slots: [...value.slots, { name: "새 슬롯", time: "09:00", prompt: "" }],
              })
            }
          >
            + 슬롯 추가
          </Button>
        </div>

        <div className="grid gap-3">
          {value.slots.map((s, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle className="text-base">{s.name || `slot ${idx + 1}`}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2">
                    <div className="text-sm text-muted-foreground">이름</div>
                    <Input
                      value={s.name}
                      onChange={(e) => {
                        const slots = [...value.slots];
                        slots[idx] = { ...slots[idx], name: e.target.value };
                        setValue({ ...value, slots });
                      }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm text-muted-foreground">시간(HH:MM)</div>
                    <Input
                      value={s.time}
                      onChange={(e) => {
                        const slots = [...value.slots];
                        slots[idx] = { ...slots[idx], time: e.target.value };
                        setValue({ ...value, slots });
                      }}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="text-sm text-muted-foreground">보낼 질문/프롬프트</div>
                  <Textarea
                    value={s.prompt}
                    onChange={(e) => {
                      const slots = [...value.slots];
                      slots[idx] = { ...slots[idx], prompt: e.target.value };
                      setValue({ ...value, slots });
                    }}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const slots = value.slots.filter((_, i) => i !== idx);
                      setValue({ ...value, slots });
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {status === "error" ? (
          <div className="text-sm text-red-600">저장 실패. 다시 시도해주세요.</div>
        ) : null}
      </div>
    </main>
  );
}
