// Copies non-TS assets (templates) into dist/ after tsc build
import { cpSync } from "node:fs";

cpSync("src/cli/templates", "dist/cli/templates", { recursive: true });
console.log("✓ Copied src/cli/templates → dist/cli/templates");
