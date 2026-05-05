/**
 * TTS output client — speaks agent responses back to the user.
 *
 * Provider selection (HMAF_TTS_PROVIDER env var):
 *   macos   — macOS `say` command (zero latency, zero cost, works offline)
 *   openai  — OpenAI TTS API (natural voice, requires OPENAI_API_KEY)
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import OpenAI from "openai";

const execAsync = promisify(exec);

type TTSProvider = "macos" | "openai";

function getProvider(): TTSProvider {
  const env = process.env["HMAF_TTS_PROVIDER"] ?? "macos";
  if (env === "openai") return "openai";
  return "macos";
}

async function speakMacos(text: string): Promise<void> {
  // -v Lan is the Vietnamese voice; falls back to default if unavailable
  const voice = process.env["HMAF_VOICE_LANG"]?.startsWith("vi") ? "Lan" : "Samantha";
  const safeText = text.replace(/"/g, "'");
  await execAsync(`say -v "${voice}" "${safeText}"`);
}

async function speakOpenAI(text: string): Promise<void> {
  const client = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });
  const mp3 = await client.audio.speech.create({
    model: "tts-1",
    voice: "nova",
    input: text,
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());
  const tmpFile = join(tmpdir(), `hmaf-tts-${Date.now()}.mp3`);

  await writeFile(tmpFile, buffer);
  await execAsync(`afplay "${tmpFile}"`);   // macOS audio player
  await unlink(tmpFile);
}

export async function speak(text: string): Promise<void> {
  if (!text.trim()) return;

  const provider = getProvider();

  if (provider === "openai" && process.env["OPENAI_API_KEY"]) {
    await speakOpenAI(text);
  } else {
    await speakMacos(text);
  }
}

// Truncate long responses for TTS — read a summary, not full code blocks
export function extractSpeakable(fullResponse: string): string {
  // Strip markdown code blocks
  const stripped = fullResponse.replace(/```[\s\S]*?```/g, "[code block]");

  // Cap at 400 chars for TTS readability
  const sentences = stripped.split(/(?<=[.!?])\s+/);
  let result = "";
  for (const sentence of sentences) {
    if ((result + sentence).length > 400) break;
    result += (result ? " " : "") + sentence;
  }
  return result || stripped.slice(0, 400);
}
