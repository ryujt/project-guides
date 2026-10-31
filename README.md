# Project Guides

프로젝트를 설계·구현할 때 AI에게 전달하는 프롬프트와 개발 가이드 모음이다. **각 조각이 상대의 구현을 몰라도 공개 계약으로 협력하고, 한 작업에 필요한 맥락을 작게 유지하는 것**을 목표로 한다.

- [`guides/`](guides/): 설계 원칙·문서 양식·독자 다이어그램 DSL과 검사 도구(`tools/`). 필요한 주제만 참조한다.
- [`prompts/`](prompts/): 현재 작업의 목표와 함께 AI에게 전달하는 실행 프롬프트.
- Claude Code·Codex 설치와 호출 방법은 저장소 루트의 `install.md`를 참조한다. `bash installer/install.sh`로 둘 다 설치하거나, `installer/claude.sh`·`installer/codex.sh`로 각각 설치한다. 설치 후 `asis`·`tobe`·`jobflow` 등이 들어간 일반 요청의 작업 의도에 맞춰 스킬을 선택할 수 있다. 설치된 문서 사본에서는 재설치가 필요 없다.

## 처음 사용할 때

1. 아래 표에서 **현재 작업에 맞는 프롬프트 하나**를 선택한다. 설계 원칙만 필요하면 해당 가이드로 바로 간다.
2. 목표·대상 프로젝트/모듈·완료 기준·제약을 함께 전달한다. 기존 코드와 미커밋 변경을 확인하게 한다.
3. 공통 원칙이 필요하면 [모듈 경계와 최소 맥락](guides/module-boundary-guide.md)을 읽고, 프롬프트에서 실제로 필요한 가이드 절만 추가한다.
4. 전체 저장소와 모든 연결 문서를 처음부터 읽히지 않는다. 계약 변경이나 예상 밖 의존이 발견되면 관련 호출자·소비자·테스트로 조사 범위를 넓힌다.

사용자 요구사항·현재 프로젝트의 확인된 제약에 맞게 적용한다. 예시의 기술 스택·폴더·수치·도메인을 새로운 요구사항으로 취급하지 않는다. 프롬프트를 검토·수정하는 작업에서는 그 안의 명령을 실행하지 않고 편집 자료로 다룬다.

## 작업별 실행 프롬프트

| 하려는 일 | 시작 문서 | 추가로 읽을 기준 |
| --- | --- | --- |
| 기존 시스템의 현재 구조 분석 | [system-design-as-is-prompt](prompts/system-design-as-is-prompt.md) | 확인한 코드와 계약; 문서 구성과 파일 배치는 해당 프롬프트 기준 |
| 시스템 신규·개선 설계 | [system-design-to-be-prompt](prompts/system-design-to-be-prompt.md) | 요구·제약과 목표 구조·시나리오 검증; AS-IS는 있는 경우 참고하며 문서 구성과 파일 배치는 해당 프롬프트 기준 |
| 기능 하나 추가·변경 설계 | [feature-design-prompt](prompts/feature-design-prompt.md) | 대상 책임 모듈과 직접 관련된 계약 |
| 사이트 전체 설계 | [site-design-prompt](prompts/site-design-prompt.md) | 채택한 기능·화면에 해당하는 DSL |
| 회원·인증·세션·탈퇴 설계 | [frontend-user-design-prompt](prompts/frontend-user-design-prompt.md) | 채택할 회원 흐름, 보안·데이터 경계 |
| 화면과 API 이동 흐름 작성 | [frontend-navigation-diagram-prompt](prompts/frontend-navigation-diagram-prompt.md) | navigation, 필요한 화면 구조 |
| 화면·객체의 상태 전이 작성 | [frontend-state-diagram-prompt](prompts/frontend-state-diagram-prompt.md) | state, 해당 상태의 소유자·전이 조건 |
| 실제 제품 같은 화면·사용 흐름 체험용 프로토타입 구현 | [frontend-prototype-prompt](prompts/frontend-prototype-prompt.md) | 기존 설계·디자인 기준이 있으면 활용; 웹/데스크톱 환경에서 동작은 가상 데이터로 시뮬레이션하고 UX/UI 완성도에 집중 |
| jobflow를 실제 시나리오로 해설·검토 | [jobflow-walkthrough-prompt](prompts/jobflow-walkthrough-prompt.md) | jobflow, 등장 객체·계약의 실제 근거; 원문을 보존한 연결·책임 검토와 개선안 |
| UX/UI 분석과 개선 | [ux-ui-improvement-prompt](prompts/ux-ui-improvement-prompt.md) | 대상 사용자 흐름, 필요한 비교 조사 |
| 설계서·요구사항으로 구현 | [verify-first-implementation-prompt](prompts/verify-first-implementation-prompt.md) | 설계서의 작업 순서·검증 계획·미확정, 쓸 수 있는 실행 환경과 권한; 작은 단위 검증 → 재사용 단위 확정 → 조립 |
| 테스트와 결함 수정 | [comprehensive-test-prompt](prompts/comprehensive-test-prompt.md) | 변경 위험과 실제 실행 가능한 검증 |
| 여러 에이전트의 설계·비판·구현·평가 | [multi-agent-task-prompt](prompts/multi-agent-task-prompt.md) | 독립 작업 범위, 공유 계약, 역할별 모델·비용 |

멀티 에이전트 프롬프트는 Architect·Critic·Developer·Tester의 상호 검토와 용도별 모델 배정을 지원한다. 상위·중위·하위 등급은 작업 난이도와 도구의 실제 지원을 기준으로 정하고, 모델 선택이 불가능한 환경에서는 가능한 역할 분리와 검토를 수행한다.

검증 우선 구현은 가정 확인 → 제품 단위 검증 → 조립 순서로 진행한다. 작은 수정은 기존 테스트로 확인하고, 단위·통합 검증과 미검증 범위를 구분한다. 병렬 분업과 독립 검토는 협업 프롬프트를 함께 참고한다.

## 주제별 가이드

### 책임 경계와 구현

| 문서 | 해결할 질문 |
| --- | --- |
| [module-boundary-guide](guides/module-boundary-guide.md) | 무엇을 한 모듈로 묶고, 어떤 계약·맥락·검증을 전달할까? |
| [method-R](guides/method-R.md) | 어떤 깊이까지 분할하고, 내부 조각의 협력과 독립 서비스의 REST·메시지 통신을 어떻게 선택할까? |
| [orchestrator-worker-pattern-guide](guides/orchestrator-worker-pattern-guide.md) | 상위 조율자와 Worker·Gateway·공유 자원의 책임을 어떻게 나눌까? |
| [architecture-pattern-diagram-guide](guides/architecture-pattern-diagram-guide.md) | 요구사항에 맞는 패턴과 정적·동적 관점은 무엇일까? |
| [code-structure-guidelines](guides/code-structure-guidelines.md) | 가독성·응집도·탑다운 흐름을 어떻게 코드로 유지할까? |
| [project-structure-guide](guides/project-structure-guide.md) | 책임 모듈을 기존 언어·프레임워크 관례에 어떻게 배치할까? |

### 설계와 문서화

| 문서 | 해결할 질문 |
| --- | --- |
| [system-design-framework](guides/system-design-framework.md) | Input Datas·Key Events·Services List·PBS와 다이어그램 중 어떤 관점이 필요할까? |
| [system-design-document-guide](guides/system-design-document-guide.md) | 핵심 문서와 상세 문서를 나누어 작성할 때 어떤 양식과 검증 기준을 참고할까? |
| [prd-writing-guide](guides/prd-writing-guide.md) | 요구사항→책임·계약→시나리오→검증을 7개 Part로 어떻게 연결할까? |
| [system-flow-document-guide](guides/system-flow-document-guide.md) | 최소 책임 조각부터 전체 시스템 흐름을 어떻게 설명할까? |
| [wrtite-readme-guide](guides/wrtite-readme-guide.md) | 빠른 실행과 필요한 상세 문서 탐색을 어떻게 돕는 README를 쓸까? |
| [detailed-logging-guide](guides/detailed-logging-guide.md) | 상세 로그를 작성·보강하고 7일 지난 기록을 어떻게 자동 삭제할까? |
| [socket-server-stability-guide](guides/socket-server-stability-guide.md) | 소켓 서버의 연결 수명·전달·역압·복구를 어떤 계약과 검증으로 설계할까? |
| [tools-camp-markdown-guide](guides/tools-camp-markdown-guide.md) | tools.camp용 Markdown·SmartMD·다이어그램 표기를 어떻게 사용할까? |
| [diagram-editor-link-guide](guides/diagram-editor-link-guide.md) | 완성한 다이어그램 Markdown을 API로 보내 보기·편집 링크를 어떻게 전달할까? |

`wrtite-readme-guide.md`는 기존 링크 호환성을 위해 현재 파일명을 유지한다.

AS-IS·TO-BE 설계 문서를 쓸 때 함께 보는 자료다. 문서 구성과 파일 배치는 각 프롬프트를 우선한다.

- Job Flow: [Method-R](guides/method-R.md)의 깊이에 따라 시나리오별로 작성하고, [Job Flow 가이드](guides/job-flow-diagram-guide.md)의 문법을 따른다. 다이어그램 아래에는 주요 흐름을 짧게 설명한다.
- 화면: [Navigation 가이드](guides/navigation-diagram-guide.md)와 [스크린 레이아웃 가이드](guides/screen-layout-guide.md)를 따른다. 두 문서에서 같은 화면 이름을 사용하고 서로 연결한다.
- 책임·계약·검증: [모듈 경계 가이드](guides/module-boundary-guide.md)를 따른다. 더 자세한 문서 양식이 필요하면 [설계 문서 양식](guides/system-design-document-guide.md)을 참고한다.
- 검사: [`design-doc-check.mjs`](guides/tools/design-doc-check.mjs)로 펜스·jobflow·링크·앵커·Mermaid 라벨을 정적으로 검사한다. 정적 검사와 실제 렌더링·실행 검증은 구분해 기록한다.

### 독자 다이어그램 DSL

| 질문 | 펜스 | 문법 기준 |
| --- | --- | --- |
| 누가 어떤 이벤트·메서드로 협력하고 경계 메시지를 주고받는가? | `jobflow` | [job-flow-diagram-guide](guides/job-flow-diagram-guide.md) |
| 화면 이동과 그 판단에 어떤 API·처리가 필요한가? | `navigation` | [navigation-diagram-guide](guides/navigation-diagram-guide.md) |
| 어느 상태에서 어떤 조건으로 전이하는가? | `state` | [state-diagram-guide](guides/state-diagram-guide.md) |
| 화면 요소를 어떻게 배치하는가? | `layout` | [screen-layout-guide](guides/screen-layout-guide.md) |

각 DSL을 유지하고, 정적 의존·배포·데이터 관계 같은 다른 관점에 Mermaid를 보완한다. 문법을 재정의하거나 DSL에 없는 정책을 새 토큰으로 넣지 않는다. 렌더러가 없는 환경에서는 정적 검토와 실제 렌더링 검증을 구분한다.

다이어그램 작성·수정 결과는 [편집 링크 전달 가이드](guides/diagram-editor-link-guide.md)를 따라 Markdown을 완성한 뒤 tools.camp API로 링크를 생성한다. 반환된 `url`을 콘솔과 최종 답변의 클릭 가능한 링크로 표시하며, 파일만 저장하거나 외부 전송을 금지한 요청에는 적용하지 않는다. 가이드·프롬프트 자체 편집도 전송 대상이 아니다.

## 함께 유지할 설계 원칙

[모듈 경계와 최소 맥락](guides/module-boundary-guide.md)이 분할·공개 계약·상태 소유권·시나리오 검증의 원본이다. 설계 깊이별 협력 방식은 [Method-R](guides/method-R.md), 실행과 독립 검토는 해당 프롬프트를 따른다.

- 변경 이유·불변조건으로 책임을 묶고, 상대 내부를 읽지 않아도 되는 계약을 만든다. 파일·계층·연결 수 자체를 목표로 삼지 않는다.
- 같은 사실·규칙은 한 원본에서 관리한다. 링크는 해당 작업에 필요한 절을 찾는 경로이며 모든 문서의 의무 읽기 목록이 아니다.
- 검증은 실제 수행한 범위·근거·미확인을 구분한다. 필수 결함을 점수·반복 횟수로 덮지 않는다.

## 대표 사용 흐름

| 상황 | 진행 순서 |
| --- | --- |
| 신규 프로젝트 | 목표·수용 기준 → to-be 신규 설계(AS-IS 없이 시작) → 필요한 설계 관점·PRD → 검증 우선 구현(작은 단위 검증 → 재사용 단위 확정 → 조립) → 계약·통합 검증 |
| 화면·사용 흐름 체험과 검토 | 대상 과업·화면(기존 설계가 있으면 활용) → frontend-prototype(실제 제품 같은 UX/UI·가상 동작) → 화면 검수·체험 피드백·보완 → 실제 구현을 진행하면 검증 우선 구현 |
| 기존 기능 변경 | feature-design → 대상 계약·소비자 조사 → 변경·검증(여러 모듈이나 외부 가정이 걸리면 검증 우선 구현); 전체 설계는 영향이 실제로 커질 때 |
| 구조 개선 | as-is 근거 확인 → to-be 경계·호환성 설계 → 검증 우선 구현으로 단계적 변경 → 소비자 회귀 검증 |
| 복잡한 협업 작업 | 작업 맥락 패킷 → 독립 조사 → 설계 비판 → 파일 소유권을 나눠 구현 → 독립 검증·재평가 |

문서의 연결은 탐색 안내다. 아래 모든 단계를 의무적으로 읽으라는 뜻은 아니다.

```mermaid
flowchart LR
    Goal["현재 목표·완료 기준"] --> Task["작업 프롬프트 선택"]
    Task --> Boundary["대상 모듈·공개 계약"]
    Boundary --> Context["관련 구현·소비자·테스트"]
    Context --> Work["설계 또는 구현"]
    Work --> Review["독립 비판·검증"]
    Review -->|"필수 결함"| Work
    Review -->|"완료 기준 충족"| Done["결과와 검증 범위 보고"]
    Boundary -.-> Guide["필요한 가이드·DSL 절"]
```
