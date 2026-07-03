# Orchestrator-Worker 패턴 설계 가이드

본 가이드는 시스템의 복잡도를 제어하기 위해 기능을 독립적인 단위로 분리하고, 각 객체의 **명확한 역할 분담**과 **제어권 흐름(호출 및 이벤트 규약)**을 확립하는 것을 목적으로 한다.

## 1. 시스템 아키텍처 구조

아래의 형태를 기본 구조로 삼으며, 세부 사항은 프로젝트 상황에 맞게 유연하게 구성한다.

* `Main`: 시스템 전체를 관장하는 최상위 Orchestrator
* `config`: 환경 설정 모음
* `core`: 최상위 Worker들의 모음
* `gateways`: 외부 시스템(DB, API, 스토리지 등)과 직접 통신하는 Gateway들의 모음. 상위 계층이 인프라 세부사항을 몰라도 되게 한다.
* `service`: 싱글톤으로 구성된 서비스. 전역에서 상태를 공유해야 할 객체 (예: LogService, API_Service 등)
* `utils`: 객체 생성 없이 코드 전역에서 공유되는 무상태(Stateless) 모듈

`Main`은 시스템 전체 관점에서의 Orchestrator 역할을 수행한다. 만약 특정 Worker의 내부 구현이 복잡해진다면, 해당 Worker를 Sub-Orchestrator로 승격시켜 더 작은 단위의 하위 Worker들을 관리하는 재귀적인 형태로 확장한다.

## 2. 핵심 원칙 요약

| 원칙 | 설명 |
| --- | --- |
| **단방향 제어** | Orchestrator에서 Worker 방향으로만 직접 호출한다. |
| **이벤트 기반 보고** | Worker는 상위 객체에 오직 '이벤트'로만 작업 결과를 알린다. |
| **수평적 고립** | Worker 간 직접 통신을 엄격히 금지한다. |
| **재귀적 구조** | 복잡도가 높은 Worker는 Sub-Orchestrator로 확장한다. |
| **외부 접근 캡슐화** | 외부 시스템과의 통신은 Gateway로 분리한다. |
| **상태 공유** | 전역에서 공유할 상태나 자원은 Service로 분리한다. |

## 3. 구성 요소 및 역할

### Orchestrator (Main)

* **역할:** 전체 시스템의 시나리오 흐름을 제어하고 중재한다.
* **책임:** Worker 객체들을 소유하고, Worker의 이벤트를 수신하여 다음 동작을 결정한다.
* **제약:** Orchestrator가 직접 비즈니스 로직을 연산하는 것을 지양한다.

### Worker

* **역할:** 할당된 특정 기능만 수행하는 독립적인 실행 단위이다.
* **책임:** 오직 자신의 임무에만 집중한다.
* **제약:** 상위 객체(Orchestrator)나 형제 객체(다른 Worker)의 존재를 알지 못해야 한다.

### Gateway

* **역할:** 외부 시스템(데이터 레이크, DB, API 등)과 직접 통신하며, 특정 외부 리소스에 대한 접근을 캡슐화하는 독립 단위이다.
* **책임:** 상위 계층(Orchestrator, Worker)이 인프라 세부사항을 몰라도 되게, 외부 시스템의 복잡성을 내부에 감추고 깔끔한 인터페이스를 제공한다.
* **제약:** Worker와 동일하게 상위 객체나 형제 객체의 존재를 알지 못해야 한다.
* **Worker와의 차이:**

| 구분 | Worker | Gateway |
| --- | --- | --- |
| 통신 대상 | 시스템 내부 데이터 처리 | 외부 시스템(DB, API, 스토리지)과 통신 |
| 핵심 역할 | 비즈니스 로직 수행 | 외부 리소스 접근 캡슐화 |
| 의존성 | 내부 모듈만 의존 | 외부 프로토콜·SDK에 의존 |
| 사용 시점 | 데이터 가공, 검증, 변환 등 | 데이터 조회, 저장, 외부 API 호출 등 |

> **설계 기준:** 외부 시스템과의 통신이 필요한 로직은 Gateway로 분리한다. 상위 계층은 Gateway의 인터페이스만 알면 되고, 통신 프로토콜이나 인프라 설정을 직접 다루지 않는다.

### Service

* **역할:** 시스템 전역에서 공유해야 하는 기능이나 상태를 제공한다.
* **책임:** 애플리케이션 내에서 단일 인스턴스(Singleton)로 관리된다.
* **특징:** 무상태(Stateless)인 Utility와 달리 지속적으로 상태(State)를 보유하고 관리한다.

## 4. 호출 및 통신 규약

객체 간 결합도를 낮추고 유지보수성을 높이기 위한 필수 통신 규칙이다.

* **하향식 호출 (Direct Command): `Orchestrator → Worker**`
상위 객체가 하위 Worker의 메서드를 직접 호출하여 작업을 지시한다.
* **상향식 보고 (Event Notification): `Worker → Orchestrator**`
Worker는 상위 객체를 참조하지 않는다. 작업 완료, 오류 발생, 상태 변경 시 오직 **이벤트(Event)**를 발행하여 외부에 알린다.
* **수평적 고립 (Isolation): `Worker ↔ Worker (직접 호출 금지)**`
Worker끼리는 서로 직접 호출할 수 없다. 데이터를 전달하거나 작업 흐름을 이어가려면 반드시 Orchestrator를 거쳐야 한다.
*(흐름: Worker A 이벤트 발행 → Orchestrator 수신 → Orchestrator가 Worker B 호출)*

## 5. 구조적 확장 및 변경 기준

특정 Worker가 비대해지거나 논리적 단계가 복잡해질 경우, 가독성과 독립성을 유지하기 위해 아래 기준을 따른다.

* **Worker의 재귀적 분할 (Recursive Division)**
내부 로직을 여러 하위 Worker로 분할하고, 기존 Worker는 이들을 조율하는 중간 관리자(Sub-Orchestrator) 역할을 수행한다.
* **외부 통신의 Gateway 분리 (Gateway Extraction)**
Worker 내부에 외부 시스템 호출 로직이 섞여 있다면, 해당 로직을 Gateway로 분리하여 Worker가 순수한 비즈니스 로직에만 집중하도록 한다.
* **Worker 간 의존성 해소 (Dependency Resolution)**
* **공통 데이터/기능 공유가 필요할 때:** Service로 분리하여 Orchestrator가 주입한다.
* **기능적 결합도가 너무 높을 때:** 하나의 Worker로 병합한다.
* **작업 순서 제어가 필요할 때:** 제어 로직을 분리하여 Orchestrator로 이관한다.

---

## 6. 구현 예제

파일을 개별적으로 분리하여 가독성을 높이고 단일 책임 원칙(SRP)을 준수한 C# 구현 예제이다.

### Service (공유 자원 - Singleton)

```csharp
// LogService.cs
public class LogService
{
    private static readonly Lazy<LogService> _instance =
        new Lazy<LogService>(() => new LogService());

    public static LogService Instance => _instance.Value;

    private LogService() { }

    public void WriteLog(string message)
    {
        Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] {message}");
    }
}

```

### Worker 1 (파일 파싱)

```csharp
// FileParserWorker.cs
public class FileParserWorker
{
    public event Action<ParsedData> OnParseCompleted;
    public event Action<string> OnParseFailed;

    public void StartParsing(string filePath)
    {
        LogService.Instance.WriteLog($"파싱 시작: {filePath}");

        try
        {
            var data = Parse(filePath);
            LogService.Instance.WriteLog("파싱 완료");
            OnParseCompleted?.Invoke(data);
        }
        catch (Exception ex)
        {
            LogService.Instance.WriteLog($"파싱 실패: {ex.Message}");
            OnParseFailed?.Invoke(ex.Message);
        }
    }

    private ParsedData Parse(string filePath) { /* 파싱 로직 */ return new ParsedData(); }
}

```

### Worker 2 (데이터 검증)

```csharp
// DataValidatorWorker.cs
public class DataValidatorWorker
{
    public event Action<ValidatedData> OnValidationCompleted;
    public event Action<string> OnValidationFailed;

    public void Validate(ParsedData data)
    {
        LogService.Instance.WriteLog("검증 시작");

        var errors = CheckRules(data);
        if (errors.Count == 0)
        {
            LogService.Instance.WriteLog("검증 통과");
            OnValidationCompleted?.Invoke(new ValidatedData(data));
        }
        else
        {
            LogService.Instance.WriteLog($"검증 실패: {errors.Count}건");
            OnValidationFailed?.Invoke(string.Join(", ", errors));
        }
    }

    private List<string> CheckRules(ParsedData data) { /* 검증 로직 */ return new List<string>(); }
}

```

### Worker 3 (DB 업로드)

```csharp
// DbUploaderWorker.cs
public class DbUploaderWorker
{
    public event Action OnUploadCompleted;
    public event Action<string> OnUploadFailed;

    public void Upload(ValidatedData data)
    {
        LogService.Instance.WriteLog("DB 업로드 시작");

        try
        {
            SaveToDatabase(data);
            LogService.Instance.WriteLog("DB 업로드 완료");
            OnUploadCompleted?.Invoke();
        }
        catch (Exception ex)
        {
            LogService.Instance.WriteLog($"DB 업로드 실패: {ex.Message}");
            OnUploadFailed?.Invoke(ex.Message);
        }
    }

    private void SaveToDatabase(ValidatedData data) { /* DB 저장 로직 */ }
}

```

### Orchestrator (흐름 제어)

```csharp
// MainOrchestrator.cs
public class MainOrchestrator
{
    private readonly FileParserWorker _parser;
    private readonly DataValidatorWorker _validator;
    private readonly DbUploaderWorker _uploader;

    public MainOrchestrator()
    {
        _parser = new FileParserWorker();
        _validator = new DataValidatorWorker();
        _uploader = new DbUploaderWorker();

        WireEvents();
    }

    private void WireEvents()
    {
        // Parser 완료 → Validator 시작
        _parser.OnParseCompleted += data => _validator.Validate(data);
        _parser.OnParseFailed += HandleError;

        // Validator 완료 → Uploader 시작
        _validator.OnValidationCompleted += data => _uploader.Upload(data);
        _validator.OnValidationFailed += HandleError;

        // Uploader 완료 → 프로세스 종료
        _uploader.OnUploadCompleted += () =>
            LogService.Instance.WriteLog("전체 프로세스 완료");
        _uploader.OnUploadFailed += HandleError;
    }

    public void Run(string filePath)
    {
        LogService.Instance.WriteLog("===== 프로세스 시작 =====");
        _parser.StartParsing(filePath);
    }

    private void HandleError(string error)
    {
        LogService.Instance.WriteLog($"[ERROR] 프로세스 중단: {error}");
    }
}

```

### Gateway (외부 시스템 접근 캡슐화)

위 예제에서 DB 업로드 Worker의 외부 시스템 접근 로직을 Gateway로 분리하는 예제이다. Worker는 비즈니스 로직에만 집중하고, Gateway가 외부 통신의 복잡성을 감춘다.

```csharp
// DatabaseGateway.cs — 외부 DB 접근을 캡슐화하는 Gateway
public class DatabaseGateway
{
    private readonly string _connectionString;

    public DatabaseAgent(string connectionString)
    {
        _connectionString = connectionString;
    }

    public void Save(ValidatedData data)
    {
        LogService.Instance.WriteLog("DB 연결 및 저장 시작");

        using var connection = new SqlConnection(_connectionString);
        connection.Open();

        using var command = connection.CreateCommand();
        command.CommandText = BuildInsertQuery(data);
        command.ExecuteNonQuery();

        LogService.Instance.WriteLog("DB 저장 완료");
    }

    private string BuildInsertQuery(ValidatedData data) { /* SQL 구성 */ return ""; }
}
```

```csharp
// DbUploaderWorker.cs — Gateway를 사용하여 외부 통신 로직을 분리한 Worker
public class DbUploaderWorker
{
    private readonly DatabaseGateway _dbGateway;

    public event Action OnUploadCompleted;
    public event Action<string> OnUploadFailed;

    public DbUploaderWorker(DatabaseGateway dbGateway)
    {
        _dbGateway = dbGateway;
    }

    public void Upload(ValidatedData data)
    {
        LogService.Instance.WriteLog("DB 업로드 시작");

        try
        {
            _dbGateway.Save(data);
            LogService.Instance.WriteLog("DB 업로드 완료");
            OnUploadCompleted?.Invoke();
        }
        catch (Exception ex)
        {
            LogService.Instance.WriteLog($"DB 업로드 실패: {ex.Message}");
            OnUploadFailed?.Invoke(ex.Message);
        }
    }
}
```

> **핵심 포인트:** Worker는 "데이터를 저장한다"는 비즈니스 흐름만 담당하고, Gateway가 DB 연결·쿼리 실행 등 인프라 세부사항을 캡슐화한다. DB가 교체되더라도 Worker는 변경할 필요가 없다.
