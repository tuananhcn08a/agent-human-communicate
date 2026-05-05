# Session State — Latest

**Session date:** 2026-05-05 (session 2)  
**Người làm:** Tuan Anh + Claude Sonnet 4.6

---

## Completed this session

**Wave 1 — Docs & Foundation:**
- CLAUDE.md, architecture.md, 4 ADRs, phase plan, session-state protocol

**Wave 2 — Refactor (generic):**
- `.hmaf/config.json` — config tập trung, Zod-validated
- `src/config/loader.ts` — load + merge config, fallback về defaults
- `src/router/providers.ts` — đơn giản hóa, chỉ giữ TaskCategory type
- `src/router/model-router.ts` — fully generic, đọc routing từ config
- `.claude/hooks/session-init.cjs` — generic, không còn hardcode bap-bean-book

**Wave 3 — Session Mode Selection:**
- `.claude/commands/hmaf.md` — `/hmaf` slash command đầy đủ

## In-progress / Next

**Wave 4: Team Agents Protocol** ← TIẾP THEO
- [ ] `src/agents/team-session.ts` — coordinator cho debate round
- [ ] `src/agents/debate-runner.ts` — spawn agents, collect responses, pause
- [ ] File output: `docs/03-session-state/team-debates/{date}-{topic}/`
- [ ] Integration với `/hmaf teams` command

**Wave 5: `npx hmaf init` Wizard** ← SAU WAVE 4
- [ ] `src/cli/init.ts` — interactive wizard
- [ ] Templates trong `src/cli/templates/`

## Open questions (carried from session 1)

1. **Team Agents implementation:** Dùng Claude Code native `Task` tool hay spawn subprocess?
   - Native Task: tích hợp tốt, nhưng phụ thuộc Claude Code API
   - Subprocess (tsx): portable hơn, nhưng phải quản lý lifecycle
   - **Recommendation:** Native Task tool trước (simpler), fallback subprocess nếu cần

2. **`npx hmaf init`:** Publish npm hay local first?
   - **Recommendation:** Local script (`./scripts/init.ts`) trước, npm sau khi ổn định

## Codebase state

- TypeScript: ✅ clean 0 errors
- `src/config/loader.ts`: ✅ Zod schema, load từ .hmaf/config.json
- `src/router/`: ✅ generic, đọc từ config
- `src/voice/`: ✅ code xong, chưa test thật (cần SONIOX_API_KEY)
- `src/gate/`: ✅ xong
- `.claude/commands/hmaf.md`: ✅ slash command đầy đủ
- `.hmaf/config.json`: ✅ default config cho HMAF project

## Active mode

Modules: Standard (chưa chọn mode cho session này)
