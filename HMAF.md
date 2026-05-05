# HYBRID MULTI-AGENT FRAMEWORK (HMAF)
## System Blueprint — v0.1.0

**Owner:** Tuan Anh  
**Project target:** bap-bean-book  
**Built from:** ClaudeKit + bap-bean-book ecosystem

---

## 1. Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        HMAF — Command Layer                             │
│                                                                         │
│   🎙 Voice Input          📝 Text Input                                 │
│   (Soniox STT)            (Claude Code CLI)                             │
│        │                        │                                       │
│        └──────────┬─────────────┘                                       │
│                   ▼                                                     │
│         ┌─────────────────┐                                             │
│         │  Scrum Master   │  ← HMAF Agent Lead (Claude Sonnet)         │
│         │  (.claude/agents│    Phân loại task, route model,             │
│         │  /scrum-master) │    điều phối team, enforce gates            │
│         └────────┬────────┘                                             │
│                  │                                                      │
│    ┌─────────────┼─────────────────────────────┐                       │
│    ▼             ▼             ▼                ▼                       │
│ ┌──────┐   ┌──────────┐  ┌──────────┐   ┌──────────┐                  │
│ │ Gate │   │  Model   │  │  Agent   │   │  Voice   │                  │
│ │Check │   │  Router  │  │   Team   │   │  Output  │                  │
│ └──┬───┘   └────┬─────┘  └────┬─────┘   └────┬─────┘                  │
│    │            │              │               │                        │
│    ▼            ▼              ▼               ▼                        │
│ Human OK   Task routed    Agents work     TTS speaks                   │
│  (gate)    to cheapest    in parallel     response                     │
│            capable model  (file-based                                  │
│                            comms)                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     bap-bean-book codebase                              │
│                                                                         │
│  apps/ios  │  apps/web  │  services/sharing-api  │  infra/             │
│  (Swift 6) │  (React 18)│  (Node.js 22 + Fastify)│  (Docker/CF)        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Module 1: Voice-First Workflow

### Luồng xử lý giọng nói

```
Bạn nói                    Soniox                    Agent
   │                          │                          │
   │── audio stream ──────────▶│                          │
   │                          │── transcript (partial) ──▶│ (hiển thị real-time)
   │                          │── transcript (FINAL) ─────▶│
   │                          │                          │
   │                          │                Model Router│
   │                          │                 classify  │
   │                          │              ┌── architecture? → Claude Sonnet
   │                          │              ├── ios-code?     → DeepSeek V3
   │                          │              └── web-code?     → Qwen Plus
   │                          │                          │
   │◀─── TTS speaks ──────────────────── response ───────│
```

### Cấu hình Soniox

```typescript
// src/voice/soniox-client.ts
{
  model: "soniox_telephony",    // hỗ trợ tiếng Việt
  language_hints: ["vi", "en"], // Vietnamese-first
  include_nonfinal: true        // hiển thị real-time
}
```

### Quick Start — Voice Session

```bash
cp .env.example .env
# Điền SONIOX_API_KEY + ANTHROPIC_API_KEY vào .env

npm install
npm run voice
# → "Xin chào! Tôi đã sẵn sàng. Bạn có thể nói lệnh."
```

---

## 3. Module 2: Hybrid Multi-Agent Team (Agile/Scrum)

### Team Structure

```
Scrum Master (bạn — PO)
    │
    └─── Agent Lead (Claude Sonnet — điều phối)
              │
    ┌─────────┼──────────────────────────────────────┐
    │         │              │              │         │
    ▼         ▼              ▼              ▼         ▼
architect  backend-dev   ios-dev        web-dev    qa
(Claude)  (Qwen Plus)  (DeepSeek)    (Qwen Plus) (Claude)
```

### Agent Communication Protocol

Agents giao tiếp qua file reports (không share context window):

```
bap-bean-book/
└── plans/
    └── {YYMMDD}-{feature}/
        ├── plan.md                    ← Sprint plan
        └── reports/
            ├── 260505-from-backend-dev-to-ios-dev-api-contract.md
            └── 260505-from-qa-to-scrum-master-blockers.md
```

### Sprint Ceremonies

| Ceremony | Trigger | Action |
|----------|---------|--------|
| Sprint Planning | Đầu phase / wave mới | Scrum Master phân task, route agents |
| Daily Standup | Đầu mỗi session | Báo cáo DONE/DOING/BLOCKED |
| Sprint Review | Cuối phase | Demo checklist → PO approve |
| Retrospective | Sau mỗi phase | Ghi session-log.md |

---

## 4. Module 3: Dynamic Model Router

### Routing Logic

```
Task prompt
    │
    ▼
Task Classifier (keyword scoring)
    │
    ├── architecture / research / review / planning
    │       → Claude Sonnet 4.6  ($3/$15 per 1M tokens)
    │
    ├── ios-code / simple-fix
    │       → DeepSeek V3        ($0.27/$1.1 per 1M tokens)
    │                              ≈ 11x cheaper than Claude
    │
    └── backend-code / web-code / devops
            → Qwen Plus           ($0.4/$1.2 per 1M tokens)
                                   ≈ 7x cheaper than Claude
```

### Cost Example (1 sprint)

| Task | Tokens | Claude cost | Routed cost | Savings |
|------|--------|------------|-------------|---------|
| Architecture review (5) | 50K | $0.90 | $0.90 | 0% |
| iOS feature code (20) | 200K | $3.60 | $0.33 | 91% |
| Backend APIs (15) | 150K | $2.70 | $0.24 | 91% |
| Web components (10) | 100K | $1.80 | $0.16 | 91% |
| **Sprint total** | **500K** | **$9.00** | **$1.63** | **82%** |

### CLI Usage

```bash
# Test routing trực tiếp
tsx src/router/model-router.ts "implement SwiftUI view for ChildZone login"
# → [router] category=ios-code confidence=85% → deepseek-v3 ~$0.00033

tsx src/router/model-router.ts "should we use SQLite or Postgres for Phase 3?"
# → [router] category=architecture confidence=90% → claude-sonnet ~$0.00450
```

---

## 5. Module 4: Human-in-the-Loop

### Gate Philosophy (kế thừa ClaudeKit)

**Chỉ gate khi agent THỰC SỰ không tự quyết được.**  
Không hỏi lắt nhắt — đó là noise, không phải collaboration.

```
HARD GATES (luôn dừng lại hỏi):
  ✗ Thay đổi kiến trúc / ADR mới
  ✗ Thay đổi UX quan trọng (navigation, layout chính)
  ✗ Deploy production / merge main
  ✗ Database schema breaking change
  ✗ Quyết định liên quan ChildZone / child safety

NOT GATES (tự quyết):
  ✓ Bug fix nhỏ trong scope đã approve
  ✓ Refactor nội bộ không đổi API contract
  ✓ Thêm tests
  ✓ Cập nhật docs
  ✓ Fix lint/type errors
```

### Gate Modes

| Mode | Behavior |
|------|----------|
| `smart` (default) | Gate chỉ khi match HARD_GATE_PATTERNS |
| `strict` | Gate cả SOFT_GATE_PATTERNS (refactor, style changes) |
| `auto` | Không gate — dùng khi CI/CD automation |

---

## 6. Integration với bap-bean-book

### Bước 1: Copy Scrum Master agent

```bash
cp .claude/agents/scrum-master.md \
   /Users/anhdt14/Workspace/Side-project/bap-bean-book/.claude/agents/scrum-master.md
```

### Bước 2: Cập nhật CLAUDE.md (thêm routing instructions)

Thêm vào phần đầu `bap-bean-book/CLAUDE.md`:

```markdown
## Model Routing Policy (HMAF)
Khi spawn sub-agent, chọn model dựa trên task type:
- architecture/research/review → claude-sonnet-4-6
- ios-code → deepseek-chat (via OpenAI-compat API)  
- backend-code/web-code/devops → qwen-plus
- Fallback: claude-sonnet-4-6
```

### Bước 3: Cấu hình environment

```bash
# Trong bap-bean-book hoặc shell profile
export DEEPSEEK_API_KEY="..."
export DEEPSEEK_BASE_URL="https://api.deepseek.com"
export QWEN_API_KEY="..."
export QWEN_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
```

---

## 7. Đề xuất cải tiến bap-bean-book

Dựa trên phân tích codebase, các điểm nên cải tiến (theo priority):

| Priority | Item | Impact |
|----------|------|--------|
| HIGH | Fix API URL prefix inconsistency (`/api/admin/` vs `/api/share/admin/`) trong `routes/admin/users.ts` | API contract consistency |
| HIGH | Implement ADR-005 (CI/CD) — GitHub Actions cho PR auto-test | Catch regressions faster |
| MEDIUM | Implement ADR-006 (Analytics sink) trước Phase 2 để tránh retrofit | Technical debt prevention |
| MEDIUM | Add `apps/web/README.md` — hiện chỉ có sharing-api có README | Onboarding quality |
| MEDIUM | Thêm test cho `ImportPage`, `AdminUsersPage` (hiện chưa có component tests) | Test coverage |
| LOW | `noUncheckedIndexedAccess: true` trong tsconfig (backend + web) | Type safety tốt hơn |
| LOW | Log rotation + alerting cho cron jobs (`reconcile.ts`) | Operational visibility |

---

## 8. File Structure

```
agent-human-communicate/           ← HMAF framework repo
├── .claude/
│   ├── agents/
│   │   └── scrum-master.md        ← Scrum Master agent definition
│   ├── hooks/
│   │   ├── scout-block.cjs        ← Block expensive token reads
│   │   └── session-init.cjs       ← Inject bap-bean-book context
│   └── settings.json              ← Hook pipeline config
├── src/
│   ├── voice/
│   │   ├── soniox-client.ts       ← Streaming STT
│   │   ├── tts-client.ts          ← TTS output (macOS/OpenAI)
│   │   └── session.ts             ← Voice session entrypoint
│   ├── router/
│   │   ├── providers.ts           ← Provider configs + routing table
│   │   ├── task-classifier.ts     ← Keyword-based task classification
│   │   └── model-router.ts        ← Main routing logic + cost tracking
│   └── gate/
│       └── human-gate.ts          ← Human-in-the-loop gate
├── .env.example
├── package.json
├── tsconfig.json
└── HMAF.md                        ← This file
```

---

## 9. Roadmap

| Phase | Item |
|-------|------|
| v0.1 (current) | Model Router + Voice STT/TTS + Scrum Master agent + Human Gate |
| v0.2 | Persistent sprint board (SQLite) — track tasks across sessions |
| v0.3 | Agent-to-agent peer messaging (inspired by ClaudeKit Teams v2.1) |
| v0.4 | Web dashboard — visualize sprint board, cost tracking, agent activity |
| v0.5 | GitHub Actions integration — auto-trigger HMAF on PR events |
