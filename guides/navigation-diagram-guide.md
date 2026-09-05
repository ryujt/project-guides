# Navigation Diagram Guide

## 목적

* 사용자가 웹 사이트/프로그램을 이용하며 겪는 **네비게이션(화면 이동)** 을 단순한 스크립트 형식으로 표현해 이용 시나리오를 설계하고 분석한다.
* 초점은 **"사용자가 어느 화면에서 어느 화면으로, 무엇 때문에 이동하는가"** 이다.
* 화면 전환을 유발하거나 좌우하는 요소(API 호출, 내부 처리, 판단 데이터)만 함께 표현한다.
* 시스템 내부 구현(모듈 간 통신, 저수준 이벤트 흐름)은 이 다이어그램의 대상이 아니다.

## 이 다이어그램이 다루는 것 / 다루지 않는 것

**다룬다**

* 사용자에게 보이는 화면과 화면 사이의 이동
* 화면 이동을 일으키는 사용자 동작(클릭, 폼 제출, 링크 접속)
* 이동 여부를 결정하는 API 호출, 내부 처리(검증 등), 판단 데이터

**다루지 않는다**

* 내부 모듈/서비스 간의 상호작용(예: `PeerManager --> DataChannelManager`)
* 화면 이동과 무관한 시스템 이벤트나 통신 흐름(예: WebRTC peer 연결, data channel 브로드캐스트, 오디오 트랙 부착)
* 모든 내부 상태 전이를 나열하는 상태도(State Diagram)식 표현

> 이런 내부 흐름은 별도의 시퀀스/아키텍처 문서에서 다룬다. 네비게이션 다이어그램에 섞으면 화면 이동이 보이지 않게 된다.

## 범위와 계약

한 사용자 과업이나 이번 변경과 연결된 화면만 작성한다. 전체 화면 목록이나 내부 구현을 먼저 읽지 말고, 해당 화면의 진입 조건·이동 결과·직접 사용하는 API 계약에서 시작한다. 다른 화면은 이름과 계약 링크만 참조하고, 변경 영향이 발견될 때 범위를 확장한다. 공통 기준은 [module-boundary-guide.md](module-boundary-guide.md)를 따른다.

화면명은 UI 관점의 식별자다. 같은 이름을 사용한다고 상태·서버 데이터의 소유자나 코드 모듈 경계가 결정되는 것은 아니다. 라우트, 화면 소유 모듈, 필요한 상태/API 계약은 다이어그램 밖에서 연결한다.

## 구성 요소

* **FrontPage**: 화면(사용자에게 보이는 페이지) 이름
  * 예: Home, LoginForm, Dashboard
  * 원칙: 사용자가 실제로 인지하는 화면·오버레이만 노드로 쓴다. 내부 모듈/서비스는 화면 노드로 쓰지 않는다.

* **(backend api)**: 화면 전환에 영향을 주는 백엔드 API 호출
  * 예: (/signin), (/create_order)
  * **작성 관례**: 논리 API 이름은 소문자 알파벳, 숫자, 슬래시 `/`, 밑줄 `_`로 간결하게 쓴다. 이는 프로젝트의 실제 endpoint를 바꾸라는 규칙이 아니다. HTTP method, 경로 파라미터 등이 필요한 실제 주소는 별도 계약 표에 원문 그대로 적어 연결한다. 파서가 허용하는 문자 범위와 이 명명 관례는 구분한다.

* **(process)**: 화면 이동을 좌우하는 내부 처리 단계
  * 예: (validate_form), (confirm_delete), (generate_room_id)
  * 원칙: 이동 여부(성공/실패/분기)를 결정하는 처리만 표현한다. 화면과 무관한 순수 로직은 넣지 않는다.

* **`message`**: 화면 이동을 판단하는 데 쓰이는 메시지 또는 데이터 객체
  * 백틱(`` ` ``)으로 감싸 표기한다.
  * 예: `` `credentials` ``, `` `userInfo` ``, `` `errorResult` ``

## Page와 Component

* **Page**는 주소(라우트)를 가지는 단위이다.
* **Component**는 주소를 가지지 않는 단위이다. Page에 포함되어 사용된다. (React.js처럼)
* 페이지 이동은 하지 않지만 사용자 과업의 주요 단계인 컴포넌트 선택이 바뀌면 `Page(Component)`를 화면 식별자로 쓸 수 있다. 이것은 아래 예시처럼 라벨에 붙이는 작성 관례이며, 컴포넌트 계층을 해석하는 별도 DSL 문법은 아니다. 순수한 탭 스타일·선택 상태는 필요한 경우 state 문서에서 다룬다.

```navigation
PageA(FileList) --> PageA(ImageList) : 이미지 목록 선택
PageA(ImageList) --> PageA(FileList) : 파일 목록 선택
```

* 하지만 콤포넌트 변동이 중요하지 않은 시나리오에서는 굳이 괄호를 사용해서 콤포넌트 변화를 네비게이션으로 설명하지 않는다.

## 작성 규칙

1. **Page → Page**
  * 사용자의 동작에 따른 화면 전환
  * 예: `Home --> SignupForm : 회원가입 버튼 클릭`

2. **Page → API call**
  * 페이지에서 서버로 요청을 보낸다
  * 예: `SignupForm --> (/signup)`

3. **API call → Page**
  * API 응답 결과에 따라 화면 전환 또는 에러 처리
  * 예:
    ```
    (/signup) --> SignupForm : error
    (/signup) --> Dashboard : success
    ```

4. **Page → Internal Process**
  * 페이지 내부에서 이동 판단을 위한 처리를 실행한다
  * 예: `CheckoutForm --> (validate_form)`

5. **Internal Process → Page, API call, or Internal Process**
  * 처리 결과에 따라 화면을 전환하거나, 추가 요청을 보내거나, 다음 판단 단계로 넘어간다
  * 예:
    ```
    (validate_form) --> CheckoutForm : invalid
    (validate_form) --> (/create_order) : success
    (/create_order) --> OrderConfirmation : success
    ```

6. **Message / Data 전달**
  * 이동 판단에 쓰이는 메시지나 데이터 객체는 백틱으로 감싸 노드로 표현한다.
  * 예:
    ```
    LoginForm --> `credentials`
    `credentials` --> (/login)
    (/login) --> `authToken` : success
    `authToken` --> Dashboard
    ```

## 직접 진입(URL 접속) 표현

북마크·초대 링크·메일 링크·새로고침처럼 화면 이동이 아니라 **URL 접속으로 시작하는 시나리오**의 표기법이다.

* **진입 자체를 노드나 화살표로 그리지 않는다.** 다이어그램은 **도착 화면에서 시작**하고, 어떤 주소로 어떻게 들어오는지는 산문(트리거 설명)으로 밝힌다.
* 진입을 가드(인증 검사·접근 조건 리다이렉트)가 가로채 도착 화면이 갈리는 경우에는 그 판단 `(process)` 노드에서 시작한다. 진입 지점 노드는 대개 들어오는 화살표 없이 시작하지만, 뒤 흐름이 진입 노드로 되돌아와 화살표가 생겨도 무방하다 — **어느 노드가 진입 지점인지는 항상 산문이 밝힌다.**
* **도착 화면이 갈리지 않는 고정 리다이렉트**(미정의 경로 → 홈 등)는 다이어그램으로 그리지 않고, 라우트 맵과 산문으로만 밝힌다.
* **진입 즉시 API 가 호출되는 경우**에도 다이어그램을 `(backend api)` 노드로 시작하지 않는다. 호출 여부·파라미터를 읽는 판단을 가드 `(process)` 로 두고 `(process) --> (/api)` 로 잇는다.
* **`Browser`, `User`, `Email` 같은 행위자·매체 노드를 만들지 않는다.** 노드는 화면, `(backend api)`, `(process)`, `` `message` `` 네 가지뿐이다. 모든 화면이 브라우저 위에 있으므로 `Browser` 노드는 아무 정보도 더하지 않으면서, 화면이 아닌 것이 출발점처럼 읽혀 페이지 전환 흐름을 가린다.

```navigation
(check_auth) --> LoginForm : 미로그인
(check_auth) --> Dashboard : 로그인됨
```

* 위는 "대시보드 주소를 북마크로 직접 진입"하는 시나리오의 시작부다. `Browser --> (check_auth)` 같은 진입 화살표 없이 가드 `(check_auth)` 에서 시작하고, 진입 방법은 이 문장처럼 산문으로 밝힌다.

## 분기

전이 라벨은 `From --> To : 라벨`처럼 ` : ` 양쪽에 공백을 둔다. 라벨의 상태 이름만 보고 HTTP 상태코드·권한·오류 처리 방식까지 추측하지 않는다. 이 정보가 이동 결과를 좌우하면 관련 API/상태 계약을 연결한다.

* `: error`, `: success`, `: invalid` 와 같이 상태만 명시한다.
* 규칙: 콜론 뒤 설명문에는 괄호를 사용하지 않는다.

  * 잘못된 예: `: (오류 발생)`
  * 올바른 예: `: 오류 발생`

## 안티패턴

네비게이션이 아닌 내용이 섞이면 다이어그램이 상태도처럼 변해 화면 이용 흐름을 읽을 수 없게 된다. 아래는 피해야 할 패턴이다.

* **행위자·매체를 노드로 표현**
  * 잘못된 예:
    ```
    Browser --> Home : 직접 진입
    Email --> ResetPassword : 재설정 링크 클릭
    ```
  * 이유: `Browser`, `Email`, `User` 는 화면도 API 도 아니다. URL 직접 진입은 도착 화면(또는 진입을 검사하는 `(process)`)에서 다이어그램을 시작하고, 진입 방법은 산문으로 밝힌다.

* **내부 모듈 간 상호작용을 노드로 표현**
  * 잘못된 예:
    ```
    PeerManager --> DataChannelManager : open_data_channels
    SevenPanSDK --> AudioManager : get_user_media
    ```
  * 이유: `PeerManager`, `DataChannelManager`, `AudioManager` 는 사용자가 보는 화면이 아니라 내부 구현 모듈이다. 화면 이동과 무관하다.

* **화면 이동을 유발하지 않는 시스템 이벤트 나열**
  * 잘못된 예:
    ```
    WebSocketSignaling --> PeerManager : room_peers
    DataChannelManager --> Classroom : canvas_sync_received
    ```
  * 이유: 같은 화면에 머무는 동안 발생하는 데이터 동기화·통신 이벤트는 네비게이션이 아니다.

* **모든 내부 상태 전이를 상태도처럼 표현**
  * 화면 안에서만 바뀌는 세부 상태(툴 선택, 탭 전환 등 화면 이동이 없는 상호작용)까지 전부 노드로 만들면 다이어그램이 상태도가 된다.
  * 화면 이동이 없는 화면 내부 상호작용은 필요할 때만 최소한으로 표현하거나 설명 문장으로 대체한다.

**판단 기준**: "이 화살표가 사용자를 다른 화면(또는 오버레이)으로 이동시키거나, 그 이동 여부를 결정하는가?" 아니라면 네비게이션 다이어그램에 넣지 않는다.

## 예시 - 온라인 클래스룸

### 직접 링크 입장 시나리오

초대 링크(`/:roomId`)로 직접 접속하면 `ClassroomNameOverlay` 가 첫 화면으로 뜬다. 직접 진입은 노드로 그리지 않으므로 다이어그램은 도착 화면에서 시작하고, 내부 통신(SDK 준비, 방 연결 모듈 흐름)은 화면 이동을 결정하는 지점만 처리 노드로 압축한다.

```navigation
ClassroomNameOverlay --> (validate_display_name)
(validate_display_name) --> ClassroomNameOverlay : empty_name
(validate_display_name) --> (connect_room) : success
(connect_room) --> Classroom : connected
(connect_room) --> ClassroomNameOverlay : duplicate_name
```

* 방 연결 과정의 내부 모듈(SDK, PeerManager, DataChannelManager 등)은 `(connect_room)` 하나의 처리로 요약한다.
* 결과(연결 성공 / 이름 중복)에 따른 **화면 이동**만 분기로 남긴다.

### 회원가입 시나리오

화면 전환과 API 응답에 따른 분기를 표현한다.

```navigation
Home --> TermsAgreement : 회원가입 버튼 클릭
TermsAgreement --> Home : 약관 거부
TermsAgreement --> SignupForm : 약관 동의
SignupForm --> (validate_form)
(validate_form) --> SignupForm : invalid
(validate_form) --> (/signup) : success
(/signup) --> SignupForm : error
(/signup) --> Home : success
```

### 로그인 및 비밀번호 찾기 시나리오

로그인, 로그아웃, 비밀번호 찾기·재설정 등 계정 관련 일반적인 화면 흐름을 표현한다. 회원가입은 위 회원가입 시나리오를 그대로 사용한다.

**로그인 / 로그아웃**

```navigation
Home --> LoginForm : 로그인 버튼 클릭
LoginForm --> (validate_form)
(validate_form) --> LoginForm : invalid
(validate_form) --> (/login) : success
(/login) --> LoginForm : error
(/login) --> Home : success
Home --> (/logout) : 로그아웃
(/logout) --> Home
LoginForm --> ForgotPassword : 비밀번호 찾기 클릭
```

**비밀번호 찾기 / 재설정**

```navigation
ForgotPassword --> (/password/send_code)
(/password/send_code) --> ForgotPassword : error
(/password/send_code) --> VerifyCode : sent
VerifyCode --> (/password/verify_code)
(/password/verify_code) --> VerifyCode : invalid
(/password/verify_code) --> ResetPassword : verified
ResetPassword --> (/password/reset)
(/password/reset) --> ResetPassword : error
(/password/reset) --> LoginForm : success
```

* 비밀번호 찾기는 로그인과 다른 화면·API를 쓰므로 별도 다이어그램으로 분리한다. 두 흐름은 `LoginForm --> ForgotPassword` 로만 연결된다.
* 이메일로 발송된 인증코드를 `VerifyCode` 화면에서 입력해 본인 확인을 거친 뒤, `ResetPassword` 화면에서 새 비밀번호를 설정한다.
* 재설정 완료 후에는 다시 로그인하도록 `LoginForm` 으로 이동시킨다.

## 예시 - 쇼핑몰

상품 탐색부터 주문·결제, 주문 조회까지의 화면 흐름을 표현한다. 회원가입·로그인은 위 계정 시나리오를 그대로 사용한다.

### 상품 탐색 및 장바구니

```navigation
Home --> ProductList : 카테고리 선택
Home --> SearchResult : 검색어 입력
ProductList --> ProductDetail : 상품 선택
SearchResult --> ProductDetail : 상품 선택
ProductDetail --> (/cart/add) : 장바구니 담기
(/cart/add) --> ProductDetail : error
(/cart/add) --> Cart : success
ProductDetail --> Cart : 장바구니 보기
```

* 담기 실패는 `ProductDetail` 에 머물고, 성공하면 `Cart` 로 이동한다.

### 주문 및 결제

로그인 여부에 따라 주문 화면 진입이 갈리므로 `(check_auth)` 처리로 분기한다.

```navigation
Cart --> (check_auth) : 주문하기
(check_auth) --> LoginForm : 미로그인
(check_auth) --> Checkout : 로그인됨
LoginForm --> (/login)
(/login) --> LoginForm : error
(/login) --> Checkout : success
Checkout --> (validate_order)
(validate_order) --> Checkout : invalid
(validate_order) --> (/orders) : success
(/orders) --> Checkout : error
(/orders) --> PaymentForm : created
PaymentForm --> (/payment)
(/payment) --> PaymentForm : failed
(/payment) --> OrderComplete : paid
```

* 미로그인 사용자는 `LoginForm` 을 거쳐 다시 `Checkout` 으로 돌아온다.
* 주문 생성`(/orders)`과 결제`(/payment)`는 별도 단계로 나누고, 각 실패는 직전 화면으로 되돌린다.

### 주문 조회

```navigation
Home --> OrderList : 주문 내역
OrderComplete --> OrderDetail : 주문 상세 보기
OrderList --> OrderDetail : 주문 선택
```

* 이 예시의 주문 취소는 `OrderDetail`에 머물며 주문 상태·결과 메시지만 바꾼다. 따라서 이동도에는 넣지 않고, 필요할 때 주문 상태도나 API 계약에서 성공·실패를 설명한다.


## 검토와 확인

- 시작 화면/가드와 URL 직접 진입 조건을 본문에서 찾을 수 있는가?
- 화살표가 실제 화면 이동 또는 그 판단에 필요한가? 내부 queue/topic/API 협력은 [job-flow-diagram-guide.md](job-flow-diagram-guide.md)로 분리하고, 필요한 시간 순서만 sequenceDiagram으로 보완했는가?
- 대상 시나리오의 성공·검증 실패·접근 거부 후 도착 화면이 실제 요구사항/코드와 맞는가?
- UI 표시 상태와 서버의 권한·업무 상태 소유자를 구분했는가?

원본 문법은 [tools-camp-markdown-guide.md](tools-camp-markdown-guide.md)를 참고한다. 링크·이름·분기 대조는 정적 검토이고, 대상 렌더러에서 표시를 확인한 경우에만 렌더링 검증으로 기록한다.
