# 구현 코드로 읽는 Job Flow

모듈뷰와 상세뷰는 같은 `jobflow` 문법과 코드 이름을 쓴다. 모듈뷰에서 재생기의 `Open`과 `Play`를 따라가면 어느 객체가 읽기·해석·표시를 맡는지 보인다. 그중 `VideoDecoder.Decode` 하나를 펼치면 픽셀을 변환한 값이 어느 큐에 들어가는지 보인다. 확대할 때 바뀌는 것은 관찰 범위와 그 범위의 조율자다.

각 JavaScript 블록은 외부 패키지 없이 독립적으로 실행할 수 있다. 그림에서 `orchestrator:`는 호출과 이벤트를 연결하는 객체다. 요청 콜백에서 값을 돌려받은 객체는 그 값으로 자신의 처리를 이어간다. [Job Flow 표기 기준](../../../guides/job-flow-diagram-guide.md#핵심-원칙--내부-협력은-선언된-orchestrator의-관점이다)

## 1. 영상 재생기에서 데이터와 화면 요청 연결하기

**시작점** `VideoPlayer.Open`이 재생할 데이터를 준비하고 `Play`가 읽기를 시작한다. 영상 데이터가 들어오는 시점과 화면이 프레임을 요청하는 시점은 독립적이다.

### 모듈뷰 · 재생기의 협력

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

- **VideoPlayer · Open → VideoDecoder · Initialize** — `Open`에서 재생기가 영상 디코더를 초기화해 이전 프레임을 비운다.
- **VideoPlayer · Open → AudioDecoder · Initialize** — 같은 `Open`에서 음성 디코더의 이전 샘플도 비운다.
- **VideoPlayer · Open → FileStream · Open** — 재생기가 스트림에 이번에 읽을 패킷을 넘긴다.
- **VideoPlayer · Play → FileStream · StartReading** — `Play`를 호출하면 재생기가 스트림의 읽기를 시작한다.
- **FileStream · VideoData → VideoDecoder · Decode** — 스트림에서 영상 데이터가 들어오면 재생기가 연결한 콜백이 영상 디코더에 픽셀을 넘긴다.
- **FileStream · AudioData → AudioDecoder · Decode** — 음성 데이터가 들어오면 별도의 콜백이 음성 디코더에 샘플을 넘긴다.
- **VideoRenderer · FrameRequested → VideoDecoder · GetFrameBitmap** — 화면이 프레임을 요청하면 재생기의 콜백이 영상 디코더에서 다음 비트맵을 꺼낸다.
- **VideoDecoder · GetFrameBitmap [bitmap] → VideoRenderer · DrawFrame** — 돌아온 값에 `bitmap`이 있으면 재생기가 그 값을 렌더러에 전달한다. 큐가 비었으면 현재 화면을 유지한다.

### 대응 코드

한 줄짜리 회색조 영상과 음성 샘플을 메모리에서 읽는다. `Open`에서 콜백을 연결한 뒤, `StartReading`과 `RequestFrame`이 호출되는 시점에 각 콜백이 실행된다.

```javascript
const GrayPixels = {
  ToBitmap(gray) {
    return Uint8Array.from(gray.flatMap(level => [level, level, level, 255]));
  }
};

const FrameQueue = [];
const VideoDecoder = {
  Initialize() { FrameQueue.length = 0; },
  Decode(gray) {
    const bitmap = GrayPixels.ToBitmap(gray);
    FrameQueue.push(bitmap);
  },
  GetFrameBitmap() { return { bitmap: FrameQueue.shift() }; }
};

const AudioDecoder = {
  Initialize() { this.samples = []; },
  Decode(samples) { this.samples.push(...samples); }
};

const FileStream = {
  Open(packets) { this.packets = packets; },
  StartReading() {
    for (const [kind, data] of this.packets) {
      if (kind === "video") this.OnVideoData(data);
      if (kind === "audio") this.OnAudioData(data);
    }
  }
};

const VideoRenderer = {
  RequestFrame() { this.OnFrameRequested(); },
  DrawFrame(bitmap) { this.lastFrame = bitmap; }
};

const VideoPlayer = {
  Open(packets) {
    VideoDecoder.Initialize();
    AudioDecoder.Initialize();
    FileStream.OnVideoData = gray => VideoDecoder.Decode(gray);
    FileStream.OnAudioData = samples => AudioDecoder.Decode(samples);
    VideoRenderer.OnFrameRequested = () => {
      const { bitmap } = VideoDecoder.GetFrameBitmap();
      if (bitmap !== undefined) VideoRenderer.DrawFrame(bitmap);
    };
    FileStream.Open(packets);
  },
  Play() { FileStream.StartReading(); }
};

VideoPlayer.Open([["video", [32, 80]], ["audio", [4, 6]]]);
VideoPlayer.Play();
VideoRenderer.RequestFrame();
console.log([...VideoRenderer.lastFrame]); // [32, 32, 32, 255, 80, 80, 80, 255]
```

### 상세뷰 · 한 영상 패킷을 프레임 큐에 넣기

상위 그림의 `FileStream.OnVideoData --> VideoDecoder.Decode`에서 도착한 `Decode` 메서드를 확대한다. 여기서는 `VideoDecoder`가 변환과 저장을 연결한다.

```jobflow
orchestrator: VideoDecoder
Object: VideoDecoder, GrayPixels, FrameQueue
VideoDecoder.Decode --> GrayPixels.ToBitmap
GrayPixels.ToBitmap.result --> FrameQueue.push
```

- **VideoDecoder · Decode → GrayPixels · ToBitmap** — 영상 디코더가 `ToBitmap`에 회색조 값을 넘긴다. 회색조 한 값은 밝기가 같은 R·G·B와 불투명한 알파 값으로 바뀐다.
- **GrayPixels · ToBitmap [result] → FrameQueue · push** — 영상 디코더가 반환된 픽셀 배열을 `FrameQueue.push`에 그대로 넘긴다. 화면 요청이 들어오면 앞서 본 `GetFrameBitmap`이 큐의 첫 배열을 꺼낸다.

## 2. 같은 주문으로 재고를 두 번 예약하면 어떻게 되는가

[주문 접수와 재고 예약 서비스뷰](system.md#s05-1-주문-접수와-재고-예약)에서 재고 서비스가 요청을 받고 예약 가능 여부를 판단하는 부분을 확대한다. 한 상품을 주문당 한 개씩 예약하며, 남은 수량과 주문별 결과를 한 프로세스의 메모리에 보관한다.

### 모듈뷰 · 주문별 예약 결과와 재고 차감

```jobflow
orchestrator: ReserveOne
Object: ReserveOne, Reservations, Stock
ReserveOne.run --> Reservations.has
Reservations.has.false --> Stock.takeOne
Reservations.has.true --> Reservations.read
Stock.takeOne.true --> Reservations.record
Stock.takeOne.false --> Reservations.record
```

- **ReserveOne · run → Reservations · has** — 재고 예약 요청을 받으면 조율자가 주문번호로 이전 처리 기록이 있는지 확인한다.
- **Reservations · has [false] → Stock · takeOne** — 처음 접수한 주문이면 조율자가 재고 담당 객체에 한 개를 차감하도록 요청한다.
- **Reservations · has [true] → Reservations · read** — 기록이 있으면 조율자가 저장된 결과를 읽어 그대로 돌려준다.
- **Stock · takeOne [true] → Reservations · record** — 차감에 성공하면 조율자가 주문번호에 `reserved`를 기록하고 그 값을 돌려준다.
- **Stock · takeOne [false] → Reservations · record** — 남은 수량이 없으면 조율자가 같은 주문번호에 `soldOut`을 기록하고 그 값을 돌려준다.

### 대응 코드

```javascript
class Stock {
  constructor(available) {
    this.available = available;
  }

  takeOne() {
    if (this.available < 1) return false;
    this.available -= 1;
    return true;
  }
}

class Reservations {
  #results = new Map();

  has(orderId) { return this.#results.has(orderId); }
  read(orderId) { return this.#results.get(orderId); }

  record(orderId, outcome) {
    this.#results.set(orderId, outcome);
    return outcome;
  }
}

class ReserveOne {
  constructor(available) {
    this.stock = new Stock(available);
    this.reservations = new Reservations();
  }

  run(orderId) {
    if (this.reservations.has(orderId)) return this.reservations.read(orderId);
    const taken = this.stock.takeOne();
    return this.reservations.record(orderId, taken ? "reserved" : "soldOut");
  }
}

const reserve = new ReserveOne(2);
const results = ["A", "A", "B", "C", "C"].map(orderId => reserve.run(orderId));
console.log(results); // ["reserved", "reserved", "reserved", "soldOut", "soldOut"]
```

두 번째 A는 저장된 결과를 돌려받으므로 남은 한 개를 B가 예약할 수 있다. C의 첫 시도에서 기록된 품절 결과도 재시도 때 그대로 돌아온다.

## 3. 상품 라벨을 만들다가 표시 이름이 필요해지면 누가 응답하는가

`LabelPrinter.Print("material", "면")`이 라벨 한 줄의 생성을 시작한다. 표시 이름을 찾는 일은 `FieldNames`, 이름과 값을 한 줄로 조합하는 일은 `LabelWriter`가 맡는다.

### 상세뷰 · 표시 이름을 요청하는 동기 콜백

```jobflow
orchestrator: LabelPrinter
Object: LabelPrinter, LabelWriter, FieldNames
LabelPrinter.Print --> LabelWriter.Build
LabelWriter.OnNeedCaption --> FieldNames.Lookup
FieldNames.Lookup --> LabelWriter.OnNeedCaption.result
LabelWriter.OnNeedCaption.result --> LabelWriter.Format
```

- **LabelPrinter · Print → LabelWriter · Build** — `Print("material", "면")`이 호출되면 조율자가 두 인수를 `LabelWriter.Build`에 전달한다.
- **LabelWriter · NeedCaption → FieldNames · Lookup** — `Build`가 `OnNeedCaption("material")`을 호출하면 조율자가 연결한 콜백이 `FieldNames.Lookup("material")`을 실행한다.
- **LabelWriter · NeedCaption [result] → LabelWriter · Format** — 콜백에서 `"소재"`를 돌려받은 `LabelWriter`가 직접 `Format("소재", "면")`을 호출한다. 완성된 `"소재 · 면"`이 `Build`와 `Print`의 반환값이 된다.

### 대응 코드

```javascript
const captions = new Map([["material", "소재"], ["color", "색상"]]);
const FieldNames = {
  Lookup(key) { return captions.get(key) ?? key; }
};

const LabelWriter = {
  OnNeedCaption: null,

  Build(key, value) {
    const caption = this.OnNeedCaption(key);
    return this.Format(caption, value);
  },

  Format(caption, value) { return `${caption} · ${value}`; }
};

const LabelPrinter = {
  Connect() {
    LabelWriter.OnNeedCaption = key => FieldNames.Lookup(key);
  },

  Print(key, value) { return LabelWriter.Build(key, value); }
};

LabelPrinter.Connect();
console.log(LabelPrinter.Print("material", "면")); // 소재 · 면
console.log(LabelPrinter.Print("size", "M"));     // size · M
```

`Connect`는 응답자 한 곳을 미리 연결한다. 표시 이름이 등록되지 않은 키는 원래 키를 돌려주므로 같은 `Format` 호출로 라벨을 완성한다.
