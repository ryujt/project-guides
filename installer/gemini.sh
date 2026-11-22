#!/bin/sh
# project-guides Gemini CLI 스킬 설치 프로그램
#
# guides/·prompts/·examples/를 Gemini CLI 개인 스킬(Agent Skills)로 설치한다.
# 일반 요청의 작업 의도·핵심 단어로 자동 선택하거나 스킬 이름을 명시해 요청한다.
# 스킬 생성 규칙은 Codex와 공유하는 agent-skills.sh가 기준이다.
#
# Gemini CLI는 ~/.gemini/skills 와 별칭 ~/.agents/skills(Codex 기본 경로)를 함께 탐색하고,
# 같은 이름이면 별칭 쪽을 쓰면서 매 세션 충돌 경고를 띄운다. 그래서 설치 위치가 기본값
# ~/.gemini/skills 이고 ~/.agents/skills 에 이 묶음이 이미 설치되어 있으면, 설치하지 않고
# 이전에 설치한 사본만 정리한다. 두 경로의 스킬 내용은 같다.
#
# 사용법:
#   bash installer/gemini.sh              # 설치 또는 업데이트 (덮어쓰기)
#   bash installer/gemini.sh --uninstall  # 설치된 스킬 전부 제거
#
# 환경변수:
#   GEMINI_SKILLS_DIR  스킬 설치 위치 (기본값: $HOME/.gemini/skills, 다른 경로면 별칭 확인 생략)

set -eu

usage() {
  echo "사용법: gemini.sh [--install|--smartmd|--uninstall]" >&2
  exit 1
}

[ "$#" -le 1 ] || usage
case "${1:-}" in
  ""|--install|--smartmd|--uninstall|-u) ;;
  *) usage ;;
esac

INSTALLER_DIR="$(CDPATH= cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="${GEMINI_SKILLS_DIR:-$HOME/.gemini/skills}"
ALIAS_MANIFEST="$HOME/.agents/skills/project-guides/.installed-skills"

case "${1:-}" in
  --uninstall|-u) ;;
  *)
    if [ "$SKILLS_DIR" = "$HOME/.gemini/skills" ] && [ -f "$ALIAS_MANIFEST" ]; then
      if [ -d "$SKILLS_DIR/project-guides" ]; then
        echo "중복 정리: $SKILLS_DIR 의 이전 Gemini CLI 사본을 제거한다."
        sh "$INSTALLER_DIR/agent-skills.sh" gemini "$SKILLS_DIR" --uninstall
      fi
      echo "건너뜀: Gemini CLI는 ~/.agents/skills 에 이미 설치된 같은 스킬을 우선 사용한다."
      echo "그 사본은 기본 경로의 Codex 설치다. 갱신하려면 CODEX_SKILLS_DIR 없이 bash installer/codex.sh 를 실행한다."
      echo "Codex 설치를 제거한 뒤 Gemini CLI에서 계속 쓰려면 bash installer/gemini.sh 를 다시 실행한다."
      exit 0
    fi
    ;;
esac

exec sh "$INSTALLER_DIR/agent-skills.sh" gemini "$SKILLS_DIR" "$@"
