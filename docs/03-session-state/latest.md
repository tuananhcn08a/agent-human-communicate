# Session State — Latest

**Session date:** 2026-05-05  
**Người làm:** Tuan Anh + Claude Sonnet 4.6

---

## Completed this session

- Phân tích ClaudeKit (docs/references/claudekit-engineer-main) — extract patterns
- Phân tích bap-bean-book codebase — hiểu stack, conventions, agent setup
- Scaffold ban đầu: src/router/, src/voice/, src/gate/ — TypeScript clean
- Viết CLAUDE.md, architecture.md, 4 ADRs, phase plan
- Đã fix: @types/mic không tồn tại → dùng custom .d.ts
- Đã fix: soniox không có npm package → implement WebSocket trực tiếp
- Đã fix: TypeScript type errors → clean build

## In-progress (chưa xong)

- **Refactor Model Router** — hiện còn reference bap-bean-book trong session-init.cjs
- **Session Mode Selection** — chưa implement hook + slash command
- **Team Agents Protocol** — chưa implement

## Next session priority

1. **Wave 2: Refactor** — xóa bap-bean-book references, làm Router generic
2. **Wave 3: Session Mode Selection** — hook + /hmaf command
3. Sau đó mới sang Wave 4 (Team Agents)

## Open questions cần quyết định

1. Team Agents: dùng Claude Code `Task` tool (native) hay spawn subprocess riêng?
   - Native Task tool: tích hợp tốt với Claude Code, nhưng bị giới hạn bởi Claude Code API
   - Subprocess: flexible hơn, nhưng phải quản lý lifecycle
   
2. `/hmaf` slash command: implement như ClaudeKit SKILL.md hay dùng Claude Code commands/?

## Key architectural decisions (xem ADRs để biết lý do)

- Generic framework (ADR-001)
- Hook + command cả hai (ADR-002)
- Real-time + intervention (ADR-003)
- npx hmaf init (ADR-004)

## Code state

- TypeScript: ✅ clean, 0 errors
- Task classifier: ✅ hoạt động, đã test
- Voice: ✅ code xong, chưa test thật (cần SONIOX_API_KEY)
- Model Router: ✅ code xong, cần refactor để generic
- Human Gate: ✅ code xong
