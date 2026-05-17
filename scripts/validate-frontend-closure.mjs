import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] || path.resolve(process.cwd(), "frontend");
const exts = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".d.ts"];
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
      walk(full);
      continue;
    }
    if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
      files.push(full);
    }
  }
}

function existsResolved(base) {
  const candidates = [];
  if (path.extname(base)) candidates.push(base);
  else {
    for (const ext of exts) candidates.push(base + ext);
    for (const ext of exts) candidates.push(path.join(base, "index" + ext));
  }
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function resolveImport(fromFile, spec) {
  if (spec.startsWith("@/")) {
    return existsResolved(path.join(root, spec.slice(2)));
  }
  if (spec.startsWith(".")) {
    return existsResolved(path.resolve(path.dirname(fromFile), spec));
  }
  return "__external__";
}

walk(root);

const importRegex =
  /(?:import\s+(?:type\s+)?(?:[^"'`]+?\s+from\s+)?|export\s+[^"'`]*?\s+from\s+|require\()\s*["'`]([^"'`]+)["'`]\)?/g;

const unresolved = [];

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(importRegex)) {
    const spec = match[1];
    if (!spec || (!spec.startsWith(".") && !spec.startsWith("@/"))) continue;
    const resolved = resolveImport(file, spec);
    if (!resolved) {
      unresolved.push({
        file: path.relative(root, file),
        spec,
      });
    }
  }
}

if (!unresolved.length) {
  console.log(JSON.stringify({ ok: true, checkedFiles: files.length, unresolved: [] }, null, 2));
  process.exit(0);
}

console.log(JSON.stringify({ ok: false, checkedFiles: files.length, unresolved }, null, 2));
process.exit(2);
