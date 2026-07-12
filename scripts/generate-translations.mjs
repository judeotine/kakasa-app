import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "lib", "translations");

const BASE_URL = "https://api.sunbird.ai";
const TARGET_LANGS = ["lug", "nyn", "ach", "teo", "lgg", "sw"];
const CONCURRENCY = 3;
const SAVE_EVERY = 10;

// API allows 50 requests / minute. Pace request starts to stay safely under it.
const MAX_PER_MIN = 45;
const MIN_INTERVAL_MS = Math.ceil(60000 / MAX_PER_MIN);
const MINUTE_LIMIT_BACKOFF_MS = 8000;
const MAX_RETRIES = 4;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let nextSlotAt = 0;
async function paceRequest() {
  const now = Date.now();
  const start = Math.max(now, nextSlotAt);
  nextSlotAt = start + MIN_INTERVAL_MS;
  const wait = start - now;
  if (wait > 0) await sleep(wait);
}

function loadEnv() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) process.env[match[1]] = match[2].trim();
  }
}
loadEnv();

const API_KEY = process.env.EXPO_PUBLIC_SUNBIRD_API_KEY;

function loadAppStrings() {
  const src = fs.readFileSync(path.join(ROOT, "lib", "strings.ts"), "utf8");
  const js = ts.transpileModule(src, {
    compilerOptions: { module: "CommonJS", target: "ES2019" },
  }).outputText;
  const tmpFile = path.join(os.tmpdir(), `kakasa-strings-${process.pid}.cjs`);
  fs.writeFileSync(tmpFile, js);
  try {
    return require(tmpFile).APP_STRINGS;
  } finally {
    fs.rmSync(tmpFile, { force: true });
  }
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

function writeJson(file, obj) {
  const sorted = Object.fromEntries(
    Object.keys(obj)
      .sort()
      .map((k) => [k, obj[k]])
  );
  fs.writeFileSync(file, JSON.stringify(sorted, null, 2) + "\n");
}

class DailyQuotaError extends Error {
  constructor(retryAfterSeconds) {
    super("Daily quota exceeded");
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

class MinuteRateLimitError extends Error {}

async function translateText(text, lang) {
  await paceRequest();
  const res = await fetch(`${BASE_URL}/tasks/translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ source_language: "eng", target_language: lang, text }),
  });
  const data = await res.json();
  if (data?.error_code === "RATE_LIMIT_ERROR") {
    throw new DailyQuotaError(data?.details?.[0]?.retry_after_seconds ?? null);
  }
  if (typeof data?.error === "string" && /rate limit/i.test(data.error)) {
    throw new MinuteRateLimitError(data.error);
  }
  const out = data?.output?.translated_text;
  if (typeof out !== "string") {
    throw new Error(`Unexpected response: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return out;
}

async function generateLang(lang, strings) {
  const file = path.join(OUT_DIR, `${lang}.json`);
  const existing = readJson(file);
  const totalKeys = Object.keys(strings).length;
  const pending = Object.keys(strings).filter((k) => !(k in existing));

  if (pending.length === 0) {
    console.log(`  ${lang}: already complete (${totalKeys} strings)`);
    return true;
  }
  console.log(`  ${lang}: ${pending.length} missing of ${totalKeys}`);

  let cursor = 0;
  let done = 0;
  let rateLimitRetry = null;

  async function worker() {
    while (cursor < pending.length && rateLimitRetry === null) {
      const key = pending[cursor++];
      let attempt = 0;
      while (rateLimitRetry === null) {
        try {
          existing[key] = await translateText(strings[key], lang);
          done += 1;
          if (done % SAVE_EVERY === 0) {
            writeJson(file, existing);
            process.stdout.write(`\r  ${lang}: ${done}/${pending.length}   `);
          }
          break;
        } catch (err) {
          if (err instanceof DailyQuotaError) {
            rateLimitRetry = err.retryAfterSeconds;
            return;
          }
          attempt += 1;
          if (attempt > MAX_RETRIES) {
            console.warn(`\n  ! ${lang}/${key}: ${err.message} (skipped, will retry next run)`);
            break;
          }
          const backoff =
            err instanceof MinuteRateLimitError ? MINUTE_LIMIT_BACKOFF_MS : 1500;
          await sleep(backoff);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  writeJson(file, existing);
  process.stdout.write("\n");

  if (rateLimitRetry !== null) {
    const hours = rateLimitRetry ? (rateLimitRetry / 3600).toFixed(1) : "?";
    console.log(
      `  ⏳ ${lang}: daily quota hit — progress saved (${done} added). Re-run in ~${hours}h to resume.`
    );
    return false;
  }
  console.log(`  ✓ ${lang}: complete`);
  return true;
}

async function main() {
  if (!API_KEY) {
    console.error("EXPO_PUBLIC_SUNBIRD_API_KEY is not set (add it to .env.local).");
    process.exit(1);
  }

  const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const langs = args.length ? args : TARGET_LANGS;
  const strings = loadAppStrings();

  console.log(
    `Generating bundled translations for: ${langs.join(", ")} — ${Object.keys(strings).length} strings each`
  );
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const lang of langs) {
    const complete = await generateLang(lang, strings);
    if (!complete) {
      process.exitCode = 2;
      return;
    }
  }
  console.log("All done. Commit lib/translations/*.json and rebuild the app.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
