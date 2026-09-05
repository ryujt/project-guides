# Orchestrator-Worker 패턴 설계 가이드

여러 조각이 협력하는 시나리오에서는 **조각은 자기 책임을 수행하고, 상위 조율자가 결과를 연결**한다. 형제 조각의 구현과 다음 작업 순서를 몰라도 각 조각을 수정할 수 있게 하는 것이 목적이다. 책임·공개 계약·데이터 소유권의 기준은 [모듈 경계 가이드](./module-boundary-guide.md)를 따른다.

## 1. 적용 범위

이 패턴은 순서, 분기, 취소, 부분 실패를 여러 독립 조각에 걸쳐 조율할 때 유용하다. 한 함수의 계산이나 한 모듈 안의 응집된 단계까지 모두 Worker로 분리하지 않는다. 단순한 기능은 함수나 객체 하나로 시작한다.

* 기본적으로 **같은 시나리오에 참여하는 형제 Worker는 서로를 호출하지 않고**, 조율자가 결과를 이어 준다.
* Worker 내부의 순수 helper와 자신에게 주입된 좁은 Port 호출은 허용한다. Port는 외부 능력에 대한 계약이며, 다른 Worker의 내부 구현에 접근하는 우회로가 아니다.
* 다른 모듈의 공개 API에 의존할 수는 있다. 이때 의존 방향·계약·실패 영향이 드러나야 하고 순환 의존을 만들지 않는다. 형제의 실행 순서를 결정하는 호출이라면 조율자로 옮긴다.
* 패턴을 적용해도 데이터 의미, 호출 순서, 시간, 실패에 대한 결합은 남는다. 이벤트나 인터페이스를 썼다는 사실만으로 독립성을 판정하지 않는다.

## 2. 구성 요소

| 요소 | 소유하는 책임 | 알아야 하는 것 |
|---|---|---|
| 조립 진입점 (`Main`, app bootstrap) | 설정 읽기, 객체 생성, 수명·연결 구성 | 구체 구현과 조립 방식 |
| Orchestrator | 한 유스케이스의 순서·분기·취소·부분 실패 | 참여 조각의 공개 계약 |
| Worker | 응집된 비즈니스 규칙과 자신의 상태 | 입력, 출력, 주입된 계약 |
| Port | 필요한 외부 능력의 경계 | 호출 의미, 데이터, 오류 계약 |
| Gateway/Adapter | DB·API·파일 등 외부 접근과 기술 변환 | 외부 SDK·프로토콜, 구현할 Port |
| 공용 기능 | 실제로 함께 쓰이는 좁고 안정된 능력 | 명시적으로 전달된 입력과 의존 |

`Main` 하나에 시스템 전체 유스케이스를 넣지 않는다. 조립과 업무 조율은 책임이 다르며, 주문·정산 등 변경 이유가 다르면 조율자도 분리한다. 작은 프로그램에서는 같은 파일에 둘 수 있다.

`Service`라는 이름은 Singleton이나 전역 상태를 뜻하지 않는다. 공유 자원의 인스턴스 수와 수명은 조립 진입점에서 정하고 주입한다. 전역 접근자나 Service Locator로 의존을 숨기지 않는다.

## 3. 호출·반환·이벤트 선택

| 상황 | 기본 표현 | 추가로 정할 것 |
|---|---|---|
| 요청 하나에 결과 하나, 순차 처리 | 직접 호출 + 반환값 또는 `await` | 입력·출력, 오류, 취소 |
| 진행률·상태 변화 또는 여러 독립 구독자 | 이벤트 | 발행 시점, 구독 수명, 재진입·구독자 실패 |
| 프로세스 밖 통신 | Gateway를 통한 요청/응답 또는 메시지 | 전달 보장, 타임아웃, 중복, 호환성 |

Worker가 결과를 반환하는 것은 상위를 참조하는 것이 아니다. 일회성 결과를 보고하려고 완료·실패 이벤트와 구독 해제를 강제로 만들지 않는다. 이벤트가 필요하면 조율자가 구독을 연결하고 해제 책임까지 가진다. 작업 완료 결과와 완료 이벤트를 함께 제공한다면 무엇이 업무 성공의 기준인지 명시한다.

조율 방식(Orchestration/Choreography), 프로세스 경계, 동기·비동기 전송은 별개로 결정한다. Orchestrator도 메시지를 통해 비동기로 조율할 수 있다. [Method-R](./method-R.md)에서 설계 단계별로 이 결정을 기록한다.

## 4. 상태와 실패 책임

* Worker는 자신의 비즈니스 상태를 소유한다. 조율자는 현재 단계, 실행 식별자 등 워크플로 상태를 소유하며 Worker의 내부 상태를 직접 수정하지 않는다.
* Gateway는 외부 기술 오류를 계약에서 정한 오류로 변환한다. 업무상 거절과 일시적인 통신 실패를 구별한다.
* 취소와 타임아웃은 호출 경로에 전달한다. 재시도는 정한 계층 한 곳에서 수행하며, 부작용이 있는 호출은 멱등성·중복 방지 조건을 먼저 확인한다.
* 여러 단계가 성공한 뒤 실패하면 조율자가 후속 정책을 결정한다. 로컬 트랜잭션의 rollback과 이미 외부에 반영된 효과의 보상을 구분한다. 보상 자체도 실패할 수 있다.
* 이벤트에는 필요한 실행 식별자를 포함한다. 중복·지연 이벤트가 다른 실행을 완료시키거나 취소된 실행을 되살리지 않게 한다.

## 5. 분할과 병합

Sub-Orchestrator는 내부에 독립 책임과 별도 조율 규칙이 생길 때 도입한다. 단계가 세 개라는 이유나 클래스가 길다는 이유만으로 승격하지 않는다.

| 관찰 | 검토할 변경 |
|---|---|
| 한 Worker에 외부 SDK와 비즈니스 규칙이 섞임 | Port와 Gateway로 외부 의존 분리 |
| Worker들이 서로 다음 단계를 지시함 | 유스케이스 조율자로 순서·분기 이동 |
| Worker들이 같은 불변식을 나눠 갖고 항상 함께 바뀜 | 하나의 책임으로 병합 |
| Orchestrator가 도메인 데이터의 필드를 계산·수정함 | 규칙을 데이터 소유 Worker로 이동 |
| 조율자에 관련 없는 여러 기능이 누적됨 | 유스케이스별 조율자로 분리 |
| 전달만 하는 Worker가 연속으로 생김 | 중간 계층의 계약 가치가 없다면 제거 |

## 6. C# 예제: 가져오기 흐름

파싱 Worker는 저장 방식을 모르고, 저장 Port는 파싱 과정을 모른다. 조율자만 둘의 결과를 연결한다. 저장 작업을 그대로 감싸는 별도 업로드 Worker는 만들지 않는다. 아래 타입은 함께 컴파일할 수 있으며, 실제 파일 배치는 [프로젝트 구조 가이드](./project-structure-guide.md)에 따라 책임 단위로 정한다.

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

public abstract record ParseResult
{
    public sealed record Valid(IReadOnlyList<string> Rows) : ParseResult;
    public sealed record Invalid(string Code) : ParseResult;
}

public sealed class FileParserWorker
{
    public ParseResult Parse(string text)
    {
        var rows = text.Split('\n')
            .Select(row => row.Trim())
            .Where(row => row.Length > 0)
            .ToArray();

        if (rows.Length == 0)
            return new ParseResult.Invalid("empty_input");

        return new ParseResult.Valid(Array.AsReadOnly(rows));
    }
}

public interface IImportStore
{
    Task SaveAsync(IReadOnlyList<string> rows, CancellationToken cancellationToken);
}

public sealed class ImportStoreUnavailableException : Exception
{
    public ImportStoreUnavailableException(string message) : base(message) { }
}

public abstract record ImportResult
{
    public sealed record Completed(int Count) : ImportResult;
    public sealed record Rejected(string Code) : ImportResult;
    public sealed record Unavailable : ImportResult;
}

public sealed class ImportOrchestrator
{
    private readonly FileParserWorker _parser;
    private readonly IImportStore _store;

    public ImportOrchestrator(FileParserWorker parser, IImportStore store)
    {
        _parser = parser;
        _store = store;
    }

    public async Task<ImportResult> RunAsync(
        string text, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var parsed = _parser.Parse(text);
        if (parsed is ParseResult.Invalid invalid)
            return new ImportResult.Rejected(invalid.Code);

        var valid = (ParseResult.Valid)parsed;
        try
        {
            await _store.SaveAsync(valid.Rows, cancellationToken);
            return new ImportResult.Completed(valid.Rows.Count);
        }
        catch (ImportStoreUnavailableException)
        {
            return new ImportResult.Unavailable();
        }
    }
}
```

예제의 `IImportStore`는 **한 번의 호출에서 전체 행을 저장하거나 전혀 반영하지 않는 저장소**를 전제한다. Gateway 구현은 이 계약을 만족해야 한다. `Unavailable`은 확정된 미반영 실패에만 사용하며, 원격 저장 성공 여부를 모르는 경우는 실제 계약에 별도 결과와 조회·복구 정책을 추가한다. 예제는 자동 재시도를 하지 않는다. 반복 요청을 허용하는 제품이라면 저장 전에 실행 ID와 멱등성 계약을 추가한다.

예상한 저장 불가만 결과로 변환하고 취소와 예상 밖 결함은 호출자에게 전달한다. 실제 Gateway는 좁은 저장 계약을 구현하며 연결·트랜잭션을 관리한다. 입력 형식이나 DB 구현을 바꿀 때 이 예제에 없는 요구사항까지 추정하지 않는다.

## 7. 검증 기준

* 빈 입력이 저장을 호출하지 않고 업무 거절로 끝나는가?
* 유효한 입력이 한 번 저장되고 저장 완료 후에만 성공하는가?
* 저장 실패와 취소가 성공으로 바뀌지 않는가?
* Gateway가 약속한 원자성·오류 변환을 실제 저장소 통합 검증으로 확인했는가?
* Worker의 내부 수정에 형제 Worker 구현을 읽을 필요가 없는가?
* 공개 계약 변경 시 소비자, 이벤트 구독 설정, 실패 경로를 함께 확인했는가?
