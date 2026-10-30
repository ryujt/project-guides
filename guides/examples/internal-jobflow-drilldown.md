# 내부 동작을 설명하는 Job Flow — 문서 미리보기 예시

이 문서는 **가상의 문서 미리보기 서비스**로 분석 깊이와 문서 연결을 설명한다. 객체·함수·파일·줄 번호·결과 이름은 모두 형식 예시이며, 실제 구현을 조사하거나 실행한 근거가 아니다. 실제 산출물에서는 대상 코드의 이름·호출 위치·기준 커밋으로 바꿔야 한다. 시스템 전체 설계 양식의 완성본은 아니다.

기준은 [내부 추적과 완료](../system-design-document-guide.md#64-내부-추적과-완료-기준), 문법은 [Job Flow 가이드](../job-flow-diagram-guide.md)다. 이 예시의 조사 범위는 미리보기 서비스 안의 조회·권한·표시용 변환이며, 읽기 화면과 제3자 저장 드라이버의 내부는 제외한다.

## 1. L0 — 간명한 전체 흐름

독자가 문서의 특정 판본을 요청하면 서비스는 권한을 확인하고 그 판본의 미리보기를 반환한다.

```jobflow
scope: 문서 미리보기
Object: Reader, Preview
Reader.open --> Preview.render
Preview.render --> Reader.show
```

`Preview.render → Reader.show`는 원래 요청자에게 미리보기 응답이 돌아와 화면이 표시하는 흐름이다. 서비스가 화면 메서드를 직접 호출한다는 뜻은 아니다.

| 상위 계약 | 입력 | 출력 | 실패 |
|---|---|---|---|
| `Preview.render` = `POST /preview` | 읽는 사람·문서 식별자·판본 | 같은 판본의 표시용 본문 | 권한 거부·판본 없음·저장소 조회 실패 |

이 그림과 표만으로는 내부 동작을 설명할 수 없다. “권한을 확인하고 저장소에서 읽어 변환한다”라는 문장을 추가하거나 endpoint 파일 경로만 적어도 다음 질문은 남는다.

- 어떤 객체가 권한을 판단하며, 거부된 요청도 본문을 읽는가?
- 판본 번호에서 저장 키를 만드는 주체와 실제 본문을 읽는 주체는 누구인가?
- 판본 없음과 저장 장애는 어디서 구분되고, 오류가 응답으로 바뀌는 곳은 어디인가?

따라서 L0의 간명함은 유지하면서 아래로 내려간다.

## 2. 시나리오 내부 추적표

| 상위 노드 | 실제/제안 진입 심볼 | 내부 그림 또는 말단 근거 | 판정·중단 이유 |
|---|---|---|---|
| `Preview.render` | `PreviewEndpoint.render` → `PreviewComposer.build` | [JF-1](#jf-1-미리보기-조립--previewcomposerbuild) → [JF-1.1](#jf-11-지정-판본-읽기--revisionsourceload) | 펼침 — 라우트와 조립 함수의 대응, 권한·판본·내용 접근을 설명 |
| `Reader.open`, `Reader.show` | 화면 동작 별칭 | `POST /preview`의 요청·성공/오류 표시 계약 | 외부 경계 — 이 가상 예시는 서버 내부만 분석. 화면 내부 분석 완료로 세지 않음 |

실제 프로젝트에서는 첫 행의 라우트 등록 및 handler 호출 위치도 근거로 기록한다. `Preview.render`라는 분석용 별칭을 실제 클래스 메서드로 주장하지 않는다.

## 3. 경계 내부 원본

### JF-1 미리보기 조립 — PreviewComposer.build

**결론**: `PreviewEndpoint`가 요청과 응답을 맡고, `PreviewComposer`가 권한 판정·판본 읽기·표시용 변환을 조율한다. 상위 `Preview.render`의 입력·출력·실패 의미를 유지한다.

```jobflow
orchestrator: PreviewComposer
Object: PreviewEndpoint, PreviewComposer, AccessRule, RevisionSource, HtmlFormatter
PreviewEndpoint.render --> PreviewComposer.build
PreviewComposer.build --> AccessRule.check
AccessRule.check.denied
AccessRule.check.allowed --> RevisionSource.load
RevisionSource.load.missing
RevisionSource.load.unavailable
RevisionSource.load.found --> HtmlFormatter.format
HtmlFormatter.format --> PreviewComposer.build.result
```

`allowed`·`found` 등은 이 가상 예시의 결과 판정 이름이다. 실제 코드에서는 enum·반환값·분기 조건과의 대응을 근거 표에 적는다. 직접 호출과 결과 전달도 구분한다. `AccessRule.check.allowed → RevisionSource.load`는 `AccessRule`이 저장소를 호출한다는 뜻이 아니라 `PreviewComposer.build`가 검사 결과를 받아 호출한다는 뜻이다.

| 노드 | 코드 — 가상 위치 | 비고 |
|---|---|---|
| `PreviewEndpoint.render` | `src/api/preview.ts:14` | 라우트 등록이 연결한 handler. composer 반환을 응답으로 만들고 예외를 오류 응답으로 매핑 |
| `PreviewComposer.build` | `src/preview/composer.ts:18` | 세 협력자의 호출 위치도 이 함수. 권한 확인 → 판본 읽기 → 변환의 순서를 소유 |
| `AccessRule.check` | `src/preview/access-rule.ts:7` | 입력의 읽기 허용 목록과 principal을 비교. 저장·네트워크 접근 없음 |
| `RevisionSource.load` | `src/revisions/source.ts:20` | 문서·판본에서 내용을 찾는 협력은 [JF-1.1](#jf-11-지정-판본-읽기--revisionsourceload)로 확대 |
| `HtmlFormatter.format` | `src/preview/format.ts:6` | 조회된 본문을 escape해 표시용 텍스트로 반환. 외부 접근·상태 변경 없음 |

- 트리거는 endpoint의 요청이다. 완료는 요청한 판본의 표시용 본문을 endpoint가 반환한 때다. 읽기 흐름이므로 소유 데이터 변경은 없다.
- `denied`이면 composer가 거부 오류로 끝나며 `RevisionSource.load`를 호출하지 않는다. `missing`과 `unavailable`도 변환으로 진행하지 않고 서로 다른 오류로 끝난다. 단독 분기 줄은 이 종료를 뜻하며 반환값을 받는 가짜 메서드를 만들지 않는다.
- 예외 → 응답 매핑은 `PreviewEndpoint.render`의 catch/response 분기에서 처리한다고 가정한 예시다. 실제 분석에서는 해당 호출·분기 줄과 오류 타입을 적고, 별도 함수가 없으면 그림을 위해 `handleError`를 만들지 않는다.
- 권한 판정과 formatter는 본문을 확인해 단일 규칙/변환임이 입증됐을 때 말단으로 멈춘다. 순수 함수여도 복잡한 우선순위나 다른 정책 호출을 숨기면 더 연다.

### JF-1.1 지정 판본 읽기 — RevisionSource.load

상위 JF-1의 `RevisionSource.load`를 그대로 연다. 판본 식별자로 조회한 저장 키로 내용을 읽으며, 없는 판본과 저장 장애를 구분한다.

```jobflow
orchestrator: RevisionSource
Object: RevisionSource, RevisionCatalog, ContentBlobs
RevisionSource.load --> RevisionCatalog.find
RevisionCatalog.find.missing
RevisionCatalog.find.found --> ContentBlobs.read
ContentBlobs.read.unavailable
ContentBlobs.read.found --> RevisionSource.load.result
```

| 노드 | 코드 — 가상 위치 | 비고 |
|---|---|---|
| `RevisionSource.load` | `src/revisions/source.ts:20` | catalog와 blob 호출 위치. 찾은 저장 키를 전달하고 내용을 상위에 반환 |
| `RevisionCatalog.find` | `src/revisions/catalog.ts:9` | 문서·판본을 키로 단일 조회. 쓰기·fallback·캐시 없음. 사용 저장 adapter와 조회 조건을 근거에 기록 |
| `ContentBlobs.read` | `src/revisions/content-blobs.ts:11` | catalog가 반환한 저장 키로 읽기. 드라이버 오류를 `unavailable`로 변환. 적용 오류 타입과 변환 위치가 근거 |

여기서 `ContentBlobs.read` 호출자는 `RevisionSource.load`다. `RevisionCatalog`가 직접 호출하는 관계가 아니다. catalog에 판본이 없으면 blob을 읽지 않으며, blob 읽기가 실패하면 오류를 빈 본문이나 정상 완료로 바꾸지 않는다.

**말단·외부 경계**:

- `RevisionCatalog.find`는 입력·조회 조건·결과/오류를 확인한 단일 조회라 별도 L3 그림이 불필요하다. 캐시 또는 fallback이 발견되면 이 중단 판단은 바뀐다.
- `ContentBlobs.read`는 한 번의 드라이버 호출과 오류 변환까지 표와 근거로 설명한다. 호출 측 adapter는 조사하며, 제외된 제3자 드라이버 내부는 패키지 버전·계약·제외 이유를 기록하고 멈춘다. 이 예시는 특정 패키지를 가정하지 않는다.
- 실제 드라이버 구현이 대상 범위에 포함됐거나 오류 의미가 그 구현에 달렸다면 해당 코드/버전 조사 또는 미확인 판정이 필요하다. 경계의 이름만으로 완료 처리하지 않는다.

## 4. TO-BE로 바뀔 때

새 요구 `R-01`이 “같은 판본의 미리보기를 재사용한다”라면 `C-01`은 판본별 캐시, `D-01`은 원본 조회 실패와 캐시 부재를 구분하는 결정으로 연결할 수 있다. 이는 예시 요구이며 실제 프로젝트에 강제하지 않는다.

제안 심볼 `PreviewCache.lookup`·`PreviewCache.store`를 추가할 때는 **제안**으로 표시하고, 누가 캐시 키를 만들고 조회·저장하며 권한 검사와 어떤 순서로 실행하는지 목표 JF에 보여야 한다. 오류·무효화 소유자와 검증도 설계한다. `Preview.render`의 HTTP 계약이 같아도 내부 협력이 바뀌므로 L0만 복사해 완료할 수 없다.

유지하는 `RevisionSource.load`는 기준이 유효한 JF-1.1로 연결한다. AS-IS가 L0뿐이었다면 필요한 내부 흐름을 먼저 확인하고 보완한다. 변경 전후 관계와 요구/결정 근거는 표로 대조하되, 미구현 제안의 코드 위치나 실행 결과를 만들어 넣지 않는다.

## 5. 검토자가 확인할 경로

아래는 가상 구조에 대한 의미 검토 예시이며 실제 실행 결과가 아니다. 실제 분석은 해당 코드 근거·실행 여부를 함께 기록한다.

| 검토 입력 | L0 → 내부 추적 | 기대 관찰·판정 |
|---|---|---|
| 권한 있는 독자, 존재하는 판본 | `Preview.render` → JF-1 → JF-1.1 → formatter → endpoint 응답 | 조회 키·본문 판본 일치, 판단·읽기·반환 주체를 찾을 수 있음 |
| 권한 없는 독자 | `Preview.render` → JF-1 `AccessRule.check.denied` → endpoint 오류 매핑 | 내용 조회 전에 종료하는 실제 분기 위치를 확인해야 함 |
| catalog에는 있으나 blob 읽기 실패 | JF-1 → JF-1.1 `ContentBlobs.read.unavailable` → endpoint 오류 매핑 | 오류가 정상 빈 결과로 바뀌지 않는 경로와 관련 테스트를 확인해야 함 |

**불충분 판정**: L0+HTTP 표만 있음, 내부 객체를 산문에만 나열함, 이름만 바꾼 L1, 호출 위치 없는 심볼 목록, 미확인 SDK 동작 단정, “단순 함수” 한마디로 중단, 기준을 충족하지 않는 유지 AS-IS 링크.

**충분 판정**: 내부 추적표로 해당 JF와 근거까지 이동하고, 실제/제안 협력·상태 접근·오류 처리·수정/검증 위치를 찾으며 말단·외부·미확인도 정직하게 구분한다. 모든 helper를 그림으로 만들거나 정해진 그림 수를 채울 필요는 없다.
