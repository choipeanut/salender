# Android 설치형 APK 빌드 가이드

## 1) 준비

1. Expo 계정 로그인 필요
2. 프로젝트 루트에서 의존성 설치:
   - `pnpm install`

## 2) APK 빌드 실행

```bash
pnpm --filter @salecalendar/mobile build:android:apk
```

- EAS cloud build가 시작됩니다.
- 완료 후 제공되는 URL에서 APK를 다운로드할 수 있습니다.

## 3) 휴대폰 설치

1. APK 파일 다운로드
2. 안드로이드에서 "알 수 없는 앱 설치 허용" 활성화
3. APK 실행 후 설치

## 4) 참고

- 배포용 AAB 빌드:
  - `pnpm --filter @salecalendar/mobile build:android:aab`
- 앱 패키지명:
  - `com.choipeanut.salender`
