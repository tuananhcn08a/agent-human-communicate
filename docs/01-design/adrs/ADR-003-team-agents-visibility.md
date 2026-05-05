# ADR-003: Team Agents — Mức độ visibility cho người dùng

**Date:** 2026-05-05  
**Status:** Accepted  
**Deciders:** Tuan Anh

---

## Context

Khi agents debate với nhau, người dùng có thể thấy gì và can thiệp được không?

## Options

| Option | Mô tả |
|--------|-------|
| A. Chỉ thấy kết quả cuối | Ít noise nhất, mất đi transparency |
| B. Real-time nhưng không can thiệp | Thấy quá trình nhưng chỉ là spectator |
| C. Real-time + can thiệp được | Tối đa control, phức tạp hơn |

## Quyết định

**Option C: Real-time + can thiệp được**

- Agents stream output real-time vào terminal
- Sau mỗi "round" debate, có pause ngắn cho người dùng có thể nhập ý kiến
- Nhập Enter để tiếp tục không can thiệp; gõ text để inject vào cuộc tranh luận
- Có thể force-stop bất kỳ lúc nào

## Lý do

- Người dùng là người có context đầy đủ về project — cần giữ lại quyền can thiệp
- "Chỉ thấy kết quả" tạo black box — mất trust vào framework
- Quan trọng nhất: can thiệp sớm tiết kiệm token hơn là để agents đi sai hướng cả round

## Implementation note

Pause cho phép can thiệp chỉ xuất hiện sau mỗi round, không phải sau mỗi message — 
tránh làm gián đoạn quá nhiều.
