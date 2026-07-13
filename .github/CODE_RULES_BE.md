# NestJS + Prisma — Code Review Rules (STRICT)

> Bar chất lượng cao nhất, nghi ngờ thì REJECT.
> Áp dụng cho mọi PR backend, không giảm chuẩn theo kích thước PR.

---

## 0. Cách áp dụng

### Phân tầng
| Nhãn | Ý nghĩa | Verdict |
|---|---|---|
| **MUST** | Vi phạm chuẩn — phải sửa mới merge | Tính vào REJECT |
| **SHOULD** | Sai sót chất lượng — gom đủ nhiều thì chặn | Tính vào REJECT |
| **BLOCK** | Rủi ro bảo mật/dữ liệu — tuyệt đối không merge | Chặn ngay (§14) |

### Chính sách verdict (gắt)
- **REJECT** ⇔ có **≥ 1 MUST** HOẶC **≥ 3 SHOULD**.
- Chỉ 1–2 SHOULD → APPROVE kèm điều kiện sửa follow-up.
- **Nghi ngờ thì REJECT.** Reviewer chủ động tìm lỗi, không cho qua vì "chắc ổn".

### Quy tắc nền
- **Boy-scout rule:** file/layer mà PR chạm vào phải **sạch hơn hoặc bằng** trước đó, không thêm nợ.
- **Không** block PR vì file **khác** (PR không đụng) đang bẩn — đó là scope creep.
- Mỗi nhận xét **bắt buộc** `file:line` + nhãn mức độ + tác động. Không chứng minh được → không nêu.

---

## 1. Nguyên tắc cốt lõi
- **[MUST]** Code tự đọc được; cần comment mới hiểu logic → REJECT.
- **[MUST]** PR không được làm codebase tệ đi (kiến trúc, type, test, perf).
- **[MUST]** "Chạy được" không đủ — Clean + Maintainable + Testable.

---

## 2. Kiến trúc — Clean + Layered
```
Domain → Application → Infrastructure → Presentation
```
- **[MUST]** Phụ thuộc chỉ đi **vào trong**. Domain thuần TS, không biết NestJS/Prisma/HTTP.
- **[MUST]** Các layer nói chuyện qua **interface / DTO**, cấm nhảy cóc.
- **[MUST]** Cấm `any` — luôn interface/type mạnh.

---

## 3. Clean Code

**Naming**
- **[MUST]** Cấm tên vô nghĩa: `data`, `temp`, `obj`, `result`, `flag`, `handle()`, `process()`.
- **[MUST]** Variable = noun; function = verb rõ output/side-effect; boolean = `is/has/should`.
  Tên mơ hồ dù 3–4 từ → REJECT.

**Function**
- **[MUST]** Tối đa **15 dòng**, đúng 1 việc, indent ≤ 3 level, ≤ 3 params (nhiều hơn → gom object).
- **[MUST]** Early return; cấm `else` sau return. Side-effect phải tách rõ.

**Smells → REJECT**
- **[MUST]** Magic number/string, duplication ≥ 2 lần, dead code, commented-out code, import thừa, God class/function.

---

## 4. Presentation — Controller
- **[MUST]** Không business logic; chỉ orchestrate UseCase (request → use case → response).
- **[MUST]** Cấm query Prisma/repository trực tiếp trong controller.
- **[MUST]** Input/output qua DTO + `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`).
- **[MUST]** Không trả Entity/Prisma model → chỉ Response DTO qua Mapper.
- **[MUST]** HTTP concern (status/header/cookie) chỉ ở đây, không rò xuống dưới.

---

## 5. Application — UseCase
- **[MUST]** Mỗi UseCase đúng 1 nghiệp vụ; business logic sống ở đây.
- **[MUST]** Phụ thuộc abstraction (repository interface/port), cấm import `@prisma/client`.

---

## 6. Domain
- **[MUST]** Chứa Entity / Value Object / rule thuần, không phụ thuộc framework.
- **[MUST]** Repository interface khai báo tại domain.
- **[MUST]** Custom domain exception có context rõ ràng.

---

## 7. Infrastructure — Repository
- **[MUST]** Implementation `implements` interface từ domain; **chỉ** tầng này chạm Prisma.
- **[MUST]** Repository chỉ lo persistence, không business logic.
- **[MUST]** Map Prisma model → Domain entity ngay trong repository (không cho model đi lên).

---

## 8. Prisma

**Ranh giới**
- **[MUST]** `PrismaService` singleton, inject qua DI — cấm `new PrismaClient()` rải rác (cạn connection pool).
- **[MUST]** Type `@prisma/client` không leak lên Application/Domain/Presentation; model không trả ra API.

**Query**
- **[MUST]** `select`/`include` đúng field cần — không lấy dư, đặc biệt field nhạy cảm (password hash, token).
- **[MUST]** Cấm query trong loop → dùng `include` / `in` / batch để tránh N+1.
- **[MUST]** Pagination bắt buộc có giới hạn (`take` + cursor/`skip`); không load cả bảng.
- **[MUST]** Nhiều lệnh **độc lập** phải atomic cùng nhau → `$transaction`.
  Lưu ý (không bắt lỗi sai): nested write trong **một** lệnh Prisma và `createMany` **đã atomic sẵn** — không cần bọc `$transaction` thừa.
- **[MUST]** Enum dùng Prisma enum, không magic string.

**Raw query**
- **[BLOCK]** `$queryRawUnsafe`/`$executeRawUnsafe` với chuỗi nối tay hoặc nội suy biến → SQL injection.
- **[MUST]** Ưu tiên query API; nếu buộc dùng raw thì dùng `$queryRaw` **dạng tagged-template** (tự parameterized).
  Lưu ý: `$queryRaw` tagged-template **đã an toàn** — không bắt lỗi nhầm ở đây; chỉ chặn khi có `Unsafe`/nối chuỗi.

**Schema & migration**
- **[MUST]** Đổi schema qua `prisma migrate` + review file migration; cấm `db push` ở staging/prod.
- **[MUST]** `schema.prisma` naming nhất quán, `@map`/`@@map` theo convention DB, index cho field query nhiều.

**Error & lifecycle**
- **[MUST]** Map Prisma error → custom exception (`P2002`→conflict, `P2025`→not found); không leak `PrismaClientKnownRequestError`.
- **[MUST]** Đóng kết nối đúng: `enableShutdownHooks` / `onModuleDestroy`.

---

## 9. DTO / Validation / Mapping
- **[MUST]** Request DTO validate bằng `class-validator`.
- **[MUST]** Response DTO chọn đúng field public (`@Expose`/`@Exclude` hoặc DTO riêng).
- **[MUST]** Mapper tách riêng cho `Prisma model ↔ Domain ↔ Response DTO`, không map inline lung tung.

---

## 10. Exception Handling
- **[MUST]** Custom Exception + Global Exception Filter chuẩn hoá error response.
- **[MUST]** Không swallow exception; không dùng exception để control flow.
- **[MUST]** Không trả stack trace / thông tin nội bộ ra client.

---

## 11. Guard / Security
- **[MUST]** Guard + Decorator rõ vai trò (`@Roles`, ownership, `@CurrentUser`); authz ở Guard/Policy, không rải trong service.
- **[MUST]** Validate & sanitize mọi input; không tin dữ liệu client.

---

## 12. Module / Config
- **[MUST]** `*.module.ts` sạch — chỉ khai báo thứ thực dùng, không import thừa; tránh circular dependency.
- **[MUST]** Config qua `@nestjs/config` + validation (Joi/Zod), fail fast khi thiếu env.

---

## 13. Logging & Tests
- **[MUST]** Structured logger (Pino/Winston), cấm `console.log`.
- **[MUST]** Log có context (requestId, userId); không log sensitive data (mật khẩu, token, PII).
- **[MUST]** Mọi UseCase/service/repository mới có unit test: happy path + edge case + nhánh lỗi; code phải dễ mock.
  Tên test theo behavior (`shouldThrowWhenUserNotFound`).
- **[MUST]** Coverage thấp / test yếu / thiếu edge case → REJECT.

---

## 14. BLOCK (tuyệt đối không merge)
- Hardcoded credentials / API key / DB connection string / secret trong code.
- `$queryRawUnsafe`/`$executeRawUnsafe` nối chuỗi hoặc nội suy biến (SQL injection).
- Log / trả dữ liệu nhạy cảm (mật khẩu, token, PII) ra log hoặc client.

---

## Checklist reviewer (bắt buộc chạy đủ)
1. Đã soi từng file trong diff, không cho qua vì "chắc ổn"?
2. Mỗi ý có `file:line` + nhãn + tác động chưa?
3. Layer nào PR chạm vào có sạch hơn/bằng trước đó không? (boy-scout)
4. Dependency có đi đúng chiều vào trong không? Prisma type có leak lên trên không?
5. Có N+1 / thiếu pagination / raw query nguy hiểm không?
6. Có bắt lỗi nhầm `$queryRaw` an toàn hay `$transaction` thừa trên nested write không? (§8)
7. Verdict: ≥1 MUST hoặc ≥3 SHOULD → REJECT.