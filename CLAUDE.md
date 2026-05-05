# HMAF — Hybrid Multi-Agent Framework
## Agent & Developer Guide

> **Đọc file này trước khi làm bất cứ điều gì.** Đây là nguồn sự thật duy nhất cho dự án này.

---

## 1. Dự án này là gì?

HMAF là một framework cài được vào **bất kỳ project nào** để giải quyết 3 vấn đề:

| Vấn đề | Giải pháp |
|--------|-----------|
| Phải gõ nhiều khi ra lệnh cho agent | **Module Voice** — Soniox STT + TTS |
| Sub-agent top-down không đủ khi cần phối hợp phức tạp | **Module Team Agents** — peer-to-peer debate |
| Chi phí API cao khi dùng Claude cho mọi thứ | **Module Router** — route sang model rẻ hơn |

**Nguyên tắc thiết kế:**
- Generic — không gắn với project cụ thể nào
- Modular — dùng 1, 2, hoặc cả 3 module tùy nhu cầu
- Opt-in — không phải luôn chạy, là option chọn khi cần
- Self-hosting — HMAF dùng chính các pattern của mình để build mình

---

## 2. Kiến trúc tổng thể

Xem chi tiết: `docs/01-design/architecture.md`

```
Session Start
    ↓
[Mode Selection] — hook + /hmaf command
    ↓
[M1] Voice?    → Soniox stream → transcript
[M2] Teams?    → Spawn peer agents → debate → consensus
[M3] Router?   → Classify task → route to cheapest model
    ↓
Project codebase
```

---

## 3. Cấu trúc thư mục

```
agent-human-communicate/
├── CLAUDE.md                    ← File này — đọc đầu tiên
├── HMAF.md                      ← Blueprint cho người dùng cuối
├── docs/
│   ├── 01-design/
│   │   ├── architecture.md      ← Thiết kế chi tiết hệ thống
│   │   └── adrs/                ← Architectural Decision Records
│   │       ├── ADR-001-scope.md
│   │       ├── ADR-002-session-modes.md
│   │       ├── ADR-003-team-agents-visibility.md
│   │       └── ADR-004-installation.md
│   ├── 02-phases/
│   │   ├── active-phase.md      ← Pointer đến phase đang làm
│   │   └── phase-01-foundation/ ← Phase hiện tại
│   └── 03-session-state/
│       └── latest.md            ← State cuối session — CẬP NHẬT MỖI KHI KẾT THÚC
├── src/
│   ├── router/                  ← Module 3: Model Router
│   ├── voice/                   ← Module 1: Voice
│   ├── gate/                    ← Human-in-the-loop gate
│   └── types/                   ← Type declarations
├── .claude/
│   ├── agents/                  ← Agent role definitions
│   ├── hooks/                   ← Automation hooks
│   └── settings.json
├── package.json
└── tsconfig.json
```

---

## 4. Phases & Task Tracking

Phase hiện tại: xem `docs/02-phases/active-phase.md`

**Quy tắc:**
- Mọi task đều có trong phase file trước khi làm
- Không bắt đầu task mới khi không có trong phase plan
- Mỗi ADR phải được viết TRƯỚC khi implement quyết định đó

---

## 5. Session Protocol

### Bắt đầu session
1. Đọc `docs/03-session-state/latest.md` — hiểu context session trước
2. Đọc `docs/02-phases/active-phase.md` — biết đang làm gì
3. Báo cáo: "Session started. Đang ở phase X, task Y."

### Kết thúc session — BẮT BUỘC
Trước khi kết thúc, cập nhật `docs/03-session-state/latest.md`:

```markdown
## Session [date]
**Completed:** [list]
**In-progress:** [list — include file:line nếu có]
**Blocked:** [list + lý do]
**Next session priority:** [top task]
**Key decisions made:** [nếu có]
```

---

## 6. Architectural Decisions (ADRs)

Mọi quyết định quan trọng phải có ADR trong `docs/01-design/adrs/`.
Format: `ADR-NNN-topic.md`

**Khi nào cần ADR:**
- Chọn giữa 2+ approach khác nhau
- Thay đổi cấu trúc module
- Thêm dependency mới
- Thay đổi cách install/integrate với project khác

---

## 7. HMAF dùng chính nó như thế nào?

HMAF "ăn đồ của chính mình" (dog-fooding):

| Tình huống | Mode dùng |
|-----------|-----------|
| Task đơn giản, rõ ràng | Standard Claude Code |
| Cần nghiên cứu, design | Sub-agent (Researcher + Architect) |
| Quyết định phức tạp, nhiều góc nhìn | Team Agents — debate |
| Code generation (TS/Node) | Router → model rẻ hơn khi đã setup |

---

## 8. Agents trong dự án này

Hiện tại dự án nhỏ, dùng 2 roles chính:

| Agent | Model | Nhiệm vụ |
|-------|-------|----------|
| `architect` | Claude Sonnet | Design decisions, ADRs, architecture review |
| `implementer` | Claude Sonnet (→ DeepSeek khi Router ready) | Code implementation |

Định nghĩa: `.claude/agents/`

---

## 9. Build & Dev commands

```bash
# Install dependencies
npm install

# Type check
npm run lint                    # tsc --noEmit

# Run voice session (cần .env)
npm run voice

# Test model router
npm run route "your task here"

# Dev mode
npm run dev
```

---

## 10. Quy tắc coding

- TypeScript strict mode + noUncheckedIndexedAccess
- Không comment giải thích WHAT — chỉ comment WHY khi không rõ ràng
- Không thêm feature ngoài scope task đang làm
- Mỗi module phải hoạt động độc lập — không depend chéo nhau
- Env vars validate bằng Zod ở startup, fail-fast

---

## 11. Git policy

- Branch: `feat/phase-01-foundation`, `fix/issue-name`
- Commit format: `type(module): description`
  - `feat(router): add task classifier`
  - `docs(adr): add ADR-002 session modes`
  - `fix(voice): handle mic disconnect gracefully`
- Không commit `.env` — chỉ `.env.example`

---

## 12. Không làm những việc sau

- Implement trước khi có ADR cho quyết định quan trọng
- Tạo abstraction khi chưa cần (YAGNI)
- Gắn code với project cụ thể (bap-bean-book hay bất kỳ project nào)
- Kết thúc session mà không cập nhật session-state/latest.md
