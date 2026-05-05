# /hmaf — HMAF Session Mode Selector

Khi người dùng gọi `/hmaf`, thực hiện các bước sau:

## Bước 1: Đọc config và state hiện tại

Đọc `.hmaf/config.json` để biết modules nào được bật.  
Đọc `docs/03-session-state/latest.md` để biết mode session trước đã chọn (nếu có).

## Bước 2: Hiển thị menu

Hiển thị đúng format này, đánh dấu module nào đang ACTIVE (✓) và đang OFF (○):

```
╔══════════════════════════════════════╗
║         HMAF — Session Mode          ║
╠══════════════════════════════════════╣
║  [1] Standard   — Claude Code thuần  ║
║  [2] + Voice    — Nói lệnh / TTS     ║
║  [3] + Teams    — Agents peer debate ║
║  [4] + Router   — Cost optimization  ║
║  [5] Full       — Tất cả (2+3+4)     ║
╚══════════════════════════════════════╝
Module hiện tại: [liệt kê module đang bật]
Chọn mode (1-5) hoặc Enter để giữ nguyên:
```

## Bước 3: Xử lý lựa chọn

| Lựa chọn | Action |
|----------|--------|
| 1 / Enter | Tắt tất cả modules, chạy Standard |
| 2 | Bật Voice. Hướng dẫn: `npm run voice` trong terminal mới |
| 3 | Bật Teams. Thông báo sẵn sàng khi có task phức tạp |
| 4 | Bật Router. Xác nhận API keys có sẵn không |
| 5 | Bật tất cả. Chạy hướng dẫn cho từng module |

## Bước 4: Xử lý từng module được bật

### Nếu Voice được chọn:
Kiểm tra `SONIOX_API_KEY` trong môi trường.  
- Có key → hướng dẫn chạy `npm run voice` trong terminal song song
- Không có key → thông báo cần thiết lập và chỉ đường đến `.env.example`

### Nếu Teams được chọn:
Hỏi: "Bạn muốn dùng Teams mode cho task cụ thể nào?"  
Nếu người dùng mô tả task → đề xuất agents phù hợp từ `.claude/agents/`  
Không ép buộc — Teams chỉ được kích hoạt khi có task cụ thể

### Nếu Router được chọn:
Kiểm tra các env keys: `DEEPSEEK_API_KEY`, `QWEN_API_KEY`  
- Thiếu key nào → thông báo provider đó sẽ fallback về Claude Sonnet  
- Đủ key → xác nhận routing table từ `.hmaf/config.json`

## Bước 5: Lưu mode đã chọn

Cập nhật section "Active mode" trong `docs/03-session-state/latest.md`:

```markdown
## Active Mode — [date]
Modules: [danh sách module bật]
```

## Bước 6: Tóm tắt

Sau khi xử lý xong, hiển thị:
```
[HMAF] Mode đã chọn: [tên mode]
[HMAF] Modules active: [list]
[HMAF] Sẵn sàng làm việc.
```

---

## Ghi chú cho agent

- KHÔNG tự ý thay đổi `.hmaf/config.json` — đó là config dài hạn, mode selection là session-level
- Nếu người dùng gọi `/hmaf teams` kèm mô tả task → bỏ qua menu, đi thẳng vào Teams mode
- Nếu gọi `/hmaf status` → chỉ hiển thị mode hiện tại, không hỏi gì
