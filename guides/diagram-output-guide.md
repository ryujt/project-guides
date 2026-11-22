# 다이어그램 출력 형식

이 설치의 최종 Markdown에는 아래 형식을 적용한다. 전용 가이드·프롬프트·예제에서 요청하는 `navigation`, `state`, `jobflow` 블록은 변환 입력이다. 원문에서 노드·분기·계약을 검토한 뒤 각 블록이 있던 위치에 결과를 넣고 바로 아래의 설명과 화면 확인 링크를 유지한다.

| 다이어그램 | 최종 Markdown |
|---|---|
| Navigation | 변환한 `graph LR` 전체를 `mermaid` 코드 펜스에 넣는다. |
| State | 시작·종료·이벤트 모양과 전이 라벨을 포함한 `graph LR` 전체를 `mermaid` 코드 펜스에 넣는다. |
| Job Flow | SVG 파일을 문서와 함께 저장하고 `![도표의 목적](images/request-flow.svg)`처럼 문서 기준 상대 경로로 삽입한다. |

[변환 도구](tools/render-diagram.mjs)는 Node.js 18 이상에서 실행한다. 아래 명령은 이 가이드가 있는 디렉터리를 기준으로 한 예다. 입력에는 펜스를 제외한 한 도표의 DSL 본문을 넣는다.

```sh
node tools/render-diagram.mjs navigation < route.dsl
node tools/render-diagram.mjs state < lifecycle.dsl
node tools/render-diagram.mjs jobflow < request.dsl > request-flow.svg
```

앞의 두 명령은 Mermaid 본문을 출력한다. 마지막 명령이 생성한 SVG를 산출 문서의 이미지 폴더에 도표별 고유 이름으로 배치한다. 문서를 옮길 때 이미지도 함께 옮긴다. 완료 전에 Markdown의 상대 경로로 SVG를 열 수 있는지 확인한다. Mermaid 표시는 Mermaid를 지원하는 Markdown 뷰어가 필요하다.
