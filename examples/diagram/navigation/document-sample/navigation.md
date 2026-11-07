# 자료 열람 Navigation 문서 샘플

## 범위·확인 기준

가상의 자료 열람 서비스를 사용해 문서의 구성과 화면 확인 링크를 보여 준다. 실제 제품의 구현·관찰 결과가 아니다. 경로와 처리 조건은 이 샘플의 가정이며, HTML은 예시 데이터로 장면을 전환한다. 서버 호출·의견 저장은 수행하지 않는다.

## 시나리오 색인

| 시나리오 | 사용자 과업·진입 조건 | 관련 페이지 | 상세 절 | 확인 상태·근거 |
| --- | --- | --- | --- | --- |
| N01 | 자료 목록에서 자료를 열고 목록으로 돌아오기 | 자료 목록, 자료 상세 | [N01](#n01) | 가상 계약·HTML 시뮬레이션 |
| N02 | 자료 상세에서 의견 접수하기 | 자료 상세 | [N02](#n02) | 가상 계약·HTML 시뮬레이션 |
| N03 | 상세 URL 직접 진입과 이용 불가 결과 확인 | 자료 상세, 자료 목록 | [N03](#n03) | 가상 계약·HTML 시뮬레이션 |

## 페이지 노드 대응

| Navigation 표기 | 화면 ID | 가상 경로·진입 조건 | Layout | 기본 화면 HTML |
| --- | --- | --- | --- | --- |
| ResourceList | resource-list | `/resources`, 공개 목록 | [자료 목록](screen-layout.md#resource-list) | [자료 목록 확인](details/screens/resource-list.html#default) |
| ResourceDetail | resource-detail | `/resources/:id`, 목록 선택 또는 직접 진입 | [자료 상세](screen-layout.md#resource-detail) | [자료 상세 확인](details/screens/resource-detail.html#default) |

페이지의 장면 이름은 [Layout 장면 표](screen-layout.md)를 기준으로 연결한다. 아래의 `#default`는 이 샘플에서 선택한 기본 장면 식별자다. 같은 페이지를 여러 시나리오에서 쓰더라도 화면 확인 링크는 각 시나리오에 반복한다.

## 공통 가드·계약

이 샘플에는 공통 인증·권한 가드가 없다. 자료 목록과 자료 상세는 공개 페이지로 가정한다. 자료 불러오기·의견 입력·이용 불가 조건은 각 시나리오 절을 원본으로 두며, 실제 서버의 공개 계약을 확인한 것으로 해석하지 않는다.

<a id="n01"></a>
## N01. 목록에서 자료 열기와 목록 복귀

### 진입 조건

사용자는 자료 목록의 기본 장면에서 자료 제목을 선택한다. 이 가상 계약에서는 선택한 자료를 불러올 수 있으면 상세로 이동하고, 불러오기에 실패하면 목록에 머무르며 다시 선택할 수 있게 한다.

### 이동과 분기

```navigation
ResourceList --> (open_resource) : 자료 제목 선택
(open_resource) --> ResourceDetail : 불러오기 성공
(open_resource) --> ResourceList(LoadError) : 불러오기 실패
ResourceList(LoadError) --> ResourceList : 다시 목록 보기
ResourceDetail --> ResourceList : 자료 목록으로 선택
```

- 제목을 선택하면 자료 상세의 기본 장면을 연다.
- 실패 장면에서는 목록으로 돌아가 자료를 다시 선택할 수 있다.
- 자료 상세의 목록 링크는 자료 목록의 기본 장면으로 돌아간다.

### 결과·복귀

성공 결과는 자료 제목·본문·의견 입력 폼이 보이는 상세 화면이다. 실패 결과는 자료 목록의 불러오기 실패 장면이며, 자료가 열린 것으로 표시하지 않는다. HTML의 정상 이동과 실패 장면 선택은 서버 조회를 재현하는 예시다.

### 화면 확인 링크

| 페이지·장면 | 화면 HTML | Layout |
| --- | --- | --- |
| 자료 목록 · 기본 | [목록 화면 확인](details/screens/resource-list.html#default) | [목록 배치](screen-layout.md#resource-list) |
| 자료 목록 · 불러오기 실패 | [실패 장면 확인](details/screens/resource-list.html#load-error) | [목록 장면 표](screen-layout.md#resource-list-scenes) |
| 자료 상세 · 기본 | [상세 화면 확인](details/screens/resource-detail.html#default) | [상세 배치](screen-layout.md#resource-detail) |

### 근거·미확인

처리 조건은 이 절에 적은 가상 계약이다. 실제 표시와 링크의 원본은 위 HTML과 [장면 전환 스크립트](details/screens/assets/preview.js)다. 실제 API의 응답·캐시·조회 실패 정책을 확인한 결과로 사용하지 않는다.

<a id="n02"></a>
## N02. 같은 상세 페이지에서 의견 접수하기

### 진입 조건

사용자는 자료 상세의 기본 장면에서 의견을 입력하고 접수 버튼을 누른다. 가상 계약은 공백을 제외한 내용이 없으면 입력 오류를 표시하고, 내용이 있으면 같은 상세 페이지에서 접수 안내를 표시한다.

### 이동과 분기

화면 이동이 없는 과업이다. 자료 상세 안에서 기본·입력 오류·접수 안내 장면이 바뀌며, 이를 별도 페이지나 가상의 이동 화살표로 만들지 않는다.

- 빈 의견을 접수하면 입력 오류 장면을 표시하고 입력 폼을 유지한다.
- 의견을 입력해 접수하면 같은 상세 페이지에 접수 안내 장면을 표시한다.
- 접수 안내의 의견 다시 쓰기를 누르면 같은 페이지의 기본 장면으로 돌아간다.

### 결과·복귀

입력 오류는 자료 본문과 의견 입력 폼 아래의 오류 안내로 확인한다. 접수 안내는 이 예제의 화면 표시 결과이며 서버 저장이나 처리 완료를 뜻하지 않는다. 다음 의견 작성은 같은 상세 페이지에서 시작한다.

### 화면 확인 링크

| 페이지·장면 | 화면 HTML | Layout |
| --- | --- | --- |
| 자료 상세 · 기본 | [의견 입력 화면 확인](details/screens/resource-detail.html#default) | [상세 배치](screen-layout.md#resource-detail) |
| 자료 상세 · 입력 오류 | [입력 오류 장면 확인](details/screens/resource-detail.html#validation) | [상세 장면 표](screen-layout.md#resource-detail-scenes) |
| 자료 상세 · 접수 안내 | [접수 안내 장면 확인](details/screens/resource-detail.html#result) | [상세 장면 표](screen-layout.md#resource-detail-scenes) |

### 근거·미확인

입력 조건은 이 절의 가상 계약이고, 폼의 실제 예시 동작은 [상세 HTML](details/screens/resource-detail.html#default)과 [장면 전환 스크립트](details/screens/assets/preview.js)에 있다. 실제 의견 API·저장소·중복 접수·재시도 정책은 이 샘플의 대상이 아니다.

<a id="n03"></a>
## N03. 상세 주소 직접 진입과 이용 불가 결과

### 진입 조건

사용자가 자료 상세의 가상 주소 `/resources/:id`를 북마크로 열거나 새로고침한다. 도착 페이지는 자료 상세다. 직접 URL 접속 자체는 화면 이동 화살표로 그리지 않는다. 예시 HTML은 `resource-detail.html#default` 또는 `#unavailable`로 해당 결과를 직접 연다.

### 이동과 분기

화면을 여는 순간의 불러오기 판단은 진입 처리 `(load_resource)`에서 시작한다. 가상 계약상 이용할 수 없는 자료도 같은 상세 경로에서 안내를 표시하며, 목록 복귀는 사용자의 선택이다.

```navigation
(load_resource) --> ResourceDetail : 자료 이용 가능
(load_resource) --> ResourceDetail(Unavailable) : 자료 이용 불가
ResourceDetail --> ResourceList : 자료 목록으로 선택
ResourceDetail(Unavailable) --> ResourceList : 자료 목록으로 선택
```

- 이용 가능한 자료는 상세 기본 장면을 표시한다.
- 이용할 수 없는 자료는 상세의 이용 불가 장면을 표시한다.
- 두 결과 모두 목록 링크를 눌러 자료 목록으로 돌아간다.

### 결과·복귀

이용 불가 결과에서는 자료 본문과 의견 폼을 표시하지 않는다. 자동으로 목록으로 이동하거나 로그인 페이지를 추가하는 처리는 이 샘플에 없다. URL의 데이터 ID별로 HTML 파일을 늘리지 않고 한 상세 페이지의 장면으로 비교한다.

### 화면 확인 링크

| 페이지·장면 | 화면 HTML | Layout |
| --- | --- | --- |
| 자료 상세 · 기본 | [직접 진입 성공 장면 확인](details/screens/resource-detail.html#default) | [상세 배치](screen-layout.md#resource-detail) |
| 자료 상세 · 이용 불가 | [이용 불가 장면 확인](details/screens/resource-detail.html#unavailable) | [상세 장면 표](screen-layout.md#resource-detail-scenes) |
| 자료 목록 · 기본 | [복귀 목록 화면 확인](details/screens/resource-list.html#default) | [목록 배치](screen-layout.md#resource-list) |

### 근거·미확인

직접 진입 조건과 결과는 이 절의 가상 계약이다. 장면의 실제 표시 원본은 [상세 HTML](details/screens/resource-detail.html#unavailable)이다. 이 HTML의 fragment 전환은 제품 라우터·서버 상태·접근 권한을 검증하지 않는다.

## 검증

이 샘플은 시나리오별 문서 구성, 페이지와 장면 구분, 화면 확인 링크를 보여 준다. 실제 시스템 분석·다이어그램 렌더링·제품 실행의 검증 결과를 대신하지 않는다. 적용한 작업에서는 해당 작업의 원본 근거와 실제 수행한 검증을 별도로 기록한다.
