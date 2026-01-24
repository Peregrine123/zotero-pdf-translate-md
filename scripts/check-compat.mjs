import fs from "node:fs";
import process from "node:process";

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function fail(msg) {
  // eslint-disable-next-line no-console
  console.error(`check:compat: ${msg}`);
  process.exit(1);
}

const pkg = readJson("package.json");
const addonId = pkg?.config?.addonID;
const expectedMin = pkg?.config?.zoteroStrictMinVersion;
const expectedMax = pkg?.config?.zoteroStrictMaxVersion;

if (!addonId) fail("missing package.json config.addonID");
if (!expectedMin) fail("missing package.json config.zoteroStrictMinVersion");
if (!expectedMax) fail("missing package.json config.zoteroStrictMaxVersion");

function resolveMaybePlaceholder(v) {
  if (typeof v !== "string") return v;
  if (!v.startsWith("__") || !v.endsWith("__")) return v;
  const key = v.slice(2, -2);
  return pkg?.config?.[key];
}

const manifest = readJson("addon/manifest.json");
const manMin =
  manifest?.applications?.zotero?.strict_min_version ??
  manifest?.applications?.Zotero?.strict_min_version;
const manMax =
  manifest?.applications?.zotero?.strict_max_version ??
  manifest?.applications?.Zotero?.strict_max_version;

if (!manMin)
  fail("addon/manifest.json missing applications.zotero.strict_min_version");
if (!manMax)
  fail("addon/manifest.json missing applications.zotero.strict_max_version");

const resolvedMin = resolveMaybePlaceholder(manMin);
const resolvedMax = resolveMaybePlaceholder(manMax);

if (resolvedMin !== expectedMin) {
  fail(
    `addon/manifest.json strict_min_version mismatch (got ${JSON.stringify(
      manMin,
    )} -> ${JSON.stringify(resolvedMin)}, expected ${JSON.stringify(
      expectedMin,
    )})`,
  );
}
if (resolvedMax !== expectedMax) {
  fail(
    `addon/manifest.json strict_max_version mismatch (got ${JSON.stringify(
      manMax,
    )} -> ${JSON.stringify(resolvedMax)}, expected ${JSON.stringify(
      expectedMax,
    )})`,
  );
}

function checkUpdateFile(path) {
  const data = readJson(path);
  const updates = data?.addons?.[addonId]?.updates;
  if (!Array.isArray(updates) || updates.length === 0) {
    return;
  }

  for (const u of updates) {
    const app = u?.applications?.zotero;
    if (!app) continue;
    if (app.strict_min_version !== expectedMin) {
      fail(
        `${path} strict_min_version mismatch (got ${JSON.stringify(
          app.strict_min_version,
        )}, expected ${JSON.stringify(expectedMin)})`,
      );
    }
    if (app.strict_max_version !== expectedMax) {
      fail(
        `${path} strict_max_version mismatch (got ${JSON.stringify(
          app.strict_max_version,
        )}, expected ${JSON.stringify(expectedMax)})`,
      );
    }
  }
}

checkUpdateFile("update.json");
checkUpdateFile("update.rdf");

// eslint-disable-next-line no-console
console.log(
  `check:compat: OK (zotero ${expectedMin} .. ${expectedMax}, addonID=${addonId})`,
);
