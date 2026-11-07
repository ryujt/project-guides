# 테스트 실행 이력 공통 규칙·고정 경로 검증

- 기준 상태: 커밋 `d1d71a8` 위 가이드·프롬프트·README·설치 안내 문서 변경과 이력 폴더 추가. `git diff -- README.md guides prompts install.md | shasum -a 256`의 SHA-256은 `2509400f78cc0e9fd1786f20fb19395404dbbe2203342e4bacd0b51205513126`이다. 기록 자체와 색인은 해시에서 제외한다.
- 환경: Node.js `v26.12.1`, 시각은 UTC. 문서만 변경했으며 검사 도구·설치 스크립트·DSL 예제는 변경하지 않았다.
- 이전 참고: [과거 검토 기록](../../REVIEW.md)의 §11에서 정적 검사·의미 검토 구분과 남은 WARN 사례를 읽었다. 이번 변경 문서만 정적으로 검사하고, DSL 변경이 없어 기존 예제 렌더링·제품 실행은 범위에서 제외했다. 실행별 ID를 갖춘 관련 과거 기록은 없다.
- 정적 검사: 변경 Markdown 파일을 `node guides/tools/design-doc-check.mjs --strict <변경 Markdown 경로들>`로 검사한다. 실행한 실제 경로 목록과 결과는 해당 실행 아래에 남긴다.
- 공백 검사: `git diff --check`.

| 실행 ID | 시작·종료(UTC) | 대상·방법과 기대 결과 | 실제 결과·후속 |
| --- | --- | --- | --- |
| history-20261107-review-1 | 2026-11-07T11:57:09Z · 2026-11-07T11:57:30Z | 작성자 외 검토자가 변경 문서의 매 실행 기록·이전 이력 참조·보존·소비자 연결을 반례로 확인. 필수 충돌 0건 기대 | 수정 필요: 편집 중 `불안정`의 오타 1건 지적(수정 완료), 소켓 시험 안내에도 공통 절을 연결하도록 제안. 수정 후 review-2로 재평가 |
| history-20261107-review-2 | 2026-11-07T11:59:07Z · 종료 시각 미기록 | review-1 수정과 사용자 추가 요구인 고정 경로 반영 후 변경 전체를 독립 재평가. 필수 지적 0건 기대 | 수정 필요: 설계 브리프 자체에 이력을 누적할 수 있게 읽히는 문장 1건. 고정 경로 원본 ID·링크만 연결하도록 교정 후 review-3에서 재평가 |
| history-20261107-static-1 | 2026-11-07T11:59:07Z · 2026-11-07T11:59:29Z | 변경 문서의 링크·앵커·펜스·예제를 위 도구로 정적 검사. FAIL 0·WARN 0 기대 | 실패: files=16 blocks=1 fail=32 warn=0, 종료 코드 1. 모두 기존 Job Flow 가이드의 빠진 앵커 참조. baseline-1에서 기존/신규 여부 비교 |
| history-20261107-diff-1 | 2026-11-07T11:59:07Z · 2026-11-07T11:59:29Z | 변경 전체를 위 공백 검사 명령으로 검사. 오류 0건 기대 | 통과: 출력 오류 0건, 종료 코드 0. 이후 review-2 문장 수정 범위는 후속 검사 대상 |
| history-20261107-reviewer-diff-1 | 시각 미기록 | 독립 검토자가 review-2 중 `git diff --check` 실행. 공백 오류 0건 기대 | 통과: 공백 오류 출력 없음. 정확한 실행 시각을 남기지 못한 한계가 있으며 이후 검증부터 시작 시각 기록 필요 |
| history-20261107-review-3 | 2026-11-07T12:00:16Z · 2026-11-07T12:00:46Z | review-2가 지적한 설계 브리프 문장과 고정 경로의 정합성 재평가 | 통과: 설계 브리프는 고정 경로의 원본 실행 ID·링크만 연결하도록 확인. 새 필수 의미 지적 없음 |
| history-20261107-baseline-1 | 2026-11-07T12:00:16Z · 2026-11-07T12:00:46Z | 기준 커밋의 같은 문서 14개와 현재 문서 16개를 정적 검사하고 진단에서 줄 번호만 제외해 비교. 새 FAIL/WARN 0건 기대 | 비교 통과: 기준 files=14 fail=32 warn=0, 현재 files=16 fail=32 warn=0. 신규·사라진 진단 모두 0건. 두 정적 검사 자체는 종료 코드 1이며 전체 정적 통과가 아님. review-2 교정 후 문서 diff SHA-256은 681f128e9d2886c32c328af90cf609b9941b6370692e23e4d0a8200df81ee0c7 |
| history-20261107-static-2 | 2026-11-07T12:01:21Z · 2026-11-07T12:01:34Z | 결과를 반영한 이력 문서 2개를 `node guides/tools/design-doc-check.mjs --strict tests/test-history/README.md tests/test-history/20261107-test-history.md`로 검사. FAIL 0·WARN 0 기대 | 통과: files=2 blocks=0 fail=0 warn=0, links=4, 종료 코드 0. static-1·baseline-1 이후 바뀐 기록 문서만 재검증 |
| history-20261107-diff-2 | 2026-11-07T12:01:21Z · 2026-11-07T12:01:34Z | review-2 수정 후 `git diff --check`로 기존 변경 전체 공백 재검사. 오류 0건 기대 | 통과: 출력 오류 0건, 종료 코드 0 |

static-1의 실제 명령(프로젝트 루트에서 실행):

```bash
node guides/tools/design-doc-check.mjs --strict README.md REVIEW.md install.md guides/module-boundary-guide.md guides/detailed-logging-guide.md guides/prd-writing-guide.md guides/socket-server-stability-guide.md guides/system-design-document-guide.md guides/system-design-output-guide.md guides/wrtite-readme-guide.md prompts/comprehensive-test-prompt.md prompts/verify-first-implementation-prompt.md prompts/multi-agent-task-prompt.md prompts/frontend-prototype-prompt.md tests/test-history/README.md tests/test-history/20261107-test-history.md
```

증거는 이 문서에 재현 명령·기준 상태·결과 요약과 검토 반영으로 보존한다. 원문 로그·화면 자료는 생성하지 않는다. 다음 실행은 이 기록의 최종 결과와 후속 기록을 확인하고 문서가 다시 바뀐 범위만 재검증한다.

## 기준 비교 방법·남은 한계

baseline-1은 `git archive HEAD`를 임시 폴더에 추출하고 검사 도구의 경로 경계 검사가 동작하도록 그 안에 `.git` 표지를 만들었다. 기준 커밋에서는 static-1 명령의 기존 문서 14개를, 현재 상태에서는 새 이력 문서 2개를 포함한 16개를 같은 도구·`--strict` 옵션으로 검사했다. `FAIL`·`WARN` 진단에서 파일의 줄 번호만 제외한 뒤 종류·경로·메시지와 발생 건수를 비교했다. 비교 스크립트는 새 진단이 있으면 실패하도록 했으며 종료 코드 0이었다. 임시 추출물은 정리했다.

기존 실패 32건은 모두 `guides/job-flow-diagram-guide.md`의 없는 앵커를 참조한다. 발생 문서는 `REVIEW.md` 2건, `guides/prd-writing-guide.md` 1건, `guides/system-design-document-guide.md` 26건, `prompts/multi-agent-task-prompt.md` 3건이다. 이번 이력 관리 범위 밖이므로 수정하지 않았으며, 다음 링크 정비 작업에서 대상 제목과 참조를 대조해야 한다. 전체 정적 검사를 통과했다고 보고하지 않는다.

이번 변경은 문서 지침이다. 사용 프로젝트에서 에이전트가 실제로 이력을 작성·참조하는지, CI가 자동 누적하는지, 제품 실행·다이어그램 렌더링이 성공하는지는 검증하지 않았다. 다음 실행은 review-3·baseline-1과 이 기존 실패 목록을 먼저 읽고 변경된 문서 범위를 다시 검사한다.

최종 상태: 의미 검토와 새 이력 문서 정적 검사는 통과했다. 기존 문서의 앵커 오류 32건 때문에 전체 정적 검사는 실패 상태이며, 기준 커밋 대비 새 진단은 없다. 미종결 실행은 없다. 마지막 결과·시각을 확정하는 기록 변경은 재검사 범위에서 제외했다.
