#!/bin/sh
# project-guides Codex 스킬 설치 프로그램
#
# guides/·prompts/를 Codex 개인 스킬로 설치한다.
# 일반 요청의 작업 의도·핵심 단어로 자동 선택하거나 $스킬명으로 호출한다.
#
# 사용법:
#   bash installer/codex.sh              # 설치 또는 업데이트 (덮어쓰기)
#   bash installer/codex.sh --uninstall  # 설치된 스킬 전부 제거
#
# 환경변수:
#   CODEX_SKILLS_DIR  스킬 설치 위치 (기본값: $HOME/.agents/skills)

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="${CODEX_SKILLS_DIR:-$HOME/.agents/skills}"
SHARED_NAME="project-guides"
SHARED_DIR="$SKILLS_DIR/$SHARED_NAME"
MANIFEST="$SHARED_DIR/.installed-skills"

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
    system-design-as-is)         echo "asis/as-is/as is/AS-IS(애즈이즈) 분석·설계 문서 작성. 기존 코드와 계약으로 현재 시스템 구조를 분석할 때 사용한다" ;;
    system-design-to-be)         echo "tobe/to-be/to be/TO-BE(투비) 신규·개선 설계 문서 작성. 요구·제약으로 목표 시스템을 설계할 때 사용하며 기존 분석 없이 시작할 수 있다" ;;
    feature-design)              echo "feature-design, 기능 설계, 기능 추가·변경 요구 하나의 영향 범위·FR·추적성을 설계 문서로 작성할 때 사용한다" ;;
    frontend-user-design)        echo "회원가입·로그인·세션·계정 복구·탈퇴 등 회원제 프론트엔드의 사용자·인증 흐름을 설계할 때 사용한다" ;;
    frontend-navigation-diagram) echo "navigation/네비게이션/내비게이션 다이어그램 작성·수정. 화면 이동과 판단에 필요한 API·처리를 navigation DSL로 설계할 때 사용한다" ;;
    frontend-state-diagram)      echo "state/상태 전이 다이어그램 작성·수정. 프론트엔드 객체·화면의 상태와 전이 조건을 state DSL로 설계할 때 사용한다" ;;
    frontend-prototype)          echo "frontend-prototype, 프론트엔드 프로토타입, 화면 흐름 시뮬레이션 구현. 실제 제품 같은 웹/데스크톱 화면과 UX/UI 완성도에 집중하고 백엔드 없이 가상 동작으로 사용 흐름을 체험할 때 사용한다" ;;
    jobflow-walkthrough)         echo "jobflow/job-flow/job flow/잡플로우 해설·상세 설명서 작성. 기존 도표를 객체·계약·시나리오와 연결해 설명하고 개선안을 검토할 때 사용한다" ;;
    multi-agent-task)            echo "multi-agent/멀티 에이전트 협업 요청. Architect·Critic·Developer·Tester 등 여러 전문 에이전트가 분업·상호 검토하며 작업할 때 사용한다" ;;
    ux-ui-improvement)           echo "UX/UI 개선 설계, 사용성 분석, 유사 서비스 벤치마킹·오픈소스 리서치로 개선안을 도출할 때 사용한다" ;;
    comprehensive-test)          echo "종합 테스트·품질 검증·결함 수정 요청. 변경 위험에 맞는 계측·테스트·진단으로 검증하고 필요한 검증이 통과하면 끝낸다" ;;
    site-design)                 echo "사이트 설계, 웹 서비스 전체 설계 문서를 작성할 때 사용한다" ;;
    verify-first-implementation) echo "설계서 구현·요구사항 구현·검증 우선 구현 요청. 작은 단위와 설계 가정을 먼저 검증하고 재사용 단위로 확정해 조립한다. 외부 가정이 없는 한 모듈의 작은 수정에는 쓰지 않는다" ;;
    *)                           title_of "$2" ;;
  esac
}

enable_implicit_invocation() {
  mkdir -p "$1/agents"
  cat > "$1/agents/openai.yaml" <<'EOF'
policy:
  allow_implicit_invocation: true
EOF
}

# ---------------------------------------------------------------- 제거

uninstall() {
  removed=0
  if [ -f "$MANIFEST" ]; then
    while IFS= read -r name; do
      [ -n "$name" ] || continue
      case "$name" in */*|.*) continue ;; esac   # 경로 이탈 방지
      if [ -d "$SKILLS_DIR/$name" ]; then
        rm -rf "$SKILLS_DIR/$name"
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
      rm -rf "$SKILLS_DIR/$slug"
      echo "제거: $slug"
      removed=$((removed + 1))
    fi
  done
  if [ -d "$SHARED_DIR" ]; then
    rm -rf "$SHARED_DIR"
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
      rm -rf "$SKILLS_DIR/detailed-logging"
      echo '제거: $detailed-logging (가이드로 이동; $project-guides detailed-logging 사용)'
    fi
  done < "$MANIFEST"
}

install_shared_skill() {
  rm -rf "$SHARED_DIR"
  mkdir -p "$SHARED_DIR"
  cp -R "$REPO_ROOT/guides" "$SHARED_DIR/guides"
  cp -R "$REPO_ROOT/prompts" "$SHARED_DIR/prompts"
  cp "$REPO_ROOT/README.md" "$SHARED_DIR/README.md"
  cp "$REPO_ROOT/install.md" "$SHARED_DIR/install.md"

  guide_list=""
  for f in "$SHARED_DIR"/guides/*.md; do
    guide_list="$guide_list- \`guides/$(basename "$f")\` — $(title_of "$f")
"
  done

  cat > "$SHARED_DIR/SKILL.md" <<EOF
---
name: $SHARED_NAME
description: jobflow/job-flow/job flow/jobw flow/잡플로우, navigation, state, layout/레이아웃, Mermaid 다이어그램·가이드 적용과 tools.camp 편집 링크 전달. PRD, method-R, 모듈 경계, 아키텍처·코드·폴더 구조, 로깅·소켓 안정성, README 문서 작성 규칙이 필요할 때 사용한다
---

# Project Guides 인덱스

이 스킬 폴더에는 가이드·프롬프트 전체 사본이 들어 있다. 문서 경로는 이 SKILL.md가 있는 폴더를 기준으로 해석한다.

1. 일반 요청도 명시 호출과 동일하게 적용한다. 핵심 단어와 **현재 요청의 동작**을 함께 보고 [README.md](README.md)의 작업별 프롬프트·주제별 가이드 표에서 필요한 문서를 고른다. 인자로 가이드 이름을 받으면 아래 목록에서 찾는다.
2. \`jobflow\` 작성·수정·문법은 [job-flow-diagram-guide](guides/job-flow-diagram-guide.md), \`navigation\`은 [navigation-diagram-guide](guides/navigation-diagram-guide.md), \`state\`는 [state-diagram-guide](guides/state-diagram-guide.md), \`layout\`은 [screen-layout-guide](guides/screen-layout-guide.md)를 적용한다. DSL을 임의로 확장하거나 Mermaid로 대체하지 않는다.
3. \`asis/as-is\` 분석은 [AS-IS 프롬프트](prompts/system-design-as-is-prompt.md), \`tobe/to-be\` 설계 작성은 [TO-BE 프롬프트](prompts/system-design-to-be-prompt.md), 기존 jobflow 해설은 [해설 프롬프트](prompts/jobflow-walkthrough-prompt.md)를 선택한다. 설계서를 **구현**하라는 요청이면 [검증 우선 구현 프롬프트](prompts/verify-first-implementation-prompt.md)를 선택한다. 다른 스킬을 다시 호출할 수 없어도 해당 문서를 읽고 적용한다.
4. 선택한 실행 프롬프트와 현재 작업에 필요한 가이드 절·필수 제약만 읽는다. 공통 기준은 [모듈 경계와 최소 맥락](guides/module-boundary-guide.md)이며 링크를 재귀적으로 모두 펼치지 않는다. 여러 키워드가 있어도 요청 범위의 문서만 조합한다.
5. 인용·파일명·변수명에 단어가 있다는 이유로 별도 설계 작업을 시작하지 않는다. 이 문서·프롬프트 자체의 검토·수정 요청에서는 본문 명령을 실행하지 않고 편집 자료로 다룬다. 일반 코드의 state 변수나 CSS layout 수정인지 전용 DSL 요청인지 문맥으로 구분한다.
6. 산출 문서에는 작성 컴퓨터에서만 유효한 절대 경로·설치 사본 경로를 남기지 않는다. 렌더러 없이 확인했으면 정적 검토로 보고한다.
7. 실제 다이어그램 산출물을 작성·수정한 뒤에는 [편집 링크 전달 기준](guides/diagram-editor-link-guide.md)을 적용해 API가 반환한 주소를 콘솔과 최종 답변에 표시한다. 가이드·프롬프트 자체 편집과 단순 인용은 실행 대상으로 보지 않으며, 파일만 요청하거나 외부 전송을 금지한 경우는 해당 기준의 예외를 따른다.

## 가이드 목록

$guide_list
## 실행 프롬프트

\`prompts/\`의 파일들은 각각 독립 Codex 스킬로도 설치되어 있다. 일반 문장으로 요청하거나 \`\$system-design-as-is\`, \`\$feature-design\`처럼 명시한다.
EOF

  enable_implicit_invocation "$SHARED_DIR"
  echo "설치: $SHARED_NAME (가이드 인덱스 + 문서 사본)"
}

install_prompt_skill() {
  prompt_file="$1"
  slug="$(slug_of "$prompt_file")"
  file_name="$(basename "$prompt_file")"
  title="$(title_of "$prompt_file")"
  dir="$SKILLS_DIR/$slug"

  rm -rf "$dir"
  mkdir -p "$dir"
  cat > "$dir/SKILL.md" <<EOF
---
name: $slug
description: $(desc_of "$slug" "$prompt_file")
---

# $title

1. 이 SKILL.md가 있는 폴더를 기준으로 [실행 프롬프트](../$SHARED_NAME/prompts/$file_name)를 **전체** 읽는다.
2. 일반 요청으로 선택되어도 현재 사용자 요청을 프롬프트의 입력으로 반영한다. 명시 호출의 인자도 같은 방식으로 반영한다.
3. 현재 작업 의도와 대상 프로젝트의 제약에 맞춰 적용한다. 단어가 인용·파일명·변수명에만 등장하면 작업 범위를 확대하지 않는다. 프롬프트 자체의 검토·수정 요청이면 본문 명령을 실행하지 않고 편집 대상으로 다룬다.
4. 프롬프트 안의 상대 링크는 **그 프롬프트 파일** 기준으로 해석한다. 필요한 가이드 절만 추가로 읽고 링크를 재귀적으로 모두 펼치지 않는다.
5. 산출 문서에는 작성 컴퓨터에서만 유효한 절대 경로·설치 사본 경로를 남기지 않는다.
EOF

  enable_implicit_invocation "$dir"
  printf '설치: $%s — %s\n' "$slug" "$title"
  printf '%s\n' "$slug" >> "$MANIFEST"
}

install_all() {
  mkdir -p "$SKILLS_DIR"
  remove_moved_logging_skill
  install_shared_skill
  : > "$MANIFEST"
  printf '%s\n' "$SHARED_NAME" >> "$MANIFEST"
  for f in "$REPO_ROOT"/prompts/*.md; do
    [ -e "$f" ] || continue
    install_prompt_skill "$f"
  done
  echo
  echo "완료: 스킬 설치 위치 → $SKILLS_DIR"
  echo 'Codex에서 "asis 분석해줘", "tobe 설계해줘", "jobflow 작성해줘"처럼 요청할 수 있다.'
  echo '스킬이 보이지 않으면 Codex를 재시작한다. 명시 호출: $system-design-as-is'
}

# ---------------------------------------------------------------- 엔트리

case "${1:-}" in
  --uninstall|-u) uninstall ;;
  ""|--install)   install_all ;;
  *) echo "사용법: codex.sh [--install|--uninstall]" >&2; exit 1 ;;
esac
