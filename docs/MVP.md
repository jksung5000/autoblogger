# MVP — autoblogger

## MVP 목표
"로컬에서 항상 켜져 있고", 운영자가 UI로 들어와서 **Topic → Outline → Draft → Ready**까지 생성/확인/수정하고, 최종 결과로 **네이버 업로드 패키지**를 얻을 수 있다.

## MVP 범위(반드시)
### 1) 프로젝트 구조/설정
- 단일 pnpm workspace
- 환경변수/설정 파일로 경로/포트/데이터 디렉토리 제어

### 2) 데이터 경계
- `data/` : 사람/파이프라인 산출물(일부는 git에 남길 수 있음)
- `var/` : DB/로그/캐시 등 머신 로컬 상태(전부 gitignore)

### 3) 파이프라인(최소 명령)
- `pnpm cli topic:from-input`
- `pnpm cli outline:generate`
- `pnpm cli draft:generate`
- `pnpm cli ready:finalize`
- 각 단계는 id 기반으로 재실행 가능(재현성)

### 4) UI(최소)
- Kanban(스테이지별 카드)
- 카드 상세(본문/메타데이터 보기)
- stage 이동(승인/반려/재생성 트리거)
- Export 버튼: `naver_full.html`, `naver_body.html`, `hashtags.txt`

### 5) 이미지/크레딧(최소)
- Wikimedia에서 1~2장 가져와 삽입 가능
- 크레딧 1줄 정책 준수

## MVP 제외(나중)
- 자동 네이버 업로드
- 고급 평가/스코어링 대시보드
- 외부 사용자/권한/로그인

## Acceptance Criteria
- 새 Mac mini에서 `pnpm i && pnpm dev`만으로 UI가 뜬다.
- UI에서 ready 산출물 1개를 만들고, export 3종 파일이 생성된다.
- `var/` 삭제해도(상태 초기화) `data/` 기반으로 재생성이 가능하다.
