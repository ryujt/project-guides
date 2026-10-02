# Job Flow Diagram Guide

## 적용 범위와 읽는 순서

한 시나리오에서 **누가 흐름을 조율하고 어떤 공개 계약으로 협력하는가**를 표현한다. 화살표 수나 객체 수를 줄이는 것보다, 다른 조각의 구현을 열지 않고 흐름을 설명할 수 있는지가 중요하다. 경계·계약·분해 중단 기준은 [module-boundary-guide.md](module-boundary-guide.md)를 따른다.

먼저 헤더와 핵심 원칙을 읽고, 작업에 필요한 반환·분기·이벤트 예시만 선택한다. 아래 짧은 블록은 문법 조각이며, 실제 시나리오에는 헤더, 객체 목록, 트리거, 완료/실패 조건을 함께 적는다. 전체 시스템의 모든 흐름을 먼저 작성할 필요는 없다.


## 헤더 키워드 — `orchestrator:` vs `scope:`

jobflow 다이어그램의 첫 줄은 **실제 조율자 또는 관찰 경계**를 선언한다. 두 키워드와 화살표의 의미는 이 가이드에서 정의하며, 설계 단계별 적용은 [method-R.md](./method-R.md)를 참고한다.

| 키워드 | 의미 | 흐름 제어 | 사용 단계 |
|---|---|---|---|
| `orchestrator: X` | X 가 시나리오의 흐름을 능동적으로 조율하는 객체다. 다른 객체의 메서드를 직접 호출하거나 이벤트를 구독해 다음 단계를 결정한다. | **있음** (X 가 함) | 시스템 설계의 Orchestration 모드, 모듈 설계, 상세 설계 (재귀 Sub-Orchestrator) |
| `scope: X` | X는 관찰하는 **경계**다. 이 그림에서는 내부의 단일 흐름 조율자를 선언하지 않는다. 내부 제어를 숨긴 매크로 관점이나 독립 서비스 간 협력에 쓴다. | 이 관점에서 선언하지 않음 | 매크로 설계 (시스템 경계), 서비스 간 직접 요청·응답, Choreography |

핵심은 **이 다이어그램이 실제 단일 조율자의 내부 협력을 보여 주는가**다. 그러면 `orchestrator:`, 관찰 경계의 입출력만 보이거나 중앙 조율자 없는 협력이면 `scope:`를 쓴다. `scope:`라고 해서 숨겨진 내부에 조율자가 없다는 뜻은 아니다.

기본 구성 요소와 결과 배치 규칙은 두 모드에 공통이다. `scope:`의 직접 요청·응답과 이벤트 전달은 [scope에서 요청·응답과 이벤트 읽기](#scope에서-요청응답과-이벤트-읽기)를 따른다. 그 뒤의 내부 협력 예시는 별도 표시가 없으면 `orchestrator:` 관점이다. `scope:` 자체가 Choreography나 비동기 처리를 뜻하지는 않는다.

### 문서 의미와 렌더러 지원

`orchestrator:`와 `scope:`는 이 가이드 모음의 기존 Method-R 의미 표기다. [tools-camp-markdown-guide.md](tools-camp-markdown-guide.md)는 별도로 `master:` 헤더를 기술한다. 이 가이드 모음에는 대상 렌더러 소스가 포함되어 있지 않으므로 현재 제품 전체의 지원 여부를 이 문서만으로 단정하지 않는다. 별도로 확인한 tools.camp `d12f230` 스냅샷은 `master:`만 파싱하고 `orchestrator:`/`scope:`의 제어 의미를 해석하지 않는다. 단순 이름 헤더를 무시해도 관계 그림은 생성되므로 생성 성공을 헤더 지원으로 오해하지 않는다. 정확한 확인 범위는 [문법 레퍼런스의 구현 확인 기록](tools-camp-markdown-guide.md#확인한-구현-스냅샷)을 참고한다.

새 문서는 제어 주체에 맞게 `orchestrator:` 또는 `scope:`를 선택한다. 기존 `master:` 문서는 먼저 주변 설명과 코드에서 제어 주체를 확인한다. 렌더링을 위해 헤더를 바꿔야 한다면 대상 구현에서 지원을 확인하고 의미를 본문에 유지한다. 특히 `scope:`를 `master:`로 기계적으로 바꿔 중앙 조율자가 존재하는 것처럼 설명하지 않는다. 확인한 버전에서는 `Object:` 목록과 코드펜스 밖 조율자/경계 설명을 함께 제공해야 읽는 사람이 의미를 알 수 있다. 헤더만으로 구현의 의존성이나 실행 방식이 보장되지는 않는다.

### 렌더러 배치 특성

`JobFlowToSVG`는 `parseJobFlow`·`generateSVG`를 가진 같은 이름의 객체를 `export default`로 내보내는 단일 파일 jobflow 렌더러다. 앞 절의 tools.camp 스냅샷과 같은 `JobFlowToSVG` 계열 구현의 다른 사본(407줄, SHA-256 `7c59cb04a948619554b423f7514e528e18707a7e7e19e862083cc1cfd88050d5`)을 2026-10-02에 읽고, Node `v22.19.0`으로 SVG를 만든 뒤 `rsvg-convert`로 바꾼 PNG를 눈으로 확인했다. 아래 결과는 이 사본에 한정하며 tools.camp 스냅샷이나 다른 버전의 동작을 보장하지 않는다. SVG 생성과 PNG 변환까지만 확인했고, 브라우저나 문서 변환 도구 안의 표시는 확인하지 않았다.

| 항목 | 확인한 동작 | 작성 시 의미 |
|---|---|---|
| 헤더 | `master:`만 값으로 읽고 SVG에는 쓰지 않는다. `orchestrator:`·`scope:`는 값에 `.`이 있어도 무시한다 | 조율자·경계는 `Object:`와 블록 밖 설명으로 밝힌다(앞 절과 같다) |
| 객체와 액션 | 첫 `.`에서 객체와 액션을 가르고, 열은 `Object:`에 적은 객체로만 만든다 | 객체 이름에 `.`을 넣지 않는다. 화살표에 쓴 객체는 모두 `Object:`에 적는다(빠지면 아래처럼 깨진다) |
| 표시 글자 | 액션의 마지막 조각만 쓴다(`Orders.listUnbilled.result`→`result`) | 결과·분기 칸이 어느 호출의 것인지는 위치로만 보인다 → [메서드와 결과의 배치](#메서드와-결과의-배치) |
| 모양 | 마지막 조각이 `on`으로 시작하면 대소문자와 상관없이 이벤트 모양으로 그리고 앞 두 글자를 지운다 | 이벤트가 아닌 액션은 `on`·`On`으로 시작하는 이름을 피한다(아래) |
| `.result.` | 입력 전체의 `.result.`를 `.data.`로 바꾼 뒤 읽는다 | 끝의 `.result`는 그대로다. 표시 글자는 마지막 조각이라 달라지지 않는다 |
| 다시 나오는 노드 | 같은 이름이 타깃으로 다시 나오면 새 칸에 그린다. 출발점은 마지막 칸을 다시 쓴다(조건은 아래) | 같은 열의 같은 이름 칸은 같은 계약이다. 칸 수로 호출 횟수를 세지 않는다 → [합류와 재호출 구분](#합류와-재호출-구분) |
| 행 배치 | 줄 순서대로 아래로 쌓지만, 이미 그린 칸에서 다시 나가는 화살표의 타깃은 앞 행 빈칸에 끼어들 수 있다(아래 예) | 렌더 결과에서 시간 순서와 화살표가 닿는 칸을 확인하고, 흐트러지면 아래 `Object:` 순서 규칙을 따른다 |

표의 세부는 다음과 같다.

- **미선언 객체**: 열이 없어 그 칸의 좌표가 `NaN`이 된다. 같은 미선언 객체가 화살표 양쪽에 오거나 미선언 칸에서 화살표가 두 번 나가면 `TypeError`로 그림 생성이 멈췄다.
- **모양**: 이벤트는 둥근 모서리, 액션에 `.`이 더 있으면(`charge.result`·`Charge.Approved`) 양옆 세로줄의 데이터 모양, 나머지는 사각형이다. `onTick`·`OnTick`은 의도대로 이벤트 `Tick`이 되지만 `oneShotSession`은 이벤트 모양의 `eShotSession`, `online`은 `line`으로 그려진다. 이런 이름은 `startOneShotSession`처럼 동사를 앞에 붙여 `on`으로 시작하지 않게 한다.
- **출발점**: 같은 이름의 마지막 칸 아래 같은 열이 비어 있으면 그 칸에서 다시 나간다. 그 아래에 다른 칸이 생긴 뒤에는 맨 아래 새 행에 같은 이름 칸을 새로 그린다. 예외는 바로 앞 줄의 타깃이 그 이름일 때로, 그 칸의 행에서 출발한다(그 행의 가로 경로가 막히면 맨 아래 새 행). 합류 뒤 화살표가 마지막에 그린 같은 이름 칸에서 나가는 것도 이 규칙 때문이다([합류와 재호출 구분](#합류와-재호출-구분)).
- **행 배치**: 이미 그린 칸에서 나가는 화살표의 타깃은 그 칸의 행(처음 나갈 때)이나 바로 아래 행(다시 나갈 때)부터 내려가며, 타깃 칸과 가로 경로가 빈 첫 행에 놓인다. 그래서 뒤 줄의 타깃이 경로가 비어 있던 앞 행에 들어간다. 요청자가 오른쪽으로 여러 번 보낸 뒤 왼쪽으로 보내는 타깃이 그렇다(아래 예).
- **다른 칸에 붙는 화살표**: 바로 다음 줄이 끼어든 칸에서 출발해 「출발점」의 예외가 적용되면 타깃도 그 행에 놓는데, 타깃 자리가 비었는지는 보지 않는다. 그래서 그 자리에 이미 다른 칸이 있으면 화살표가 그 칸에 붙고 원래 타깃 칸은 그려지지 않았다.

요청자 `Billing`을 둘째 열에 두고 네 요청을 줄 순서대로 쓴 예:

```jobflow
scope: 월말 청구 1건
Object: Orders, Billing, Payments, Mailer
Billing.closeMonth --> Orders.listUnbilled
Billing.closeMonth --> Payments.charge
Billing.closeMonth --> Mailer.sendInvoice
Billing.closeMonth --> Orders.markBilled
```

이 사본은 넷째 줄의 `markBilled`를 둘째 줄의 `charge`와 같은 행, 셋째 줄의 `sendInvoice`보다 위에 그렸고, 두 화살표가 한 가로선으로 이어져 `markBilled`와 `charge` 사이의 화살표처럼 보였다. `Object:`를 `Billing, Orders, Payments, Mailer`로 바꿔 요청자를 맨 왼쪽에 두자 네 타깃이 줄 순서대로 한 행씩 내려갔다.

**`Object:` 순서 규칙**: 처음 쓸 때 이 순서로 두고, 렌더 결과가 흐트러지면 이 순서로 고친다. 규칙 3·4는 규칙 1보다 먼저다. 아래에서 트리거는 흐름을 시작하는 객체다 — 첫 줄을 내보내는 객체, 그리고 어떤 화살표의 타깃도 되지 않으면서 요청을 내보내는 객체.

1. 요청을 둘 이상 내보내는 객체 가운데 가장 많이 내보내는 객체를 맨 왼쪽에 둔다.
   - 요청 화살표만 센다. `.result`·값 분기에서 나가는 화살표와 같은 객체 안 화살표는 세지 않는다.
   - 수가 같으면 줄 순서상 먼저 요청을 내보내는 객체를 왼쪽에 둔다.
2. 나머지는 처음 호출되는 순서대로 오른쪽에 둔다.
3. 트리거를 다시 부르는 요청(콜백)이 앞 줄에 이미 나온 노드에서 나가면 트리거를 맨 오른쪽에 둔다. 트리거를 맨 왼쪽에 두면 콜백이 왼쪽으로 가는 타깃이 되어 위 `markBilled`처럼 앞 행에 끼어들 수 있다.
   - 콜백이 처음 나오는 노드나 바로 앞 줄의 타깃에서 나가면 이 규칙을 쓰지 않는다. 그 화살표는 맨 아래 행이나 바로 앞 타깃의 행에서 그려져 앞 행으로 끼어들지 않는다(위 「출발점」).
   - 이때 트리거를 맨 오른쪽에 두면 오히려 트리거가 내보내는 다른 요청이 왼쪽으로 가며 앞 행에 끼어들 수 있다(아래 예).
4. 규칙 3을 쓰지 않는 트리거는 맨 왼쪽에 둔다. 타이머·브라우저처럼 다시 호출되지 않는 트리거가 대표적이다. 그런 트리거가 여럿이면 먼저 요청을 내보내는 것부터 왼쪽에 둔다.
5. 트리거가 여럿인 그림은 이 규칙을 출발점으로 삼아 손으로 고쳐도 된다. 고른 순서와 이유는 그림 아래 설명에 적는다. 모든 경계의 소통을 한 장에 모은 그림(설계 문서의 [전체 한 장](system-design-document-guide.md#42-전체-한-장과-시나리오-분할))은 배치 때문에 나누지 않는다.

규칙대로 두어도 흐트러지면 먼저 트리거를 반대쪽 끝으로 옮겨 본다. 그래도 흐트러지면 블록을 나눈다. 규칙 5의 한 장 그림은 나누지 않고 순서를 손으로 고른다.

트리거 `Billing`이 요청을 둘 내보내고, 콜백 `recordPaid`가 바로 앞 줄의 타깃 `charge`에서 나가는 예(규칙 3을 쓰지 않고 4를 따른다):

```jobflow
scope: 월말 청구 1건
Object: Billing, Orders, OrderDB, Payments
Billing.closeMonth --> Orders.listUnbilled
Orders.listUnbilled --> OrderDB.select
Orders.listUnbilled --> OrderDB.lock
Billing.closeMonth --> Payments.charge
Payments.charge --> Billing.recordPaid
```

이 사본은 이 순서에서 다섯 화살표를 줄 순서대로 위에서 아래로 그렸다(이어진 첫 두 줄은 한 행). `Billing`을 맨 오른쪽으로 옮기자 `charge`가 `select`와 같은 행, `lock`보다 위 행에 그려졌다.

규칙 1의 「둘 이상」과 규칙 3의 조건은 이 사본으로 그려 보고 정했고, 규칙 4의 효과도 같은 방법으로 확인했다. 한 호출의 하위 요청을 그 호출 바로 뒤에 쓴 흐름(객체 7개 이하, 줄 11개 이하)을 무작위로 수천 개 만들고, 흐름마다 가능한 `Object:` 순서를 모두 그려 규칙대로 둔 순서와 견줬다. 규칙대로 둔 순서가 흐트러진 흐름도 다른 순서로는 모두 그릴 수 있었다. 그 상당수는 트리거를 반대쪽 끝으로 옮기기만 해도 맞았다.

근거 함수는 `parseJobFlow`·`parseAction`(헤더·객체·액션), `getShapeType`·`getDisplayText`(모양·글자), `generateSVG`(칸·행 배치)다. `addAsterisksToInput`가 되풀이되는 마지막 조각에 붙이는 `*`는 칸을 찾는 키(`normalizeAction`)와 표시 글자에서 다시 지워진다. 같은 이름 칸을 새로 그리는 것은 `generateSVG`의 배치 규칙 때문이다. [문법 레퍼런스](tools-camp-markdown-guide.md#6-jobflow-다이어그램)는 관계식에 나온 객체가 열로 자동 추가된다고 적지만 이 사본은 `Object:`의 객체만 열로 만든다. 버전마다 다를 수 있으므로 객체를 모두 `Object:`에 적고, 공유하기 전에 대상 렌더러로 그려 본다.

## 기본 규칙

### 기본 구조

```jobflow
orchestrator: [오케스트레이터 객체]
Object: [객체1], [객체2], [객체3], ...
```

* **orchestrator**: 프로세스 흐름을 제어하는 오케스트레이터 객체
* **Object**: 다이어그램에 등장하는 모든 객체 목록 (orchestrator 포함)

단일 조율자를 선언하지 않는 관점에서는 첫 줄에 `scope: [관찰 경계]`를 쓴다. `Object:`에는 실제로 요청하거나 응답하고 이벤트를 전달하는 객체·서비스를 나열한다. 관찰 경계의 이름만으로 호출 객체가 생기는 것은 아니다.

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
| 경계 메시지 | `Object.message.MessageName` | 해당 객체가 보내거나 받는 메시지 |
| 반환값 | `Object.Method.result` | 메서드 반환값 |
| 이벤트 반환값 | `Object.OnEventName.result` | 반환 계약이 있는 요청 이벤트가 요청자에게 돌려주는 값 ([예시](#이벤트가-반환값을-갖는-경우)) |
| 조건값 | `Object.Method.value` | 분기 조건 |
| 무시 분기 | `Object.Method.value` 단독 줄 (화살표 없음) | 그 분기 뒤로 그린 객체 사이의 후속 화살표가 없음 — §무시 분기 표기 |

### 제한 사항

* 객체 내부 프로세스는 표시하지 않는다 (필요시 `Public → Private` 한 단계만 허용).
* 메서드 파라미터는 표기하지 않는다.
* 확인한 tools.camp `d12f230`의 jobflow는 ` : 라벨`을 전이 라벨로 분리하지 않고 액션 문자열의 일부로 읽는다. 분기는 아래 `.true`/`.false`/값 경로로 쓰고 설명은 블록 밖에 적는다. navigation/state의 라벨 문법을 jobflow에 가져오지 않는다.

### 표시할 결과 선택

흐름을 이해하는 데 필요한 결과만 표시한다. 다음 메서드의 입력, 다음 동작을 결정하는 분기값, 요청 콜백의 `await` 이후 처리를 이어가는 값, 시나리오에서 중요한 외부 응답이 해당한다. 호출자가 사용하지 않는 반환값과 예제 목적에 필요 없는 최종 반환 전달은 생략한다. 생략했다고 실제 코드에 반환값이 없거나 처리가 끝나지 않았다는 뜻은 아니다.

`A.Method.result --> Orchestrator.Run.result`처럼 결과에서 결과로 잇는 표기는 **A의 값을 Orchestrator의 호출자에게 그대로 반환한다**는 뜻이다. 그 전달 자체를 보여 줄 필요가 있을 때만 쓴다. 모든 메서드에 반환 노드를 붙여야 하는 것은 아니며, `.result`를 단순 종료 표시로 쓰지 않는다. 요청 콜백의 응답이나 API 응답처럼 값의 수신·소비가 중요한 흐름은 이 표기를 유지할 수 있다.

### 메서드와 결과의 배치

**표시가 필요한 결과에 한해** 메서드 호출과 그 호출의 반환·분기를 같은 묶음으로 연속 작성한다. 그림에서도 반환값·분기값은 해당 메서드 바로 아래에 모여야 어느 호출의 결과인지 알 수 있다. 관계없는 메서드나 다른 분기를 사이에 끼워 넣고 `.result`들을 블록 끝에 모으지 않는다.

```jobflow
orchestrator: Orchestrator
Object: Orchestrator, Reader, Converter
Orchestrator.Run --> Reader.Read
Reader.Read.result --> Converter.Convert
```

이 그림은 `Read`의 값을 `Convert`에 전달하는 관계만 보여 준다. `Convert` 이후의 결과 소비는 예제 목적에 없으므로 반환 노드를 덧붙이지 않는다.

후속 메서드의 결과도 표시해야 한다면 그 처리까지 이어 쓴 다음 다른 분기로 넘어간다. 중첩 호출의 최종 반환은 하위 처리가 끝난 뒤에 연결하며, 배치를 맞추기 위해 아직 끝나지 않은 메서드가 먼저 반환하는 것처럼 그리지 않는다. 필요한 결과만 남겨도 호출·결과의 대응이 흐려지면 성공·거절·실패 같은 경로별 블록으로 나눈다.

선언 순서만으로 모든 렌더러의 배치를 보장할 수는 없다. 대상 렌더러가 있으면 실제 그림에서 메서드와 결과가 인접하는지 확인한다. 렌더러가 없으면 호출·결과의 연속 선언과 대응 관계를 정적으로 확인했다고 기록한다.

## scope에서 요청·응답과 이벤트 읽기

`scope:`에서는 화살표의 양 끝이 실제 요청자·제공자 또는 이벤트 발행자·수신자다. 선언하지 않은 상위 조율자가 대신 연결한다고 해석하지 않는다.

```jobflow
scope: 배송정보조회
Object: 주문서비스, 배송서비스
주문서비스.배송정보조회 --> 배송서비스.배송조회
배송서비스.배송조회.result --> 주문서비스.배송정보조회.result
```

주문서비스가 배송서비스의 공개 조회 API를 요청하고, 받은 배송정보를 자신의 호출자에게 반환하는 흐름이다. 이 예시에서는 외부 응답의 출처를 보여 주기 위해 결과 간 전달을 표시했다. `.result`는 해당 메서드의 응답이며, 실행 중인 메서드 이름으로 다시 연결해 재호출처럼 표현하지 않는다. 응답을 받은 뒤 내부에서 가공하는 경우에는 그 사실을 본문에 적고, 시나리오에서 중요한 최종 응답만 표시한다. 공개된 별도 후처리 메서드를 실제로 호출할 때만 그 메서드로 화살표를 잇는다.

이벤트도 실제 전달 경로를 적는다. `발행자.OnEvent --> 소비자.HandleEvent`는 소비자가 이벤트를 수신해 처리한다는 뜻이다. 수신 경계의 메시지를 보여 주는 경우에는 `소비자.message.MessageName`으로 표시하고, 실제 핸들러 호출을 보여 주는 경우에는 메서드명을 쓴다. 브로커를 통해 전달하는 구조를 보여 줄 필요가 있으면 발행자 → 브로커 → 소비자를 명시한다. 일반 알림 이벤트의 처리 완료를 반환값으로 가정하지 않는다. 결과를 돌려주는 계약은 [이벤트 반환값](#이벤트가-반환값을-갖는-경우)으로 표현하고, HTTP 응답이 접수 확인인지 업무 결과인지는 해당 계약에 적는다. 전송 방식과 동기·비동기는 헤더만으로 결정되지 않는다.

### scope 그림의 출발점은 실제 요청자다

`scope:`에서는 선언하지 않은 조율자가 결과를 넘겨 준다고 읽지 않으므로 화살표의 출발점이 곧 요청자다. `orchestrator:`에서 `A.m.result --> C.n`은 "조율자가 A의 결과를 C에 넘긴다"로 읽지만, `scope:`에서는 **A가 C를 부르는 것**으로 읽힌다. 실제로는 B가 A의 응답을 받아 C를 부른다면, 존재하지 않는 A→C 연결이 그림에 생긴다.

- 실제 요청자 B의 실행 노드(예: `B.run`)에서 출발시킨다. `B.run --> A.m` 다음 줄에 `B.run --> C.n`처럼 같은 출발 노드에서 줄 순서대로 쓴다. 줄 순서가 시간 순서다.
- B가 앞 응답을 가공해 다음 요청을 만드는 일은 B 경계 안의 일이라 그리지 않는다. "앞 응답이 다음 요청의 입력"이라는 사실은 그림 아래 표나 불릿에 적는다.
- 결과 화살표의 머리가 그 요청을 보낸 원 요청자이면 그대로 쓴다. 받은 응답을 자기 호출자에게 돌려주는 경우(위 배송 예시), 응답을 받은 원 요청자의 다음 동작(화면 표시·다음 요청)으로 잇는 경우, 요청자의 별도 공개 동작을 실제로 부르는 경우가 그렇다. 머리가 제3자인 결과 화살표만 고친다.
- 요청이 내용을 바꾸지 않는 관통 프록시를 지나면, 응답 화살표는 프록시 칸을 생략하고 원 요청자에게 바로 이을 수 있다. 프록시 앞의 원 요청자는 제3자가 아니다. 프록시가 응답을 바꾸지 않는다는 사실은 그림 아래 표나 불릿에 적는다.

> 잘못된 예 — 응답을 다음 경계로 이어 그려 Orders가 Payments를, Payments가 Mailer를 부르는 것처럼 읽힌다:
> ```jobflow
> scope: 월말 청구 1건
> Object: Billing, Orders, Payments, Mailer
> Billing.closeMonth --> Orders.listUnbilled
> Orders.listUnbilled.result --> Payments.charge
> Payments.charge.result --> Mailer.sendInvoice
> ```

올바른 예 — 세 요청을 모두 Billing이 보낸다:

```jobflow
scope: 월말 청구 1건
Object: Billing, Orders, Payments, Mailer
Billing.closeMonth --> Orders.listUnbilled
Billing.closeMonth --> Payments.charge
Billing.closeMonth --> Mailer.sendInvoice
```

- 미청구 주문으로 청구액을 계산하고 청구 결과로 메일 내용을 만드는 일은 Billing 내부라 그리지 않았다.
- 세 요청을 모두 내보내는 Billing을 `Object:` 맨 왼쪽에, 나머지를 처음 호출되는 순서대로 두었다([렌더러 배치 특성](#렌더러-배치-특성)의 `Object:` 순서 규칙).

관통 프록시를 지난 응답을 원 요청자의 다음 동작으로 이은 예:

```jobflow
scope: 주문 상세 보기
Object: Browser, Storefront, Orders
Browser.openOrder --> Storefront.proxyOrders
Storefront.proxyOrders --> Orders.getOrder
Orders.getOrder.result --> Browser.showOrder
```

- `Storefront.proxyOrders`는 요청과 응답을 바꾸지 않고 넘기는 관통 프록시다. 응답도 Storefront를 지나지만 그 칸을 생략하고, 원 요청자 Browser의 다음 동작 `showOrder`로 바로 이었다.

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
  는 뜻. 마지막 산출물이 호출자에게 그대로 전달된다는 사실이 시나리오에 중요할 때만 선택해서 쓴다.

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

### 이벤트가 반환값을 갖는 경우

이벤트를 발생시킨 객체가 결과를 받아 자기 처리를 이어가야 한다면 **`Object.OnEventName.result`로 이벤트의 반환값을 표현한다.** 아래 `OnNeedHelp`는 응답자 하나인 요청 이벤트이며, 구현에서는 `Promise<HelpResult>`를 반환하는 콜백으로 연결한다. 결과를 받지 않는 일반 알림 이벤트와 반환 계약을 구분한다.

```jobflow
orchestrator: Orchestrator
Object: Orchestrator, WorkerA, WorkerB

Orchestrator.ProcessRequest --> WorkerA.ProcessRequest
WorkerA.OnNeedHelp --> WorkerB.ProvideHelp
WorkerB.ProvideHelp.result --> WorkerA.OnNeedHelp.result
```

Orchestrator가 WorkerB의 결과를 `OnNeedHelp` 호출의 반환값으로 돌려준다. WorkerA는 그 값을 받아 **실행 중인 `ProcessRequest` 안에서** 후처리를 이어간다. 결과를 `WorkerA.ProcessRequest`로 다시 연결하거나 외부에 별도 후처리 메서드를 노출할 필요가 없다.

다음은 의사코드다. `WorkerB.ProvideHelp(input)`은 `Promise<HelpResult>`를 반환하며, Orchestrator는 연결만 담당한다.

```text
class WorkerA {
    OnNeedHelp: (input) -> Promise<HelpResult>

    async ProcessRequest(input) {
        result = await OnNeedHelp(input)
        ... // result를 사용해 자신의 처리를 이어감
    }
}

class Orchestrator {
    private workerA = new WorkerA()
    private workerB = new WorkerB()

    constructor() {
        workerA.OnNeedHelp = async (input) => {
            return await workerB.ProvideHelp(input)
        }
    }
}
```

이 예제의 결과 간 화살표는 WorkerA가 실제로 사용하는 응답을 나타낸다. 결과가 필요 없는 이벤트에는 `.result`를 붙이지 않는다. 일반 다중 구독 이벤트가 자동으로 반환값을 모아 준다고 가정하지 않으며, 여러 응답이 필요하다면 [응답·집계 계약](./module-boundary-guide.md#메시지-발행과-요청응답)을 정한다.

### 반환값 처리

```jobflow
A.MethodName --> B.MethodName
B.MethodName.result --> A.HandleResult
```
* 후속 처리에 쓰이는 B의 반환값을 `.result`로 표기한다.
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

caller가 자신의 메서드 안에서 결과를 받아 계속 처리하는 경우는 [이벤트가 반환값을 갖는 경우](#이벤트가-반환값을-갖는-경우)를 따른다. 요청 콜백 이름이 `RequestData`나 `OnNeedData`여도 같은 반환 계약이면 그 이름 뒤에 `.result`를 붙인다.

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
* LLM 파이프라인, ETL, 컴파일러 패스, 빌드 단계 등에서 단계 사이에 값을 전달할 때 이 표기를 쓴다.
  위 예시는 최종 산출물을 호출자에게 돌려주는 관계까지 보여 주며, 그 관계가 예제 목적에 없으면 마지막 줄은 생략한다.

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
> `X.result --> Orchestrator.X`를 단순히 실행 중인 메서드로 돌아와 계속한다는 뜻으로 쓰지 않는다. 책임이 실제로 나뉘어 있으면 다른 메서드명을 쓰고, 같은 호출의 최종 반환을 보여 줄 필요가 있을 때만 `.result`로 연결한다. 실제 재시도·재호출을 나타내는 경우에는 조건·횟수·중복 효과 처리와 실제 코드 근거를 본문에 밝힌다. 다이어그램을 맞추기 위해 코드에 의미 없는 메서드를 추가하지 않는다.
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

### 합류와 재호출 구분

같은 노드가 화살표 타깃으로 여러 번 나오면 아래 셋 중 하나다. round-trip은 조율자 자신의 메서드에서만 생기고, 조율자 메서드로 모이는 합류는 실행 중인 메서드가 아니라 책임을 넘겨받는 다른 메서드일 때만 성립한다. 위 [「주의 — 표기 함정」](#결과를-다음-단계로-orchestrator-관점의-기본-표기)의 검증 휴리스틱에 걸린 줄은 먼저 어느 경우인지 가른다. round-trip이면 고치고, 합류·재호출이면 그림 아래 근거 표나 불릿에 이유를 한 줄로 적는다.

| 경우 | 뜻 | 쓰는 법 |
|---|---|---|
| round-trip | 조율자가 결과를 받으려고 자기 메서드로 돌아왔다가 다음 단계로 다시 내보낸다 | 금지 — `X.result --> Y`로 바로 잇는다 |
| 합류 | 택일 분기(성공·실패, 승인·거절)나 서로 다른 트리거(콜백과 폴링 회수 등)가 같은 호출로 모인다 | 허용 — 택일이면 한 실행에서 한 번만 실행된다고 적는다. 서로 다른 트리거처럼 두 경로가 같은 건으로 함께 올 수 있으면 두 번째 진입을 무엇이 막는지(상태 가드 등) 적는다 |
| 실제 재호출 | 같은 계약을 실제로 다시 부른다 — 폴링·재시도·같은 대상의 두 번째 요청 | 허용 — 조건·간격·횟수·중복 효과 처리와 코드 근거를 적는다. 반복 루프는 화살표 하나로 그리고 반복은 본문에 적는다(필요하면 별도 시나리오). 정해진 순서로 두 번 부르면 줄 순서대로 두 번 그린다 |

```jobflow
orchestrator: Checkout
Object: Checkout, Payments, Ledger, Mailer
Checkout.Pay --> Payments.Charge
Payments.Charge.Approved --> Ledger.Record
Payments.Charge.Declined --> Ledger.Record
Ledger.Record --> Mailer.SendResult
```

- `Ledger.Record`로 들어오는 화살표 둘은 승인·거절 두 경로의 합류다. `Pay` 한 번에 `Record`는 한 번만 실행된다. 값 분기 표기는 [반환값에 따른 분기](#반환값에-따른-분기)를 따른다.
- 확인한 렌더러는 들어오는 화살표마다 `Record` 칸을 따로 그리고, `SendResult`는 마지막 `Record` 칸에만 잇는다. 같은 열의 같은 이름 칸은 같은 계약이며, 그 뒤 화살표는 두 경로에 공통이다([렌더러 배치 특성](#렌더러-배치-특성)).
- 합류 뒤 후속이 일부 경로나 결과에만 해당하면 합류 노드의 값 분기로 쓴다. 줄 순서로 뜻을 만들지 않는다(아래 예).
- `scope:`에서는 화살표마다 출발점이 실제 요청자다. 서로 다른 요청자가 같은 계약을 부르는 화살표는 각자의 실제 요청이며 round-trip 판정 대상이 아니다.

승인된 결제에만 영수증을 보내는 예:

```jobflow
orchestrator: Checkout
Object: Checkout, Payments, Ledger, Mailer
Checkout.Pay --> Payments.Charge
Payments.Charge.Approved --> Ledger.Record
Payments.Charge.Declined --> Ledger.Record
Ledger.Record.Paid --> Mailer.SendReceipt
```

- `Record`는 기록한 결제 상태를 돌려준다. 영수증은 그 값이 `Paid`일 때만 보낸다. 거절 쪽 값은 후속이 없어 그리지 않았다([무시 분기 표기](#무시-분기-표기-화살표-없는-단독-줄)).
- `Approved` 줄을 마지막에 두고 `Ledger.Record --> Mailer.SendReceipt`로 쓰지 않는다. 렌더러는 그 화살표를 승인 쪽 `Record` 칸에 잇지만, 뜻은 위 `SendResult`처럼 두 경로에 공통이다.
- 렌더러는 `Paid` 칸을 마지막 `Record` 칸(거절 쪽) 아래에 그린다. 어느 칸 아래에 있든 합류한 `Record`의 값이다.

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

`X.result --> Orchestrator.Method.result`는 마지막 산출물이 orchestrator 메서드의 **반환값으로 호출자에게 실제로 흘러나가고, 그 전달을 보여 줄 필요가 있을 때만** 쓴다. 반환값을 받아가는 호출자가 없는 메서드(UI 이벤트 핸들러, 콜백 등)가 분기 결과에 따라 **아무 후속 동작 없이 끝나는** 경우에 `.result` 를 종료 표기로 차용하면 "없는 반환값을 누군가 받아가는 것처럼" 오독된다. 이 경우는 다음 둘 중 하나로 표기한다.

1. **기본 — 그리지 않는다**: 단일 조건 분기 패턴과 동일하게, 아무 일도 일어나지 않는 분기는 생략한다. 그 동작 사실은 다이어그램 하단 설명에 문장으로 남긴다.
2. **명시가 필요할 때 — 분기 값만 적고 화살표를 잇지 않는다**: "조용히 무시된다"는 사실 자체가 설계 정보일 때(예: 불법 입력의 무반응 처리)는 해당 분기 값을 **화살표 없는 단독 줄**로 남긴다.

```jobflow
GameHook.HandleIntersection --> RuleEngine.TryPlace
RuleEngine.TryPlace.false
RuleEngine.TryPlace.true --> GameHook.RequestAI
```

* 화살표가 없는 단독 줄은 그 분기 뒤로 이 그림에 그린 객체 사이의 후속 화살표가 없다는 선언이다. 조용한 무시가 대표적이고, 보류나 오류 응답·예외로 끝나는 분기도 같다. 무엇으로 끝나는지는 그림 아래 표나 불릿에 적는다. 다이어그램에서는 후속 화살표가 달리지 않은 매달린 분기 노드로 그려진다.
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

시스템 설계 문서에서 경계 수준 그림과 경계 내부 드릴다운의 배치·번호는 [설계 문서 양식](system-design-document-guide.md#6-경계-내부-job-flow-드릴다운)을 따른다.

## 다이어그램 옆에 남기는 계약과 검증

파라미터나 새 제어 토큰을 jobflow 문법에 추가하지 않고 다음 내용을 산문·표 또는 계약 문서 링크로 적는다.

- 대상 시나리오, 트리거, 조율자/경계, AS-IS 근거 또는 제안 상태
- 공개 입력·출력·오류, 데이터와 상태의 단일 소유자
- 관련될 때만 순서·병렬 실행·취소·timeout·재시도·중복 처리·구독 해제 규칙
- 상위 공개 계약과 필요한 하위 문서 링크

검토자는 성공 흐름 하나와 해당 변경에서 중요한 실패 흐름 하나를 따라가며 실제 호출자, 상태 변경자, 응답 수신자가 명확한지 확인한다. 같은 메서드로 돌아가는 화살표는 재개인지 실제 재호출인지 확인한다. 택일 경로가 한 호출로 모이는 합류도 있다([합류와 재호출 구분](#합류와-재호출-구분)). 재시도가 실제 동작이면 별도 시나리오와 조건·횟수·중복 효과 처리로 설명한다.

`git diff --check`와 이름·헤더·계약 대조는 정적 검토다. 파서 실행·SVG/HTML 생성 확인과 브라우저에서 실제 블록을 표시한 확인을 나눠 기록한다. 렌더러가 없으면 미실행 사실과 확인 가능한 범위를 남긴다.
