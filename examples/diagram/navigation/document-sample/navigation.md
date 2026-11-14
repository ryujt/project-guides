# 자료 열람 Navigation 문서 샘플

## 범위·확인 기준

가상의 자료 열람 서비스를 사용해 문서의 구성과 화면 확인 링크를 보여 준다. 실제 제품의 구현·관찰 결과가 아니다. 경로와 처리 조건은 이 샘플의 가정이며, HTML은 예시 데이터로 장면을 전환한다. 서버 호출·의견 저장은 수행하지 않는다.

<a id="n01"></a>
## N01. 목록에서 자료 열기와 목록 복귀

```navigation
ResourceList --> (open_resource) : 자료 제목 선택
(open_resource) --> ResourceDetail : 불러오기 성공
(open_resource) --> ResourceList(LoadError) : 불러오기 실패
ResourceList(LoadError) --> ResourceList : 다시 목록 보기
ResourceDetail --> ResourceList : 자료 목록으로 선택
```

- 공개 자료 목록에서 제목을 선택하면 자료 상세의 기본 장면을 연다. 자료 조회는 가상 계약이며 HTML의 장면 선택으로 표현한다.
- 실패 장면에서는 목록으로 돌아가 자료를 다시 선택할 수 있다.
- 자료 상세의 목록 링크는 자료 목록의 기본 장면으로 돌아간다.

### 화면 확인 링크

| 페이지·장면 | 화면 HTML | Layout |
| --- | --- | --- |
| 자료 목록 · 불러오기 실패 | [기본](details/screens/resource-list.html#default) · [불러오기 실패](details/screens/resource-list.html#load-error) | [배치·장면](screen-layout.md#resource-list) |
| 자료 상세 · 기본 | [상세 화면 확인](details/screens/resource-detail.html#default) | [상세 배치](screen-layout.md#resource-detail) |

<a id="n02"></a>
## N02. 같은 상세 페이지에서 의견 접수하기

화면 이동이 없는 과업이다. 자료 상세 안에서 기본·입력 오류·접수 안내 장면이 바뀌며, 이를 별도 페이지나 가상의 이동 화살표로 만들지 않는다.

- 자료 상세에서 빈 의견을 접수하면 입력 오류 장면을 표시하고 입력 폼을 유지한다.
- 의견을 입력해 접수하면 같은 상세 페이지에 접수 안내 장면을 표시한다. 화면 표시 예시이며 서버 저장·업무 완료를 뜻하지 않는다.
- 접수 안내의 의견 다시 쓰기를 누르면 같은 페이지의 기본 장면으로 돌아간다.

### 화면 확인 링크

| 페이지·장면 | 화면 HTML | Layout |
| --- | --- | --- |
| 자료 상세 · 입력 오류·접수 안내 | [기본](details/screens/resource-detail.html#default) · [입력 오류](details/screens/resource-detail.html#validation) · [접수 안내](details/screens/resource-detail.html#result) | [배치·장면](screen-layout.md#resource-detail) |

<a id="n03"></a>
## N03. 상세 주소 직접 진입과 이용 불가 결과

```navigation
(load_resource) --> ResourceDetail : 자료 이용 가능
(load_resource) --> ResourceDetail(Unavailable) : 자료 이용 불가
ResourceDetail --> ResourceList : 자료 목록으로 선택
ResourceDetail(Unavailable) --> ResourceList : 자료 목록으로 선택
```

- 상세 주소를 직접 열거나 새로고침하면 진입 처리에서 자료 이용 가능 여부를 판단한다. 직접 URL 접속 자체는 이동 화살표로 그리지 않는다.
- 이용 가능하면 상세 기본 장면을, 이용할 수 없으면 본문·의견 폼 대신 이용 불가 안내를 표시한다.
- 두 결과 모두 목록 링크를 눌러 자료 목록으로 돌아간다.

### 화면 확인 링크

| 페이지·장면 | 화면 HTML | Layout |
| --- | --- | --- |
| 자료 상세 · 이용 불가 | [기본](details/screens/resource-detail.html#default) · [이용 불가](details/screens/resource-detail.html#unavailable) | [배치·장면](screen-layout.md#resource-detail) |
| 자료 목록 · 기본 | [복귀 목록 화면 확인](details/screens/resource-list.html#default) | [목록 배치](screen-layout.md#resource-list) |

## 검증

이 샘플은 시나리오별 문서 구성, 페이지와 장면 구분, 화면 확인 링크를 보여 준다. 실제 시스템 분석·다이어그램 렌더링·제품 실행의 검증 결과를 대신하지 않는다. 적용한 작업에서는 해당 작업의 원본 근거와 실제 수행한 검증을 별도로 기록한다.
