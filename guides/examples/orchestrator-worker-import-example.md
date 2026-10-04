# Orchestrator-Worker: 가져오기 예제

[패턴 가이드](../orchestrator-worker-pattern-guide.md#6-c-예제-가져오기-흐름)의 가상 코드 예제다. C# 구현이 필요할 때 참고하며 제품 요구사항을 추가하는 양식은 아니다.

파싱 Worker는 저장 방식을 모르고, 저장 Port는 파싱 과정을 모른다. 조율자만 둘의 결과를 연결한다. 저장 작업을 그대로 감싸는 별도 업로드 Worker는 만들지 않는다. 아래 타입은 함께 컴파일할 수 있으며, 실제 파일 배치는 [프로젝트 구조 가이드](../project-structure-guide.md)에 따라 책임 단위로 정한다.

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
