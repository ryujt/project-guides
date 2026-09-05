# 프로젝트 폴더 구조 가이드

**함께 변경하는 기능의 코드·계약·테스트를 가까이 둔다.** 언어와 프레임워크의 관례를 따르면서도 기능 하나를 수정하려고 프로젝트 전역을 탐색하는 일을 줄인다. 경계·의존 방향·공개 API 기준은 [모듈 경계 가이드](./module-boundary-guide.md)를 따른다.

## 1. 구조 선택 원칙

* 기능·도메인 책임으로 먼저 묶고, 그 안에서 필요한 만큼 UI·유스케이스·규칙·외부 접근을 구분한다.
* 단순한 프로젝트는 작은 파일 묶음이나 기존 레이어 구조로 시작할 수 있다. 아래 트리를 전부 만들거나 이미 안정된 저장소를 한 번에 재배치하지 않는다.
* 폴더 이름은 경계를 설명할 뿐 접근을 막아 주지 않는다. 언어의 공개 범위, 패키지 exports, import 규칙, 아키텍처 검사 등 사용 가능한 수단으로 검증한다.
* 공용 코드와 전역 타입 폴더는 실제로 공유되는 안정된 계약에 한정한다. 한 기능의 helper·DTO·상수·상태를 전역으로 올리지 않는다.
* 외부 I/O 구현은 그 능력을 사용하는 기능 가까이에 둔다. 여러 기능이 같은 DB 연결 풀을 써도 업무 데이터의 쓰기 소유권은 기능별로 유지한다.
* 테스트는 소유 기능을 쉽게 찾을 수 있게 배치한다. 소스 옆 또는 루트 테스트 디렉터리 중 저장소 관례를 따른다.

## 2. 기능 중심 기본 구조

```text
project/
├── README.md
├── src/
│   ├── app/                    # 설정, 라우트 연결, 의존성 조립
│   ├── modules/
│   │   ├── orders/
│   │   │   ├── README.md        # 경계·계약·검증 명령 (복잡한 모듈에 필요)
│   │   │   ├── public.*         # 외부에 제공하는 진입점·계약
│   │   │   ├── usecases/        # 주문 기능의 순서·분기
│   │   │   ├── domain/          # 주문 규칙·모델
│   │   │   ├── adapters/        # HTTP·DB·외부 API 구현
│   │   │   └── tests/
│   │   └── inventory/
│   └── shared/                 # 좁고 안정된 공용 기능만
├── docs/                       # 전체 지도와 결정; 상세는 소유 모듈로 링크
├── scripts/
└── deployments/                # 배포 산출물이 있을 때
```

모듈 안의 `usecases/domain/adapters`는 **선택적 구분**이다. 작은 주문 기능이면 `public.ts`, `cancel-order.ts`, `order-store.ts`처럼 몇 파일로 충분하다. 외부 계약이 늘어나면 단일 파일에 모두 몰기보다 역할별 공개 진입점을 둘 수 있다.

의존 방향은 다음처럼 읽는다.

```text
app 조립 → 구체 adapter와 usecase 생성·연결
입력 adapter → usecase → domain
usecase → 필요한 Port 계약 ← 외부 adapter 구현
다른 모듈 → 허용된 공개 API
```

실행 중 Port 호출은 adapter에 도달하지만, 핵심 규칙의 소스가 외부 SDK에 의존할 필요는 없다. 공개 API 내부에서 불필요한 내부 타입을 모두 재노출하지 않는다.

## 3. Python

다음은 `src` layout을 사용하는 예다. 기존 패키징 방식을 우선하며 패키지·모듈은 `snake_case`, 클래스는 `PascalCase`를 사용한다.

```text
python-project/
├── pyproject.toml
├── src/
│   └── project_name/
│       ├── __init__.py
│       ├── __main__.py
│       ├── app.py
│       └── orders/
│           ├── __init__.py
│           ├── public.py
│           ├── cancel_order.py
│           ├── rules.py
│           └── adapters/
│               └── sql_order_store.py
└── tests/
    └── orders/
        └── test_cancel_order.py
```

외부 사용자는 `orders.public` 등 합의한 경로로 접근한다. 밑줄·디렉터리만으로 다른 패키지의 내부 import가 차단되지는 않으므로 필요한 경우 lint/import 검사로 강제한다. 의존성 파일은 사용하는 패키지 관리 도구에 맞게 선택하며 같은 목록을 여러 파일에서 수동 관리하지 않는다.

## 4. Node.js / TypeScript 백엔드

TypeScript를 사용하는 예다. 파일 이름은 프로젝트가 선택한 `kebab-case` 또는 기존 관례를 일관되게 따른다.

```text
node-project/
├── package.json
├── tsconfig.json
├── src/
│   ├── main.ts
│   ├── app/
│   │   └── compose.ts
│   └── modules/
│       └── orders/
│           ├── index.ts
│           ├── contract.ts
│           ├── cancel-order.ts
│           ├── order-rules.ts
│           ├── adapters/
│           │   ├── order-routes.ts
│           │   └── sql-order-store.ts
│           └── cancel-order.test.ts
└── docs/
```

`index.ts`는 허용된 진입점만 export한다. 파일을 만들었다는 사실만으로 deep import가 금지되지는 않는다. 사용 중인 모듈 체계에 맞는 package exports나 lint 제한으로 `orders/adapters/*` 같은 내부 접근을 검증한다. route/controller는 요청 해석·응답 변환을 맡고 도메인 규칙은 기능 내부에 둔다.

## 5. React와 Next.js

UI도 기능별로 응집시키고 화면 조합과 업무 상태를 구분한다.

```text
src/
├── app/                        # 앱 조립·라우트·provider
├── pages/                      # 일반 React에서 사용하는 화면 조합 (선택)
├── features/
│   └── orders/
│       ├── index.ts
│       ├── components/
│       ├── use-orders.ts
│       ├── api/
│       ├── state/              # 이 기능이 소유한 UI 상태
│       └── tests/
└── shared/
    ├── ui/
    └── http/
```

* 단일 컴포넌트의 상태는 그 컴포넌트에 둔다. 여러 화면이 실제로 공유해야 할 때만 기능 상태나 상위 상태로 올린다.
* 서버에서 확정하는 업무 상태와 UI의 임시 입력·표시 상태를 구분한다. 서버 캐시, URL, 전역 store에 같은 사실을 중복 저장하지 않는다.
* Next.js App Router를 사용하면 `app/`의 프레임워크 라우팅 규칙을 따른다. 일반 React의 `pages/` 구조를 함께 강제하지 않는다.
* 서버 전용 DB·비밀 설정이 클라이언트 번들에 섞이지 않게 서버·클라이언트 경계를 명시한다. 공용 barrel export로 이 경계가 흐려지지 않게 한다.
* 한 기능에만 쓰는 훅·컴포넌트·API 코드는 해당 기능 안에 둔다. 여러 기능을 조합하는 화면이 다른 기능의 비공개 store를 직접 수정하지 않게 한다.

## 6. Go

아래는 실행 파일과 애플리케이션 내부 패키지를 나누는 예다. 모듈 규모가 작으면 더 단순한 배치도 가능하다.

```text
go-project/
├── go.mod
├── cmd/
│   └── app/
│       └── main.go
├── internal/
│   ├── app/
│   │   └── compose.go
│   └── orders/
│       ├── service.go
│       ├── rules.go
│       ├── service_test.go
│       └── internal/
│           └── sqlstore/
│               └── store.go
├── migrations/
└── docs/
```

패키지명은 짧은 소문자, 테스트는 `*_test.go`를 사용한다. Go의 `internal`은 허용된 import 범위를 제한하지만 최상위 `internal/`만으로 그 안의 모든 기능 사이가 격리되지는 않는다. 공개 식별자·중첩 `internal`·패키지 경계를 목적에 맞게 정한다.

위 중첩 `orders/internal/sqlstore`는 `orders` 바깥 조립 코드에서 직접 import할 수 없다. 주문 패키지가 좁은 구성 진입점을 제공해 내부 adapter를 연결하거나, 외부 조립이 필요하면 adapter 위치를 허용 범위로 옮기고 import 검사를 추가한다. 순환 import를 피하도록 Port를 필요로 하는 쪽에서 정의한다. 외부 공개 패키지가 없다면 `pkg/`를 만들 필요는 없다.

## 7. 기존 구조를 점진적으로 바꾸기

1. 대표 변경 하나에서 실제로 함께 읽고 수정하는 파일을 찾는다. 폴더 수보다 변경의 파급 범위를 기록한다.
2. 그 기능의 공개 진입점과 데이터 쓰기 책임을 먼저 정한다.
3. 해당 기능의 규칙·adapter·테스트를 함께 이동하고 내부 import를 갱신한다. 공개 경로 변경은 소비자와 호환성까지 처리한다.
4. 기존 테스트·빌드·의존 검사로 동작과 경계를 확인한다.
5. 기능 지역성이 좋아진 근거가 있을 때 다음 기능으로 확장한다. 일괄 폴더 정리가 목표가 되지 않게 한다.

모듈 README는 복잡한 경계를 설명할 때 추가한다. 작은 파일마다 설명 문서를 만들지 않는다. 전체 README에는 모듈 지도와 진입점, 실행·검증 방법을 두고 상세 계약은 소유 모듈을 링크한다.
