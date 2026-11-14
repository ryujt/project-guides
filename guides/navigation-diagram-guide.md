# Navigation Diagram Guide

## 목적

**사용자가 어느 화면에서 어느 화면으로, 무엇 때문에 이동하는가**를 스크립트로 표현해 이용 시나리오를 설계·분석한다. 이 문서는 `navigation`의 작성 문법과 의미를 정의한다.

Markdown 문서·다이어그램의 tools.camp 링크 생성 여부 확인과 전달은 [편집 링크 전달 기준](diagram-editor-link-guide.md)을 따른다.

## 이 다이어그램이 다루는 것 / 다루지 않는 것

화면·오버레이 이동과 이를 결정하는 사용자 동작, API, 내부 처리, 판단 데이터를 다룬다. 화면 이동과 무관한 모듈 통신·데이터 동기화·내부 상태는 넣지 않는다.

객체·서비스 협력은 [Job Flow 가이드](job-flow-diagram-guide.md), 내부 상태 전이는 [State 가이드](state-diagram-guide.md)로 분리한다. 시간 순서나 정적 구성은 필요한 경우 별도 관점으로 보완한다.

Navigation 문서를 작성·수정하기 전에 [작성 샘플](../examples/diagram/navigation/document-template.md)과 [작은 완성 예제](../examples/diagram/navigation/document-sample/navigation.md)의 해당 시나리오를 확인한다. 고정 구성과 화면 확인 링크 형식을 현재 범위에 적용하되, 예제의 과업·화면·API·정책을 복사하지 않는다. 추가 시나리오 예제는 [Navigation 예제 선택 목록](../examples/diagram/navigation/README.md)에서 필요한 절만 고른다. 전체 예제·다른 종류의 문서를 모두 읽지 않으며 [예제 적용 기준](../examples/diagram/README.md#필요한-만큼-읽기)을 따른다.

## 범위와 계약

사용자가 정한 범위의 화면과 과업을 작성한다. 개별 과업·변경 분석은 해당 화면의 진입 조건·이동 결과·직접 사용하는 API 계약에서 시작하고, 영향이 발견될 때 관련 범위를 확장한다. 전체 시스템의 AS-IS·TO-BE에서는 대상 UI의 모든 페이지·과업을 먼저 목록화하고 각 과업을 나누어 조사한다. 최소 맥락은 과업마다 필요한 근거를 읽는 기준이며, 전체 범위를 대표 화면 몇 개로 줄이는 근거가 아니다. 공통 기준은 [module-boundary-guide.md](module-boundary-guide.md)를 따른다.

화면명은 UI 관점의 식별자다. 같은 이름을 사용한다고 상태·서버 데이터의 소유자나 코드 모듈 경계가 결정되는 것은 아니다. 라우트, 화면 소유 모듈, 필요한 상태/API 계약은 다이어그램 밖에서 연결한다.

## 시나리오별 상세 분석

시나리오는 사용자가 시작한 과업의 진입부터 완료·실패·취소와 필요한 복귀까지다. 기능·페이지 목록과 각 페이지의 작업 진입점에서 시나리오를 도출한다. 조회 흐름만 그리고 생성·수정·삭제·승인·설정 등 실제 제공하는 과업을 빠뜨리지 않는다. 이 나열은 조사 후보이며 구현에 없는 기능·분기를 추가하라는 뜻이 아니다.

독립된 사용자 과업은 별도 제목과 다이어그램으로 나눈다. 같은 과업의 정상·실패 분기는 함께 읽을 수 있게 두되, 진입 조건·완료 결과가 크게 달라지는 복잡한 대체 경로는 하위 절로 나누고 연결 지점을 밝힌다. 같은 페이지를 쓰는 다른 과업을 한 줄 이동이나 거대한 전체 그림으로 대신하지 않는다. 공통 가드·복귀 처리도 해당 시나리오의 흐름에 필요한 조건과 합류 지점만 표현한다.

각 시나리오를 조사·설계할 때 다음을 확인한다. 조사 항목마다 별도 표·절을 생성하라는 뜻은 아니며, 출력 구성은 다음 절을 따른다.

- **진입**: 사용자 역할·인증·권한·선행 데이터/상태, 메뉴·버튼·직접 URL 등 실제 트리거와 시작 페이지/가드. 같은 페이지도 직접 진입·새로고침으로 결과가 달라지면 그 경로를 구분한다.
- **단계와 분기**: 사용자 동작 → 입력·접근 조건 판단 → 이동을 결정하는 API/처리 → 도착 페이지·장면을 따른다. 입력 오류·접근 거부·없는 대상·요청 실패·취소·닫기·뒤로 가기·인증 후 복귀·재시도 중 적용되는 경로와 실제 결과를 확인한다. 같은 화면에 머물면 그 사실과 표시 결과를 적는다.
- **결과와 복구**: 성공/실패 시 보이는 페이지·장면, 저장된 결과, 다음 동작과 실제 복귀 위치. 처리 접수·안내 표시를 업무 완료로 추정하지 않고, 없는 복구 경로는 관찰 이슈로 남긴다.
- **계약과 근거**: 실제 라우트·가드·이벤트 handler·폼·API client 및 공개 계약 또는 화면 관찰로 이동을 확인한다. 논리 API 노드와 실제 method·endpoint의 대응도 조사한다. AS-IS는 확인/추론/미확인을, TO-BE는 유지 근거/제안/가정을 구분한다. 상세 근거·계약 대응은 관련 분석서·설계서에 기록한다.
- **화면 대응**: AS-IS·TO-BE 또는 관련 화면 산출물이 있는 작업에서는 등장 페이지·오버레이·단계·결과 상태를 해당 Layout과 연결한다. AS-IS·TO-BE의 HTML 파일·장면 대응은 [페이지·장면 목록](system-design-output-guide.md#페이지장면-목록)을 따른다. Navigation만 요청한 작업에 Layout·HTML 생성을 추가로 요구하지 않는다.

다이어그램 바로 아래에는 주요 흐름과 필요한 조건·결과를 짧은 문장으로 설명한다. 조사 근거·가정·미확인은 관련 분석서·설계서에 모으고, Navigation만 작성하는 작업은 최종 보고에 남긴다. 그림 수나 설명 길이를 맞추는 대신 독자가 각 분기의 원인과 도착 결과를 재구성할 수 있는지 확인한다. 화면 이동이나 이동 판단이 없는 과업은 현재 페이지의 동작·결과 설명과 관련 화면 링크로 기록하며 가짜 화살표를 만들지 않는다. 모든 입력값·데이터 인스턴스의 조합을 별도 시나리오로 늘리지 않는다.

## 문서 구성과 화면 확인 링크

문서는 필요한 범위 설명 뒤에 과업별 시나리오를 바로 배치한다. `시나리오 색인`, `공통 가드와 표기`(공통 가드·계약 포함), `페이지 노드 대응`, `실제 작업 진입점 조사 목록`은 생성하지 않는다. 전체 페이지·장면 목록은 [공통 산출물 배치 기준](system-design-output-guide.md#페이지장면-목록)에 따라 `screen-layout.md`를 원본으로 사용한다.

각 시나리오는 `과업 제목 → navigation 다이어그램 → 짧은 흐름 설명 → 화면 확인 링크`로 구성한다. `진입·결과`, `화면·장면`, `근거`를 별도 표·절로 만들지 않는다. 같은 내용을 `진입 조건`, `결과·복귀`, `근거·미확인` 같은 제목으로 나누어 다시 늘리지 않는다. 진입·분기·결과·복귀 조건은 다이어그램과 바로 아래 설명에 필요한 만큼 담는다. 이동이 없는 과업은 다이어그램 대신 현재 페이지의 동작·결과를 짧게 설명한다.

**모든 시나리오에 `화면 확인 링크` 소제목과 다음 표를 반드시 표시한다.** 다른 시나리오의 링크로 대신하지 않는다. 같은 페이지가 반복 등장해도 각 시나리오에서 바로 열 수 있게 링크를 반복한다.

| 페이지·장면 | 화면 HTML | Layout |
| --- | --- | --- |

- 해당 시나리오의 그림과 설명에 등장하는 **페이지별로 한 행**을 둔다. `페이지·장면`에는 페이지와 사용하는 장면을 짧게 적고, `화면 HTML` 한 셀에 `[기본](...) · [입력 오류](...) · [완료](...)`처럼 기본 화면과 사용하는 장면의 직접 링크를 모은다. 진입·중간·실패/대체·복귀 페이지도 포함한다. API·처리·메시지 노드는 제외하고, 관련 없는 장면까지 페이지의 장면 목록 전체를 붙이지 않는다.
- AS-IS·TO-BE의 `화면 HTML`은 페이지별 HTML의 해당 장면을 직접 여는 상대 링크다. `Layout`은 해당 페이지 절 또는 장면 설명의 상대 링크다. 장면 식별자는 [페이지·장면 기준](system-design-output-guide.md#페이지장면-목록)을 따른다. 화면 이름만 쓰거나 문서 상단의 공통 표로 보내지 않는다.
- Navigation 단독 작업에서도 이 항목은 남긴다. 기존 화면 미리보기·실제 접속 가능한 페이지 링크가 있으면 `화면 HTML` 열을 `화면 확인`으로 바꾸어 연결하고, Layout이 없으면 이유를 적는다. 화면 자료가 없으면 해당 행에 `확인 불가 — 자료와 이유`를 적으며 존재하지 않는 링크를 만들지 않는다. 이 표를 채우려고 범위 밖의 HTML·Layout 생성을 강제하지 않는다.
- UI가 없는 시나리오는 이 소제목 아래에 `해당 없음 — UI가 없는 이유`를 적는다. AS-IS·TO-BE에서 대상 화면의 HTML·장면이 미제공이면 [산출물 완료 기준](system-design-output-guide.md#검증)에 따라 미완료로 기록한다.

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

* 시나리오에 중요하지 않은 컴포넌트 변동은 생략한다.

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
* **`Browser`, `User`, `Email` 같은 행위자·매체 노드를 만들지 않는다.** 노드는 화면, `(backend api)`, `(process)`, `` `message` `` 네 가지뿐이다. 진입 방법은 산문으로 밝힌다.

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

화면 이용 흐름을 가리는 다음 패턴을 피한다.

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
    ClassroomSDK --> AudioManager : get_user_media
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

- 대상 기능·페이지의 실제 작업 진입점이 시나리오 절에 대응하는가? 하위/조건부 라우트·직접 진입·설정·작업 화면을 대표 목록/상세로 대신하지 않았는가? 생략하기로 한 색인·공통 표·조사 목록과 시나리오별 진입·결과·근거 절이 다시 추가되지 않았는가?
- 시작 화면/가드와 URL 직접 진입 조건을 본문에서 찾을 수 있는가?
- 화살표가 실제 화면 이동 또는 그 판단에 필요한가? 내부 queue/topic/API 협력은 [job-flow-diagram-guide.md](job-flow-diagram-guide.md)로 분리하고, 필요한 시간 순서만 sequenceDiagram으로 보완했는가?
- 대상 시나리오의 성공·검증 실패·접근 거부 후 도착 화면이 실제 요구사항/코드와 맞는가?
- UI 표시 상태와 서버의 권한·업무 상태 소유자를 구분했는가?
- 취소·닫기·뒤로 가기·인증 후 복귀와 적용되는 실패 경로의 도착 페이지·장면이 조사 근거와 맞는가? 관련 분석서·설계서 또는 최종 보고에서 확인하지 못한 경로와 구현에 없는 처리를 구분했는가?
- 같은 페이지의 다른 장면과 독립 페이지를 구분하고, Layout·HTML이 작성 대상이면 그 대응에서 누락·중복·잘못된 합침이 없는가? 정적 문법 검사가 시나리오 수록 범위나 실제 동작까지 검증한 것으로 보고하지 않았는가?
- 모든 시나리오에 `화면 확인 링크`가 표시되고, 그 절의 그림·본문에 등장하는 모든 페이지의 기본 화면과 사용하는 장면을 직접 열 수 있는가? 공통 표에만 링크가 있거나 실패·복귀 화면이 빠지지 않았는가? 링크가 가리키는 장면의 실제 표시와 자료 부족/미확인 판정을 구분했는가?

제품 구현의 수용 범위는 [tools.camp 구현 스냅샷](tools-camp-markdown-guide.md#5-navigation-다이어그램)을 참고한다. 링크·이름·분기 대조는 정적 검토이고, 대상 렌더러에서 표시를 확인한 경우에만 렌더링 검증으로 기록한다.
