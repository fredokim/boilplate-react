/**
 * Refreshes `contracts/openapi.json` from the server that owns it.
 *
 * The backend is a separate repository, and it publishes the spec: a drift check
 * there fails if the committed file stops matching the code, so the file on
 * `main` is the contract rather than a snapshot of it.
 *
 * This used to copy from `../boilplate-server/openapi.json`, which quietly made
 * "the two repositories are checked out as siblings" part of the build. It was
 * true on one machine. A URL is true everywhere, and it is the same source a CI
 * job in either repository would read.
 *
 * Nobody has to run this to use the boilerplate. `contracts/openapi.json` is
 * committed, so a clone builds, tests, and checks its contract with no network
 * and no server. Syncing is for the person changing the API.
 *
 * `SERVER_REPO` points at a local checkout instead, for working on both at once.
 */
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const TARGET = resolve(ROOT, "contracts/openapi.json");
const SPEC_URL = "https://raw.githubusercontent.com/fredokim/boilplate-server/main/openapi.json";

async function fromServer(): Promise<string> {
  const response = await fetch(SPEC_URL);

  if (!response.ok) {
    throw new Error(`${SPEC_URL} answered ${String(response.status)}. The spec was not written.`);
  }

  const text = await response.text();

  // A truncated response, or an HTML error page, would otherwise be committed as
  // the contract and fail much later as something that looks like a code bug.
  JSON.parse(text);

  return text;
}

async function main(): Promise<void> {
  mkdirSync(dirname(TARGET), { recursive: true });

  const localCheckout = process.env.SERVER_REPO;

  if (localCheckout) {
    const source = resolve(localCheckout, "openapi.json");
    copyFileSync(source, TARGET);
    console.log(`[contract] Copied ${source}`);
    return;
  }

  writeFileSync(TARGET, await fromServer(), "utf8");
  console.log("[contract] Fetched openapi.json from boilplate-server@main");
}

main().catch((error: unknown) => {
  console.error(`[contract] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
