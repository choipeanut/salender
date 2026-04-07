# STEP 4 Auth + Subscription Notes

## Scope

- Supabase Auth gateway integration
- Login/Logout domain flow
- Brand subscription persistence
- Guest mode merge strategy
- User device registration structure (without push delivery)

## Guest Merge Strategy

지원 전략:

- `preferAccount`: 기존 계정 설정 유지
- `preferGuest`: guest 설정으로 덮어쓰기
- `smartUnion` (default):
  - boolean 알림 항목: OR merge
  - `notifyBeforeEndHours`: 더 이른 시간(`min`) 우선

## Non-goals in STEP 4

- 실제 push 발송
- collector 파이프라인 변경
- 모바일 UI 구조 대규모 변경
