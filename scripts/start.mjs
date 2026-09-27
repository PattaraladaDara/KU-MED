import { cp, access } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { config } from "dotenv";

const root = resolve(import.meta.dirname, "..");
config({ path: resolve(root, ".env"), quiet: true });
const standalone = resolve(root, ".next/standalone");
try {
  await access(resolve(standalone, "server.js"));
} catch {
  console.error("Build the application first: npm run build");
  process.exit(1);
}
await cp(resolve(root, "public"), resolve(standalone, "public"), { recursive: true });
await cp(resolve(root, ".next/static"), resolve(standalone, ".next/static"), { recursive: true });
process.env.HOSTNAME = "127.0.0.1";
await import(pathToFileURL(resolve(standalone, "server.js")).href);
