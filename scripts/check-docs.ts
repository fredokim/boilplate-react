/**
 * Fails when a document points at something that is not there, or when nothing
 * points at a document.
 *
 * Written after an audit found the README still describing a NestJS server that
 * used to live in `server/` — fourteen `npm run server:*` commands that no
 * package.json has had since the backend moved to its own repository, and a
 * line stating the frontend still runs on MSW long after it had been talking to
 * the real thing in production. Nothing failed, because nothing checked.
 *
 * Four rules, all mechanical:
 *
 *   1. `npm run x` in a document must be a script in package.json.
 *   2. A backticked repository path must exist.
 *   3. A relative Markdown link must resolve.
 *   4. Every document must be reachable by following links from the README.
 *
 * The last two arrived with the move into `docs/`. Rule 3 is what makes moving a
 * file safe: before it, every link was a guess. Rule 4 is why the move happened.
 * Twenty-two documents sat in the root linking to each other exactly zero times,
 * so "is this still true?" had no reader and no answer. A document nothing links
 * to is one nobody opens, and it rots in private.
 *
 * What this deliberately does not check is what a document *says*. `check:ai`
 * used to assert that `AI_WORKFLOW.md` contained the string
 * "Developer-Owned Decisions" — so renaming that heading to something clearer
 * failed CI, while replacing the section's contents with nonsense passed. A
 * check that pins spelling makes documentation worse and calls it quality.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const HISTORICAL_MARKER = "<!-- doc-check: historical -->";
const HISTORICAL_DIRS = ["prompts/", "docs/history/"];

/** Prefixes that name something in this repository rather than an npm package or a URL. */
const PATH_ROOTS = ["src", "scripts", "tools", "tests", "e2e", "prisma", "config", "docs", "app", "public", "contracts"];

/**
 * Where the walk starts. Anything the README cannot reach, directly or through
 * another document, is unreachable for a reader too.
 */
const ENTRY = "README.md";

/**
 * Reachability is not asked of these. A pull request template is opened by
 * GitHub, not linked to, and historical records are kept rather than read.
 */
const NOT_LINKED_ON_PURPOSE = [".github/", "prompts/", "docs/history/"];

type Problem = { doc: string; kind: "script" | "path" | "link" | "orphan"; detail: string };

const KIND_LABEL: Record<Problem["kind"], string> = {
  script: "no such script",
  path: "no such path",
  link: "link goes nowhere",
  orphan: "nothing links to this document",
};

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

/** Relative links only. An external URL is somebody else's to keep working. */
function relativeLinks(text: string): string[] {
  return [...text.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)]
    .flatMap((match) => (match[1] === undefined ? [] : [match[1]]))
    .filter((target) => !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target));
}

/** `docs/x.md#a-heading` and `docs/x.md?v=1` both point at `docs/x.md`. */
function targetPath(doc: string, target: string): string {
  const withoutFragment = target.split(/[#?]/)[0] ?? "";
  const absolute = resolve(ROOT, dirname(doc), withoutFragment);

  return relative(ROOT, absolute).replace(/\\/g, "/");
}

function main(): void {
  const packageJson = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  const scripts = new Set(Object.keys(packageJson.scripts ?? {}));
  const problems: Problem[] = [];
  const docs = trackedDocs();
  const linksOut = new Map<string, string[]>();

  for (const doc of docs) {
    const text = readFileSync(resolve(ROOT, doc), "utf8");
    const historical = isHistorical(doc, text);

    // Links are checked even in historical documents: a record of a past layout
    // still should not offer a link that goes nowhere today.
    const targets = relativeLinks(text).map((target) => targetPath(doc, target));

    linksOut.set(doc, targets);

    for (const target of targets) {
      if (target === "" || target.startsWith("..")) continue;
      if (!existsSync(resolve(ROOT, target))) problems.push({ doc, kind: "link", detail: target });
    }

    if (historical) continue;

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

  // Rule 4: walk out from the README and see what is left over.
  const reached = new Set<string>([ENTRY]);
  const queue = [ENTRY];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) continue;

    for (const target of linksOut.get(current) ?? []) {
      if (!target.endsWith(".md") || reached.has(target)) continue;
      reached.add(target);
      queue.push(target);
    }
  }

  for (const doc of docs) {
    if (reached.has(doc)) continue;
    if (NOT_LINKED_ON_PURPOSE.some((prefix) => doc.startsWith(prefix))) continue;
    problems.push({ doc, kind: "orphan", detail: `not reachable from ${ENTRY}` });
  }

  if (problems.length === 0) {
    console.log(`check:docs — ${String(docs.length)} documents, ${String(reached.size)} reachable from ${ENTRY}, nothing stale.`);
    return;
  }

  console.error("Documents reference things that do not exist:\n");
  for (const { doc, kind, detail } of problems) {
    console.error(`  ${doc}: ${KIND_LABEL[kind]} — ${detail}`);
  }
  console.error(
    `\n${String(problems.length)} problem(s). Fix the document, link it from ${ENTRY}, or mark it historical with ${HISTORICAL_MARKER} if it records a past state on purpose.`,
  );
  process.exit(1);
}

main();
