# System Design Framework

시스템의 요구사항 분석부터 설계, 시각화까지의 과정을 표준화한 프레임워크입니다.

## 목차

1. **Input Datas** (데이터 정의)
2. **Key Events** (핵심 이벤트)
3. **Services List** (서비스 목록)
4. **PBS** (Process Breakdown Structure)
5. **Job Flow Diagram** (객체의 메시지 및 이벤트 흐름도)
6. **Navigation Diagram** (화면/로직 흐름도)
 * Screen Flow
 * Logic Flow
7. **State Diagram** (상태도)
8. **Screen Layout** (화면 설계)

---

## 다이어그램 표기는 가이드를 따른다 (링크)

각 다이어그램 섹션의 **DSL 의미·문법은 아래 전용 가이드를 인용해 따르며, 이 문서에서 재서술하지 않는다.** 어떤 다이어그램도 다른 포맷으로 변환·치환하지 않는다(예: `jobflow` 를 `sequenceDiagram`·`flowchart` 로 바꾸지 않는다).

| 섹션 | 표기 | 가이드 |
|---|---|---|
| §5 Job Flow Diagram | `jobflow` | [job-flow-diagram-guide.md](./job-flow-diagram-guide.md) · [method-R.md](./method-R.md) |
| §6 Navigation Diagram | `navigation` | [navigation-diagram-guide.md](./navigation-diagram-guide.md) |
| §7 State Diagram | `state` | [state-diagram-guide.md](./state-diagram-guide.md) |
| §8 Screen Layout | `layout` | [screen-layout-guide.md](./screen-layout-guide.md) |

---

## 1. Input Datas

시스템이 동작하기 위해 필요한 **원천 데이터(Source Data)**를 정의합니다.

* **목적**: 시스템의 입력값을 명확히 하여 데이터 수집 범위와 처리 대상을 확정한다.
* **작성 내용**:
 * 데이터의 종류 (예: 사용자 입력, 외부 API, 센서 데이터, 로그 등)
 * 수집 주기 및 방식 (예: 실시간, 배치, 이벤트 트리거)
 * Default Data와 사용자 맞춤 Data 구분
* **예시**:
 * 주가 데이터 (급등/급락/거래량)
 * Youtube 영상 분석 데이터 (Speech-to-Text)

## 2. Key Events

시스템의 로직을 작동시키는 **트리거(Trigger)**나 상태 변화를 일으키는 **중요 사건**을 정의합니다.

* **목적**: 비즈니스 로직이 언제, 어떤 조건에서 실행되는지 명시한다.
* **작성 내용**:
 * 시스템 외부에서 발생하는 사건 (예: 주가 급변, 타이머 종료)
 * 사용자 행위에 의한 사건 (예: 설정 완료, 결제 시도)
* **예시**:
 * Extreme Rapid changes (급등락 발생)
 * User Condition Met (사용자 조건 만족)

## 3. Services List

시스템을 구성하는 독립적인 **기능 단위(Module/Service)**를 정의합니다.

* **목적**: 시스템의 구조를 블록 단위로 나누어 역할을 분담한다.
* **작성 내용**:
 * 서비스 명칭 (가능한 보편적인 용어 사용: Collector, Analyzer, Manager 등)
 * 주요 역할 및 책임
* **예시**:
 * **Context Collector**: 상황 정보 수집 및 적중 아이템 선별
 * **KI API Service**: 급등락 감지 시 외부 API 연동

## 4. PBS (Process Breakdown Structure)

시스템이 수행해야 할 기능과 프로세스를 계층적인 **기능 트리(Function Tree)** 형태로 구조화합니다.

* **목적**: WBS(작업 분해 구조)와 유사한 형태를 띠지만, '할 일'이 아닌 **'시스템의 기능'**을 중심으로 구조를 시각화하여 기능 누락을 방지하고 범위를 확정한다.
* **구성**:
 * **Level 1 (Root)**: 대상 시스템 (System)
 * **Level 2 (Group)**: 주요 기능 그룹 (Function Group)
 * **Level 3 (Process)**: 세부 수행 프로세스 (Unit Process)
* **예시**:
 * 주식 분석 시스템
   * 수집 기능
     * 실시간 시세 수집
     * 뉴스 크롤링
   * 분석 기능
     * 급등락 패턴 매칭
     * 키워드 추출

## 5. Job Flow Diagram

객체(Actor · 시스템 · 외부 시스템)들이 주고받는 **메시지와 이벤트의 흐름**을 `jobflow` 텍스트 DSL 로 정의합니다.

* **목적**: 누가(Actor) 언제 누구에게 도움을 요청(메시지 전송 · 이벤트 발행)하는지, 그 결과가 어디로 이어지는지를 코드에 매핑 가능한 수준으로 정한다.
* **표기·문법**: [job-flow-diagram-guide.md](./job-flow-diagram-guide.md) 를 따른다 — 헤더(`orchestrator:`/`scope:`), `A.method`·`A.On이벤트`·`A.message.X`·`MessageBus.X`·`.result`·`.true`/`.false`/`.상태값`. method-R 표기와 일관 → [method-R.md](./method-R.md). 여기서 재서술하지 않는다.

> **[필수] `jobflow` 를 `sequenceDiagram` · `flowchart` 로 대체하지 말 것.** jobflow 만이 오케스트레이터 관점의 결과 연결 · 조각 간 무지(無知) · 이벤트 발행/구독 분리 · `.true/.false/.상태값` 분기를 담는다. mermaid 는 확정된 `jobflow` 의 **보조 시각화**로만 덧붙인다.

## 6. Navigation Diagram

화면 전환 · API 호출 · 내부 로직의 흐름을 `navigation` 텍스트 DSL 로 정의합니다 (Screen Flow · Logic Flow).

* **표기·문법**: [navigation-diagram-guide.md](./navigation-diagram-guide.md) 를 따른다 — `FrontPage` 화면, `(/backend_api)` API 호출, `(process)` 내부 로직, `-->` 전이와 `: label` 분기. 여기서 재서술하지 않는다.

## 7. State Diagram

객체의 상태(State) 변화와 흐름을 `state` 텍스트 DSL 로 정의합니다 (mermaid `graph LR` 로 변환).

* **표기·문법**: [state-diagram-guide.md](./state-diagram-guide.md) 를 따른다 — `<s>` 시작 · `(State)` 상태 · `<e>` 종료 · `: label` 조건 분기. 여기서 재서술하지 않는다.

## 8. Screen Layout

각 화면(Page)의 UI 구성 요소와 배치를 `layout` 텍스트 DSL 로 정의합니다.

* **목적**: 구체적인 화면 구성을 시각화하여 개발·디자인 기준을 잡는다 (컴포넌트 배치 · 데이터 바인딩 · 인터랙션 요소).
* **표기·문법**: [screen-layout-guide.md](./screen-layout-guide.md) 를 따른다 — `V` 세로 배치 · `>` 가로 배치 · 콤마 순서. 여기서 재서술하지 않는다.
