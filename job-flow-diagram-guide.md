# Job Flow Diagram Guide

## 기본 규칙

### 기본 구조

```jobflow
master: [오케스트레이터 객체]
Object: [객체1], [객체2], [객체3], ...
```

* **master**: 프로세스 흐름을 제어하는 오케스트레이터 객체
* **Object**: 다이어그램에 등장하는 모든 객체 목록 (master 포함)

### master 객체의 역할

* 해당 시나리오에서 **흐름을 총괄하고 조율하는 중심 객체**이다.
* 다른 객체들을 멤버로 소유하거나, 다른 객체들이 이 master 를 기반으로 협력한다.
* 대부분의 `-->`는 master 를 중심으로 한 협력 관계를 나타내지만, **시나리오의 진입점(예: `Main.OnStart`)이나 부속 객체 간의 초기화 흐름**도 함께 표기할 수 있다.

### 시나리오의 시작점

시나리오의 시작점은 다음 중 하나의 형태로 나타난다.

1. **master 의 Public 메서드 호출** — 일반적인 기능 실행 시나리오.
2. **프로세스/스레드 진입 이벤트** — `Main.OnStart`, `Service.OnLaunch` 등. 프로세스 기동/조립 시나리오에 사용한다.
3. **외부 이벤트 수신** — 사용자 입력, 타이머 만료, 네트워크 메시지 수신 등. 해당 이벤트를 처리하는 객체의 이벤트 핸들러가 시작점이 된다.

어떤 경우에도 시작점은 **Object 목록에 포함된 객체 중 하나** 의 메서드/이벤트여야 한다. master 외 객체가 시작점이 되는 것은 자연스러운 일이다 (예: `Main.OnStart` 가 master 인 `Orchestrator` 를 생성/기동하는 경우).

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

## 핵심 원칙 — 모든 화살표는 master 의 관점이다

> jobflow 다이어그램의 모든 `-->` 는 **master(오케스트레이터) 가 본 흐름**이다.
> 흐름을 제어하는 주체도, **결과를 받아 다음 단계로 흘려보내는 주체도 항상 master 이다**.

따라서 다이어그램을 읽을 때(그리고 코드로 구현할 때)는 다음 규칙을 지킨다.

* `A.Method --> B.Method` 는 "master 가 A.Method 가 끝나면 B.Method 를 호출한다" 는 뜻.
  실제 코드도 master 의 메서드 안에서 A → B 를 순차 호출하거나, A 의 이벤트를 구독해 B 를 부르는
  형태가 된다 — **A 가 직접 B 를 호출하는 코드가 아니다**.
* `A.Method.result --> B.Method` 는 "master 가 A.Method 의 반환값을 받아 B.Method 의 입력으로
  넘긴다" 는 뜻. 마찬가지로 **A 가 직접 B 를 호출하는 게 아니다**. 코드 상으로는
  `const r = await a.method(); await b.method(r);` 같이 master 의 메서드 안에서 결과가 전달되거나,
  `a.OnDone += (r) => b.method(r)` 같이 master 가 이벤트로 잇는다.
* `A.Method.result --> Master.Method.result` 는 "A 의 반환값이 곧 master 메서드의 반환값이 된다"
  는 뜻 — 마지막 단계의 산출물이 master 의 호출자로 그대로 흘러나가는 표기.

이 원칙의 따름정리:

* 단계 사이마다 `X.result --> Master.Method` / `Master.Method --> Y` 식으로 master 로 명시적으로
  되돌렸다 다시 내보내는 표기는 **중복**이다. 화살표가 이미 master 관점이므로, master 가 결과를
  받아 다음 단계로 넘긴다는 사실은 `X.result --> Y` 한 줄로 충분히 표현된다.
* 단계 사이에 master 가 **다른 메서드로 책임을 넘긴다거나(예: `OnStart` → `InitializeOrchestrator`),
  결과값에 따라 분기한다거나, 결과를 가공해서 별도 메서드에서 후처리해야 할 때만** 명시적으로
  `X.result --> Master.OtherMethod` 로 표기한다. 그 경우는 표기를 통해 "master 의 메서드 경계가
  바뀐다" 는 정보를 전달한다.

## 표현 규칙

아래 예시에서 `Master`는 master 객체를 의미한다.
* `Master.Method --> B.Method`: master가 자신의 메서드에서 B를 직접 호출
* `A.OnEvent --> B.Method`: master가 A의 이벤트를 B의 메서드에 구독 연결
* `A.Method.result --> B.Method`: master가 A의 반환값을 받아 B에 입력으로 넘김
  (A 가 B 를 직접 호출하는 게 아님)

### 순차 호출

```jobflow
Master.MethodName --> A.MethodName
Master.MethodName --> B.MethodName
```
* master의 메서드가 A와 B를 순차적으로 호출한다.

### 이벤트 구독

```jobflow
A.OnEventName --> B.MethodName
```
* A의 이벤트 발생 시 B의 메서드가 호출된다.
* master 생성자에서 `A.OnEventName += B.MethodName`으로 구독 설정한다.

### 반환값 처리

```jobflow
A.MethodName --> B.MethodName
B.MethodName.result --> A.HandleResult
```
* B의 반환값을 `.result`로 표기한다.
* A가 B를 호출하고 결과를 받아 후속 처리한다.

### 반환값을 호출자 컨텍스트로 되돌리기 (동일 메서드 이어서)

```jobflow
A.MethodName --> B.MethodName
B.MethodName.result --> A.MethodName
```
* `A.MethodName` 이 `B.MethodName` 을 호출한 뒤, B의 반환값을 받아 **A.MethodName 자신의 흐름을 이어간다**.
* 별도의 핸들러 분리 없이 caller 의 같은 컨텍스트에서 결과를 계속 사용하는 경우에 쓴다.
* 예:
    ```jobflow
    Main.OnStart --> Config.Load
    Config.Load.result --> Main.OnStart
    ```
    "Main.OnStart 에서 Config.Load 를 호출하고, 반환된 Config 를 Main.OnStart 의 다음 라인에서 계속 사용한다" 는 의미.

### 반환값을 같은 객체의 다른 메서드로 위임

```jobflow
A.MethodName --> B.MethodName
B.MethodName.result --> A.OtherMethod
```
* `A.MethodName` 이 `B.MethodName` 을 호출해 결과를 받은 뒤, **자기 자신의 다른 메서드 `A.OtherMethod` 에 그 결과를 넘긴다**.
* "결과가 같은 객체 안에서 흐름을 바꾸어 다른 책임의 메서드로 이동한다" 는 의미이며, **단일 책임 원칙을 따른 위임**을 표현한다.
* 위의 "동일 메서드 이어서" 패턴과 다른 점: 반환값을 받은 caller 메서드가 끝나고, 흐름이 같은 객체 내부의 **다른 메서드**로 넘어간다. 즉 함수 경계가 바뀐다.
* 예:
    ```jobflow
    Main.OnStart --> Container.BuildContainer
    Container.BuildContainer.result --> Main.InitializeOrchestrator
    Main.InitializeOrchestrator --> Orchestrator.NewOrchestrator
    ```
    "Main.OnStart 는 Container 생성까지만 하고, 생성된 Container 는 Main.InitializeOrchestrator 가 받아 Orchestrator 조립을 책임진다" 는 의미.
* 이 패턴을 쓰면 `OnStart` 는 "전체 라이프사이클 지휘", `InitializeOrchestrator` 는 "Orchestrator 조립" 처럼 **한 객체 안에서도 메서드별로 책임을 분리**할 수 있다.

### 반환값을 다른 객체에 전달

```jobflow
A.OnEventName --> B.MethodName
B.MethodName.result --> C.HandleResult
```
* A의 이벤트로 B가 호출되고, B의 결과를 **다른 객체 C**의 메서드가 처리한다.
* 위의 "같은 객체의 다른 메서드로 위임" 패턴과 다른 점: 결과를 받는 쪽이 **다른 객체**이다.

### 반환값을 받아 다시 전달 (체이닝)

```jobflow
A.MethodName --> B.MethodName
B.MethodName.result --> A.MethodName.result
A.MethodName.result --> C.HandleResult
```
* A가 B를 호출하고 결과를 받는다.
* A가 받은 결과를 C에게 전달한다.

### 결과를 다음 단계로 (master 관점의 기본 표기)

```jobflow
Master.MethodName --> A.Step1
A.Step1.result --> B.Step2
B.Step2.result --> C.Step3
C.Step3.result --> Master.MethodName.result
```

* 핵심 원칙의 직접적 적용. master 가 `A.Step1` 의 반환값을 받아 `B.Step2` 에 넣고, `B.Step2` 의 반환값을
  받아 `C.Step3` 에 넣은 뒤, 마지막 산출물을 자기 메서드의 반환값으로 흘려보낸다는 뜻.
* `A.Step1.result --> B.Step2` 가 **A 가 직접 B 를 호출한다는 뜻이 아님**을 다시 강조한다. 결과를
  넘기는 주체는 master 다. A 와 B 는 서로를 모른다.
* N 단계 LLM 파이프라인, ETL, 컴파일러 패스, 빌드 단계 등 단계 간 변환을 master 가 직선으로 잇는
  모든 시나리오에서 이 표기가 기본이다.

> **주의 — 표기 함정**: `A.Step1 --> A`, `A --> B.Step2`, `B.Step2.result --> A`, `A --> C.Step3`,
> `C.Step3.result --> A` … 식으로 단계마다 master 로 한 번 돌아갔다 다시 내보내는 round-trip 을
> 반복하지 말 것. 화살표는 이미 master 관점이므로 그 round-trip 은 표기 안에 묵시적으로 포함되어
> 있다. 매 단계 명시적으로 그리면 "master 가 매 단계 결과를 받아 무언가 가공한 뒤 다음 단계를 부른다"
> 는 의미로 잘못 읽힌다.
>
> 단계 사이에 **진짜로** master 의 가공·분기·메서드 책임 전환이 들어갈 때만 `X.result --> Master.X`
> 또는 `X.result --> Master.OtherMethod` 표기를 쓴다 (앞의 "반환값을 호출자 컨텍스트로 되돌리기" /
> "반환값을 같은 객체의 다른 메서드로 위임" 패턴 참조).
>
> 잘못된 예 — 단순 3 단계를 매 단계 round-trip 으로 표기:
> ```jobflow
> Master.MethodName --> A.Step1
> A.Step1.result --> Master.MethodName
> Master.MethodName --> B.Step2
> B.Step2.result --> Master.MethodName
> Master.MethodName --> C.Step3
> C.Step3.result --> Master.MethodName
> ```
> 올바른 예:
> ```jobflow
> Master.MethodName --> A.Step1
> A.Step1.result --> B.Step2
> B.Step2.result --> C.Step3
> C.Step3.result --> Master.MethodName.result
> ```

### 반환값에 따른 분기

```jobflow
A.MethodName --> B.MethodName
B.MethodName.Value1 --> C.HandleValue1
B.MethodName.Value2 --> D.HandleValue2
```
* B의 반환값에 따라 다른 객체의 메서드가 호출된다.

### 불리언 분기

```jobflow
A.MethodName --> B.MethodName
B.MethodName.true --> C.HandleTrue
B.MethodName.false --> C.HandleFalse
```

### 단일 조건 분기 (false 무시)

```jobflow
A.MethodName --> B.MethodName
B.MethodName.true --> C.MethodName
```

### 생성자 / 초기화 호출

```jobflow
Parent.NewParent --> Child.NewChild
Parent.NewParent --> Grandchild.NewGrandchild
```
* 객체를 생성하거나 초기화하는 호출도 일반 메서드와 동일한 `-->` 로 표기한다.
* 생성자 이름은 언어/프로젝트 관습을 따른다 (`NewXxx`, `CreateXxx`, `Init`, `ctor` 등).
* 부모 객체가 자식 객체를 생성하면서 하위 객체를 트리 형태로 조립하는 과정을 표현한다.

## 다이어그램 예제

### 예제 1. 기능 실행 시나리오 (기존 패턴)

```jobflow
master: VideoPlayer
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
* master 인 `VideoPlayer` 의 `Open` / `Play` 가 시작점.
* `FileStream.OnXxx` 같은 이벤트는 master 가 구독한 상위 흐름.
* `VideoDecoder.GetFrameBitmap.result --> VideoRenderer.DrawFrame` 은 반환값을 다른 객체의 메서드로 전달하는 패턴.

### 예제 2. 프로세스 기동 & 전체 조립 시나리오

```jobflow
master: Orchestrator
Object: Orchestrator, Main, Config, Container, MarketOrchestrator, PremarketOrchestrator
Main.OnStart --> Config.Load
Config.Load.result --> Main.OnStart
Main.OnStart --> Container.BuildContainer
Container.BuildContainer.result --> Main.InitializeOrchestrator
Main.InitializeOrchestrator --> Orchestrator.NewOrchestrator
Orchestrator.NewOrchestrator --> MarketOrchestrator.NewOrchestrator
Orchestrator.NewOrchestrator --> PremarketOrchestrator.NewOrchestrator
Orchestrator.NewOrchestrator --> Orchestrator.Run
Orchestrator.Run --> MarketOrchestrator.Run
Orchestrator.Run --> PremarketOrchestrator.Run
```

**읽는 법**:
- `Main.OnStart` 는 프로세스 진입점 이벤트 — master 가 아니어도 시작점이 될 수 있다.
- `Config.Load.result --> Main.OnStart` 는 **반환값을 호출자 컨텍스트로 되돌려 흐름을 이어가는** 패턴 (동일 메서드 이어서).
- `Container.BuildContainer.result --> Main.InitializeOrchestrator` 는 **반환값을 같은 객체의 다른 메서드로 위임**하는 패턴. Main 은 `OnStart` 에서 설정·컨테이너 준비까지만 담당하고, 조립 요청은 `InitializeOrchestrator` 라는 별도 메서드가 받는다.
- `Main.InitializeOrchestrator --> Orchestrator.NewOrchestrator` 는 조립 메서드가 최상위 객체의 생성자를 호출하는 흐름이다. `NewOrchestrator` 안에서 `MarketOrchestrator.NewOrchestrator`, `PremarketOrchestrator.NewOrchestrator` 조립 트리가 전개된다.
- 중요한 전환: **`Orchestrator.NewOrchestrator --> Orchestrator.Run`** 은 "조립이 끝나면 Orchestrator 가 스스로 Run 루프로 진입한다" 는 **객체 내부 수명주기 전환**을 표현한다. Main 이 `Run` 을 직접 호출하지 않는다. 이 시점부터 제어권이 master(Orchestrator) 로 완전히 넘어간다.
- `Orchestrator.Run` 이 하위 Sub-Orchestrator 들을 errgroup 으로 동시 기동한다.

**객체 설명**:
| 객체 | 역할 |
|---|---|
| **Main** | 프로세스 진입점. `OnStart` 에서 설정 로드 → Container 빌드까지 지휘한 뒤, Container 결과를 `InitializeOrchestrator` 에 위임한다. `InitializeOrchestrator` 는 Orchestrator 의 생성 요청만 담당하고, 이후의 `Run` 진입은 Orchestrator 객체 스스로의 수명주기로 넘어간다. 이렇게 메서드를 분리함으로써 Main 은 "조립 요청" 과 "실행 지시" 를 모두 끌어안지 않고 조립 요청만 책임진다. Main 은 master 가 아니지만 조립 요청의 시작점이다. |
| **Config** | 환경 변수 / 설정 파일을 읽어 실행 파라미터(모듈 on/off, KIS 키, 경로, 임계값 등)를 구조화해 반환하는 **값 객체**. 상태를 보유하지 않는다. |
| **Container** | 싱글톤 공유 서비스(DB, Redis, Telegram, KIS 클라이언트, Watchlist, NameResolver 등)를 생성·주입하는 **의존성 컨테이너**. `BuildContainer` 가 한 번 호출되고 그 결과가 `Main.InitializeOrchestrator` 로 전달된다. |
| **Orchestrator** *(master)* | 전체 시스템의 최상위 조율자. 생성 시점에 하위 `MarketOrchestrator`, `PremarketOrchestrator` 를 소유로 만들고, 조립이 끝나면 **자기 자신의 수명주기로서 `Run(ctx)` 에 진입**한다. Main 이 별도로 Run 을 호출하지 않아도 Orchestrator 가 `New → Run` 흐름을 자기 안에서 이어받는다. `Run` 은 두 Sub-Orchestrator 를 `errgroup` 으로 동시에 기동하며 어느 한 쪽 에러 발생 시 ctx 전파로 다른 쪽도 종료된다. |
| **MarketOrchestrator** | 실시간 시장 데이터 수집(WebSocket 구독, 틱 저장, 신호 탐지, 알림)의 Sub-Orchestrator. 자신의 Worker 들(WS subscriber, tick storage, signal detector, health server 등)을 소유한다. |
| **PremarketOrchestrator** | 매 영업일 08:00~09:00 KST 프리마켓 감시 세션을 수행하는 Sub-Orchestrator. 일일 스케줄러와 DipMonitor 상태 기계 Worker 를 소유한다. |

**주의 1 — Main 의 두 메서드 분리가 뜻하는 것**:

이 예제에서 `Main` 이라는 한 객체 안에 `OnStart` 와 `InitializeOrchestrator` 두 메서드가 존재하고, 둘 사이에 **`.result --> Caller.OtherMethod` 라는 위임 표기가 나타난다**. 이는 다이어그램이 "한 객체 내부에서도 메서드 경계별로 책임을 분리" 한다는 것을 드러낼 수 있음을 보여준다. jobflow 는 "객체 단위 + 메서드 단위" 두 레이어의 책임 분리를 모두 표현할 수 있다.

**주의 2 — `NewXxx --> Xxx.Run` 패턴의 의미**:

`Orchestrator.NewOrchestrator --> Orchestrator.Run` 은 **같은 객체 안에서 "생성자 단계" → "실행 단계" 로 수명주기가 이어진다**는 것을 나타낸다. 코드 상으로 NewOrchestrator 가 Run 을 직접 호출하지 않더라도, 개념적으로 "조립이 끝나면 곧바로 Run 으로 간다" 는 필연적 연결을 다이어그램에 명시할 때 사용한다. 이 표기는 **master 객체가 외부(Main) 의 지시 없이 스스로의 수명주기를 이어간다**는 점을 드러내는 역할을 하며, Main 은 `NewOrchestrator` 호출까지만 하고 그 뒤의 `Run` 진입은 주관하지 않는다는 뜻이다.

잘못된 표현의 예:
```jobflow
Container.BuildContainer.result --> Main.OnStart
Main.OnStart --> Orchestrator.NewOrchestrator
Main.OnStart --> Orchestrator.Run
```
이렇게 쓰면 "Main.OnStart 가 Container 결과를 직접 받아 Orchestrator 를 생성하고 Run 도 호출" 하는 구조가 되어, 조립·실행 책임이 `OnStart` 안에 섞여 버린다. 올바르게는 `Container.BuildContainer.result --> Main.InitializeOrchestrator` 로 위임하고, 조립 이후는 `Orchestrator.NewOrchestrator --> Orchestrator.Run` 으로 master 내부 수명주기에 맡겨야 한다.

### 코드 구현 예시 (C#)

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
* 이때 **세분화 다이어그램의 master는 “복잡 모듈 객체”**가 된다.

### 예시

#### 시스템 전체 관점의 Job Flow Diagram

```jobflow
master: VideoPlayer
Object: VideoPlayer, FileStream, VideoDecoder, AudioDecoder
... 시스템 전체 관점의 예
```

#### 복잡 모듈 중심으로 재귀적 세분화

```jobflow
master: VideoDecoder
Object: VideoDecoder, Worker, Decoder, Renderer
... VideoDecoder 관점의 예
```
