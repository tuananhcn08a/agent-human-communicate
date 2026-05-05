# /session-end — Kết thúc session và cập nhật state

Khi người dùng gọi `/session-end`, thực hiện các bước sau mà **không hỏi thêm** — tự thu thập từ context của session hiện tại.

---

## Bước 1: Thu thập thông tin từ session

Đọc các file sau để tổng hợp trạng thái:

1. `docs/03-session-state/latest.md` — baseline đầu session
2. `docs/02-phases/active-phase.md` — phase đang làm
3. Phase plan file được trỏ tới trong active-phase.md — task status

Nhìn lại toàn bộ conversation của session hiện tại để xác định:
- Những gì đã **hoàn thành** (có output cụ thể, code đã viết, file đã tạo)
- Những gì đang **in-progress** (bắt đầu nhưng chưa xong, kèm file:line nếu có)
- Những gì **bị blocked** (lý do cụ thể)
- **Quyết định quan trọng** đã được đưa ra trong session
- **Task ưu tiên** cho session tiếp theo

---

## Bước 2: Viết session entry mới

Prepend vào đầu file `docs/03-session-state/latest.md` (giữ lại nội dung cũ bên dưới):

```markdown
# Session State — Latest

**Session date:** [YYYY-MM-DD] (session N)
**Người làm:** [tên user] + Claude Sonnet 4.6

---

## Session [YYYY-MM-DD]

**Completed:**
- [task hoặc việc đã xong — cụ thể, có thể verify được]

**In-progress:**
- [việc đang làm — kèm file:line nếu biết]

**Blocked:**
- [tên task] — [lý do blocked]

**Key decisions:**
- [quyết định quan trọng nếu có — không phải mọi thứ, chỉ các quyết định ảnh hưởng direction]

**Next session priority:**
[1 task cụ thể nhất cần làm đầu tiên — không phải list, chỉ 1 thứ]

---

[nội dung session cũ giữ nguyên bên dưới]
```

---

## Bước 3: Hiển thị tóm tắt

Sau khi viết file xong, in ra:

```
[session-end] ✓ State đã lưu vào docs/03-session-state/latest.md

Completed : [số lượng]
In-progress: [số lượng]  
Blocked   : [số lượng]
Next      : [1 dòng mô tả task tiếp theo]

Session kết thúc. Hẹn gặp lại!
```

---

## Ghi chú cho agent

- **Không hỏi** — tự tổng hợp từ conversation, chỉ ghi những gì có evidence thật
- Nếu không có gì hoàn thành → ghi "Không có task nào hoàn thành trong session này"
- Nếu không rõ next priority → ghi lại open question cần user quyết định
- File `latest.md` là prepend (mới nhất ở trên), KHÔNG overwrite toàn bộ
- Giữ entry ngắn gọn — mỗi mục tối đa 1 dòng, tổng entry không quá 40 dòng
