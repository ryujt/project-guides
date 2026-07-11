# 프론트엔드 사용자·회원 시스템 설계 생성 프롬프트

> **회원제 사이트에 공통으로 필요한 프론트엔드 사용자 영역과 프론트엔드 구현에 필요한 백엔드·데이터 계약을 설계하는** 작업 지시문이다. 이 프롬프트에 **대상 프로젝트·요구사항**을 입력하고, 기존 프로젝트나 참고 구현이 있으면 **코드·문서 경로**를 함께 제공해 실행한다.
> 기본 범위는 회원가입·연락처 소유 검증·로그인·로그아웃·세션 복원/갱신·계정 복구·자기 정보 조회/수정·비밀번호 변경·회원 탈퇴다. 실명확인/KYC, 소셜 로그인, 다중 인증(MFA), 조직/역할 관리는 요구사항이 있을 때 확장한다.
> 기본 회원 데이터 저장소는 **DynamoDB**다. 복잡한 조인·다중 엔터티 트랜잭션·강한 관계 무결성이 핵심인 비즈니스 데이터만 근거를 남기고 RDS로 분리한다. "DynamoDB 사용"을 "인증 직접 구현"으로 해석하지 않는다.
> 이 프롬프트는 **설계 문서 생성용**이다. 회원 영역과 무관한 전체 백엔드·비즈니스 기능을 재설계하거나 구현하지 않는다. 시스템 전체 재설계가 필요하면 [AS-IS 프롬프트](./system-design-as-is-prompt.md) → [TO-BE 프롬프트](./system-design-to-be-prompt.md)로 전환한다.
> 원칙: **두괄식 · 다이어그램 1차 표현 · 근거와 제안 분리 · 보편적 명명 · 간결하고 쉬운 설명**. 산출물은 **간명한 핵심 문서 + 상세 파일 2계층**으로 작성한다 — 핵심 문서는 처음 읽는 사람이 5~10분 안에 전체 구조와 핵심 결정을 파악하는 문서고, 계약·데이터·검증의 깊이는 전부 상세 파일에 담는다. 종료는 정성 판단이 아니라 아래 설계-검증 게이트로 판정한다.

## 입력

가능한 입력을 먼저 수집한다. 제공되지 않은 값은 코드·문서에서 확인하고, 확인할 수 없으면 가정과 영향을 명시한다.

| 입력 | 확인할 내용 |
|---|---|
| 대상 프로젝트 | 루트 경로, 프레임워크, 라우터, 상태 관리, API 클라이언트, 배포 구조 |
| 제품 요구사항 | 사용자 유형, 가입 자격, 로그인 식별자, 필수 검증 채널, 권한, 성공 기준 |
| 인증 방식 | 관리형 Identity Provider(IdP), 자체 인증 서비스, 비밀번호, 패스키, 소셜 로그인 적용 여부 |
| 세션 정책 | access/refresh 방식, 만료·유휴 시간, 기기 수, 전체 로그아웃, 재인증 조건 |
| 개인정보 정책 | 수집 필드, 필수/선택 동의, 보유 기간, 탈퇴 유예, 익명화, 법적 보존 |
| 참고 구현 | 코드·문서 경로, 참고할 흐름, 복제하면 안 되는 서비스 고유 규칙 |
| 비즈니스 저장소 | DynamoDB 외 RDS 사용 영역, 데이터 소유권, 기존 연동 계약 |

로그인 식별자(사용자명/이메일/휴대폰), 검증 채널, 탈퇴 방식(즉시/유예/익명화)은 결과를 크게 바꾸므로 반드시 입력 또는 명시적 가정으로 확정한다.

## 설계 의미·표기는 가이드를 따른다

| 가이드 | 이 프롬프트에서의 역할 |
|---|---|
| [method-R.md](../guides/method-R.md) | 사용자 시스템 경계→서비스→프론트엔드 모듈의 하향 분해와 통신 방식 |
| [system-design-framework.md](../guides/system-design-framework.md) | Input Datas부터 Screen Layout까지 8섹션 산출물 골격 |
| [orchestrator-worker-pattern-guide.md](../guides/orchestrator-worker-pattern-guide.md) | UI 흐름 조율자·검증기·API gateway·세션 서비스의 책임 분리 |
| [architecture-pattern-diagram-guide.md](../guides/architecture-pattern-diagram-guide.md) | 설계 내용 성격에 맞는 다이어그램 선택 |
| [job-flow-diagram-guide.md](../guides/job-flow-diagram-guide.md) | 객체 호출·이벤트·반환값 흐름의 `jobflow` DSL |
| [navigation-diagram-guide.md](../guides/navigation-diagram-guide.md) | Page·API·화면 이동 판단의 `navigation` DSL |
| [state-diagram-guide.md](../guides/state-diagram-guide.md) | 계정·세션·화면 내부 상태의 `state` DSL |
| [screen-layout-guide.md](../guides/screen-layout-guide.md) | 페이지 구조의 `layout` DSL |
| [project-structure-guide.md](../guides/project-structure-guide.md) | 프론트엔드 feature 중심 모듈 배치와 파일 명명 |

## 다이어그램 표기

가이드의 확장 DSL 펜스(`jobflow`·`navigation`·`state`·`layout`)를 그대로 사용한다. 다른 형식으로 변환·치환하지 않는다.

| 설계 내용 | 표기 |
|---|---|
| 사용자 시스템 경계·신뢰 경계·모듈 조감 | Mermaid `flowchart` |
| 논리 데이터 관계 | Mermaid `erDiagram` |
| 객체 호출·이벤트·결과 연결 | `jobflow` |
| 화면·API·이동 판단 | `navigation` |
| 계정·세션·challenge·화면 내부 상태 | `state` |
| 페이지 구조 | `layout` |

- `jobflow` 첫 줄은 단일 조율자가 있으면 `orchestrator: X`, 자율 협력 경계면 `scope: X`로 쓴다. 모든 객체를 `Object:`에 선언하고, 매 단계 조율자로 되돌아가는 round-trip 표기를 금지한다.
- `navigation`에는 라우트가 있는 Page, 사용자에게 보이는 주요 오버레이, 이동을 결정하는 API/처리만 둔다. 내부 모듈 협력은 넣지 않는다. API는 `(/auth/login)`, 판단은 `(validate_form)`, 데이터는 백틱 노드로 표기하고 분기 라벨 뒤에 괄호를 쓰지 않는다.
- `state`는 `<s>` 시작, `(State)` 상태, 괄호 없는 Action, `<e>` 종료를 사용한다. 다른 Page로의 이동은 넣지 않는다.
- `layout`은 네비게이션에 등장한 모든 Page를 대상으로 한다. 좌표·픽셀·스타일 값은 넣지 않는다.
- 모든 다이어그램 바로 아래에는 핵심 흐름을 3~6개의 짧은 문장 불릿으로 설명한다.
- ASCII 박스·트리 다이어그램은 금지한다. DynamoDB 물리 설계를 관계형 ERD 하나로 대신하지 않는다.

---

## 0. 한눈에 보기 — 분석부터 검증까지

```mermaid
flowchart TB
  IN["입력 확정<br/>요구사항 · 코드/문서 · 참고 구현"]
  S0["Step 0 · 범위 확정<br/>FR · 가정 · 성공 기준 · 비목표"]
  S1["Step 1 · 근거 분석<br/>현재 흐름 · 채택/일반화/제외"]
  S2["Step 2 · 사용자 시스템 설계<br/>화면 · 상태 · 계약 · 보안"]
  S3["Step 3 · 저장소 설계<br/>DynamoDB 기본 · RDS 예외 경계"]
  DOC["Step 4 · 설계 문서 세트<br/>간명한 핵심 문서 + 상세 파일"]
  GATE{"자가검증 게이트<br/>FR 추적 · 시나리오 커버 · P0/P1 0"}
  FIX["지적된 섹션만 수리"]
  DONE["종료 · 보류 항목과 구현 인계 보고"]
  IN --> S0 --> S1 --> S2 --> S3 --> DOC --> GATE
  GATE -->|dirty| FIX --> GATE
  GATE -->|clean| DONE
  classDef prep fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
  classDef main fill:#fef3c7,stroke:#a16207,color:#713f12
  classDef gate fill:#fde68a,stroke:#a16207,stroke-width:3px,color:#713f12
  classDef done fill:#bbf7d0,stroke:#15803d,stroke-width:3px,color:#14532d
  class IN,S0,S1 prep
  class S2,S3,DOC,FIX main
  class GATE gate
  class DONE done
```

**요지**

- 기존 구현은 근거로 분석하되, 최종 설계에는 서비스 고유 명칭·라우트·스키마·취약한 인증 방식을 복제하지 않는다.
- 프론트엔드는 인증 상태와 사용자 경험을 조율하지만, 인증·인가의 최종 권위는 서버에 둔다.
- 회원·프로필·식별자·동의와 애플리케이션이 소유하는 세션 메타데이터는 DynamoDB를 기본값으로 설계한다.
- 모든 요구사항을 적용 가능한 화면·API·상태·데이터·테스트까지 추적하고, 비적용은 사유를 남긴 뒤 누락이 0일 때 종료한다.

---

## 공통 기준 네비게이션 — 실제 설계 베이스라인

아래 다이어그램은 특정 서비스의 구현을 복제한 예시가 아니라, 회원제 웹사이트에서 공통으로 출발할 **실질적인 기준 흐름**이다. 대상 프로젝트를 설계할 때 실제 라우트·인증 방식·정책으로 치환하되, 제외하는 분기는 `제외 근거 · 대체 흐름 · 관련 FR`을 남긴다. 관리형 IdP SDK를 쓰는 경우에도 사용자에게 보이는 화면 이동과 논리 API 계약은 같은 수준으로 표현한다.

### 화면 색인

| 표기 | 기준 라우트/위치 | 접근 | 역할 |
|---|---|---|---|
| `LandingPage` | `/` | 공개 | 로그인·회원가입·보호 기능 진입점 |
| `SignupTermsPage` | `/signup/terms` | 게스트 전용 | 약관·동의 선택 및 최신 버전 로드 |
| `SignupFormPage` | `/signup` | 게스트 전용 | 가입 식별자·프로필·자격 증명 입력 |
| `ContactVerificationPage` | `/verify-contact` | 제한 세션 | 이메일·휴대폰 소유 검증과 재발송 |
| `LoginPage` | `/login` | 게스트 전용 | 로그인과 안전한 원래 목적지 복귀 |
| `ForgotPasswordPage` | `/forgot-password` | 공개 | 계정 존재를 노출하지 않는 복구 요청 |
| `ResetPasswordPage` | `/reset-password` | 일회성 제한 접근 | reset token 교환과 새 비밀번호 설정 |
| `LogoutPendingPage` | `/logout-pending` | 인증 불확실 | 네트워크 단절로 cookie 폐기를 확인하지 못한 로그아웃 재시도 |
| `ApplicationHomePage` | 프로젝트별 | 인증 필요 | 로그인 후 기본 목적지 |
| `ProtectedPage` | 요청한 보호 라우트 | 인증 필요 | 딥링크로 진입한 원래 목적지의 대표 표기 |
| `AccountPage` | `/account` | 인증 필요 | 자기 정보·보안·세션·탈퇴 진입점 |
| `ProfileEditPage` | `/account/profile` | 인증 필요 | 일반 프로필과 로그인 식별자 변경 |
| `SecurityPage` | `/account/security` | 인증 필요 | 비밀번호·MFA 등 보안 설정 |
| `SessionsPage` | `/account/sessions` | 인증 필요 | 기기/세션 목록과 선택·전체 폐기 |
| `WithdrawalPage` | `/account/withdrawal` | 인증 필요 | 탈퇴 영향 확인, 최종 요청 직전 재인증 |
| `DeletionPendingPage` | `/account/deletion-pending` | 제한 접근 | 유예 중 상태 확인과 취소 |
| `DeletionCompletePage` | `/account/deletion-complete` | 공개 또는 일회성 접근 | 삭제·익명화 완료 안내 |

`Page(Component)` 표기는 라우트 이동 없이 Page 내부의 오류·확인·완료 컴포넌트가 바뀌는 경우다. 프로젝트가 한 Page의 탭으로 구성되어 있으면 Page를 날조하지 말고 이 표기법으로 합친다.

### 1. 공개 진입·보호 라우트

```navigation
Browser --> LandingPage : 사이트 진입
LandingPage --> SignupTermsPage : 회원가입 선택
LandingPage --> LoginPage : 로그인 선택
LandingPage --> (guard_requested_route) : 보호 기능 CTA 선택
Browser --> (guard_requested_route) : 보호 또는 게스트 전용 URL 직접 진입
(guard_requested_route) --> (/auth/session)
(/auth/session) --> ProtectedPage : active_protected
(/auth/session) --> ApplicationHomePage : active_guest
(/auth/session) --> LoginPage : anonymous_protected
(/auth/session) --> LoginPage : anonymous_login
(/auth/session) --> SignupTermsPage : anonymous_signup
(/auth/session) --> LoginPage : expired
(/auth/session) --> LoginPage(AccountStatusHelp) : locked
(/auth/session) --> LoginPage(AccountStatusHelp) : suspended
(/auth/session) --> DeletionPendingPage : deletion_pending
(/auth/session) --> LoginPage(SessionCheckError) : network_error
(/auth/session) --> LoginPage(SessionCheckError) : server_error
LoginPage(SessionCheckError) --> (guard_requested_route) : 다시 시도
```

- 보호 라우트는 세션 복원이 끝나기 전까지 민감 화면·데이터를 렌더링하지 않는다.
- 인증되지 않은 딥링크의 목적지는 내부 허용 목록을 통과한 `returnTo`로만 보존한다.
- 인증된 사용자가 로그인·가입 URL에 들어오면 기본 보호 홈으로 보내고, 탈퇴 대기 사용자는 제한 Page로 보낸다.
- 네트워크 실패는 세션 만료로 단정하지 않고 같은 화면에서 재시도할 수 있게 한다.
- 계정 제한 상태의 상세 사유는 안전한 소유 증명 뒤에만 표시한다.

### 2. 회원가입·연락처 소유 검증

```navigation
LandingPage --> SignupTermsPage : 회원가입 선택
SignupTermsPage --> (/legal/terms)
(/legal/terms) --> SignupTermsPage(TermsReady) : success
(/legal/terms) --> SignupTermsPage(TermsLoadError) : error
SignupTermsPage(TermsLoadError) --> (/legal/terms) : 다시 시도
SignupTermsPage(TermsReady) --> (validate_consents) : 계속하기
(validate_consents) --> SignupTermsPage(TermsReady) : required_consent_missing
(validate_consents) --> SignupFormPage : valid
SignupTermsPage --> LandingPage : 취소

Browser --> SignupFormPage : 가입 폼 직접 진입
SignupFormPage --> SignupTermsPage : consent_proof_missing
SignupFormPage --> SignupTermsPage : consent_proof_expired
SignupFormPage --> (validate_signup_form) : 가입 제출
(validate_signup_form) --> SignupFormPage : invalid
(validate_signup_form) --> `signupRequest` : valid
`signupRequest` --> (/auth/signup)
(/auth/signup) --> SignupFormPage : identity_unavailable
(/auth/signup) --> SignupFormPage : validation_error
(/auth/signup) --> SignupFormPage(SubmitError) : rate_limited
(/auth/signup) --> SignupFormPage(SubmitError) : network_error
(/auth/signup) --> SignupFormPage(SubmitError) : server_error
SignupFormPage(SubmitError) --> (validate_signup_form) : 다시 시도
SignupFormPage(SubmitError) --> LandingPage : 취소
(/auth/signup) --> ContactVerificationPage : verification_required
(/auth/signup) --> ApplicationHomePage : active
SignupFormPage --> LoginPage : 기존 계정 로그인

Browser --> ContactVerificationPage : 새로고침 직접 링크 다른 기기 진입
ContactVerificationPage --> (/auth/verification/intent)
(/auth/verification/intent) --> ContactVerificationPage(CodeEntry) : valid
(/auth/verification/intent) --> SignupFormPage : expired_signup
(/auth/verification/intent) --> ProfileEditPage : expired_identity_change
(/auth/verification/intent) --> LoginPage : session_expired
(/auth/verification/intent) --> ApplicationHomePage : consumed_signup_active
(/auth/verification/intent) --> LoginPage : consumed_signup_anonymous
(/auth/verification/intent) --> ProfileEditPage(Saved) : consumed_identity_change
ContactVerificationPage --> (validate_verification_code) : 코드 제출
(validate_verification_code) --> ContactVerificationPage : invalid_format
(validate_verification_code) --> (/auth/verification/confirm) : valid
(/auth/verification/confirm) --> ContactVerificationPage : invalid
(/auth/verification/confirm) --> ContactVerificationPage : expired
(/auth/verification/confirm) --> ContactVerificationPage(AttemptsExceeded) : attempts_exceeded
(/auth/verification/confirm) --> ApplicationHomePage : verified_signup_auto_login
(/auth/verification/confirm) --> LoginPage : verified_signup_login_required
(/auth/verification/confirm) --> ProfileEditPage(Saved) : verified_identity_change
ContactVerificationPage --> (/auth/verification/resend) : 재발송
ContactVerificationPage(AttemptsExceeded) --> (/auth/verification/resend) : 새 challenge 요청
ContactVerificationPage(AttemptsExceeded) --> SignupFormPage : 가입 연락처 수정
ContactVerificationPage(AttemptsExceeded) --> ProfileEditPage : 변경 연락처 수정
(/auth/verification/resend) --> ContactVerificationPage : success
(/auth/verification/resend) --> ContactVerificationPage : cooldown
(/auth/verification/resend) --> ContactVerificationPage : rate_limited
(/auth/verification/resend) --> ContactVerificationPage : delivery_error
ContactVerificationPage --> SignupFormPage : 가입 연락처 수정
ContactVerificationPage --> ProfileEditPage : 변경 연락처 수정
ContactVerificationPage --> (/auth/signup/cancel) : 가입 취소
(/auth/signup/cancel) --> LandingPage : success
(/auth/signup/cancel) --> ContactVerificationPage : error
```

- 필수 동의의 문서 종류·버전·시각은 가입 요청과 함께 서버 증빙으로 저장한다.
- 가입 폼 직접 진입은 유효한 동의 증빙이 없으면 약관 Page로 되돌린다.
- 식별자 충돌은 조건부 선점 결과로 처리한다. 소유 증명 전에는 `identity_unavailable` 같은 일반 응답을 쓰고 중복 제출은 같은 결과를 돌려준다.
- 관리형 IdP·passwordless·검증 선행 가입은 순서를 바꾸되 각 단계의 실패·재개 경로를 유지한다.
- 검증 intent는 새로고침·다른 기기에서도 목적과 만료를 복원하고, 실패하면 가입/프로필의 안전한 재개 지점으로 보낸다.
- 재발송 cooldown과 시도 제한은 서버가 권위 있게 판정하고 `attempts_exceeded`에서 새 challenge 정책을 제공한다.

### 3. 로그인·세션 갱신·로그아웃

```navigation
LandingPage --> LoginPage : 로그인 선택
LoginPage --> (validate_login_submission) : 제출 시작
(validate_login_submission) --> LoginPage : invalid
(validate_login_submission) --> `credentials` : valid
`credentials` --> (/auth/login)
(/auth/login) --> LoginPage : invalid_credentials
(/auth/login) --> ContactVerificationPage : verification_required
(/auth/login) --> LoginPage(AccountStatusHelp) : locked
(/auth/login) --> LoginPage(AccountStatusHelp) : suspended
(/auth/login) --> DeletionPendingPage : deletion_pending
(/auth/login) --> ProtectedPage : success_return_to
(/auth/login) --> ApplicationHomePage : success_default
(/auth/login) --> LoginPage(LoginError) : rate_limited
(/auth/login) --> LoginPage(LoginError) : network_error
(/auth/login) --> LoginPage(LoginError) : timeout
(/auth/login) --> LoginPage(LoginError) : server_error
LoginPage(LoginError) --> (validate_login_submission) : 다시 시도
LoginPage --> ForgotPasswordPage : 비밀번호 찾기
LoginPage --> SignupTermsPage : 회원가입

ProtectedPage --> (refresh_session) : API 401 access_expired
(refresh_session) --> (/auth/refresh)
(/auth/refresh) --> ProtectedPage : success
(/auth/refresh) --> LoginPage : expired
(/auth/refresh) --> LoginPage : revoked
(/auth/refresh) --> LoginPage : reuse_detected
(/auth/refresh) --> ProtectedPage(OfflineNotice) : network_error
(/auth/refresh) --> ProtectedPage(OfflineNotice) : timeout
(/auth/refresh) --> ProtectedPage(SessionServiceError) : server_error
ProtectedPage(OfflineNotice) --> (refresh_session) : 연결 후 다시 시도
ProtectedPage(SessionServiceError) --> (refresh_session) : 다시 시도
ProtectedPage --> ProtectedPage(AccessDenied) : api_forbidden

ProtectedPage --> (/auth/logout) : 현재 기기 로그아웃
(/auth/logout) --> LandingPage : success
(/auth/logout) --> LandingPage(LogoutWarning) : server_error
(/auth/logout) --> LogoutPendingPage(CurrentSession) : network_error
(/auth/logout) --> LogoutPendingPage(CurrentSession) : timeout
LogoutPendingPage(CurrentSession) --> (/auth/logout) : 다시 시도
SessionsPage --> (confirm_logout_all) : 모든 기기 로그아웃
(confirm_logout_all) --> SessionsPage : 취소
(confirm_logout_all) --> (/auth/logout_all) : 확인
(/auth/logout_all) --> LandingPage : success
(/auth/logout_all) --> LandingPage(LogoutWarning) : server_error
(/auth/logout_all) --> LogoutPendingPage(AllSessions) : network_error
(/auth/logout_all) --> LogoutPendingPage(AllSessions) : timeout
LogoutPendingPage(AllSessions) --> (/auth/logout_all) : 다시 시도
```

- 자격 증명이 확인되기 전에는 계정 존재·제한 상태를 구체적으로 노출하지 않는다.
- 로그인 제출은 unsafe `returnTo`를 제거하고 허용된 내부 경로 또는 기본 홈만 사용한다.
- 동시 401은 갱신 한 번으로 합치고 원 요청은 최대 한 번만 재시도한다.
- refresh 재사용이 탐지되면 token family를 폐기하고 새 로그인을 요구한다.
- 서버 오류 응답은 cookie 만료를 함께 내려 원격 폐기만 재시도하고, 네트워크 단절로 만료 응답을 받지 못하면 민감 UI/cache를 숨긴 `LogoutPendingPage`에서 재시도한다.
- 모든 기기 로그아웃은 현재 세션도 폐기하므로 완료 뒤 공개 화면으로 이동한다.

### 4. 계정 복구·비밀번호 재설정

```navigation
LoginPage --> ForgotPasswordPage : 비밀번호 찾기
ForgotPasswordPage --> (validate_recovery_identifier) : 복구 요청
(validate_recovery_identifier) --> ForgotPasswordPage : invalid_format
(validate_recovery_identifier) --> `recoveryRequest` : valid
`recoveryRequest` --> (/auth/password/reset/request)
(/auth/password/reset/request) --> ForgotPasswordPage(RequestAccepted) : accepted
(/auth/password/reset/request) --> ForgotPasswordPage(RetryNotice) : rate_limited
(/auth/password/reset/request) --> ForgotPasswordPage(RetryNotice) : network_error
(/auth/password/reset/request) --> ForgotPasswordPage(RetryNotice) : timeout
(/auth/password/reset/request) --> ForgotPasswordPage(RetryNotice) : server_error
ForgotPasswordPage(RetryNotice) --> (validate_recovery_identifier) : 다시 시도
ForgotPasswordPage(RetryNotice) --> LoginPage : 취소

Browser --> ResetPasswordPage : 일회성 reset link 진입
ResetPasswordPage --> (exchange_reset_link)
(exchange_reset_link) --> (/auth/password/reset/exchange)
(/auth/password/reset/exchange) --> ResetPasswordPage(PasswordForm) : valid
(/auth/password/reset/exchange) --> ResetPasswordPage(InvalidLink) : invalid
(/auth/password/reset/exchange) --> ResetPasswordPage(InvalidLink) : expired
(/auth/password/reset/exchange) --> ResetPasswordPage(InvalidLink) : consumed
(/auth/password/reset/exchange) --> ResetPasswordPage(LinkCheckError) : network_error
(/auth/password/reset/exchange) --> ResetPasswordPage(LinkCheckError) : timeout
(/auth/password/reset/exchange) --> ResetPasswordPage(LinkCheckError) : server_error
ResetPasswordPage(LinkCheckError) --> (exchange_reset_link) : 다시 시도
ResetPasswordPage(InvalidLink) --> ForgotPasswordPage : 새 링크 요청
ResetPasswordPage(PasswordForm) --> (validate_new_password) : 변경 제출
(validate_new_password) --> ResetPasswordPage(PasswordForm) : invalid
(validate_new_password) --> (/auth/password/reset/confirm) : valid
(/auth/password/reset/confirm) --> ResetPasswordPage(PasswordForm) : conflict
(/auth/password/reset/confirm) --> ResetPasswordPage(InvalidLink) : expired
(/auth/password/reset/confirm) --> ResetPasswordPage(PasswordFormRetryNotice) : network_error
(/auth/password/reset/confirm) --> ResetPasswordPage(PasswordFormRetryNotice) : timeout
(/auth/password/reset/confirm) --> ResetPasswordPage(PasswordFormRetryNotice) : server_error
ResetPasswordPage(PasswordFormRetryNotice) --> (/auth/password/reset/confirm) : 다시 시도
(/auth/password/reset/confirm) --> LoginPage : success
```

- 존재하는 계정과 존재하지 않는 계정의 복구 요청은 같은 외부 응답과 유사한 처리 시간을 사용한다.
- `(exchange_reset_link)`는 token을 메모리로 옮겨 주소에서 즉시 제거한 뒤 제한 세션으로 교환하며, 실제 처리 세부는 jobflow에 둔다.
- 만료·사용 완료·변조 링크는 새 요청 진입점을 제공하며 입력한 새 비밀번호를 전송하지 않는다.
- 재설정 성공은 기존 세션 전체 폐기를 기본값으로 삼고 다른 정책은 위험 승인을 기록한다.

### 5. 자기 정보·보안·세션 관리

```navigation
AccountPage --> (/users/me)
(/users/me) --> AccountPage(AccountSummary) : success
(/users/me) --> AccountPage(LoadError) : network_error
(/users/me) --> AccountPage(LoadError) : server_error
AccountPage(LoadError) --> (/users/me) : 다시 시도
AccountPage --> ProfileEditPage : 정보 수정
AccountPage --> SecurityPage : 보안 설정
AccountPage --> SessionsPage : 로그인 기기 관리
AccountPage --> WithdrawalPage : 회원 탈퇴

ProfileEditPage --> (validate_profile_form) : 일반 정보 저장
(validate_profile_form) --> ProfileEditPage : invalid
(validate_profile_form) --> (/users/me/profile) : valid
(/users/me/profile) --> ProfileEditPage(Saved) : success
(/users/me/profile) --> ProfileEditPage(Conflict) : version_conflict
(/users/me/profile) --> ProfileEditPage(SaveError) : network_error
(/users/me/profile) --> ProfileEditPage(SaveError) : server_error
ProfileEditPage(SaveError) --> (validate_profile_form) : 입력을 보존하고 다시 시도
ProfileEditPage(Conflict) --> (/users/me) : 최신 값 조회
(/users/me) --> ProfileEditPage(ConflictResolution) : success_conflict
(/users/me) --> ProfileEditPage(Conflict) : error_conflict
ProfileEditPage(ConflictResolution) --> (validate_profile_form) : 변경 재적용
ProfileEditPage(ConflictResolution) --> AccountPage : 변경 폐기
ProfileEditPage --> ProfileEditPage(UnsavedChangesDialog) : 변경 중 이탈
ProfileEditPage(UnsavedChangesDialog) --> ProfileEditPage : 계속 편집
ProfileEditPage(UnsavedChangesDialog) --> AccountPage : 변경 폐기

ProfileEditPage --> ProfileEditPage(ReauthenticationOverlay) : 이메일 휴대폰 변경
ProfileEditPage(ReauthenticationOverlay) --> (/auth/reauthenticate) : 재인증 제출
(/auth/reauthenticate) --> ProfileEditPage(ReauthenticationOverlay) : error
(/auth/reauthenticate) --> ProfileEditPage(IdentityChangeReady) : success
ProfileEditPage(IdentityChangeReady) --> (/users/me/identity) : 새 식별자 제출
(/users/me/identity) --> ProfileEditPage : identity_unavailable
(/users/me/identity) --> `identityVerificationIntent` : verification_required
`identityVerificationIntent` --> ContactVerificationPage
(/users/me/identity) --> ProfileEditPage(IdentityChangeError) : network_error
(/users/me/identity) --> ProfileEditPage(IdentityChangeError) : server_error
ProfileEditPage(IdentityChangeError) --> (/users/me/identity) : 다시 시도

SecurityPage --> SecurityPage(ReauthenticationOverlay) : 비밀번호 변경
SecurityPage(ReauthenticationOverlay) --> (/auth/reauthenticate) : 재인증 제출
(/auth/reauthenticate) --> SecurityPage(ReauthenticationOverlay) : error
(/auth/reauthenticate) --> SecurityPage(PasswordChangeReady) : success
SecurityPage(PasswordChangeReady) --> (validate_new_password) : 새 비밀번호 제출
(validate_new_password) --> SecurityPage(PasswordChangeReady) : invalid
(validate_new_password) --> (/users/me/password) : valid
(/users/me/password) --> SecurityPage(PasswordChanged) : success
(/users/me/password) --> SecurityPage(PasswordChangeError) : conflict
(/users/me/password) --> SecurityPage(PasswordChangeError) : server_error
SecurityPage(PasswordChangeError) --> (validate_new_password) : 입력을 보존하고 다시 시도

SessionsPage --> (/users/me/sessions)
(/users/me/sessions) --> SessionsPage(SessionList) : success
(/users/me/sessions) --> SessionsPage(LoadError) : error
SessionsPage(LoadError) --> (/users/me/sessions) : 다시 시도
SessionsPage(SessionList) --> (confirm_revoke_session) : 기기 로그아웃
(confirm_revoke_session) --> SessionsPage(SessionList) : 취소
(confirm_revoke_session) --> (/users/me/sessions/revoke) : 확인
(/users/me/sessions/revoke) --> SessionsPage(SessionList) : success_other_session
(/users/me/sessions/revoke) --> LoginPage : success_current_session
(/users/me/sessions/revoke) --> SessionsPage(RevokeError) : error
SessionsPage(RevokeError) --> (/users/me/sessions/revoke) : 다시 시도
```

- 일반 프로필 저장과 식별자·비밀번호 같은 민감 변경을 분리한다.
- 프로필 409 충돌은 최신 값 비교와 사용자 입력 재적용/폐기 경로를 제공하고, 저장 오류는 입력을 보존한다.
- 민감 변경은 짧은 유효 시간의 재인증 증빙을 요구하고 보안 감사 이벤트를 남긴다.
- `identityVerificationIntent`는 목적·사용자·새 식별자 지문·만료를 결합한다. 검증 성공은 변경을 finalize하고 기존 식별자를 해제한 뒤 `ProfileEditPage`로 복귀한다.
- 현재 세션을 폐기하면 즉시 로그인 Page로, 다른 세션을 폐기하면 목록 갱신으로 이어진다.

### 6. 회원 탈퇴·유예 취소·완료

```navigation
AccountPage --> WithdrawalPage : 회원 탈퇴
WithdrawalPage --> (/users/me/withdrawal/impact)
(/users/me/withdrawal/impact) --> WithdrawalPage(ImpactReady) : success
(/users/me/withdrawal/impact) --> WithdrawalPage(ImpactLoadError) : network_error
(/users/me/withdrawal/impact) --> WithdrawalPage(ImpactLoadError) : server_error
WithdrawalPage(ImpactLoadError) --> (/users/me/withdrawal/impact) : 다시 시도
WithdrawalPage(ImpactReady) --> WithdrawalPage(ReauthenticationOverlay) : 탈퇴 계속
WithdrawalPage(ReauthenticationOverlay) --> (/auth/reauthenticate) : 재인증 제출
(/auth/reauthenticate) --> WithdrawalPage(ReauthenticationOverlay) : error
(/auth/reauthenticate) --> WithdrawalPage(FinalConfirmation) : success
WithdrawalPage(FinalConfirmation) --> WithdrawalPage(ImpactReady) : 취소
WithdrawalPage(FinalConfirmation) --> (/users/me/withdrawal) : 최종 확인
(/users/me/withdrawal) --> WithdrawalPage(RequestError) : conflict
(/users/me/withdrawal) --> WithdrawalPage(RequestError) : dependency_error
(/users/me/withdrawal) --> WithdrawalPage(RequestError) : network_error
(/users/me/withdrawal) --> WithdrawalPage(RequestError) : server_error
WithdrawalPage(RequestError) --> WithdrawalPage(FinalConfirmation) : 다시 시도
WithdrawalPage(RequestError) --> WithdrawalPage(ImpactReady) : 영향 다시 확인
(/users/me/withdrawal) --> DeletionPendingPage : grace_period
(/users/me/withdrawal) --> DeletionCompletePage : immediate_completion

DeletionPendingPage --> (/users/me/withdrawal/status) : 진입 새로고침
(/users/me/withdrawal/status) --> DeletionPendingPage(StatusReady) : pending
(/users/me/withdrawal/status) --> DeletionCompletePage : completed
(/users/me/withdrawal/status) --> DeletionPendingPage(StatusError) : network_error
(/users/me/withdrawal/status) --> DeletionPendingPage(StatusError) : server_error
DeletionPendingPage(StatusError) --> (/users/me/withdrawal/status) : 다시 시도
DeletionPendingPage(StatusReady) --> DeletionPendingPage(ReauthenticationOverlay) : 유예 중 취소
DeletionPendingPage(ReauthenticationOverlay) --> (/auth/reauthenticate) : 재인증 제출
(/auth/reauthenticate) --> DeletionPendingPage(ReauthenticationOverlay) : error
(/auth/reauthenticate) --> DeletionPendingPage(CancelReady) : success
DeletionPendingPage(CancelReady) --> (/users/me/withdrawal/cancel) : 취소 제출
(/users/me/withdrawal/cancel) --> AccountPage : success
(/users/me/withdrawal/cancel) --> DeletionPendingPage : grace_expired
(/users/me/withdrawal/cancel) --> DeletionPendingPage : deletion_started
(/users/me/withdrawal/cancel) --> DeletionPendingPage(CancelError) : network_error
(/users/me/withdrawal/cancel) --> DeletionPendingPage(CancelError) : server_error
DeletionPendingPage(CancelError) --> (/users/me/withdrawal/cancel) : 다시 시도
Browser --> DeletionCompletePage : 완료 알림의 일회성 링크
DeletionCompletePage --> SignupTermsPage : 재가입 허용 정책
DeletionCompletePage --> LandingPage : 종료
```

- 영향 API는 삭제·익명화·법적 보존·외부 연계 데이터와 재가입 가능 시점을 실제 정책대로 보여준다.
- 탈퇴 요청이 접수되면 계정 차단과 세션 폐기 시점을 명확히 하고 보호 API 접근을 막는다.
- 유예 취소는 제한 로그인 세션·일회성 복구 링크·유예 중 유지한 IdP 인증 중 하나를 명시적으로 선택한다. 성공 시 stale token을 재사용하지 않고 새 full session을 발급한다.
- 유예 취소는 불가역 삭제가 시작되기 전에만 허용하며, 시작 뒤에는 멱등한 정방향 복구만 수행한다.
- 상태 API는 새로고침에도 pending/completed를 복원하고, 완료 안내는 비동기 삭제 작업의 증거와 일치해야 한다.
- 재가입은 기존 계정 복구인지 새 `userId` 생성인지와 식별자 재사용 시점을 명시한다.

### 논리 API 매핑

| 표기 | 역할 |
|---|---|
| `(/legal/terms)` | 최신 약관·동의 문서 버전 조회 |
| `(/auth/signup)` · `(/auth/signup/cancel)` | 가입 intent 생성·취소, IdP/자체 인증 분기, 앱 프로필 초기화 |
| `(/auth/verification/intent)` · `(/auth/verification/confirm)` · `(/auth/verification/resend)` | 연락처 검증 intent 복원·소비·재발송 |
| `(/auth/login)` · `(/auth/session)` · `(/auth/refresh)` | 로그인, 앱 bootstrap, 세션 갱신 |
| `(/auth/logout)` · `(/auth/logout_all)` | 현재/전체 세션 폐기 |
| `(/auth/password/reset/request)` · `(/auth/password/reset/exchange)` · `(/auth/password/reset/confirm)` | 계정 복구 요청, 일회성 token 교환, 비밀번호 확정 |
| `(/auth/reauthenticate)` | 민감 변경용 단기 재인증 증빙 발급 |
| `(/users/me)` · `(/users/me/profile)` · `(/users/me/identity)` | 자기 정보 조회, 일반 정보·식별자 변경 |
| `(/users/me/password)` · `(/users/me/sessions)` · `(/users/me/sessions/revoke)` | 비밀번호 변경과 세션 조회·선택 폐기 |
| `(/users/me/withdrawal/impact)` · `(/users/me/withdrawal)` · `(/users/me/withdrawal/status)` · `(/users/me/withdrawal/cancel)` | 탈퇴 영향, 요청, 상태, 유예 취소 |

실제 endpoint가 다르면 프로젝트 계약으로 바꾼다. 다만 화면에서 IdP SDK를 직접 호출하더라도 설계 문서에는 사용자 이동을 좌우하는 논리 경계를 위 표기 수준으로 남긴다.

---

## Step 0. 요구사항·범위 확정

1. **날짜·경로**: `DATE`를 `YYYY.MM.DD`로 한 번 확정한다. 산출물은 핵심 문서 `docs/design/{DATE}/frontend-user/frontend-user-design.md` 와 상세 파일 `docs/design/{DATE}/frontend-user/details/{NN}-{slug}.md` 세트다.
2. **요구사항 분해**: 요구사항을 검증 가능한 `FR-01`, `FR-02`, …로 분해하고 Must/Should/Optional, 성공 기준을 붙인다.
3. **가정**: 확인되지 않은 정책은 `가정 · 근거 · 틀렸을 때 영향 · 확인 필요 여부`로 기록한다. 조용히 채우지 않는다.
4. **범위 밖**: 회원 영역과 무관한 주문·정산·콘텐츠 등 비즈니스 기능은 인터페이스 경계만 표시하고 재설계하지 않는다.
5. **결정 로그**: 인증 방식, 로그인 식별자, 자동 로그인, 세션 저장 방식, 탈퇴 유예, 재가입 정책, DynamoDB 테이블 전략을 선택지·결정·근거로 기록한다.

### 공통 필수 범위

아래 흐름은 회원제 사이트의 기본 설계 범위다. 제품 정책상 제공하지 않는 기능도 조용히 삭제하지 말고, **위임 대상 또는 제외 근거와 대체 사용자 흐름**을 적는다.

| 기능군 | 최소 설계 범위 |
|---|---|
| 회원가입 | 약관 동의, 입력 검증, 식별자 중복/경합, 가입 요청, 연락처 소유 검증, 가입 재개 |
| 로그인 | 자격 증명, 실패·잠김·정지·미검증, 안전한 원래 목적지 복귀 |
| 세션 | 앱 초기 복원, access 만료, 단일 갱신, 완전 만료, 폐기, 복수 탭 동기화 |
| 로그아웃 | 현재 기기/전체 기기, 서버 폐기 실패, 로컬 민감 상태·캐시 제거 |
| 계정 복구 | 비밀번호 재설정 요청, 일회성 링크/코드, 만료·재사용·변조 처리 |
| 자기 정보 | 조회, 일반 필드 수정, 식별자 변경·재검증, 충돌·저장 실패 |
| 보안 설정 | 현재 비밀번호 확인, 비밀번호 변경, 세션 목록·폐기 여부 |
| 회원 탈퇴 | 재인증, 영향 안내, 명시적 확인, 유예/취소, 삭제·익명화, 재가입 |
| 접근 제어 | 공개/게스트 전용/인증 필요 라우트, 역할과 계정 상태별 접근 |

소셜 로그인, 패스키, MFA, 초대 가입, 보호자 동의, 관리자 승인, 조직 전환은 적용 여부를 명시하고 요구사항이 있을 때 같은 깊이로 설계한다.

## Step 1. 기존·참고 구현 분석

기존 프로젝트가 있으면 실제 코드·문서에서 아래 항목을 조사한다. 신규 프로젝트면 `greenfield`로 표시하고 이 단계를 가정 인벤토리로 대체한다.

- 라우트와 Page/Component, 공개·게스트 전용·보호 라우트, 딥링크 진입점
- 인증 store/context, 앱 초기화, 토큰 저장, API interceptor, 401/403 처리
- 회원가입·로그인·프로필·비밀번호·탈퇴 UI와 로딩/오류/빈 상태
- 사용자 API 계약, 오류 코드, 인증 주체 추출 방식, 세션 폐기 방식
- 사용자 스키마·테이블·인덱스·TTL·조건부 쓰기, 개인정보 보유 정책
- 관련 테스트, 분석 이벤트, 감사 로그, 운영 알람

근거 표는 `관찰 항목 · 실제 경로/라인 · 현재 동작 · 범용 설계 판단`으로 작성한다. 참고 구현은 아래 세 범주로 분리한다.

1. **채택**: 그대로 일반화할 수 있는 패턴과 이유.
2. **개선 후 채택**: 의도는 유효하지만 보안·접근성·일관성을 보완할 패턴.
3. **제외**: 브랜드, 도메인 규칙, 하드코딩 endpoint, 특정 필드/라우트, 취약한 인증·암호화·로그 방식.

실제로 확인하지 않은 파일·동작을 근거로 인용하지 않는다. `토큰 존재 = 인증 완료`, 브라우저 영속 저장소의 장기 토큰, 클라이언트가 보낸 `userId` 신뢰, 비밀번호·토큰·OTP 로그 출력, 약한 비밀번호 해시, 무기한 토큰, 단일 확인 후 즉시 hard delete 같은 구현은 기준 설계로 복제하지 않는다.

## Step 2. 사용자 시스템 설계 원칙

### 인증·인가 경계

- 인증 방식은 **관리형 IdP 사용** 또는 **전용 인증 서비스** 중 하나로 명확히 정한다. 관리형 IdP를 쓰면 위임한 자격 증명·연락처 검증·인증 세션의 Source of Truth(SoT)는 IdP이며 DynamoDB에 중복 저장하지 않는다. 애플리케이션 프로필은 `provider + subject`와 불변 `userId`의 매핑으로 연결한다.
- 자체 인증이면 비밀번호 원문·복호화 가능한 비밀번호를 저장하지 않는다. Argon2id·scrypt 같은 검증된 적응형 암호 해시와 사용자별 salt를 전용 인증 경계에서 사용한다. 알고리즘·비용 파라미터 버전, 성능 측정, 로그인 시 rehash/migration, 상수 시간 비교, pepper를 쓸 때의 KMS/비밀 회전 정책을 정한다.
- API는 검증된 토큰/세션의 불변 `sub` 또는 `userId`를 인증 주체로 사용한다. body/query의 사용자 ID를 권위로 삼지 않는다.
- 클라이언트 라우트 가드는 민감 화면의 순간 노출을 막는 사용자 경험 수단이다. 모든 API는 서버에서 인증·권한·계정 상태를 다시 검사한다.
- 역할(Role), 계정 상태(Status), 클라이언트 인증 상태를 분리한다. 계정 상태는 `PENDING_VERIFICATION`, `ACTIVE`, `LOCKED`, `SUSPENDED`, `DELETION_PENDING`, `DELETED`를 기본으로 하고, `GUEST`는 계정 상태가 아닌 클라이언트 주체 상태로 둔다.
- `라우트/API × 역할 × 계정 상태` 접근 행렬은 서버 `default-deny`를 기본값으로 한다. 알 수 없는 상태, IdP 동기화 실패, 권한 판정 실패는 fail-closed로 거부하고 안전한 복구 흐름을 제공한다.

### 인증 방식별 데이터 소유권·정합성

- `자격 증명 · provider subject · 연락처 검증 · token/session · 인증 잠금 · 앱 userId · 서비스 프로필 · 동의 · 서비스 계정 상태 · 탈퇴 작업`별 SoT·쓰기 주체·읽기 주체를 표로 확정한다.
- **관리형 IdP**는 위임 범위의 자격 증명, provider subject, token/session, 검증·인증 잠금 상태를 소유한다. DynamoDB는 로컬 `userId`, provider-subject 매핑, 서비스 프로필·동의·서비스 계정 상태·탈퇴 작업을 기본으로 소유한다. `Session`은 필요한 경우 비권위 기기 표시 메타데이터로만 둔다.
- `provider + subject` 매핑은 `attribute_not_exists` 조건부 생성으로 덮어쓰기를 막는다. 로컬 profile·provider map·가입 intent finalize는 가능한 한 같은 DynamoDB transaction에 넣는다. 이미 매핑이 있으면 새 사용자를 만들지 않고 기존 `userId`로 수렴하며, IdP 성공 뒤 finalize 충돌은 기존 매핑 재조회·멱등 재시도·reconciliation로 복구한다.
- **자체 인증**은 DynamoDB 또는 분리한 인증 저장소에 `IdentityClaim`, `Session`, `VerificationChallenge`, `PasswordResetChallenge`를 설계하고 전용 인증 서비스만 접근하게 한다.
- `TransactWriteItems`는 IdP 변경까지 원자화하지 못한다. 관리형 IdP 가입·식별자 변경·탈퇴는 `멱등 intent/예약 → IdP 변경 → 로컬 finalize` 또는 근거 있는 역순으로 설계하고, 단계 상태·실패 정리·재시도·정합성 점검을 둔다. 이를 단일 트랜잭션이라고 표현하지 않는다.
- `IdP 상태 ↔ DynamoDB 계정 상태 ↔ 세션 수락 여부` 전이 표를 만들고, 유예 탈퇴 중 IdP disable/delete와 취소 시 재활성화 순서를 정한다.
- 인증 방식, SoT, IdP 연계 순서, token 검증, 탈퇴 차단 시점 같은 보안 결정은 미해결 가정으로 `clean` 처리할 수 없다.

### 프론트엔드 인증 상태

- 앱 시작 상태를 `unknown/restoring`으로 두고 `anonymous`와 구분한다. 보호 콘텐츠는 복원 완료 전에 렌더링하지 않는다.
- 최소 상태는 `restoring`, `anonymous`, `authenticating`, `authenticated`, `refreshing`, `expired`, `revoked`다.
- 동시 401은 여러 요청을 하나로 합치는 single-flight 방식으로 갱신 요청 하나만 보낸다. 원 요청 재시도는 한 번으로 제한하고 401 무한 루프를 막는다.
- 네트워크 오류와 세션 만료를 구분한다. 갱신 실패가 확정되면 민감 캐시를 비우고 안전한 로그인 흐름으로 전환한다.
- 브라우저 웹의 우선 후보는 token을 브라우저 JavaScript에 노출하지 않는 Backend For Frontend(BFF) 또는 서버 세션과 `Secure`·`HttpOnly`·`SameSite` 쿠키다. SPA가 API를 직접 호출해야 하면 메모리의 짧은 access token과 회전·재사용 탐지를 적용한 refresh/session 쿠키 같은 대안을 XSS·CSRF·모바일/SSR 제약과 함께 비교한다. 인증 token을 `localStorage`·`sessionStorage`에 두지 않는다.
- 서명 token은 허용 알고리즘, 서명, `iss`, `aud`, `exp`, `nbf`, token type, `kid`/키 회전 실패를 검증한다. opaque token은 introspection·cache·장애 시 fail-closed 정책을 정한다.
- refresh token은 family 단위 회전·재사용 탐지·전체 폐기를 설계한다. 로그인·권한 상승·재인증 후에는 session ID를 교체해 세션 고정을 막는다.
- 쿠키는 `Secure`, `HttpOnly`, `SameSite`, 최소 `Path`/`Domain`, 만료를 확정한다. 쿠키 인증 endpoint는 Origin 검증 또는 CSRF token과 명시적 credentialed CORS allowlist를 적용한다.
- redirect형 OIDC/OAuth를 쓰면 Authorization Code + PKCE, `state`, `nonce`, callback 오류, exact redirect URI allowlist를 설계하고 implicit flow를 금지한다. 관련 callback navigation과 jobflow를 조건부 필수 산출물로 둔다.
- 현재/전체 로그아웃, 탈퇴, 잠금·정지별 **세션 종료 성공 조건과 access-token 거부 시점**을 정한다. `sid`/session version 검사, denylist, opaque session 등 즉시 거부 수단을 쓰거나 짧은 잔여 유효시간과 위험을 명시한다. 네트워크 단절로 HttpOnly cookie 만료를 확인하지 못한 상태를 완료로 표시하지 않는다.
- 로그인 후 복귀 경로는 내부 allowlist로 검증해 open redirect를 막는다. 로그인·로그아웃 상태는 다른 탭과 동기화한다.

### 화면·폼·오류

- 서버 검증을 최종 권위로 두되 클라이언트 검증으로 빠른 피드백을 제공한다. 같은 규칙을 여러 Page에 복제하지 않는다.
- 모든 제출은 중복 클릭 방지, 취소/timeout, 입력 보존, 재시도 가능 여부를 정의한다.
- 400/401/403/404/409/410/422/429/5xx를 구분하고 기계 판독 가능한 오류 코드→사용자 메시지→복구 행동 매핑 표를 만든다.
- 자격 증명 또는 안전한 소유 증명 전의 로그인·복구·재발송 요청은 계정 존재 여부가 노출되지 않도록 같은 외부 응답과 유사한 처리 시간을 사용한다. 유효한 자격 증명이 확인된 뒤에만 미검증·잠김·정지·탈퇴 대기 상태와 복구 경로를 구체적으로 안내한다.
- 일반 프로필 변경과 이메일·휴대폰·비밀번호·탈퇴 같은 민감 변경을 분리한다. 민감 변경에는 재인증·검증·감사 이벤트를 적용한다.
- WCAG 2.2 AA를 기준으로 키보드, 초점 이동, 오류 요약, 필드-오류 연결, `aria-live`, 표준 `autocomplete` 속성을 설계한다.

## Step 3. DynamoDB 기본 설계와 RDS 경계

### 접근 패턴 우선

엔터티/ERD부터 그리지 말고 접근 패턴을 먼저 작성한다. 각 패턴에 `호출 주체 · 빈도 · 키 조건 · 정합성 · PK/SK · GSI · 조건부 쓰기 · 트랜잭션 · TTL · 멱등성`을 매핑한다.

최소 접근 패턴은 다음과 같다. IdP에 위임한 패턴은 DynamoDB 모델을 만들지 말고 `IdP 계약 · 앱에서 필요한 결과 · 실패 처리`로 대체한다.

- 불변 사용자 ID로 계정 상태·프로필 조회
- provider subject로 로컬 사용자 ID 매핑
- 사용자별 동의 버전 이력 조회
- 프로필 버전 조건부 수정과 충돌 감지
- 탈퇴 요청 상태·삭제 작업 조회, 식별자 재사용 금지 기간 확인
- 중복 가입/탈퇴 요청의 멱등 결과 조회
- **자체 인증일 때만** 정규화된 로그인 식별자의 소유권 선점, 세션 ID 직접 조회, 사용자별 세션 조회·폐기, 연락처 검증·비밀번호 재설정 challenge의 발급·소비

### 논리·물리 모델 원칙

- 공통 항목 후보는 `MemberProfile`, `ProviderSubjectMap`, `Consent`, `DeletionRequest`, `DeletedIdentityTombstone`, `IdempotencyRecord`다. 자체 인증일 때만 `IdentityClaim`, `Session`, `VerificationChallenge`, `PasswordResetChallenge`를 추가한다. 실제 접근 패턴이 없는 항목은 만들지 않는다.
- 하나의 PK 규칙을 모든 항목에 강제하지 않는다. 기본 후보는 프로필 `USER#{userId}`, provider 매핑 `PROVIDER#{provider}#{subject}`, 자체 인증 식별자 `IDENTITY#{hmacFingerprint}`, 세션 직접 조회 `SESSION#{sessionFingerprint}`, 멱등 요청 `IDEMPOTENCY#{principal}#{operation}#{key}`다. 단일/복수 테이블 선택에 맞게 실제 PK/SK를 확정한다.
- 원문 이메일·휴대폰을 키에 노출하지 않는다. 식별자별 정규화 정책을 명시하고 이메일을 무조건 전체 소문자화하지 않는다. 휴대폰은 적용 국가 정책에 맞는 E.164 등 표준 형식을 검토한다. HMAC 지문은 key version·충돌 처리·KMS 접근 권한을 설계하고, 회전 중 모든 활성 버전 조회와 dual-write/rekey, 이전 버전 폐기 조건으로 고유성을 유지한다.
- 식별자 고유성은 eventual-consistent GSI 선조회로 보장하지 않는다. base-table uniqueness item의 조건부 쓰기 또는 `TransactWriteItems`로 프로필·식별자 소유권을 원자 생성한다.
- 미검증 식별자 예약은 `expiresAt`과 상태를 조건부 검사해 TTL 삭제를 기다리지 않고 재선점할 수 있게 한다. 식별자 변경은 새 claim 예약→검증→프로필 교체→기존 claim 해제의 트랜잭션 또는 saga로 설계한다.
- 자체 인증의 저엔트로피 OTP는 서버 비밀키 기반 HMAC verifier, 짧은 만료, 원자적 시도 차감·일회성 소비, 발송/검증 rate limit을 함께 적용한다. 고엔트로피 reset/verification token과 refresh token은 원문이 아닌 verifier/지문만 저장한다. 모든 만료는 `expiresAt`을 직접 검사하고 TTL은 지연 삭제·비용 정리 용도로만 사용한다.
- 멱등 레코드는 principal, operation, idempotency key, request digest, `IN_PROGRESS/COMPLETED/FAILED` 상태, 안전한 응답 참조, 보유 기간을 가지며 가능하면 실제 mutation과 같은 트랜잭션에서 기록한다.
- 프로필 변경은 `version`과 조건부 쓰기로 동시 수정에 의한 덮어쓰기를 막는다. API에는 충돌(409) 복구 흐름을 둔다.
- GSI는 실제 조회 패턴별로 최소 projection만 둔다. request path의 `Scan`, 무제한 item collection, hot partition, 400KB item 한도 위험을 검토한다.
- `access pattern × 예상 월 요청량 × item 크기 × 읽기 일관성 × GSI 쓰기 증폭 × Streams/백업 비용` 추정 표를 만든다. 저·불규칙 트래픽은 On-Demand를 기본 후보로 삼고, 예측 가능한 지속 부하는 Provisioned+Auto Scaling 전환 기준과 비교한다.
- PITR, KMS 암호화, 최소 권한 IAM, 백업/복구, 데이터 분류별 보유·삭제 정책을 포함한다. 복원 후 탈퇴 데이터가 되살아나지 않도록 최소 삭제 ledger/tombstone을 재적용하는 절차를 두고 legal hold와 일반 보존을 구분한다. 고용량 감사 이벤트는 사용자 item collection에 계속 누적하지 않는다.
- 단일/복수 테이블은 access pattern·격리·비용 근거로 선택한다. "DynamoDB이므로 단일 테이블"을 전제로 두지 않는다.
- 다중 리전 쓰기를 선택하면 Global Tables 복제만으로 전역 고유성을 가정하지 않는다. 식별자·provider 매핑의 단일 writer/home region 또는 별도 전역 uniqueness 조정자를 정하고 장애 전환 중 쓰기 정책을 명시한다.

### RDS 예외 기준

아래 조건이 실제로 필요한 영역만 RDS 후보로 둔다.

- 여러 엔터티에 걸친 강한 관계형 트랜잭션과 참조 무결성
- 복잡한 조인·집계·가변 조건 보고서가 핵심인 조회
- 주문·정산·계약처럼 관계형 제약 자체가 비즈니스 규칙인 데이터

회원 프로필·동의·서비스 계정 상태의 기본 SoT는 DynamoDB에 유지한다. 복잡한 회원 리포트는 읽기 모델/분석 저장소를 먼저 검토하고, 관계형 비즈니스 규칙이 소유하는 데이터만 RDS SoT로 둔다.

RDS를 쓰면 `데이터/필드 · SoT · 쓰기 주체 · 읽기 주체 · 동기화 지연 허용치 · 삭제 책임` 소유권 표를 작성한다. 한 요청에서 프론트엔드 또는 API가 DynamoDB와 RDS를 무보호 이중 쓰기하지 않는다. DynamoDB Streams 또는 RDS transactional outbox의 소유 저장소, event version·ordering, retry/DLQ, 멱등 inbox, reconciliation 주기와 허용 지연을 정하고 두 저장소는 불변 `userId`로 연결한다. RDS 장애가 기본 로그인까지 불필요하게 전파되지 않도록 의존 방향을 정한다.

### 탈퇴 오케스트레이션

- RDS 사용 여부와 무관하게 IdP·DynamoDB·객체 저장소·메시징·외부 비즈니스 저장소 중 둘 이상을 건드리면 분산 삭제 작업으로 설계한다.
- 순서는 `탈퇴 intent/재인증 → 서비스 계정 차단 → 세션 폐기 → 유예 → 불가역 삭제 시작 → 저장소별 삭제/익명화 → tombstone/완료 증거`를 기본 후보로 삼고 정책 근거로 조정한다.
- 불가역 삭제 전까지만 취소·보상을 허용한다. 삭제 시작 뒤에는 삭제된 개인정보를 복원하지 않고 멱등한 정방향 재시도와 수동 재처리로 완료한다.
- 삭제 작업 상태는 `QUEUED`, `RUNNING`, `RETRYING`, `FAILED`, `COMPLETED`로 분리하고 단계별 idempotency key, retry 상한, DLQ, 운영자 재처리, 완료 증거를 둔다.
- 저장소별 삭제·익명화·법적 보존 책임과 IdP disable/delete, 식별자 tombstone 생성, 백업 복원 후 재삭제 순서를 표로 작성한다.

## Step 4. 설계 문서 작성 — 핵심 문서 + 상세 파일

산출물은 2계층이다. **핵심 문서**는 처음 읽는 사람이 5~10분 안에 전체 구조와 핵심 결정을 파악하는 문서고, **상세 파일**은 아래 상세 파일 규격(§1~§13 등)의 깊이를 전부 담는 문서다. 핵심 문서의 모든 항목은 대응 상세 파일 링크를 갖는다(상세가 불필요하면 `상세 없음` 명시).

### 핵심 문서 — `docs/design/{DATE}/frontend-user/frontend-user-design.md`

아래 순서로, **화면 2~3장(약 200줄) 이내**로 작성한다. 항목당 `대표 다이어그램 최대 1개(항목 5 대표 흐름만 최대 2개) + 불릿 3~6 + 상세 파일 링크`만 담고, 전체 예외 분기·필드 단위 계약·물리 키 설계·체크리스트성 정책 나열은 상세 파일로 옮긴다.

1. **한눈에 보기**: 요구사항 한 줄, 범위/범위 밖, 핵심 가정 + 브라우저·프론트엔드·Auth/User API·IdP(선택)·DynamoDB·RDS(선택)의 신뢰 경계 조감도 1장.
2. **핵심 결정 표**: 인증 방식, 로그인 식별자, 세션 저장 방식, 탈퇴 유예/재가입, DynamoDB 테이블 전략 등 Step 0 결정 로그의 확정본을 `결정 · 선택지 · 근거 한 줄`로.
3. **요구사항 요약 표**: `FR-NN · 한 줄 · Must/Should/Optional · 상태`. 성공 기준·가정·접근 행렬 상세는 상세 파일로.
4. **전체 네비게이션 + 화면 색인**: 사용자 상태별 대표 진입과 회원 수명주기를 요약한 전체 `navigation` 1장 + `Page · route · 접근 · 역할` 색인 표. 시나리오별 상세 navigation 은 상세 파일로.
5. **대표 흐름 1~2개**: 가입→검증→finalize, 로그인→세션 발급 같은 핵심 `jobflow` 1~2장. 나머지 흐름은 상세 파일로.
6. **데이터 한눈에**: 논리 `erDiagram` 1장 + `항목 · SoT · 저장소` 표. 접근 패턴·물리 키·GSI·RDS 경계 상세는 상세 파일로.
7. **미해결 이슈·구현 인계**: 보류 FR, 보류 보안 결정, 구현 순서를 3~7개 불릿으로.
8. **상세 파일 인덱스**: `파일 · 다루는 § · 한 줄`.

### 상세 파일 — `docs/design/{DATE}/frontend-user/details/{NN}-{slug}.md`

아래 규격들을 담는다. **한 §섹션 = 한 파일**을 기본으로 하되 밀접한 섹션은 한 파일로 합칠 수 있다(합침은 인덱스에 명시). `NN` 은 § 번호와 1:1(`01`~`13`), § 번호가 없는 "참고 구현과 범용화 판단"·"요구사항·행위자·접근 행렬"은 `00-reference-and-requirements` 한 파일로 담는다. slug 은 소문자 kebab-case 2~4단어(한글 금지). 각 파일 서두에 `> 대상: 핵심 문서 {항목}` + `> 관련 FR: FR-NN…` 인용블록을 두고 두괄식으로 시작한다. 깊이 제한 없음 — 기존 수준의 상세를 그대로 유지한다.

### 참고 구현과 범용화 판단

- 실제 근거 인벤토리
- 채택/개선 후 채택/제외 표
- 현재 구현의 보안·정합성 결함은 `현재 관찰`로만 기록하고 목표 설계와 혼합하지 않는다.

### 요구사항·행위자·접근 행렬

- `FR-NN` 요구사항, 성공 기준, 우선순위, 가정, Out of Scope
- 행위자, 역할, 계정 상태 정의
- `라우트/API × 역할 × 계정 상태` 접근 행렬과 거부 시 사용자 흐름

### §1. Input Datas

- 공통 앱 데이터와 인증 방식별 데이터를 분리한다. 관리형 IdP에 위임한 자격 증명·token/session·challenge는 IdP 계약으로, 앱 프로필·동의·서비스 계정 상태·탈퇴 작업은 DynamoDB 데이터로 작성한다.
- 자체 인증이면 식별자, credential verifier, 세션, verification/password-reset challenge를 인증 전용 데이터로 추가한다.
- 필드별 필수/선택, 수집 목적, 개인정보/민감정보 등급, SoT, 보유 기간, 마스킹/암호화, 삭제 방식
- 프론트엔드에서 보관 가능한 데이터와 보관하면 안 되는 데이터를 분리한다.

### §2. Key Events

- 가입 시작/완료, 식별자 선점, 검증 발송/완료/만료
- 로그인 성공/실패, 계정 잠김/정지, 세션 갱신/폐기/만료
- 프로필·식별자·비밀번호 변경, 재인증 요구
- 탈퇴 요청/취소/유예 만료/익명화·삭제 완료/실패
- 이벤트별 생산자·소비자·payload 최소 필드·중복 처리·감사 여부

### §3. Services List

- Page/route guard, auth bootstrap, user/session store, form/validation, API gateway, cache invalidation, cross-tab sync의 책임
- Auth API, User API, IdP, DynamoDB repository, deletion worker, 알림 gateway의 경계
- 각 책임의 소유 모듈과 금지된 책임을 함께 적는다. 자격 증명 검증과 권한 판단을 UI/store에 두지 않는다.

### §4. PBS

Mermaid `flowchart`로 사용자 시스템→기능군→단위 프로세스를 분해한다. 최소 기능군은 가입/검증, 로그인/세션, 복구/보안, 프로필, 탈퇴/재가입, 접근 제어다.

### §5. Job Flow

아래 흐름을 각각 `jobflow`로 작성한다. 인증 방식에 맞지 않는 흐름은 제외 근거와 대체 흐름을 적는다.

1. 선택한 인증 방식의 가입→연락처 소유 검증→앱 프로필 finalize; 관리형 IdP면 로컬 예약과 IdP 변경의 실패 정리 포함
2. 로그인→세션 발급→사용자 bootstrap
3. access 만료→single-flight 갱신→원 요청 재시도 또는 세션 종료
4. 현재/전체 기기 로그아웃→서버 폐기→로컬 민감 상태 정리
5. 비밀번호 방식이면 재설정·현재 비밀번호 변경, passwordless면 대응하는 복구·credential 교체
6. 일반 프로필 변경과 이메일/휴대폰 같은 민감 식별자 변경
7. 탈퇴 요청→계정 차단→세션 폐기→유예→삭제 작업→완료 또는 멱등한 정방향 재처리

각 흐름 뒤에 객체 책임 표, 주요 이벤트/계약 표, 정상·예외 시나리오 설명을 둔다.

### §6. Navigation

전체 사용자 네비게이션 한 장은 핵심 문서에 둔다. 상세 파일에는 위 **공통 기준 네비게이션**을 실제 프로젝트 라우트·정책으로 치환해 아래 시나리오를 독립 `navigation` 블록으로 작성한다. 기준 흐름을 그대로 복사하지 말고 실제 Page/API 근거와 관련 FR을 붙인다.

1. 회원가입·약관·연락처 소유 검증·가입 재개
2. 로그인·미검증/잠김/정지 처리·안전한 `returnTo` 복귀
3. 보호 라우트 직접 진입·세션 복원·만료·재로그인
4. 비밀번호 찾기·재설정 링크 만료/재사용/변조
5. 자기 정보 조회·일반 정보 수정·저장 충돌
6. 이메일/휴대폰·비밀번호 변경과 재인증
7. 현재 기기/전체 기기 로그아웃
8. 탈퇴 확인·유예·취소·완료·재가입 정책

정상 흐름뿐 아니라 검증 실패, 중복/경합, 취소, 뒤로가기, 새로고침, offline/timeout, 401/403/409/410/422/429/5xx를 해당 시나리오에 포함한다.

### §7. State

최소한 아래 상태도를 `state` DSL로 작성한다.

- **계정 수명주기**: `PendingVerification → Active`와 `PendingVerification → Expired/Abandoned`, `Active ↔ Locked`, `Active ↔ Suspended`, `Active → DeletionPending`, `DeletionPending → Active` 취소, `DeletionPending → Deleted/Anonymized`를 분기로 표현한다.
- **클라이언트 세션**: `Restoring → Anonymous/Authenticated → Refreshing → Authenticated/Expired/Revoked`
- **검증 challenge**: `Issued → Consumed/Expired/AttemptsExceeded/Revoked`. 성공 소비는 시도 차감·사용 완료와 원자 처리한다.
- **삭제 작업**: `Queued → Running → Retrying/Failed/Completed`. 불가역 삭제 뒤에는 취소 상태로 돌아가지 않는다.
- **주요 화면/컴포넌트**: 가입, 로그인, 복구, 프로필 편집, 민감 정보 변경, 탈퇴 확인의 idle/validating/submitting/success/error/retry 상태

각 수명주기에는 `전이 · actor · guard · side effect · 불변조건` 표를 붙인다. 상태 변화가 없는 안내 화면은 생략할 수 있으나 대상과 생략 사유를 표로 남긴다.

### §8. Screen Layout

- 네비게이션의 모든 Page마다 `layout` 블록을 하나씩 작성한다.
- Page 목록 표에 route, 공개 범위, 진입 조건, 주요 컴포넌트, API, 로딩/오류/빈 상태, 반응형 변화, 접근성 요구를 적는다.
- 중요한 재인증·탈퇴 확인·세션 만료 오버레이는 소속 Page의 컴포넌트로 명시한다.

### §9. API·오류 계약

- endpoint, method, 인증/CSRF, request, success response, 오류 코드, 멱등성 키, rate limit, timeout/retry, 감사 이벤트를 표로 작성한다.
- signed token은 algorithm allowlist·signature·issuer·audience·`exp`/`nbf`·token type·`kid`/key rotation을, opaque token은 introspection/cache/fail-closed를 계약에 적는다. 쿠키 endpoint는 속성·Origin/CSRF·credentialed CORS 정책을 함께 적는다.
- 로그아웃 endpoint는 성공 조건, cookie 만료 응답, IdP/refresh family 폐기 결과, access-token revocation latency, network timeout 시 pending/retry 계약을 적는다.
- 401(인증 필요/만료), 403(권한 부족), 404(노출 방지), 409(고유성/버전 충돌), 410(만료/삭제), 422(검증), 429(제한)의 프론트엔드 표시와 복구 행동을 구분한다.
- 가입·검증·탈퇴 같은 재시도 가능한 쓰기는 중복 요청의 동일 결과 또는 안전한 충돌을 보장한다.
- 응답 DTO는 비밀번호 해시, token 지문, 내부 보안 상태 같은 필드를 allowlist 방식으로 제외한다.

### §10. DynamoDB·RDS 데이터 설계

- 논리 관계 `erDiagram`, access pattern 표, 물리 item/key 표, GSI 표를 모두 작성한다.
- 인증 방식별 SoT 표와 관리형 IdP 연계 intent/finalize/재처리 상태를 작성한다. IdP 위임 항목은 DynamoDB item을 만들지 않는다.
- 각 item은 PK/SK, 주요 속성, 조건식, TTL, 민감도, 생성/갱신/삭제 주체, 관련 FR을 가진다.
- 고유성·동시성·멱등성·TTL 지연·hot partition·비용 최적화 근거를 별도 소절로 설명한다.
- RDS가 없으면 "불필요" 근거를 적고, 있으면 SoT/동기화/실패 복구/탈퇴 처리 표를 작성한다.

### §11. 보안·개인정보·접근성

- XSS, CSRF, CORS, CSP, 세션 고정, refresh 재사용, 계정 열거, brute force, credential stuffing, open redirect, replay 위협과 방어를 표로 작성한다.
- 비밀번호·access/refresh token·OTP·원문 개인정보는 URL, 로그, 분석 이벤트, 오류 추적 도구에 남기지 않는다. 자체 인증의 검증·재설정 링크는 짧은 만료의 고엔트로피 일회성 opaque token만 허용하고 서버에는 verifier만 저장한다. Referrer 전송과 로그/분석 수집을 차단하고, 즉시 제한 세션으로 교환한 뒤 `history.replaceState` 등으로 주소에서 제거한다. IdP가 복구를 소유하면 hosted recovery/IdP 일회성 계약이 동등한 속성을 보장하는지 검증하고 앱 저장소에 token/verifier를 중복 저장하지 않는다.
- 서비스 약관 수락, 필수 개인정보 처리의 법적 근거, 철회 가능한 선택적 개인정보·마케팅 동의를 분리한다. 종류·버전·동의 시각·철회 가능 여부·철회 효과를 서버에 증빙한다.
- 탈퇴 문구와 실제 삭제/익명화/법적 보존 범위가 일치해야 한다.
- 키보드만으로 완료 가능한지, 초점/오류 공지, 색상 외 상태 표현, 입력 자동완성, 모바일 화면을 검증한다.

### §12. 테스트·관측성

- 단위, 컴포넌트, API 계약, 통합, E2E, 접근성, 보안, 동시성, TTL 지연, 장애 복구 테스트를 설계한다.
- `계정 상태 × 역할 × 네트워크 × token 상태 × 복수 탭/기기` 테스트 매트릭스를 만든다.
- 가입/검증/로그인/갱신/복구/탈퇴 퍼널, 실패율, 지연, 429, 알림 발송 실패, 삭제 backlog를 관측한다.
- 핵심 인증·삭제 흐름별 SLI/SLO와 경보 임계치, 담당자, runbook을 정한다. refresh 재사용, 계정 잠금 급증, deletion `FAILED`/backlog는 별도 보안·운영 경보로 둔다.
- 제품 분석 이벤트와 보안 감사 이벤트를 분리하고 correlation ID·결과 코드·재시도 횟수만 기록한다. 민감 payload는 기록하지 않는다. 감사 이벤트는 보유 기간·최소 권한·위변조 방지 정책을 갖는다.

### §13. 추적성·미해결 이슈·구현 인계

- `FR-NN ↔ 적용 가능한 Page/Component ↔ API ↔ jobflow/navigation/state/layout ↔ 데이터 계약/access pattern/item ↔ 테스트` 매핑 표를 작성한다. 적용되지 않는 열은 `N/A + 사유`로 표시하며 형식을 맞추기 위한 Page·API·item을 만들지 않는다.
- Must 보류와 보안 핵심 결정 보류는 종료를 막는다. Should/Optional 보류는 사유, 위험, 결정권자, 확인 시점을 적고 허용할 수 있다.
- 구현 순서, feature flag/마이그레이션, 기존 세션·계정 이관, 롤백, 운영 준비 사항을 3~7개 불릿으로 인계한다. 핵심 문서의 "미해결 이슈·구현 인계" 요약과 일치해야 한다.

## 시나리오 상세 체크리스트

### 회원가입·연락처 소유 검증

- 필수/선택 약관을 분리하고 문서 버전·동의 시각을 기록한다.
- 이메일/휴대폰을 정규화하고, 중복 선조회와 실제 생성 사이 경합을 조건부 쓰기로 막는다.
- 코드 재발송 대기, 만료, 오입력 제한, 발송 실패, 채널 변경, 새로고침 후 재개를 설계한다.
- 미검증 계정의 만료·정리와 검증 완료 후 자동 로그인 여부를 정한다.
- 이미 로그인한 사용자의 가입 Page 접근과 중복 제출/요청 멱등성을 정의한다.

### 로그인·로그아웃·세션

- 잘못된 자격 증명, 미검증, 잠김, 정지, 탈퇴 대기 계정의 메시지와 복구 경로를 설계한다.
- 서버 확인 전 보호 데이터 노출을 막고, 안전한 딥링크 복귀 경로를 보존한다.
- refresh 회전, 재사용 탐지, 시계 오차, 유휴 만료 경고, 기기별 세션 폐기를 정한다.
- 로그아웃 API 오류 때 UI cache·민감 폼은 제거한다. 서버 오류 응답이면 cookie 만료와 원격 폐기 재시도를, 네트워크 단절이면 `LogoutPendingPage`와 재시도를 사용하며 완료로 오인하지 않는다.
- 로그아웃 뒤 브라우저 뒤로가기와 여러 탭의 stale 화면을 처리한다.

### 복구·자기 정보·보안 설정

- 존재하지 않는 계정의 재설정 요청도 같은 외부 응답을 사용한다.
- 일회성 링크/코드의 만료·소비·재사용·변조·다른 기기 열기를 처리한다.
- 저장 실패 시 입력을 보존하고, `version` 충돌 때 최신 정보 비교·재적용 흐름을 제공한다.
- 식별자 변경은 재인증→새 채널 검증→고유성 교체→세션/캐시 갱신 순서를 갖는다.
- 비밀번호 변경 후 현재/전체 세션 폐기 정책과 사용자 안내를 명시한다. 계정 복구를 통한 비밀번호 재설정은 기존 세션 전체 폐기를 기본값으로 삼고, 유지하려면 명시적 위험 승인을 남긴다.

### 탈퇴·재가입

- 현재 자격 증명 또는 강한 인증으로 재인증하고 영향을 구체적으로 안내한다.
- 즉시 삭제/유예/익명화, 유예 중 취소, 법적 보존, 연계 시스템 삭제, 실패 재시도를 정한다.
- 요청 즉시 보호 API 접근과 모든 세션을 차단할지 정책을 명시한다.
- 식별자 tombstone과 재사용 시점, 동일 사용자의 복구인지 새 `userId` 가입인지 결정한다.
- 프론트의 완료 문구는 비동기 삭제 상태와 실제 보존 범위를 과장하지 않는다.

## 설계-검증 게이트

작성 후 **핵심 문서 + 상세 파일 세트 전체**를 Critic 관점으로 검사한다. 위반이 있으면 지적된 섹션만 수정하고 다시 검사한다.

### P0 — 반드시 수정

- 회원가입·로그인·세션·복구·자기 정보·로그아웃·탈퇴 중 하나가 설계 또는 명시적 제외/대체 흐름 없이 누락됨
- FR 매핑 행이 없거나, 적용 가능한 설계 열이 비어 있거나, 비적용 열의 `N/A + 사유`가 없음
- 네비게이션의 모든 Page에 정확히 하나의 layout이 없거나, 상태 변화가 있는 Page/Component에 state가 없거나, 상태 변화가 없는 대상에 생략 사유가 없음
- 클라이언트 token 존재 또는 route guard만으로 인증·권한을 확정함
- `라우트/API × 역할 × 계정 상태` 행렬·서버 default-deny·알 수 없는 상태의 fail-closed 중 하나가 없음
- signed/opaque token 검증, refresh family 회전·재사용 폐기, cookie/CSRF/CORS, session ID 교체 중 선택한 방식에 필요한 통제가 없음
- 비밀번호·OTP·refresh/reset token 원문 저장/로그 또는 body의 `userId` 신뢰를 허용함. 단, 즉시 교환·제거하는 고엔트로피 일회성 검증/reset URL token은 위 §11 정책으로만 허용함
- 관리형 IdP와 DynamoDB의 SoT, subject↔userId 매핑, 비원자 연계 단계·실패 재처리가 없음
- 관리형 IdP 선택 시 provider-subject 조건부 고유 매핑, profile/map/intent finalize 원자성, 기존 매핑 수렴, finalize 충돌 복구 중 하나가 없음
- DynamoDB 접근 패턴과 PK/SK/GSI가 매핑되지 않음
- 고유성을 GSI 선조회만으로 보장하거나 TTL 삭제를 만료 판정의 즉시성 근거로 사용함
- 식별자 고유성·프로필 동시성·쓰기 멱등성·탈퇴 보존/삭제 정책이 없음
- 외부 경계가 둘 이상인 탈퇴에 계정 차단·세션 폐기·불가역 경계·정방향 재시도·삭제 작업 상태/운영 재처리가 없음
- 로그아웃 성공 조건·cookie 만료·network pending UX·access-token 거부 시점 또는 허용 지연이 없음
- 계정·클라이언트 세션·삭제 작업 상태를 혼합하거나 필수 복귀/종료 전이가 없음
- 근거 없는 파일/동작을 인용하거나 참고 서비스의 브랜드·도메인·URL·스키마를 보편 설계에 복제함
- `jobflow`를 sequenceDiagram으로 치환하거나 ASCII 다이어그램을 사용함

### P1 — 종료 전 수정

- 핵심 문서 간명성 위반: 화면 2~3장 초과, 항목당 대표 다이어그램 1개 초과(항목 5 는 2개 초과), 전체 분기·필드 단위 계약·물리 키 설계 혼입, 상세 파일 인덱스와 실제 파일 불일치·깨진 링크
- 핵심 문서 두괄식 조감 또는 다이어그램 하단 3~6개 설명이 없음
- 검증 실패·취소·뒤로가기·offline/timeout·세션 만료·429/5xx 흐름이 없음
- jobflow round-trip, navigation 분기 라벨 괄호, state 시작/종료 누락, layout 컨테이너 문법 위반
- API 오류→UI 복구 매핑 또는 개인정보 분류가 없음
- RDS 사용 근거·SoT·동기화·이중 쓰기 방지 또는 탈퇴 saga가 불명확함
- 접근성, 민감 로그 차단, 감사 이벤트, 경합/TTL 지연 테스트가 없음
- 결정하지 않은 정책을 가정 표에 남기지 않고 암묵적으로 선택함

### 종료 조건

검증 결과 표는 `등급/ID · 위치 · 근거 · 수정 · 상태` 열을 사용한다. 카운트는 아래처럼 계산한다.

- `unmapped_fr_count`: 매핑 행이 없거나 적용 가능한 열이 비어 있고 `N/A + 사유`도 없는 FR 수
- `uncovered_page_count`: layout 누락/중복 Page 수 + state 누락 대상 수 + 생략 사유 누락 대상 수
- `unresolved_must_fr_count`: 상태가 부분/보류인 Must FR 수
- `unresolved_security_decision_count`: 인증 방식·SoT·token/cookie·권한·탈퇴 불가역 경계 중 미확정 결정 수
- `active_placeholder_count`: 최종 문서 세트(핵심 문서 + 상세 파일)에 남은 `TODO`, `TBD`, `미정`, 빈 필수 셀 수
- `p0_count`, `p1_count`: 마지막 검증 결과 표에서 상태가 `open`인 각 등급 행 수

`clean := p0_count == 0 AND p1_count == 0 AND unmapped_fr_count == 0 AND uncovered_page_count == 0 AND unresolved_must_fr_count == 0 AND unresolved_security_decision_count == 0 AND active_placeholder_count == 0`

`clean`이면 종료하고 **① 보류한 Should/Optional FR과 사유 ② RDS 예외 영역 또는 불필요 근거 ③ 구현 인계 사항 ④ 참고 구현에서 의도적으로 채택하지 않은 항목**을 보고한다.
