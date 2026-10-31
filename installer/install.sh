#!/bin/sh
# Claude Code·Codex 스킬 통합 설치 프로그램.
# 사용법: bash installer/install.sh [--install|--uninstall|-u]
# 설치 위치와 Claude 설정은 각 설치 프로그램의 환경변수를 그대로 사용한다.

set -eu

usage() {
  echo '사용법: install.sh [--install|--uninstall|-u]' >&2
  exit 1
}

[ "$#" -le 1 ] || usage
if [ "$#" -eq 0 ]; then
  set -- --install
fi
case "$1" in
  --install) action=--install; operation='설치·업데이트' ;;
  --uninstall|-u) action=--uninstall; operation='제거' ;;
  *) usage ;;
esac

INSTALLER_DIR="$(CDPATH= cd "$(dirname "$0")" && pwd)"

# 앞 설치 프로그램이 실패하면 종료한다. 이미 반영된 변경은 유지한다.
printf 'Claude Code %s\n' "$operation"
sh "$INSTALLER_DIR/claude.sh" "$action"
printf 'Codex %s\n' "$operation"
sh "$INSTALLER_DIR/codex.sh" "$action"
printf '완료: Claude Code·Codex %s\n' "$operation"
