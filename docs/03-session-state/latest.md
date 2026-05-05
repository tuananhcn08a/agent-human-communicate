# Session State — Latest

**Session date:** 2026-05-05 (session 5)  
**Người làm:** Tuan Anh + Claude Sonnet 4.6

---

## Phase 02 status: In Progress

| Wave | Status |
|------|--------|
| Wave 1: Pilot Integration (bap-bean-book) | ✅ DONE |
| Wave 2: Fix Gaps | ✅ DONE |
| Wave 3: npm Publish Preparation | ⬜ TODO |
| Wave 4: SubprocessExecutor | ⬜ TODO |
| Wave 5: Voice E2E (optional) | ⬜ BLOCKED (Soniox key) |

## Thay đổi trong session này

**Generator fixes:**
- `skipIfExists` cho agent files — không overwrite project agents
- `mergeSettings()` thay vì overwrite `settings.json`

**Slash command fixes (`/hmaf`):**
- Bước 1: đọc `.hmaf/session.json` ưu tiên, fallback về `docs/03-session-state/latest.md`
- Bước 5: lưu state vào `.hmaf/session.json` cho installed mode
- Router check: đọc providers từ config thay vì hardcode key names

**Scout-block fix:**
- Regex `(^|[/\s])dir([/\s]|$)` thay vì `includes('/' + dir)` — bắt relative paths

**Files synced vào bap-bean-book:**
- `.claude/hooks/scout-block.cjs`
- `.claude/commands/hmaf.md`

## Gaps đã xác định (cần giải quyết ở Wave 3+)

1. **Router CLI không chạy được từ installed project** → cần npm publish để `npx hmaf route` work
2. **Agent model frontmatter không sync** — existing projects: advisory only; new projects: wizard sẽ set model theo routing config (future wave)

## Next session priority

**Wave 3: npm Publish Preparation**
- Review `package.json`: name, version, description, keywords, repository
- Kiểm tra `.npmignore`
- `npm pack` → test tarball
- Test `npx /path/to/tarball init` locally
- `npm publish`

## Codebase state

- TypeScript: ✅ clean 0 errors
- `src/cli/generator.ts`: ✅ skipIfExists + mergeSettings
- `.claude/commands/hmaf.md`: ✅ session.json aware
- `.claude/hooks/scout-block.cjs`: ✅ relative path fix
- bap-bean-book: ✅ synced với latest hooks + command
