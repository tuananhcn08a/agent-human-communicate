# Phase 02: Validation & Distribution

**Goal:** Chứng minh HMAF hoạt động trong project thật, sau đó publish lên npm  
**Status:** In Progress  
**Started:** 2026-05-05

---

## Rationale

Phase 01 đã build framework. Phase 02 phải trả lời câu hỏi: *"Nó có thực sự hoạt động không?"*

Thứ tự ưu tiên:
1. Validate trước (pilot) — tìm bug trước khi publish
2. Publish sau — khi đã tự tin
3. Improve executor — SubprocessExecutor thay thế stub hiện tại
4. Voice E2E — phụ thuộc Soniox API key (optional)

---

## Tasks

### Wave 1: Pilot Integration — bap-bean-book ✅ DONE

**Goal:** Cài HMAF vào một project thật, xác nhận tất cả modules hoạt động đúng

**Findings:** bap-bean-book đã có HMAF partially installed từ Phase 01.

- [x] Locate bap-bean-book directory
- [x] Verify session-init hook — hoạt động đúng, hiển thị "Project: bap-bean-book | Modules: teams, router"
- [x] Verify `/hmaf` slash command installed
- [x] Verify hooks (scout-block, session-init) configured in settings.json
- [x] Verify `.hmaf/config.json` đúng (teams=true, router=true với gemini-flash)
- [x] Fix generator: thêm `skipIfExists` cho agent files + `mergeSettings` cho settings.json
- [x] Fix `/hmaf` command: state save vào `.hmaf/session.json` cho installed mode
- [x] Fix `/hmaf` command: Router check đọc providers từ config thay vì hardcode key names
- [x] Document gaps tìm thấy (xem Wave 2 bên dưới)

**Gaps tìm thấy:**
1. **Router CLI không chạy được từ bap-bean-book** — no root package.json → cần npm publish
2. **Agent model frontmatter không sync với routing config** — `ios-dev.md` dùng `claude-sonnet-4-6` thay vì `gemini-flash`
3. **scout-block không bắt relative paths** — `ls node_modules/.bin` không bị chặn

### Wave 2: Fix Gaps ✅ DONE

**Goal:** Fix gaps từ Wave 1

- [x] Fix scout-block: regex check `(^|[/\s])dir([/\s]|$)` — bắt relative paths như `ls node_modules/.bin`
- [x] Design decision: agent model frontmatter — **Option B** (advisory) cho existing projects với custom agents; Option A (wizard sets model) cho newly generated agents trong tương lai
- [x] Document: router CLI chỉ available sau npm publish — tracked trong Wave 3
- [x] Sync fixes vào bap-bean-book (scout-block.cjs, hmaf.md command)

### Wave 3: npm Publish Preparation ⬜ TODO

**Goal:** Package sẵn sàng để publish lên npm registry

- [ ] Review và update `package.json`: name, version, description, keywords, repository
- [ ] Kiểm tra `.npmignore` — loại trừ docs, tests, `.claude/`
- [ ] Build TypeScript: `npm run build` → verify `dist/` đầy đủ
- [ ] Test `npm pack` — kiểm tra tarball
- [ ] Test `npx` locally: `npx /path/to/tarball init`
- [ ] Write short `README.md` cho npm page
- [ ] `npm publish --dry-run` để verify
- [ ] Publish: `npm publish`

### Wave 4: SubprocessExecutor ⬜ TODO

**Goal:** Implement executor thật thay cho stub hiện tại

- [ ] Viết ADR-006: SubprocessExecutor design
- [ ] Implement `src/agents/subprocess-executor.ts` — thay thế stub
- [ ] Test với debate-runner: spawn 2 agents thật, collect output
- [ ] Update config documentation

### Wave 5: Voice E2E (Optional — blocked) ⬜ TODO

**Goal:** Test voice pipeline end-to-end với Soniox

- [ ] Lấy Soniox API key
- [ ] Test WebSocket connection: `npm run voice`
- [ ] Test STT → transcript → Claude response pipeline
- [ ] Test TTS playback
- [ ] Document latency + error cases

---

## Success criteria

Phase 02 hoàn thành khi:
- [ ] HMAF cài được vào bap-bean-book, ít nhất router + gate hoạt động
- [ ] `npx hmaf init` hoạt động từ npm registry (hoặc local tarball)
- [ ] TypeScript: 0 errors, 0 regressions

---

## Risks

| Risk | Mitigation |
|------|-----------|
| `npx hmaf init` generate file sai paths khi installed | Test với `npm pack` + local tarball trước khi publish |
| bap-bean-book có conflicts với generated CLAUDE.md | Wizard hỏi trước, chỉ generate nếu không có file hiện tại |
| SubprocessExecutor khó test trong Claude Code sandbox | Test với simple echo script trước |
