# Zig 이벤트 작성 지침

* **이벤트 정의:** 함수 포인터(`fn`)와 객체 포인터(`ctx`) 두 개의 필드로 정의한다.
* **이벤트 연결:** 처리할 함수와 그 함수가 실행될 객체의 주소(`&`)를 함께 할당한다.
* **이벤트 호출:** `if` 문으로 핸들러 존재를 확인하고, 객체(`ctx`)를 첫 번째 인자로 넘겨 호출한다.

```c
const std = @import("std");

// [이벤트 발생 주체]
const Patternizer = struct {
    // 1. 이벤트를 정의 (함수와 객체 쌍)
    // 파이썬: self.on_template = None
    on_template: ?*const fn (ctx: *anyopaque, log: []const u8) void = null,
    on_template_ctx: ?*anyopaque = null,

    pub fn extract(self: *Patternizer, log: []const u8) void {
        // 3. 이벤트 호출 (내부적으로 핸들러 호출)
        // 파이썬: if self.on_template: self.on_template(log)
        if (self.on_template) |callback| {
            // 저장해둔 객체(ctx)를 첫 번째 인자로 전달해야 함
            callback(self.on_template_ctx.?, log);
        }
    }
};

// [이벤트 처리 주체]
const Repository = struct {
    // 파이썬: def check_and_set(self, log): ...
    pub fn check_and_set(ctx: *anyopaque, log: []const u8) void {
        // ctx는 void 포인터이므로 원래 타입으로 캐스팅하여 'self' 처럼 사용
        const self: *Repository = @ptrCast(@alignCast(ctx));
        std.debug.print("Repository 저장: {s} (obj: {*})\n", .{ log, self });
    }
};

pub fn main() void {
    var patternizer = Patternizer{};
    var repository = Repository{};

    // 2. 이벤트 처리기 할당
    // 파이썬: patternizer.on_template = repository.check_and_set
    patternizer.on_template = Repository.check_and_set; // 함수
    patternizer.on_template_ctx = &repository;          // 객체 (self 역할)

    // 실행
    patternizer.extract("Error Log 1");
}
```
