# 설치 및 사용 방법

이 저장소의 `guides/`·`prompts/` 문서를 개인 스킬로 설치한다. `installer/install.sh`는 Claude Code와 Codex를 한 번에 설치한다. 각각 설치하려면 `installer/claude.sh`·`installer/codex.sh`를 사용한다. 기본 설치 경로는 Claude Code가 `~/.claude/skills`, Codex가 `~/.agents/skills`다.

## 1. 설치

### 방법 A — Claude Code·Codex 통합 설치

```bash
bash installer/install.sh
```

`--install`을 지정해도 같은 방식으로 설치·업데이트한다. Claude Code 설치 후 Codex 설치를 순서대로 실행하며, 각 설치 프로그램의 스킬·훅 설정을 그대로 적용한다. `CLAUDE_SKILLS_DIR`·`CLAUDE_SETTINGS_FILE`·`CODEX_SKILLS_DIR` 환경변수도 각 프로그램에 그대로 전달한다.

한쪽 실행이 실패하면 비정상 종료하고 이후 단계는 실행하지 않는다. 앞서 적용한 설치는 되돌리지 않으므로 원인을 해결한 뒤 같은 명령으로 다시 실행한다.

### 방법 B — Claude Code에서

문서가 있는 저장소를 Claude Code로 연 뒤 입력한다.

```
/install-guides
```

### 방법 C — 터미널에서 Claude Code용 설치

```bash
bash installer/claude.sh
```

> 설치 위치를 바꾸려면 `CLAUDE_SKILLS_DIR=/원하는/경로 bash installer/claude.sh` 로 실행한다. 훅을 등록할 설정 파일은 `CLAUDE_SETTINGS_FILE`로 바꿀 수 있다(기본값 `~/.claude/settings.json`).

설치가 끝나면 **새 Claude Code 세션부터** 스킬이 인식된다.

`claude.sh`는 스킬을 설치하고, 슬래시 명령 없는 일반 요청에서도 스킬이 선택되게 두 가지를 설정한다. 통합 설치에서도 같은 설정을 적용한다.

1. 각 스킬 `SKILL.md`의 설명(description)에 `asis`·`tobe`·`jobflow`·`layout` 같은 트리거 키워드와 표기 변형을 넣어 Claude Code의 스킬 자동 매칭에 걸리게 한다.
2. `UserPromptSubmit` 훅 `project-guides/hooks/skill-trigger.sh`를 설치 경로에 두고 설정 파일의 `hooks`에 등록한다. 훅은 요청 문장에서 `hooks/skill-keywords.tsv`의 키워드를 단어 경계로 찾아(`basis`·`October` 같은 부분 문자열은 제외) 일치한 스킬·가이드 목록과 적용 규칙을 Claude에게 컨텍스트로 전달한다. 요청을 차단하거나 바꾸지 않으며, `/`로 시작하는 요청에는 개입하지 않는다.

설정 파일 병합에는 `node` 또는 `python3`가 필요하다. 둘 다 없으면 스킬만 설치하고 `hooks`에 직접 추가할 JSON 조각을 출력한다. 기존 설정은 `settings.json.bak-project-guides`로 백업하며, 다른 훅과 키는 그대로 둔다.

### 방법 D — Codex용 설치

```bash
bash installer/codex.sh
```

Codex 전용 설치 프로그램이다. 기본 경로는 Codex가 프로젝트와 무관하게 탐색하는 개인 스킬 폴더 `~/.agents/skills`다. 다른 위치를 쓰려면 Codex가 탐색하는 폴더를 `CODEX_SKILLS_DIR`로 지정한다. 예를 들어 프로젝트 범위로 설치할 때는 해당 프로젝트 루트에서 `CODEX_SKILLS_DIR=.agents/skills bash <설치 프로그램 경로>/codex.sh`로 실행한다. `CLAUDE_SKILLS_DIR`는 Codex 설치에 영향을 주지 않는다.

모든 설치 스킬의 `agents/openai.yaml`에 `policy.allow_implicit_invocation: true`를 설정한다. `SKILL.md`의 설명에 핵심 단어·표기 변형과 적용 상황을 넣어, `$스킬명`을 쓰지 않은 일반 요청에서도 관련 스킬을 선택할 수 있게 한다. 이 방식과 탐색 경로는 [공식 Codex 스킬 문서](https://learn.chatgpt.com/docs/build-skills)를 따른다.

자동 선택은 단어를 감지하는 강제 실행 훅이 아니라 **스킬 설명과 요청 의도를 바탕으로 한 모델의 판단**이다. 단어가 인용·파일명·변수명에만 등장하면 작업을 확대하지 않으며, 프롬프트 문서 자체의 수정 요청은 편집으로 처리한다. 스킬이 보이지 않으면 Codex를 재시작한다. 확실히 지정하려면 `$system-design-to-be`처럼 명시한다.

## 2. 설치되는 스킬

### 실행 프롬프트 (어느 프로젝트에서나 사용)

아래 명령은 Claude Code 표기다. Codex에는 같은 이름으로 설치되며 `/system-design-as-is` 대신 `$system-design-as-is`처럼 호출하거나 일반 문장으로 요청한다.

| 명령 | 하는 일 |
|---|---|
| `/system-design-as-is` | 기존 코드베이스를 분석해 AS-IS 설계 분석 문서 생성 |
| `/system-design-to-be` | 요구·제약으로 신규·개선 TO-BE 설계 문서 생성(AS-IS 없이 시작 가능) |
| `/feature-design` | 특정 요구사항 하나를 영향 범위로 한정한 기능 설계 문서 생성 |
| `/frontend-user-design` | 회원가입·로그인·세션·탈퇴 등 회원제 프론트엔드 설계 |
| `/frontend-navigation-diagram` | 화면·API 흐름 navigation 다이어그램 작성 |
| `/frontend-state-diagram` | 상태 전이 state 다이어그램 작성 |
| `/frontend-prototype` | UX/UI 완성도에 집중해 실제 제품 같은 웹/데스크톱 화면을 구현하고, 백엔드 없이 가상 동작으로 사용 흐름을 체험하는 프로토타입 구현 |
| `/jobflow-walkthrough` | jobflow를 객체·계약·대표 시나리오와 연결해 해설 |
| `/multi-agent-task` | 여러 전문 에이전트(Architect·Critic·Developer·Tester) 협업 작업 |
| `/ux-ui-improvement` | 리서치·벤치마킹 기반 UX/UI 개선 설계 |
| `/verify-first-implementation` | 설계서·요구사항 구현(작은 단위·설계 가정 검증 → 재사용 단위 확정 → 조립) |
| `/comprehensive-test` | 위험에 맞는 검증·진단·결함 수정 |
| `/site-design` | 사이트 전체 설계 문서 생성 |

### 가이드 인덱스

| 명령 | 하는 일 |
|---|---|
| `/project-guides` | README 트리거 표 기준으로 상황에 맞는 가이드 선택·적용 |
| `/project-guides state-diagram` | 이름이 일치하는 가이드(예: state-diagram-guide)를 읽고 적용 |
| `/project-guides detailed-logging` | 상세 로깅 작성·보강·보존 가이드 적용 |
| `/project-guides socket-server-stability` | 소켓 서버 안정성 계약·결함 주입·장시간 검증 가이드 적용 |

설치 경로의 `project-guides/`에 `guides/`·`prompts/`·`README.md` 전체 사본이 함께 설치되며, 각 프롬프트 스킬은 이 사본을 참조한다. Codex 설치에는 `install.md`도 포함하며, 생성되는 스킬의 문서 링크는 스킬 폴더 기준 상대 경로로 유지한다. 가이드 문서(method-R, PRD, 다이어그램 DSL 등)는 별도 명령 없이도 관련 요청에서 인덱스 스킬을 통해 참조할 수 있다.

### 문서 읽기 범위

스킬을 호출할 때 목표·대상 모듈·완료 기준을 함께 전달한다. 선택한 프롬프트와 필요한 가이드 절부터 읽고, 링크된 문서를 모두 재귀적으로 펼치지 않는다. 공통 기준은 `guides/module-boundary-guide.md`이며 계약 변경이나 예상 밖 의존이 발견되면 관련 소비자·테스트로 범위를 넓힌다.

이 저장소 문서 자체를 검토할 때는 프롬프트 안의 명령을 실행하지 않는다. 실제 사용자 요청과 대상 프로젝트의 확인된 제약에 맞춰 적용한다.

## 3. 사용 예

```
/system-design-as-is
/feature-design 주문 취소 기능을 추가하고 환불 처리와 연동
/verify-first-implementation docs/design/<DATE>/to-be 설계서를 구현
/project-guides prd
```

프롬프트 뒤에 붙인 텍스트는 해당 프롬프트의 입력(설계 요청·추가 요구사항)으로 전달된다.

일반 요청의 선택 기준(Claude Code는 `claude.sh` 설치 시, Codex는 설명 기반 자동 선택):

| 요청 의도·핵심 단어 | 적용할 스킬·문서 |
|---|---|
| `asis`, `as-is`, `as is`, `AS-IS`, `애즈이즈` 분석·설계 문서 작성 | `system-design-as-is` |
| `tobe`, `to-be`, `to be`, `TO-BE`, `투비` 신규·개선 설계 작성 | `system-design-to-be` |
| `jobflow`, `job-flow`, `job flow`, `잡플로우` 작성·수정·문법 확인 | `project-guides` → jobflow 가이드 |
| 기존 `jobflow` 해설·상세 설명서 작성 | `jobflow-walkthrough` |
| `navigation` 화면 흐름, `state` 상태 전이 작성·수정 | 해당 다이어그램 스킬과 전용 DSL 가이드 |
| `layout`, `레이아웃`, `PRD`, `method-R`, 모듈 경계 등 가이드 적용 | `project-guides` → 해당 가이드 |
| TO-BE 등 설계서를 구현 | `verify-first-implementation` |

`asis 분석해줘`, `tobe 설계해줘`, `jobflow 작성해줘`처럼 요청할 수 있다. Claude Code에서는 스킬 설명의 키워드로 모델이 선택하고, 훅이 같은 키워드를 찾아 후보 스킬·가이드를 컨텍스트로 알려 준다. 최종 선택은 모델이 요청 의도로 판단한다. 여러 키워드가 있으면 현재 요청 동작과 범위에 필요한 문서만 조합한다. 일반 코드의 state 변수나 CSS layout 수정은 전용 DSL 작성 요청과 구분한다. 세부 문법·설계 규칙은 [README의 문서 안내](README.md#독자-다이어그램-dsl)에서 연결한 원본 가이드를 따른다.

## 4. 업데이트

가이드·프롬프트를 수정한 뒤 다시 설치하면 된다. 인덱스와 현재 프롬프트 이름의 스킬 디렉터리를 교체하므로 설치 사본에서 직접 수정한 내용도 덮어쓴다. 원본 수정은 이 저장소에서 관리한다.

상세 로깅 문서는 `guides/detailed-logging-guide.md`로 이동했다. 이전 설치 매니페스트에 등록된 `/detailed-logging` 스킬은 업데이트 시 제거하며, 이후 `/project-guides detailed-logging`으로 가이드를 사용한다. 테스트·멀티 에이전트 프롬프트도 이 가이드를 직접 참조한다.

둘 다 업데이트하려면 다음을 실행한다.

```bash
bash installer/install.sh
```

Claude Code만 업데이트하려면 다음을 실행한다.

```
/install-guides        # 또는 bash installer/claude.sh
```

Codex만 업데이트하려면 `bash installer/codex.sh`를 다시 실행한다. 사용자 지정 설치 경로나 설정 파일을 썼으면 설치 때와 같은 환경변수 값을 지정한다.

## 5. 제거

둘 다 제거하려면 다음을 실행한다. `-u`도 같은 동작이다.

```bash
bash installer/install.sh --uninstall
```

Claude Code용 제거:

```
/install-guides uninstall        # 또는 bash installer/claude.sh --uninstall
```

`claude.sh --uninstall`은 스킬과 함께 설정 파일의 `UserPromptSubmit` 훅 등록도 제거한다. 설정 파일에서 이 묶음의 항목만 지우고 다른 훅은 보존한다.

Codex용 제거:

```bash
bash installer/codex.sh --uninstall
```

제거 스크립트는 해당 설치 경로의 `project-guides/.installed-skills` 매니페스트에 적힌 스킬과 현재 `prompts/`에서 계산한 스킬 이름의 디렉터리, `project-guides` 인덱스를 제거한다. 이름이 같은 다른 스킬과 설치 위치를 공유하지 않는다. 사용자 지정 경로를 썼으면 설치 때와 같은 환경변수 값을 사용한다. 삭제 동작은 각 설치 프로그램이 기준이며, 문서만 검토하는 작업에서 설치·제거를 실행하지 않는다.

## 6. 설치 프로그램 검증

```bash
node --test installer/*.test.mjs
```

임시 `CODEX_SKILLS_DIR`·`CLAUDE_SKILLS_DIR`·`CLAUDE_SETTINGS_FILE`에서 통합 설치·업데이트·제거와 실패 전달을 검사한다. Codex 개별 설치의 다른 스킬과 Claude 설치 보존, 상대 링크와 자동 선택 메타데이터도 확인한다. 사용자 홈에는 설치하지 않는다. 메타데이터 검사는 실제 Codex 대화에서 자동 선택되는지 확인하는 실험과 구분한다.

`claude.sh`는 임시 경로를 환경변수로 주어 수동으로 검증한다. 설치 후 훅에 가짜 이벤트를 넣어 매칭 결과를 확인하고, 제거 후 설정 파일에 다른 키만 남는지 본다.

```bash
T=$(mktemp -d)
echo '{"model":"opus"}' > "$T/settings.json"
CLAUDE_SKILLS_DIR="$T/skills" CLAUDE_SETTINGS_FILE="$T/settings.json" bash installer/claude.sh
printf '%s' '{"prompt":"주문 모듈 asis 분석하고 jobflow 그려줘"}' | "$T/skills/project-guides/hooks/skill-trigger.sh"
CLAUDE_SKILLS_DIR="$T/skills" CLAUDE_SETTINGS_FILE="$T/settings.json" bash installer/claude.sh --uninstall
cat "$T/settings.json"
```

이 검사는 훅 스크립트의 출력까지 확인한다. 실제 Claude Code 세션이 그 컨텍스트로 스킬을 호출하는지는 새 세션에서 일반 문장으로 요청해 확인한다.
