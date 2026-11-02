# Job Flow Diagram Guide

Job Flow는 시스템을 여러 조각으로 나눴을 때 각 조각(이하 객체) 사이의 관계를 표현한다.
각 객체가 가능한 한 다른 객체의 존재를 모르고 자신의 책임에 집중하도록 그리는 것이 원칙이다.
이 원칙을 적용하는 데 [Orchestrator-Worker 패턴](orchestrator-worker-pattern-guide.md)이 자주 사용된다.

Markdown 문서·다이어그램의 tools.camp 링크 생성 여부 확인과 전달은 [편집 링크 전달 기준](diagram-editor-link-guide.md)을 따른다.

Job Flow는 다음과 같은 형식을 사용한다.

```jobflow
orchestrator: SaveOrder
Object: SaveOrder, Validator, OrderStore
SaveOrder.Run --> Validator.Check
Validator.Check.true --> OrderStore.Save
Validator.Check.false --> SaveOrder.Reject
```

```jobflow
scope: 서비스 간 공개 조회 계약의 협력
Object: Client, Gateway, Provider
Client.request --> Gateway.message.QueryRequest
Gateway.message.QueryRequest --> Provider.message.FetchRequest
```

## 기본 규칙

### 헤더 키워드 — `orchestrator:` vs `scope:`

| 헤더 | 관점 | 화살표 해석 |
|---|---|---|
| `orchestrator: X` | X가 흐름을 조율 | X가 호출·결과 전달·이벤트 구독을 조율 |
| `scope: X` | X라는 관찰 범위의 협력 | 객체의 경계를 넘는 공개 메시지와 해당 범위에서 여는 처리를 표현 |

### 관찰 수준

매크로뷰의 시스템 경계·외부 객체 선택·한글 명칭은 [Method-R의 매크로 설계 기준](method-R.md#3-매크로-설계-시스템을-하나의-경계로-보기)을 따른다. `scope:`를 사용한다는 사실만으로 매크로뷰가 되지는 않으며, 서비스 간 협력과 내부 확대는 각각 해당 관찰 수준을 밝힌다.

매크로뷰와 서비스 간 협력 그림에서 메시지를 받은 객체가 판단 결과에 따라 다른 메시지를 보내면, 반환값 분기 표기를 적용해 `객체.처리명`·`객체.처리명.결과`로 판단을 표시한다. 외부 객체에서 시작되는 행동·통지는 `외부객체.OnEvent` 이벤트로 쓴다. 보낸 쪽을 그림에 선언하지 않은 요청·통지(서비스 간 협력 그림의 화면 요청·외부 제공자 통지)는 받는 객체의 `객체.On요청명` 이벤트로 시작한다. 어떤 판단을 그리고 생략할지는 [Method-R 2.5](method-R.md#25-처리-결과의-분기로-메시지를-보내는-이유를-드러낸다)를 따른다.

### Object:

다이어그램에 등장하는 객체를 나열한다. 선언 순서는 객체의 왼쪽→오른쪽 열 배치를 정하므로 [선 교차 줄이기](#선-교차-줄이기)에 따라 해당 그림의 협력 관계에 맞춰 조정한다. 문서 전체의 객체 목록 순서를 모든 그림에 고정하지 않는다. `orchestrator:` 헤더가 있으면 렌더러가 헤더를 다르게 표시해 조율자를 알려 준다. 조율자는 **기본으로 첫 번째(가장 왼쪽 열)** 에 선언하되, 선 교차가 줄어드는 배치가 있으면 편의에 따라 다른 열로 옮길 수 있다. 이벤트로만 시작해 조율자 도형이 없는 그림에서도 조율자를 `Object:`에 선언해 어느 조율자의 관점인지 남긴다.

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

독립된 경계의 객체는 공개 메시지로 요청·응답·알림을 주고받는다. 상대 내부의 메서드 호출과 구분하며, HTTP·메시지 큐 등 실제 전송 방식은 계약에서 정한다. 매크로뷰에서 어떤 객체를 경계 밖에 둘지는 [매크로 설계 기준](method-R.md#3-매크로-설계-시스템을-하나의-경계로-보기)을 따른다.

```jobflow
scope: 서비스 간 공개 조회 계약의 협력
Object: Client, Gateway, Provider
Client.OnRequest --> Gateway.message.QueryRequest
Gateway.message.QueryRequest --> Provider.message.FetchRequest
Provider.message.FetchRequest --> Gateway.message.FetchResponse
Gateway.message.FetchResponse --> Client.message.QueryResponse
```

## 내부 확대

관찰 수준을 낮춰 메시지 처리 중의 내부 협력을 표현한다. 아래는 Gateway의 내부 확대이며, 매크로뷰에서는 외부로 보낼 메시지를 가르는 판단만 남기고 이 처리 순서는 시스템 객체 안에 둔다.

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

VideoPlayer가 `OnFrameRequested`를 구독하고 `GetFrameBitmap`의 반환값을 받아 `DrawFrame`에 넘긴다. `FileStream.OnVideoData --> VideoDecoder.Decode` 줄에는 VideoPlayer 도형이 없지만, 구독과 호출은 헤더의 조율자인 VideoPlayer가 실행한다. 이벤트로만 시작하는 그림에서도 조율자는 도형 없이 이 역할을 맡으며, 받은 이벤트를 그대로 넘기기만 하는 조율자 메서드를 따로 그리지 않는다.

이 예제는 호출과 이벤트를 함께 쓴다. `Open`·`Play`처럼 조율자가 시작하고 결과를 이어 쓰는 협력은 메서드 호출과 반환값으로, `OnVideoData`·`OnFrameRequested`처럼 조각에서 독립된 시점에 생기는 입력은 그 조각의 이벤트로 그리고 조율자가 구독한다. 메시지 수신·기한 도래·기록 완료처럼 기다리는 호출자가 없는 입력을 메서드 호출과 `.result`로 그리면, 실제로 없는 응답처와 주기 호출이 생긴다.

## 선 교차 줄이기

문법이 맞아도 선이 교차하거나 같은 구간에 포개질 수 있다. **객체 열 순서와 도형의 세로 배치를 함께 검토**하고, 배치 후보를 실제 그림으로 비교해 연결을 따라가기 쉬운 순서를 선택한다. 렌더러의 자동 회피에만 맡기지 않는다.

### 객체 열 순서 선택

- `orchestrator:` 그림은 조율자를 첫 열에 두는 것을 기본으로 하되, 다른 열로 옮겨 교차가 더 줄어들면 옮길 수 있다. 헤더가 조율자를 표시하므로 열 위치가 관점을 정하지는 않는다.
- 자주 요청·응답하는 객체를 인접하게 놓고, 주요 전달 경로가 다른 객체의 열을 반복해서 가로지르지 않도록 `Object:` 순서를 조정한다. 각 그림의 관계를 기준으로 정하며 시스템 목록·알파벳 순서를 그대로 복사하지 않는다.
- 중계·분기 객체는 요청자와 후속 대상 사이에 두는 배치와 대상들의 바깥쪽에 두는 배치를 비교한다. **출발 객체를 항상 한쪽 끝에 두는 것은 고정 규칙이 아니다.** 다른 연결을 가로지르는 긴 세로줄기나 우회가 줄어드는지 확인한다.
- 한 연결만 짧아지고 다른 분기·응답·후속 알림이 더 겹치지는 않는지 그림 전체를 다시 본다. 첫 호출뿐 아니라 뒤에 선언된 독립 진입과 같은 객체로 돌아오는 연결도 확인한다.

다음은 처리 결과에 따라 수락 또는 거절을 전달하고, 수락한 경우 두 대상에 후속 처리를 알리는 합성 예제다. 두 후속 처리의 완료 순서는 이 그림으로 정하지 않는다.

```jobflow
scope: 배치 비교
Object: Worker, Hub, SinkA, SinkB
Worker.message.Completed --> Hub.message.Accepted
Hub.message.Accepted --> SinkA.message.Apply
Hub.message.Accepted --> SinkB.message.Record
SinkB.message.Record --> Hub.message.Recorded
Worker.message.Completed --> Hub.message.Rejected
```

같은 관계에서 `Object: Hub, Worker, SinkA, SinkB`로 두면 Hub에서 후속 대상으로 나가는 선이 Worker의 열을 가로지른다. Worker의 뒤쪽 분기에서 내려가는 세로선과 겹치거나 교차할 수 있다. 위처럼 Worker와 후속 대상 사이에 Hub를 두는 배치를 비교하면, 연결과 관계 선언 순서를 바꾸지 않고도 우회를 줄일 수 있다. 이는 배치 비교 방법의 예시이며 특정 순서가 모든 렌더러에서 겹침을 없앤다는 보장은 아니다.

### 관계 선언 순서와 세로 배치

관계 줄의 선언 순서도 도형의 세로 배치와 기존 도형의 재사용에 영향을 준다. 같은 출발점의 분기·응답을 멀리 떨어뜨리거나 무관한 흐름을 사이에 끼우면 긴 세로선과 반복 도형이 생길 수 있다. 실제 호출 의존관계·분기 조건·독립 진입의 의미를 유지하면서 관련 연결을 가까이 배치한다.

선이 꼬이는 원인은 대개 다음 조건에 숨어 있다. 줄을 쓰기 전에 그림에서 찾아 둔다.

| 숨은 조건 | 증상 |
|---|---|
| 여러 깊이에서 모이는 **공유 종결**: 같은 `.result`, 공통 거절·대기 처리, 들어오는 선이 둘 이상인 막다른 메시지 | 위쪽 분기에서 맨 아래 종결까지 긴 선이 본 흐름을 가로지른다 |
| 호출 줄과 그 메서드의 **반환 분기가 떨어짐** | 호출 도형에서 나간 선이 다른 흐름을 건너 돌아온다 |
| 한 메서드의 분기 사이에 하위 흐름이 끼어듦 | 같은 출발점의 분기가 서로 멀어져 반복 도형이 생긴다 |
| 다시 읽기·재시도 같은 **되돌아가는 선** | 위쪽 노드로 올라가는 선이 사이의 연결을 모두 가로지른다 |
| 같은 결과에서 여러 메시지로 나가는 선이 떨어짐 | 같은 분기점이 두 번 그려진 것처럼 보인다 |
| 이미 그린 노드를 나중에 다시 출발점으로 쓰는데, 그 사이 같은 열에 다른 도형이 놓임 | 렌더러가 기존 도형을 재사용하지 못해 같은 이름의 도형을 새로 그리고, 분기가 원래 메서드에서 떨어져 보인다 |
| 긴 가로선이 다른 메서드와 그 결과를 잇는 점선 연결 사이를 지남 | 화살표가 점선을 가로질러 관계가 섞여 보인다 |
| 객체 열 순서가 주요 흐름 순서와 다름 | 같은 연결이 여러 열을 가로지르는 긴 선이 된다 |
| 호출되는 노드를 출발점으로 쓰는 줄이 그 노드로 들어오는 줄보다 먼저 선언됨 | 들어오는 선 없이 혼자 시작하는 도형이 그려져, 진입점이나 이벤트처럼 보인다. 진입점과 `On…` 이벤트가 아닌 노드는 들어오는 줄을 먼저 적는다 |
| 워커의 도움 요청(`Worker.OnNeedHelp`) 줄이 그 워커를 호출하는 줄보다 먼저 선언됨 | 도움 요청이 작업 시작 전에 일어나는 것처럼 그려진다. 도움 요청 줄은 워커를 호출한 줄 뒤, 그 메서드의 결과 분기 앞에 둔다 |

기본 줄 순서는 다음과 같다. 연결 집합은 바꾸지 않고 선언 순서만 정한다.

1. 진입점에서 본 흐름을 따라 적는다. 메서드를 호출하는 줄 바로 뒤에 그 메서드의 반환 분기를 붙인다.
2. 한 메서드의 분기 중 다음 처리로 이어지는 것은 연속해서 적고, 각 분기의 하위 흐름은 그 뒤에 같은 규칙으로 적는다. 같은 결과에서 여러 메시지로 나가는 선은 붙여 둔다.
3. 분기가 모두 종결로 끝나는 메서드(저장·확인 단계 등)는 호출 줄 바로 뒤에 모든 분기를 적는다. 되돌아가는 선도 그 분기 묶음 안에 둔다.
4. **공유 종결로 가는 분기는 맨 아래로 모은다.** 본 흐름을 다 적은 뒤, 위쪽 메서드의 거절·대기·조기 반환 분기를 메서드별로 묶어 적는다. 공통 거절·대기 처리 자체에서 반환으로 가는 줄(`Fail --> Flow.Run.result` 등)은 가장 아래에 둔다.
5. 들어오는 선이 하나뿐인 막다른 메시지(서비스 간 협력 그림의 각기 다른 응답 등)는 공유 종결이 아니므로, 같은 판단의 다른 분기와 함께 적는다.

```jobflow
orchestrator: SaveOrder
Object: SaveOrder, Validator, OrderStore
SaveOrder.Run --> Validator.Check
Validator.Check.Valid --> OrderStore.Save
OrderStore.Save.Saved --> SaveOrder.Run.result
OrderStore.Save.VersionConflict --> Validator.Check
Validator.Check.Invalid --> SaveOrder.Run.result
```

`Save`의 반환 분기는 호출 줄 바로 뒤에 붙이고, 공유 종결(`SaveOrder.Run.result`)로 바로 가는 `Invalid`는 맨 아래로 내렸다. `Invalid`를 `Valid` 바로 뒤에 두면 `Run.result`로 가는 선이 `Save`의 분기보다 먼저 그려져 `Save`의 반환 선과 교차하기 쉽다.

이 순서로도 반복 도형·긴 선이 남으면 객체 열 순서와 함께 다른 배치를 비교한다. 줄 배치는 선언 순서이며, 실제 처리는 반환값 조건과 호출 의존관계에 따라 실행된다.

### 배치 확인과 완료 기준

1. 선이 겹치는 출발점·도착점과 중간에 가로지르는 열을 확인하고, `Object:` 순서부터 바꿔 비교한다. 남은 문제가 세로 배치 때문이면 관련 관계 줄 순서도 조정한다.
2. 전후의 연결 집합·방향·분기 조건·진입점과 요청·응답 대응이 같은지 대조한다. 그림을 정리하려고 실제 연결을 지우거나, 없는 객체·중계 노드·호출·분기 조건을 추가하지 않는다. 배치용 새 DSL 토큰도 만들지 않는다.
3. SVG나 미리보기에서 **무관한 선의 포개짐, 선과 도형·라벨의 겹침, 가려진 화살촉, 다른 노드로 연결된 듯한 교차**를 확인한다. 같은 출발점의 분기점 공유와 경로를 구별하기 어려운 긴 선 구간 공유를 구분하고, 각 화살표를 시작부터 끝까지 따라간다.
4. 순서 조정으로 해결되지 않으면 독립 진입이나 시나리오 단위로 그림을 나누는 방법을 검토한다. 분리한 그림 사이의 연결·조건을 본문과 링크로 대응시키고, 연결을 숨기거나 끊지 않는다. 렌더러가 공통 출발점의 경로를 공유하는 등 남는 한계는 구체적으로 기록한다.

렌더러가 있으면 줄 순서와 `Object:` 순서의 후보를 실제로 그려 비교한다. 비교할 때는 화살표끼리의 교차·포개짐, 화살표가 도형이나 점선 연결을 가로지르는 경우, 같은 노드가 두 번 그려진 중복, 메서드에서 떨어진 분기를 함께 센다. 원래 업무 순서에서 많이 벗어나는 후보는 겹침이 줄어도 읽기 어려우므로, 겹침을 줄이는 데 필요한 만큼만 순서를 바꾼다.

정적 검사 통과만으로 겹침이 없다고 판정하지 않는다. 배치를 확인할 렌더러가 없으면 객체·관계 순서의 정적 검토 결과와 **렌더링·겹침 미확인**을 보고한다. 실제 그림에서 확인한 범위에 대해서만 배치 개선을 보고한다.
