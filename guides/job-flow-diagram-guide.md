# Job Flow Diagram Guide

## 적용 범위와 읽는 순서

한 시나리오에서 **누가 흐름을 조율하고 어떤 공개 계약으로 협력하는가**를 표현한다. 화살표 수나 객체 수를 줄이는 것보다, 다른 조각의 구현을 열지 않고 흐름을 설명할 수 있는지가 중요하다. 경계·계약·분해 중단 기준은 [module-boundary-guide.md](module-boundary-guide.md)를 따른다.

먼저 헤더와 핵심 원칙을 읽고, 작업에 필요한 반환·분기·이벤트 예시만 선택한다. 아래 짧은 블록은 문법 조각이며, 실제 시나리오에는 헤더, 객체 목록, 트리거, 완료/실패 조건을 함께 적는다. 전체 시스템의 모든 흐름을 먼저 작성할 필요는 없다.


## 헤더 키워드 — `orchestrator:` vs `scope:`

jobflow 다이어그램의 첫 줄은 **실제 조율자 또는 관찰 경계**를 선언한다. 이 가이드는 method-R 표기 규칙([method-R.md](./method-R.md)) 과 일관되게 두 키워드를 구분해서 쓴다.

| 키워드 | 의미 | 흐름 제어 | 사용 단계 |
|---|---|---|---|
| `orchestrator: X` | X 가 시나리오의 흐름을 능동적으로 조율하는 객체다. 다른 객체의 메서드를 직접 호출하거나 이벤트를 구독해 다음 단계를 결정한다. | **있음** (X 가 함) | 시스템 설계의 Orchestration 모드, 모듈 설계, 상세 설계 (재귀 Sub-Orchestrator) |
| `scope: X` | X는 관찰하는 **경계**다. 이 그림에서는 내부의 단일 흐름 조율자를 선언하지 않는다. 내부 제어를 숨긴 매크로 관점이나 중앙 조율자 없는 협력에 쓴다. | 이 관점에서 선언하지 않음 | 매크로 설계 (시스템 경계), 시스템 설계의 Choreography 모드 |

핵심은 **이 다이어그램이 실제 단일 조율자의 내부 협력을 보여 주는가**다. 그러면 `orchestrator:`, 관찰 경계의 입출력만 보이거나 중앙 조율자 없는 협력이면 `scope:`를 쓴다. `scope:`라고 해서 숨겨진 내부에 조율자가 없다는 뜻은 아니다.

이 가이드의 나머지 본문은 **`orchestrator:` 모드의 표기 규칙**을 다룬다 (내부 협력의 `-->`를 선언된 조율자 관점으로 읽는 경우). `scope:` 모드(Choreography·경계 메시지) 의 표기 규칙은 method-R 의 매크로 / Choreography 절을 따른다.

### 문서 의미와 렌더러 지원

`orchestrator:`와 `scope:`는 이 저장소의 기존 Method-R 의미 표기다. [tools-camp-markdown-guide.md](tools-camp-markdown-guide.md)는 별도로 `master:` 헤더를 기술한다. 이 저장소에는 대상 렌더러 소스가 포함되어 있지 않으므로 현재 제품 전체의 지원 여부를 이 문서만으로 단정하지 않는다. 별도로 확인한 tools.camp `d12f230` 스냅샷은 `master:`만 파싱하고 `orchestrator:`/`scope:`의 제어 의미를 해석하지 않는다. 단순 이름 헤더를 무시해도 관계 그림은 생성되므로 생성 성공을 헤더 지원으로 오해하지 않는다. 정확한 확인 범위는 [문법 레퍼런스의 구현 확인 기록](tools-camp-markdown-guide.md#확인한-구현-스냅샷)을 참고한다.

새 문서는 제어 주체에 맞게 `orchestrator:` 또는 `scope:`를 선택한다. 기존 `master:` 문서는 먼저 주변 설명과 코드에서 제어 주체를 확인한다. 렌더링을 위해 헤더를 바꿔야 한다면 대상 구현에서 지원을 확인하고 의미를 본문에 유지한다. 특히 `scope:`를 `master:`로 기계적으로 바꿔 중앙 조율자가 존재하는 것처럼 설명하지 않는다. 확인한 버전에서는 `Object:` 목록과 코드펜스 밖 조율자/경계 설명을 함께 제공해야 읽는 사람이 의미를 알 수 있다. 헤더만으로 구현의 의존성이나 실행 방식이 보장되지는 않는다.

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
* 필요한 공개 계약을 주입받아 협력을 연결한다. 객체를 직접 생성하거나 모든 인스턴스를 소유해야 하는 것은 아니다. 워커에 orchestrator 자체나 전체 컨테이너를 넘기지 않는다.
* 내부 협력의 `-->`는 선언된 orchestrator 관점으로 읽는다. 외부 입력은 진입점으로 구분하고, 다른 객체가 실제로 조율하는 초기화·내부 흐름은 그 객체의 별도 다이어그램으로 연다.

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
| 무시 분기 | `Object.Method.value` 단독 줄 (화살표 없음) | 그 분기에서는 아무 일도 일어나지 않음 — §무시 분기 표기 |

### 제한 사항

* 객체 내부 프로세스는 표시하지 않는다 (필요시 `Public → Private` 한 단계만 허용).
* 메서드 파라미터는 표기하지 않는다.
* 확인한 tools.camp `d12f230`의 jobflow는 ` : 라벨`을 전이 라벨로 분리하지 않고 액션 문자열의 일부로 읽는다. 분기는 아래 `.true`/`.false`/값 경로로 쓰고 설명은 블록 밖에 적는다. navigation/state의 라벨 문법을 jobflow에 가져오지 않는다.

## 핵심 원칙 — 내부 협력은 선언된 orchestrator의 관점이다

> `orchestrator:` 다이어그램의 내부 협력 화살표는 **선언된 orchestrator가 연결하는 흐름**이다. 외부 요청의 진입·응답과 객체 안에서 발생한 이벤트는 그 경계 사실을 나타낸다. 하나의 블록 안에서 동일한 화살표를 워커끼리의 직접 호출이라는 뜻으로 바꾸지 않는다. `scope:`에는 이 축약 규칙을 적용하지 않는다.

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
* 구독 연결은 orchestrator의 조립/시작 단계에서 설정하고, 종료·해제 책임도 정한다. 생성자에 구독이나 장기 실행을 반드시 넣을 필요는 없다.

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

**Case 2 — 단일 응답 계약으로 데이터를 요청해 내부에서 이어 쓰기**

caller 메서드가 **자기 자신의 흐름 안에서** 외부 데이터를 받아 계속 처리한다면, 좁은 조회 포트나 단일 응답 콜백을 주입할 수 있다. 아래 `RequestData`는 **응답자 하나인 요청 계약**이다. 여러 구독자에게 사실을 알리는 이벤트와 구분한다. 일반 이벤트가 반환값을 제공한다고 가정하거나, 조회를 위해 브로커를 추가하지 않는다. 기존 문서의 `OnNeedData`를 해설할 때도 이름만으로 일반 이벤트라고 판단하지 않고 이 단일 응답 계약인지 확인한다.

```jobflow
A.MethodName --> A.RequestData
A.RequestData --> B.MethodName
B.MethodName.result --> A.RequestData.result
```

* `A.MethodName`이 진행 도중 `A.RequestData` 요청 콜백을 호출한다 (이 줄은 내부 동작이므로 생략 가능).
* orchestrator가 `A.RequestData` 요청 콜백을 `B.MethodName`에 바인딩해 두었기 때문에 요청 시 `B.MethodName`이 실행된다.
* `B.MethodName`의 반환값이 `A.RequestData` 요청 콜백의 반환값이 되고, `A.MethodName`은 그 값을 내부에서 받아 처리를 이어간다.
* orchestrator 는 "A 가 데이터를 요청하면 B 에게서 받아다 준다" 만 알 뿐, A 내부의 분기·재개는 관여하지
  않는다.

A 클래스 코드 예시:
```
MethodName() {
    ...
    if (...) {
        data = RequestData()
    }
    ...
}
```

orchestrator 코드 예시:
```
main() {
    A.RequestData = B.MethodName
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

### 내부 의존성을 가진 객체의 반환값

A가 내부의 B 계약을 호출하는 기존 코드나 설계를 설명할 때, 상위 orchestrator가 B도 직접 조율하는 것처럼 그리지 않는다. 상위는 A의 공개 계약만 알고, 필요한 경우 A 내부를 별도 블록으로 연다.

상위 시나리오:

```jobflow
orchestrator: Orchestrator
Object: Orchestrator, A, C
Orchestrator.Run --> A.MethodName
A.MethodName.result --> C.HandleResult
C.HandleResult.result --> Orchestrator.Run.result
```

A의 내부 흐름이 설명에 필요한 경우:

```jobflow
orchestrator: A
Object: A, B
A.MethodName --> B.MethodName
B.MethodName.result --> A.MethodName.result
```

이때 A는 내부 B의 공개 계약에 의존한다. B가 A 책임 안의 하위 조각이나 포트인지, 독립된 형제 워커인지 책임 표로 구분한다. 형제 워커의 구현을 직접 참조하는 문제를 하위 다이어그램으로 감추지 않는다. 기존 의존성이 있다면 AS-IS에 사실과 근거를 남기고, 변경 필요성은 별도로 평가한다. 단순 함수나 조회를 표현하려고 불필요한 이벤트·Sub-Orchestrator를 추가하지 않는다.

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
> `X.result --> Orchestrator.X`를 단순히 실행 중인 메서드로 돌아와 계속한다는 뜻으로 쓰지 않는다. 책임이 실제로 나뉘어 있으면 다른 메서드명을 쓰고, 같은 호출의 최종 반환이면 `.result`로 연결한다. 실제 재시도·재호출을 나타내는 경우에는 조건·횟수·중복 효과 처리와 실제 코드 근거를 본문에 밝힌다. 다이어그램을 맞추기 위해 코드에 의미 없는 메서드를 추가하지 않는다.
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

### 무시 분기 표기 (화살표 없는 단독 줄)

`X.result --> Orchestrator.Method.result` 는 마지막 산출물이 orchestrator 메서드의 **반환값으로 호출자에게 실제로 흘러나갈 때만** 쓴다. 반환값을 받아가는 호출자가 없는 메서드(UI 이벤트 핸들러, 콜백 등)가 분기 결과에 따라 **아무 후속 동작 없이 끝나는** 경우에 `.result` 를 종료 표기로 차용하면 "없는 반환값을 누군가 받아가는 것처럼" 오독된다. 이 경우는 다음 둘 중 하나로 표기한다.

1. **기본 — 그리지 않는다**: 단일 조건 분기 패턴과 동일하게, 아무 일도 일어나지 않는 분기는 생략한다. 그 동작 사실은 다이어그램 하단 설명에 문장으로 남긴다.
2. **명시가 필요할 때 — 분기 값만 적고 화살표를 잇지 않는다**: "조용히 무시된다"는 사실 자체가 설계 정보일 때(예: 불법 입력의 무반응 처리)는 해당 분기 값을 **화살표 없는 단독 줄**로 남긴다.

```jobflow
GameHook.HandleIntersection --> RuleEngine.TryPlace
RuleEngine.TryPlace.false
RuleEngine.TryPlace.true --> GameHook.RequestAI
```

* 화살표가 없는 단독 줄은 "이 분기는 존재하지만 후속 흐름이 없다(무시된다)"는 선언이다. 다이어그램에서는 후속 화살표가 달리지 않은 매달린 분기 노드로 그려진다.
* 별도의 종료 마커(`.end` 등)를 도입하지 않는다 — 마커를 쓰면 그 이름의 메시지·이벤트가 코드에 실재하는 것으로 오독되어 독자가 코드에서 찾게 된다.
* qualifier 없이 `--> Orchestrator.Method` 로 되돌리는 표기는 여전히 금지다(재호출 오독 — §주의 표기 함정).

orchestrator 코드 예시:
```
HandleIntersection(x, y) {
    result = RuleEngine.TryPlace(x, y)
    if (!result) return      // 무시 분기 — 아무 일도 하지 않고 종료
    RequestAI(result)
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

### 예제 2. 프로세스 조립과 실행 책임 분리

이 예시는 Main이 설정을 읽고 조립된 Runtime을 명시적으로 시작한다. 조립과 장기 실행은 서로 다른 작업이며, `New` 이후 `Run`이 자동으로 실행된다고 추측하지 않는다.

```jobflow
orchestrator: Main
Object: Main, ConfigLoader, CompositionRoot, Runtime
Main.Start --> ConfigLoader.Load
ConfigLoader.Load.result --> CompositionRoot.Build
CompositionRoot.Build.result --> Main.RunRuntime
Main.RunRuntime --> Runtime.Run
Runtime.Run.result --> Main.Start.result
```

| 객체 | 책임 | 알아야 하는 계약 |
|---|---|---|
| `Main` | 시작·종료와 최상위 실패 처리 | 설정 로드, 조립, Runtime 실행 |
| `ConfigLoader` | 설정을 읽고 검증해 값으로 반환 | 설정 소스 |
| `CompositionRoot` | 의존성 생성·연결 | 생성자와 주입 계약 |
| `Runtime` | 작업의 실행·취소·정리 | 소속 작업의 실행 계약 |

```text
Main.Start() {
    config = ConfigLoader.Load()
    runtime = CompositionRoot.Build(config)
    return RunRuntime(runtime)
}
Main.RunRuntime(runtime) {
    return runtime.Run()
}
```

Runtime 내부의 동시 실행이 중요할 때만 다음 블록을 추가한다. 이 예시에서는 두 Run을 함께 시작하고, 하나가 실패하면 다른 작업에 취소를 전달한 뒤 둘의 정리가 끝날 때까지 기다린다. 이 정책은 화살표 모양이나 줄 순서만으로 표현되지 않으므로 본문과 실행 계약에 명시한다.

```jobflow
orchestrator: Runtime
Object: Runtime, Collector, Scheduler
Runtime.Run --> Collector.Run
Runtime.Run --> Scheduler.Run
```

생성자에서 실행을 시작하는 실제 코드라면 해당 사실을 기록할 수 있다. 다만 다이어그램에 없는 자동 시작·동시성·오류 전파를 필연적인 동작으로 해석하지 않는다. AS-IS의 호출자를 바꿔 좋은 구조처럼 보이게 그리지 않는다.

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

상위에서는 한 조각의 공개 입력·결과·실패만 보이고, 변경하거나 검토할 필요가 생긴 조각만 별도 다이어그램으로 연다. 단순 워커를 반드시 Sub-Orchestrator로 승격하지 않는다.

상위 시나리오:

```jobflow
orchestrator: VideoPlayer
Object: VideoPlayer, VideoDecoder
VideoPlayer.DecodeFrame --> VideoDecoder.Decode
VideoDecoder.Decode.result --> VideoPlayer.DecodeFrame.result
```

VideoDecoder의 분해가 필요한 경우:

```jobflow
orchestrator: VideoDecoder
Object: VideoDecoder, FrameParser, FrameConverter
VideoDecoder.Decode --> FrameParser.Parse
FrameParser.Parse.result --> FrameConverter.Convert
FrameConverter.Convert.result --> VideoDecoder.Decode.result
```

하위의 `VideoDecoder.Decode` 입력·출력·실패 의미는 상위 계약과 같아야 한다. 내부 워커 이름을 상위 호출자에게 공개하지 않는다. 담당 작업의 구현과 인접 계약만으로 수정·검증 가능하면 분해를 멈춘다.

## 다이어그램 옆에 남기는 계약과 검증

파라미터나 새 제어 토큰을 jobflow 문법에 추가하지 않고 다음 내용을 산문·표 또는 계약 문서 링크로 적는다.

- 대상 시나리오, 트리거, 조율자/경계, AS-IS 근거 또는 제안 상태
- 공개 입력·출력·오류, 데이터와 상태의 단일 소유자
- 관련될 때만 순서·병렬 실행·취소·timeout·재시도·중복 처리·구독 해제 규칙
- 상위 공개 계약과 필요한 하위 문서 링크

검토자는 성공 흐름 하나와 해당 변경에서 중요한 실패 흐름 하나를 따라가며 실제 호출자, 상태 변경자, 응답 수신자가 명확한지 확인한다. 같은 메서드로 돌아가는 화살표는 재개인지 실제 재호출인지 확인한다. 재시도가 실제 동작이면 별도 시나리오와 조건·횟수·중복 효과 처리로 설명한다.

`git diff --check`와 이름·헤더·계약 대조는 정적 검토다. 파서 실행·SVG/HTML 생성 확인과 브라우저에서 실제 블록을 표시한 확인을 나눠 기록한다. 렌더러가 없으면 미실행 사실과 확인 가능한 범위를 남긴다.
