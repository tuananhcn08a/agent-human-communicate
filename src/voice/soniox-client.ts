/**
 * Soniox streaming STT client.
 * Captures mic audio and streams to Soniox, emitting final transcripts.
 *
 * Usage:
 *   const client = new SonioxClient();
 *   await client.listen((transcript) => console.log(transcript));
 */

import mic from "mic";
import WebSocket from "ws";
import { EventEmitter } from "node:events";

interface SonioxToken {
  text: string;
  is_final: boolean;
}

interface SonioxResponse {
  tokens?: SonioxToken[];
  final_proc_time_ms?: number;
}

export interface TranscriptEvent {
  text: string;
  isFinal: boolean;
}

export class SonioxClient extends EventEmitter {
  private readonly apiKey: string;
  private readonly language: string;
  private ws: WebSocket | null = null;
  private micInstance: ReturnType<typeof mic> | null = null;
  private isListening = false;

  constructor() {
    super();
    const key = process.env["SONIOX_API_KEY"];
    if (!key) throw new Error("SONIOX_API_KEY is required");
    this.apiKey = key;
    this.language = process.env["HMAF_VOICE_LANG"] ?? "vi";
  }

  async listen(onTranscript: (event: TranscriptEvent) => void): Promise<void> {
    if (this.isListening) throw new Error("Already listening");
    this.isListening = true;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket("wss://stt.soniox.com/transcribe-stream", {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      this.ws.once("open", () => {
        // Send session config
        this.ws!.send(
          JSON.stringify({
            api_key: this.apiKey,
            model: "soniox_telephony",   // supports Vietnamese
            language_hints: [this.language, "en"],
            include_nonfinal: true,
          }),
        );

        // Start microphone capture
        this.micInstance = mic({
          rate: "16000",
          channels: "1",
          encoding: "signed-integer",
          bitwidth: "16",
          endian: "little",
          fileType: "raw",
        });

        const micStream = this.micInstance.getAudioStream();

        micStream.on("data", (chunk: Buffer) => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(chunk);
          }
        });

        micStream.on("error", (err: Error) => {
          this.stop();
          reject(err);
        });

        this.micInstance.start();
        console.log("[voice] Microphone active — speak now (Ctrl+C to stop)");
      });

      this.ws.on("message", (data: WebSocket.RawData) => {
        try {
          const resp: SonioxResponse = JSON.parse(data.toString());
          if (!resp.tokens) return;

          const partialText = resp.tokens.map((t) => t.text).join("");
          const isFinal = resp.tokens.some((t) => t.is_final);

          onTranscript({ text: partialText, isFinal });
          this.emit("transcript", { text: partialText, isFinal });
        } catch {
          // Ignore malformed frames
        }
      });

      this.ws.on("error", (err) => {
        this.isListening = false;
        reject(err);
      });

      this.ws.on("close", () => {
        this.isListening = false;
        resolve();
      });

      // Graceful shutdown
      process.once("SIGINT", () => this.stop());
    });
  }

  stop(): void {
    this.micInstance?.stop();
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Signal end-of-stream to Soniox
      this.ws.send(new Uint8Array(0));
      this.ws.close();
    }
    this.isListening = false;
  }
}
