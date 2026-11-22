# 매크로 Job Flow 지침과 설치 형식 검증

2026-11-22 14:13~14:20(KST), 기준 커밋 `336100c`와 작업 트리의 승인된 매크로 예제를 대상으로 했다. 설치 위치와 Claude 설정 파일은 모두 임시 경로로 지정했다. 선행 기록은 [실물 전달 이벤트](20261108-physical-transfer-events.md)와 [설계 스킬 설치 검증](20261122-scenario-state-analysis.md)이다.

| 실행 | 확인 방법 | 결과 |
| --- | --- | --- |
| 설치·출력 회귀 | `node --test installer/*.test.mjs guides/tools/design-doc-check.test.mjs`. 세 도구의 기본 설치, SmartMD 선택과 기본 복귀, 예제 갱신, 설치 경로 이동 후 참조를 확인했다. | 53건 통과. 기본 설치는 Navigation·State를 Mermaid로, Job Flow를 SVG로 제공한다. 명시적으로 선택한 SmartMD 설치는 DSL을 사용한다. 두 설정 모두 매크로 예제 원문을 보존했다. |
| 임시 설치본의 매크로 작성 | 같은 장비 대여 자료로 AS-IS에는 현행 인계 절차를, TO-BE에는 수령증을 통한 최초 확인과 문자 의뢰를 설계하도록 했다. 임시 기본 설치의 AS-IS 진입점과 SmartMD 설치의 TO-BE 진입점에서 각각 매크로 문서 한 개만 작성했다. | AS-IS는 상대 경로 SVG 1개, TO-BE는 `jobflow` 펜스 2개였다. 공통 인계 도표의 SVG가 일치했고 화살표와 설명이 각각 8·8·6개로 대응했다. AS-IS의 수령 전산 등록은 미확인, TO-BE의 발송 실패 통지 계약은 미정으로 표시했다. |
| 예제 선택·문서 검사 | `node guides/tools/design-doc-check.mjs --strict prompts examples/diagram README.md AGENTS.md install.md guides/system-design-framework.md guides/job-flow-diagram-guide.md guides/diagram-output-guide.md guides/navigation-diagram-guide.md`로 링크·앵커·펜스를 검사했다. | 25개 문서, 오류·경고 0건. 상위 예제 인덱스가 Job Flow의 업무 의존관계와 해당 시나리오 절로 연결됐다. |
| 변경 문서 기준 대조 | 같은 수정 대상 Markdown 20개를 기준 사본과 작업 트리에서 검사했다. 기준에는 작업 시작 전에 삭제된 예제와 기존 매크로 원문을 반영했다. | 기준 오류 38건·경고 3건에서 오류 20건·경고 3건으로 감소했다. 신규 진단은 없었다. 남은 오류는 상세 설계 양식의 기존 앵커, 경고는 Method-R 서비스 간 예제의 도형 재배치다. |
| 독립 검토 | 사건과 선행 조건, 수신 뒤 판단, 외부 주체 간 업무 인계, 실물 수령과 전산 통지, 확인 근거·가정, 예제와 산출물 형식을 대조했다. | 상세 설계 양식이 매크로의 시작 사건을 생략하게 하는 규칙과 삭제된 예제의 필수 읽기 지시를 고쳤다. 독립 검토와 임시 설치·생성으로 재확인했다. |

검증 대상은 임시 설치본과 가상 업무의 매크로뷰다. 사용자 프로젝트의 전체 설계 생성과 실제 CLI 대화에서의 자동 스킬 선택은 검증 범위 밖이다.
