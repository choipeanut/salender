# SaleCalendar

브랜드 세일 정보를 캘린더 형태로 제공하는 모바일 앱/운영 콘솔/수집기 프로젝트입니다.

현재 상태: `STEP 0` 완료 기준으로 모노레포 뼈대와 공통 개발 환경만 구성되어 있습니다.

## Workspace 구조

```text
apps/
  mobile/
  admin-web/
  collector-worker/
packages/
  shared-types/
  ui/
  brand-connectors/
  domain/
supabase/
  migrations/
  seed.sql
  functions/
docs/
  product-spec.md
  architecture.md
  api-contract.md
```

## 시작하기

```bash
pnpm install
pnpm lint
pnpm test
pnpm build
```

## STEP 0에서 제공되는 것

- `pnpm` workspace 기반 모노레포 뼈대
- TypeScript strict 모드 공통 설정
- ESLint/Prettier/Vitest 기본 설정
- 문서 초안(`docs/product-spec.md`, `docs/architecture.md`, `docs/api-contract.md`)

## 다음 TODO (STEP 1)

- Supabase 스키마/마이그레이션 작성
- seed 데이터 추가
- shared-types에 도메인 타입 반영
