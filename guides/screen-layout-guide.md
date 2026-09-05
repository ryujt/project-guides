# Layout Diagram Guide

화면의 영역 배치와 포함 관계를 표현한다. 배치 트리는 코드 모듈의 의존성이나 상태 소유권을 결정하지 않는다. 변경할 화면/영역만 작성하고, 관련 컴포넌트의 입력·이벤트·상태 소유자는 [module-boundary-guide.md](module-boundary-guide.md)의 계약으로 연결한다.

## 기본 구조

```layout
Screen V Header, Main, Footer
Header > Logo, Search, UserMenu
Main > Left Sidebar, Content
Content V Title, Filters, Table, Pager
Footer > Status, Version
```

* 각 줄은 “왼쪽 컨테이너”의 자식 배치 방향과 자식 목록을 선언한다.
* 첫 줄은 루트 컨테이너를 선언한다. 관례적으로 `Screen`을 사용한다.

## 방향 연산자

| 연산자 | 의미    | 자식 배치 순서 |
| --- | ----- | -------- |
| `V` | 세로 적층 | 위에서 아래   |
| `>` | 가로 배치 | 왼쪽에서 오른쪽 |

## 문법

### 기본 문법

아래 줄들은 각각의 구문 예시다. 실제 블록은 루트 하나에 연결되는 트리로 작성한다.

```layout
Container1 V Child1, Child2, ...
Container2 > Child1, Child2, ...
```

* `Container`는 “영역 컨테이너” 이름이다.
* `Child`는 “하위 영역(컨테이너 또는 컴포넌트)” 이름이다.
* 자식은 콤마 `,`로 구분하며, 순서가 곧 배치 순서다.
* 이름은 공백을 포함할 수 있다. 연산자는 ` V ` 또는 ` > `처럼 양옆에 공백을 넣고, 자식은 콤마로 구분한다.

### 크기 지정

아래 줄들은 각각 독립된 배분 예시다.

```layout
Container1 > Child1 : 20, Child2 : 80
Container2 > Child1 : 40, Child2
ContainerX V Child1 : 10, Child2 : 80, Child3 : 10
```

* 가로 배분은 `Child : 숫자`로 적고 전체를 100으로 보는 백분율 관례를 사용한다. `%` 문자를 붙이지 않는다. 확인한 구현은 정수로 읽은 값을 가로 flex 가중치로 사용하므로 간격·여백을 포함한 부모의 정확한 픽셀 백분율을 보장하지 않는다.
* 미지정 자식에는 `100 - 지정값 합계`의 나머지 배분 값을 균등하게 준다. 예시 `Container2`의 미지정 자식 값은 60이다. 최종 너비는 이 값과 flex 레이아웃으로 결정된다.
* 세로의 경우에는 크기 지정을 무시한다. 따라서 `ContainerX`의 `Child` 크기 지정 코드는 모두 무시된다.

## 컨테이너와 컴포넌트

* 컨테이너: 좌변에 등장하는 이름(예: `Header`, `Main`, `Content`)
 * 내부에 다른 자식을 가지며, 별도 줄로 레이아웃을 정의한다.
* 컴포넌트: 좌변에 등장하지 않는 이름(예: `Logo`, `Search`, `Title` 등)
 * 더 이상 분해하지 않는 말단 요소로 간주한다.

## 제한 사항

* 좌표, 픽셀, 여백, 정렬 같은 시각 스타일은 다루지 않는다.
* 같은 컨테이너를 여러 줄에서 중복 정의하지 않는다.
* 자식 이름을 좌변에 정의하면 내부를 펼친 컨테이너이고, 정의하지 않으면 말단 컴포넌트다. 모든 자식을 좌변에 다시 정의할 필요는 없다.
* 하나의 블록은 루트 하나의 트리로 작성한다. 순환 포함·자기 포함·같은 노드의 여러 부모를 피하고, 반복 컴포넌트의 다른 배치 위치에는 구분 가능한 이름을 쓴다. 이는 작성 검토 기준이며 렌더러가 자동으로 검사한다고 가정하지 않는다.
* 작성 시 가로 배분 값 합이 100을 넘거나 미지정 자식에 남길 값이 없는지 확인한다. 이는 작성 관례이며 파서의 오류 검사가 아니다. 확인한 구현은 합이 100을 넘으면 미지정 값만 0으로 계산하고 지정된 flex 가중치는 그대로 사용한다. 반응형 분기는 새로운 연산자로 만들지 않고 필요한 화면 폭별로 블록을 나누고 조건을 본문에 적는다.

## 기본 구조를 HTML로 표현한 예시

아래 HTML은 구조를 이해하기 위한 예시이며 대상 렌더러의 정확한 출력이나 픽셀 크기를 보장하지 않는다.

```html
<!doctype html>
<html lang="ko">
<head>
 <meta charset="utf-8">
 <meta name="viewport" content="width=device-width,initial-scale=1">
 <title>Layout</title>
 <style>
   html,body{height:100%;margin:0}
   #screen{height:100%;display:flex;flex-direction:column;gap:8px;padding:8px}
   #header,#footer{display:flex;gap:8px}
   #main{flex:1;display:flex;gap:8px}
   #content{flex:1;display:flex;flex-direction:column;gap:8px}
   #search{flex:1}
   #table{flex:1}
   #screen,#header,#main,#content,#footer,#logo,#search,#usermenu,#leftSidebar,#title,#filters,#table,#pager,#status,#version{border:1px solid #999;padding:8px}
 </style>
</head>
<body>
 <div id="screen">
   <div id="header">
     <div id="logo">Logo</div>
     <div id="search">Search</div>
     <div id="usermenu">UserMenu</div>
   </div>

   <div id="main">
     <div id="leftSidebar">Left Sidebar</div>
     <div id="content">
       <div id="title">Title</div>
       <div id="filters">Filters</div>
       <div id="table">Table</div>
       <div id="pager">Pager</div>
     </div>
   </div>

   <div id="footer">
     <div id="status">Status</div>
     <div id="version">Version</div>
   </div>
 </div>
</body>
</html>
```

## 검토와 확인

배치만 바뀌는 작업에는 해당 layout과 컴포넌트만 읽는다. 동작/상태가 바뀌면 필요한 navigation 또는 state 문서를 추가로 연결한다. 말단마다 별도 모듈·Worker·Store를 만들 필요는 없다.

이름·트리·크기 검토와 실제 화면 검증을 구분한다. DSL 렌더링은 대상 tools.camp에서, 실제 제품의 반응형·키보드 이동·읽기 순서는 제품 UI에서 각각 확인하고 수행한 확인만 기록한다. 문법 레퍼런스는 [tools-camp-markdown-guide.md](tools-camp-markdown-guide.md)를 참고한다.
