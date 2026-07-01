// Extracts distinct Korean UI strings from client-rendered source files.
// Output: scripts/.tmp-korean-strings.json  (sorted, deduped)
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "../apps/web/src");

// Files whose text is rendered into the browser DOM (translated at runtime).
const INCLUDE_DIRS = ["app", "components"];
const INCLUDE_LIB = [
  "lib/mirilook-styles.ts",
  "lib/mirilook-colors.ts",
  "lib/mirilook-regions.ts",
  "lib/mirilook-demographics.ts",
  "lib/mirilook-community.ts",
  "lib/mirilook-marketplace.ts",
  "lib/mirilook-notifications.ts",
  "lib/mirilook-social.ts",
  "lib/mirilook-payments.ts",
  "lib/mirilook-jobs.ts",
  "lib/printable-report.ts",
];
// Skip API routes / server-only — not rendered as DOM text.
const SKIP = /[\\/](api|server|trigger)[\\/]/;
const SKIP_FILES = new Set(["mirilook-i18n.ts"]);

const KOREAN = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules") continue;
      out.push(...(await walk(full)));
    } else if (/\.(tsx?|jsx?)$/.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

function extractFromSource(code) {
  const found = new Set();

  // 1) Quoted/backtick string literals containing Korean.
  const stringRe = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let m;
  while ((m = stringRe.exec(code))) {
    const raw = m[2];
    if (!KOREAN.test(raw)) continue;
    if (raw.includes("${")) continue; // skip template-literal interpolation pieces
    const val = raw.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\'/g, "'").trim();
    if (val) found.add(val);
  }

  // 2) JSX text between tags: >  텍스트  <
  const jsxRe = />([^<>{}]*?)</g;
  while ((m = jsxRe.exec(code))) {
    const text = m[1].replace(/\s+/g, " ").trim();
    if (text && KOREAN.test(text)) found.add(text);
  }

  return found;
}

const files = [];
for (const d of INCLUDE_DIRS) files.push(...(await walk(path.join(SRC, d))));
for (const f of INCLUDE_LIB) files.push(path.join(SRC, f));

const all = new Set();
const byFile = {};
for (const f of files) {
  if (SKIP.test(f)) continue;
  if (SKIP_FILES.has(path.basename(f))) continue;
  let code;
  try {
    code = await fs.readFile(f, "utf8");
  } catch {
    continue;
  }
  const found = extractFromSource(code);
  if (found.size) {
    byFile[path.relative(SRC, f).replace(/\\/g, "/")] = [...found];
    for (const s of found) all.add(s);
  }
}

const sorted = [...all].sort((a, b) => a.localeCompare(b, "ko"));
const outPath = path.join(__dirname, ".tmp-korean-strings.json");
await fs.writeFile(outPath, JSON.stringify({ count: sorted.length, strings: sorted, byFile }, null, 2), "utf8");
console.log(`Extracted ${sorted.length} distinct Korean strings from ${Object.keys(byFile).length} files.`);
console.log(`-> ${outPath}`);
