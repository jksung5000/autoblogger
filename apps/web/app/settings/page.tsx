import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export default function SettingsIndex() {
  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          사용자 루틴/프롬프트/운영 설정 진입점
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/settings/routine">
          <Card className="hover:bg-accent/30 transition-colors">
            <CardHeader>
              <CardTitle className="text-base">사용자 루틴(시간) 설정</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              시간대별로 어떤 질문/메시지를 보낼지(테니스/진료/웨이트) 설정합니다.
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings/pipeline">
          <Card className="hover:bg-accent/30 transition-colors">
            <CardHeader>
              <CardTitle className="text-base">Pipeline / Eval Loop 설정</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Eval 점수 미달 시 loop 최대 횟수/통과 점수를 설정합니다.
            </CardContent>
          </Card>
        </Link>

        <Link href="/">
          <Card className="hover:bg-accent/30 transition-colors">
            <CardHeader>
              <CardTitle className="text-base">Kanban으로 돌아가기</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              파이프라인 카드 보드로 이동
            </CardContent>
          </Card>
        </Link>
      </div>
    </main>
  );
}
