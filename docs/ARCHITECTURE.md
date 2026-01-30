# Architecture (Clean Architecture) — autoblogger

## Layering
- **Domain**: 글(Artifact), 단계(Stage), 정책(Compliance rules) — 프레임워크/DB/파일시스템에 의존하지 않음
- **Application**: 유스케이스(GenerateOutline, FinalizeReady, ExportNaverPackage)
- **Interface Adapters**: Repo(SQLite), Storage(FS), LLM provider, Image provider
- **Frameworks/Drivers**: Next.js API/UI, CLI, SQLite driver, filesystem

## Key rules
- UI/Next는 Application 유스케이스만 호출한다.
- 경로/파일 I/O는 Storage Adapter를 통해서만 한다.
- DB 접근은 Repo Adapter를 통해서만 한다.

## Processes
- Web server: UI + API
- CLI: 스케줄/수동 실행

## Directories (target)
- `apps/web`: Next.js UI/API
- `packages/domain`: 엔티티/값객체/정책
- `packages/app`: 유스케이스
- `packages/adapters`: fs/sqlite/llm/images 구현체
- `packages/cli`: 커맨드 라우팅
- `data/`: 입력/산출물
- `var/`: 로컬 상태
