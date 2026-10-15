import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(projectRoot, ".env.sonar.local");

let token;

try {
  const contents = readFileSync(envFile, "utf8");
  token = contents.match(/^\s*SONAR_TOKEN\s*=\s*["']?([^\s"';]+)/m)?.[1]
    ?? contents.match(/(?:sqp|squ|sqa)_[A-Za-z0-9_-]+/)?.[0];
} catch {
  // Fall back to the current shell when the project-local file is absent.
}

token ??= process.env.SONAR_TOKEN?.trim();

if (!token) {
  console.error("ไม่พบ SONAR_TOKEN กรุณาสร้างไฟล์ .env.sonar.local และเพิ่ม SONAR_TOKEN=token_ของคุณ");
  process.exit(1);
}

const scanner = path.join(projectRoot, "node_modules", "@sonar", "scan", "bin", "sonar-scanner.js");
const result = spawnSync(process.execPath, [scanner, ...process.argv.slice(2)], {
  cwd: projectRoot,
  env: { ...process.env, SONAR_TOKEN: token },
  stdio: "inherit",
});

if (result.error) {
  console.error("ไม่สามารถเริ่ม SonarScanner ได้:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
