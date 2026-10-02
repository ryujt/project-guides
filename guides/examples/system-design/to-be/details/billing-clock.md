# billing-clock (:7101) — TO-BE 상세

> **가상의 예시 시스템** — 심볼·열·수치는 형식 예시다. 양식은 [시스템 설계 문서 양식 §5](../../../../system-design-document-guide.md#5-상세-문서-골격)의 TO-BE 열을 따른다.
> **대상**: billing-clock의 바뀌는 범위 — 중지 전파와 종결 가드(`C-01`), 주기 유니크와 맡김 멱등(`C-02`), 메일 보류(`C-04`). 유지 부분은 AS-IS 상세로 링크한다 · **기준**: 입력 AS-IS 커밋 `5e6f7a8`(가상)·2026.03.02
> **근거 색인**: [AS-IS 브리프](../../_evidence-brief.md), `R`·`C`·`D`는 [상위 §2](../system-design-to-be.md#2-기능요구--무엇을-해주고-왜-바꾸나) · **상위**: [`../system-design-to-be.md`](../system-design-to-be.md) · **짝**: [AS-IS 상세](../../as-is/details/billing-clock.md)
> **표기**: `(제안)` = 새 계약·심볼·열·설정. 그림 근거 열은 `R`·`C`·`D` ID이고, 유지 노드는 AS-IS 상세의 JF 소절 링크다. JF 번호는 이 문서의 드릴다운 지도 순서이고, AS-IS 번호와의 대응은 §3의 표기 줄에 있다

## 1. 책임 / 비책임

- **책임**: AS-IS와 같다 — 도래 판정, 맡김, 생존 확인, 마감 정리, 종결, 재시도 판정, 청구서 메일([AS-IS §1](../../as-is/details/billing-clock.md#1-책임--비책임)). 더하는 것은 셋이다 — 맡긴 실행의 중지를 생성기에 전하고 확인 뒤에만 행을 닫는다(`C-01`), 같은 주기 실행을 하나로 지킨다(`C-02`), `heldLines`가 든 청구서의 메일을 보류한다(`C-04`).
- **비책임**: 생성 중지의 확정(invoice-maker — 시계는 요청하고 응답을 따른다), `needs-check` 판정(invoice-maker), 청구서 파일의 중복 방지(invoice-archive `dedupKey` — 유지), 회신 재시도(invoice-maker `C-03`).
- **아무도 하지 않는 것**: 실패한 메일 다시 보내기(`B-03` 보류), 보류한 메일의 해제(상위 §9.5 미확정), 마감과 생성 단계 한도 맞추기(`AS-IS C-01` 보류).

## 2. 공개 계약

라우트 11개 가운데 바뀌는 것은 셋이고, 틱 단계 ①·②의 동작도 바뀐다. 아래 표는 이 다섯 줄이다. 유지 라우트 8개(계획 5·실행 조회 2·헬스 1)의 원문은 [AS-IS 상세 §2](../../as-is/details/billing-clock.md#2-공개-계약)다.

| 메서드·경로 | 입력 | 출력 | 오류 | 구현 |
|---|---|---|---|---|
| `POST /api/runs/:runId/stop` | — | `{stopped}`(유지 모양) — `true`: 한 번도 맡기지 않은 행을 닫았거나 생성기 200 뒤에 닫았다, `false`: 이미 `closed`·`dropped`(유지) | 404(유지), 409 `{error:'TOO_LATE'}`(제안 — 생성기가 보관 단계), 503 `{error:'MAKER_UNREACHABLE'}`(제안 — 불통·5xx·그 밖의 응답). 두 오류 모두 행은 그대로 | `ApiRoutes.stopRun` → `BillingClock.stopRun`(제안) — `C-01` |
| `POST /api/plans/:planId/issue` | — | 202 `{runId}`(유지) — 그 주기 실행이 열려 있으면(`pending`·`active`) 그 runId | 404, 409 꺼진 계획(유지), 409 `{error:'CYCLE_DONE', runId, state}`(제안 — 끝난 주기, 잠정) | `ApiRoutes.issueNow` → `BillingClock.issueNow` — `C-02` |
| `POST /api/replies` | `{runId, outcome, invoiceId?, note?}`(유지) + `heldLines?`(제안), 헤더 `Idempotency-Key`(제안 — 로그에만) | 204(유지) | 422 `outcome`(유지) | `ApiRoutes.acceptReply` → `BillingClock.finishRun` — `C-01`·`C-04` |
| 틱 ① 도래·맡김 | 20초 틱 | 주기당 실행 행 하나, 맡기기 전에 `active` | — | `BillingClock.startDueRuns`·`handOff` — `C-01`·`C-02` |
| 틱 ② 생존 확인 | 20초 틱 | `phase:'stopped'`(제안)도 종결 입구로 보낸다 | — | `BillingClock.checkAlive` — `C-01` |

- **중지 `true`의 뜻**: 맡긴 실행이면 생성기가 멈춤을 확인했다는 뜻이고, 한 번도 맡기지 않은 행이면 맡기지 않았다는 뜻이다. 어느 쪽이든 이 runId로 보관·메일이 일어나지 않는다.
- **호환성**: 성공 응답의 모양은 AS-IS와 같고 409·503이 새로 생긴다. 옛 화면은 비 2xx를 기존 오류 표시로 보인다(가정 — [상위 §7](../system-design-to-be.md#7-화면--사용자는-어디를-오가나)). 회신에 `heldLines`가 없으면 AS-IS처럼 메일을 보낸다.

## 3. 내부 Job Flow — 드릴다운

**결론**: 조율자는 AS-IS와 같은 `BillingClock` 하나이고, 중지 요청도 이제 이 조율자를 지난다(`BillingClock.stopRun` — 제안). 주기 유니크는 행 생성(`RunStore.createOnce` — 제안)에, 중지와의 경쟁은 맡기기 전의 조건부 `active`(`RunStore.claim` — 제안)에, 보류는 종결의 새 분기(`RunStore.closeHeld` — 제안)에 둔다. 다른 경계를 부르는 것은 AS-IS와 같은 세 클라이언트(`MakerClient`·`ArchiveClient`·`MailChannel`)이고, `MakerClient`에 `stop` 메서드가 생긴다.

상위 §5의 노드가 아래 그림의 시작점이다. 입력·출력·실패 의미가 같다([상위 §5](../system-design-to-be.md#5-흐름--경계끼리-어떻게-소통하나)).

**드릴다운 지도**

| 상위 §5 노드 | L1 그림 | L2 이하 |
|---|---|---|
| `Clock.OnTick` → `Maker.make`, `Clock.issueNow`(§5.1·§5.3·§5.4) | [`JF-1` 맡김 멱등](#jf-1-맡김-멱등--billingclockstartdueruns) | 재시도 판정은 유지 — [AS-IS `JF-1.1`](../../as-is/details/billing-clock.md#jf-11-재시도-판정--billingclockplanretry) |
| `Clock.OnTick` → `Maker.peek`, `Clock.acceptReply` → `Clock.finishRun`, `Clock.finishRun.held`·`.issued`(§5.1·§5.4·§5.5) | [`JF-2` 종결과 보류 발송](#jf-2-종결과-보류-발송--billingclockfinishrun) | `.issued` 뒤의 수신자·발송(상위 `Archive.open`·`Mailer.send`)은 유지 — [AS-IS `JF-3.1`](../../as-is/details/billing-clock.md#jf-31-수신자청구서-정보발송--deliverynotifierdeliver) |
| `Clock.operate` 중 `Clock.stopRun` → `Maker.stop`(§5.1·§5.3) | [`JF-3` 운영 API 중지](#jf-3-운영-api-중지--billingclockstoprun) | — |
| `Clock.operate` 중 `.plans`·`.getRun`·`.listRuns`(§5.3), 틱 ③ 마감 정리 | 유지 — [AS-IS `JF-4`](../../as-is/details/billing-clock.md#jf-4-운영-api--apiroutes), [AS-IS 3.1](../../as-is/details/billing-clock.md#31-틱-단계와-마감-정리) | — |

상위 바깥 노드 ↔ 이 경계의 클라이언트: `Maker.make`·`.peek`·`.stop` = `MakerClient.make`·`.peek`·`.stop`(`stop`만 제안), `Archive.open` = `ArchiveClient.fetchMeta`(유지), `Mailer.send` = `MailChannel.send`(유지).

**표기** 유지 노드는 AS-IS 상세의 심볼 이름을 그대로 쓰고 새 노드에는 표에 `(제안)`을 단다. `Ticker.OnTick`은 AS-IS처럼 타이머 발화 이벤트이고, 틱 단계 번호 ①·②·③은 [AS-IS 3.1](../../as-is/details/billing-clock.md#31-틱-단계와-마감-정리) 표의 번호다. JF 번호는 지도 순서를 따르므로 AS-IS와 다르다 — 진입 심볼이 같은 것은 `JF-1`(`startDueRuns`)이고, `JF-2`는 AS-IS `JF-2`·`JF-3`에서 바뀐 부분을, `JF-3`은 AS-IS `JF-4`의 `stopRun`을 다시 연다. 세 그림의 `Object:` 순서는 [순서 규칙](../../../../job-flow-diagram-guide.md#렌더러-배치-특성)대로다 — 호출받지 않는 트리거(`Ticker`·`ApiRoutes`)가 맨 왼쪽, 요청을 가장 많이 보내는 `BillingClock`이 그다음이다. 세 그림은 jobflow 렌더러 사본으로 SVG → PNG를 만들어 눈으로 확인했다([상위 §9.2](../system-design-to-be.md#92-검증)). 열지 않은 것: `MakerClient`의 HTTP 호출(단순 워커), `planRetry`·`DeliveryNotifier.deliver`(유지 — 위 링크).

### JF-1 맡김 멱등 — BillingClock.startDueRuns

```jobflow
orchestrator: BillingClock
Object: Ticker, BillingClock, PlanStore, RunStore, MakerClient

Ticker.OnTick --> BillingClock.startDueRuns
BillingClock.startDueRuns --> PlanStore.listDue
PlanStore.listDue.result --> RunStore.createOnce
RunStore.createOnce --> PlanStore.advance
BillingClock.startDueRuns --> RunStore.listReady
RunStore.listReady.result --> BillingClock.handOff
BillingClock.handOff --> RunStore.claim
RunStore.claim.lost
RunStore.claim.claimed --> MakerClient.make
MakerClient.make.stopped
MakerClient.make.error --> BillingClock.planRetry
```

| 노드 | 근거 | 비고 |
|---|---|---|
| `Ticker.OnTick` → `startDueRuns` → `PlanStore.listDue` | 유지 — [AS-IS `JF-1`](../../as-is/details/billing-clock.md#jf-1-틱-1단계-도래맡김--billingclockstartdueruns) | 상위 `Clock.OnTick` 틱 ① |
| `RunStore.createOnce`(제안) | `C-02`·`R-02` | AS-IS `RunStore.create` 자리. `INSERT … ON CONFLICT (plan_id, cycle) DO NOTHING` — 같은 주기 행이 있으면 새 행 없이 지나간다. 행 생성과 `advance` 사이에서 멈췄다 다시 떠도 행은 하나다 |
| `PlanStore.advance`·`RunStore.listReady` → `handOff` | 유지 — [AS-IS `JF-1`](../../as-is/details/billing-clock.md#jf-1-틱-1단계-도래맡김--billingclockstartdueruns) | 즉시 발행도 같은 `handOff`를 쓴다 |
| `RunStore.claim`(제안)·`.lost`·`.claimed` | `C-01`·`C-02` | 조건부 `pending → active` + `handed_at` + `due_by`를 **맡기기 전에** 쓴다(AS-IS `markActive`는 202 뒤). 바뀐 행이 없으면 `.lost` — 중지가 먼저 닫았으니 맡기지 않는다 |
| `MakerClient.make`·`.stopped` | 유지 — [AS-IS `JF-1`](../../as-is/details/billing-clock.md#jf-1-틱-1단계-도래맡김--billingclockstartdueruns), `.stopped`는 `C-01` | 상위 `Maker.make` — 202 `{runId, alreadyRunning}`(8s). 409 `STOPPED`(제안)면 아무것도 하지 않는다 — 행은 `JF-3`이 닫는다 |
| `.error` → `BillingClock.planRetry` | 유지 — [AS-IS `JF-1.1`](../../as-is/details/billing-clock.md#jf-11-재시도-판정--billingclockplanretry) | 맡김 실패. 행이 이미 `active`라 재시도 판정이 `pending`(재시도 대기)이나 `dropped(retry-exhausted)`로 돌린다 |

- **트리거** 상위 `Clock.OnTick`(틱 ①). **완료 사실** 주기당 실행 행 하나 + 202 접수. 같은 주기가 다시 나와도 맡김이 생기지 않는다.
- **즉시 발행** 상위 `Clock.issueNow`는 `ApiRoutes.issueNow` → `BillingClock.issueNow`로 들어와 같은 `createOnce` → `handOff`를 탄다. 다른 점은 같은 주기 행이 이미 있을 때의 응답뿐이다 — 열려 있으면(`pending`·`active`) 그 runId로 202, 끝났으면(`closed`·`dropped`) 409 `CYCLE_DONE`(잠정 — 상위 §9.5).
- 맡김 앞으로 `active`를 옮겨 생기는 차이: 맡김이 실패한 행도 잠시 `active`를 거친다. 생존 확인은 맡긴 지 45초 뒤부터라 그 사이에 행을 묻지 않는다.
- 단독 줄 `.lost`·`.stopped`는 그 뒤로 이 그림의 객체를 더 부르지 않는다. 둘 다 아무것도 바꾸지 않고 끝나며, 행을 닫는 쪽은 중지(`JF-3`)다.

### JF-2 종결과 보류 발송 — BillingClock.finishRun

```jobflow
orchestrator: BillingClock
Object: ApiRoutes, Ticker, BillingClock, MakerClient, RunStore, DeliveryNotifier

ApiRoutes.acceptReply --> BillingClock.finishRun
Ticker.OnTick --> BillingClock.checkAlive
BillingClock.checkAlive --> MakerClient.peek
MakerClient.peek.stopped --> BillingClock.finishRun
BillingClock.finishRun --> RunStore.get
RunStore.get.closed
RunStore.get.stoppedRow
BillingClock.finishRun.failed --> BillingClock.planRetry
BillingClock.finishRun.stopped --> RunStore.markDropped
BillingClock.finishRun.held --> RunStore.closeHeld
BillingClock.finishRun.issued --> RunStore.markClosed
RunStore.markClosed --> DeliveryNotifier.deliver
```

| 노드 | 근거 | 비고 |
|---|---|---|
| `ApiRoutes.acceptReply` → `BillingClock.finishRun` | 유지 — [AS-IS `JF-3`](../../as-is/details/billing-clock.md#jf-3-종결과-발송-통지--billingclockfinishrun), `C-04` | 상위 `Clock.acceptReply` → `Clock.finishRun`. 본문 `heldLines`(제안)를 함께 넘긴다. `Idempotency-Key`는 로그에만 남긴다. `@Synchronized`는 유지 |
| `Ticker.OnTick` → `checkAlive` → `MakerClient.peek`·`.stopped` | `C-01`, 나머지 분기는 유지 — [AS-IS `JF-2`](../../as-is/details/billing-clock.md#jf-2-틱-2단계-생존-확인--billingclockcheckalive) | 상위 `Clock.OnTick` → `Maker.peek`(틱 ②). 물을 행을 고르는 `RunStore.listAliveDue`는 유지라 그리지 않았다. `phase:'stopped'`(제안)면 종결 입구로 보낸다 — 시계가 중지 200을 받고 행을 쓰기 전에 멈춘 경우를 닫는다 |
| `RunStore.get`·`.closed`·`.stoppedRow` | `.closed`는 유지 — [AS-IS `JF-3`](../../as-is/details/billing-clock.md#jf-3-종결과-발송-통지--billingclockfinishrun), `.stoppedRow`는 `C-01`·`R-01` | 가드. `closed`면 버린다(유지). `dropped(stopped)`면 버린다(제안) — AS-IS는 이 행을 `closed`로 되돌렸다(`B-01`). `dropped(retry-exhausted)`에 늦게 온 `issued`를 살리는 길은 그대로 둔다 |
| `finishRun.failed` → `BillingClock.planRetry` | 유지 — [AS-IS `JF-1.1`](../../as-is/details/billing-clock.md#jf-11-재시도-판정--billingclockplanretry) | 30·60·120s 대기, 최대 3회 |
| `finishRun.stopped` → `RunStore.markDropped`(제안 분기) | `C-01` | `peek`가 알려 준 `stopped` → 행 `dropped(stopped)`, 메일 없음 |
| `finishRun.held` → `RunStore.closeHeld`(제안) | `C-04`·`R-04` | 상위 `Clock.finishRun.held`. `issued`에 `heldLines`가 있다. 행 `closed`(+`invoice_id`)와 수신자마다 `deliveries` 행(`result='held'`, `error`에 보류 고객 수)을 한 트랜잭션으로 쓴다 — AS-IS는 문장마다 자동 커밋. 메일은 보내지 않는다 |
| `finishRun.issued` → `RunStore.markClosed` → `DeliveryNotifier.deliver` | 유지 — [AS-IS `JF-3.1`](../../as-is/details/billing-clock.md#jf-31-수신자청구서-정보발송--deliverynotifierdeliver), 조건 추가는 `C-01` | 상위 `Clock.finishRun.issued` → `Archive.open`·`Mailer.send` — 수신자마다 1회, 재시도 없음(`B-03` 보류). `markClosed`·`closeHeld`는 `dropped(stopped)`가 아닌 행만 바꾼다(제안) — 가드와 갱신 사이에 잠금 밖의 중지가 끼어도 되살리지 않는다 |

- `finishRun`으로 들어오는 화살표 둘은 서로 다른 트리거(회신·생존 확인)의 **합류**다. 같은 실행이 두 경로로 함께 와도 `@Synchronized`와 가드 때문에 한 번만 종결된다. 이 그림의 `JF-RETURN` 경고는 이 합류 때문이고 round-trip이 아니다([합류와 재호출 구분](../../../../job-flow-diagram-guide.md#합류와-재호출-구분)). `RunStore.get`으로 가는 화살표는 두 경로에 공통이고, 렌더러는 그것을 마지막 `finishRun` 칸에 잇는다.
- `failed`·`stopped`·`held`·`issued` 칸은 `finishRun`이 가드를 지난 뒤 가르는 값이다(AS-IS `JF-3`과 같은 표기). 메일은 값 분기 `issued` 뒤에만 이어진다 — 이 뜻은 줄 순서가 아니라 분기 값이 정하므로, 어느 분기를 마지막 줄에 두어도 같다.
- 생존 확인의 다른 분기(`working`·`unreachable`·`failed`·`missing`·`issued`)는 AS-IS 그대로라 그리지 않았다.
- **완료 사실** 행 `closed`(+메일 또는 `held` 기록), `dropped(stopped)`, 재시도 대기 `pending`. 보류는 메일을 보내지 않기로 한 결정이라 경계 사이 화살표가 없다(`C-04`).

### JF-3 운영 API 중지 — BillingClock.stopRun

```jobflow
orchestrator: BillingClock
Object: ApiRoutes, BillingClock, RunStore, MakerClient

ApiRoutes.stopRun --> BillingClock.stopRun
BillingClock.stopRun --> RunStore.dropIfUnsent
RunStore.dropIfUnsent.dropped
RunStore.dropIfUnsent.ended
RunStore.dropIfUnsent.sent --> MakerClient.stop
MakerClient.stop.tooLate
MakerClient.stop.unreachable
MakerClient.stop.stopped --> RunStore.markDropped
```

| 노드 | 근거 | 비고 |
|---|---|---|
| `ApiRoutes.stopRun` → `BillingClock.stopRun`(제안) | `C-01`, 진입은 유지 — [AS-IS `JF-4`](../../as-is/details/billing-clock.md#jf-4-운영-api--apiroutes) | AS-IS는 처리기가 `RunStore.markDropped`를 바로 불렀다. 결과 종류를 HTTP로 바꾸는 일은 `ApiRoutes`가 한다 — `dropped`·`stopped`는 `{stopped:true}`, `ended`는 `{stopped:false}`, `tooLate`는 409, `unreachable`은 503 |
| `RunStore.dropIfUnsent`(제안) | `C-01`·`R-01` | 조건부 갱신 — `pending`이고 `handed_at`이 빈 행만 `dropped(stopped)`. 1행이 바뀌면 `.dropped` — 생성기를 부르지 않는다. 바뀐 행이 없으면 지금 상태에 따라 `.ended`(`closed`·`dropped`)나 `.sent`(`active`, 또는 앞 시도가 있는 `pending`) |
| `MakerClient.stop`(제안) | `C-01`·`D-01` | 상위 `Maker.stop` — `POST /api/makes/:runId/stop`(5s). 200만 `.stopped`로 읽는다. 409는 `.tooLate`, 불통·5xx·그 밖의 응답(옛 생성기의 404 포함)은 `.unreachable` |
| `.stopped` → `RunStore.markDropped` | `C-01`, 유지 심볼에 조건 추가 | 조건부 `pending`·`active` → `dropped(stopped)`. 그사이 `failed` 회신으로 `pending`이 됐어도 닫고, 이미 닫혀 있으면 바꾸지 않는다 |

- **트리거** 상위 `Clock.stopRun`(운영자 「중지」). **완료 사실** 행 `dropped(stopped)` + `{stopped:true}`, 또는 행을 그대로 둔 409·503.
- **앞 시도가 있는 `pending`도 생성기를 부른다** — 재시도를 기다리는 행은 마감 정리(`AS-IS C-01`)나 202 유실 뒤에도 생성기에서 앞 시도가 돌고 있을 수 있다. 「`pending`이면 돌지 않는다」가 확실한 것은 `handed_at`이 빈 행뿐이다.
- **경쟁** `dropIfUnsent`와 `JF-1`의 `claim`은 같은 행을 조건부로 바꿔 한쪽만 이긴다. 중지가 이기면 그 행은 맡겨지지 않고, 맡김이 이기면 중지는 `.sent`로 생성기를 부른다. 맡김 요청보다 중지가 생성기에 먼저 닿아도 생성기의 중지 기록이 뒤에 온 `make`를 409 `STOPPED`로 돌려보낸다(`JF-1`). 생성기를 부르는 동안(최대 5s) `finishRun`의 잠금은 잡지 않는다.
- 단독 줄 넷(`.dropped`·`.ended`·`.tooLate`·`.unreachable`)은 그 뒤로 이 그림의 객체를 더 부르지 않는다. 각 줄이 어떤 응답으로 끝나는지는 표의 `ApiRoutes` 행에 있다.

## 4. 소유 상태·데이터

`clock.mv.db` 4표는 AS-IS와 같고, 바뀌는 것은 유니크 하나와 값 하나다. 마이그레이션 도구가 없으므로 이행 스크립트를 한 번 돌린다(상위 §9.3).

| 표 | 주요 열 | 비고 |
|---|---|---|
| `runs` | `run_id`, `plan_id`, `cycle`, `state`, `reason`, `retries`, `retry_at`, `handed_at`, `due_by`, `invoice_id`, `note`(유지) | 유니크 `(plan_id, cycle)`(제안 — `C-02`). `handed_at`이 빈 `pending` = 한 번도 맡기지 않은 행(`C-01`의 판단 근거) |
| `deliveries` | `run_id`, `email`, `result`, `error`, `at`(유지) | `result`에 `held`를 더한다(제안 — `C-04`). 보류한 실행은 수신자마다 `held` 1행 |
| `plans`, `contacts` | AS-IS와 같음 | 유지 — [AS-IS 상세 §4](../../as-is/details/billing-clock.md#4-소유-상태데이터) |

### 4.1 실행 행 상태 기계

`runs.state`를 쓰는 것은 이 프로세스뿐이다. 값 4개는 AS-IS와 같고, 바뀌는 것은 주기당 한 행이라는 시작 조건과 맡김·중지·늦은 회신의 전이 조건이다.

```state
<s> --> (pending) : 도래·지금 발행 — 주기당 한 행
(pending) --> (active) : 맡기기 전 조건부 claim
(active) --> (pending) : 재시도 남음 — 맡김 실패·failed·마감 초과
(active) --> (dropped) : 재시도 소진
(pending) --> (dropped) : 중지 — 맡긴 적 없으면 바로, 앞 시도가 있으면 생성기 200 뒤
(active) --> (dropped) : 중지 — 생성기 200 뒤, 생존 확인 stopped
(pending) --> (closed) : 앞 시도의 늦은 issued
(active) --> (closed) : issued 종결 — 보류여도 closed
(dropped) --> (closed) : 늦은 issued — retry-exhausted만
(closed) --> <e>
(dropped) --> <e>
```

**기호**: `<s>` 시작점, `(…)` 상태, `<e>` 행의 수명이 끝나는 곳, `A --> B : 글` A에서 B로 가는 전이와 그 조건([구성 요소](../../../../state-diagram-guide.md#구성-요소)). 소유자·불변조건을 그림 옆에 적는 규칙은 [범위와 상태 소유권](../../../../state-diagram-guide.md#범위와-상태-소유권)이다.

- **불변조건**: `(plan_id, cycle)`마다 행은 하나다. `dropped(stopped)`는 끝 상태다 — 어떤 회신도 되돌리지 않는다(AS-IS는 `issued` 회신 하나로 `closed`가 됐다). 맡긴 적 있는 행이 `dropped(stopped)`가 되는 것은 생성기가 `stopped`를 확정한 뒤뿐이다.
- 생성 레코드와의 비대칭이 어떻게 줄었는지는 [상위 §5.7](../system-design-to-be.md#57-실행-상태--두-상태-기계)에 있다.

## 5. 의존 — 나가는 방향

| 상대 | 쓰는 계약 | 배선·설정 | 타임아웃 | 결합 |
|---|---|---|---|---|
| invoice-maker | `POST /api/makes`, `GET /api/makes/:runId`(유지), `POST /api/makes/:runId/stop`(제안) | `maker.url`(유지) | 8s, 4s(유지), 중지 5s(제안) | 레코드 `phase` 4값(`stopped` 추가)과 404의 뜻. 중지 응답 중 200만 확정으로 읽는다 — 옛 생성기의 404는 불통과 같다 |
| invoice-archive | `GET /api/invoices/:invoiceId`(유지) | `archive.url`(유지) | 4s(유지) | 유지 |
| Mailer | SMTP(유지) | `mail.host`, `mail.from`(유지) | `mail.timeout` 10s(유지) | `heldLines`가 있으면 부르지 않는다(`C-04`) |

## 6. 실패 경계

| 항목 | 기본값 | 설정 키 | 위치 |
|---|---|---|---|
| 중지 요청 | 5s, 다시 보내지 않는다(운영자가 다시 누른다) | `maker.stopTimeout`(제안) | `MakerClient.stop` |
| 회신 중복 | `closed`·`dropped(stopped)`면 버린다 | — | `BillingClock.finishRun` 가드 |
| 주기 중복 | 유니크 `(plan_id, cycle)` | — | `RunStore.createOnce` |
| 틱·유예·마감·재시도 | 20s, 45s, 150s, 3회(30·60·120s)(유지) | AS-IS와 같음 | [AS-IS 상세 §6](../../as-is/details/billing-clock.md#6-실패-경계) |

- **동시성** 중지와 맡김은 같은 행을 조건부로 바꿔 먼저 바꾼 쪽만 이긴다. 종결은 AS-IS처럼 `@Synchronized`이고, 중지가 쓰는 `markDropped`도 조건부라 같은 순간의 중지와 종결 중 하나만 행을 바꾼다(AS-IS는 나중에 쓴 쪽이 남았다).
- **불통** 생성기가 불통이면 맡긴 실행을 멈출 수 없다. 행만 닫는 길은 두지 않는다 — 그 길이 AS-IS의 절반 중지(`B-01`)다.
- 인증은 AS-IS와 같다(루프백 바인딩).

## 7. 검증 계획

| 검증 | 대상 계약·시나리오 | 방법·명령 | 시점 |
|---|---|---|---|
| 중지 분기 | `stopRun` × 행 상태 — 맡긴 적 없는 `pending`, 재시도 대기, `active`, `closed`, `dropped` | 가짜 생성기가 200·409·불통·404를 돌려준다 → 행 상태와 응답(`true`·`false`·409·503)을 대조 | 시계 전파 작업 |
| 중지와 맡김 경쟁 | `dropIfUnsent` × `claim` | 같은 행에 두 갱신을 번갈아 실행 → 한쪽만 1행, 진 쪽이 맡김 0회이거나 생성기 중지로 넘어간다 | 시계 전파 작업 |
| 중지 뒤 늦은 회신 | 가드 `.stoppedRow` | `dropped(stopped)` 행에 `issued`·`failed` 회신 → 행 그대로, 메일 0회, 재시도 판정 0회 | 시계 전파 작업 |
| 주기 유니크 | `createOnce`, 즉시 발행 | 같은 `(plan_id, cycle)`로 두 번, `advance` 직전 강제 종료 뒤 재기동 → 행 1, 즉시 발행 응답은 열린 행 202·끝난 행 409 | 주기 유니크 작업 |
| 보류 발송 | `finishRun.held` | `heldLines`가 든 회신 → 행 `closed`, 수신자마다 `deliveries` `held`, 메일 가짜 호출 0회, 중간 예외면 둘 다 없음 | 시계 보류 작업 |

`./gradlew test`의 AS-IS 시험 묶음에 더한다(제안). `FinishRunTest`는 `dropped(stopped)` 행을 다루도록 넓힌다. 작업은 [상위 §9.1](../system-design-to-be.md#91-독립-작업-순서)의 행이다.

## 8. 위험·미확정

| 관련 ID | 분류 | 내용 | 근거 | 영향·대응 |
|---|---|---|---|---|
| `C-01`·`D-01` | 위험 | 생성기가 불통이면 맡긴 실행을 멈출 수 없다 | §2의 503 | 운영자가 다시 누른다. 불통인 동안 생성기가 살아 있으면 실행은 보관까지 갈 수 있다 — 확인받지 못한 중지는 멈췄다고 보지 않는다 |
| `C-03`·`D-02` | 위험 | 시계는 회신 키를 저장해 대조하지 않는다. 처리된 `failed` 회신의 응답이 유실돼 같은 키로 다시 오면 행이 이미 `pending`이라 재시도 판정이 한 번 더 돈다 | `planRetry`는 `pending`을 열린 행으로 본다(AS-IS `JF-1.1`) | 잃는 것은 재시도 1회다. 다시 맡긴 실행과 겹치지는 않는다 — 회신 재시도 창(최악 27초)이 재시도 첫 대기(30초)보다 짧다. 키 저장은 보류 |
| `C-02` | 미확정 | 끝난 주기의 다시 발행 | [상위 §9.5](../system-design-to-be.md#95-미확정필요-입력) | 잠정 409 `CYCLE_DONE`. 요구가 생기면 실행 세대를 두는 재발행 계약 |
| `C-04` | 미확정 | 보류한 메일의 해제 | 상위 §9.5 | 해제 계약 없음 — `held` 행으로 알아보기만 한다 |

## 9. 미확인·한계

1. 가상 시스템이다 — 심볼·열·수치는 형식 예시이고 실행·측정한 것이 없다.
2. 유지 영역(재시도 판정, 수신자와 발송, 계획 저장, 틱 ③ 마감 정리)은 다시 열지 않았다 — [AS-IS 상세 §3](../../as-is/details/billing-clock.md#3-내부-job-flow--드릴다운)이 원본이다.
