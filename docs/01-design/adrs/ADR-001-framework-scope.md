# ADR-001: Framework Scope — Generic vs Project-specific

**Date:** 2026-05-05  
**Status:** Accepted  
**Deciders:** Tuan Anh

---

## Context

Ban đầu framework được thiết kế nghiêng về bap-bean-book. Cần quyết định scope thực sự.

## Quyết định

**HMAF là generic framework** — không gắn với bất kỳ project cụ thể nào.

- Cài được vào bất kỳ project nào qua `npx hmaf init`
- Routing table, agent definitions, gate conditions đều configurable
- Mỗi project có `.hmaf/config.json` riêng

## Lý do

- Giá trị dài hạn cao hơn: giải quyết được vấn đề phổ quát
- bap-bean-book là use case đầu tiên để validate, không phải mục tiêu duy nhất
- Generic không có nghĩa là kém chuyên biệt — config cho phép tùy chỉnh sâu

## Hệ quả

- Không hardcode bất kỳ path hay tên project nào trong src/
- Mọi project-specific config nằm trong file được generate bởi `npx hmaf init`
- bap-bean-book sẽ là integration example trong `examples/bap-bean-book/`
