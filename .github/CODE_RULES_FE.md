# React / Frontend — Code Review Rules

> File defined độc lập. Mọi PR frontend review theo file này.
> `Reject` = phải sửa mới merge. `Block` = tuyệt đối không merge.

---

## 0. Nguyên tắc cốt lõi (không thương lượng)
- Code tự đọc được như một câu chuyện — phải đọc comment mới hiểu → **Reject**.
- Mọi thay đổi phải làm codebase **tốt hơn**, không được làm tệ đi.
- "Chạy được" chưa đủ → phải **Clean + Maintainable + Testable**.

---

## 1. Kiến trúc & Design Pattern (bắt buộc)
- **Atomic Design** hoặc **Feature-Sliced Design** — chọn một, nhất quán toàn repo.
- **Container / Presentational** (hoặc **Compound Components**): tách phần logic khỏi phần hiển thị.
- **Custom Hooks** cho toàn bộ logic — component không ôm logic.
- **Component Composition** thay vì prop drilling sâu.

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

**Smells → Reject:** magic number/string, duplication > 2 lần, dead code, commented code, import thừa, God component.

---

## 3. Component
- Mỗi component tối đa **150–200 dòng** — vượt thì tách.
- Component chỉ làm **một việc**; component lớn ôm nhiều việc → **Reject**.
- **Props interface rõ ràng, cấm `any`** — luôn interface/type mạnh.
- Pure khi có thể: `React.memo` / `useCallback` / `useMemo` dùng **đúng chỗ** (không lạm dụng, không "memo cho có").
- **Cấm inline function/object trong render** khi nó phá memo hoặc tạo lại mỗi render vô ích.

---

## 4. Hooks & Logic
- Logic tách hết ra **custom hooks** — không nhét `useState` + `useEffect` lộn xộn trong component.
- `useEffect` phải có **dependency ổn định & đầy đủ**; dependency không ổn định → **Reject**.
- Không dùng `useEffect` cho thứ có thể tính trong render hoặc xử lý bằng event handler.
- Mỗi hook làm đúng một nhiệm vụ, đặt tên `useXxx` rõ intent.

---

## 5. State & Data flow
- **Không prop drilling > 2–3 level** → dùng **Context** hoặc **Zustand/Redux**.
- State đặt gần nơi dùng nhất; không nâng state lên cao vô cớ.
- Server state (fetch/cache) tách khỏi UI state (ưu tiên React Query/SWR nếu có).

---

## 6. Styling (nhất quán)
- **Tailwind + `clsx`/`cn`** hoặc **Styled Components** — chọn một, không trộn.
- Không inline style rải rác thay cho hệ thống styling đã chọn.

---

## 7. Resilience
- **Error Boundary** bọc các nhánh có thể lỗi; **Suspense** cho async/lazy.
- Có trạng thái loading / empty / error rõ ràng, không để UI vỡ trắng.

---

## 8. Accessibility
- `aria-*`, `role` đúng ngữ cảnh; semantic HTML thay cho `div` thuần khi có thẻ phù hợp.
- Hỗ trợ **keyboard** (focusable, tab order, Enter/Escape) và focus management.

---

## 9. Cấu trúc file
- Mỗi feature có **folder riêng + barrel file** (`index.ts`).
- **Không lạm dụng** nhiều `index.js` export mặc định — ưu tiên named export.

---

## 10. Performance
- Không tạo lại hàm/object nặng mỗi render (dẫn tới re-render dây chuyền).
- List lớn → key ổn định, cân nhắc virtualization.
- Lazy-load route/component nặng; tránh bundle phình vô cớ.

---

## 11. Tests
- Component/hook mới có test (happy path + edge case chính); ưu tiên test theo hành vi người dùng.
- Tên test rõ: `shouldShowErrorWhenSubmitFails`.
- Coverage thấp / test yếu → Reject.

---

## Reject ngay
- Business logic nằm trong component.
- Inline function/object trong render (phá memo / tạo lại vô ích).
- Component lớn làm nhiều việc; component > 150–200 dòng.
- `useEffect` với dependency không ổn định / thiếu.
- Props dùng `any`; type yếu.
- Prop drilling > 2–3 level thay vì Context/store.
- `useState` + `useEffect` lộn xộn, logic không tách ra hook.
- Styling trộn nhiều hệ thống; inline style bừa bãi.
- Thiếu Error Boundary/Suspense ở nhánh async.
- Thiếu a11y (không keyboard, không `aria`/`role`).
- Lạm dụng `index.js` export mặc định; feature không có barrel.
- Function > 20 dòng, làm nhiều việc; dead/commented code; duplication; magic number/string.
- Thiếu test / test yếu.

## Block ngay (không merge)
- Hardcode credentials / API key / secret / token trong code FE.
- Log / hiển thị dữ liệu nhạy cảm (token, PII) ra console hoặc UI.