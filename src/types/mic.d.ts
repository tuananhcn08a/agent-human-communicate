declare module "mic" {
  interface MicOptions {
    rate?: string;
    channels?: string;
    encoding?: string;
    bitwidth?: string;
    endian?: string;
    fileType?: string;
  }

  interface MicInstance {
    start(): void;
    stop(): void;
    getAudioStream(): NodeJS.ReadableStream;
  }

  function mic(options?: MicOptions): MicInstance;
  export = mic;
}
