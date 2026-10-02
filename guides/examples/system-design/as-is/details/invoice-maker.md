# invoice-maker (:7102) — AS-IS 상세

> **가상의 예시 시스템** — 경로·줄 번호·수치는 형식 예시다. 양식은 [시스템 설계 문서 양식 §5](../../../../system-design-document-guide.md#5-상세-문서-골격)를 따르고, 둘이 다르면 양식을 따른다.
> **대상**: `invoice-maker/**`(TypeScript 소스 13파일·760줄) · **기준**: 커밋 `5e6f7a8`(가상)·2026.03.02, 작업 트리 clean
> **근거 색인**: [`../../_evidence-brief.md`](../../_evidence-brief.md) · **상위**: [`../system-design-as-is.md`](../system-design-as-is.md) · **짝**: [`billing-clock.md`](billing-clock.md)(맡김·생존 확인·회신의 상대)
> **표기**: 내부 흐름은 [`jobflow`](../../../../job-flow-diagram-guide.md), 생성 레코드 단계는 [`state`](../../../../state-diagram-guide.md)(§4.1)
> **범위 한정**: `InvoiceRenderer`의 금액 반올림·세율 규칙은 열지 않았다 — 입력을 문서로 바꾸는 순수 변환이라 경계의 협력과 실패 경계에 영향이 없다(§9)
> **관찰 방법**: 소스 역추출 — 프로세스를 띄우지 않았다. 베어 경로는 `invoice-maker/src/` 기준이다.

## 1. 책임 / 비책임

- **책임**: 시계가 맡긴 실행 **하나**를 사람 손 없이 끝낸다 — 서식 읽기 → 주기의 사용 기간 계산 → 고객별 사용량 조회 → 금액 계산·렌더 → invoice-archive 보관(실패하면 `spare/` 사본) → 회신. 생성 레코드를 파일로 남기고, 재기동 뒤 끊긴 레코드를 정리한다.
- **비책임**: 발행일 판정·재시도·마감(billing-clock), 사용량 조건 검증과 단위 환산(usage-api), 청구서 보존과 `dedupKey` 덮어쓰기(invoice-archive), 서식 편집(admin-console), 메일 발송(billing-clock).
- **아무도 하지 않는 것**: 생성 도중 멈추기(중지 라우트가 없다 — `B-01`의 이쪽 면), 0원으로 채운 고객을 바깥에 알리기(`C-03`), `spare/` 사본을 다시 보관하거나 지우기.

## 2. 공개 계약

라우트 3개 — 생성 2 + 헬스 1(`routes.ts:10-16`). 인증 처리는 없고 루프백 바인딩이 경계다.

| 메서드·경로 | 입력 | 출력 | 오류 | 구현 |
|---|---|---|---|---|
| `POST /api/makes` | `{runId, planId, cycle, formId, rates, customers:[{accountId, name}]}` | 202 `{runId, alreadyRunning}` | 422 `{field}` | `routes.ts:18-34` → `checks.ts:6-40` |
| `GET /api/makes/:runId` | path | 200 `{runId, phase, invoiceId?, note?, startedAt, endedAt?}` | 404, 422 `runId` 꼴 | `routes.ts:36-48` |
| `GET /ping` | — | `{ok:true}` | — | `routes.ts:10` |

- `runId`는 `/^r[0-9a-z]{8,24}$/`만 받는다 — 파일 이름이 되므로 다른 꼴은 422. `customers`는 1~200명이다.
- **없는 것**: 중지 라우트(`B-01`), 회신을 다시 보내는 라우트(`C-02` — 시계가 생존 확인으로 회수할 때까지 기다린다).

## 3. 내부 Job Flow — 드릴다운

**결론**: 조율은 `InvoiceMaker` 클래스가 한다. 상위의 `Maker.work`는 이 클래스의 `work` 메서드이고, `receive`가 레코드를 쓴 뒤 끝나기를 기다리지 않고 부른다. 바깥 호출은 `UsageClient`(usage-api), `ArchiveClient`(invoice-archive), `ReplyClient`(billing-clock)가 맡는다. FormDir은 `FormLoader`가 파일 시스템으로 읽는다.

상위 [§5](../system-design-as-is.md#5-흐름--경계끼리-어떻게-소통하나)의 노드가 아래 그림의 시작점이다. 입력·출력·실패 의미가 같다.

**드릴다운 지도**

| 상위 §5 노드 | L1 그림 | L2 이하 |
|---|---|---|
| `Maker.make`·`Maker.peek`(§5.1·§5.3·§5.4·§5.5) | [`JF-1`](#jf-1-라우트-진입--makeroutes) 라우트 진입 | `make`의 접수 안쪽(`receive`)은 [`JF-2A`](#jf-2a-준비조회)의 앞 네 줄 |
| `Maker.work`(§5.1·§5.4·§5.5) | [`JF-2`](#jf-2-생성-조율--invoicemakerwork) — [`JF-2A`](#jf-2a-준비조회) 준비·조회, [`JF-2B`](#jf-2b-계산보관회신) 계산·보관·회신 | [`JF-2.1`](#jf-21-고객별-사용량-조회--usageclientfetchall) 고객별 사용량 조회 |
| (§5 노드 없음 — 기동) | [`JF-3`](#jf-3-부팅-정리--invoicemakerfailinterrupted) 부팅 정리 | — |

상위 바깥 노드 ↔ 이 경계의 클라이언트: `FormDir.read` = `FormLoader.load`, `UsageApi.fetch` = `UsageClient.fetchAll`(고객마다 `usageHttp.postUsage` 1회 — `JF-2.1`), `Archive.file` = `ArchiveClient.file`, `Clock.acceptReply` = `ReplyClient.send`.

**표기** 그림의 노드 이름은 코드에 있는 그대로다 — 클래스는 `Class.method`이고, 클래스가 없는 모듈은 아래 구획 표의 객체 이름(파일 이름을 낙타 표기로 바꾼 것)으로 그린다. 줄 번호는 기준 커밋 `5e6f7a8`이다. 단계마다의 출력·실패 처리·시간 한도는 [§3.1](#31-생성-단계와-시간-한도) 표에 적었고, `JF-2`의 그림에는 단계마다 어느 객체를 부르는지만 그렸다. 근거 표의 `단계 #` 열이 그 표의 `#`이다. 이 절의 그림 5장은 렌더러로 그려 PNG로 확인했다([브리프 §5](../../_evidence-brief.md#5-검증-기록)).

| 객체 | 코드 범위 | 담는 심볼 |
|---|---|---|
| `checks` | `checks.ts:6-40` | `makeBody` — `POST /api/makes` 본문 검사 |
| `usageHttp` | `usage-http.ts:6-28` | `postUsage` — usage-api 1회 호출 |
| `lines` | `lines.ts:8-40` | `toLine`(사용량 × 단가 → 항목 금액)·`zeroLine`(금액 0 항목) |
| `main` | `main.ts:12-30` | `start` — 기동 정리가 끝난 뒤 `listen` |

### JF-1 라우트 진입 — MakeRoutes

```jobflow
orchestrator: MakeRoutes
Object: MakeRoutes, checks, InvoiceMaker, MakeRecords

MakeRoutes.make --> checks.makeBody
checks.makeBody.invalid
checks.makeBody.result --> InvoiceMaker.receive
InvoiceMaker.receive.result --> MakeRoutes.make.result
MakeRoutes.peek --> MakeRecords.read
MakeRecords.read.missing
MakeRecords.read.result --> MakeRoutes.peek.result
```

| 노드 | 코드 | 비고 |
|---|---|---|
| `MakeRoutes.make` → `checks.makeBody` | `routes.ts:18-34` → `checks.ts:6-40` | 상위 `Maker.make`. `.invalid` = 422로 끝(협력 없음) |
| `InvoiceMaker.receive` → `make.result` | `invoice-maker.ts:28-50` | 202 `{runId, alreadyRunning}`. 이 응답이 나갈 때 생성은 막 시작했거나(새 실행) 이미 돌고 있다(`alreadyRunning:true`). `receive` 안쪽은 [`JF-2A`](#jf-2a-준비조회) 앞부분 |
| `MakeRoutes.peek` → `MakeRecords.read` | `routes.ts:36-48` → `make-records.ts:22` | 상위 `Maker.peek`. `MakeRoutes`가 레코드 파일을 바로 읽어 200으로 낸다(없으면 `.missing` = 404). `InvoiceMaker`는 이 경로에 없다 |

- 두 라우트 모두 파일 레코드를 읽으므로 재기동 뒤에도 `peek`이 답한다 — 재기동으로 끊긴 실행은 `failed`로 보인다(`JF-3`).
- `peek` 응답에는 `phase`와 `note`만 있고, 0원으로 채운 고객이 있었는지는 없다 — 레코드에 그런 필드가 없다(`C-03`).

### JF-2 생성 조율 — InvoiceMaker.work

`work`는 메서드 하나(`invoice-maker.ts:56-100`)다. 한 그림에 담으면 Object가 9개로 기준(대략 8개)을 넘고, 보관 실패 분기의 칸이 오른쪽 끝에 몰려 화살표가 겹친다. 그래서 두 묶음으로 나눴다. `JF-2A`는 `receive`가 레코드를 확인하고 `work`를 시작하는 데서 출발해 사용량 조회 호출까지이고, `JF-2B`는 그 조회 결과부터 회신까지다. `receive`(`:28-50`)는 `work`의 일부가 아니지만, 새 `work`를 시작할지 여기서 정하므로 `JF-2A`의 앞 네 줄로 함께 그렸다. 두 그림은 같은 1회 호출 `UsageClient.fetchAll`에서 이어진다. 바깥 `catch`(`:94-100`)는 두 묶음 어디서 던진 예외든 레코드 `failed` → 회신 `outcome:'failed'`로 끝낸다.

#### JF-2A 준비·조회

```jobflow
orchestrator: InvoiceMaker
Object: InvoiceMaker, MakeRecords, FormLoader, CycleWindow, UsageClient

InvoiceMaker.receive --> MakeRecords.read
MakeRecords.read.busy
MakeRecords.read.free --> MakeRecords.write
MakeRecords.write --> InvoiceMaker.work
InvoiceMaker.work --> FormLoader.load
InvoiceMaker.work --> CycleWindow.of
CycleWindow.of.result --> UsageClient.fetchAll
```

| 노드 | 코드 | 단계 # | 비고 |
|---|---|---|---|
| `InvoiceMaker.receive` → `MakeRecords.read` | `invoice-maker.ts:28-36` | 0 | `.busy` = 같은 runId가 `working`·`issued` → 새 실행을 만들지 않고 `alreadyRunning:true`로 바로 답한다(레코드 단계를 보고 판단하는 멱등) |
| `.free` → `MakeRecords.write` → `InvoiceMaker.work` | `invoice-maker.ts:38-46`, `make-records.ts:30-44` | 0 | 레코드가 없거나 `failed`일 때다. 레코드를 `working`으로 쓰고, `work`를 부른 뒤 그 끝을 기다리지 않고 202를 돌려준다 — 상위 `Maker.work`가 여기서 시작된다. 한 번에 도는 `work` 수를 막는 값은 없다 |
| `FormLoader.load` | `invoice-maker.ts:60`, `form-loader.ts:8-30` | 1 | 상위 `FormDir.read` — `<MAKER_FORM_DIR>/<formId>.md`. 파일이 없거나 자리 표시 `{{lines}}`가 없으면 throw |
| `CycleWindow.of` | `invoice-maker.ts:62`, `cycle-window.ts:4-18` | 2 | `2026-02` → 그달 1일 0시부터 다음 달 1일 0시 전까지. 꼴이 틀리면 throw |
| `UsageClient.fetchAll` | `invoice-maker.ts:64`, `usage-client.ts:14-40` | 3 | 고객 목록과 기간을 넘긴다 → [`JF-2.1`](#jf-21-고객별-사용량-조회--usageclientfetchall) |

- **트리거** `POST /api/makes`(`JF-1`). **완료 사실**(이 구간) 고객마다 항목 하나 — 실패한 고객도 0원 항목으로 들어 있다.
- 서식이 `fetchAll`의 입력은 아니다 — `FormLoader.load`의 결과는 `JF-2B`의 `InvoiceRenderer.render`가 쓴다(같은 `work` 안의 지역 변수).
- 이 구간의 throw(서식·기간)는 바깥 `catch`로 간다(§3.1 E). 시계가 마감 정리 뒤 같은 runId를 다시 맡기면 `.busy`로 끝나 새 실행이 생기지 않는다(`C-01`).

#### JF-2B 계산·보관·회신

```jobflow
orchestrator: InvoiceMaker
Object: InvoiceMaker, UsageClient, InvoiceRenderer, ArchiveClient, SpareCopy, MakeRecords, ReplyClient

InvoiceMaker.work --> UsageClient.fetchAll
UsageClient.fetchAll.result --> InvoiceRenderer.render
InvoiceRenderer.render.result --> ArchiveClient.file
ArchiveClient.file.rejected --> SpareCopy.keep
SpareCopy.keep --> MakeRecords.finish
ArchiveClient.file.result --> MakeRecords.finish
MakeRecords.finish --> ReplyClient.send
```

| 노드 | 코드 | 단계 # | 비고 |
|---|---|---|---|
| `InvoiceMaker.work` → `UsageClient.fetchAll` | `invoice-maker.ts:64` | 3 | `JF-2A`의 끝과 같은 1회 호출 — 두 그림을 잇는 기준점 |
| `InvoiceRenderer.render` | `invoice-maker.ts:68`, `invoice-renderer.ts:10-96` | 4 | 서식 + 항목 + 요금표 → 금액 계산(항목 합, 부가세 10%) → 청구서 HTML. `MAKER_RENDER_LIMIT_MS`(45s)를 넘기면 throw |
| `ArchiveClient.file` | `invoice-maker.ts:72-80`, `archive-client.ts:12-36` | 5 | 상위 `Archive.file` — `dedupKey = <planId>/<cycle>`, 15s |
| `.rejected` → `SpareCopy.keep` → `MakeRecords.finish` | `invoice-maker.ts:82-86`, `spare-copy.ts:8-20` | 5·6 | **보관 실패 분기** — 문서를 `spare/<runId>/invoice.html`에 남기고 `failed`(`note='보관 실패'`). 시계의 재시도 판정으로 이어진다 |
| `.result` → `MakeRecords.finish` | `invoice-maker.ts:88`, `make-records.ts:48-60` | 6 | `issued` + `invoiceId` |
| `ReplyClient.send` | `invoice-maker.ts:90`, `reply-client.ts:6-24` | 7 | 상위 `Clock.acceptReply` — 4필드, 5s, **재시도 없음**. 실패는 로그 1줄(`C-02`) |

- **완료 사실** 레코드 `issued` 또는 `failed` + 회신 1회. `finish`로 들어오는 화살표 둘은 보관 성공과 실패가 같은 메서드로 모이는 합류이고, 보관 결과는 하나뿐이라 `finish`는 한 번 실행된다. 렌더러는 `finish` 칸을 둘 그리고 회신 화살표를 아래 칸에서 냈지만, 회신은 성공·실패 어느 쪽에서도 나간다.
- 회신 본문에는 0원으로 채운 고객이 없다 — `fetchAll`이 실패를 0원 항목으로 바꿔 넘기기 때문이다(`C-03`).
- `spare/` 사본은 다음 시도가 보관에 성공해도 지우지 않는다 — 운영자가 손으로 정리한다(§4).

### JF-2.1 고객별 사용량 조회 — UsageClient.fetchAll

```jobflow
orchestrator: UsageClient
Object: UsageClient, usageHttp, lines

UsageClient.fetchAll --> usageHttp.postUsage
usageHttp.postUsage.fulfilled --> lines.toLine
usageHttp.postUsage.rejected --> lines.zeroLine
```

| 노드 | 코드 | 비고 |
|---|---|---|
| `UsageClient.fetchAll` → `usageHttp.postUsage` | `usage-client.ts:14-40`, `usage-http.ts:6-28` | 고객을 3명씩 묶어 묶음마다 `Promise.allSettled`로 기다린다(동시 3). 전체에 `AbortSignal.timeout(MAKER_USAGE_BUDGET_MS)`(90s) 하나를 건다. 상위 `UsageApi.fetch` — 고객 한 명씩 `{accountIds:[accountId], from, to}` |
| `.fulfilled` → `lines.toLine` | `lines.ts:8-30` ← `usage-client.ts:30` | 계량 항목별 사용량 × 요금표 단가 → 항목 금액 |
| `.rejected` → `lines.zeroLine` | `lines.ts:34-40` ← `usage-client.ts:33-36` | 4xx·5xx·연결 실패·예산 초과로 끊긴 요청 → **금액 0인 항목**. 사용량이 정말 0인 고객과 모양이 같다(`C-03`) |

- **트리거** `JF-2A`의 `fetchAll` 1회. **완료 사실** 고객 수만큼의 항목 배열. `fetchAll`은 **거절되지 않는다** — 그래서 조회 실패가 실행을 `failed`로 만들지 않는다.
- `postUsage` 화살표 하나가 고객 수만큼의 요청이다. usage-api는 `accountIds` 50개까지 한 번에 받지만 생성기는 고객 한 명씩 보낸다 — 한 고객의 실패가 다른 고객 항목을 막지 않게 하려는 코드다(`usage-client.ts:12` 주석).
- 예산 90s가 다 되면 아직 끝나지 않은 요청과 시작하지 않은 묶음이 모두 `rejected`로 끝나 0원이 된다 — 조회가 느린 날에는 `C-01`(마감과 같은 한도 합)과 `C-03`이 함께 나타난다. 실패 사유는 `console.warn` 1줄(`usage-client.ts:35`)에만 남는다.

### JF-3 부팅 정리 — InvoiceMaker.failInterrupted

```jobflow
orchestrator: InvoiceMaker
Object: main, InvoiceMaker, MakeRecords

main.start --> InvoiceMaker.failInterrupted
InvoiceMaker.failInterrupted --> MakeRecords.listWorking
MakeRecords.listWorking.result --> MakeRecords.finish
InvoiceMaker.failInterrupted --> MakeRecords.prune
```

| 노드 | 코드 | 비고 |
|---|---|---|
| `main.start` → `InvoiceMaker.failInterrupted` | `main.ts:12-30` → `invoice-maker.ts:104-120` | `start`는 `await failInterrupted()`가 끝난 뒤에 `listen`한다(`main.ts:26`) |
| `MakeRecords.listWorking` → `.finish` | `make-records.ts:64`, `make-records.ts:48-60` | 남은 `working` 레코드를 모두 `failed`(`note='재기동으로 중단'`)로 바꾼다. 회신은 보내지 않는다 |
| `MakeRecords.prune` | `make-records.ts:70-84` | 끝난 지 14일(`MAKER_KEEP_DAYS`)이 지난 레코드 삭제. 기동 때만 돈다 — 이 경계에는 주기 타이머가 없다 |

- **트리거** 프로세스가 뜰 때 한 번. **완료 사실** HTTP 수신 시작(`listen`) — 정리가 끝나기 전에는 `make`·`peek`을 받지 않는다.
- 끊긴 실행은 회신을 보내지 않으므로, 종결은 시계의 틱 ②가 그 레코드를 `failed`로 읽을 때다 — 맡긴 지 45초가 지났다면 다음 틱(20초 안)이다.

### 3.1 생성 단계와 시간 한도

단계 0은 HTTP 요청 안에서 끝나고, 1~7은 202 응답이 나간 뒤 `work` 안에서 차례로 돈다.

| # | 단계 — 코드 | 줄 | 내는 것 | 실패하면 | 시간 한도 |
|---|---|---|---|---|---|
| 0 | `receive(job)` | `invoice-maker.ts:28-50` | `{runId, alreadyRunning}` + 레코드 `working` | 같은 runId가 `working`·`issued` → `alreadyRunning:true`를 답하고 끝낸다 | — |
| 1 | `FormLoader.load(formId)` | `:60` | 서식(본문 + 머리 설정) | 파일 없음·자리 표시 누락 → E | — |
| 2 | `CycleWindow.of(cycle)` | `:62` | `{from, to}` | 꼴 오류 → E | — |
| 3 | `UsageClient.fetchAll(customers, span)` | `:64` | 고객별 항목 | **거절하지 않는다** — 실패 고객은 0원 항목(`C-03`) | 90s `MAKER_USAGE_BUDGET_MS` |
| 4 | `InvoiceRenderer.render(form, lines, rates)` | `:68` | 청구서 HTML + 합계 | 한도 초과·예외 → E | 45s `MAKER_RENDER_LIMIT_MS` |
| 5 | `ArchiveClient.file(doc, meta)` | `:72-80` | `{invoiceId, replaced}` | 실패 → `SpareCopy.keep` 뒤 6에서 `failed` | 15s `MAKER_ARCHIVE_TIMEOUT_MS` |
| 6 | `MakeRecords.finish(phase)` | `:82-88` | 레코드 `issued`·`failed` | — | — |
| 7 | `ReplyClient.send(reply)` | `:90` | 성공 여부 | 실패는 로그만 — **재시도 없음**(`C-02`) | 5s `MAKER_REPLY_TIMEOUT_MS` |
| E | 바깥 `catch` | `:94-100` | `finish('failed', note)` + 같은 꼴의 회신 `outcome:'failed'` | — | — |

3·4·5의 한도 합은 **150s**로 시계의 마감 기본 **150s**와 같다(`C-01`). 0·1·2·6·7에 드는 시간까지 더하면 정상 실행도 마감을 넘을 수 있다. 진행 중인 문서는 메모리에만 있고, 디스크에 남는 것은 레코드와 보관 실패 때의 `spare/` 사본뿐이다.

## 4. 소유 상태·데이터

| 데이터 | 경로 | 쓰기 주체 | 생명주기·보존 | 원자성 |
|---|---|---|---|---|
| 생성 레코드 | `<MAKER_DATA_DIR>/makes/<runId>.json` | `receive`의 `write`, `work`의 `finish`, `failInterrupted` | 끝난 지 14일이 지나면 기동 때 삭제, `working`은 남긴다 | 임시 파일에 쓴 뒤 rename, 파일 잠금 없음(프로세스 하나) |
| 보관 실패 사본 | `<MAKER_DATA_DIR>/spare/<runId>/invoice.html` | `SpareCopy.keep` | **지우는 코드가 없다** — 다음 시도가 보관에 성공해도 남는다 | 임시 파일에 쓴 뒤 rename |

레코드 필드: `runId`, `planId`, `cycle`, `phase`, `invoiceId`, `note`, `startedAt`, `endedAt`. **0원으로 채운 고객 수를 세는 필드가 없다**(`C-03`). DB와 큐는 쓰지 않는다.

### 4.1 생성 레코드 단계 기계

레코드의 `phase`를 쓰는 것은 이 프로세스뿐이다(파일 하나에 레코드 하나).

```state
<s> --> (working)
(working) --> (issued) : 보관 성공
(working) --> (failed) : 서식·기간·렌더 예외 또는 보관 실패
(working) --> (failed) : 재기동 — failInterrupted
(failed) --> (working) : 같은 runId 다시 맡김
(issued) --> <e>
(failed) --> <e>
```

**기호**: `<s>` 시작점, `(…)` 단계, `<e>` 레코드의 수명이 끝나는 곳, `A --> B : 글` A에서 B로 가는 전이와 그 조건.

- **불변조건**: `issued`는 되돌아가지 않는다. 같은 runId가 다시 맡겨져도 레코드가 `working`·`issued`면 `receive`가 `alreadyRunning:true`를 답하고 끝내기 때문이다. 다시 `working`이 될 수 있는 것은 `failed` 레코드뿐이다.
- **중지 전이가 없다** — 시계의 `dropped(stopped)`는 이 기계에 닿지 않는다(`B-01`). 두 기계의 비대칭은 [상위 §5.7](../system-design-as-is.md#57-실행-상태--두-상태-기계)에 있다.

## 5. 의존 — 나가는 방향

| 상대 | 쓰는 계약 | 배선·설정 | 타임아웃 | 결합 |
|---|---|---|---|---|
| FormDir | 파일 읽기 `<formId>.md` | `MAKER_FORM_DIR` | — | 파일 이름 규칙과 자리 표시 `{{lines}}`·`{{total}}`을 admin-console과 함께 안다 |
| usage-api | `POST /api/usage {accountIds, from, to}` | `MAKER_USAGE_URL`(기본 `http://127.0.0.1:7103`) | 전체 예산 90s, 동시 3 | 응답의 계량 항목 이름이 요금표 키와 같아야 한다 |
| invoice-archive | `POST /api/invoices` | `MAKER_ARCHIVE_URL`(기본 `:7104`) | 15s | `dedupKey` 꼴, `{invoiceId, replaced}` |
| billing-clock | `POST /api/replies` | `MAKER_REPLY_URL`(기본 `http://127.0.0.1:7101/api/replies`) | 5s, 재시도 없음 | 회신 4필드, `outcome` 2값 |

## 6. 실패 경계

| 항목 | 기본값 | 설정 키 | 위치 |
|---|---|---|---|
| 사용량 조회 예산·동시 수 | 90s, 3 | `MAKER_USAGE_BUDGET_MS`, 없음(상수) | `config.ts:9`, `usage-client.ts:8` |
| 렌더 | 45s | `MAKER_RENDER_LIMIT_MS` | `config.ts:10` |
| 보관 | 15s | `MAKER_ARCHIVE_TIMEOUT_MS` | `config.ts:11` |
| 회신 | 5s, 재시도 없음 | `MAKER_REPLY_TIMEOUT_MS` | `config.ts:12` |
| 레코드 보존 | 14일 | `MAKER_KEEP_DAYS` | `config.ts:13` |

- **부분 실패 규칙**: 조회 실패 = 0원 항목으로 계속(`C-03`), 렌더 실패 = `failed`, 보관 실패 = `spare/` 사본 + `failed`, 회신 실패 = 로그만(`C-02`).
- **멱등**: 같은 runId의 `working`·`issued`는 `alreadyRunning:true`. `receive`는 읽기와 쓰기 사이에 `await`가 없는 동기 파일 입출력이라, 한 프로세스 안에서 두 요청이 그 사이에 끼어들지 못한다.
- **한도 합 대 마감**: 3~5 단계 한도 합 150s = 시계의 마감 150s(`C-01`). 두 값은 서로 다른 설정이고 어느 쪽도 상대를 읽지 않는다.

## 7. 검증 경계

`npm test` = `node --test`. **가상 예시라 실행 기록이 없다** — 아래는 테스트 소스를 읽은 모양이다.

| 테스트 | 무엇을 보장하나 | 실행 결과 |
|---|---|---|
| `invoice-maker.test.ts` | 단계 순서, 보관 실패 → `spare/` + `failed`, 회신 4필드, `alreadyRunning` 멱등 | 미실행 |
| `usage-client.test.ts` | 3명씩 묶기, **실패 고객을 0원 항목으로 바꾼다**(`C-03` 동작을 테스트가 굳힌다) | 미실행 |
| `boot.test.ts` | `failInterrupted`, 14일 정리 | 미실행 |

**없는 테스트**: 한도 합 대 시계 마감 대조(`C-01`), 회신 유실 뒤 회수(시계 쪽 일 — `C-02`). 실제 usage-api를 부르는 테스트도 없다(모두 가짜 응답).

## 8. 이슈

| ID | 분류 | 내용 | 근거 | 영향 |
|---|---|---|---|---|
| `C-01` | 정합성 | 생성 단계 시간 한도 합(조회 90s + 렌더 45s + 보관 15s = 150s)이 시계의 마감 기본 150s와 같아 여유가 없다 | `config.ts:9-11`, billing-clock `clock.conf:5` | 조회가 조금만 늦어도 시계가 마감 정리로 그 시도를 실패로 적고 다시 맡겨, 같은 실행이 맡김부터 두 번 돈다. 생성기가 아직 `working`이면 두 번째 `make`는 새 실행 없이 끝나지만 재시도 1회가 줄고, 실행 목록에는 정상 실행이 재시도 중으로 보인다 |
| `C-02` | 계약공백 | 회신 재시도가 없다 — 실패는 로그 1줄이다 | `reply-client.ts:6-24` | 회신이 유실되면 시계의 생존 확인(틱 ②)이 회수할 때까지 종결이 최대 65초(45초 유예 + 20초 틱) 늦는다 |
| `C-03` | 정합성 | 사용량 조회 실패를 0원 항목으로 바꾸고 실행을 `issued`로 끝낸다 — 실패와 「사용량 0」을 구별하지 않는다(조용한 열화) | `usage-client.ts:30-36`, `lines.ts:34-40` | 고객에게 0원(또는 일부 고객만 0원) 청구서가 보관·발송될 수 있다. 레코드·회신·메일 어디서도 구별할 수 없다 |

## 9. 미확인·한계

1. **런타임·테스트 미실행** — `C-01`·`C-02`의 실제 지연은 코드상 예상이고, §7은 테스트 소스를 읽은 것이다.
2. **usage-api·invoice-archive 안쪽** — 조건 검증과 덮어쓰기의 세부는 사용자 지정 범위 밖이다(상세 없음).
3. **`InvoiceRenderer` 세부** — 금액 반올림·세율 규칙은 열지 않았다(머리 블록의 범위 한정).
