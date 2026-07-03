# 프로젝트 폴더 구조 가이드

언어별 관례는 따르되, **프로젝트 내부의 책임 분리는 일관되게 유지**하기 위한 표준 폴더 구조 가이드다.

---

## 1. 공통 원칙

역할을 기준으로 폴더를 나눈다.

| 구분 | 역할 |
|---|---|
| `config` | 환경 변수, 설정값, 실행 환경별 설정 |
| `core` · `domain` | 핵심 비즈니스 규칙, 도메인 모델 |
| `services` · `usecases` | 도메인 로직을 조합하는 애플리케이션 서비스 |
| `gateways` · `clients` · `adapters` | 외부 API, 메시지 큐, 서드파티 연동 |
| `repositories` | DB 접근, 영속성 처리 |
| `api` · `interfaces` · `handlers` · `controllers` | HTTP·CLI·GraphQL 등 외부 진입점 |
| `utils` · `lib` · `common` | 도메인에 종속되지 않는 공용 유틸리티 |
| `tests` | 테스트 코드 |
| `docs` · `examples` · `scripts` | 문서 · 예제 · 보조 스크립트 |
| `deployments` · `infra` | Docker, Kubernetes, Terraform 등 배포 파일 |

핵심 기준:

1. 핵심 비즈니스 로직은 외부 기술에 의존하지 않게 둔다.
2. 외부 API·DB·파일 시스템 접근은 `gateways`·`repositories`·`clients`로 분리한다.
3. 라우터·컨트롤러에는 비즈니스 로직을 넣지 않는다.
4. `utils`는 최소화하고, 특정 도메인 전용 코드는 해당 도메인 폴더에 둔다.
5. 테스트 구조는 실제 소스 구조를 따라간다.
6. 언어별 네이밍 관례를 우선한다.

---

## 2. 범용 백엔드 구조

```text
project-name/
├── README.md
├── .env.example
├── config/
├── src/
│   ├── app/            # 초기화, 의존성 조립, 부트스트랩
│   ├── api/            # 라우터, 컨트롤러, 요청/응답 스키마
│   ├── core/           # 순수 비즈니스 로직, 도메인 규칙
│   ├── services/       # 유스케이스, 도메인 조합
│   ├── gateways/       # 외부 서비스 API 호출
│   ├── repositories/   # DB 접근, 영속성
│   └── utils/          # 범용 헬퍼
├── tests/
├── docs/
├── examples/
└── scripts/
```

---

## 3. Python

`src` layout 을 권장한다. **디렉터리·파일은 `snake_case`, 클래스만 `PascalCase`.**

```text
python-project/
├── README.md
├── pyproject.toml
├── requirements.txt
├── .env.example
├── src/
│   └── project_name/
│       ├── __init__.py
│       ├── __main__.py
│       ├── main.py
│       ├── config/
│       │   └── settings.py
│       ├── api/
│       │   ├── routes.py
│       │   └── schemas.py
│       ├── core/
│       │   └── domain_name/
│       │       ├── models.py
│       │       ├── service.py
│       │       └── rules.py
│       ├── services/
│       │   └── usecase_name.py
│       ├── gateways/
│       │   └── external_api_name/
│       │       ├── client.py
│       │       └── schemas.py
│       ├── repositories/
│       │   └── repository_name.py
│       └── utils/
│           └── date_utils.py
├── tests/
│   ├── unit/
│   ├── integration/
│   └── conftest.py
├── docs/
├── examples/
└── scripts/
```

| 대상 | 방식 | 예시 |
|---|---|---|
| 패키지·모듈 | `snake_case` | `stock_chart`, `market_info` |
| 파일명 | `snake_case.py` | `order_service.py` |
| 클래스명 | `PascalCase` | `OrderService` |
| 함수명 | `snake_case` | `get_order_history` |
| 테스트 파일 | `test_*.py` | `test_order_service.py` |

`core/ModuleName/ModuleName.py` 처럼 디렉터리·파일을 `PascalCase` 로 두는 방식은 Python 관례에 맞지 않는다. 도메인 폴더는 `snake_case` 로 두고 내부를 `models.py`·`service.py`·`rules.py` 로 나눈다.

---

## 4. Node.js 백엔드

TypeScript 기준이 실무 표준이다.

```text
node-project/
├── README.md
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── main.ts
│   ├── app.ts
│   ├── config/
│   │   └── env.ts
│   ├── api/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   └── validators/
│   ├── core/
│   │   └── domain-name/
│   │       ├── model.ts
│   │       ├── service.ts
│   │       └── rules.ts
│   ├── services/
│   │   └── usecase-name.service.ts
│   ├── gateways/
│   │   └── external-api-name/
│   │       ├── client.ts
│   │       └── types.ts
│   ├── repositories/
│   │   └── repository-name.repository.ts
│   ├── utils/
│   └── types/
├── tests/
├── docs/
└── scripts/
```

| 대상 | 방식 | 예시 |
|---|---|---|
| 폴더명 | `kebab-case` 또는 `camelCase` | `order-history` |
| 파일명 | `kebab-case` + 역할 접미사 | `order.service.ts` |
| 클래스·타입명 | `PascalCase` | `OrderService`, `OrderResponse` |
| 함수명 | `camelCase` | `getOrderHistory` |

역할 분리: `routes`(URL↔컨트롤러) · `controllers`(요청·응답) · `services`(유스케이스) · `repositories`(DB) · `gateways`(외부 API) · `middlewares`(인증·로깅·에러) · `validators`(요청 검증).

---

## 5. React

화면·기능·컴포넌트 단위로 나눈다. 규모가 커지면 `features` 중심 구조가 좋다.

```text
react-project/
├── README.md
├── package.json
├── tsconfig.json
├── .env.example
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── app/
│   │   ├── router.tsx
│   │   └── providers.tsx
│   ├── pages/
│   │   └── PageName/
│   │       └── PageName.tsx
│   ├── features/
│   │   └── feature-name/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── api/
│   │       ├── stores/
│   │       ├── types.ts
│   │       └── index.ts
│   ├── components/common/
│   ├── hooks/
│   ├── services/
│   │   └── api-client.ts
│   ├── stores/
│   ├── assets/
│   ├── styles/
│   ├── utils/
│   └── types/
├── tests/
└── docs/
```

| 대상 | 방식 | 예시 |
|---|---|---|
| 컴포넌트 파일·이름 | `PascalCase` | `OrderList.tsx` |
| 훅 파일·함수 | `use*` | `useOrders.ts` |
| 유틸 파일 | `camelCase` 또는 `kebab-case` | `formatDate.ts` |
| 기능 폴더 | `kebab-case` | `order-history` |

특정 기능에만 쓰이는 컴포넌트·훅·API는 전역 폴더가 아니라 해당 `features/*` 내부에 둔다. 전역 재사용 요소만 `components/common`·`hooks`·`services` 에 둔다.

---

## 6. Next.js (App Router)

라우팅은 프레임워크가 `app` 디렉터리로 결정한다.

```text
next-project/
├── README.md
├── package.json
├── next.config.js
├── tsconfig.json
├── .env.example
├── public/
├── src/
│   ├── app/            # 라우팅, 레이아웃, 페이지
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── feature-name/
│   │       └── page.tsx
│   ├── features/       # 기능별 비즈니스 UI 로직
│   ├── components/     # 공용 컴포넌트
│   ├── lib/            # 서버 액션, 인증, DB 클라이언트 등 인프라
│   ├── services/       # 외부 API 호출
│   ├── hooks/
│   ├── stores/
│   ├── styles/
│   ├── utils/
│   └── types/
├── tests/
└── docs/
```

---

## 7. Go

`src` 를 두지 않으며, 테스트는 소스와 같은 패키지에 `*_test.go` 로 둔다.

```text
go-project/
├── README.md
├── go.mod
├── go.sum
├── .env.example
├── cmd/
│   └── app-name/
│       └── main.go
├── internal/
│   ├── config/
│   ├── app/
│   ├── api/
│   │   ├── handler/
│   │   ├── middleware/
│   │   └── router/
│   ├── core/
│   │   └── domainname/
│   │       ├── model.go
│   │       ├── service.go
│   │       └── rules.go
│   ├── service/
│   ├── gateway/
│   └── repository/
├── pkg/
├── api/
├── migrations/
├── deployments/
├── scripts/
└── docs/
```

| 대상 | 방식 | 예시 |
|---|---|---|
| 패키지명 | 짧은 소문자 | `order`, `market` |
| 파일명 | 짧게, 역할 중심 | `service.go`, `handler.go` |
| 인터페이스명 | 역할 중심 `PascalCase` | `Repository`, `Client` |
| 테스트 파일 | `*_test.go` | `service_test.go` |

`cmd`(실행 진입점) · `internal`(외부 import 차단) · `pkg`(외부 재사용 공개 패키지) · `api`(OpenAPI·Protobuf 명세) · `migrations`(DB 마이그레이션) · `deployments`(배포 설정)로 나눈다. 외부에서 재사용할 코드가 없으면 `pkg` 는 만들지 않는다.

---

## 8. 언어별 차이 요약

| 항목 | Python | Node.js | React | Go |
|---|---|---|---|---|
| 소스 루트 | `src/project_name` | `src` | `src` | `internal`, `cmd` |
| 진입점 | `main.py`, `__main__.py` | `main.ts` | `main.tsx`, `App.tsx` | `cmd/app/main.go` |
| 테스트 위치 | 루트 `tests` | 루트 `tests` 또는 소스 옆 | 루트 `tests` 또는 컴포넌트 옆 | 소스 옆 `*_test.go` |
| 폴더 네이밍 | `snake_case` | `kebab-case`·`camelCase` | 컴포넌트는 `PascalCase` | 짧은 소문자 |
| 도메인 로직 | `core` | `core`·`domain` | `features` 내부 | `internal/core` |
| 외부 연동 | `gateways` | `gateways`·`clients` | `services`·`api` | `gateway`·`repository` |
| 설정 | `config/settings.py` | `config/env.ts` | `.env`, `config` | `internal/config` |

---

## 9. 프로젝트 내부 규칙 예시

문서·README 에 넣을 수 있는 기준 문장이다.

> 프로젝트는 기능과 책임을 기준으로 폴더를 분리한다.
> 핵심 비즈니스 로직은 `core` 에 두고, 외부 시스템 연동은 `gateways` 또는 `repositories` 에 둔다.
> HTTP·CLI·스케줄러 등 외부 진입점은 `api`·`interfaces`·`cmd` 등 별도 계층에 둔다.
> 공용 유틸리티는 `utils` 에 두되, 특정 도메인 전용 코드는 해당 도메인 폴더 내부에 둔다.
> 테스트는 언어별 관례를 따르되 가능한 한 실제 소스 구조를 따라간다.

**Python**

> 패키지·모듈명은 `snake_case`, 클래스명은 `PascalCase` 를 사용한다.
> 테스트 파일은 `test_*.py` 형식을 따른다.
> 실행 진입점은 `main.py` 또는 `__main__.py` 에 둔다.

**Node.js · React**

> TypeScript 사용을 기본으로 한다.
> 컴포넌트명은 `PascalCase`, 함수·변수는 `camelCase` 를 사용한다.
> 기능 단위 코드는 `features` 내부에 응집시키고, API 호출·상태 관리·화면 컴포넌트를 역할별로 분리한다.

**Go**

> 실행 진입점은 `cmd` 아래에 둔다.
> 외부에서 import 되면 안 되는 코드는 `internal` 에 둔다.
> 외부 재사용 목적이 없으면 `pkg` 는 만들지 않는다.
> 테스트는 소스와 같은 패키지에 `*_test.go` 로 둔다.
> 패키지명은 짧고 명확한 소문자로 작성한다.
