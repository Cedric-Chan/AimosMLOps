/**
 * Copies Vite dist/ to docs/prototype/feature-store-demo/ so FEATURE_STORE.html
 * can link to ./feature-store-demo/index.html (same docs/prototype tree; avoids
 * file:// ../ navigation blocked by some browsers, and works when dist/ is not present in repo).
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const distDir = join(projectRoot, "dist");
const targetDir = join(projectRoot, "..", "..", "prototype", "feature-store-demo");

if (!existsSync(distDir)) {
  console.error("dist/ not found. Run: npm run build");
  process.exit(1);
}

rmSync(targetDir, { recursive: true, force: true });
mkdirSync(targetDir, { recursive: true });
cpSync(distDir, targetDir, { recursive: true });
console.log("Synced dist ->", targetDir);
