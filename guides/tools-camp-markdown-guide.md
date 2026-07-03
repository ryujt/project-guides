# tools.camp 마크다운 문법 가이드

`tools.camp` 마크다운 에디터(`MdEditPage`)는 표준 마크다운(GFM)에 더해 두 갈래의 확장 문법을 지원한다.

- **텍스트 레벨 SmartMD 확장** — 콜아웃·Figure·표 사양·정렬·변수·이미지 속성·프런트매터. 전처리기(`smartmd.js`)가 원본 텍스트를 변환한다.
- **코드펜스 기반 확장** — 코드 문법 강조, Mermaid, 자체 미니 문법 다이어그램(`state`/`navigation`/`jobflow`/`layout`), 페이지 분할.

이 문서는 위 확장 문법 전체를 **실제 구현(`src/lib`) 기준**으로 정리한 단일 레퍼런스다.

> 다이어그램(JobFlow / Navigation / State / Layout)의 **작성 방법론**은 이 저장소의 개별 가이드를 함께 참고한다.
> - [`job-flow-diagram-guide.md`](job-flow-diagram-guide.md)
> - [`navigation-diagram-guide.md`](navigation-diagram-guide.md)
> - [`state-diagram-guide.md`](state-diagram-guide.md)
> - [`screen-layout-guide.md`](screen-layout-guide.md)

---

## 목차

1. [렌더링 파이프라인](#1-렌더링-파이프라인)
2. [코드 블록 & 문법 강조](#2-코드-블록--문법-강조)
3. [Mermaid 다이어그램](#3-mermaid-다이어그램)
4. [State 다이어그램](#4-state-다이어그램)
5. [Navigation 다이어그램](#5-navigation-다이어그램)
6. [JobFlow 다이어그램](#6-jobflow-다이어그램)
7. [Layout 다이어그램](#7-layout-다이어그램)
8. [콜아웃 (Callout)](#8-콜아웃-callout--)
9. [Figure (그림/캡션)](#9-figure-그림캡션)
10. [SmartMD 표](#10-smartmd-표--table-)
11. [변수 플레이스홀더](#11-변수-플레이스홀더--name)
12. [이미지 속성 접미사](#12-이미지-속성-접미사)
13. [프런트매터](#13-프런트매터)
14. [페이지 분할](#14-페이지-분할)
15. [요약표](#15-요약표)

---

## 1. 렌더링 파이프라인

작성한 문법이 어떤 순서로 처리되는지 알면 규칙의 이유가 명확해진다.

1. **SmartMD 전처리**(`preprocessSmartMd`) — 프런트매터 배너 치환 → 이미지 속성 접미사 제거 → `{...}` 속성 블록 처리(표 사양·정렬·캡션 마커) → `{{변수}}` 강조 → `:::` 콜아웃/Figure 를 HTML 블록으로 변환.
2. **블록 분할**(`parseMarkdownToBlocks`) — 본문을 heading/paragraph/code/list/table 등 블록 단위로 나눈다(증분 렌더링용).
3. **마크다운 렌더**(`marked`) — 블록별로 렌더. 코드펜스 언어가 `mermaid`/`state`/`navigation`/`jobflow`/`layout`이면 각 변환기로 처리한다.
4. **후처리**(`applySmartTableSpecs`, `processDiagramsInBlock`) — 표 사양 적용, 다이어그램 SVG/HTML 생성, 코드 하이라이트·줄 번호·복사 버튼 부착.

> **CJK 강조 보정**: 코드펜스를 제외한 블록에는 `fixCjkEmphasis`가 적용된다. `**(전이)**를`, `**기계(Machine)**는` 처럼 강조 구분자가 문장부호·한글과 인접해 강조가 깨지는 경우, 보이지 않는 ZWSP(U+200B)를 끼워 표준 파서가 강조를 정상 인식하게 한다. 결과물에는 보이지 않는다.

---

## 2. 코드 블록 & 문법 강조

표준 펜스 코드 블록은 highlight.js로 문법 강조된다.

````markdown
```javascript
console.log('Hello, world!');
```
````

**규칙**
- 여는 펜스(```` ``` ```` 또는 `~~~`, 3개 이상) 뒤에 언어 식별자를 적는다.
- 등록된 언어: `javascript`, `typescript`, `python`, `bash`, `json`, `css`, `xml`(HTML), `java`, `cpp`. (highlight.js가 정의한 별칭 `js`/`ts`/`py`/`sh`/`html` 등도 인식된다.)
- **언어를 명시하지 않거나 미등록 언어**면 자동 탐지 없이 일반 텍스트로 출력된다.
- 다이어그램 펜스(아래 항목)를 제외한 코드 블록에는 **줄 번호**와 **복사 버튼**이 붙는다. (다이어그램 펜스에는 복사 버튼만 붙는다.)

---

## 3. Mermaid 다이어그램

표준 Mermaid 문법을 그대로 사용한다.

````markdown
```mermaid
graph LR
A --> B
B --> C
```
````

**규칙**
- 내용은 가공 없이(`&`/`<`/`>`만 이스케이프) `<div class="mermaid">`에 담겨 Mermaid.js로 클라이언트 렌더링된다.
- 초기화 옵션: `securityLevel: 'loose'`, `theme: 'default'`.
- 아래 `state`/`navigation` 다이어그램은 자체 미니 문법을 Mermaid(`graph LR`)로 변환해 렌더링하는 확장이다.

---

## 4. State 다이어그램

`state` 펜스. 상태 전이 다이어그램을 미니 문법으로 작성하면 Mermaid(`graph LR`)로 변환된다.

````markdown
```state
<s> --> (StateA)
(StateA) --> (StateB) : ConditionA
(StateB) --> (StateC) : ConditionB
(StateC) --> <e> : ConditionC
```
````

**노드 종류**

| 작성        | 의미          | 렌더링 모양                 |
|-------------|---------------|-----------------------------|
| `<s>`       | 시작          | 흰 원 `(( ))`               |
| `<e>` / `.` | 종료          | 검은 원 `(( ))`             |
| `<이름>`    | 이벤트/메시지 | 다이아몬드 `{{ }}` (연두)   |
| `(이름)`    | 둥근 상태     | 둥근 사각형                 |
| `이름`      | 일반 상태     | 사각형                      |

**엣지(전이) 문법**
- `From --> To` — 전이
- `From --> To : 라벨` — 라벨 있는 전이. 구분자는 ` : ` (**양쪽 공백 포함**, 마지막 ` : ` 기준으로 분리)

> - 시작/종료 원에는 라벨이 표시되지 않는다(빈 원).
> - 노드/라벨 내 `"`, `@`, `()`, `[]`, `{}` 문자는 Mermaid 충돌을 피하려고 HTML 엔티티로 자동 이스케이프된다.

---

## 5. Navigation 다이어그램

`navigation` 펜스. 화면/페이지 이동 흐름을 표현한다. 역시 Mermaid(`graph LR`)로 변환된다.

````markdown
```navigation
Start --> (/action)
(/action) --> Start : error
(/action) --> End : ok
```
````

**노드 종류**

| 작성           | 의미            | 렌더링 모양                    |
|----------------|-----------------|--------------------------------|
| `` `이름` ``   | 메시지          | `fr-rect` (노란 배경 `#fff7d6`)|
| `<이름>`       | 이벤트/요소     | 다이아몬드 `{{ }}` (연두)      |
| `(이름)`       | 둥근 노드       | 둥근 사각형                    |
| `/이름`        | 둥근 노드(대체) | 둥근 사각형                    |
| `이름`         | 일반(화면)      | 사각형 (파란 배경 `#bbf`)      |

**엣지 문법**
- `From --> To`, `From --> To : 라벨` (라벨 구분자 ` : `) — State와 동일.
- 특수 문자 이스케이프 규칙도 State와 동일하다.

> `` `백틱` ``(메시지), `<꺾쇠>`(이벤트), `(괄호)`·`/슬래시`(둥근) 접두/감싸기만 특별 처리된다. 그 외 문자열은 대괄호를 포함해 **있는 그대로** 사각형 라벨이 된다.

---

## 6. JobFlow 다이어그램

`jobflow` 펜스. 객체 간 메서드 호출 흐름을 컬럼 기반 다이어그램으로 그린다. 자체 SVG 렌더러를 사용한다.

````markdown
```jobflow
master: Example
Object: ClassA, ClassB, ClassC
ClassC.Start --> ClassA.Show
ClassC.Start --> ClassB.GetList
ClassB.GetList.result --> ClassC.AddList
```
````

**선언부**
- `master: 이름` — 주(主) 객체 선언(선택).
- `Object: 이름1, 이름2, ...` — 객체(컬럼) 선언. 콤마로 구분하며 여러 줄로 나눠 써도 된다. (`master:`/`object:`는 대소문자 무관.)
- 관계식에 등장한 객체는 자동으로 컬럼에 추가되므로, `Object:` 선언은 **컬럼 순서를 고정**하는 용도다.

**호출/액션 문법**
- `객체.액션` — 점 표기로 객체의 메서드/속성을 가리킨다. (`객체.속성.하위`처럼 중첩 가능)
- `Source.액션 --> Target.액션` — 호출 흐름.
- `객체.액션` 단독 줄(화살표 없이 점을 포함) — 독립 노드(standalone shape).

**노드 모양(액션 이름으로 자동 결정)** — `getShapeType` 기준
- 액션의 **마지막 세그먼트가 `on`으로 시작**(대소문자 무관, 예: `onSuccess`) → 이벤트 모양(연두, 둥근 모서리).
- 액션 경로에 **점이 포함**(예: `GetList.result`, `state.value`) → 데이터/결과 모양(노랑, 양쪽 세로선).
- 그 외 일반 액션 → 사각형(파랑).

**결과(result) 경로**
- 입력 전체에서 `.result.`(중간 세그먼트)는 내부적으로 `.data.`로 치환된다.
- `ClassB.GetList.result` 처럼 끝에 오는 `.result`는 점이 포함된 경로이므로 위 규칙에 따라 **데이터 모양(노랑)**으로 그려진다.

> 부모–자식(점 표기 계층) 관계는 점선 세로선으로 자동 연결된다. 라벨(` : 라벨`)·상세 배치 규칙 등 작성 방법론은 [`job-flow-diagram-guide.md`](job-flow-diagram-guide.md)를 참고한다.

---

## 7. Layout 다이어그램

`layout` 펜스. 화면 레이아웃(컨테이너 트리)을 표현한다. Flexbox 기반 미리보기로 렌더링된다.

````markdown
```layout
Screen V Header, Main, Footer
Header > Logo, Search, UserMenu
Main > Left Sidebar : 20, Content
Left Sidebar V ProjectPicker, SavedFilters, TagFilter
Content V Breadcrumbs, TitleBar, DetailBody, Activity, Pager
TitleBar > IssueTitle, Actions
Footer > Status, Version
```
````

**문법**
- 한 줄에 컨테이너 하나: `컨테이너명 <연산자> 자식1, 자식2, ...`
- 연산자(**양옆 공백 필수**):
  - ` V ` — 세로 배치(컬럼/스택)
  - ` > ` — 가로 배치(로우)
- 자식 크기 지정: `자식명 : 숫자` → 부모 대비 백분율(예: `Left Sidebar : 20`).
  - 크기를 지정하지 않은 자식들은 남는 공간을 균등 분할한다.
  - 크기 지정은 **가로(` > `) 배치에서만** 반영된다. 세로(` V `) 배치의 자식은 내용 높이에 맞춰 배치되며 숫자는 무시된다.
- 처음 정의된 컨테이너가 **루트**가 된다.
- 자식 이름이 다른 줄에서 다시 컨테이너명으로 등장하면 하위 트리로 연결된다.

> 컴포넌트 최소 높이·간격·여백 등 렌더링 세부와 작성 방법론은 [`screen-layout-guide.md`](screen-layout-guide.md)를 참고한다.

---

## 8. 콜아웃 (Callout) — `:::`

강조 박스를 만드는 컨테이너 블록 문법(표준 마크다운에는 없음).

### 문법

```
:::<타입> [title="제목"]
내용 (마크다운 사용 가능)
:::
```

### 예시

```markdown
:::success title="결론"
SLO(99.5%) 충족, 위반 0건.
:::

:::warning
SLO 위반이 임박합니다.
:::
```

### 규칙

- 여는 줄 `:::타입`, 닫는 줄 `:::`은 각각 **자체 줄**에 있어야 한다.
- `title="..."` 속성(선택)을 주면 박스 상단에 굵은 제목(`smart-callout-title`)이 표시된다.
- 박스 내부 내용은 마크다운으로 먼저 렌더링된 뒤 박스로 감싸진다.

### 지원 타입

| 타입       | 적용 클래스               | 용도          |
|------------|---------------------------|---------------|
| `success`  | `smart-callout success`   | 성공 / 결론   |
| `warning`  | `smart-callout warning`   | 경고          |
| `danger`   | `smart-callout danger`    | 위험 / 오류   |
| `info`     | `smart-callout info`      | 정보          |
| `note`     | `smart-callout info`      | `info`로 렌더 |
| `tip`      | `smart-callout info`      | `info`로 렌더 |

- 위 표에 없는 타입명을 쓰면 `info` 박스로 렌더링되고, 타입명이 제목 위치에 표시된다(`title`을 함께 주면 `타입명 — 제목` 형태).

---

## 9. Figure (그림/캡션)

```markdown
:::figure caption="그림 1. 시스템 구성도"
![architecture](diagram.png)
:::
```

- `caption="..."`으로 그림 하단 캡션을 지정한다.
- `<div class="smart-figure">` + `<div class="smart-figure-caption">`로 렌더링된다.

---

## 10. SmartMD 표 — `{table ...}`

표준 마크다운 표(GFM)에는 열별 정렬·너비·헤더 텍스트를 세밀하게 지정할 수 없다. SmartMD는 표 **바로 위**에 사양 블록을 두어 이를 제어한다.

### 문법

```
{table [caption="캡션 {n}"]
 columns=[
   {name=키, title="헤더", align=정렬, width=너비},
   ...
 ]}

| ... 표준 마크다운 표 ... |
```

### 예시

```markdown
{table caption="표 {n}. 호스트별 가용률"
 columns=[
   {name=host,      title="호스트",  align=left,   width=40%},
   {name=uptime,    title="가용률",  align=right,  width=30%},
   {name=incidents, title="장애",    align=center, width=30%}
 ]}

| host       | uptime  | incidents |
|------------|---------|-----------|
| db-01      | 99.923% | 0         |
| was-prod-1 | 99.812% | 2         |
```

### 규칙

- 블록은 **줄 시작 위치**에서 `{`로 시작해야 한다(중괄호 균형·문자열 리터럴을 인식해 파싱).
- `columns=[ {…}, {…} ]` 배열의 각 항목이 표의 **열과 순서대로 1:1 대응**된다.
- 바로 다음에 오는 표에 사양이 적용된다(렌더링 후 DOM의 `<th>`/`<td>`에 스타일·텍스트 반영).

### 열(column) 속성

| 속성     | 허용 값                          | 동작 |
|----------|----------------------------------|------|
| `align`  | `left` / `right` / `center`      | 해당 열 전체(`th`+`td`)의 `text-align` |
| `width`  | 숫자 또는 백분율 (`40%`, `120`)  | 헤더(`th`)의 `width` |
| `title`  | 따옴표 문자열 `"..."`            | 해당 열의 **헤더 텍스트를 교체** |
| `name`   | 식별 키                          | 파싱되지 않음(문서화·가독성 용도) |

### `caption` 속성

- `{table caption="..."}`처럼 캡션을 주면 표 위에 캡션 div(`smart-caption`)가 생성된다.
- 캡션 내 `{n}` 토큰(및 뒤따르는 `.`·공백)은 자동으로 제거된다(자동 번호 자리 표시 용도).

### 간이 정렬 블록 — `{align=...}`

열별 사양 없이 표 전체를 한 방향으로 정렬할 때 사용한다.

```markdown
{align=center}

| A | B | C |
|---|---|---|
| 1 | 2 | 3 |
```

- 허용 값: `left` / `right` / `center` — 다음 표의 모든 셀에 적용된다.

---

## 11. 변수 플레이스홀더 — `{{name}}`

```markdown
사용자: {{user.name}}, 키: {{api-key}}, 부정: {{!enabled}}
```

- 패턴: `{{name}}` / `{{!name}}` (앞에 `!` 부정 접두사 허용).
- 이름에 영문/숫자/`_`/`.`/`-` 사용 가능.
- `<code>{{...}}</code>` 인라인 코드로 강조된다.

---

## 12. 이미지 속성 접미사

```markdown
![alt](image.png){width=500px}
```

- Pandoc 스타일 속성 접미사를 허용하되, 렌더링 시 `{...}` 부분은 **제거**된다(호환 처리, 실제 스타일 적용은 없음).

---

## 13. 프런트매터

```markdown
---
title: Markdown Editor
author: tools.camp
date: 2026-05-08
---
```

- 문서 **첫 줄**부터 시작하는 `---` … `---` 블록만 인식한다.
- 인식 키: `title`, `subtitle`, `author`, `date`, `locale`, `style` (최상위 스칼라 키만).
- 메타데이터 배너(`smart-frontmatter`)로 렌더링된다.
- 첫머리 `---` 블록은 프런트매터로 우선 처리되어, 페이지 분할 구분선으로 취급되지 않는다.

---

## 14. 페이지 분할

에디터의 **"페이지 나누기"** 옵션이 켜져 있으면, 본문을 `---` 구분선 기준으로 여러 페이지로 나눠 미리보기/PDF로 출력한다.

```markdown
첫 페이지 내용

---

둘째 페이지 내용

---

셋째 페이지 내용
```

**규칙**
- 구분선은 자체 줄에 `---`(하이픈 3개)만 있는 줄이다.
- 문서 맨 앞의 프런트매터(`---` 블록)는 페이지 구분선으로 취급되지 않는다.
- 코드 펜스(```` ``` ````, `~~~`) 내부의 `---`는 분할 대상에서 제외된다.
- 페이지 미리보기에서는 좌/우 화살표 키로 페이지를 이동할 수 있다.
- PDF 출력 시 페이지 나누기 옵션이 페이지 분할(page break)로 반영된다.

---

## 15. 요약표

### 코드펜스 기반 확장

| 기능        | 마커/펜스         | 핵심 문법 |
|-------------|-------------------|-----------|
| 코드 강조   | ` ```lang `       | js/ts/py/bash/json/css/xml/java/cpp · 줄번호+복사 |
| Mermaid     | ` ```mermaid `    | 표준 Mermaid |
| State       | ` ```state `      | `<s>`/`<e>`/`<event>`/`(round)`, `-->`, ` : 라벨` |
| Navigation  | ` ```navigation ` | `` `msg` ``/`<event>`/`(round)`/`/round`, `-->`, ` : 라벨` |
| JobFlow     | ` ```jobflow `    | `master:`, `Object:`, `A.m --> B.n`, `on*`→이벤트, `a.b`→데이터 |
| Layout      | ` ```layout `     | ` V `(세로)/` > `(가로), `자식 : percent`(가로만) |
| 페이지 분할 | `---` (자체 줄)   | 코드펜스/프런트매터 제외 |

### 텍스트 레벨 SmartMD 확장

| 표현식        | 마커                        | 핵심 |
|---------------|-----------------------------|------|
| 콜아웃        | `:::type … :::`             | `success`/`warning`/`danger`/`info`/`note`/`tip` + `title="..."` |
| Figure        | `:::figure … :::`           | `caption="..."` (그림 하단 캡션) |
| SmartMD 표    | `{table columns=[…]}`       | 열별 `title`/`align`/`width`, `caption`(`{n}` 제거) |
| 표 전체 정렬  | `{align=…}`                 | `left`/`right`/`center` |
| 변수          | `{{name}}`                  | `{{!name}}`, `{{a.b-c}}` |
| 이미지 속성   | `![](x){…}`                 | 속성 제거(호환) |
| 프런트매터    | `---` … `---` (문서 첫머리) | `title`/`subtitle`/`author`/`date`/`locale`/`style` |
