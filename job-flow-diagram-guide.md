# Job Flow Diagram Guide

## 헤더 키워드 — `orchestrator:` vs `scope:`

jobflow 다이어그램의 첫 줄은 그 다이어그램의 **흐름 제어 주체가 누구인가** 를 선언한다. 이 가이드는 method-R 표기 규칙([method-R.md](./method-R.md)) 과 일관되게 두 키워드를 구분해서 쓴다.

| 키워드 | 의미 | 흐름 제어 | 사용 단계 |
|---|---|---|---|
| `orchestrator: X` | X 가 시나리오의 흐름을 능동적으로 조율하는 객체다. 다른 객체의 메서드를 직접 호출하거나 이벤트를 구독해 다음 단계를 결정한다. | **있음** (X 가 함) | 시스템 설계의 Orchestration 모드, 모듈 설계, 상세 설계 (재귀 Sub-Orchestrator) |
| `scope: X` | X 는 시나리오의 **경계** 일 뿐이다. 흐름을 능동적으로 만들지 않으며, 내부 객체들끼리 메시지/이벤트로 자율 협력한다. | **없음** (경계 박스) | 매크로 설계 (시스템 경계), 시스템 설계의 Choreography 모드 |

핵심 차이는 단 하나 — **그 다이어그램 안에 흐름을 책임지는 단일 객체가 있느냐**. 있다면 `orchestrator:`, 없다면 `scope:`.

이 가이드의 나머지 본문은 **`orchestrator:` 모드의 표기 규칙**을 다룬다 (모든 `-->` 가 orchestrator 관점이라는 핵심 원칙이 성립하는 경우). `scope:` 모드(Choreography·경계 메시지) 의 표기 규칙은 method-R 의 매크로 / Choreography 절을 따른다.

## 기본 규칙

### 기본 구조

```jobflow
orchestrator: [오케스트레이터 객체]
Object: [객체1], [객체2], [객체3], ...
```

* **orchestrator**: 프로세스 흐름을 제어하는 오케스트레이터 객체
* **Object**: 다이어그램에 등장하는 모든 객체 목록 (orchestrator 포함)

### orchestrator 객체의 역할

* 해당 시나리오에서 **흐름을 총괄하고 조율하는 중심 객체**이다.
* 다른 객체들을 멤버로 소유하거나, 다른 객체들이 이 orchestrator 를 기반으로 협력한다.
* 대부분의 `-->`는 orchestrator 를 중심으로 한 협력 관계를 나타내지만, **시나리오의 진입점(예: `Main.OnStart`)이나 부속 객체 간의 초기화 흐름**도 함께 표기할 수 있다.

### 시나리오의 시작점

시나리오의 시작점은 다음 중 하나의 형태로 나타난다.

1. **orchestrator 의 Public 메서드 호출** — 일반적인 기능 실행 시나리오.
2. **프로세스/스레드 진입 이벤트** — `Main.OnStart`, `Service.OnLaunch` 등. 프로세스 기동/조립 시나리오에 사용한다.
3. **외부 이벤트 수신** — 사용자 입력, 타이머 만료, 네트워크 메시지 수신 등. 해당 이벤트를 처리하는 객체의 이벤트 핸들러가 시작점이 된다.

어떤 경우에도 시작점은 **Object 목록에 포함된 객체 중 하나** 의 메서드/이벤트여야 한다. orchestrator 외 객체가 시작점이 되는 것은 자연스러운 일이다 (예: `Main.OnStart` 가 orchestrator 인 `Orchestrator` 를 생성/기동하는 경우).

### 구성 요소

| 요소 | 표기 | 설명 |
|-----|------|------|
| 메서드 | `Object.MethodName` | Public 메서드 호출 |
| 이벤트 | `Object.OnEventName` | 이벤트 발생 |
| 반환값 | `Object.Method.result` | 메서드 반환값 |
| 조건값 | `Object.Method.value` | 분기 조건 |

### 제한 사항

* 객체 내부 프로세스는 표시하지 않는다 (필요시 `Public → Private` 한 단계만 허용).
* 메서드 파라미터는 표기하지 않는다.

## 핵심 원칙 — 모든 화살표는 orchestrator 의 관점이다

> jobflow 다이어그램의 모든 `-->` 는 **orchestrator(오케스트레이터) 가 본 흐름**이다.
> 흐름을 제어하는 주체도, **결과를 받아 다음 단계로 흘려보내는 주체도 항상 orchestrator 이다**.

따라서 다이어그램을 읽을 때(그리고 코드로 구현할 때)는 다음 규칙을 지킨다.

* `A.Method --> B.Method` 는 "orchestrator 가 A.Method 가 끝나면 B.Method 를 호출한다" 는 뜻.
  실제 코드도 orchestrator 의 메서드 안에서 A → B 를 순차 호출하거나, A 의 이벤트를 구독해 B 를 부르는
  형태가 된다 — **A 가 직접 B 를 호출하는 코드가 아니다**.
* `A.Method.result --> B.Method` 는 "orchestrator 가 A.Method 의 반환값을 받아 B.Method 의 입력으로
  넘긴다" 는 뜻. 마찬가지로 **A 가 직접 B 를 호출하는 게 아니다**. 코드 상으로는
  `const r = await a.method(); await b.method(r);` 같이 orchestrator 의 메서드 안에서 결과가 전달되거나,
  `a.OnDone += (r) => b.method(r)` 같이 orchestrator 가 이벤트로 잇는다.
* `A.Method.result --> Orchestrator.Method.result` 는 "A 의 반환값이 곧 orchestrator 메서드의 반환값이 된다"
  는 뜻 — 마지막 단계의 산출물이 orchestrator 의 호출자로 그대로 흘러나가는 표기.

이 원칙의 따름정리:

* 단계 사이마다 `X.result --> Orchestrator.Method` / `Orchestrator.Method --> Y` 식으로 orchestrator 로 명시적으로
  되돌렸다 다시 내보내는 표기는 **중복**이다. 화살표가 이미 orchestrator 관점이므로, orchestrator 가 결과를
  받아 다음 단계로 넘긴다는 사실은 `X.result --> Y` 한 줄로 충분히 표현된다.
* 단계 사이에 orchestrator 가 **다른 메서드로 책임을 넘긴다거나(예: `OnStart` → `InitializeOrchestrator`),
  결과값에 따라 분기한다거나, 결과를 가공해서 별도 메서드에서 후처리해야 할 때만** 명시적으로
  `X.result --> Orchestrator.OtherMethod` 로 표기한다. 그 경우는 표기를 통해 "orchestrator 의 메서드 경계가
  바뀐다" 는 정보를 전달한다.

## 표현 규칙

아래 예시에서 `Orchestrator`는 orchestrator 객체를 의미한다.
* `Orchestrator.Method --> B.Method`: orchestrator가 자신의 메서드에서 B를 직접 호출
* `A.OnEvent --> B.Method`: orchestrator가 A의 이벤트를 B의 메서드에 구독 연결
* `A.Method.result --> B.Method`: orchestrator가 A의 반환값을 받아 B에 입력으로 넘김
  (A 가 B 를 직접 호출하는 게 아님)

### 순차 호출

```jobflow
Orchestrator.MethodName --> A.MethodName
Orchestrator.MethodName --> B.MethodName
```
* orchestrator의 메서드가 A와 B를 순차적으로 호출한다.

orchestrator 코드 예시:
```
MethodName() {
    A.MethodName()
    B.MethodName()
}
```

### 이벤트 구독

```jobflow
A.OnEventName --> B.MethodName
```
* A의 이벤트 발생 시 B의 메서드가 호출된다.
* orchestrator 생성자에서 `A.OnEventName += B.MethodName`으로 구독 설정한다.

orchestrator 코드 예시:
```
constructor() {
    A.OnEventName = B.MethodName
}
```

### 반환값 처리

```jobflow
A.MethodName --> B.MethodName
B.MethodName.result --> A.HandleResult
```
* B의 반환값을 `.result`로 표기한다.
* orchestrator 가 A, B 를 차례로 호출하고, B 의 반환값을 `A.HandleResult` 에 전달한다.
  A 가 B 를 직접 호출하는 것이 아니다 (§핵심 원칙).

orchestrator 코드 예시:
```
main() {
    A.MethodName()
    result = B.MethodName()
    A.HandleResult(result)
}
```

### 다른 객체의 결과를 caller 흐름에서 이어 쓰기

caller 메서드가 다른 객체에게 무언가 요청하고, 그 결과를 바탕으로 처리를 이어가야 하는 경우가 있다.
"caller 자신이 결과를 받아 계속 일한다" 가 의미상 맞지만, 다이어그램이 **orchestrator 관점**이기 때문에
`B.result --> A.MethodName` 으로 적으면 `A.MethodName` 이 두 번 호출되는 것처럼 오독된다
(§"주의 — 표기 함정"). orchestrator 는 객체 내부의 일을 알 수 없으므로, 표기 차원에서 두 가지 케이스로
나눠 표현한다.

**Case 1 — 다른 메서드로 결과를 위임**

```jobflow
A.MethodName --> B.MethodName
B.MethodName.result --> A.OtherMethod
```

* orchestrator 가 `A.MethodName` 을 호출한 뒤 `B.MethodName` 을 호출하고, `B.MethodName` 의 반환값을
  `A.OtherMethod` 에 전달하면서 호출한다.
* `A.MethodName` 과 `A.OtherMethod` 는 같은 객체의 **서로 다른 메서드**이므로 round-trip 안티패턴이
  아니다. caller 의 책임이 메서드 경계에서 자연스럽게 분리된다.

orchestrator 코드 예시:
```
main() {
    A.MethodName()
    result = B.MethodName()
    A.OtherMethod(result)
}
```

* 예:
    ```jobflow
    Main.OnStart --> Container.BuildContainer
    Container.BuildContainer.result --> Main.InitializeOrchestrator
    Main.InitializeOrchestrator --> Orchestrator.NewOrchestrator
    ```
    "Main.OnStart 는 Container 생성까지만, 생성된 Container 는 Main.InitializeOrchestrator 가 받아
    Orchestrator 조립을 책임진다."

**Case 2 — 이벤트로 데이터를 요청해 내부에서 이어 쓰기**

caller 메서드가 **자기 자신의 흐름 안에서** 외부 데이터를 끌어와 계속 처리해야 한다면, caller 가
이벤트를 발생시키고 그 결과를 이벤트의 반환값으로 받아 내부에서 소비하는 형태로 표기한다.

```jobflow
A.MethodName --> A.OnNeedData
A.OnNeedData --> B.MethodName
B.MethodName.result --> A.OnNeedData.result
```

* `A.MethodName` 이 진행 도중 `A.OnNeedData` 이벤트를 발생시킨다 (이 줄은 내부 동작이므로 생략 가능).
* orchestrator 가 `A.OnNeedData` 를 `B.MethodName` 에 바인딩해 두었기 때문에, 이벤트 발생 시
  `B.MethodName` 이 실행된다.
* `B.MethodName` 의 반환값이 `A.OnNeedData` 의 반환값으로 흘러 들어가고, 그 값을 `A.MethodName` 이
  내부에서 받아 처리를 이어간다.
* orchestrator 는 "A 가 데이터를 요청하면 B 에게서 받아다 준다" 만 알 뿐, A 내부의 분기·재개는 관여하지
  않는다.

A 클래스 코드 예시:
```
MethodName() {
    ...
    if (...) {
        data = OnNeedData()
    }
    ...
}
```

orchestrator 코드 예시:
```
main() {
    A.OnNeedData = B.MethodName
}
```

B 클래스 코드 예시:
```
MethodName() {
    ...
    return value
}
```

### 반환값을 다른 객체에 전달

```jobflow
A.OnEventName --> B.MethodName
B.MethodName.result --> C.HandleResult
```
* A의 이벤트로 B가 호출되고, B의 결과를 **다른 객체 C**의 메서드가 처리한다.
* 위의 "같은 객체의 다른 메서드로 위임" 패턴과 다른 점: 결과를 받는 쪽이 **다른 객체**이다.

orchestrator 코드 예시:
```
constructor() {
    A.OnEventName = handleEventName
}

handleEventName() {
    result = B.MethodName()
    C.HandleResult(result)
}
```

* B 의 결과를 받아 C 에 넘기는 주체는 orchestrator 다. B 와 C 는 서로를 모른다.

### 반환값을 받아 다시 전달 (체이닝)

```jobflow
A.MethodName --> B.MethodName
B.MethodName.result --> A.MethodName.result
A.MethodName.result --> C.HandleResult
```
* A 가 내부에서 B 를 직접 호출해 결과를 받고, 그 값을 자신의 반환값으로 내보낸다
  (`B.MethodName.result --> A.MethodName.result`). orchestrator 는 A 의 반환값을 받아 C 에 전달한다.
* **이 패턴은 최대한 피하는 것이 좋다.** A 가 B 를 직접 참조하기 때문이다. 워커끼리는 최대한 서로
  모르게 해야 각 객체가 자신의 책임에만 집중할 수 있다. 직접 참조는 두 객체를 강하게 결합시키고,
  협력 관계가 orchestrator 가 아닌 객체 내부에 숨어 다이어그램만으로 흐름을 추적할 수 없게 된다.
* 대신 Case 2(이벤트) 또는 orchestrator 의 직접 chaining(§결과를 다음 단계로) 으로 표현한다.
  이 표기는 기존 코드를 기록하는 등 직접 참조가 불가피한 경우에만 쓴다.

A 클래스 코드 예시:
```
MethodName() {
    data = B.MethodName()
    ...
    return data
}
```

orchestrator 코드 예시:
```
main() {
    result = A.MethodName()
    C.HandleResult(result)
}
```

### 결과를 다음 단계로 (orchestrator 관점의 기본 표기)

```jobflow
Orchestrator.MethodName --> A.Step1
A.Step1.result --> B.Step2
B.Step2.result --> C.Step3
C.Step3.result --> Orchestrator.MethodName.result
```

* 핵심 원칙의 직접적 적용. orchestrator 가 `A.Step1` 의 반환값을 받아 `B.Step2` 에 넣고, `B.Step2` 의 반환값을
  받아 `C.Step3` 에 넣은 뒤, 마지막 산출물을 자기 메서드의 반환값으로 흘려보낸다는 뜻.
* `A.Step1.result --> B.Step2` 가 **A 가 직접 B 를 호출한다는 뜻이 아님**을 다시 강조한다. 결과를
  넘기는 주체는 orchestrator 다. A 와 B 는 서로를 모른다.
* N 단계 LLM 파이프라인, ETL, 컴파일러 패스, 빌드 단계 등 단계 간 변환을 orchestrator 가 직선으로 잇는
  모든 시나리오에서 이 표기가 기본이다.

orchestrator 코드 예시:
```
MethodName() {
    r1 = A.Step1()
    r2 = B.Step2(r1)
    r3 = C.Step3(r2)
    return r3
}
```

> **주의 — 표기 함정 (가장 자주 발생하는 안티패턴)**: `A.Step1 --> A`, `A --> B.Step2`,
> `B.Step2.result --> A`, `A --> C.Step3`, `C.Step3.result --> A` … 식으로 단계마다 orchestrator 로
> 한 번 돌아갔다 다시 내보내는 round-trip 을 반복하지 말 것. 화살표는 이미 orchestrator 관점이므로
> 그 round-trip 은 표기 안에 묵시적으로 포함되어 있다.
>
> **이 안티패턴의 핵심 실패 모드**: orchestrator 의 동일 메서드가 화살표의 타겟으로 여러 번 등장하면
> (예: `B.result --> Orchestrator.Run` 뒤에 다시 `Orchestrator.Run --> C.Step3`), 그 메서드가
> **실제로는 한 번만 진입했음에도 마치 여러 번 호출되는 것처럼** 오독된다. 호출 횟수, 진입점,
> 동시성에 대한 잘못된 멘탈모델로 직결되므로 가장 우선해서 피해야 할 표기 실수이다.
>
> 검증 휴리스틱 — "한 다이어그램 안에서 같은 `Orchestrator.Method` 가 화살표 **타겟**(`--> Orchestrator.Method`)
> 으로 두 번 이상 나타나면 의심하라". 그 중 한 번이라도 단순히 결과를 받아 곧바로 다음 단계로
> 내보내는 용도라면 round-trip 안티패턴이다. **그냥 직접 chaining 으로 바꿔라**:
> `B.result --> Orchestrator.Method` + `Orchestrator.Method --> C.Step3` → `B.result --> C.Step3`.
>
> 단계 사이에 **진짜로** orchestrator 의 가공·분기·메서드 책임 전환이 들어갈 때만 `X.result --> Orchestrator.X`
> 또는 `X.result --> Orchestrator.OtherMethod` 표기를 쓴다 (앞의 "반환값을 같은 객체의 다른 메서드로 위임" 패턴 참조).
> 단, `X.result --> Orchestrator.X` 처럼 **같은 메서드명으로 되돌아오는 표기는 금지**한다 — A.MethodName 이
> 두 번 호출되는 것처럼 오독되기 때문이다. 책임 전환이 필요하면 반드시 **다른 메서드명**으로 위임한다. 그 경우 같은 메서드명이 두 번 나타나더라도,
> 두 등장 사이에 진짜 가공·분기 단계가 명시적으로 들어가 있으므로 "여러 번 호출되는 것처럼 보이는"
> 오독이 발생하지 않는다.
>
> 잘못된 예 — 단순 3 단계를 매 단계 round-trip 으로 표기:
> ```jobflow
> Orchestrator.MethodName --> A.Step1
> A.Step1.result --> Orchestrator.MethodName
> Orchestrator.MethodName --> B.Step2
> B.Step2.result --> Orchestrator.MethodName
> Orchestrator.MethodName --> C.Step3
> C.Step3.result --> Orchestrator.MethodName
> ```
> 올바른 예:
> ```jobflow
> Orchestrator.MethodName --> A.Step1
> A.Step1.result --> B.Step2
> B.Step2.result --> C.Step3
> C.Step3.result --> Orchestrator.MethodName.result
> ```

### 반환값에 따른 분기

```jobflow
A.MethodName --> B.MethodName
B.MethodName.Value1 --> C.HandleValue1
B.MethodName.Value2 --> D.HandleValue2
```
* B의 반환값에 따라 다른 객체의 메서드가 호출된다.

orchestrator 코드 예시:
```
main() {
    A.MethodName()
    value = B.MethodName()
    switch (value) {
        case Value1: C.HandleValue1()
        case Value2: D.HandleValue2()
    }
}
```

### 불리언 분기

```jobflow
A.MethodName --> B.MethodName
B.MethodName.true --> C.HandleTrue
B.MethodName.false --> C.HandleFalse
```

orchestrator 코드 예시:
```
main() {
    A.MethodName()
    if (B.MethodName()) {
        C.HandleTrue()
    } else {
        C.HandleFalse()
    }
}
```

### 단일 조건 분기 (false 무시)

```jobflow
A.MethodName --> B.MethodName
B.MethodName.true --> C.MethodName
```

orchestrator 코드 예시:
```
main() {
    A.MethodName()
    if (B.MethodName()) {
        C.MethodName()
    }
}
```

### 생성자 / 초기화 호출

```jobflow
Parent.NewParent --> Child.NewChild
Parent.NewParent --> Grandchild.NewGrandchild
```
* 객체를 생성하거나 초기화하는 호출도 일반 메서드와 동일한 `-->` 로 표기한다.
* 생성자 이름은 언어/프로젝트 관습을 따른다 (`NewXxx`, `CreateXxx`, `Init`, `ctor` 등).
* 부모 객체가 자식 객체를 생성하면서 하위 객체를 트리 형태로 조립하는 과정을 표현한다.

Parent 클래스 코드 예시:
```
NewParent() {
    child = Child.NewChild()
    grandchild = Grandchild.NewGrandchild()
}
```

## 다이어그램 예제

### 예제 1. 기능 실행 시나리오 (기존 패턴)

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
VideoDecoder.GetFrameBitmap.result --> VideoRenderer.DrawFrame
```
* orchestrator 인 `VideoPlayer` 의 `Open` / `Play` 가 시작점.
* `FileStream.OnXxx` 같은 이벤트는 orchestrator 가 구독한 상위 흐름.
* `VideoDecoder.GetFrameBitmap.result --> VideoRenderer.DrawFrame` 은 반환값을 다른 객체의 메서드로 전달하는 패턴.

### 예제 2. 프로세스 기동 & 전체 조립 시나리오

```jobflow
orchestrator: Orchestrator
Object: Orchestrator, Main, Config, Container, MarketOrchestrator, PremarketOrchestrator
Main.OnStart --> Config.Load
Config.Load.result --> Container.BuildContainer
Container.BuildContainer.result --> Main.InitializeOrchestrator
Main.InitializeOrchestrator --> Orchestrator.NewOrchestrator
Orchestrator.NewOrchestrator --> MarketOrchestrator.NewOrchestrator
Orchestrator.NewOrchestrator --> PremarketOrchestrator.NewOrchestrator
Orchestrator.NewOrchestrator --> Orchestrator.Run
Orchestrator.Run --> MarketOrchestrator.Run
Orchestrator.Run --> PremarketOrchestrator.Run
```

**읽는 법**:
- `Main.OnStart` 는 프로세스 진입점 이벤트 — orchestrator 가 아니어도 시작점이 될 수 있다.
- `Config.Load.result --> Container.BuildContainer` 는 orchestrator 관점의 **직접 chaining**.
  `Main.OnStart` 로 결과를 한 번 돌려보냈다 다시 내보내는 round-trip 표기는 “Main.OnStart 가
  두 번 호출되는 것처럼” 오독을 낳으므로 쓰지 않는다 (§“주의 — 표기 함정”).
- `Container.BuildContainer.result --> Main.InitializeOrchestrator` 는 **반환값을 같은 객체의 다른 메서드로 위임**하는 패턴. Main 은 `OnStart` 에서 설정·컨테이너 준비까지만 담당하고, 조립 요청은 `InitializeOrchestrator` 라는 별도 메서드가 받는다. 같은 `Main` 객체이지만 메서드 경계가 바뀌므로 round-trip 안티패턴이 아니다.
- `Main.InitializeOrchestrator --> Orchestrator.NewOrchestrator` 는 조립 메서드가 최상위 객체의 생성자를 호출하는 흐름이다. `NewOrchestrator` 안에서 `MarketOrchestrator.NewOrchestrator`, `PremarketOrchestrator.NewOrchestrator` 조립 트리가 전개된다.
- 중요한 전환: **`Orchestrator.NewOrchestrator --> Orchestrator.Run`** 은 "조립이 끝나면 Orchestrator 가 스스로 Run 루프로 진입한다" 는 **객체 내부 수명주기 전환**을 표현한다. Main 이 `Run` 을 직접 호출하지 않는다. 이 시점부터 제어권이 orchestrator(Orchestrator) 로 완전히 넘어간다.
- `Orchestrator.Run` 이 하위 Sub-Orchestrator 들을 errgroup 으로 동시 기동한다.

**객체 설명**:
| 객체 | 역할 |
|---|---|
| **Main** | 프로세스 진입점. `OnStart` 에서 설정 로드 → Container 빌드까지 지휘한 뒤, Container 결과를 `InitializeOrchestrator` 에 위임한다. `InitializeOrchestrator` 는 Orchestrator 의 생성 요청만 담당하고, 이후의 `Run` 진입은 Orchestrator 객체 스스로의 수명주기로 넘어간다. 이렇게 메서드를 분리함으로써 Main 은 "조립 요청" 과 "실행 지시" 를 모두 끌어안지 않고 조립 요청만 책임진다. Main 은 orchestrator 가 아니지만 조립 요청의 시작점이다. |
| **Config** | 환경 변수 / 설정 파일을 읽어 실행 파라미터(모듈 on/off, KIS 키, 경로, 임계값 등)를 구조화해 반환하는 **값 객체**. 상태를 보유하지 않는다. |
| **Container** | 싱글톤 공유 서비스(DB, Redis, Telegram, KIS 클라이언트, Watchlist, NameResolver 등)를 생성·주입하는 **의존성 컨테이너**. `BuildContainer` 가 한 번 호출되고 그 결과가 `Main.InitializeOrchestrator` 로 전달된다. |
| **Orchestrator** *(orchestrator)* | 전체 시스템의 최상위 조율자. 생성 시점에 하위 `MarketOrchestrator`, `PremarketOrchestrator` 를 소유로 만들고, 조립이 끝나면 **자기 자신의 수명주기로서 `Run(ctx)` 에 진입**한다. Main 이 별도로 Run 을 호출하지 않아도 Orchestrator 가 `New → Run` 흐름을 자기 안에서 이어받는다. `Run` 은 두 Sub-Orchestrator 를 `errgroup` 으로 동시에 기동하며 어느 한 쪽 에러 발생 시 ctx 전파로 다른 쪽도 종료된다. |
| **MarketOrchestrator** | 실시간 시장 데이터 수집(WebSocket 구독, 틱 저장, 신호 탐지, 알림)의 Sub-Orchestrator. 자신의 Worker 들(WS subscriber, tick storage, signal detector, health server 등)을 소유한다. |
| **PremarketOrchestrator** | 매 영업일 08:00~09:00 KST 프리마켓 감시 세션을 수행하는 Sub-Orchestrator. 일일 스케줄러와 DipMonitor 상태 기계 Worker 를 소유한다. |

**주의 1 — Main 의 두 메서드 분리가 뜻하는 것**:

이 예제에서 `Main` 이라는 한 객체 안에 `OnStart` 와 `InitializeOrchestrator` 두 메서드가 존재하고, 둘 사이에 **`.result --> Caller.OtherMethod` 라는 위임 표기가 나타난다**. 이는 다이어그램이 "한 객체 내부에서도 메서드 경계별로 책임을 분리" 한다는 것을 드러낼 수 있음을 보여준다. jobflow 는 "객체 단위 + 메서드 단위" 두 레이어의 책임 분리를 모두 표현할 수 있다.

**주의 2 — `NewXxx --> Xxx.Run` 패턴의 의미**:

`Orchestrator.NewOrchestrator --> Orchestrator.Run` 은 **같은 객체 안에서 "생성자 단계" → "실행 단계" 로 수명주기가 이어진다**는 것을 나타낸다. 코드 상으로 NewOrchestrator 가 Run 을 직접 호출하지 않더라도, 개념적으로 "조립이 끝나면 곧바로 Run 으로 간다" 는 필연적 연결을 다이어그램에 명시할 때 사용한다. 이 표기는 **orchestrator 객체가 외부(Main) 의 지시 없이 스스로의 수명주기를 이어간다**는 점을 드러내는 역할을 하며, Main 은 `NewOrchestrator` 호출까지만 하고 그 뒤의 `Run` 진입은 주관하지 않는다는 뜻이다.

잘못된 표현의 예:
```jobflow
Container.BuildContainer.result --> Main.OnStart
Main.OnStart --> Orchestrator.NewOrchestrator
Main.OnStart --> Orchestrator.Run
```
이렇게 쓰면 "Main.OnStart 가 Container 결과를 직접 받아 Orchestrator 를 생성하고 Run 도 호출" 하는 구조가 되어, 조립·실행 책임이 `OnStart` 안에 섞여 버린다. 올바르게는 `Container.BuildContainer.result --> Main.InitializeOrchestrator` 로 위임하고, 조립 이후는 `Orchestrator.NewOrchestrator --> Orchestrator.Run` 으로 orchestrator 내부 수명주기에 맡겨야 한다.

코드 예시:
```
// Main
OnStart() {
    config = Config.Load()
    container = Container.BuildContainer(config)
    InitializeOrchestrator(container)
}

InitializeOrchestrator(container) {
    Orchestrator.NewOrchestrator(container)
}

// Orchestrator
NewOrchestrator(container) {
    market = MarketOrchestrator.NewOrchestrator(container)
    premarket = PremarketOrchestrator.NewOrchestrator(container)
    Run()
}

Run() {
    errgroup {
        market.Run()
        premarket.Run()
    }
}
```

### 예제 1 의 코드 구현 예시 (C#)

```csharp
public class VideoPlayer
{
   private readonly FileStream _fileStream = new FileStream();
   private readonly VideoDecoder _videoDecoder = new VideoDecoder();
   private readonly AudioDecoder _audioDecoder = new AudioDecoder();
   private readonly VideoRenderer _videoRenderer = new VideoRenderer();

   public VideoPlayer()
   {
       _fileStream.OnVideoData += _videoDecoder.Decode;
       _fileStream.OnAudioData += _audioDecoder.Decode;
       _videoRenderer.OnFrameRequested += HandleFrameRequested;
   }

   public void Open(string path)
   {
       _videoDecoder.Initialize();
       _audioDecoder.Initialize();
       _fileStream.Open(path);
   }

   public void Play()
   {
       _fileStream.StartReading();
   }

   private void HandleFrameRequested(object sender, FrameRequestedEventArgs e)
   {
       Bitmap frameBitmap = _videoDecoder.GetFrameBitmap();
       _videoRenderer.DrawFrame(frameBitmap);
   }
}
```

## 재귀적 세분화

### 목적

* 시스템 전체 관점의 Job Flow Diagram을 먼저 작성한다.
* 그 안에서 복잡성이 높은 구성 요소(모듈/객체)를 식별한다.
* 해당 구성 요소를 중심으로 **별도의 Job Flow Diagram을 다시 작성**하여 설계를 세분화한다.
* 이때 **세분화 다이어그램의 orchestrator는 “복잡 모듈 객체”**가 된다.

### 예시 — 시스템 전체 관점의 Job Flow Diagram

```jobflow
orchestrator: VideoPlayer
Object: VideoPlayer, FileStream, VideoDecoder, AudioDecoder
... 시스템 전체 관점의 예
```

### 예시 — 복잡 모듈 중심으로 재귀적 세분화

```jobflow
orchestrator: VideoDecoder
Object: VideoDecoder, Worker, Decoder, Renderer
... VideoDecoder 관점의 예
```
