# SmartMD 확장 문법 가이드 (표준 마크다운 비표준 표현식)

`tools.camp` 마크다운 에디터는 표준 마크다운(GFM)에 더해, 텍스트 레벨에서 동작하는 **SmartMD 확장 문법**을 지원합니다. 이 문서는 표준 마크다운에는 없고 SmartMD가 추가한 표현식만 모아 정리한 것입니다.

> 다이어그램 펜스(`jobflow`/`navigation`/`state`/`layout`)는 별도 미니 문법이므로 `markdown-editor-extended-syntax-guide.md`를 참고하세요.

---

## 1. 콜아웃 (Callout) — `:::`

강조 박스를 만드는 표현식입니다. 표준 마크다운에는 없는 컨테이너 블록 문법입니다.

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

- 여는 줄 `:::타입`, 닫는 줄 `:::`은 각각 **자체 줄**에 있어야 합니다.
- `title="..."` 속성(선택)을 주면 박스 상단에 굵은 제목(`smart-callout-title`)이 표시됩니다.
- 박스 내부 내용은 마크다운으로 먼저 렌더링된 뒤 박스로 감싸집니다.

### 지원 타입

| 타입       | 적용 클래스               | 용도          |
|------------|---------------------------|---------------|
| `success`  | `smart-callout success`   | 성공 / 결론   |
| `warning`  | `smart-callout warning`   | 경고          |
| `danger`   | `smart-callout danger`    | 위험 / 오류   |
| `info`     | `smart-callout info`      | 정보          |
| `note`     | `smart-callout info`      | `info`로 렌더 |
| `tip`      | `smart-callout info`      | `info`로 렌더 |

- 위 표에 없는 타입명을 쓰면 `info` 박스로 렌더링되고, 타입명이 제목 위치에 표시됩니다.
- `figure` 타입은 그림+캡션 전용 형태입니다(아래 참고).

#### Figure (그림/캡션)

```markdown
:::figure caption="그림 1. 시스템 구성도"
![architecture](diagram.png)
:::
```

- `caption="..."` 으로 그림 하단 캡션을 지정합니다.
- `<div class="smart-figure">` + `<div class="smart-figure-caption">` 로 렌더링됩니다.

---

## 2. SmartMD 표 (Table) — `{table ...}`

표준 마크다운 표(GFM)에는 열별 정렬·너비·헤더 텍스트를 세밀하게 지정할 수 없습니다. SmartMD는 표 **바로 위**에 사양 블록을 두어 이를 제어합니다.

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

- 블록은 줄 시작 위치에서 `{table` 으로 시작해야 합니다.
- `columns=[ {…}, {…} ]` 배열의 각 항목이 표의 **열과 순서대로 1:1 대응**됩니다.
- 바로 다음에 오는 표에 사양이 적용됩니다(렌더링 후 DOM의 `<th>`/`<td>`에 스타일·텍스트 반영).

### 열(column) 속성

| 속성     | 허용 값                       | 동작 |
|----------|-------------------------------|------|
| `align`  | `left` / `right` / `center`   | 해당 열 전체(`th`+`td`)의 `text-align` |
| `width`  | 숫자 또는 백분율 (`40%`, `120`) | 헤더(`th`)의 `width` |
| `title`  | 따옴표 문자열 `"..."`         | 해당 열의 **헤더 텍스트를 교체** |
| `name`   | 식별 키                       | 현재 렌더링에는 미사용(문서화·가독성 용도) |

### `caption` 속성

- `{table caption="..."}` 처럼 캡션을 주면 표 위에 캡션 div(`smart-caption`)가 생성됩니다.
- 캡션 내 `{n}` 토큰은 자동으로 제거됩니다(자동 번호 자리 표시 용도).

### 간이 정렬 블록 — `{align=...}`

열별 사양 없이 표 전체를 한 방향으로 정렬할 때 사용합니다.

```markdown
{align=center}

| A | B | C |
|---|---|---|
| 1 | 2 | 3 |
```

- 허용 값: `left` / `right` / `center` — 다음 표의 모든 셀에 적용됩니다.

---

## 3. 그 외 SmartMD 텍스트 확장

`smartmd.js`가 함께 처리하는, 표준 마크다운에 없는 표현식입니다.

### 변수 플레이스홀더 — `{{name}}`

```markdown
사용자: {{user.name}}, 키: {{api-key}}, 부정: {{!enabled}}
```

- 패턴: `{{name}}` / `{{!name}}` (앞에 `!` 부정 접두사 허용)
- 이름에 영문/숫자/`_`/`.`/`-` 사용 가능.
- `<code>{{...}}</code>` 인라인 코드로 강조됩니다.

### 이미지 속성 접미사 — `![](x){...}`

```markdown
![alt](image.png){width=500px}
```

- Pandoc 스타일 속성 접미사를 허용하되, 렌더링 시 `{...}` 부분은 **제거**됩니다(호환 처리).

### 프런트매터 — 문서 첫머리 `---` 블록

```markdown
---
title: Markdown Editor
author: tools.camp
date: 2026-05-08
---
```

- 문서 **첫 줄**부터 시작해야 하며, 인식 키는 `title`, `subtitle`, `author`, `date`, `locale`, `style`.
- 메타데이터 배너(`smart-frontmatter`)로 렌더링됩니다.
- 첫머리 `---` 블록은 프런트매터로 우선 처리되어, 페이지 분할 구분선으로 취급되지 않습니다.

---

## 요약표

| 표현식            | 마커                       | 핵심 |
|-------------------|----------------------------|------|
| 콜아웃            | `:::type … :::`            | `success`/`warning`/`danger`/`info`/`note`/`tip` + `title="..."` |
| Figure            | `:::figure … :::`          | `caption="..."` (그림 하단 캡션) |
| SmartMD 표        | `{table columns=[…]}`      | 열별 `name`/`title`/`align`/`width`, `caption` |
| 표 전체 정렬      | `{align=…}`                | `left`/`right`/`center` |
| 변수              | `{{name}}`                 | `{{!name}}`, `{{a.b-c}}` |
| 이미지 속성       | `![](x){…}`                | 속성 제거(호환) |
| 프런트매터        | `---` … `---` (문서 첫머리)| `title`/`subtitle`/`author`/`date`/`locale`/`style` |
