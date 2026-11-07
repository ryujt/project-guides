# 자료 열람 화면 배치 샘플

가상의 자료 열람 서비스의 페이지와 장면을 설명한다. 화면 내용·경로·조건은 작성 형식을 보여 주기 위한 가정이며 실제 구현 분석 결과가 아니다. [Navigation](navigation.md)의 각 시나리오에서 해당 HTML 장면으로 바로 이동할 수 있다.

## 페이지 목록

| 화면 ID | 페이지 이름·Navigation 표기 | 가상 경로·진입점·접근 조건 | 관련 시나리오 | Layout 절·HTML | 근거·확인 상태 |
| --- | --- | --- | --- | --- | --- |
| resource-list | 자료 목록 · ResourceList | `/resources`, 공개 목록 | [N01](navigation.md#n01), [N03](navigation.md#n03) | [목록 배치](#resource-list) · [HTML](details/screens/resource-list.html#default) | 가상 계약·예시 HTML |
| resource-detail | 자료 상세 · ResourceDetail | `/resources/:id`, 자료 선택 또는 직접 진입 | [N01](navigation.md#n01), [N02](navigation.md#n02), [N03](navigation.md#n03) | [상세 배치](#resource-detail) · [HTML](details/screens/resource-detail.html#default) | 가상 계약·예시 HTML |

<a id="resource-list"></a>
## 자료 목록 — resource-list

```layout
Screen V PreviewControls, Header, Main
Header > Brand, SampleNotice
Main V PageHeading, PageBody
PageBody V ResourceCards, LoadErrorNotice
ResourceCards V FirstResource, SecondResource
```

| 영역 | 역할·입출력·상호작용 |
| --- | --- |
| PreviewControls | 예시 장면 선택. 실제 제품 UI와 구별한 검토용 영역 |
| Header | 자료실 이름과 가상 예제 안내 |
| PageHeading | 자료 목록 제목과 읽기 안내 |
| ResourceCards | 예시 자료 제목·설명. 제목을 선택하면 상세 기본 장면으로 이동 |
| LoadErrorNotice | 불러오기 실패 안내와 목록으로 돌아가기. 오류 장면에서만 표시 |

넓은 화면과 좁은 화면 모두 자료 카드를 세로로 배치한다. 콘텐츠 너비는 제한하고 좁은 폭에서는 좌우 여백을 줄인다. 공통 헤더와 검토용 제어 영역은 줄바꿈을 허용한다. 특정 폭에서 별도 페이지로 바뀌지는 않는다.

<a id="resource-list-scenes"></a>
### 장면 표

| 장면 ID·이름 | 관련 시나리오·진입 동작/조건 | 보이는 내용·다음 동작/결과 | HTML 장면 링크·전환 방법 | 근거·확인/재현 상태 |
| --- | --- | --- | --- | --- |
| default · 기본 | N01 목록 시작, N03 목록 복귀 | 자료 카드·상세 이동 | [기본 장면](details/screens/resource-list.html#default), 장면 선택의 기본 목록 | 가상 계약·HTML 재현 |
| load-error · 불러오기 실패 | N01 자료 불러오기 실패 | 오류 안내·기본 목록 복귀 | [실패 장면](details/screens/resource-list.html#load-error), 장면 선택의 불러오기 실패 | 가상 계약·HTML 재현 |

<a id="resource-detail"></a>
## 자료 상세 — resource-detail

```layout
Screen V PreviewControls, Header, Main
Header > Brand, ListLink
Main V Breadcrumb, DetailBody
DetailBody V ResourceArticle, FeedbackArea, UnavailableNotice
ResourceArticle V ResourceHeading, ResourceSummary, ResourceText
FeedbackArea V FeedbackForm, ValidationNotice, ResultNotice
FeedbackForm V FeedbackLabel, FeedbackInput, SubmitButton
```

| 영역 | 역할·입출력·상호작용 |
| --- | --- |
| PreviewControls | 기본·입력 오류·접수 안내·이용 불가 장면을 직접 선택 |
| Header·Breadcrumb | 자료 목록으로 돌아가는 실제 HTML 링크 |
| ResourceArticle | 가상 자료의 제목·분류·설명. 기본·입력 오류·접수 안내에서 표시 |
| FeedbackForm | 의견 입력과 접수. 빈 내용은 입력 오류, 값이 있으면 접수 안내로 전환 |
| ValidationNotice | 입력을 요청하는 오류 안내. 같은 페이지에서 입력 폼 유지 |
| ResultNotice | 가상 접수 안내와 의견 다시 쓰기. 이 장면에서는 폼을 숨김 |
| UnavailableNotice | 이용 불가 안내와 목록 복귀. 이 장면에서는 자료 본문·의견 영역을 숨김 |

본문과 의견 영역을 세로로 배치하며 좁은 폭에서도 같은 순서를 유지한다. 폼의 입력과 버튼은 콘텐츠 너비 안에서 표시한다. 실제 서버의 로딩·권한·통신 실패 동작은 이 샘플에 가정하지 않는다.

<a id="resource-detail-scenes"></a>
### 장면 표

| 장면 ID·이름 | 관련 시나리오·진입 동작/조건 | 보이는 내용·다음 동작/결과 | HTML 장면 링크·전환 방법 | 근거·확인/재현 상태 |
| --- | --- | --- | --- | --- |
| default · 기본 | N01 자료 선택, N02 의견 작성 시작, N03 직접 진입 성공 | 자료 본문과 의견 폼 | [기본 장면](details/screens/resource-detail.html#default), 장면 선택의 기본 상세 | 가상 계약·HTML 재현 |
| validation · 입력 오류 | N02 빈 의견 접수 | 자료 본문·의견 폼·입력 오류 | [입력 오류](details/screens/resource-detail.html#validation), 빈 폼 접수 또는 장면 선택 | 가상 계약·HTML 재현 |
| result · 접수 안내 | N02 내용이 있는 의견 접수 | 자료 본문·가상 접수 안내·의견 다시 쓰기 | [접수 안내](details/screens/resource-detail.html#result), 폼 접수 또는 장면 선택 | 가상 계약·HTML 재현 |
| unavailable · 이용 불가 | N03 이용할 수 없는 자료로 직접 진입 | 이용 불가 안내·목록 복귀 | [이용 불가](details/screens/resource-detail.html#unavailable), 장면 선택의 이용 불가 | 가상 계약·HTML 재현 |

각 링크는 해당 HTML을 직접 열어 장면을 표시한다. 모든 장면은 예시 데이터와 바닐라 JavaScript로 동작하며 실제 API를 호출하지 않는다. 가상 조건은 [Navigation 시나리오](navigation.md), 표시 원본은 HTML·[CSS](details/screens/assets/preview.css)·[JavaScript](details/screens/assets/preview.js)에 있다.
