# AS-IS·TO-BE 공통 산출물 배치 가이드

AS-IS·TO-BE 설계 문서의 저장 위치·고정 폴더 구조·화면별 HTML·누락 검증을 정의한다. 문서 내용과 Job Flow 파일의 작성 기준은 [AS-IS 프롬프트](../prompts/system-design-as-is-prompt.md)·[TO-BE 프롬프트](../prompts/system-design-to-be-prompt.md)를 따른다.

## 저장 위치와 고정 구조

문서 생성 일시를 `YYYYMMDD-HHMMSS` 형식의 `{DATE}`로 정하고 `docs/design/{DATE}/` 아래에 작성한다. 같은 설계 작업의 AS-IS·TO-BE는 같은 `{DATE}`를 사용하며, 후속 작성에서는 해당 폴더를 재사용한다. 사용자가 저장 위치를 지정하면 상위 위치를 따르되, 그 아래의 구조는 유지한다.

`{design-type}`은 `as-is` 또는 `to-be`다. 작성할 유형에 다음 구조를 항상 적용한다. 날짜·설계 유형·서비스와 화면 식별자를 제외한 폴더 이름·깊이·문서 이름을 작업마다 바꾸지 않는다.

```text
docs/design/{DATE}/{design-type}/
├── system-design-{design-type}.md
├── navigation.md
├── screen-layout.md
└── details/
    ├── job-flow/
    │   ├── macro.md
    │   ├── system.md
    │   └── <service-name>.md
    └── screens/
        └── <screen-id>.html
```

- `system.md`의 생략 조건과 서비스별 파일 분리는 각 프롬프트를 따른다.
- Navigation은 `navigation.md` 한 파일, Layout은 `screen-layout.md` 한 파일에 모은다. 시나리오·화면마다 Markdown 파일이나 별도 폴더로 다시 나누지 않는다.
- 화면 HTML은 `details/screens/`에 둔다. 공통 CSS·바닐라 JavaScript·이미지 파일이 필요하면 `details/screens/assets/`에 둔다.
- 문서·HTML·자산 간 링크는 상대 경로로 작성하고, 작성 컴퓨터에서만 유효한 경로·링크를 남기지 않는다.

## 화면별 HTML

- 분석·설계 범위의 모든 프론트엔드 페이지·화면마다 `<screen-id>.html`을 생성한다. **모든 Navigation 다이어그램에 등장하는 화면은 HTML이 필수**다. API·처리·메시지 노드는 화면으로 세지 않는다. UI가 있으나 화면 이동이 없는 경우에도 해당 화면 HTML을 만든다.
- `<screen-id>`는 화면을 알아볼 수 있는 영문 소문자·하이픈 이름으로 정한다. 같은 화면이 여러 시나리오에 등장하면 같은 HTML을 재사용하고, 같은 설계 작업의 AS-IS·TO-BE에서 대응하는 화면은 같은 식별자를 쓴다.
- 바닐라 HTML·CSS와 필요한 경우 바닐라 JavaScript로 작성한다. 프레임워크·패키지 설치·빌드·백엔드 연결 없이 브라우저에서 HTML 파일을 직접 열어 확인할 수 있게 한다.
- 화면의 실제 모양을 확인할 수 있도록 주요 콘텐츠·메뉴·버튼·입력 폼·목록과 색상·글꼴·간격·정렬을 표현한다. 영역 이름만 적힌 빈 상자나 프레임워크 컴포넌트 파일로 대신하지 않는다. AS-IS는 코드·화면 관찰로 확인한 현재 모습을 재현하고 근거가 부족한 부분은 미확인으로 기록한다. TO-BE는 제안한 목표 모습을 표현하며 확정 사항·가정을 구분한다.
- 화면 상태 확인에 필요한 동작은 예시 데이터와 바닐라 JavaScript로 표현하고, 실제 API 동작과 구분한다. 적용되는 로딩·빈값·오류·권한 상태와 반응형 차이는 `screen-layout.md`의 설명과 맞춘다.
- `screen-layout.md`의 화면별 절에 화면 이름·식별자·HTML 상대 링크를 적는다. `navigation.md`의 각 시나리오 아래에서는 등장 화면의 해당 절과 HTML을 연결한다. 세 산출물에서 같은 화면 이름을 사용한다.

UI가 없으면 `navigation.md`·`screen-layout.md`에 화면과 HTML이 0개인 이유를 기록하고, 가상의 화면 HTML을 만들지 않는다.

## 검증

전체 화면 목록과 모든 Navigation 다이어그램의 화면 노드를 모아 `screen-layout.md`의 화면별 절·식별자·HTML 파일과 대조한다. Navigation의 화면이 하나라도 HTML 없이 남거나 링크가 끊기면 완료로 판정하지 않는다. 같은 화면의 중복 파일과 HTML에서 참조하는 자산 경로도 확인한다.

HTML을 브라우저에서 열어 화면 모양·적용 상태·필요한 폭별 배치를 확인한다. 실제로 수행한 정적 검토와 브라우저 확인 결과를 구분하고, 브라우저 확인을 수행하지 못하면 미검증 범위를 기록한다. 다이어그램도 파서·렌더러 없이 확인했다면 정적 검토라고 보고한다.
