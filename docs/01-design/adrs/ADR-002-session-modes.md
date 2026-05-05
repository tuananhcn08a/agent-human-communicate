# ADR-002: Session Mode Selection — Hook vs Command vs Both

**Date:** 2026-05-05  
**Status:** Accepted  
**Deciders:** Tuan Anh

---

## Context

Cần quyết định cách người dùng chọn mode (Voice / Teams / Router) khi bắt đầu session.

## Options đã xem xét

| Option | Ưu | Nhược |
|--------|-----|-------|
| Hook only (SessionStart) | Tự động, không cần nhớ command | Phiền nếu không muốn dùng |
| Command only (`/hmaf`) | Chủ động, không intrusive | Phải nhớ gọi |
| Cả hai | Flexible nhất | Phức tạp hơn một chút |

## Quyết định

**Cả hai:** Hook + Slash command `/hmaf`

- **Hook (SessionStart):** Hỏi mode khi bắt đầu session. Có option "bỏ qua" bằng Enter.
- **`/hmaf` command:** Gọi bất cứ lúc nào để switch hoặc xem mode hiện tại.
- Hook có thể disable được nếu người dùng muốn (config: `"sessionPrompt": false`).

## Lý do

- Người dùng mới: hook nhắc nhở, không bỏ lỡ tính năng
- Người dùng quen: có thể disable hook, dùng command khi cần
- Flexibility quan trọng hơn đơn giản trong trường hợp này
