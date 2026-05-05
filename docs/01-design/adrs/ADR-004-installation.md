# ADR-004: Installation Method

**Date:** 2026-05-05  
**Status:** Accepted  
**Deciders:** Tuan Anh

---

## Context

Cần quyết định cách cài HMAF vào project mới.

## Options

| Option | Mô tả |
|--------|-------|
| Manual copy | Copy files tay — đơn giản nhưng không scalable |
| Git submodule | Phức tạp, ràng buộc version |
| `npx hmaf init` | CLI wizard, generate config dựa trên input |
| VS Code extension | UX tốt nhưng scope quá lớn |

## Quyết định

**`npx hmaf init` — CLI wizard**

Wizard hỏi:
1. Tên project (để generate agent context)
2. Stack chính (để chọn đúng agent templates)
3. Module nào muốn dùng
4. API keys có sẵn chưa

Generate ra:
- `.claude/agents/*.md` — dựa trên stack
- `.claude/settings.json` — hooks cho các module đã chọn
- `.hmaf/config.json` — config tập trung
- `.env.example` — chỉ keys cần cho module đã chọn
- Append vào `CLAUDE.md` hoặc tạo mới nếu chưa có

## Lý do

- `npx` không cần install global — zero friction
- Wizard đảm bảo không miss config quan trọng
- Generated files có thể commit vào git — reproducible
- Dễ update: chạy lại `npx hmaf init --update`
