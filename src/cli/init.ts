#!/usr/bin/env node
/**
 * npx hmaf init — Interactive wizard to install HMAF into any project.
 *
 * Usage:
 *   npx hmaf init              (in target project root)
 *   npx hmaf init --update     (re-run wizard, overwrite existing config)
 *
 * Asks 3 questions, generates everything else.
 */

import "dotenv/config";
import { basename, resolve } from "node:path";
import { existsSync } from "node:fs";
import { ask, askDefault, multiSelect, close, banner } from "./prompts.js";
import { generate, STACK_LABELS, type Stack, type Module } from "./generator.js";

const STACK_OPTIONS: { value: Stack; label: string }[] = [
  { value: "backend-node",   label: STACK_LABELS["backend-node"] },
  { value: "frontend-react", label: STACK_LABELS["frontend-react"] },
  { value: "ios-swift",      label: STACK_LABELS["ios-swift"] },
  { value: "python-backend", label: STACK_LABELS["python-backend"] },
  { value: "flutter-mobile", label: STACK_LABELS["flutter-mobile"] },
  { value: "devops",         label: STACK_LABELS["devops"] },
  { value: "general",        label: STACK_LABELS["general"] },
];

const MODULE_OPTIONS: { value: Module; label: string }[] = [
  { value: "voice",  label: "Voice     — Nói lệnh bằng giọng nói (Soniox STT + TTS)" },
  { value: "teams",  label: "Teams     — Agents thảo luận peer-to-peer" },
  { value: "router", label: "Router    — Tự route sang model rẻ hơn (DeepSeek / Qwen)" },
];

async function main() {
  const targetDir = resolve(process.cwd());
  const isUpdate = process.argv.includes("--update");
  const alreadyInstalled = existsSync(`${targetDir}/.hmaf/config.json`);

  banner("HMAF Init Wizard");

  if (alreadyInstalled && !isUpdate) {
    console.log("⚠  HMAF already installed in this project.");
    const overwrite = await ask("Chạy lại wizard để cập nhật? (y/N): ");
    if (overwrite.toLowerCase() !== "y") {
      console.log("Cancelled. Run with --update to force.");
      close();
      return;
    }
  }

  // ── Question 1: Project name ─────────────────────────────────────────────
  const folderName = basename(targetDir);
  const projectName = await askDefault("1. Tên project?", folderName);

  // ── Question 2: Stack(s) ─────────────────────────────────────────────────
  const stacks = await multiSelect<Stack>(
    "2. Stack chính của project? (có thể chọn nhiều)",
    STACK_OPTIONS,
  );

  if (stacks.length === 0) {
    console.log("Phải chọn ít nhất 1 stack. Dùng 'general' nếu không có trong danh sách.");
    close();
    process.exit(1);
  }

  // ── Question 3: Modules ──────────────────────────────────────────────────
  const modules = await multiSelect<Module>(
    "3. Modules nào muốn dùng? (Enter để bỏ qua, dùng Standard)",
    MODULE_OPTIONS,
  );

  // ── Generate ─────────────────────────────────────────────────────────────
  console.log("\n📦 Đang tạo files...\n");
  const created = generate({ projectName, stacks, modules, targetDir });

  created.forEach((f) => console.log(`  ✓ ${f}`));

  // ── Post-install summary ─────────────────────────────────────────────────
  console.log("\n✅ HMAF installed!\n");
  console.log("📋 Bước tiếp theo:");
  console.log("   1. cp .env.example .env  →  điền API keys");

  if (modules.includes("voice")) {
    console.log("   2. Lấy SONIOX_API_KEY tại soniox.com/dashboard");
  }
  if (modules.includes("router")) {
    console.log("   2. Lấy DEEPSEEK_API_KEY tại platform.deepseek.com");
    console.log("   3. Lấy QWEN_API_KEY tại dashscope.aliyuncs.com");
  }

  console.log("\n   Mở Claude Code → gõ /hmaf để chọn session mode\n");

  // Copy hooks if needed
  printHookNote(targetDir);

  close();
}

function printHookNote(targetDir: string): void {
  const hooksExist = existsSync(`${targetDir}/.claude/hooks/session-init.cjs`);
  if (!hooksExist) {
    console.log("ℹ  Hooks chưa được copy. Chạy lệnh sau để copy hooks từ HMAF:\n");
    console.log("   cp -r <hmaf-path>/.claude/hooks .claude/hooks\n");
  }
}

main().catch((err) => {
  console.error("\n[hmaf] Error:", err instanceof Error ? err.message : err);
  close();
  process.exit(1);
});
