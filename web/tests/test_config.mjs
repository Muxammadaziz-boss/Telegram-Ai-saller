import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to parse simple .env files without extra dependencies
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

// 1. Resolve Environment Variables
const webDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(webDir, "..");

const testEnv = loadEnvFile(path.join(webDir, ".env.test"));
const webEnv = loadEnvFile(path.join(webDir, ".env"));
const rootEnv = loadEnvFile(path.join(rootDir, ".env"));

const mergedEnv = {
  ...rootEnv,
  ...webEnv,
  ...testEnv,
  ...process.env,
};

export const BASE_URL = mergedEnv.TEST_BASE_URL || mergedEnv.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

// Ensure DASHBOARD_PASSWORD is provided securely
export const DASHBOARD_PASSWORD = mergedEnv.DASHBOARD_PASSWORD || "";

if (!DASHBOARD_PASSWORD) {
  console.error("==================================================================");
  console.error("[FATAL ERROR] Missing required test credential: DASHBOARD_PASSWORD");
  console.error("Please set DASHBOARD_PASSWORD in your environment or web/.env.test");
  console.error("See web/.env.test.example for configuration details.");
  console.error("==================================================================");
  process.exit(1);
}

// 2. Resolve Chrome / Chromium Launch Options
export function getLaunchOptions() {
  const options = {
    headless: true,
  };

  if (mergedEnv.CHROME_PATH && fs.existsSync(mergedEnv.CHROME_PATH)) {
    options.executablePath = mergedEnv.CHROME_PATH;
  } else if (process.platform === "win32") {
    const defaultWinChrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    const defaultWinChromeX86 = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
    if (fs.existsSync(defaultWinChrome)) {
      options.executablePath = defaultWinChrome;
    } else if (fs.existsSync(defaultWinChromeX86)) {
      options.executablePath = defaultWinChromeX86;
    }
  }
  // On Linux CI or environments without Google Chrome, omitting executablePath allows
  // Playwright to use its bundled Chromium automatically.
  return options;
}

// 3. Environment & Commit Metadata
export function getRunMetadata(suiteName) {
  let commitSha = "unknown";
  try {
    commitSha = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  } catch {
    commitSha = "git_unavailable";
  }

  return {
    suite: suiteName,
    timestamp: new Date().toISOString(),
    commitSha,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    targetUrl: BASE_URL,
    credentialSource: process.env.DASHBOARD_PASSWORD ? "process.env" : "env_file",
  };
}
