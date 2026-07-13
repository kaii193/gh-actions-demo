# React / Frontend — Code Review Rules (STRICT)

> Bar chất lượng cao nhất, nghi ngờ thì REJECT.
> Áp dụng cho mọi PR frontend, không giảm chuẩn theo kích thước PR.

---

## 0. Cách áp dụng

### Phân tầng
| Nhãn | Ý nghĩa | Verdict |
|---|---|---|
| **MUST** | Vi phạm chuẩn — phải sửa mới merge | Tính vào REJECT |
| **SHOULD** | Sai sót chất lượng — gom lại đủ nhiều thì chặn | Tính vào REJECT |
| **BLOCK** | Tuyệt đối không merge | Chặn ngay (§11) |

### Chính sách verdict (gắt)
- **REJECT** ⇔ có **≥ 1 MUST** HOẶC **≥ 3 SHOULD**.
- Chỉ 1–2 SHOULD → APPROVE kèm điều kiện sửa trong follow-up.
- **Nghi ngờ thì REJECT.** Reviewer phải chủ động tìm lỗi, không cho qua vì "chắc ổn".

### Quy tắc nền
- **Boy-scout rule:** file mà PR chạm vào phải **sạch hơn hoặc ít nhất bằng** trước đó.
  Được thêm code mới vào file bẩn → phải dọn phần liên quan, không được thêm nợ.
- **Không** block một PR chỉ vì file **khác** (PR không đụng) đang bẩn — đó là scope creep.
- Mỗi nhận xét **bắt buộc** trích `file:line` + nhãn mức độ + tác động. Không chứng minh được → không tồn tại.

---

## 1. Nguyên tắc cốt lõi
- **[MUST]** Code tự đọc được không cần comment giải thích logic. Cần comment mới hiểu "cái gì" → REJECT.
- **[MUST]** PR không được làm codebase tệ đi ở bất kỳ chiều nào (đọc, test, type, perf).
- **[MUST]** "Chạy được" không đủ — phải Clean + Maintainable + Testable.

---

## 2. Kiến trúc & Pattern
- **[MUST]** Nhất quán một hệ (Atomic / Feature-Sliced) đã chọn của repo. Lệch chuẩn → REJECT.
- **[MUST]** Logic tách ra **custom hook**; component không ôm logic nghiệp vụ (fetch, transform, side-effect).
- **[MUST]** Tách **Container / Presentational** (hoặc Compound Components): logic rời khỏi hiển thị.
- **[MUST]** Ưu tiên **composition** thay vì prop drilling; component có trách nhiệm đơn lẻ.

---

## 3. Clean Code

**Naming**
- **[MUST]** Cấm tên vô nghĩa: `data`, `temp`, `obj`, `result`, `flag`, `handle()`, `process()`.
- **[MUST]** Variable = noun rõ nghĩa; function = verb rõ output/side-effect; boolean = `is/has/should`.
  Tên mơ hồ dù 3–4 từ → REJECT.

**Function**
- **[MUST]** Tối đa **15 dòng**, làm **đúng 1 việc**, indent ≤ 3 level, ≤ 3 params (nhiều hơn → gom object).
- **[MUST]** Early return; cấm `else` sau return. Ưu tiên pure; side-effect phải tách rõ.

**Smells → REJECT**
- **[MUST]** Magic number/string, duplication ≥ 2 lần, dead code, commented-out code, import thừa, God component.

---

## 4. Component
- **[MUST]** Tối đa **150 dòng**. Vượt → tách trước khi merge.
- **[MUST]** Một component làm **một việc**. Ôm nhiều trách nhiệm → REJECT.
- **[MUST]** Cấm `any` ở props và mọi type PR đụng tới. Interface/type mạnh, rõ ràng.
- **[MUST]** `React.memo` / `useCallback` / `useMemo` dùng **đúng chỗ** cho component/handler được truyền xuống
  hoặc dùng làm dependency. Lạm dụng "memo cho có" cũng bị REJECT.

**Inline function trong render** (giữ đúng kỹ thuật — vẫn gắt)
- **[MUST]** Cấm inline function/object **khi** nó (a) truyền xuống component đã `memo`, hoặc
  (b) là dependency của `useEffect`/`useMemo`/`useCallback` → phá tối ưu / gây re-render dây chuyền.
- Lưu ý: inline function trên control thường (không memo, không dependency) **không** phá purity và
  **không** tự gây re-render — không bịa lỗi ở đây, nhưng cũng khuyến khích tách handler cho gọn.

---

## 5. State & Data flow
- **[MUST]** Cấm prop drilling **> 2 level** → dùng Context hoặc Zustand/Redux.
- **[MUST]** State đặt sát nơi dùng nhất; nâng state lên cao vô cớ → REJECT.
- **[MUST]** Server state (fetch/cache) tách khỏi UI state — dùng React Query/SWR khi repo có.
- Lưu ý: chỉ ép Context/store khi thực sự có drilling hoặc chia sẻ state — không nhét store vào cho một
  biến cục bộ (vừa là over-engineering, vừa là làm codebase tệ đi).

---

## 6. Styling
- **[MUST]** Nhất quán một hệ đã chọn (Tailwind + `clsx`/`cn`, hoặc Styled Components). Trộn hệ → REJECT.
- **[MUST]** Không inline style rải rác thay cho hệ styling đã chọn.

---

## 7. Resilience
- **[MUST]** Mọi async trong event handler (`navigator.share`, `clipboard.writeText`, `fetch`…)
  phải có `try/catch` (hoặc `.catch()`). Unhandled rejection → REJECT.
- **[MUST]** Trạng thái **loading / empty / error** rõ ràng cho mọi hành động async có thể fail.
  UI vỡ trắng hoặc "im lặng" khi lỗi → REJECT.
- **[MUST]** **Error Boundary** bọc cây component có thể throw **lúc render**; **Suspense** cho
  data fetching / lazy component.
- Lưu ý (không bịa lỗi): Error Boundary **không** bắt lỗi trong event handler / async, Suspense **không**
  dùng cho async trong handler. Đòi hai thứ này cho clipboard/share handler là sai → cấm nêu.

---

## 8. Accessibility
- **[MUST]** Semantic HTML thay `div` thuần khi có thẻ phù hợp; `aria-*`/`role` đúng ngữ cảnh.
- **[MUST]** Hỗ trợ keyboard đầy đủ (focusable, tab order, Enter/Escape) và focus management.

---

## 9. Cấu trúc file
- **[MUST]** Mỗi feature có folder riêng + barrel (`index.ts`).
- **[MUST]** Ưu tiên named export; cấm lạm dụng nhiều tầng default export.

---

## 10. Performance & Tests
- **[MUST]** Không tạo lại hàm/object nặng mỗi render gây re-render dây chuyền.
- **[MUST]** List: key ổn định; list dài → virtualization. Component/route nặng → lazy-load.
- **[MUST]** **Mọi** component/hook mới phải có test: happy path + edge case chính + nhánh lỗi/fallback.
  Test theo hành vi người dùng; tên rõ (`shouldShowErrorWhenSubmitFails`).
- **[MUST]** Coverage thấp / test yếu / thiếu edge case → REJECT.

---

## 11. BLOCK (tuyệt đối không merge)
- Hardcode credentials / API key / secret / token trong code FE.
- Log / hiển thị dữ liệu nhạy cảm (token, PII) ra console hoặc UI.
- Đưa dữ liệu người dùng vào URL/query string, hoặc gửi tới endpoint ngoài dự án.

---

## Checklist reviewer (bắt buộc chạy đủ)
1. Đã soi từng file trong diff, không cho qua vì "chắc ổn"?
2. Mỗi ý có `file:line` + nhãn + tác động chưa?
3. File PR chạm vào có sạch hơn/bằng trước đó không? (boy-scout)
4. Có bịa lỗi Error Boundary/Suspense cho handler, hay inline-function-purity không? (§4, §7)
5. Verdict: ≥1 MUST hoặc ≥3 SHOULD → REJECT.