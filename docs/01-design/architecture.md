# Kiến trúc HMAF — Thiết kế chi tiết

**Cập nhật lần cuối:** 2026-05-05  
**Status:** Draft — Phase 01

---

## Tổng quan

HMAF là một framework **opt-in, modular** để tăng cường Claude Code với 3 khả năng:
1. **Voice** — ra lệnh bằng giọng nói, nhận phản hồi bằng giọng
2. **Team Agents** — agents tranh luận peer-to-peer thay vì top-down
3. **Model Router** — tự động route task sang model rẻ nhất đủ năng lực

Framework được cài vào project bằng `npx hmaf init` và không làm thay đổi luồng làm việc hiện tại — chỉ thêm các option khi cần.

---

## Session Mode Selection

Là điểm vào trung tâm của toàn bộ framework.

### Hai cách trigger

**Hook (SessionStart)** — tự động hỏi khi mở Claude Code:
```
[HMAF] Chọn mode cho session này:
  [1] Standard    — Claude Code bình thường
  [2] + Voice     — Nói lệnh, nghe phản hồi
  [3] + Teams     — Agents thảo luận peer-to-peer
  [4] + Router    — Tự route sang model rẻ hơn
  [5] Full        — 2 + 3 + 4
  Enter           — bỏ qua, dùng Standard
```

**Slash command `/hmaf`** — gọi bất cứ lúc nào trong session để switch mode.

### State persistence
Mode đã chọn được lưu vào `docs/03-session-state/latest.md` để session sau biết.

---

## Module 1: Voice

### Luồng
```
Mic → [Soniox WebSocket] → partial transcripts (hiển thị real-time)
                         → final transcript → Claude Code as text input
                                              ↓
                                         Agent response
                                              ↓
                                    [TTS: macOS `say` / OpenAI TTS]
                                              ↓
                                         Phát loa
```

### Providers
- **STT:** Soniox (WebSocket streaming, hỗ trợ tiếng Việt)
- **TTS:** macOS `say` command (zero cost, offline) → OpenAI TTS (opt-in, chất lượng tốt hơn)

### Giới hạn
- TTS chỉ đọc summary (≤400 chars), không đọc code blocks
- Voice chạy như background process song song với Claude Code

---

## Module 2: Team Agents

### Khi nào dùng
Không phải mặc định. Dùng khi:
- Vấn đề liên quan nhiều stack/domain
- Cần phản biện trước khi implement
- Rủi ro cao — cần nhiều góc nhìn

### Sub-agent vs Team Agents

| | Sub-agent (top-down) | Team Agents (peer) |
|--|--|--|
| Luồng | Lead → Worker → Lead | Agent ↔ Agent ↔ Agent |
| Context | Shared (lead biết tất cả) | Isolated (mỗi agent có context riêng) |
| Phù hợp | Task rõ ràng, phân chia được | Vấn đề phức tạp, cần debate |
| Overhead | Thấp | Cao hơn |

### Luồng Team Agents
```
Bạn mô tả vấn đề
        ↓
Scrum Master phân tích → chọn agents phù hợp
        ↓
Spawn agents song song (mỗi agent context riêng)
        ↓
Round 1: Mỗi agent đề xuất hướng giải quyết
        ↓
Round 2: Agents đọc đề xuất nhau → phản biện / đồng ý
        ↓
[Bạn có thể can thiệp bất cứ lúc nào]
        ↓
Đạt consensus (hoặc timeout) → Scrum Master tổng hợp
        ↓
[Gate] Bạn approve → implement
```

### Visibility: Bạn thấy gì?

**Real-time stream** trong terminal:
```
[backend-dev] Đề xuất: dùng SQLite với WAL mode cho Phase 3
[architect]   Phản biện: nếu scale lên 10k users thì SQLite không đủ
[backend-dev] Đồng ý một phần: thêm connection pooling layer để migrate dễ hơn
[ios-dev]     iOS side: không ảnh hưởng, API contract giữ nguyên
─────────────────────────────────────────────────────
[HMAF] Bạn có muốn can thiệp không? (Enter để tiếp tục / gõ để thêm ý kiến)
```

### File-based communication (kế thừa ClaudeKit)
Agents giao tiếp qua file reports, không share context window:
```
docs/03-session-state/team-debates/
└── {date}-{topic}/
    ├── round-1-proposals.md
    ├── round-2-rebuttals.md
    └── consensus.md
```

---

## Module 3: Model Router

### Routing logic
```
Task text → [Keyword Classifier] → Category → [Routing Table] → Provider
```

### Categories & Providers mặc định

| Category | Provider | Lý do |
|----------|----------|-------|
| architecture, research, review, planning | Claude Sonnet | Cần tư duy cao |
| ios-code | DeepSeek V3 | Code-specific, rẻ 11x |
| backend-code, web-code, devops | Qwen Plus | Code-specific, rẻ 7x |
| simple-fix | DeepSeek V3 | Không cần mô hình mạnh |
| unknown | Claude Sonnet | Safe default |

### Per-project customization
Khi `npx hmaf init`, người dùng có thể override routing table:
```json
// .hmaf/routing.json
{
  "ios-code": "claude-sonnet",     // override nếu project iOS phức tạp
  "backend-code": "deepseek-v3",   // override theo preference
  "custom-category": "qwen-plus"   // thêm category riêng
}
```

---

## Installation Flow (`npx hmaf init`)

```
npx hmaf init
    ↓
Wizard hỏi:
  1. Tên project?
  2. Stack chính? (Node/Python/iOS/Flutter/...)
  3. Module nào muốn dùng? (Voice/Teams/Router)
  4. API keys có sẵn? (để skip setup không cần thiết)
    ↓
Tạo files:
  .claude/agents/*.md     ← dựa trên stack
  .claude/settings.json   ← hooks
  .hmaf/config.json       ← module config
  .env.example            ← chỉ các keys cần thiết
  CLAUDE.md               ← template (nếu chưa có)
    ↓
Hướng dẫn tiếp theo
```

---

## Các quyết định thiết kế quan trọng

Xem chi tiết trong ADRs:
- `ADR-001` — Scope: Generic framework, không phải bap-bean-book specific
- `ADR-002` — Session modes: Hook + slash command cả hai
- `ADR-003` — Team Agents visibility: Real-time + can thiệp được
- `ADR-004` — Installation: `npx hmaf init` wizard
