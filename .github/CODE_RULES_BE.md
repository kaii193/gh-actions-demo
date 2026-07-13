# NestJS + Prisma — Code Review Rules

> File defined độc lập. Mọi PR NestJS + Prisma review theo file này.
> `Reject` = phải sửa mới merge. `Block` = tuyệt đối không merge.

---

## 0. Nguyên tắc cốt lõi (không thương lượng)
- Code tự đọc được như một câu chuyện — phải đọc comment mới hiểu → **Reject**.
- Mọi thay đổi phải làm codebase **tốt hơn**, không được làm tệ đi.
- "Chạy được" chưa đủ → phải **Clean + Maintainable + Testable**.

---

## 1. Kiến trúc — Clean + Layered
```
Domain → Application → Infrastructure → Presentation
```
- Phụ thuộc chỉ đi **vào trong**; Domain **không** biết đến NestJS/Prisma/HTTP (thuần TS).
- Các layer nói chuyện qua **interface / DTO**, không nhảy cóc.
- Không dùng `any` — luôn **interface/type mạnh**.

---

## 2. Clean Code baseline
**Naming**
- Cấm tên vô nghĩa: `data`, `temp`, `obj`, `result`, `flag`, `handle()`, `process()`.
- Variable = noun rõ nghĩa; function = verb rõ output/side-effect; boolean = `is/has/should…`.
- Tên mơ hồ dù đã 3–4 từ → Reject.

**Function**
- Tối đa **15–20 dòng**, làm **đúng 1 việc**, indent ≤ 3–4 level.
- ≤ 3–4 params (nhiều hơn → gom object). Ưu tiên pure; side-effect phải rõ.
- Dùng **early return**, không `else` sau return.

**Smells → Reject:** magic number/string, duplication > 2 lần, dead code, commented code, import thừa, God class/function.

---

## 3. Presentation — Controller
- **Không** business logic; chỉ **orchestrate UseCase** (request → use case → response).
- **Cấm** query Prisma/repository trực tiếp trong controller.
- Input/output qua **DTO + `ValidationPipe`** (`whitelist` + `forbidNonWhitelisted`).
- **Không** trả Entity / Prisma model → chỉ **Response DTO** (qua Mapper).
- HTTP concern (status/header/cookie) chỉ ở đây, không rò xuống dưới.

---

## 4. Application — UseCase
- Mỗi UseCase làm **đúng 1 nghiệp vụ**; business logic sống ở đây.
- Phụ thuộc **abstraction** (repository interface/port), **không** import `@prisma/client`.

---

## 5. Domain
- Chứa Entity / Value Object / rule thuần, không phụ thuộc framework.
- **Repository interface** khai báo tại domain.
- **Custom domain exception** có context rõ ràng.

---

## 6. Infrastructure — Repository
- Implementation `implements` interface từ domain; **chỉ** tầng này chạm Prisma.
- Repository chỉ lo **persistence**, **không** business logic.
- Map **Prisma model → Domain entity** ngay trong repository (không cho model đi lên).

---

## 7. Prisma
**Ranh giới**
- `PrismaService` **singleton**, **inject qua DI** — cấm `new PrismaClient()` rải rác (cạn connection pool).
- Type từ `@prisma/client` **không leak** lên Application/Domain/Presentation; model **không** trả ra API.

**Query**
- `select`/`include` đúng field cần — không lấy dư, đặc biệt field nhạy cảm (password hash, token).
- **Cấm query trong loop** → dùng `include` / `in` / batch để tránh **N+1**.
- Pagination bắt buộc có giới hạn (`take` + cursor/`skip`), **không** load cả bảng.
- Multi-write cần atomic → **`$transaction`**.
- Enum dùng **Prisma enum**, không magic string.

**Raw query**
- Tránh `$queryRaw`/`$executeRaw`; nếu dùng phải **parameterized** — **cấm** nối chuỗi thủ công (SQL injection → Block).

**Schema & migration**
- Đổi schema qua **`prisma migrate`** + review file migration; **cấm `db push`** ở staging/prod.
- `schema.prisma` naming nhất quán, `@map`/`@@map` theo convention DB, **index** cho field query nhiều.

**Error & lifecycle**
- Map Prisma error → custom exception (`P2002`→conflict, `P2025`→not found); **không** leak `PrismaClientKnownRequestError`.
- Đóng kết nối đúng: `enableShutdownHooks` / `onModuleDestroy`.

---

## 8. DTO / Validation / Mapping
- Request DTO validate bằng `class-validator`.
- Response DTO chọn đúng field public (`@Expose`/`@Exclude` hoặc DTO riêng).
- **Mapper** tách riêng cho `Prisma model ↔ Domain ↔ Response DTO`, không map inline lung tung.

---

## 9. Exception Handling
- **Custom Exception + Global Exception Filter** chuẩn hoá error response.
- Không swallow exception, không dùng exception để control flow.
- Không trả stack trace / thông tin nội bộ ra client.

---

## 10. Guard / Security
- **Guard + Decorator** rõ vai trò (`@Roles`, ownership, `@CurrentUser`); authz nằm ở Guard/Policy, không rải trong service.
- Validate & sanitize mọi input; không tin dữ liệu client.

---

## 11. Module / Config
- `*.module.ts` sạch — chỉ khai báo thứ thực dùng, **không import thừa**; tránh circular dependency.
- Config qua **`@nestjs/config`** + **validation** (Joi/Zod), fail fast khi thiếu env.

---

## 12. Logging
- **Structured logger** (Pino/Winston), không `console.log`.
- Log có context (requestId, userId); **không** log sensitive data (mật khẩu, token, PII).

---

## 13. Tests
- Code mới có **unit test** (happy path + edge case chính); code phải **dễ mock**.
- Tên test theo behavior: `shouldThrowWhenUserNotFound`.
- Coverage thấp / test yếu → Reject.

---

## Reject ngay
- Business logic trong Controller hoặc Repository.
- Query Prisma/repository trực tiếp trong Controller.
- `new Class()` / `new PrismaClient()` thay vì inject qua DI.
- Magic string/number; dùng `any`.
- Entity/Prisma model leak ra API; Prisma type leak lên tầng trên.
- Input/output không qua DTO + ValidationPipe.
- N+1, query trong loop, thiếu pagination.
- Repository interface đặt sai layer (không ở domain).
- `module.ts` import thừa; thiếu Global Exception Filter / leak Prisma error.
- `console.log` thay structured logger.
- `db push` thay migration / đổi schema không migration.
- Function > 20 dòng, làm nhiều việc; dead/commented code; duplication.
- Thiếu test / test yếu.

## Block ngay (không merge)
- Hardcoded credentials / API key / DB connection string / secret.
- Raw query nối chuỗi thủ công (SQL injection).
- Log dữ liệu nhạy cảm (mật khẩu, token, PII).