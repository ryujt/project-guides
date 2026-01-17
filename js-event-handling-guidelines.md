# Node.js 이벤트 작성 지침 (콜백 방식)

* 이벤트는 `this.onEvent = null;`과 같이 클래스의 속성(Property)으로 정의한다.
* `EventEmitter`를 상속받지 않고, 핸들러 함수를 해당 속성에 직접 할당하여 구독한다.
* 이벤트 발생 시 `if (this.onEvent)` 체크 또는 옵셔널 체이닝(`?.`)을 통해 핸들러를 호출한다.

```javascript
class LogProcessor {
   constructor() {
       // 이벤트 속성 초기화
       this.onProcessed = null;
       this.onError = null;
   }

   process(logItem) {
       try {
           if (!logItem) {
               throw new Error("Invalid log item");
           }

           // 로직 처리 시뮬레이션
           const result = logItem.trim().toUpperCase();

           // 성공 이벤트 발생
           if (this.onProcessed) {
               this.onProcessed(result);
           }
       } catch (err) {
           // 에러 이벤트 발생
           // Modern JS: 옵셔널 체이닝 사용 가능 (this.onError?.(err))
           if (this.onError) {
               this.onError(err.message);
           }
       }
   }
}

class App {
   constructor() {
       this.processor = new LogProcessor();
      
       // 이벤트 핸들러 연결 (Wiring)
       this.processor.onProcessed = this.handleLogSuccess;
       this.processor.onError = this.handleLogError;
   }

   run() {
       console.log("앱 실행 중...");
       this.processor.process("  system start  ");
       this.processor.process(null); // 에러 테스트
   }

   // 핸들러 정의
   handleLogSuccess(processedLog) {
       console.log(`[처리됨]: ${processedLog}`);
   }

   handleLogError(errorMessage) {
       console.error(`[오류]: ${errorMessage}`);
   }
}

// 메인 실행
const app = new App();
app.run();
```
