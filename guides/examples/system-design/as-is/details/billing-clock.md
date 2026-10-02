# billing-clock (:7101) — AS-IS 상세

> **가상의 예시 시스템** — 경로·줄 번호·수치는 형식 예시다. 양식은 [시스템 설계 문서 양식 §5](../../../../system-design-document-guide.md#5-상세-문서-골격)를 따르고, 둘이 다르면 양식을 따른다.
> **대상**: `billing-clock/**`(Kotlin 소스 15파일·1,060줄) · **기준**: 커밋 `5e6f7a8`(가상)·2026.03.02, 작업 트리 clean
> **근거 색인**: [`../../_evidence-brief.md`](../../_evidence-brief.md) · **상위**: [`../system-design-as-is.md`](../system-design-as-is.md) · **짝**: [`invoice-maker.md`](invoice-maker.md)(맡김·생존 확인·회신의 상대)
> **표기**: 내부 흐름은 [`jobflow`](../../../../job-flow-diagram-guide.md), 실행 행 상태는 [`state`](../../../../state-diagram-guide.md)(§4.1)
> **관찰 방법**: 소스 역추출 — 프로세스를 띄우지 않았다. 베어 경로는 `billing-clock/src/main/kotlin/` 기준이고, 설정 파일은 `billing-clock/src/main/resources/clock.conf`다.

## 1. 책임 / 비책임

- **책임**: 20초 틱을 돌린다. 틱마다 ① 발행일이 된 계획의 실행을 만들어 생성기에 맡기고 ② 회신이 없는 실행이 살아 있는지 묻고 ③ 마감을 넘긴 시도를 정리한다. 회신을 받아 실행을 종결하고, 실패면 재시도 여부를 정하고, `closed` 종결 뒤 수신자에게 청구서 메일을 한 번 보낸다. 권위 상태는 `clock.mv.db`(H2 파일 DB) 4표다.
- **비책임**: 청구서 생성(invoice-maker), 보관과 `dedupKey` 덮어쓰기(invoice-archive), 서식이 있는지 확인(`formId` 문자열만 저장한다), 생성 중인 작업 멈추기(**전하지 않는다** — `B-01`).
- **아무도 하지 않는 것**: 같은 주기 실행 막기(`B-02`), 실패한 메일 다시 보내기(`B-03`), 오래된 `runs`·`deliveries` 행 지우기.

## 2. 공개 계약

라우트 11개 — 운영 10(`api/ApiRoutes.kt:18-40`) + 헬스 1(`Main.kt:22`). 인증 처리는 없고 `http.bind = 127.0.0.1:7101`과 admin-console 단일 오리진이 경계다(§6).

| 메서드·경로 | 입력 | 출력 | 오류 | 구현 |
|---|---|---|---|---|
| `GET /api/plans` | — | `{plans: Plan[]}` | — | `api/ApiRoutes.kt:44-47` |
| `GET /api/plans/:planId` | — | `Plan` + `contacts[]` | 404 | `ApiRoutes.kt:49-55` |
| `POST /api/plans` | `{customerGroup[], rates{}, rule, formId, contacts[]}` | 201 `Plan` | 422 `rule`·`contacts` | `ApiRoutes.kt:57-68` |
| `PATCH /api/plans/:planId` | 위 필드 일부, `enabled?` | 200 `Plan` | 404, 422 | `ApiRoutes.kt:70-84` |
| `DELETE /api/plans/:planId` | — | 204 — `enabled=false`로 끈다(행은 남는다) | 404 | `ApiRoutes.kt:86-90` |
| `POST /api/plans/:planId/issue` | — | 202 `{runId}` — 맡김이 실패해도 202 | 404, 409 꺼진 계획 | `ApiRoutes.kt:92-99` |
| `GET /api/runs` | query `state?`·`limit?`(기본 100) | `{runs: Run[]}` | 422 `state` | `ApiRoutes.kt:101-108` |
| `GET /api/runs/:runId` | — | `Run` + `deliveries[]` | 404 | `ApiRoutes.kt:110-116` |
| `POST /api/runs/:runId/stop` | — | `{stopped}` — 이미 `closed`·`dropped`면 `false` | 404 | `ApiRoutes.kt:118-126` |
| `POST /api/replies` | `{runId, outcome, invoiceId?, note?}` | 204 | 422 `outcome` | `ApiRoutes.kt:128-137` |
| `GET /ping` | — | `{ok:true}` | — | `Main.kt:22` |

- 발행 규칙은 `매월 <일> <시:분>` 한 꼴만 받는다 — 일은 1~28, 시각은 24시간제다(`plan/IssueRule.kt:12-40`). 29~31일은 없는 달이 있어 422로 막는다. 시간대는 `clock.zone`(기본 `Asia/Seoul`).
- `POST /api/replies`는 모르는 `runId`에도 204를 돌려주고 로그 1줄만 남긴다. 생성기 쪽에서는 회신이 받아들여졌는지 구별할 수 없다.

## 3. 내부 Job Flow — 드릴다운

**결론**: 조율은 `BillingClock` 클래스가 한다. 틱 세 단계·맡김·종결·재시도 판정이 모두 이 클래스의 메서드이고, HTTP는 `ApiRoutes`가 받아 검사한 뒤 `BillingClock`이나 저장소로 넘긴다. 바깥 호출은 `MakerClient`(invoice-maker), `ArchiveClient`(invoice-archive의 제목·금액), `MailChannel`(Mailer)이 맡는다.

상위 [§5](../system-design-as-is.md#5-흐름--경계끼리-어떻게-소통하나)의 노드가 아래 그림의 시작점이다. 입력·출력·실패 의미가 같다.

**드릴다운 지도**

| 상위 §5 노드 | L1 그림 | L2 이하 |
|---|---|---|
| `Clock.OnTick` → `Maker.make`(§5.1·§5.4) | [`JF-1`](#jf-1-틱-1단계-도래맡김--billingclockstartdueruns) 틱 ① 도래·맡김 | [`JF-1.1`](#jf-11-재시도-판정--billingclockplanretry) 재시도 판정 |
| `Clock.OnTick` → `Maker.peek`(§5.1·§5.5) | [`JF-2`](#jf-2-틱-2단계-생존-확인--billingclockcheckalive) 틱 ② 생존 확인 | 종결은 `JF-3` |
| `Clock.acceptReply` → `Clock.finishRun`, 값 분기 `Clock.finishRun.issued`(§5.1·§5.4·§5.5) | [`JF-3`](#jf-3-종결과-발송-통지--billingclockfinishrun) 종결 | [`JF-3.1`](#jf-31-수신자청구서-정보발송--deliverynotifierdeliver) 메일 발송 — 상위 `Archive.open`·`Mailer.send`로 나가는 그림 |
| `Clock.operate`·`.plans`·`.issueNow`·`.getRun`·`.listRuns`·`.stopRun`(§5.1·§5.3) | [`JF-4`](#jf-4-운영-api--apiroutes) | `issueNow`의 맡김은 `JF-1`과 같은 `handOff` |

상위 바깥 노드 ↔ 이 경계의 클라이언트: `Maker.make` = `MakerClient.make`, `Maker.peek` = `MakerClient.peek`, `Archive.open` = `ArchiveClient.fetchMeta`, `Mailer.send` = `MailChannel.send`.

**표기** 그림의 노드 이름은 코드에 있는 그대로다 — 클래스는 `Class.method`, Kotlin `object`는 선언 이름 그대로(`RetryWaits` = `clock/RetryWaits.kt`, `IssueRule` = `plan/IssueRule.kt`). 줄 번호는 기준 커밋 `5e6f7a8`이다. `Ticker.OnTick`은 타이머 발화 이벤트다 — `Ticker`가 20초마다 등록된 콜백을 부르고, 그 콜백이 `BillingClock.tick`이다. 틱 ③ 마감 정리는 `JF-2`와 협력자가 같아 그림 대신 [§3.1](#31-틱-단계와-마감-정리) 표에 차이를 적었고, 순수 함수 `IssueRule.nextAt`·`IssueRule.cycleOf`는 열지 않는다. `JF-1`·`JF-2` 근거 표의 `단계 #` 열은 §3.1 표의 틱 단계(①·②)다. `Object:` 순서는 [렌더러 배치 특성](../../../../job-flow-diagram-guide.md#렌더러-배치-특성)의 규칙대로다 — 그림마다 첫 줄을 내보내는 트리거(`Ticker`·`ApiRoutes` 등)는 다시 불리지 않으므로 맨 왼쪽(규칙 4)이다. 트리거가 아니면서 요청을 둘 이상 내보내는 객체는 `JF-1`의 `BillingClock`(3건)뿐이라 그 그림에서만 트리거 다음 자리(규칙 1)이고, 나머지는 처음 호출되는 순서(규칙 2)다. 이 절의 그림 6장은 렌더러로 그려 PNG로 확인했다([브리프 §5](../../_evidence-brief.md#5-검증-기록)).

### JF-1 틱 1단계 도래·맡김 — BillingClock.startDueRuns

```jobflow
orchestrator: BillingClock
Object: Ticker, BillingClock, PlanStore, RunStore, MakerClient

Ticker.OnTick --> BillingClock.startDueRuns
BillingClock.startDueRuns --> PlanStore.listDue
PlanStore.listDue.result --> RunStore.create
RunStore.create --> PlanStore.advance
BillingClock.startDueRuns --> RunStore.listReady
RunStore.listReady.result --> BillingClock.handOff
BillingClock.handOff --> MakerClient.make
MakerClient.make.accepted --> RunStore.markActive
MakerClient.make.error --> BillingClock.planRetry
```

| 노드 | 코드 | 단계 # | 비고 |
|---|---|---|---|
| `Ticker.OnTick` → `BillingClock.startDueRuns` | `tick/Ticker.kt:18-26` → `clock/BillingClock.kt:38-44`(`tick`)·`:46-80` | ① | 이벤트를 받는 `tick`이 ① `startDueRuns` ② `checkAlive` ③ `expireOverdue`를 차례로 부른다. 앞 틱이 끝나야 다음 20초를 잰다(fixed delay) |
| `PlanStore.listDue` → `RunStore.create` | `store/PlanStore.kt:30` → `store/RunStore.kt:24-36` ← `BillingClock.kt:50-58` | ① | 켜진 계획 중 `next_issue_at <= now`. 계획마다 `pending` 행을 새로 만든다 — `cycle`은 `IssueRule.cycleOf`. **같은 주기 행이 있는지 보지 않는다**(`B-02`) |
| `RunStore.create` → `PlanStore.advance` | `PlanStore.kt:44` ← `BillingClock.kt:60` | ① | 행을 만든 **뒤에** 다음 발행 시각을 적는다. 둘 사이에서 프로세스가 멈추면 다음 기동의 첫 틱이 같은 주기 행을 또 만든다(`B-02`) |
| `RunStore.listReady` | `RunStore.kt:52` ← `BillingClock.kt:64` | ① | `pending`이고 `retry_at <= now`인 행. 새 행(`retry_at` = 만든 시각)과 재시도 차례인 행이 같은 질의로 나온다 |
| `BillingClock.handOff` → `MakerClient.make` | `BillingClock.kt:84-104` → `client/MakerClient.kt:20-38` | ① | 상위 `Maker.make`(`POST /api/makes`, 8s). 즉시 발행(`JF-4`)도 이 메서드를 쓴다 |
| `.accepted` → `RunStore.markActive` | `RunStore.kt:60` ← `BillingClock.kt:92` | ① | 202를 받은 **뒤에** `active` + `handed_at` + `due_by`(맡긴 시각 + 150s)를 쓴다. `alreadyRunning:true`도 같은 처리다 |
| `.error` → `BillingClock.planRetry` | `BillingClock.kt:96-100` | ① | 연결 실패·시간 초과·2xx가 아닌 응답. 행은 `pending` 그대로 → [`JF-1.1`](#jf-11-재시도-판정--billingclockplanretry) |

- **트리거** `clock.tick`(20s)마다, 그리고 기동 직후 1회. **완료 사실** 도래한 계획마다 `pending` 행 1개, 맡김에 성공한 행은 `active`.
- 새 실행과 재시도 차례 실행이 `listReady` 한 질의로 모이므로 이 그림에는 합류가 없다. 한 행은 한 틱에 한 번만 맡겨진다 — `listReady`는 `pending`만 고르고, 맡긴 행은 바로 `active`가 된다.
- 맡김이 실패해도 행은 `pending`으로 남고 `retry_at`만 뒤로 밀린다. 생성기가 받지도 않은 시도도 재시도 횟수에 들어간다.

### JF-1.1 재시도 판정 — BillingClock.planRetry

이 메서드를 부르는 곳은 두 군데다 — 맡김이 실패했을 때의 `JF-1`, 종결 값이 `failed`일 때의 `JF-3`. 틱 ③의 마감 정리는 `failed` 값으로 `JF-3`을 지나 여기에 닿는다.

```jobflow
orchestrator: BillingClock
Object: BillingClock, RunStore, RetryWaits

BillingClock.planRetry --> RunStore.get
RunStore.get.ended
RunStore.get.open --> RetryWaits.next
RetryWaits.next.wait --> RunStore.markPending
RetryWaits.next.exhausted --> RunStore.markDropped
```

| 노드 | 코드 | 비고 |
|---|---|---|
| `BillingClock.planRetry` | `BillingClock.kt:150-172` | 인자는 `runId`와 사유 문구(`note`) |
| `RunStore.get` | `RunStore.kt:40` ← `BillingClock.kt:152` | `.ended` = `closed`·`dropped` → 아무것도 바꾸지 않고 로그 1줄 |
| `RetryWaits.next` | `clock/RetryWaits.kt:6-18`(순수 함수) | 이미 쓴 재시도 수 → 대기 30·60·120s, 3회를 다 썼으면 `exhausted`. 실패 사유를 가리지 않는다 |
| `RunStore.markPending`·`.markDropped` | `RunStore.kt:68`·`:76` | `pending` + `retries+1` + `retry_at = now + 대기` / `dropped` + `reason='retry-exhausted'` |

- 재시도를 실제로 맡기는 것은 다음 틱 ①의 `listReady`(`JF-1`)다. 메모리 타이머 없이 `retry_at` 열만 쓰므로 재기동해도 대기가 이어진다.
- 재시도를 다 써서 `dropped(retry-exhausted)`가 된 실행에는 메일을 보내지 않는다. 다만 이 행도 끝난 채로 고정되지 않는다 — 뒤늦게 `issued` 회신이 오면 `JF-3`이 행을 `closed`로 바꾸고 메일을 보낸다.

### JF-2 틱 2단계 생존 확인 — BillingClock.checkAlive

```jobflow
orchestrator: BillingClock
Object: Ticker, BillingClock, RunStore, MakerClient

Ticker.OnTick --> BillingClock.checkAlive
BillingClock.checkAlive --> RunStore.listAliveDue
RunStore.listAliveDue.result --> MakerClient.peek
MakerClient.peek.unreachable
MakerClient.peek.failed --> BillingClock.finishRun
MakerClient.peek.missing --> BillingClock.finishRun
MakerClient.peek.issued --> BillingClock.finishRun
```

| 노드 | 코드 | 단계 # | 비고 |
|---|---|---|---|
| `BillingClock.checkAlive` → `RunStore.listAliveDue` | `BillingClock.kt:110-128` → `RunStore.kt:56` | ② | `active`이고 `handed_at` + 45s(`clock.aliveGrace`)가 지난 행만 |
| `MakerClient.peek` | `MakerClient.kt:42-66` | ② | 상위 `Maker.peek`(`GET /api/makes/:runId`, 4s). 예외를 던지지 않고 다섯 값(`working`·`issued`·`failed`·`missing`·`unreachable`) 중 하나를 돌려준다 |
| `.unreachable` | `BillingClock.kt:124` | ② | 단독 줄 — 이번 틱에는 아무것도 바꾸지 않는다. 행은 `active`로 남아 다음 틱에 다시 질의되고, 그사이 마감이 지나면 틱 ③의 마감 정리가 닫는다. `working`도 같은 처리지만 정상 진행이라 그리지 않았다 |
| `.failed`·`.missing`·`.issued` → `BillingClock.finishRun` | `BillingClock.kt:116-122` | ② | 회신과 같은 꼴의 값을 만들어 종결 입구로 넣는다(`missing` = 404 → `failed`, `note='생성 기록 없음'`) → [`JF-3`](#jf-3-종결과-발송-통지--billingclockfinishrun) |

- **트리거** 매 틱, ①이 끝난 뒤. **완료 사실** 생성기에서는 끝났는데 회신이 오지 않은 실행이 `finishRun`으로 넘어간다. 잃어버린 회신(`C-02`)을 시계가 알아차리는 방법이 이 질의밖에 없어 종결이 최대 65초 늦는다.
- `finishRun`으로 들어오는 화살표 셋은 `peek` 결과 세 값의 합류다. `peek` 한 번은 값 하나만 돌려주므로 셋 중 하나만 실행된다. 질의하는 사이에 회신이 먼저 와서 행을 `closed`로 바꿨다면 이 진입은 `JF-3`의 가드에서 끝난다. 도구의 `JF-RETURN` 경고는 이 합류에서 나오며 round-trip이 아니다.
- 응답이 없을 때 행을 실패로 바꾸지 않는 것은 코드의 선택이다(`BillingClock.kt:124`) — 생성기가 잠깐 응답하지 못하는 것인지 멈춘 것인지 가리지 않고 마감까지 기다린다. 한 틱 안에서 같은 실행을 두 번 묻지 않는 것은 틱이 fixed delay로 겹치지 않아서이고, 따로 둔 메모리 가드는 없다.

### JF-3 종결과 발송 통지 — BillingClock.finishRun

```jobflow
orchestrator: BillingClock
Object: ApiRoutes, BillingClock, RunStore, DeliveryNotifier

ApiRoutes.acceptReply --> BillingClock.finishRun
BillingClock.finishRun --> RunStore.get
RunStore.get.closed
BillingClock.finishRun.failed --> BillingClock.planRetry
BillingClock.finishRun.issued --> RunStore.markClosed
RunStore.markClosed --> DeliveryNotifier.deliver
```

| 노드 | 코드 | 비고 |
|---|---|---|
| `ApiRoutes.acceptReply` | `api/ApiRoutes.kt:128-137` | 상위 `Clock.acceptReply`. `outcome`이 `issued`·`failed`가 아니면 422. 4필드 가운데 판단에 쓰는 것은 `outcome`·`invoiceId`이고, 0원으로 채운 고객이 있었는지는 본문에 없다(`C-03`) |
| `BillingClock.finishRun` → `RunStore.get` | `BillingClock.kt:132-148`·`:134` | 상위 `Clock.finishRun`. 회신 라우트, `JF-2`의 회수, 틱 ③이 모두 이 메서드를 부른다. `.closed` = 이미 성공 종결 → 로그 1줄로 버린다. **`dropped`는 거르지 않는다**(아래 불릿) |
| `finishRun.failed` → `BillingClock.planRetry` | `BillingClock.kt:140` | `failed`·`issued` 칸은 `finishRun`이 받은 `outcome` 값이다 — 가드를 지난 뒤 이 값으로 가른다. `failed` → [`JF-1.1`](#jf-11-재시도-판정--billingclockplanretry) |
| `finishRun.issued` → `RunStore.markClosed` | `RunStore.kt:84` ← `BillingClock.kt:142` | 상위 §5.5의 값 분기 `Clock.finishRun.issued`. `closed` + `invoice_id` + `closed_at`을 쓰고, 앞 상태가 `dropped`여도 덮어쓴다 |
| `DeliveryNotifier.deliver` | `mail/DeliveryNotifier.kt:16-60` ← `BillingClock.kt:146` | 별도 스레드에서 돌리고 기다리지 않는다 → [`JF-3.1`](#jf-31-수신자청구서-정보발송--deliverynotifierdeliver) |

- **완료 사실** 행 `closed`. 메일 발송이 실패해도 `closed`는 그대로다.
- 가드가 `closed`만 거르는 것은 재시도를 다 쓴 실행(`dropped(retry-exhausted)`)이 늦게 `issued`로 끝나면 살려서 보내려는 코드다(`BillingClock.kt:136` 주석). 그런데 중지한 실행(`dropped(stopped)`)도 같은 코드를 지난다 — 생성기가 끝나 `issued`를 회신하면 행이 `closed`로 바뀌고 메일이 나간다(`B-01`).
- `finishRun`은 `@Synchronized`라 회신과 틱이 같은 실행을 동시에 닫지 못한다. 첫 진입이 행을 `closed`로 바꿨다면, 차례로 들어온 두 번째 진입은 `closed` 가드에서 끝난다.

### JF-3.1 수신자·청구서 정보·발송 — DeliveryNotifier.deliver

```jobflow
orchestrator: DeliveryNotifier
Object: DeliveryNotifier, ContactStore, ArchiveClient, MailChannel, DeliveryLog

DeliveryNotifier.deliver --> ContactStore.listFor
ContactStore.listFor.none
ContactStore.listFor.result --> ArchiveClient.fetchMeta
ArchiveClient.fetchMeta.result --> MailChannel.send
MailChannel.send.result --> DeliveryLog.add
```

| 노드 | 코드 | 상위 §5 | 비고 |
|---|---|---|---|
| `ContactStore.listFor` | `store/ContactStore.kt:14` | — | 계획의 `contacts` 행(경계 안). `.none` = 수신자 0명 → 발송 행도 남기지 않고 끝난다 |
| `ArchiveClient.fetchMeta` | `client/ArchiveClient.kt:12-30` | `Archive.open` | `GET /api/invoices/:invoiceId`, 4s → `title`·`total`. 실패면 `null` → 금액 없이 열람 주소만 넣는다 |
| `MailChannel.send` | `mail/MailChannel.kt:20-48` | `Mailer.send` | 수신자마다 SMTP 1회, `mail.timeout`(10s) |
| `DeliveryLog.add` | `store/DeliveryLog.kt:10` | — | 수신자마다 `deliveries` 1행 — `sent`·`failed`와 오류 문구. **다시 보내는 코드가 없다**(`B-03`) |

- **트리거** `JF-3`의 `markClosed` 뒤. **완료 사실** 수신자 수만큼의 `deliveries` 행.
- `send` 화살표 하나는 수신자 수만큼의 호출이다 — 수신자 순서대로 하나씩 보낸다(반복은 본문에만 적는다).
- 한 실행이 두 번 `closed`가 되지는 않지만, 같은 주기 실행이 둘이면 이 그림이 두 번 돌아 메일이 두 번 나간다(`B-02`).

### JF-4 운영 API — ApiRoutes

```jobflow
orchestrator: ApiRoutes
Object: ApiRoutes, IssueRule, PlanStore, BillingClock, RunStore

ApiRoutes.savePlan --> IssueRule.parse
IssueRule.parse.invalid
IssueRule.parse.result --> PlanStore.save
ApiRoutes.issueNow --> BillingClock.issueNow
BillingClock.issueNow.result --> ApiRoutes.issueNow.result
ApiRoutes.getRun --> RunStore.get
ApiRoutes.stopRun --> RunStore.markDropped
```

| 노드 | 코드 | 상위 §5 | 비고 |
|---|---|---|---|
| `ApiRoutes.savePlan` → `IssueRule.parse` | `ApiRoutes.kt:57-84` → `plan/IssueRule.kt:12-40` | `Clock.plans` | POST·PATCH가 같은 처리기를 쓴다. `.invalid` = 422로 끝 |
| `PlanStore.save` | `PlanStore.kt:52-70` | `Clock.plans` | 계획 행과 `contacts` 행을 함께 쓴다. 규칙이 바뀌면 `next_issue_at`을 바로 다시 계산한다 |
| `ApiRoutes.issueNow` → `BillingClock.issueNow` | `ApiRoutes.kt:92-99` → `BillingClock.kt:178-192` | `Clock.issueNow` | `IssueRule.cycleOf(now)`로 주기를 정해 행을 만들고 `handOff`(`JF-1`과 같은 메서드) → 202 `{runId}`. **같은 주기 행이 있어도 만든다**(`B-02`) |
| `ApiRoutes.getRun` → `RunStore.get` | `ApiRoutes.kt:110-116` → `RunStore.kt:40` | `Clock.getRun` | 실행 상세 화면이 5초마다 부른다. `listRuns`는 같은 꼴이라 그리지 않았다 |
| `ApiRoutes.stopRun` → `RunStore.markDropped` | `ApiRoutes.kt:118-126` → `RunStore.kt:76` | `Clock.stopRun` | `pending`·`active`면 `dropped` + `reason='stopped'` → `{stopped:true}` |

- `stopRun` 처리기는 `RunStore.markDropped`를 직접 부른다. 생성기에 중지를 알리는 코드는 이 경계에 없다 — `MakerClient`에는 `make`·`peek` 두 메서드만 있다. 그래서 생성은 끝까지 가고, 끝난 뒤의 `issued` 회신이 `JF-3`에서 행을 `closed`로 바꾼다(`B-01`).
- `issueNow`가 202를 돌려주는 시점은 `handOff`가 끝난 뒤다. 맡김이 실패했어도 응답은 같고, 화면은 실행 상세의 `pending`을 보고서야 안다.

### 3.1 틱 단계와 마감 정리

| 단계 | 함수·줄 | 하는 일 | 그림 |
|---|---|---|---|
| ① 도래·맡김 | `startDueRuns :46-80` | 도래한 계획마다 행 생성 → 다음 발행 시각 → `pending`·`retry_at`이 지난 행 맡김 | `JF-1` |
| ② 생존 확인 | `checkAlive :110-128` | 맡긴 지 45초 지난 `active` → peek → `issued`·`failed`·`missing`은 종결 입구, `working`·응답 없음은 보류 | `JF-2` |
| ③ 마감 정리 | `expireOverdue :196-210` | `due_by <= now`인 `active` → 생성기에 묻지 않고 `failed`(`마감 초과`)로 종결 입구 → 재시도 판정 | 없음 — 종결 입구 진입은 `JF-2`와 같다 |

**주기 계산**: `IssueRule.cycleOf(rule, at)`(`IssueRule.kt:48-66`)은 기준 시각이 속한 달의 **앞 달**을 `YYYY-MM`으로 돌려준다(3월 5일 발행 → `2026-02`). 즉시 발행도 같은 함수를 쓰므로, 3월에 누른 「지금 발행」은 날짜와 상관없이 3월 정기 실행과 주기가 같다(`B-02`).

## 4. 소유 상태·데이터

`clock.mv.db`(H2 파일 DB) 4표 — DDL은 `resources/schema.sql:1-48`이고, 기동 때 `CREATE TABLE IF NOT EXISTS`만 돌 뿐 마이그레이션 도구는 없다.

| 표 | 주요 열 | 비고 |
|---|---|---|
| `plans` | `plan_id`, `customer_group_json`, `rates_json`, `rule`, `form_id`, `enabled`, `next_issue_at` | 삭제 라우트는 `enabled=false`만 쓴다 — 행은 남는다 |
| `runs` | `run_id` PK, `plan_id`, `cycle`, `state`, `reason`, `retries`, `retry_at`, `handed_at`, `due_by`, `invoice_id`, `note` | 색인 `(state, retry_at)`·`(plan_id)` — **`(plan_id, cycle)` 유니크 없음**(`B-02`) |
| `contacts` | `plan_id`, `email`, `name` | 계획 저장 때 통째로 바꾼다 |
| `deliveries` | `run_id`, `email`, `result`(`sent`·`failed`), `error`, `at` | 메일 실패 기록은 이 표에 남는다(`B-03`) |

쓰기 주체는 이 프로세스 하나다. 문장마다 자동 커밋이라 틱 ①의 「행 생성 → 다음 발행 시각 → 맡김 → `active`」는 서로 묶이지 않은 쓰기 넷이다.

### 4.1 실행 행 상태 기계

`runs.state`를 쓰는 것은 이 프로세스뿐이다. 열린 상태는 `pending`·`active`, 끝난 상태는 `closed`·`dropped`이고, `dropped`의 까닭은 `reason`(`retry-exhausted`·`stopped`)에 남는다.

```state
<s> --> (pending)
(pending) --> (active) : 맡김 202
(active) --> (pending) : 재시도 남음
(active) --> (dropped) : 재시도 소진
(pending) --> (dropped) : 맡김 실패로 소진 또는 중지
(active) --> (dropped) : 중지
(pending) --> (closed) : issued 종결
(active) --> (closed) : issued 종결
(dropped) --> (closed) : 늦은 issued 회신
(closed) --> <e>
(dropped) --> <e>
```

**기호**: `<s>` 시작점, `(…)` 상태, `<e>` 행의 수명이 끝나는 곳, `A --> B : 글` A에서 B로 가는 전이와 그 조건.

- 초기화: 행은 `pending`, `retries=0`, `retry_at=만든 시각`으로 생긴다. `pending → active`는 첫 맡김과 재시도 모두이고, 그때마다 `due_by`를 다시 잡는다. `pending → closed`는 마감 정리 뒤 재시도를 기다리는 사이에 첫 시도의 `issued` 회신이 온 경우다.
- 불변조건(코드가 지키는 것): `closed`는 되돌아가지 않는다(`JF-3` 가드). `dropped`는 끝난 상태지만 `issued` 회신 하나로 `closed`가 될 수 있다 — 중지가 마지막 상태가 아니다(`B-01`).

## 5. 의존 — 나가는 방향

| 상대 | 쓰는 계약 | 배선·설정 | 타임아웃 | 결합 |
|---|---|---|---|---|
| invoice-maker | `POST /api/makes`, `GET /api/makes/:runId` | `maker.url`(기본 `http://127.0.0.1:7102`) | 8s, 4s(상수) | 레코드 `phase` 3값과 404의 뜻. 회신 주소는 생성기 쪽 설정이다 |
| invoice-archive | `GET /api/invoices/:invoiceId` → `title`·`total` | `archive.url`(기본 `:7104`) | 4s | 2필드. 실패하면 금액 없이 보낸다 |
| Mailer | SMTP | `mail.host`, `mail.from` | `mail.timeout`(10s) | 재시도 없음(`B-03`) |

## 6. 실패 경계

| 항목 | 기본값 | 설정 키 | 위치 |
|---|---|---|---|
| 틱 간격 | 20s(fixed delay) | `clock.tick` | `clock.conf:3` |
| 생존 확인 유예 | 45s | `clock.aliveGrace` | `clock.conf:4` |
| 마감 | 150s | `clock.deadline` | `clock.conf:5` |
| 재시도 | 3회, 30·60·120s | `clock.retryWaits` | `clock.conf:6`, `RetryWaits.kt:6-18` |
| 맡김 / 생존 확인 요청 | 8s / 4s | 없음(상수) | `MakerClient.kt:12-13` |
| 청구서 정보 조회 | 4s | 없음(상수) | `ArchiveClient.kt:10` |
| 메일 | 10s, 재시도 없음 | `mail.timeout` | `clock.conf:11` |

- **인증**: 인증 코드가 없다 — 루프백 주소에 바인딩하는 것으로 바깥 접근을 막는다. `POST /api/replies`도 부르는 쪽을 확인하지 않는다. 배포 환경의 접근 통제는 확인 범위 밖이다(§9).
- **동시성**: 틱은 한 스레드에서 겹치지 않고 돈다. `finishRun`은 `@Synchronized`지만 `stopRun`은 그 잠금 밖에서 행을 쓴다 — 같은 순간의 중지와 종결은 나중에 쓴 쪽이 남는다. 마감 150s는 생성기의 단계 한도 합 150s와 같다(`C-01` — 원본은 [invoice-maker §8](invoice-maker.md#8-이슈)).
- **최후 방어**: 틱 안의 예외는 `Ticker.kt:30-34`가 잡아 로그 1줄을 남기고 다음 틱으로 넘어간다.

## 7. 검증 경계

`./gradlew test`(JUnit 5). **가상 예시라 실행 기록이 없다** — 아래 「무엇을 보장하나」는 테스트 소스를 읽은 모양이고, 실제 문서는 돌린 결과만 (`사실·실행`)으로 적는다.

| 테스트 | 무엇을 보장하나 | 실행 결과 |
|---|---|---|
| `TickerTest` | ①②③ 호출 순서, fixed delay(틱이 겹치지 않음) | 미실행 |
| `StartDueRunsTest` | 행 생성 뒤 다음 발행 시각, `listReady`가 새 행과 재시도 행을 함께 고름 | 미실행 |
| `RetryWaitsTest` | 대기 30·60·120s, 네 번째에 `exhausted` | 미실행 |
| `FinishRunTest` | `closed` 가드, `issued` → 메일 시작, `failed` → 재시도 판정 | 미실행 |
| `IssueRuleTest` | 규칙 형식 422의 경계(일 28·29), `cycleOf`가 앞 달을 돌려줌 | 미실행 |

**없는 테스트**: 같은 주기 실행 둘(`B-02`), 메일 실패 뒤 재발송(`B-03`), 중지한 실행에 온 `issued` 회신(`B-01` — `FinishRunTest`는 `dropped` 행을 다루지 않는다).

## 8. 이슈

| ID | 분류 | 내용 | 근거 | 영향 |
|---|---|---|---|---|
| `B-01` | 정합성 | 중지가 생성기에 전해지지 않는다 — `stopRun`은 실행 행만 `dropped(stopped)`로 쓰고 생성기를 부르지 않으며, 종결 가드는 `dropped`를 거르지 않는다 | `api/ApiRoutes.kt:118-126`, `client/MakerClient.kt`(중지 메서드 없음), `clock/BillingClock.kt:134-142` | 생성이 계속돼 청구서가 보관되고, 끝난 뒤의 `issued` 회신이 행을 `closed`로 바꿔 메일까지 나간다. 실행 목록에는 「중지됨」이 잠시 보였다가 「완료」로 바뀐다 |
| `B-02` | 중복 | 같은 주기 실행을 막는 키가 없다 — `runs`에 `(plan_id, cycle)` 유니크가 없고, 틱 ①과 즉시 발행 어느 쪽도 같은 주기 행을 찾지 않는다 | `resources/schema.sql:20-36`, `BillingClock.kt:50-60`, `BillingClock.kt:178-192` | 같은 달에 「지금 발행」을 누르거나 틱 ①이 행 생성과 다음 발행 시각 사이에서 멈추면 실행이 둘이 된다. 청구서는 `dedupKey` upsert로 하나만 남지만 메일이 두 번 나간다 |
| `B-03` | 계약공백 | 메일 재시도가 없다 — 실패는 `deliveries` 행에만 남는다 | `mail/DeliveryNotifier.kt:40-52`, `store/DeliveryLog.kt:10` | 일시 장애에 걸린 수신자는 그 주기 청구서 메일을 받지 못한다. 다시 보내는 라우트도 화면도 없다 |

## 9. 미확인·한계

1. **런타임·테스트 미실행** — 틱 시각, 회신 유실 뒤 회수 지연, 마감 경합은 코드상 예상이고, §7은 테스트 소스를 읽은 것이다.
2. **배포 환경** — 루프백 바깥의 접근 통제는 보지 않았다. 프로세스 수는 `ops/compose.yaml`의 선언 1개만 확인했다([브리프 §1.3](../../_evidence-brief.md#13-문서-대조-기준선)).
3. **Mailer 쪽 수신 확인** — 반송·수신 거부는 이 경계가 받지 않는다.
