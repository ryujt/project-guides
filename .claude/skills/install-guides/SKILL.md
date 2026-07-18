---
name: install-guides
description: 이 저장소의 가이드·프롬프트를 개인 스킬(~/.claude/skills)로 설치·업데이트한다. "스킬 설치", "가이드 설치", "프롬프트 스킬 업데이트" 요청 시 사용. 인자 "uninstall" 을 주면 설치된 스킬을 전부 제거한다
---

# 가이드·프롬프트 스킬 설치

1. 저장소 루트에서 다음을 실행한다.
   - 인자가 `uninstall` 인 경우: `bash installer/install.sh --uninstall`
   - 그 외(인자 없음 포함): `bash installer/install.sh`
2. 스크립트 출력에 나온 설치(또는 제거)된 스킬 목록을 사용자에게 요약해 보여준다.
3. 설치 시에는 새 스킬이 **새 Claude Code 세션부터** `/system-design-as-is` 처럼 슬래시 명령으로 사용 가능함을 안내한다.
4. 자세한 사용법은 저장소 루트의 `install.md` 를 참고하라고 안내한다.
