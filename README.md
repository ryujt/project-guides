# Project Guides

프로젝트 개발을 위한 설계 프레임워크, 코딩 가이드라인, 다이어그램 표기법 등을 정리한 문서 모음입니다.

## 문서 목록

### 설계 프레임워크

| 문서 | 설명 |
|------|------|
| [system-design-framework.md](system-design-framework.md) | 시스템 요구사항 분석부터 설계, 시각화까지의 과정을 표준화한 프레임워크. Input Datas, Key Events, Services List, PBS, 다이어그램 등 8개 섹션으로 구성 |
| [orchestrator-worker-pattern-guide.md](orchestrator-worker-pattern-guide.md) | 기능을 독립적인 단위로 분리하고 객체 간 역할 분담과 제어권 흐름을 정의하는 Orchestrator-Worker 패턴 설계 가이드 |

### 코딩 가이드라인

| 문서 | 설명 |
|------|------|
| [code-structure-guidelines.md](code-structure-guidelines.md) | 가독성 우선, 단일 책임, 탑다운 구조, 상수 관리, 주석 금지 등 코드 구조와 스타일에 대한 일반 원칙 |
| [python-project-rules.md](python-project-rules.md) | Python 프로젝트 구조, 네이밍 컨벤션(PascalCase 디렉토리/파일, snake_case 함수/변수), import 순서 등 규칙 |

### 언어별 이벤트 패턴

| 문서 | 설명 |
|------|------|
| [python-event-handling-guidelines.md](python-event-handling-guidelines.md) | Python에서 `on_event` 속성 기반 이벤트 패턴 작성 지침 |
| [js-event-handling-guidelines.md](js-event-handling-guidelines.md) | Node.js에서 EventEmitter 없이 콜백 속성 방식으로 이벤트를 처리하는 지침 |
| [csharp-event-handling-guidelines.md](csharp-event-handling-guidelines.md) | C#의 `event Action<T>` 패턴을 사용한 이벤트 처리 가이드 |
| [zig-event-handling-guidelines.md](zig-event-handling-guidelines.md) | Zig에서 함수 포인터와 컨텍스트 포인터를 사용한 이벤트 패턴 지침 |

### 다이어그램 가이드

| 문서 | 설명 |
|------|------|
| [job-flow-diagram-guide.md](job-flow-diagram-guide.md) | Orchestrator 객체 내에서 객체 간 메서드 호출과 이벤트 구독 흐름을 표현하는 다이어그램 표기법 |
| [navigation-diagram-guide.md](navigation-diagram-guide.md) | 화면 전환, API 호출, 내부 로직 흐름을 스크립트 형식으로 표현하는 표기법 (Screen Flow, Logic Flow) |
| [state-diagram-guide.md](state-diagram-guide.md) | 객체의 상태 변화를 스크립트로 작성하고 Mermaid `graph LR`로 변환하는 표기법 |
| [screen-layout-guide.md](screen-layout-guide.md) | 화면 레이아웃 구조를 `V`(세로), `>`(가로) 연산자로 정의하는 표기법 |

### 기타

| 문서 | 설명 |
|------|------|
| [wrtite-readme-guide.md](wrtite-readme-guide.md) | 프로젝트 README.md 문서 작성을 위한 목차 템플릿 및 가이드 프롬프트 |
