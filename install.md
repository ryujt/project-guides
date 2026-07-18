# 설치 및 사용 방법

이 저장소의 `guides/`·`prompts/` 문서를 Claude Code **개인 스킬**(`~/.claude/skills`)로 설치해서, 어떤 프로젝트에서든 슬래시 명령으로 바로 사용할 수 있게 한다.

## 1. 설치

### 방법 A — Claude Code에서 (권장)

이 저장소(`project-guides`)를 Claude Code로 연 뒤 입력한다.

```
/install-guides
```

### 방법 B — 터미널에서

```bash
bash installer/install.sh
```

> 설치 위치를 바꾸려면 `CLAUDE_SKILLS_DIR=/원하는/경로 bash installer/install.sh` 로 실행한다.

설치가 끝나면 **새 Claude Code 세션부터** 스킬이 인식된다.

## 2. 설치되는 스킬

### 실행 프롬프트 (슬래시 명령, 어느 프로젝트에서나 사용)

| 명령 | 하는 일 |
|---|---|
| `/system-design-as-is` | 기존 코드베이스를 분석해 AS-IS 설계 분석 문서 생성 |
| `/system-design-to-be` | AS-IS 산출물 + 설계 요청으로 TO-BE 설계 분석 문서 생성 |
| `/feature-design` | 특정 요구사항 하나를 영향 범위로 한정한 기능 설계 문서 생성 |
| `/frontend-user-design` | 회원가입·로그인·세션·탈퇴 등 회원제 프론트엔드 설계 |
| `/frontend-navigation-diagram` | 화면·API 흐름 navigation 다이어그램 작성 |
| `/frontend-state-diagram` | 상태 전이 state 다이어그램 작성 |
| `/multi-agent-task` | 여러 전문 에이전트(Architect·Critic·Developer·Tester) 협업 작업 |
| `/ux-ui-improvement` | 리서치·벤치마킹 기반 UX/UI 개선 설계 |
| `/detailed-logging` | 2계층 상세 로깅 시스템 구현 |
| `/comprehensive-test` | 통합 품질 검증(계측·테스트·버그 수정·UX 리뷰 반복) |
| `/site-design` | 사이트 전체 설계 문서 생성 |

### 가이드 인덱스

| 명령 | 하는 일 |
|---|---|
| `/project-guides` | README 트리거 표 기준으로 상황에 맞는 가이드 선택·적용 |
| `/project-guides state-diagram` | 이름이 일치하는 가이드(예: state-diagram-guide)를 읽고 적용 |

`~/.claude/skills/project-guides/` 에 `guides/`·`prompts/`·`README.md` 전체 사본이 함께 설치되며, 각 프롬프트 스킬은 이 사본을 참조한다. 가이드 문서(method-R, PRD, 다이어그램 DSL 등)는 별도 명령 없이도 대화 중 관련 주제가 나오면 Claude가 인덱스 스킬을 통해 자동으로 참조할 수 있다.

## 3. 사용 예

```
/system-design-as-is
/feature-design 주문 취소 기능을 추가하고 환불 처리와 연동
/project-guides prd
```

프롬프트 뒤에 붙인 텍스트는 해당 프롬프트의 입력(설계 요청·추가 요구사항)으로 전달된다.

## 4. 업데이트

가이드·프롬프트를 수정한 뒤 다시 설치하면 된다(전체 덮어쓰기).

```
/install-guides        # 또는 bash installer/install.sh
```

## 5. 제거

```
/install-guides uninstall        # 또는 bash installer/install.sh --uninstall
```

설치 시 기록된 매니페스트(`~/.claude/skills/project-guides/.installed-skills`) 기준으로 설치된 스킬만 제거한다.
