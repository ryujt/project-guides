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

사용자, 시스템, 외부 시스템 간의 거시적인 **업무 프로세스 흐름**을 도식화합니다.

* **목적**: 누가(Actor), 언제, 무엇을 하는지 전체 시나리오를 파악한다.
* **작성 방식**: Swimlane 다이어그램 등을 활용하여 역할(Role)별 흐름을 표현.

## 6. Navigation Diagram

화면 전환, API 호출, 내부 로직의 흐름을 스크립트 형식으로 정의합니다.

### 구성 요소

* **FrontPage**: 화면 이름 (예: `Home`, `LoginForm`)
* **(/backend api)**: 백엔드 API 호출 (소문자, `/`, `_` 사용, 예: `(/signin)`)
* **(process)**: 내부 로직 (예: `(validation)`)

### 작성 규칙

1. **Page  Page**: `Home --> SignupForm`
2. **Page  API**: `SignupForm --> (/signup)`
3. **API  Page (분기)**:
 ```navigation
 (/signup) --> SignupForm : error
 (/signup) --> Home : success
 ```
4. **Process 연동**: `CheckoutForm --> (validation) --> (/create_order)`

## 7. State Diagram

객체의 상태(State) 변화와 흐름을 정의합니다. (Mermaid `graph LR` 변환 대응)

### 구성 요소

* **Start Node**: `<Name>` (변환: 흰색 원)
* **State**: `(Name)` (변환: 둥근 사각형)
* **End Node**: `.` (변환: 검은색 원)

### 작성 규칙

1. **시작**: `<s> --> (Ready)`
2. **전이**: `(Ready) --> (Running)`
3. **종료**: `(Done) --> <e>`
4. **조건(분기)**: `(Running) --> (Error) : Timeout` (화살표 라벨로 표시)

## 8. Screen Layout

각 화면(Page)의 UI 구성 요소와 배치를 정의합니다.

* **목적**: 구체적인 화면 구성을 시각화하여 개발 및 디자인의 기준을 잡는다.
* **포함 내용**:
* UI 컴포넌트 배치 (버튼, 리스트, 입력창 등)
* 데이터 바인딩 정보 (어떤 Input Data가 어디에 표시되는지)
* 인터랙션 요소 (클릭 가능한 영역 등)

### 작성 규칙

```layout
Container1 V Child1, Child2, ...
Container2 > Child1, Child2, ...
```

* `Container`는 “영역 컨테이너” 이름이다.
* `Child`는 “하위 영역(컨테이너 또는 컴포넌트)” 이름이다.
* 자식은 콤마 `,`로 구분하며, 순서가 곧 배치 순서다.
* 이름은 공백을 포함할 수 있다. 구분은 연산자(`V` 또는 `>`)와 콤마로만 한다.
