import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "lib", "translations");
const LANGS = ["lug", "nyn", "ach", "teo", "lgg", "sw"];
const FILL = process.argv.includes("--fill");

function loadAppStrings() {
  const src = fs.readFileSync(path.join(ROOT, "lib", "strings.ts"), "utf8");
  const js = ts.transpileModule(src, {
    compilerOptions: { module: "CommonJS", target: "ES2019" },
  }).outputText;
  const tmpFile = path.join(os.tmpdir(), `kakasa-strings-check-${process.pid}.cjs`);
  fs.writeFileSync(tmpFile, js);
  try {
    return require(tmpFile).APP_STRINGS;
  } finally {
    fs.rmSync(tmpFile, { force: true });
  }
}

function preview(list, n = 8) {
  return list.slice(0, n).join(", ") + (list.length > n ? " …" : "");
}

const en = loadAppStrings();
const enKeys = Object.keys(en);
let anyProblem = false;

console.log(`Checking translations against ${enKeys.length} English keys${FILL ? " (fill mode)" : ""}\n`);

for (const lang of LANGS) {
  const file = path.join(DIR, `${lang}.json`);
  if (!fs.existsSync(file)) {
    console.log(`${lang}.json: MISSING FILE`);
    anyProblem = true;
    continue;
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    console.log(`${lang}.json: INVALID JSON — ${err.message}`);
    anyProblem = true;
    continue;
  }

  const keys = new Set(Object.keys(data));
  const missing = enKeys.filter((k) => !keys.has(k));
  const unknown = [...keys].filter((k) => !(k in en));
  const empty = enKeys.filter(
    (k) => keys.has(k) && (typeof data[k] !== "string" || data[k].trim() === "")
  );
  const clean = missing.length === 0 && unknown.length === 0 && empty.length === 0;

  console.log(
    `${lang}.json: ${Object.keys(data).length}/${enKeys.length} keys — ${clean ? "OK" : "ISSUES"}`
  );
  if (missing.length) console.log(`  missing (${missing.length}): ${preview(missing)}`);
  if (unknown.length) console.log(`  unknown (${unknown.length}): ${preview(unknown)}`);
  if (empty.length) console.log(`  empty  (${empty.length}): ${preview(empty)}`);

  if (!clean) anyProblem = true;

  if (FILL) {
    const filled = {};
    for (const k of enKeys) {
      filled[k] =
        typeof data[k] === "string" && data[k].trim() !== "" ? data[k] : en[k];
    }
    const sorted = Object.fromEntries(
      Object.keys(filled)
        .sort()
        .map((k) => [k, filled[k]])
    );
    fs.writeFileSync(file, JSON.stringify(sorted, null, 2) + "\n");
    console.log(
      `  → filled ${missing.length + empty.length} gap(s) with English, dropped ${unknown.length} unknown key(s), sorted`
    );
  }

  console.log("");
}

console.log(
  anyProblem
    ? FILL
      ? "Gaps filled with English. Re-run without --fill to confirm."
      : "Some files need attention (run with --fill to patch gaps with English)."
    : "All translation files are complete and valid."
);
process.exit(anyProblem && !FILL ? 1 : 0);
