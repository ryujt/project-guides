#!/bin/sh
# project-guides 스킬 설치 프로그램
#
# 저장소의 guides/·prompts/ 를 개인 스킬 디렉토리(~/.claude/skills)에 설치해서
# Claude Code 어디서든 /system-design-as-is 처럼 슬래시 명령으로 쓸 수 있게 한다.
#
# 사용법:
#   bash installer/install.sh              # 설치 또는 업데이트 (덮어쓰기)
#   bash installer/install.sh --uninstall  # 설치된 스킬 전부 제거
#
# 환경변수:
#   CLAUDE_SKILLS_DIR  스킬 설치 위치 (기본값: $HOME/.claude/skills)

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
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
    system-design-as-is)         echo "기존 코드베이스를 분석해 AS-IS 설계 분석 문서를 생성한다. '현재 시스템 분석', 'AS-IS 설계 문서' 요청 시 사용" ;;
    system-design-to-be)         echo "AS-IS 산출물과 설계 요청을 입력받아 TO-BE 설계 분석 문서를 생성한다. '개선 설계', 'TO-BE 설계 문서' 요청 시 사용" ;;
    feature-design)              echo "특정 요구사항(기능 추가·변경) 하나를 영향 범위로 한정해 기능 설계 문서를 생성한다. FR 분해·추적성 포함" ;;
    frontend-user-design)        echo "회원가입·로그인·세션·계정 복구·탈퇴 등 회원제 프론트엔드 설계 문서를 생성한다" ;;
    frontend-navigation-diagram) echo "프론트엔드의 화면·API·내부 프로세스 흐름을 navigation DSL 다이어그램으로 작성한다" ;;
    frontend-state-diagram)      echo "프론트엔드 객체·화면의 상태 전이를 state DSL 다이어그램으로 작성한다" ;;
    multi-agent-task)            echo "Architect·Critic·Developer·Tester 등 여러 전문 에이전트가 분업·상호 견제하며 작업을 수행한다" ;;
    ux-ui-improvement)           echo "유사 서비스 벤치마킹·오픈소스 리서치를 기반으로 UX/UI 개선 설계안을 도출한다" ;;
    detailed-logging)            echo "2계층(텍스트+구조화) 세션 기반 상세 로깅 시스템을 현재 프로젝트에 구현한다" ;;
    comprehensive-test)          echo "로깅 계측·단위/통합/E2E 테스트·버그 수정·UX 리뷰를 반복해 통합 품질 검증을 수행한다" ;;
    site-design)                 echo "사이트(웹 서비스) 전체 설계 문서를 생성한다" ;;
    *)                           title_of "$2" ;;
  esac
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

install_shared_skill() {
  rm -rf "$SHARED_DIR"
  mkdir -p "$SHARED_DIR"
  cp -R "$REPO_ROOT/guides" "$SHARED_DIR/guides"
  cp -R "$REPO_ROOT/prompts" "$SHARED_DIR/prompts"
  cp "$REPO_ROOT/README.md" "$SHARED_DIR/README.md"

  guide_list=""
  for f in "$SHARED_DIR"/guides/*.md; do
    guide_list="$guide_list- \`guides/$(basename "$f")\` — $(title_of "$f")
"
  done

  cat > "$SHARED_DIR/SKILL.md" <<EOF
---
name: $SHARED_NAME
description: 프로젝트 설계·문서화·구현 가이드 인덱스. 설계 방법론(method-R), PRD, 아키텍처 패턴, jobflow/navigation/state/layout 다이어그램 DSL, 코드·폴더 구조 규칙이 필요할 때 사용. 인자로 가이드 이름을 주면 해당 가이드를 읽는다
---

# Project Guides 인덱스

이 스킬 폴더에는 project-guides 저장소의 가이드·프롬프트 전체 사본이 들어 있다.

1. 먼저 이 폴더의 \`README.md\` 를 읽는다. "어떤 상황에 어떤 문서를 참조하는가"의 트리거 표와 워크플로별 문서 묶음이 정리되어 있다.
2. 이 스킬 호출 시 인자로 가이드 이름(예: \`state-diagram\`, \`prd\`, \`method-R\`)이 전달되면, 아래 목록에서 이름이 가장 잘 일치하는 가이드 파일을 찾아 전체를 읽고 현재 작업에 적용한다.
3. 인자가 없으면 README.md 의 트리거 표를 기준으로 현재 대화 상황에 맞는 가이드를 골라 읽는다.

## 가이드 목록

$guide_list
## 실행 프롬프트

\`prompts/\` 의 파일들은 각각 독립 스킬(슬래시 명령)로도 설치되어 있다. 예: \`/system-design-as-is\`, \`/feature-design\`.
EOF

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

1. \`$SHARED_DIR/prompts/$file_name\` 파일을 **전체** 읽는다.
2. 파일의 지시문을 현재 작업 디렉토리의 프로젝트에 그대로 적용해 끝까지 수행한다.
3. 이 스킬 호출 시 함께 전달된 인자·요청이 있으면 프롬프트의 입력(설계 요청·추가 요구사항)으로 반영한다.
4. 프롬프트가 상대 경로 \`../guides/...\` 로 참조하는 가이드는 \`$SHARED_DIR/guides/\` 에 있다.
EOF

  echo "설치: /$slug — $title"
  printf '%s\n' "$slug" >> "$MANIFEST"
}

install_all() {
  mkdir -p "$SKILLS_DIR"
  install_shared_skill
  : > "$MANIFEST"
  printf '%s\n' "$SHARED_NAME" >> "$MANIFEST"
  for f in "$REPO_ROOT"/prompts/*.md; do
    [ -e "$f" ] || continue
    install_prompt_skill "$f"
  done
  echo
  echo "완료: 스킬 설치 위치 → $SKILLS_DIR"
  echo "Claude Code 새 세션에서 /system-design-as-is 처럼 바로 사용할 수 있다."
}

# ---------------------------------------------------------------- 엔트리

case "${1:-}" in
  --uninstall|-u) uninstall ;;
  ""|--install)   install_all ;;
  *) echo "사용법: install.sh [--uninstall]" >&2; exit 1 ;;
esac
