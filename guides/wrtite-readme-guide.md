# 프로젝트 README 작성 가이드

README는 프로젝트의 목적, 실행 방법, 책임 모듈과 상세 문서의 위치를 빠르게 알려주는 진입점이다. 설계 문서 전체를 README에 복사하지 않는다. 기존 파일명 `wrtite-readme-guide.md`는 링크 호환성을 위해 유지한다.

## 작성 절차

1. 실제 코드·설정·실행 스크립트·기존 문서를 읽어 지원 기능과 실행 명령을 확인한다. 계획된 기능과 현재 동작을 구분한다.
2. 사용자와 개발자가 처음 수행할 대표 경로를 정리한다. 실행하지 않은 명령을 검증 완료로 쓰지 않는다.
3. [모듈 경계 가이드](module-boundary-guide.md)에 따라 책임 모듈·공개 진입점·상세 계약의 위치를 연결한다.
4. 필요한 설계 관점만 [시스템 설계 프레임워크](system-design-framework.md)에서 선택한다. 모든 8개 섹션을 README에 넣을 필요는 없다.
5. 모듈 내부 설명은 기존 모듈 문서·계약·테스트를 링크한다. 별도 문서는 독립적으로 읽거나 갱신할 이유가 있을 때만 만든다.

## 기본 목차

```markdown
# 프로젝트명

프로젝트가 해결하는 문제와 지원 범위.

## 빠른 시작
- 확인된 실행 환경·필수 의존
- 설치·설정·실행 명령과 성공 확인 방법
- 최소 사용 예

## 시스템 구성
- 주요 책임 모듈과 공개 진입점
- 필요한 경우 정적 구조 Mermaid와 대표 흐름 링크

## 개발과 검증
- 관련 소스·계약·테스트 위치
- 확인된 테스트·검증 명령
- 기능 변경 시 필요한 문서를 찾는 방법

## 운영과 제약
- 필요한 환경변수·비밀값 주입 방식
- 해당하는 로그·데이터·복구·종료 정책의 위치
- 지원하지 않는 기능과 알려진 제약

## 상세 문서
- 설계·모듈 계약·다이어그램의 실제 링크
```

작은 도구는 목적·빠른 시작·검증·제약만으로 충분하다. 설치가 필요 없는 프로젝트에 설치 절차를 만들거나, UI가 없는 시스템에 화면 목차를 만들지 않는다.

## 선택 관점과 기준 문서

| 필요한 내용 | 참조 |
| --- | --- |
| 입력 데이터·트리거·Services List·PBS | [system-design-framework](system-design-framework.md) |
| 모듈의 책임·계약·의존·상태 소유권 | [module-boundary-guide](module-boundary-guide.md) |
| 전체 구조와 설명의 상세 수준 | [system-flow-document-guide](system-flow-document-guide.md) |
| 조율자와 Worker의 역할 | [orchestrator-worker-pattern-guide](orchestrator-worker-pattern-guide.md) |
| 객체 호출·이벤트 | [job-flow-diagram-guide](job-flow-diagram-guide.md), `jobflow` |
| 화면 이동과 그 판단에 필요한 API·처리 | [navigation-diagram-guide](navigation-diagram-guide.md), `navigation` |
| 상태 전이 | [state-diagram-guide](state-diagram-guide.md), `state` |
| 화면 배치 | [screen-layout-guide](screen-layout-guide.md), `layout` |
| 소스 폴더와 코드 관례 | [project-structure-guide](project-structure-guide.md), [code-structure-guidelines](code-structure-guidelines.md) |

화면 이동, 일반 처리 순서, 상태 전이는 서로 다른 관점이다. 내부 로직이라는 이유만으로 모두 `state`로 작성하지 않는다. 지정 DSL은 그대로 유지하고 시스템 구성·의존 관계는 Mermaid로 보완한다.

## 완료 기준

- 사용자가 README에서 목적과 실제 실행 경로를 찾을 수 있다.
- 코드·설정·계약·문서 링크가 존재하고 확인한 기준 상태가 명확하다.
- 실제 지원 기능·제안·미확인 사항과 실행/미실행 검증을 구분했다.
- 같은 규칙이나 스키마를 여러 곳에 복제하지 않았다.
- 명령 예시에 비밀값·개인 컴퓨터 절대 경로·무관한 초기화 작업이 없다.
