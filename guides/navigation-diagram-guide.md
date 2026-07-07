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

## 구성 요소

* **FrontPage**: 화면(사용자에게 보이는 페이지) 이름
  * 예: Home, LoginForm, Dashboard
  * 원칙: 사용자가 실제로 인지하는 화면·오버레이만 노드로 쓴다. 내부 모듈/서비스는 화면 노드로 쓰지 않는다.

* **(backend api)**: 화면 전환에 영향을 주는 백엔드 API 호출
  * 예: (/signin), (/create_order)
  * **명명 규칙**: API 이름은 소문자 알파벳, 숫자, 슬래시 `/`, 밑줄 `_` 만 사용할 수 있다. 그 외 특수 문자는 허용하지 않는다.

* **(process)**: 화면 이동을 좌우하는 내부 처리 단계
  * 예: (validate_form), (confirm_delete), (generate_room_id)
  * 원칙: 이동 여부(성공/실패/분기)를 결정하는 처리만 표현한다. 화면과 무관한 순수 로직은 넣지 않는다.

* **`message`**: 화면 이동을 판단하는 데 쓰이는 메시지 또는 데이터 객체
  * 백틱(`` ` ``)으로 감싸 표기한다.
  * 예: `` `credentials` ``, `` `userInfo` ``, `` `errorResult` ``

## Page와 Component

* **Page**는 주소(라우트)를 가지는 단위이다.
* **Component**는 주소를 가지지 않는 단위이다. Page에 포함되어 사용된다. (React.js처럼)
* 페이지 이동은 하지 않지만 중요 컴포넌트가 바뀌는 경우, 예를 들어 탭으로 나뉜 콤포넌트가 있는 경우 등에는 괄호를 사용해서 페이지 이동은 없지만 콤포넌트 선택이 바뀌었음을 표시한다.

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

5. **Internal Process → Page or API call**
  * 처리 결과에 따라 화면을 전환하거나 추가 요청을 보낸다
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

## 분기

* `: error`, `: success`, `: invalid` 와 같이 상태만 명시한다.
* 규칙: 콜론 뒤 설명문에는 괄호를 사용하지 않는다.

 * 잘못된 예: `: (오류 발생)`
 * 올바른 예: `: 오류 발생`

## 안티패턴

네비게이션이 아닌 내용이 섞이면 다이어그램이 상태도처럼 변해 화면 이용 흐름을 읽을 수 없게 된다. 아래는 피해야 할 패턴이다.

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

## 예시

### 회원가입 시나리오

화면 전환과 API 응답에 따른 분기를 표현한다.

```navigation
Home --> SignupForm : 회원가입 버튼 클릭
SignupForm --> (validate_form)
(validate_form) --> SignupForm : invalid
(validate_form) --> (/signup) : success
(/signup) --> SignupForm : error
(/signup) --> Dashboard : success
```

### 직접 링크 입장 시나리오

내부 통신(SDK 준비, 방 연결 모듈 흐름)은 화면 이동을 결정하는 지점만 처리 노드로 압축한다.

```navigation
Browser --> ClassroomNameOverlay : /:roomId 직접 접속
ClassroomNameOverlay --> (validate_display_name)
(validate_display_name) --> ClassroomNameOverlay : empty_name
(validate_display_name) --> (connect_room) : success
(connect_room) --> Classroom : connected
(connect_room) --> ClassroomNameOverlay : duplicate_name
```

* 방 연결 과정의 내부 모듈(SDK, PeerManager, DataChannelManager 등)은 `(connect_room)` 하나의 처리로 요약한다.
* 결과(연결 성공 / 이름 중복)에 따른 **화면 이동**만 분기로 남긴다.
