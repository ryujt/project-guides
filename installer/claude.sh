#!/bin/sh
# project-guides 스킬 설치 프로그램 (Claude Code 전용)
#
# guides/·prompts/ 를 개인 스킬 디렉토리(~/.claude/skills)에 설치하고,
# 다음을 설정해서 슬래시 명령 없이 일반 요청 문장만으로도
# 해당 스킬이 선택·적용되게 한다.
#
#   1. 각 스킬의 description 에 트리거 키워드(asis, tobe, jobflow, layout …)를 넣어
#      Claude Code 의 스킬 자동 매칭에 걸리게 한다.
#   2. UserPromptSubmit 훅(hooks/skill-trigger.sh)을 설치하고 Claude Code 설정 파일에
#      등록한다. 훅은 사용자 요청에서 키워드를 찾아 "이 스킬을 Skill 도구로 호출해
#      적용하라"는 컨텍스트를 Claude 에게 전달한다.
#
# 사용법:
#   bash installer/claude.sh              # 설치 또는 업데이트 (덮어쓰기)
#   bash installer/claude.sh --uninstall  # 설치된 스킬과 훅 등록 전부 제거
#
# 환경변수:
#   CLAUDE_SKILLS_DIR     스킬 설치 위치 (기본값: $HOME/.claude/skills)
#   CLAUDE_SETTINGS_FILE  훅을 등록할 Claude Code 설정 파일 (기본값: $HOME/.claude/settings.json)
#
# 설정 파일 병합에는 node 또는 python3 중 하나가 필요하다. 둘 다 없으면 스킬만 설치하고
# 설정에 추가할 JSON 조각을 출력한다.

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
SETTINGS_FILE="${CLAUDE_SETTINGS_FILE:-$HOME/.claude/settings.json}"
SHARED_NAME="project-guides"
SHARED_DIR="$SKILLS_DIR/$SHARED_NAME"
MANIFEST="$SHARED_DIR/.installed-skills"
HOOKS_DIR="$SHARED_DIR/hooks"
HOOK_SCRIPT="$HOOKS_DIR/skill-trigger.sh"
KEYWORDS_FILE="$HOOKS_DIR/skill-keywords.tsv"
HOOK_MARKER="$SHARED_NAME/hooks/skill-trigger.sh"   # 설정 파일에서 우리 훅을 식별하는 문자열

# ---------------------------------------------------------------- 유틸

title_of() {
  # 마크다운 파일의 첫 번째 "# " 제목을 추출한다
  sed -n 's/^# //p' "$1" | head -1
}

slug_of() {
  # prompts/foo-bar-prompt.md -> foo-bar
  basename "$1" .md | sed 's/-prompt$//'
}

desc_of() {
  # 스킬 검색·자동 매칭에 쓰이는 한 줄 설명. 미등록 프롬프트는 제목으로 대체한다.
  case "$1" in
    system-design-as-is)         echo "기존 코드베이스를 분석해 AS-IS 설계 분석 문서를 생성한다. '현재 시스템 분석', 'AS-IS 설계 문서' 요청 시 사용" ;;
    system-design-to-be)         echo "요구사항과 제약으로 신규·개선 TO-BE 설계 문서를 생성한다. AS-IS 없이 최초 설계가 가능하며 기존 자료는 있을 때 활용한다. '신규 시스템 설계', '개선 설계', 'TO-BE 설계 문서' 요청 시 사용" ;;
    feature-design)              echo "특정 요구사항(기능 추가·변경) 하나를 영향 범위로 한정해 기능 설계 문서를 생성한다. FR 분해·추적성 포함" ;;
    frontend-user-design)        echo "회원가입·로그인·세션·계정 복구·탈퇴 등 회원제 프론트엔드 설계 문서를 생성한다" ;;
    frontend-navigation-diagram) echo "화면 이동과 그 판단에 필요한 API·처리를 navigation DSL로 작성한다" ;;
    frontend-state-diagram)      echo "프론트엔드 객체·화면의 상태 전이를 state DSL 다이어그램으로 작성한다" ;;
    frontend-prototype)          echo "실제 제품 같은 웹 또는 데스크톱 프론트엔드 프로토타입을 구현한다. UX/UI 완성도에 집중하고 백엔드 없이 가상 데이터·상태 변화로 사용 흐름을 체험한다. '프론트엔드 프로토타입', '화면 흐름 시뮬레이션', '백엔드 없는 프로토타입' 요청 시 사용" ;;
    jobflow-walkthrough)         echo "이미 작성된 jobflow 를 등장 객체·계약·대표 시나리오와 연결해 해설하고 연결·책임을 검토한다" ;;
    multi-agent-task)            echo "Architect·Critic·Developer·Tester 등 여러 전문 에이전트가 분업·상호 견제하며 작업을 수행한다" ;;
    ux-ui-improvement)           echo "유사 서비스 벤치마킹·오픈소스 리서치를 기반으로 UX/UI 개선 설계안을 도출한다" ;;
    comprehensive-test)          echo "변경 위험에 맞는 계측·테스트·결함 수정으로 품질을 검증한다. 필요한 검증이 통과하면 반복을 끝낸다" ;;
    site-design)                 echo "사이트(웹 서비스) 전체 설계 문서를 생성한다" ;;
    verify-first-implementation) echo "설계서를 구현하거나 요구사항으로 프로젝트를 구현할 때 작은 단위와 설계 가정을 먼저 검증하고, 통과한 단위를 재사용 단위(라이브러리·서비스 등)로 확정해 조립한다. '설계서를 구현해줘', '모듈별로 먼저 검증한 뒤 조립' 요청 시 사용. 한 모듈 안에서 끝나고 외부 가정이 없는 작은 수정에는 쓰지 않는다" ;;
    *)                           title_of "$2" ;;
  esac
}

keywords_of() {
  # 요청 문장에서 이 스킬을 고르게 하는 트리거 키워드. '|' 로 구분하며 대소문자는 무시한다.
  # 영문 키워드는 단어 경계로 매칭하므로 basis·October 같은 다른 단어 안의 부분 문자열에는 걸리지 않는다.
  case "$1" in
    system-design-as-is)         echo "asis|as-is|as_is|애즈이즈|현재 시스템 분석|현행 시스템 분석|현행 분석" ;;
    system-design-to-be)         echo "tobe|to-be|to_be|투비|개선 설계|신규 시스템 설계|시스템 설계 문서" ;;
    feature-design)              echo "기능 설계|feature design|feature-design" ;;
    frontend-user-design)        echo "회원가입|회원제|계정 복구|탈퇴|인증 설계|로그인 설계" ;;
    frontend-navigation-diagram) echo "navigation|네비게이션|내비게이션|화면 이동 흐름|화면 흐름" ;;
    frontend-state-diagram)      echo "state diagram|state 다이어그램|상태 다이어그램|상태 전이|상태전이" ;;
    frontend-prototype)          echo "프로토타입|prototype|화면 흐름 시뮬레이션" ;;
    jobflow-walkthrough)         echo "jobflow|job flow|job-flow|잡플로우|잡 플로우|walkthrough|워크스루" ;;
    multi-agent-task)            echo "멀티 에이전트|멀티에이전트|multi-agent|multi agent|multiagent" ;;
    ux-ui-improvement)           echo "ux 개선|ui 개선|ux/ui|ux·ui|벤치마킹" ;;
    comprehensive-test)          echo "통합 테스트|종합 테스트|e2e|comprehensive test" ;;
    site-design)                 echo "사이트 설계|site design|site-design|서비스 전체 설계" ;;
    verify-first-implementation) echo "설계서 구현|설계서를 구현|설계서대로 구현|검증 우선|verify-first|verify first" ;;
    *)                           echo "" ;;
  esac
}

# 가이드 주제 키워드: "가이드이름|키워드1|키워드2|…" 한 줄씩. 매칭되면 /project-guides <가이드이름> 으로 안내한다.
guide_keyword_table() {
  cat <<'EOF'
job-flow-diagram|jobflow|job flow|job-flow|잡플로우|잡 플로우
navigation-diagram|navigation dsl|navigation 다이어그램|네비게이션 다이어그램
state-diagram|state dsl|state 다이어그램|상태 다이어그램
screen-layout|layout|레이아웃|화면 배치
prd-writing|prd|요구사항 문서|요구사항 정의서
method-R|method-r|method r|메서드 r
module-boundary|모듈 경계|module boundary|최소 맥락|응집도|결합도
architecture-pattern-diagram|아키텍처 패턴|architecture pattern
orchestrator-worker-pattern|orchestrator|오케스트레이터|worker 패턴
code-structure-guidelines|코드 구조|code structure|코딩 규칙
project-structure|폴더 구조|프로젝트 구조|project structure
system-design-framework|pbs|key events|services list|input datas
system-design-document|설계 문서 양식|설계서 양식|설계 문서 골격
system-flow-document|시스템 흐름 문서|system flow
detailed-logging|상세 로깅|상세 로그|detailed logging|로깅 시스템
socket-server-stability|소켓 서버|socket server|웹소켓 서버
wrtite-readme|readme
tools-camp-markdown|tools.camp|smartmd
EOF
}

guide_file_of() {
  # 가이드 이름 -> guides/ 안의 파일 경로 (설치 사본 기준)
  name="$1"
  for cand in "$SHARED_DIR/guides/$name-guide.md" "$SHARED_DIR/guides/$name.md" "$SHARED_DIR/guides/$name-guidelines.md"; do
    if [ -f "$cand" ]; then echo "$cand"; return 0; fi
  done
  return 1
}

commas_of() {
  # "a|b|c" -> "a, b, c"
  printf '%s' "$1" | sed 's/|/, /g'
}

settings_hook_command() {
  # 설정 파일에 기록할 훅 명령. 홈 아래 경로면 $HOME 으로 바꿔 다른 컴퓨터·사용자에서도 유효하게 한다.
  case "$HOOK_SCRIPT" in
    "$HOME"/*) printf '"$HOME%s"' "${HOOK_SCRIPT#"$HOME"}" ;;
    *)         printf '"%s"' "$HOOK_SCRIPT" ;;
  esac
}

# ---------------------------------------------------------------- 설정 파일(hooks) 병합

# 인자: add|remove. settings.json 의 hooks.UserPromptSubmit 에서 HOOK_MARKER 가 들어간 항목을 제거하고,
# add 이면 현재 경로의 항목을 새로 넣는다. 다른 설정과 훅은 그대로 둔다.
# 종료 코드: 0 성공, 2 설정 파일 해석 실패, 3 node·python3 없음
edit_settings() {
  action="$1"
  cmd="$(settings_hook_command)"
  if command -v node >/dev/null 2>&1; then
    node - "$SETTINGS_FILE" "$HOOK_MARKER" "$action" "$cmd" <<'NODE'
const fs = require('fs');
const [file, marker, action, cmd] = process.argv.slice(2);
let s = {};
if (fs.existsSync(file)) {
  const text = fs.readFileSync(file, 'utf8').trim();
  if (text) {
    try { s = JSON.parse(text); }
    catch (e) { console.error(`설정 파일을 JSON 으로 읽지 못했다: ${file}\n${e.message}`); process.exit(2); }
  }
}
if (typeof s !== 'object' || s === null || Array.isArray(s)) { console.error('설정 파일 최상위가 객체가 아니다'); process.exit(2); }
const hooks = (s.hooks && typeof s.hooks === 'object' && !Array.isArray(s.hooks)) ? s.hooks : {};
let list = Array.isArray(hooks.UserPromptSubmit) ? hooks.UserPromptSubmit : [];
const isOurs = h => h && typeof h.command === 'string' && h.command.includes(marker);
list = list
  .map(g => (g && Array.isArray(g.hooks)) ? { ...g, hooks: g.hooks.filter(h => !isOurs(h)) } : g)
  .filter(g => !(g && Array.isArray(g.hooks) && g.hooks.length === 0));
if (action === 'add') list.push({ hooks: [{ type: 'command', command: cmd }] });
if (list.length) hooks.UserPromptSubmit = list; else delete hooks.UserPromptSubmit;
if (Object.keys(hooks).length) s.hooks = hooks; else delete s.hooks;
fs.mkdirSync(require('path').dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(s, null, 2) + '\n');
NODE
  elif command -v python3 >/dev/null 2>&1; then
    python3 - "$SETTINGS_FILE" "$HOOK_MARKER" "$action" "$cmd" <<'PY'
import json, os, sys
file, marker, action, cmd = sys.argv[1:5]
s = {}
if os.path.exists(file):
    text = open(file, encoding='utf-8').read().strip()
    if text:
        try:
            s = json.loads(text)
        except ValueError as e:
            sys.stderr.write("설정 파일을 JSON 으로 읽지 못했다: %s\n%s\n" % (file, e)); sys.exit(2)
if not isinstance(s, dict):
    sys.stderr.write("설정 파일 최상위가 객체가 아니다\n"); sys.exit(2)
hooks = s.get('hooks') if isinstance(s.get('hooks'), dict) else {}
lst = hooks.get('UserPromptSubmit') if isinstance(hooks.get('UserPromptSubmit'), list) else []
def ours(h):
    return isinstance(h, dict) and isinstance(h.get('command'), str) and marker in h['command']
out = []
for g in lst:
    if isinstance(g, dict) and isinstance(g.get('hooks'), list):
        g = dict(g, hooks=[h for h in g['hooks'] if not ours(h)])
        if not g['hooks']:
            continue
    out.append(g)
if action == 'add':
    out.append({'hooks': [{'type': 'command', 'command': cmd}]})
if out:
    hooks['UserPromptSubmit'] = out
else:
    hooks.pop('UserPromptSubmit', None)
if hooks:
    s['hooks'] = hooks
else:
    s.pop('hooks', None)
os.makedirs(os.path.dirname(file) or '.', exist_ok=True)
with open(file, 'w', encoding='utf-8') as f:
    json.dump(s, f, ensure_ascii=False, indent=2)
    f.write('\n')
PY
  else
    return 3
  fi
}

print_manual_hook_snippet() {
  cmd_json="$(settings_hook_command | sed 's/"/\\"/g')"
  echo "경고: node 또는 python3 가 없어 설정 파일을 자동으로 고치지 못했다." >&2
  echo "      $SETTINGS_FILE 의 hooks 에 아래 항목을 직접 추가하면 키워드 트리거가 동작한다." >&2
  cat >&2 <<EOF
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [ { "type": "command", "command": "$cmd_json" } ] }
    ]
  }
}
EOF
}

register_hook() {
  if [ -f "$SETTINGS_FILE" ]; then
    cp "$SETTINGS_FILE" "$SETTINGS_FILE.bak-$SHARED_NAME"
  fi
  rc=0
  edit_settings add || rc=$?
  case "$rc" in
    0) echo "등록: UserPromptSubmit 훅 → $SETTINGS_FILE" ;;
    3) print_manual_hook_snippet ;;
    *) echo "경고: 설정 파일을 수정하지 못했다($SETTINGS_FILE). 백업: $SETTINGS_FILE.bak-$SHARED_NAME" >&2 ;;
  esac
}

unregister_hook() {
  [ -f "$SETTINGS_FILE" ] || return 0
  grep -q "$HOOK_MARKER" "$SETTINGS_FILE" 2>/dev/null || return 0
  cp "$SETTINGS_FILE" "$SETTINGS_FILE.bak-$SHARED_NAME"
  if edit_settings remove; then
    echo "해제: UserPromptSubmit 훅 ← $SETTINGS_FILE"
  else
    echo "경고: 설정 파일에서 훅을 제거하지 못했다. $SETTINGS_FILE 에서 '$HOOK_MARKER' 항목을 직접 지운다." >&2
  fi
}

# ---------------------------------------------------------------- 제거

uninstall() {
  unregister_hook
  removed=0
  if [ -f "$MANIFEST" ]; then
    while IFS= read -r name; do
      [ -n "$name" ] || continue
      case "$name" in */*|.*) continue ;; esac   # 경로 이탈 방지
      if [ -d "$SKILLS_DIR/$name" ]; then
        rm -rf "${SKILLS_DIR:?}/${name:?}"
        echo "제거: $name"
        removed=$((removed + 1))
      fi
    done < "$MANIFEST"
  fi
  # 매니페스트가 없어도 현재 저장소 기준으로 유추해 제거한다
  for f in "$REPO_ROOT"/prompts/*.md; do
    [ -e "$f" ] || continue
    slug="$(slug_of "$f")"
    if [ -d "$SKILLS_DIR/$slug" ]; then
      rm -rf "${SKILLS_DIR:?}/${slug:?}"
      echo "제거: $slug"
      removed=$((removed + 1))
    fi
  done
  if [ -d "$SHARED_DIR" ]; then
    rm -rf "${SHARED_DIR:?}"
    echo "제거: $SHARED_NAME"
    removed=$((removed + 1))
  fi
  echo
  echo "완료: 스킬 $removed 개를 제거했다."
}

# ---------------------------------------------------------------- 설치

remove_moved_logging_skill() {
  [ -f "$MANIFEST" ] || return 0
  while IFS= read -r installed_name; do
    if [ "$installed_name" = "detailed-logging" ] && [ -d "$SKILLS_DIR/detailed-logging" ]; then
      rm -rf "${SKILLS_DIR:?}/detailed-logging"
      echo "제거: /detailed-logging (가이드로 이동; /project-guides detailed-logging 사용)"
    fi
  done < "$MANIFEST"
}

install_shared_skill() {
  rm -rf "${SHARED_DIR:?}"
  mkdir -p "$SHARED_DIR"
  cp -R "$REPO_ROOT/guides" "$SHARED_DIR/guides"
  cp -R "$REPO_ROOT/prompts" "$SHARED_DIR/prompts"
  cp "$REPO_ROOT/README.md" "$SHARED_DIR/README.md"

  guide_list=""
  for f in "$SHARED_DIR"/guides/*.md; do
    guide_list="$guide_list- \`guides/$(basename "$f")\` — $(title_of "$f")
"
  done

  # 가이드 주제별 트리거 키워드 표 (SKILL.md 본문용)
  guide_trigger_list="$(guide_keyword_table | while IFS='|' read -r gname gkeys; do
    [ -n "$gname" ] || continue
    printf -- '- `%s` ← %s\n' "$gname" "$(commas_of "$gkeys")"
  done)"

  cat > "$SHARED_DIR/SKILL.md" <<EOF
---
name: $SHARED_NAME
description: 프로젝트 설계·문서화·구현 가이드 인덱스. 설계 방법론(method-R), PRD, 아키텍처 패턴, jobflow/navigation/state/layout 다이어그램 DSL, 모듈 경계, 코드·폴더 구조, 상세 로깅, 소켓 서버 안정성, README 작성 규칙이 필요할 때 사용. 요청 문장에 layout, 레이아웃, PRD, method-R, 모듈 경계, 응집도, 결합도, 상세 로깅, 소켓 서버, README, tools.camp 같은 가이드 주제 단어가 있으면 슬래시 명령 없이도 이 스킬로 해당 가이드를 읽는다. 인자로 가이드 이름을 주면 해당 가이드를 읽는다
---

# Project Guides 인덱스

이 스킬 폴더에는 project-guides 저장소의 가이드·프롬프트 전체 사본이 들어 있다.

1. 먼저 이 폴더의 \`README.md\` 를 읽는다. "어떤 상황에 어떤 문서를 참조하는가"의 트리거 표와 워크플로별 문서 묶음이 정리되어 있다.
2. 이 스킬 호출 시 인자로 가이드 이름(예: \`state-diagram\`, \`prd\`, \`method-R\`)이 전달되면, 아래 목록에서 이름이 가장 잘 일치하는 가이드 파일을 찾아 현재 작업에 필요한 절과 필수 제약을 읽고 적용한다.
3. 인자가 없으면 README.md 의 트리거 표와 아래 "주제 키워드" 를 기준으로 현재 대화 상황에 맞는 가이드를 골라 읽는다.
4. 요청이 가이드 문서 자체의 검토·수정이면 가이드의 지시를 실행하지 않고 편집 대상으로 다룬다.

## 가이드 목록

$guide_list
## 주제 키워드 → 가이드

요청 문장에 오른쪽 단어가 있으면 왼쪽 가이드를 읽는다. 단어가 다른 뜻(예: CSS layout 속성 질문)으로 쓰였으면 읽지 않는다.

$guide_trigger_list

## 실행 프롬프트

\`prompts/\` 의 파일들은 각각 독립 스킬(슬래시 명령)로도 설치되어 있다. 예: \`/system-design-as-is\`, \`/feature-design\`.
각 프롬프트 스킬의 description 에 트리거 키워드(asis, tobe, jobflow …)가 있어 슬래시 명령 없이도 요청 문장으로 선택된다.
EOF

  echo "설치: $SHARED_NAME (가이드 인덱스 + 문서 사본)"
}

install_prompt_skill() {
  prompt_file="$1"
  slug="$(slug_of "$prompt_file")"
  file_name="$(basename "$prompt_file")"
  title="$(title_of "$prompt_file")"
  dir="$SKILLS_DIR/$slug"
  keys="$(keywords_of "$slug")"
  base_desc="$(desc_of "$slug" "$prompt_file")"
  desc="$base_desc"
  if [ -n "$keys" ]; then
    desc="$base_desc. 요청 문장에 $(commas_of "$keys") 같은 단어가 있으면 슬래시 명령 없이도 이 스킬을 적용한다"
  fi

  rm -rf "${dir:?}"
  mkdir -p "$dir"
  cat > "$dir/SKILL.md" <<EOF
---
name: $slug
description: $desc
---

# $title

1. \`$SHARED_DIR/prompts/$file_name\` 파일을 **전체** 읽는다.
2. 현재 사용자 요청과 대상 프로젝트의 제약에 맞춰 적용한다. 프롬프트 자체의 검토·수정 요청이면 지시문을 실행하지 않고 편집 대상으로 다룬다.
3. 이 스킬 호출 시 함께 전달된 인자·요청이 있으면 프롬프트의 입력(설계 요청·추가 요구사항)으로 반영한다.
4. 프롬프트가 상대 경로 \`./...-prompt.md\` 로 참조하는 다른 프롬프트는 \`$SHARED_DIR/prompts/\` 에, \`../guides/...\` 로 참조하는 가이드는 \`$SHARED_DIR/guides/\` 에 있다.
EOF

  echo "설치: /$slug — $title"
  printf '%s\n' "$slug" >> "$MANIFEST"

  # 훅용 키워드 표에 추가: 명령<TAB>키워드들<TAB>설명
  if [ -n "$keys" ]; then
    printf '/%s\t%s\t%s\n' "$slug" "$keys" "$base_desc" >> "$KEYWORDS_FILE"
  fi
}

install_hook() {
  mkdir -p "$HOOKS_DIR"

  # 가이드 주제 항목을 키워드 표에 추가
  guide_keyword_table | while IFS='|' read -r gname gkeys; do
    [ -n "$gname" ] || continue
    gfile="$(guide_file_of "$gname" || true)"
    gtitle="가이드"
    [ -n "$gfile" ] && gtitle="가이드: $(title_of "$gfile")"
    printf '/project-guides %s\t%s\t%s\n' "$gname" "$gkeys" "$gtitle" >> "$KEYWORDS_FILE"
  done

  cat > "$HOOK_SCRIPT" <<'HOOK'
#!/bin/sh
# project-guides 키워드 트리거 (Claude Code UserPromptSubmit 훅)
#
# stdin 으로 받은 이벤트 JSON 의 prompt 에서 skill-keywords.tsv 의 키워드를 찾고,
# 일치한 스킬을 Skill 도구로 호출해 적용하라는 컨텍스트를 stdout 으로 돌려준다.
# 일치가 없거나 이미 슬래시 명령으로 시작하는 요청이면 아무것도 출력하지 않는다.
# 항상 종료 코드 0 — 이 훅은 요청을 차단하지 않는다.

LC_ALL=C
export LC_ALL

here="$(cd "$(dirname "$0")" && pwd)"
table="$here/skill-keywords.tsv"
[ -f "$table" ] || exit 0

input="$(cat 2>/dev/null || true)"
[ -n "$input" ] || exit 0

if command -v jq >/dev/null 2>&1; then
  prompt="$(printf '%s' "$input" | jq -r '.prompt // empty' 2>/dev/null || true)"
else
  prompt="$(printf '%s' "$input" | sed -nE 's/.*"prompt"[[:space:]]*:[[:space:]]*"((\\.|[^"\\])*)".*/\1/p' | head -1)"
fi
[ -n "$prompt" ] || prompt="$input"

case "$prompt" in
  /*) exit 0 ;;   # 이미 슬래시 명령을 썼으면 개입하지 않는다
esac

escape_re() {
  printf '%s' "$1" | sed 's/[][\.*^$+?(){}|\\\/]/\\&/g'
}

tab="$(printf '\t')"
matched_lines=""
matched_words=""
while IFS="$tab" read -r cmd keys desc; do
  [ -n "$cmd" ] || continue
  alt=""
  old_ifs="$IFS"; IFS='|'
  for kw in $keys; do
    IFS="$old_ifs"
    [ -n "$kw" ] || continue
    alt="${alt:+$alt|}$(escape_re "$kw")"
  done
  IFS="$old_ifs"
  [ -n "$alt" ] || continue
  # 영문 키워드가 다른 단어의 일부(basis, October)로 걸리지 않게 단어 경계를 둔다.
  # LC_ALL=C 에서 한글 바이트는 [:alnum:] 이 아니므로 "jobflow를" 처럼 조사가 붙어도 매칭된다.
  re="(^|[^[:alnum:]_])($alt)([^[:alnum:]_]|$)"
  if printf '%s' "$prompt" | grep -qiE "$re" 2>/dev/null; then
    hit="$(printf '%s' "$prompt" | grep -oiE "$alt" 2>/dev/null | head -1)"
    matched_lines="$matched_lines
- \`$cmd\` (키워드: $hit) — $desc"
    case ", $matched_words, " in
      *", $hit, "*) ;;
      *) matched_words="${matched_words:+$matched_words, }$hit" ;;
    esac
  fi
done < "$table"

[ -n "$matched_lines" ] || exit 0

cat <<EOF
[project-guides 스킬 트리거] 사용자 요청에 다음 키워드가 있다: $matched_words
해당 스킬·가이드:$matched_lines

적용 규칙:
1. 요청이 위 스킬이 하는 작업을 수행하라는 뜻이면, 답하기 전에 Skill 도구로 그 스킬을 호출해 프롬프트(또는 가이드)를 전체 읽고 적용한다. \`/project-guides <이름>\` 은 Skill 도구에 skill=project-guides, args=<이름> 으로 호출한다.
2. 여러 항목이 걸렸으면 요청의 목적에 맞는 것만 고른다. 같은 키워드의 프롬프트와 가이드가 함께 걸렸으면, 새로 작성·그리기는 가이드(문법), 기존 산출물 해설·검토는 프롬프트를 우선한다.
3. 요청이 프롬프트·가이드 문서 자체의 검토·수정이거나, 키워드가 다른 뜻으로 쓰였으면 호출하지 않는다.
EOF
exit 0
HOOK
  chmod +x "$HOOK_SCRIPT"
  echo "설치: 키워드 트리거 훅 → $HOOK_SCRIPT ($(wc -l < "$KEYWORDS_FILE" | tr -d ' ') 항목)"
}

install_all() {
  mkdir -p "$SKILLS_DIR"
  remove_moved_logging_skill
  install_shared_skill
  mkdir -p "$HOOKS_DIR"
  : > "$MANIFEST"
  : > "$KEYWORDS_FILE"
  printf '%s\n' "$SHARED_NAME" >> "$MANIFEST"
  for f in "$REPO_ROOT"/prompts/*.md; do
    [ -e "$f" ] || continue
    install_prompt_skill "$f"
  done
  install_hook
  register_hook
  echo
  echo "완료: 스킬 설치 위치 → $SKILLS_DIR"
  echo "Claude Code 새 세션에서 /system-design-as-is 같은 슬래시 명령뿐 아니라,"
  echo "\"이 모듈 asis 분석해줘\" 처럼 요청 문장에 asis·tobe·jobflow·layout 등이 들어가면 해당 스킬이 적용된다."
}

# ---------------------------------------------------------------- 엔트리

case "${1:-}" in
  --uninstall|-u) uninstall ;;
  ""|--install)   install_all ;;
  *) echo "사용법: claude.sh [--uninstall]" >&2; exit 1 ;;
esac
