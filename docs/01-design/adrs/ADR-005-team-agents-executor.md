# ADR-005: Team Agents Execution Strategy

**Date:** 2026-05-05  
**Status:** Accepted  
**Deciders:** Tuan Anh

---

## Context

Team Agents cần một cơ chế để spawn agents và collect responses. Có hai approach:

| Approach | Ưu điểm | Nhược điểm |
|----------|---------|-----------|
| **Claude Code Task tool** | Native, tích hợp ngay, Agent Teams support | Chỉ hoạt động trong Claude Code |
| **Subprocess (tsx process)** | Portable, works anywhere, non-Claude projects | Phức tạp hơn, phải quản lý lifecycle |

## Vấn đề nếu không có abstraction

Nếu hardcode vào Task tool ngay, khi cần Subprocess sẽ phải viết lại toàn bộ logic nghiệp vụ (debate rounds, file comms, intervention points). Tốn nhiều công, dễ introduce bugs.

## Quyết định

**Xây dựng `AgentExecutor` interface ngay từ đầu, implement ClaudeTaskExecutor trước.**

```typescript
interface AgentExecutor {
  spawn(agent: AgentDefinition, task: string): Promise<AgentHandle>;
  send(handle: AgentHandle, message: string): Promise<void>;
  collect(handle: AgentHandle): Promise<AgentResponse>;
  terminate(handle: AgentHandle): Promise<void>;
}
```

Triển khai theo 2 giai đoạn:

### Phase 1 — ClaudeTaskExecutor (implement ngay)
- Dùng Claude Code Agent tool để spawn agents
- Mỗi agent là một subagent với context riêng
- Communication qua file reports trong `docs/03-session-state/team-debates/`

### Phase 2 — SubprocessExecutor (implement sau)
- Mỗi agent là một `tsx` subprocess với prompt được pipe vào
- Communication vẫn qua file reports (cùng protocol)
- Phù hợp khi cần chạy outside Claude Code

## Tại sao file-based communication là lựa chọn đúng

File protocol hoạt động với **cả hai executor** mà không cần thay đổi:
- ClaudeTaskExecutor: agents đọc/ghi file trong session
- SubprocessExecutor: processes đọc/ghi file trên filesystem

Đây là điểm then chốt giúp switch executor mà không cần đổi business logic.

## Hệ quả

- Wave 4 implement `AgentExecutor` interface + `ClaudeTaskExecutor`
- Phase 2 (tương lai): thêm `SubprocessExecutor` implement cùng interface
- Không có code nào ngoài executor files cần thay đổi khi switch
- Config `.hmaf/config.json` sẽ có field `"executor": "claude-task" | "subprocess"`
