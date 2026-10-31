# Job Flow Diagram Guide

Job Flow는 시스템을 여러 조각으로 나눴을 때 각 조각(이하 객체) 사이의 관계를 표현한다.
각 객체가 가능한 한 다른 객체의 존재를 모르고 자신의 책임에 집중하도록 그리는 것이 원칙이다.
이 원칙을 적용하는 데 [Orchestrator-Worker 패턴](orchestrator-worker-pattern-guide.md)이 자주 사용된다.

다이어그램을 작성·수정한 경우 Markdown을 완성한 뒤 [편집 링크 전달 기준](diagram-editor-link-guide.md)을 적용한다.

Job Flow는 다음과 같은 형식을 사용한다.

```jobflow
orchestrator: SaveOrder
Object: SaveOrder, Validator, OrderStore
SaveOrder.Run --> Validator.Check
Validator.Check.true --> OrderStore.Save
Validator.Check.false --> SaveOrder.Reject
```

```jobflow
scope: 공개 조회 계약의 협력
Object: Client, Gateway, Provider
Client.request --> Gateway.message.QueryRequest
Gateway.message.QueryRequest --> Provider.message.FetchRequest
```

## 기본 규칙

### 헤더 키워드 — `orchestrator:` vs `scope:`

| 헤더 | 관점 | 화살표 해석 |
|---|---|---|
| `orchestrator: X` | X가 흐름을 조율 | X가 호출·결과 전달·이벤트 구독을 조율 |
| `scope: X` | X라는 경계 안에서 일어나는 일 | 등장 객체들은 서로 외부 시스템이다 |

### Object:

다이어그램에 등장하는 객체를 나열한다.

### 구성 요소

| 요소 | 표기 | 의미 |
|---|---|---|
| 메서드(process) | `Object.Method` | 메서드·모듈 함수의 처리 동작 |
| 이벤트 | `Object.OnEvent` | 실제 이벤트·콜백·타이머의 독립 진입점 |
| 반환값 분기 | `Object.Method.value` | 메서드 반환값 또는 반환 데이터에서 도출한 조건에 따른 분기 |
| 호출 반환값 | `Object.Method.result` | 해당 호출의 반환 경계를 명시할 때만 사용 |
| 요청 이벤트 반환값 | `Object.OnEvent.result` | 이벤트를 발생시킨 객체가 받아 내부 처리에 사용하는 값 |
| 경계 메시지 | `Object.message.MessageName` | 외부 요청·응답·알림의 수신 계약. 요청·응답·푸시의 종류를 이름과 계약으로 구분 |

매개변수·데이터 스키마·화살표 라벨은 블록 밖에 적는다. 객체 이름에 `.`을 넣지 않으며, 새 제어 토큰을 만들거나 다른 DSL로 대체하지 않는다. 생성·초기화도 일반 메서드처럼 연결하고, 생성만으로 실행이 시작된다고 가정하지 않는다.

## 핵심 원칙 — 내부 협력은 선언된 orchestrator의 관점이다

| 연결 | 처리 주체와 의미 |
|---|---|
| `A.Method --> B.Method` | 조율자가 A의 메서드를 실행한 뒤 B의 메서드를 호출하고, 필요하면 반환값을 전달 |
| `A.OnEvent --> B.Method` | 조율자가 A의 이벤트를 구독해 B의 메서드를 호출 |
| `A.Method.result --> B.Method` | 조율자가 A의 반환값을 B의 메서드에 인수로 전달해 호출 |
| `A.OnEvent.result --> A.ContinueProcessing` | A가 요청 이벤트의 반환값으로 내부 처리를 이어감. `ContinueProcessing`은 조율자가 아닌 A가 직접 실행한다. |

## 메서드 반환값에 따른 분기

반환값에 따라 다음 동작을 결정할 때는 `Object.Method.value`로 연결한다. 불리언은 `.true`·`.false`, 열거형은 `.Approved`·`.Declined`처럼 실제 값이나 판정 조건을 적는다.

```jobflow
orchestrator: SaveOrder
Object: SaveOrder, Validator, OrderStore
SaveOrder.Run --> Validator.Check
Validator.Check.true --> OrderStore.Save
Validator.Check.false --> SaveOrder.Reject
```

`Check`의 반환값에 따라 SaveOrder가 저장 또는 거절을 선택한다. 이 분기는 이벤트 발생이 아니다.

## 이벤트가 반환값을 갖는 경우

응답자가 하나인 요청 콜백은 `.result`로 반환값을 받는 지점을 표시하고, 그 값을 사용하는 워커의 내부 처리로 연결한다. 일반 알림 이벤트에서 반환값을 수집할 수 있다고 가정하지 않는다.

```jobflow
orchestrator: Orchestrator
Object: Orchestrator, WorkerA, WorkerB
Orchestrator.ProcessRequest --> WorkerA.ProcessRequest
WorkerA.OnNeedHelp --> WorkerB.ProvideHelp
WorkerB.ProvideHelp --> WorkerA.OnNeedHelp.result
WorkerA.OnNeedHelp.result --> WorkerA.ContinueProcessing
```

## 외부 경계의 요청·응답과 알림

외부 시스템끼리는 메시지를 주고받는다. 서로 직접 호출할 수 없는 구조다.

```jobflow
scope: 공개 조회 계약의 협력
Object: Client, Gateway, Provider
Client.OnRequest --> Gateway.message.QueryRequest
Gateway.message.QueryRequest --> Provider.message.FetchRequest
Provider.message.FetchRequest --> Gateway.message.FetchResponse
Gateway.message.FetchResponse --> Client.message.QueryResponse
```

## 내부 확대

메시지를 주고받는 동안 내부에서 일어나는 일을 표현해 시나리오 이해를 돕는다.

```jobflow
scope: Gateway 내부의 조회와 응답 가공
Object: Gateway, Provider, Client
Gateway.handleQuery --> Gateway.callProvider
Gateway.callProvider --> Provider.message.FetchRequest
Provider.message.FetchRequest --> Gateway.message.FetchResponse
Gateway.message.FetchResponse --> Gateway.buildResponse
Gateway.buildResponse --> Client.message.QueryResponse
```

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
VideoDecoder.GetFrameBitmap.bitmap --> VideoRenderer.DrawFrame
```

VideoPlayer가 `OnFrameRequested`를 구독하고 `GetFrameBitmap`의 반환값을 받아 `DrawFrame`에 넘긴다.

## 선 교차 줄이기

- **같은 메서드의 반환값 분기를 먼저 모은다.** 각 분기의 첫 연결을 연속해서 작성한 뒤, 후속 처리·반환을 적는다. 한 분기의 후속 처리를 다른 분기 사이에 끼우지 않는다.
- 가지가 좌우로 갈라져 엉키면 `Object:` 순서를 바꿔 출발 객체를 대상들의 한쪽 끝에 둔다.
- 실제 호출 순서와 분기 의미를 유지하며 줄·열 순서를 조정한다. 선이 겹치거나 다른 노드로 연결된 것처럼 보이지 않는지 확인한다.

예를 들어 검사 결과의 두 분기를 먼저 적고, 저장 결과를 받아 완료하는 흐름은 그 뒤에 둔다.

```jobflow
orchestrator: SaveOrder
Object: SaveOrder, Validator, OrderStore
SaveOrder.Run --> Validator.Check
Validator.Check.true --> OrderStore.Save
Validator.Check.false --> SaveOrder.Reject
OrderStore.Save.result --> SaveOrder.Complete
```

`OrderStore.Save.result --> SaveOrder.Complete`를 두 검사 분기 사이에 넣지 않는다. 줄 배치는 선언 순서이며, 실제 처리는 반환값 조건과 호출 의존관계에 따라 실행된다.
