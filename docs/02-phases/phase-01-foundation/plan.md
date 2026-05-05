# Phase 01: Foundation

**Goal:** Xây dựng nền tảng framework — docs, structure, core modules hoạt động được  
**Status:** In Progress  
**Started:** 2026-05-05

---

## Tasks

### Wave 1: Project Setup (nền tảng trước khi code) ← ĐANG LÀM
- [x] Phân tích ClaudeKit — extract patterns hữu ích
- [x] Phân tích bap-bean-book — hiểu ecosystem, conventions
- [x] Viết CLAUDE.md — session protocol, quy tắc dự án
- [x] Viết ADR-001 đến ADR-004 — ghi lại 4 quyết định kiến trúc chính
- [x] Viết architecture.md — thiết kế chi tiết hệ thống
- [x] Tạo phase tracking (file này)
- [ ] Viết session-state/latest.md — context persistence

### Wave 2: Refactor code hiện tại
- [ ] Xóa references đến bap-bean-book trong src/
- [ ] Làm Model Router generic (routing table từ config file)
- [ ] Tách providers thành configurable — không hardcode

### Wave 3: Session Mode Selection
- [ ] SessionStart hook — hiện mode selection prompt
- [ ] `/hmaf` slash command — switch mode bất kỳ lúc nào
- [ ] Lưu mode đã chọn vào session-state

### Wave 4: Team Agents Protocol
- [ ] Thiết kế debate protocol (round-based)
- [ ] Real-time stream output khi agents debate
- [ ] Pause + user intervention point sau mỗi round
- [ ] File-based communication: `docs/03-session-state/team-debates/`

### Wave 5: `npx hmaf init` Wizard
- [ ] CLI wizard với prompts
- [ ] Template generator (agents, settings, config, env.example)
- [ ] Stack-based agent template selection
- [ ] Test install vào bap-bean-book làm pilot

---

## Những gì đã học từ ClaudeKit

| Pattern | Áp dụng vào HMAF |
|---------|-----------------|
| Hard gates — chỉ hỏi khi thực sự cần | Human Gate module |
| File-based agent communication | Team Agents debate files |
| Scout-block hook — block reads vào node_modules | Đã copy vào .claude/hooks/ |
| Session state persistence | docs/03-session-state/latest.md |
| Shallow context injection (~200 tokens) | Session-init hook |
| Skill definitions với YAML frontmatter | `/hmaf` slash command |

## Những gì học từ bap-bean-book

| Pattern | Áp dụng vào HMAF |
|---------|-----------------|
| CLAUDE.md làm nguồn sự thật duy nhất | CLAUDE.md của HMAF |
| ADRs trước khi implement | 4 ADRs đã viết |
| Phase + wave structure | Phase 01 với waves |
| Session protocol (start/end handshake) | Session protocol trong CLAUDE.md |
| Compliance violation log | Sẽ thêm nếu cần |
| Agent role definitions trong .claude/agents/ | Scrum Master đã có |

---

## Decisions made this phase

- ADR-001: Generic framework, không bap-bean-book specific
- ADR-002: Hook + slash command cả hai
- ADR-003: Real-time visibility + user intervention
- ADR-004: `npx hmaf init` wizard

---

## Open questions (cần giải quyết ở wave tiếp theo)

1. Team Agents trong Claude Code dùng `Task` tool hay spawn process riêng?
2. Voice session chạy như background process hay integrated vào Claude Code hook?
3. `npx hmaf init` — publish lên npm hay dùng local script trước?
