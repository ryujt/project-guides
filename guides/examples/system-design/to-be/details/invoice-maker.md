# invoice-maker (:7102) — TO-BE 상세

> **가상의 예시 시스템** — 심볼·필드·수치는 형식 예시다. 양식은 [시스템 설계 문서 양식 §5](../../../../system-design-document-guide.md#5-상세-문서-골격)의 TO-BE 열을 따른다.
> **대상**: invoice-maker의 바뀌는 범위 — 중지 라우트와 중지 확인 지점(`C-01`), 회신 재시도(`C-03`), `needs-check` 표시와 `heldLines`(`C-04`). 유지 부분은 AS-IS 상세로 링크한다 · **기준**: 입력 AS-IS 커밋 `5e6f7a8`(가상)·2026.03.02
> **근거 색인**: [AS-IS 브리프](../../_evidence-brief.md), `R`·`C`·`D`는 [상위 §2](../system-design-to-be.md#2-기능요구--무엇을-해주고-왜-바꾸나) · **상위**: [`../system-design-to-be.md`](../system-design-to-be.md) · **짝**: [AS-IS 상세](../../as-is/details/invoice-maker.md)
> **표기**: `(제안)` = 새 계약·심볼·필드·설정. 그림 근거 열은 `R`·`C`·`D` ID이고, 유지 노드는 AS-IS 상세의 JF 소절 링크다

## 1. 책임 / 비책임

- **책임**: AS-IS와 같다 — 맡은 실행 하나를 서식 읽기 → 주기의 사용 기간 계산 → 고객별 사용량 조회 → 금액 계산·렌더 → 보관 → 회신으로 끝낸다([AS-IS §1](../../as-is/details/invoice-maker.md#1-책임--비책임)). 더하는 것은 셋이다 — 보관 직전 확인 전의 중지를 확정하고 멈춘다(`C-01`), 회신을 같은 키로 다시 보내 전달한다(`C-03`), 조회에 실패한 고객을 `needs-check`로 드러내고 회신의 `heldLines`로 알린다(`C-04`).
- **비책임**: 메일 보류의 판단과 기록(billing-clock — 생성기는 `heldLines`를 알릴 뿐이다), 주기 중복 방지(billing-clock `C-02` — 생성기는 같은 runId 안의 `alreadyRunning`만 지킨다), 사용량 조건 검증(usage-api), 청구서 보존과 `dedupKey` 덮어쓰기(invoice-archive), 서식 편집(admin-console).
- **아무도 하지 않는 것**: 메일 재발송(`B-03` 보류), 생성 단계 한도 합과 마감 맞추기(`AS-IS C-01` 보류), 모든 고객의 조회가 실패한 청구서를 재시도로 돌릴지의 판단(§8 미확정).

## 2. 공개 계약

라우트 넷 — AS-IS 셋(생성 2·헬스 1)에 중지 1(제안)을 더한다. 아래 표는 신규·변경 셋이다. 유지 1개(`GET /ping`)와 `runId` 꼴 검사(`/^r[0-9a-z]{8,24}$/`)의 원문은 [AS-IS 상세 §2](../../as-is/details/invoice-maker.md#2-공개-계약)다.

| 메서드·경로 | 입력 | 출력 | 오류 | 구현 |
|---|---|---|---|---|
| `POST /api/makes` | AS-IS와 같음 — `{runId, planId, cycle, formId, rates, customers}` | 202 `{runId, alreadyRunning}` — `working`·`issued`면 `alreadyRunning:true`(유지) | 422 `{field}`(유지), 409 `{error:'STOPPED'}`(제안 — 중지 기록이 있는 runId) | `MakeRoutes.make` → `InvoiceMaker.receive` — `C-01` |
| `GET /api/makes/:runId` | path | 200 레코드 — `phase`에 `stopped`(제안), 필드 `heldLines`·`try`(제안) | 404, 422 `runId` 꼴(유지) | `MakeRoutes.peek` → `MakeRecords.read` — `C-01`·`C-04` |
| `POST /api/makes/:runId/stop`(제안) | path(본문 없음) | 200 `{phase:'stopped', was}` — `was`는 중지 전 단계 `working`·`failed`·`none`·`stopped`(이미 멈춤) | 422 `runId` 꼴, 409 `{error:'TOO_LATE', phase}`(보관 단계·`issued`) | `MakeRoutes.stop` → `InvoiceMaker.stop`(제안) — `C-01` |

- **중지 200의 뜻**: 이 runId로 보관·회신이 더는 일어나지 않는다는 확정이다. 끊은 조회의 자원은 잠시 뒤에 풀린다.
- **호환성**: 응답에는 필드만 더하고 기존 필드는 그대로다. 회신 본문의 `heldLines`도 더한 필드다 — 옛 시계는 이 필드를 읽지 않고 메일을 보내므로, `needs-check` 표시는 시계를 배포한 뒤 설정으로 켠다([상위 §9.3](../system-design-to-be.md#93-이행롤백)).

## 3. 내부 Job Flow — 드릴다운

**결론**: 조율자는 AS-IS와 같은 `InvoiceMaker` 하나다. 여기에 중지 접수(`stop`)와 보관 직전 확인을 더하고, 실행 중인 runId의 중지 표시·조회 중단 신호·보관 단계 표시를 `WorkRegistry`(제안) 한 곳에 모은다. 다른 경계와 주고받는 일은 AS-IS와 같은 세 클라이언트(`UsageClient`·`ArchiveClient`·`ReplyClient`)가 맡는다.

상위 §5의 노드가 아래 그림의 시작점이다. 입력·출력·실패 의미가 같다([상위 §5](../system-design-to-be.md#5-흐름--경계끼리-어떻게-소통하나)).

**드릴다운 지도**

| 상위 §5 노드 | L1 그림 | L2 이하 |
|---|---|---|
| `Maker.make`·`Maker.peek`·`Maker.stop`(§5.1·§5.3·§5.4·§5.5) | [`JF-1` 라우트 진입](#jf-1-라우트-진입--makeroutes) | `stop` → [`JF-1.1` 중지 접수](#jf-11-중지-접수--invoicemakerstop). `make`의 접수 안쪽(`receive`)은 [AS-IS `JF-2A`](../../as-is/details/invoice-maker.md#jf-2a-준비조회)의 앞부분에 `.stopped` 분기와 `WorkRegistry` 등록을 더한 것이라 `JF-1` 표에만 적었다 |
| `Maker.work`(§5.1·§5.4·§5.5) — 중지 확인 지점은 §5에 그리지 않고 이 행의 그림에서 연다 | [`JF-2` 생성 조율과 중지 확인 지점](#jf-2-생성-조율과-중지-확인-지점--invoicemakerwork) — 단계 1~2는 유지([AS-IS `JF-2A`](../../as-is/details/invoice-maker.md#jf-2a-준비조회)) | [`JF-2.1` 고객별 사용량 조회](#jf-21-고객별-사용량-조회--usageclientfetchall) |
| (§5 노드 없음 — 기동) | 유지 — [AS-IS `JF-3`](../../as-is/details/invoice-maker.md#jf-3-부팅-정리--invoicemakerfailinterrupted) | — |

상위 바깥 노드 ↔ 이 경계의 클라이언트는 AS-IS와 같다 — `FormDir.read` = `FormLoader.load`, `UsageApi.fetch` = `UsageClient.fetchAll`(고객마다 `usageHttp.postUsage` 1회), `Archive.file` = `ArchiveClient.file`, `Clock.acceptReply` = `ReplyClient.send`.

**표기** 유지 노드는 AS-IS 상세의 심볼 이름을 그대로 쓰고 새 노드에는 표에 `(제안)`을 단다. 클래스가 없는 모듈 객체(`checks`·`usageHttp`·`lines`)는 [AS-IS §3](../../as-is/details/invoice-maker.md#3-내부-job-flow--드릴다운) 표기의 구획 표를 따르고, `lines`에 새 심볼 `checkLine`(제안)만 더한다. `단계 #`은 [AS-IS 3.1](../../as-is/details/invoice-maker.md#31-생성-단계와-시간-한도)의 생성 단계 0~7이다. 네 그림의 이전 렌더 확인 기록은 [상위 §9.2](../system-design-to-be.md#92-검증)에 있다. 열지 않은 것: `ReplyClient.send`의 재시도 반복(단순 워커 — §6 표가 원본), `InvoiceRenderer.render`(순수 변환).

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
MakeRoutes.stop --> InvoiceMaker.stop
InvoiceMaker.stop.result --> MakeRoutes.stop.result
```

| 노드 | 근거 | 비고 |
|---|---|---|
| `make` → `checks.makeBody` → `InvoiceMaker.receive` | 유지 — [AS-IS `JF-1`](../../as-is/details/invoice-maker.md#jf-1-라우트-진입--makeroutes), `C-01` | 202 `{runId, alreadyRunning}`. `receive` 안의 레코드 읽기(AS-IS `JF-2A`의 `.busy`·`.free`)에 `.stopped` 분기가 생긴다 → 409 `STOPPED`. 새 실행이면 레코드 `working` 쓰기와 같은 동기 구간에서 `WorkRegistry`에 runId를 올리고 `try`를 1 올린다(제안) |
| `peek` → `MakeRecords.read` | 유지 — [AS-IS `JF-1`](../../as-is/details/invoice-maker.md#jf-1-라우트-진입--makeroutes), `C-01`·`C-04` | 레코드를 그대로 200으로 낸다(`stopped`·`heldLines`·`try` 포함). `.missing`은 404 |
| `stop` → `InvoiceMaker.stop`(제안) | `C-01`·`D-01` | `runId` 꼴 검사는 `peek`와 같은 라우트 안의 검사다(그리지 않음). 결과 종류를 HTTP로 바꾼다 — `stopped` 200, `too-late` 409. 안쪽은 `JF-1.1` |

- **트리거** 상위 `Maker.make`(틱 ①·즉시 발행·재시도), `Maker.peek`(생존 확인), `Maker.stop`(시계의 중지 전파). **완료 사실** 202 접수, 레코드 응답, 중지 확정이나 거절.

### JF-1.1 중지 접수 — InvoiceMaker.stop

```jobflow
orchestrator: InvoiceMaker
Object: InvoiceMaker, WorkRegistry, MakeRecords

InvoiceMaker.stop --> WorkRegistry.requestStop
WorkRegistry.requestStop.archiving
WorkRegistry.requestStop.accepted --> MakeRecords.markStopped
WorkRegistry.requestStop.idle --> MakeRecords.read
MakeRecords.read.issued
MakeRecords.read.stopped
MakeRecords.read.failed --> MakeRecords.markStopped
MakeRecords.read.missing --> MakeRecords.markStopped
```

| 노드 | 근거 | 비고 |
|---|---|---|
| `WorkRegistry.requestStop`(제안) | `C-01` | 보관 단계 표시 전이면 중지 표시 + 조회 중단 신호 → `.accepted`. 표시 뒤면 `.archiving` → `too-late` |
| `.idle` → `MakeRecords.read` | `C-01`, `read`는 유지 — [AS-IS `JF-1`](../../as-is/details/invoice-maker.md#jf-1-라우트-진입--makeroutes) | 이 프로세스에 그 runId의 실행이 없다(끝났거나, 재기동했거나, 맡김이 아직 안 왔다). `.issued` → `too-late`, `.stopped` → `stopped`(`was:'stopped'`) |
| `.accepted`·`.failed`·`.missing` → `MakeRecords.markStopped`(제안) | `C-01`·`R-01` | 레코드에 `phase:'stopped'`를 쓴 뒤 `stopped`를 돌려준다 — 그래서 200 뒤의 `peek`도 `stopped`다. `.failed`·`.missing`에서는 이 쓰기가 **중지 기록**이 되어 뒤에 온 `make`를 409로 돌려보낸다 |

- `.archiving`·`.issued`·`.stopped` 세 줄 뒤로는 이 그림의 객체를 더 부르지 않는다. `stop`은 결과 종류(`.archiving`·`.issued`는 `too-late`, `.stopped`는 이미 멈춤)만 돌려주고, 그 값을 409·200으로 바꾸는 것은 `JF-1`의 `MakeRoutes`다.
- `markStopped`로 들어오는 화살표 셋은 택일 경로의 **합류**다 — 중지 한 번에 쓰기는 한 번이다.
- 중지 접수(`requestStop`·`markStopped`)와 `JF-2`의 보관 직전 확인(`enterArchive`)은 AS-IS `receive`처럼 `await` 없는 동기 파일 입출력 구간이다(제안 — [AS-IS §6](../../as-is/details/invoice-maker.md#6-실패-경계)의 멱등 불릿과 같은 근거). 한 프로세스 안에서 번갈아 실행될 뿐 겹치지 않으므로, 중지와 보관이 함께 이기는 경우가 없다.
- 레지스트리에는 없는데 레코드가 `working`인 경우는 재기동 직후뿐이다 — 기동 정리가 그 레코드를 `failed`로 바꾸기 전에는 요청을 받지 않는다(AS-IS `JF-3`).

### JF-2 생성 조율과 중지 확인 지점 — InvoiceMaker.work

`work`의 단계 1~2(서식 읽기·사용 기간 — AS-IS `JF-2A`의 `FormLoader`·`CycleWindow`)는 바뀌지 않아 그리지 않았다. 단계 0의 접수(`receive`)에서 바뀌는 것은 `JF-1` 표에 있다. 아래 그림은 `work`의 단계 3(`UsageClient.fetchAll`)부터 끝까지다 — AS-IS `JF-2B`와 같은 구간에 중지 확인 지점 두 자리를 더했다.

```jobflow
orchestrator: InvoiceMaker
Object: InvoiceMaker, UsageClient, InvoiceRenderer, WorkRegistry, ArchiveClient, SpareCopy, MakeRecords, ReplyClient

InvoiceMaker.work --> UsageClient.fetchAll
UsageClient.fetchAll.stopped
UsageClient.fetchAll.result --> InvoiceRenderer.render
InvoiceMaker.work --> WorkRegistry.enterArchive
WorkRegistry.enterArchive.stopped
WorkRegistry.enterArchive.clear --> ArchiveClient.file
ArchiveClient.file.rejected --> SpareCopy.keep
SpareCopy.keep --> MakeRecords.finish
ArchiveClient.file.result --> MakeRecords.finish
MakeRecords.finish --> ReplyClient.send
```

| 노드 | 근거 | 단계 # | 비고 |
|---|---|---|---|
| `UsageClient.fetchAll`·`.stopped` | `C-01`·`C-04`, 나머지 유지 — [AS-IS `JF-2B`](../../as-is/details/invoice-maker.md#jf-2b-계산보관회신) | 3 | 실행의 중단 신호를 함께 넘긴다(제안). 중지면 `.stopped` — 렌더·보관·회신 없이 끝난다(중지 확인 지점의 첫 자리 — 상위 §5에는 그리지 않았다). 결과는 고객별 항목이고, 조회에 실패한 고객은 `needs-check` 항목이다 — `JF-2.1` |
| `InvoiceRenderer.render` | `C-04`, 호출은 유지 — [AS-IS `JF-2B`](../../as-is/details/invoice-maker.md#jf-2b-계산보관회신) | 4 | `needs-check` 항목은 금액 칸에 `확인 필요`를 쓰고 합계·부가세에서 뺀다. 합계 옆에 「확인 필요 n건 제외」를 적는다(제안) |
| `WorkRegistry.enterArchive`(제안)·`.stopped`·`.clear` | `C-01`·`R-01` | 4·5 사이 | 렌더 다음에 `work`가 부른다. 중지 확인과 보관 단계 표시를 한 동기 구간에서 한다. `.stopped`는 중지 확인 지점의 둘째 자리이고, `.clear` 뒤의 중지는 `too-late`다 |
| `ArchiveClient.file`·`.rejected` → `SpareCopy.keep` | 유지 — [AS-IS `JF-2B`](../../as-is/details/invoice-maker.md#jf-2b-계산보관회신) | 5 | 상위 `Archive.file`(15s). 렌더한 문서를 보관하고, 보관이 실패하면 `spare/<runId>/` 사본 + `failed` |
| `MakeRecords.finish` | 유지 — [AS-IS `JF-2B`](../../as-is/details/invoice-maker.md#jf-2b-계산보관회신), 필드는 `C-03`·`C-04` | 6 | `issued`(+`invoiceId`·`heldLines`)나 `failed`. 들어오는 화살표 둘은 보관 실패·성공의 **합류**다 — 보관 결과는 하나뿐이라 `finish`도 실행마다 한 번이다 |
| `ReplyClient.send` | `C-03`·`C-04` | 7 | 상위 `Clock.acceptReply`. 본문 4필드 + `heldLines`, 헤더 `Idempotency-Key: <runId>:<try>`. 다시 보내는 규칙은 §6. 회신 화살표는 두 경로에 공통이고 렌더러가 마지막 `finish` 칸에 잇는다 |

- **트리거** 상위 `Maker.make` 202 뒤의 백그라운드 실행(상위 `Maker.work`). **완료 사실** 레코드 `issued`(+`heldLines`) 또는 `failed` + 회신 1건(재시도 포함). 중지면 레코드 `stopped`만 남는다 — `JF-1.1`이 이미 썼다.
- **실패 분기** 서식·기간·렌더 예외는 AS-IS 바깥 `catch`처럼 `failed` + 회신이다. 단 중지된 실행이면 아무것도 쓰지 않고 끝나 `stopped`를 덮지 않는다(제안).

### JF-2.1 고객별 사용량 조회 — UsageClient.fetchAll

```jobflow
orchestrator: UsageClient
Object: UsageClient, usageHttp, lines

UsageClient.fetchAll --> usageHttp.postUsage
usageHttp.postUsage.fulfilled --> lines.toLine
usageHttp.postUsage.aborted
usageHttp.postUsage.rejected --> lines.checkLine
```

| 노드 | 근거 | 비고 |
|---|---|---|
| `UsageClient.fetchAll` → `usageHttp.postUsage` | 유지 — [AS-IS `JF-2.1`](../../as-is/details/invoice-maker.md#jf-21-고객별-사용량-조회--usageclientfetchall), `C-01` | 고객 한 명씩, 3명 묶음(동시 3), 전체 예산 90s(유지). 예산의 중단 신호에 실행의 중지 신호를 합친다(제안). 상위 `UsageApi.fetch` |
| `.fulfilled` → `lines.toLine` | 유지 — [AS-IS `JF-2.1`](../../as-is/details/invoice-maker.md#jf-21-고객별-사용량-조회--usageclientfetchall) | 사용량 × 요금표 단가 → 항목 금액 |
| `.aborted`(제안) | `C-01` | 중단 사유가 중지면 항목을 만들지 않고 남은 묶음도 시작하지 않는다 — `fetchAll`이 `stopped`로 끝나 `JF-2`의 `.stopped`가 된다 |
| `.rejected` → `lines.checkLine`(제안) | `C-04`·`R-04` | 4xx·5xx·연결 실패·예산 초과 → 금액 없는 `needs-check` 항목. AS-IS는 `lines.zeroLine`으로 0원 항목을 만들었다(`AS-IS C-03`). 설정을 끄면 AS-IS처럼 `zeroLine`을 쓴다(이행용 — §6) |

- `fetchAll`은 여전히 거절되지 않는다 — 조회 실패는 실행을 `failed`로 만들지 않고 항목 하나가 된다. 바뀌는 것은 그 항목이 0원인지 `확인 필요`인지와, `fetchAll`이 `needs-check` 고객 ID를 모아 `heldLines`로 돌려준다는 점이다.
- `postUsage` 화살표 하나가 고객 수만큼의 **실제 재호출**이다. 몇 번 부를지는 고객 목록이 정하고, 반복은 그림에 그리지 않았다([합류와 재호출 구분](../../../../job-flow-diagram-guide.md#합류와-재호출-구분)).

## 4. 소유 상태·데이터

디스크에 남는 두 가지는 AS-IS와 같은 파일이고, 메모리에 `WorkRegistry` 하나가 새로 생긴다.

| 데이터 | 경로 | 쓰기 주체 | 생명주기·보존 | 원자성 |
|---|---|---|---|---|
| 생성 레코드 | `<MAKER_DATA_DIR>/makes/<runId>.json`(유지) | AS-IS 주체(`receive`의 `write`, `work`의 `finish`, `failInterrupted`) + `markStopped`(제안) | 끝난 지 14일이면 기동 때 삭제(유지) — 중지 기록도 같다 | 임시 파일에 쓴 뒤 rename(유지) |
| 보관 실패 사본 | `<MAKER_DATA_DIR>/spare/<runId>/invoice.html`(유지) | `SpareCopy.keep` | 지우는 코드가 없다(유지) | 임시 파일에 쓴 뒤 rename(유지) |
| `WorkRegistry`(제안) | 메모리 | `receive`, `stop`, `enterArchive`, `work`의 끝 | 실행 중인 runId만 — 재기동하면 사라지고, 레코드는 AS-IS 기동 정리가 `failed`로 닫는다 | 한 프로세스 안의 동기 메서드 |

레코드 필드는 AS-IS의 `runId`·`planId`·`cycle`·`phase`·`invoiceId`·`note`·`startedAt`·`endedAt`에 `heldLines`(`needs-check` 고객 ID 목록 — `C-04`)와 `try`(같은 runId의 실행 번호 — 회신 키의 뒷부분, `C-03`)를 더한다. 중지 기록은 `runId`와 `phase:'stopped'`만 가진 레코드다.

### 4.1 생성 레코드 단계 기계

상태 소유자는 이 프로세스(레코드의 `phase`, 파일)다. AS-IS 세 값에 `stopped`를 더한다.

```state
<s> --> (working) : make — 새 실행
<s> --> (stopped) : stop — 실행 중이 아닌 runId의 중지 기록
(working) --> (issued) : 보관 성공 — heldLines가 있어도 issued
(working) --> (failed) : 서식·기간·렌더 예외 또는 보관 실패
(working) --> (failed) : 재기동 — failInterrupted
(working) --> (stopped) : stop — 보관 직전 확인 전
(failed) --> (working) : 같은 runId 다시 맡김
(failed) --> (stopped) : stop — 중지 기록
(issued) --> <e>
(failed) --> <e>
(stopped) --> <e>
```

**기호**: `<s>` 시작점, `(…)` 상태, `<e>` 레코드의 수명이 끝나는 곳, `A --> B : 글` A에서 B로 가는 전이와 그 조건([구성 요소](../../../../state-diagram-guide.md#구성-요소)).

- **다시 맡김 거절**: `working`·`issued`는 `alreadyRunning:true`(유지), `stopped`는 409 `STOPPED` — 멈춘 실행은 되살아나지 않는다. `failed`만 다시 `working`이 된다.
- 시계의 실행 행과의 비대칭이 어떻게 줄었는지는 [상위 §5.7](../system-design-to-be.md#57-실행-상태--두-상태-기계)에 있다.

## 5. 의존 — 나가는 방향

| 상대 | 쓰는 계약 | 배선·설정 | 타임아웃 | 결합 |
|---|---|---|---|---|
| FormDir, invoice-archive | AS-IS와 같음 | `MAKER_FORM_DIR`·`MAKER_ARCHIVE_URL`(유지) | 보관 15s(유지) | AS-IS와 같음 |
| usage-api | `POST /api/usage {accountIds, from, to}`(유지) | `MAKER_USAGE_URL`(유지) | 전체 90s, 동시 3(유지) + 중지 때 중단(제안) | 요청을 끊어도 상대의 SQL은 끝까지 돌 수 있다(이 경계 밖) |
| billing-clock | `POST /api/replies` + 본문 `heldLines`, 헤더 `Idempotency-Key`(제안) | `MAKER_REPLY_URL`(유지) | 시도당 5s → 3s, 최대 4회(제안) | 회신 4필드·`outcome` 2값은 그대로. 받는 쪽은 `closed`·`dropped(stopped)` 행에 온 회신을 버린다 — 다시 보낸 `issued`의 중복이 이 가드에서 사라진다. `failed`의 중복은 [시계 상세 §8](billing-clock.md#8-위험미확정) |

## 6. 실패 경계

| 항목 | 기본값 | 설정 키 | 위치 |
|---|---|---|---|
| 회신 | AS-IS 5s 1회 → 시도당 3s, 3회 더(대기 1·4·10s) — 설정한 시도·대기 합 27초 | `MAKER_REPLY_TIMEOUT_MS`(값 5000 → 3000), `MAKER_REPLY_WAITS_MS`(제안 — `1000,4000,10000`) | `ReplyClient.send` |
| 중지 확인 지점 | 조회 중단, 보관 직전 확인 | — | `WorkRegistry`(제안) |
| `needs-check` 표시 | 이행 중 `off` → 시계 배포 뒤 `on` | `MAKER_NEEDS_CHECK`(제안) | `lines`, `InvoiceRenderer` |
| 조회·렌더·보관 한도 | 90s·45s·15s — 합 150s(유지) | AS-IS와 같음 | [AS-IS 상세 §6](../../as-is/details/invoice-maker.md#6-실패-경계) |

- **다시 보내는 조건** 타임아웃·5xx·연결 실패만 다시 보낸다. 4xx는 같은 요청이 또 실패하므로 보내지 않는다. 모든 시도의 키가 같다. 설정한 예산은 시도 4번 × 3s + 대기 1+4+10s = 27초다. 스케줄링·서버 처리 지연을 포함한 종결 기한이나 수신 멱등을 보장하는 값은 아니다. `R-03`의 40초 종결과 중복 `failed` 처리는 [상위 §9.5](../system-design-to-be.md#95-미확정필요-입력)의 미확정 사항이다.
- **부분 실패 규칙** 조회 실패 = `needs-check`로 계속(`C-04` — AS-IS는 0원), 렌더 실패 = `failed`, 보관 실패 = `spare/` + `failed`, 회신 실패 = 다시 보낸 뒤 로그(`C-03`), 중지 = 기록만 남기고 끝(`C-01`).
- **최후 방어** 회신 네 번이 모두 실패하면 로그 한 줄을 남기고 끝난다. 시계의 행은 생존 확인이 `peek`로 거둔다([상위 §5.5](../system-design-to-be.md#55-실행-종결과-발송)).

## 7. 검증 계획

| 검증 | 대상 계약·시나리오 | 방법·명령 | 시점 |
|---|---|---|---|
| 중지 경쟁 | `stop` × 실행 단계 — 조회 중, 렌더 중, `enterArchive` 직후 | 가짜 usage-api로 조회를 붙잡아 두고 중지 → `ArchiveClient.file` 호출 0회, `enterArchive` 뒤 중지 → 409 `TOO_LATE` | 생성기 중지 작업 |
| 중지 멱등·되살림 | 두 번 중지, `failed` 실행 중지, 중지 뒤 같은 runId `make`, 중지 기록 뒤 `make`, 중지 뒤 렌더 예외 | 200 `was:'stopped'`, 409 `STOPPED` 둘, 레코드가 `stopped`로 남는다 | 생성기 중지 작업 |
| 회신 장애 주입 | `ReplyClient.send` | 가짜 시계가 타임아웃, 5xx 3회, 4회 모두 실패를 돌려준다 → 가상 시계 기준 시도·대기 합 27초, 간격 1·4·10s, 같은 키, 4xx는 다시 보내지 않음 | 회신 재시도 작업 |
| 확인 필요 항목 | 고객 3명 중 1명 조회 실패 | 문서 `확인 필요` 1, 합계에서 제외, `heldLines` 1, 레코드 `issued`. `usage-client.test.ts`의 「0원 항목」 단언은 `MAKER_NEEDS_CHECK=off`일 때만 남긴다 | 조회 실패 표시 작업 |
| 옛 시계 호환 | 새 필드가 든 회신 | AS-IS 4필드만 읽는 가짜 수신자가 204를 돌려준다 | 배포 전 |

`npm test`(`node --test`)의 AS-IS 시험 묶음에 더한다(제안). 작업은 [상위 §9.1](../system-design-to-be.md#91-독립-작업-순서)의 행이다.

## 8. 위험·미확정

| 관련 ID | 분류 | 내용 | 근거 | 영향·대응 |
|---|---|---|---|---|
| `C-04` | 미확정 | 모든 고객의 조회가 실패한 청구서를 `issued` + 보류로 둘지, `failed`로 돌려 시계 재시도(30·60·120s)에 맡길지 | `R-04` | 잠정 `issued` + 보류. usage-api가 잠시 멈추면 그동안 발행한 청구서가 모두 보류된다 — 운영 부담이 크면 「전부 실패 = `failed`」로 바꾼다 |
| `C-04` | 미확정 | 회신 `outcome`을 `issued`로 둘지 새 값(`held`)으로 둘지 | `R-04` | 잠정 `issued` + `heldLines` — 새 값은 시계의 상태 기계와 재시도 판정을 함께 바꾸므로 피한다 |
| `C-01` | 위험 | 조회 중단이 상대의 SQL까지 멈추지는 않는다 | §5 | 생성기 쪽은 바로 멈춘다. 상대 부하는 usage-api 계약 확인이 필요하다 |
| `C-03`·`D-02` | 위험 | 재시도 중 실행의 자원을 유지한다(설정 합 27초) | §6 | AS-IS에 동시 `work` 상한이 없어(AS-IS `JF-2A`) 재시도 중 자원 사용이 늘 수 있다. 27초는 설정한 시도·대기 합이며 실제 완료 상한은 아니다. 시계 쪽 중복 위험은 [시계 상세 §8](billing-clock.md#8-위험미확정) |

## 9. 미확인·한계

1. 가상 시스템이다 — 심볼·필드·수치는 형식 예시이고 실행·측정한 것이 없다.
2. 유지 영역(본문 검사·서식 읽기·주기 구간·보관 실패 사본·기동 정리)은 다시 열지 않았다 — [AS-IS 상세 §3](../../as-is/details/invoice-maker.md#3-내부-job-flow--드릴다운)이 원본이다.
