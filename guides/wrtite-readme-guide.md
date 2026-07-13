* 프로젝트 소스 코드에 대한 README.md 문서를 완성해줘.
* docs/etc/guides 폴더의 문서를 참고해서 작성해줘.
* 구성이 복잡한 경우에는
  * 전체와 개별 콤포넌트를 각각 나눠서 작성해줘.
  * 상황 및 시나리오 별로 나눠서 작성해줘.
* 시스템 구성은 Mermaid로 작성해줘. 
* 다이어그램은 각 가이드의 DSL 펜스를 그대로 사용한다 — 다른 형식으로 변환·치환하지 않는다.
  * Job Flow Diagram → ```` ```jobflow ```` (`sequenceDiagram` 대체 금지)
  * Navigation Diagram의 Screen Flow → ```` ```navigation ````
  * Navigation Diagram의 Logic Flow → ```` ```state ```` (`flowchart` 대체 금지)
  * Screen Layout → ```` ```layout ````

## 파트별 참고 문서

각 파트를 생성할 때는 아래 문서를 참고한다.

| 파트 | 참고 문서 |
|---|---|
| 시스템 개요 | `system-design-framework.md` |
| 시스템 구성 | `architecture-pattern-diagram-guide.md` · `method-R.md` · `orchestrator-worker-pattern-guide.md` |
| Input Datas | `system-design-framework.md` |
| Key Events | `system-design-framework.md` |
| Services List | `system-design-framework.md` · `orchestrator-worker-pattern-guide.md` |
| PBS (Process Breakdown Structure) | `system-design-framework.md` |
| Job Flow Diagram | `job-flow-diagram-guide.md` · `system-flow-document-guide.md` |
| Navigation Diagram — Screen Flow | `navigation-diagram-guide.md` |
| Navigation Diagram — Logic Flow | `state-diagram-guide.md` |
| Screen Layout | `screen-layout-guide.md` |
| 프로젝트 구조 | `project-structure-guide.md` · `code-structure-guidelines.md` |
| 설정 · 실행 | 참고 문서 없음 — 실제 코드·설정 파일 근거로 작성 |

필요한 목차는 다음과 같다.

---

# 프로젝트 명

## 시스템 개요

## 시스템 구성

## Input Datas

## Key Events

## Services List

## PBS (Process Breakdown Structure)

## Job Flow Diagram

## Navigation Diagram
### Screen Flow
### Logic Flow

## Screen Layout

## 프로젝트 구조

## 설정

## 실행
