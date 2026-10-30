# Job Flow Diagram Guide

Job Flow는 한 시나리오의 협력을 **이벤트와 메서드(process) 중심**으로 표현한다. 반환 데이터는 생략하고 메서드끼리 잇는다. 경계 설계는 [모듈 경계 가이드](module-boundary-guide.md), 협력 방식은 [Method-R](method-R.md)을 따른다.

## 헤더 키워드 — `orchestrator:` vs `scope:`

첫 줄에 관점을 선언하고, 다음 줄의 `Object:`에 등장 객체를 모두 적는다.

| 헤더 | 관점 | 화살표 해석 |
|---|---|---|
| `orchestrator: X` | X가 흐름을 조율 | X가 호출·결과 전달·이벤트 구독을 연결 |
| `scope: X` | X라는 경계의 협력을 관찰 | 실제 요청자·제공자와 이벤트 전달 경로를 표시 |

`scope:`는 내부 조율자가 없거나 비동기라는 뜻이 아니다. 헤더만으로 구현의 의존성·전송 방식을 판단하지 않는다.

## 기본 규칙

### 구성 요소

| 요소 | 표기 | 의미 |
|---|---|---|
| 메서드(process) | `Object.Method` | 메서드·모듈 함수의 처리 동작 |
| 이벤트 | `Object.OnEvent` | 이벤트 발생 또는 결과 판정에 따른 후속 흐름 |
| 결과 전달 | `A.Method --> B.NextMethod` | 반환 데이터 이름 없이 다음 처리로 연결 |
| 응답 도착점 | `Object.Method.result` | 같은 호출의 반환 경계를 명시할 때만 사용 |
| 경계 메시지 | `Object.message.MessageName` | 독립 서비스·외부 경계의 메시지 |

파라미터·데이터 스키마·화살표 라벨은 블록 밖에 적는다. 객체 이름에 `.`을 넣지 않으며, 새 제어 토큰을 만들거나 다른 DSL로 대체하지 않는다. 생성·초기화도 일반 메서드처럼 연결하고, 생성만으로 실행이 시작된다고 가정하지 않는다.

### 시나리오의 시작점

`Object:`에 있는 객체의 메서드나 이벤트에서 시작한다. 조율자의 공개 메서드, 프로세스 진입, 사용자 입력·타이머·외부 메시지 수신 등이 시작점이며 조율자 외 객체에서 시작해도 된다.

### 메시지 사용 범위

메시지는 **매크로 수준의 독립 서비스 간 통신이나 외부 시스템·사용자 연동**을 표현할 때만 쓴다. 이 경우에도 처리 동작을 보여 줄 수 있으면 이벤트·메서드를 사용한다.

내부 객체·Worker의 협력과 데이터 전달을 메시지 노드로 바꾸지 않는다. 내부 버스가 있으면 발행·요청 메서드와 수신 이벤트·핸들러를 연결하고 페이로드는 계약에 적는다. 표기에 맞추려고 실제 통신 구조를 바꾸거나 없는 메서드를 만들지 않는다. 메시지 허용 여부는 헤더가 아니라 실제 경계로 판단한다.

## 핵심 원칙 — 내부 협력은 선언된 orchestrator의 관점이다

`orchestrator:`의 내부 화살표는 워커끼리의 직접 호출이 아니라 **조율자의 연결**이다.

| 연결 | 조율자가 하는 일 |
|---|---|
| `A.Method --> B.Method` | A 다음에 B를 호출하고, 필요하면 A의 반환값을 전달 |
| `A.OnEvent --> B.Method` | A의 이벤트를 구독해 B를 호출 |
| `A.Method --> Orchestrator.Run.result` | A의 값을 실행 중인 Run의 호출자에게 반환 |

### 코드 호출 사슬과 조율 배선의 구분

작업 함수가 저장 모듈을 직접 부른다면 상위 조율자의 배선처럼 섞지 않는다. 상위에는 작업 함수의 계약을 두고, 내부 호출은 그 함수를 조율자로 연 하위 그림에 둔다. 여러 실제 호출자의 호출 사슬을 관찰하려면 `scope:`를 쓴다. 조율자는 이름이 아니라 호출·등록·실행 코드로 확인한다.

## 결과와 이벤트

### 표시할 결과 선택

- `A.Method.result --> B.Method` 대신 **`A.Method --> B.Method`**로 쓴다. 전달 데이터는 본문·계약에 설명한다.
- `.result`는 호출자·요청 콜백의 반환 경계를 보여 줘야 할 때 **도착점에만** 쓴다. 후속 메서드로 충분하면 생략한다.
- 사용하지 않는 반환값은 그리지 않으며 `.result`를 종료 표시로 쓰지 않는다.
- 결과에 따라 후속 처리가 달라지면 `A.OnFound --> B.Handle`처럼 이벤트로 연결한다.

### 메서드와 결과의 배치

호출과 그 결과를 쓰는 다음 처리를 연속 작성한다. 관련 이벤트·응답은 해당 호출과 묶고, 중첩 호출의 최종 반환은 하위 처리가 끝난 뒤에 둔다. 결과 노드를 블록 끝에 모으지 않는다.

### 이벤트가 반환값을 갖는 경우

응답자 하나인 요청 콜백의 반환은 도착점에 `.result`를 쓴다. 일반 알림 이벤트의 반환값 수집을 가정하지 않는다.

```jobflow
orchestrator: Orchestrator
Object: Orchestrator, WorkerA, WorkerB
Orchestrator.ProcessRequest --> WorkerA.ProcessRequest
WorkerA.OnNeedHelp --> WorkerB.ProvideHelp
WorkerB.ProvideHelp --> WorkerA.OnNeedHelp.result
```

Orchestrator가 WorkerB의 결과를 콜백 응답으로 돌려준다. WorkerA는 실행 중인 `ProcessRequest`의 `await` 다음부터 이어 가며, `ProcessRequest`를 다시 호출하지 않는다. 구독 연결·해제 책임과 [응답·집계 계약](module-boundary-guide.md#메시지-발행과-요청응답)은 별도로 정한다.

### 합류와 재호출 구분

| 경우 | 작성법 |
|---|---|
| 단순 결과 전달 | 실행 중인 조율자 메서드로 돌아갔다 다시 나가지 말고 다음 메서드로 바로 연결 |
| 합류 | 여러 경로가 같은 호출로 모이는 이유를 설명. 택일이면 한 번만 실행되며, 중복 진입 가능 시 가드를 명시 |
| 실제 재호출 | 폴링·재시도 조건, 간격·횟수·중복 처리와 근거를 설명. 반복은 화살표 하나와 본문으로, 정해진 여러 호출은 각각 표현 |

```jobflow
orchestrator: Checkout
Object: Checkout, Payments, Ledger, Mailer
Checkout.Pay --> Payments.Charge
Payments.OnApproved --> Ledger.Record
Payments.OnDeclined --> Ledger.Record
Ledger.Record --> Mailer.SendResult
```

`Charge`의 승인·거절 결과는 `OnApproved`·`OnDeclined` 이벤트로 표현한다. 한 결제에서 하나만 발생하므로 `Record`도 한 번 실행되고, `SendResult`는 두 경로에 공통이다. 결제 완료에만 영수증을 보내면 `Ledger.OnPaid --> Mailer.SendReceipt`로 잇는다. 실행 중인 조율자 메서드로 돌아가는 화살표를 합류로 해석하지 않는다.

### 조건의 출처와 그림 적용 범위

후속 처리를 나누는 조건은 이벤트의 발생 조건으로 설명한다. 실제 이벤트 선언 또는 반환값 판정과 이벤트 표기의 대응을 근거에 적는다. 없는 처리·보장을 가정하거나 표기를 위해 구현을 바꾸지 않는다.

조건부 호출은 해당 이벤트에서 잇거나 전제가 명확한 그림으로 나눈다. 공통 필수 경로처럼 그린 뒤 본문에서만 제외하지 않는다.

### 후속 처리 없는 경우

후속 처리가 없는 경우는 그리지 않는다. 값만 적은 단독 줄이나 종료 마커도 만들지 않는다.

```jobflow
orchestrator: SaveOrder
Object: SaveOrder, Validator, OrderStore
SaveOrder.Run --> Validator.Check
Validator.OnValid --> OrderStore.Save
```

`Check`에서 유효하다고 판정하면 `OnValid` 이벤트로 저장을 연결한다.

## scope에서 요청·응답과 이벤트 읽기

`scope:`는 실제 요청·응답·이벤트 경로를 나타내며 숨은 조율자의 결과 전달로 해석하지 않는다. 요청은 요청자 → 제공자, 응답은 제공자 → 원 요청자의 다음 동작 또는 응답 도착점으로 잇는다.

```jobflow
scope: 주문 상세 보기
Object: Browser, Storefront, Orders
Browser.openOrder --> Storefront.proxyOrders
Storefront.proxyOrders --> Orders.getOrder
Orders.getOrder --> Browser.showOrder
```

`proxyOrders`는 요청·응답을 바꾸지 않는 프록시다. 마지막 화살표는 프록시를 거쳐 돌아온 응답을 Browser가 표시하는 흐름이며, Orders가 화면 메서드를 직접 호출한다는 뜻이 아니다.

### scope 그림의 출발점은 실제 요청자다

B가 A의 응답을 받아 C를 호출하면 `B.Run --> A.Method`, `B.Run --> C.Method`로 쓴다. `A.Method --> C.Method`로 축약하면 A가 C를 호출하는 것으로 읽힌다. 데이터 가공은 B의 내부 계약에 적는다.

응답을 원 요청자의 다음 동작으로 잇는 경우에는 어떤 요청의 응답인지 밝힌다. 같은 호출의 최종 반환 경계가 필요하면 `Provider.Get --> Caller.Run.result`로 쓴다. 프록시 응답 칸은 내용을 바꾸지 않을 때만 생략한다. 이벤트는 실제 발행자·소비자·필요한 브로커를 표시하고, 메시지 노드는 [메시지 사용 범위](#메시지-사용-범위)를 따른다.

## 다이어그램 예제

```jobflow
orchestrator: VideoPlayer
Object: VideoPlayer, FileStream, VideoDecoder, AudioDecoder, VideoRenderer
VideoPlayer.Open --> VideoDecoder.Initialize
VideoPlayer.Open --> AudioDecoder.Initialize
VideoPlayer.Open --> FileStream.Open
VideoPlayer.Play --> FileStream.StartReading
FileStream.OnVideoData --> VideoDecoder.Decode
FileStream.OnAudioData --> AudioDecoder.Decode
VideoRenderer.OnFrameRequested --> VideoDecoder.GetFrameBitmap
VideoDecoder.GetFrameBitmap --> VideoRenderer.DrawFrame
```

VideoPlayer가 이벤트를 구독하고 호출을 연결한다. `GetFrameBitmap`의 반환값은 VideoPlayer가 받아 `DrawFrame`에 넘기며, 반환 데이터 노드는 만들지 않는다.

## 재귀적 세분화

상위에는 공개 계약을 두고 필요한 내부 협력만 하위 그림으로 연다. 하위의 입력·출력·실패 의미는 상위와 같아야 한다. 한 그림에 모든 깊이를 섞거나 분석을 위해 새 모듈·조율자를 만들지 않는다.

분해 깊이·중단·완료는 [내부 추적 기준](system-design-document-guide.md#64-내부-추적과-완료-기준), 문서 배치·JF 번호는 [설계 문서 양식 §6](system-design-document-guide.md#6-경계-내부-job-flow-드릴다운)을 따른다.

## 선 교차 줄이기

- 같은 노드의 가지와 하류 처리를 이어 쓰고, 다른 흐름은 그 뒤에 둔다.
- 가지가 좌우로 갈라져 엉키면 `Object:` 순서를 바꿔 출발 객체를 대상들의 한쪽 끝에 둔다.
- 실제 호출 순서와 분기 의미를 유지하며 줄·열 순서를 조정한다. 선이 겹치거나 다른 노드로 연결된 것처럼 보이지 않는지 확인한다.
