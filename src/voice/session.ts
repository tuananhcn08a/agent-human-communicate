/**
 * Voice session entrypoint — ties STT → Model Router → TTS together.
 *
 * Run: tsx src/voice/session.ts
 */

import "dotenv/config";
import { SonioxClient } from "./soniox-client.js";
import { speak, extractSpeakable } from "./tts-client.js";
import { route } from "../router/model-router.js";

const SYSTEM_PROMPT = `
Bạn là HMAF Agent Lead, trợ lý AI cho dự án bap-bean-book.
Bạn nhận lệnh từ người quản lý qua giọng nói (tiếng Việt hoặc tiếng Anh).
Hãy trả lời ngắn gọn, rõ ràng. Khi cần làm rõ thêm, hãy đặt đúng 1 câu hỏi.
Không tự phán đoán khi vấn đề liên quan đến UX/kiến trúc quan trọng — hãy hỏi trước.
`.trim();

async function runVoiceSession() {
  console.log("[HMAF] Voice session started");
  await speak("Xin chào! Tôi đã sẵn sàng. Bạn có thể nói lệnh.");

  const client = new SonioxClient();
  let buffer = "";

  await client.listen(async ({ text, isFinal }) => {
    if (!isFinal) {
      // Show partial transcript without processing
      process.stdout.write(`\r[listening] ${text}  `);
      return;
    }

    buffer = text.trim();
    if (!buffer) return;

    console.log(`\n[you] ${buffer}`);

    try {
      const result = await route({
        prompt: buffer,
        systemPrompt: SYSTEM_PROMPT,
        maxTokens: 1024,
        stream: false,
      });

      const responseText = result.content;
      console.log(`\n[agent → ${result.providerId}] ${responseText}\n`);

      const speakable = extractSpeakable(responseText);
      await speak(speakable);
    } catch (err) {
      const msg = "Xin lỗi, có lỗi xảy ra.";
      console.error("[error]", err);
      await speak(msg);
    }

    buffer = "";
  });
}

runVoiceSession().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
