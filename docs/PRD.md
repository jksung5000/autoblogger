# PRD — autoblogger

## 0. One-liner
대화/메모(운동/진료)를 입력으로 받아, **토픽 선정 → 아웃라인/초안 생성 → 검증(의학/레퍼런스/법무) → 네이버 업로드 패키지(HTML+해시태그)**까지 자동화하고, 최종 게시 결정은 사람이 하는 **local-first** 블로그 제작 시스템.

## 1. Goals (성공 기준)
- 형님은 “재료(메모/대화)”만 제공하고, 시스템이 파이프라인을 돌려 **게시 후보(ready)**를 만든다.
- 모든 산출물은 로컬에 남고(재현 가능), UI에서 단계별 결과를 확인/수정/승인할 수 있다.
- 네이버 업로드에 필요한 **본문 HTML + 해시태그 + 이미지 크레딧**이 항상 함께 나온다.

## 2. Non-goals (이번 범위 아님)
- 네이버 계정 로그인/자동 업로드(브라우저 자동화 포함) — 추후.
- 외부 서버 운영/멀티테넌트 SaaS — 추후.
- 완전 자율 게시(사람 승인 없는 publish) — 하지 않음.

## 3. Users
- Primary: 운영자(형님) — 글을 승인/수정/게시 판단.
- Secondary: 내부 사용(로컬 Mac mini에서만), 추후 LAN 접근.

## 4. Core workflows
### 4.1 Input → Topic
- 입력: 운동(테니스/웨이트) 메모, 진료 케이스 메모(비식별)
- 출력: Topic Card (JSON)
- UX 원칙: 질문은 편안하게(open-ended) 시작, 취조형 금지.

### 4.2 Topic → Outline → Draft → Ready
- Outline: 글의 뼈대 + 섹션 목적
- Draft: 초안(가독성/리듬/humanizer 포함)
- Ready: 검증 통과 + 이미지/크레딧/레퍼런스 반영 + 네이버 패키지 생성

### 4.3 Review/Approval
- UI에서 단계별 산출물을 확인하고, 수정/재생성/승인 플로우를 제공.

## 5. Content policy (핵심 합의)
- 글 흐름: 공감(도입) → 구체 정보(중간) → 실천 가이드(마무리)
- 광고처럼 보이지 않게(SEO/법무 준수)
- 이미지 정책:
  - 이미지 아래 라벨/캡션이 본문에 노출되지 않게(alt/caption 비움)
  - 출처는 1줄로 간단히(예: “출처: Wikimedia Commons · CC BY-SA”)

## 6. Compliance / Risk
- 의료/치료 정보는 일반 정보 제공 수준, 과장 금지, 개인별 진단/처방 금지.
- 케이스는 비식별 처리 필수(개인 특정 가능 요소 제거).
- 레퍼런스는 가능한 공신력 있는 출처 우선.

## 7. Data model (초안)
- Artifact: { id, stage, title, seedType, createdAt, updatedAt, paths, metadata }
- Stage: input/topic/outline/draft/ready/published

## 8. Platform/Runtime
- Mac mini (local-first). 나중에 LAN 접근 가능하도록 설계.
- DB: SQLite
- UI: Web dashboard (Next.js)

## 9. Open questions
- published를 git으로 버전관리할지(현행처럼) vs 별도 저장소/폴더.
- 네이버 HTML 템플릿 최종 규격(폰트/줄간격/구분선 등).
