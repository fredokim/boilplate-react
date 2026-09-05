/**
 * Fails when a document points at something that is not there.
 *
 * Written after an audit found the README still describing a NestJS server that
 * used to live in `server/` — fourteen `npm run server:*` commands that no
 * package.json has had since the backend moved to its own repository, and a
 * line stating the frontend still runs on MSW long after it had been talking to
 * the real thing in production. Nothing failed, because nothing checked.
 *
 * Two rules, both mechanical:
 *
 *   1. `npm run x` in a document must be a script in package.json.
 *   2. A backticked repository path must exist.
 *
 * Historical documents are exempt. A record of how something was built at a
 * point in time is supposed to describe the layout of that time, and "fixing"
 * it would destroy the thing it is for. `prompts/` is historical by
 * construction; anything else opts out with the marker below, which is a
 * deliberate act rather than an entry in a list somewhere else.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const HISTORICAL_MARKER = "<!-- doc-check: historical -->";
const HISTORICAL_DIRS = ["prompts/"];

/** Prefixes that name something in this repository rather than an npm package or a URL. */
const PATH_ROOTS = ["src", "scripts", "tools", "tests", "e2e", "prisma", "config", "docs", "app", "public", "contracts"];

type Problem = { doc: string; kind: "script" | "path"; detail: string };

function trackedDocs(): string[] {
  return execFileSync("git", ["ls-files", "*.md"], { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function isHistorical(doc: string, text: string): boolean {
  return HISTORICAL_DIRS.some((dir) => doc.startsWith(dir)) || text.includes(HISTORICAL_MARKER);
}

/**
 * Resolved against the repository root and against `src/`.
 *
 * Some documents draw their tree from inside `src`, so `app/store` there means
 * `src/app/store`. Both readings are legitimate and neither is worth rewriting
 * a document over.
 */
function pathExists(candidate: string): boolean {
  return existsSync(resolve(ROOT, candidate)) || existsSync(resolve(ROOT, "src", candidate));
}

function main(): void {
  const packageJson = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  const scripts = new Set(Object.keys(packageJson.scripts ?? {}));
  const problems: Problem[] = [];
  const docs = trackedDocs();

  for (const doc of docs) {
    const text = readFileSync(resolve(ROOT, doc), "utf8");
    if (isHistorical(doc, text)) continue;

    for (const match of text.matchAll(/npm run ([a-z0-9:_-]+)/g)) {
      const script = match[1];
      if (script === undefined) continue;
      if (!scripts.has(script)) problems.push({ doc, kind: "script", detail: `npm run ${script}` });
    }

    for (const match of text.matchAll(/`((?:[A-Za-z0-9_.-]+\/)+[A-Za-z0-9_.*-]*)`/g)) {
      const candidate = match[1];
      if (candidate === undefined) continue;
      const root = candidate.split("/")[0];
      if (root === undefined || !PATH_ROOTS.includes(root)) continue;
      // Globs and placeholders describe a shape, not a file.
      if (/[*{}<>]/.test(candidate)) continue;
      if (!pathExists(candidate)) problems.push({ doc, kind: "path", detail: candidate });
    }
  }

  if (problems.length === 0) {
    console.log(`check:docs — ${String(docs.length)} documents, no stale scripts or paths.`);
    return;
  }

  console.error("Documents reference things that do not exist:\n");
  for (const { doc, kind, detail } of problems) {
    console.error(`  ${doc}: ${kind === "script" ? "no such script" : "no such path"} — ${detail}`);
  }
  console.error(
    `\n${String(problems.length)} problem(s). Fix the document, or mark it historical with ${HISTORICAL_MARKER} if it records a past state on purpose.`,
  );
  process.exit(1);
}

main();
