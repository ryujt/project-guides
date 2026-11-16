#!/bin/sh
# project-guides Codex 스킬 설치 프로그램
#
# guides/·prompts/·examples/를 Codex 개인 스킬로 설치한다.
# 일반 요청의 작업 의도·핵심 단어로 자동 선택하거나 $스킬명으로 호출한다.
# 스킬 생성 규칙은 Gemini CLI와 공유하는 agent-skills.sh가 기준이다.
#
# 사용법:
#   bash installer/codex.sh              # 설치 또는 업데이트 (덮어쓰기)
#   bash installer/codex.sh --uninstall  # 설치된 스킬 전부 제거
#
# 환경변수:
#   CODEX_SKILLS_DIR  스킬 설치 위치 (기본값: $HOME/.agents/skills)

set -eu

[ "$#" -le 1 ] || { echo "사용법: codex.sh [--install|--uninstall]" >&2; exit 1; }
INSTALLER_DIR="$(CDPATH= cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="${CODEX_SKILLS_DIR:-$HOME/.agents/skills}"
sh "$INSTALLER_DIR/agent-skills.sh" codex "$SKILLS_DIR" "$@"

# 기본 경로는 Gemini CLI도 함께 탐색하는 ~/.agents/skills 다(gemini.sh 참고).
if [ "$SKILLS_DIR" = "$HOME/.agents/skills" ]; then
  case "${1:-}" in
    --uninstall|-u)
      echo "참고: Gemini CLI가 이 사본을 쓰고 있었다면 bash installer/gemini.sh 로 Gemini CLI용을 다시 설치한다." ;;
    *)
      if [ -f "$HOME/.gemini/skills/project-guides/.installed-skills" ]; then
        echo "참고: ~/.gemini/skills 에도 같은 스킬이 있어 Gemini CLI가 충돌 경고를 낸다. bash installer/gemini.sh 로 정리한다."
      fi ;;
  esac
fi
