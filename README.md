# HMAF — Hybrid Multi-Agent Framework

Install into any Claude Code project to add:

| Module | What it does |
|--------|-------------|
| **Voice** | Speak commands instead of typing (Soniox STT + TTS) |
| **Teams** | Multiple agents debate peer-to-peer for complex decisions |
| **Router** | Auto-routes tasks to cheaper models (DeepSeek, Qwen) |

## Install

```bash
npx hmaf init
```

Run from your project root. The wizard asks 3 questions and generates all config files.

## Usage

Open Claude Code and type `/hmaf` to select session mode.

## Requirements

- Node.js ≥ 22
- Claude Code CLI
- API keys for the modules you enable (see `.env.example` after install)

## Docs

See [HMAF.md](./HMAF.md) for full documentation.
