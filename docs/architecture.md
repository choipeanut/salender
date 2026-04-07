# Architecture

## 플랫폼

- Mobile: Expo React Native
- Admin Console: Next.js
- Backend: Supabase
- Collector Worker: Node.js + Playwright
- Shared Code: TypeScript Monorepo

## 레이어 개요

- `apps/mobile`: 사용자 앱
- `apps/admin-web`: 운영/관측 콘솔
- `apps/collector-worker`: 브랜드 수집 런타임
- `packages/shared-types`: 앱/백엔드/워커 공통 타입
- `packages/domain`: 도메인 규칙과 유스케이스
- `packages/brand-connectors`: 브랜드별 connector 인터페이스/구현
- `packages/ui`: 공통 UI 컴포넌트

## 데이터 흐름 (요약)

1. Worker가 브랜드별 connector를 실행해 raw 데이터를 수집
2. 정규화/변경 감지를 거쳐 `sale_events`를 갱신
3. 상태 변화 기반으로 `notifications` 큐/이력을 생성
4. API 계층이 모바일 앱/운영 콘솔에 데이터를 제공

## ERD (STEP 1)

### 핵심 엔터티

- `brands`: 서비스에 노출되는 브랜드 마스터
- `brand_sources`: 브랜드별 수집 소스/API/페이지 정의
- `sale_events`: 정규화된 세일 이벤트 본문
- `sale_event_snapshots`: raw/normalized 스냅샷 이력
- `user_brand_subscriptions`: 사용자별 브랜드 구독/알림 정책
- `user_devices`: 푸시 토큰 디바이스 레지스트리
- `notifications`: 사용자 대상 알림 발송/읽음 이력
- `sync_runs`: 수집 실행 단위 로그
- `sync_errors`: 수집 실행 중 에러 로그

### 관계

- `brands (1) -> (N) brand_sources`
- `brands (1) -> (N) sale_events`
- `brand_sources (1) -> (N) sale_events`
- `sale_events (1) -> (N) sale_event_snapshots`
- `auth.users (1) -> (N) user_brand_subscriptions`
- `auth.users (1) -> (N) user_devices`
- `auth.users (1) -> (N) notifications`
- `sale_events (1) -> (N) notifications`
- `brands (1) -> (N) sync_runs`
- `sync_runs (1) -> (N) sync_errors`

### 인덱스/운영 포인트

- `sale_events`: 브랜드/상태/기간/변경시각 조회 인덱스
- `notifications`: 사용자별 수신함 조회 인덱스
- `sync_runs`, `sync_errors`: 운영 콘솔 추적용 시계열 인덱스
- RLS 초안: 공개 조회 테이블(`brands`, `sale_events`)과 사용자 소유 테이블(`user_*`, `notifications`)을 분리