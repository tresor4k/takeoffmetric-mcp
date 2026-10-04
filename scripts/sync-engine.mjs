// Maintainer script: vendors the TakeoffMetric engine into vendor/.
// Needs the site repository next to this one (or TAKEOFFMETRIC_SITE pointing at its site/ folder).
// npm users never run this: vendor/ is committed and shipped.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CALCULATORS, EXCLUDED } from "./calculators.mjs";

const ORIGIN = "https://takeoffmetric.com";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = resolve(root, process.env.TAKEOFFMETRIC_SITE ?? "../TakeoffMetrics/site");
const siteRepo = resolve(site, "..");
const vendor = join(root, "vendor");
const fwd = (p) => p.split("\\").join("/");
const formula = (file) => fwd(join(site, "src/engine/formulas", `${file}.ts`));

mkdirSync(vendor, { recursive: true });

// 1. Engine bundle: one entry that re-exports each spec and its parse function.
const entry = [
  ...CALCULATORS.map((c, i) => `import { ${c.spec} as s${i}, ${c.parse} as p${i} } from ${JSON.stringify(formula(c.file))};`),
  "export const CALCULATORS = [",
  ...CALCULATORS.map((c, i) => `  { name: ${JSON.stringify(c.name)}, spec: s${i}, parse: p${i} },`),
  "];",
  "",
].join("\n");

// The engine keeps its own terms (LICENSE, part 2); the notice travels at the top of the bundle.
const ENGINE_BANNER = [
  "// vendor/engine.mjs - Copyright (c) 2026 TakeoffMetric. All rights reserved.",
  "// Distributed with takeoffmetric-mcp so the server can run. Not covered by the MIT license of this package: see LICENSE.",
].join("\n");

const engineOut = join(vendor, "engine.mjs");
const result = await build({
  stdin: { contents: entry, resolveDir: site, loader: "ts", sourcefile: "takeoffmetric-mcp-entry.ts" },
  absWorkingDir: site,
  bundle: true,
  format: "esm",
  platform: "neutral",
  minify: false,
  legalComments: "none",
  banner: { js: ENGINE_BANNER },
  charset: "utf8",
  metafile: true,
  outfile: engineOut,
});

const inputs = Object.keys(result.metafile.inputs).sort();
const leaked = inputs.filter((f) => f.endsWith("data/tools.ts") || EXCLUDED.some((x) => f.endsWith(`formulas/${x}.ts`)));
if (leaked.length) {
  throw new Error(`Excluded files entered the bundle: ${leaked.join(", ")}`);
}

// 2. Registry extract: title, URL and summary of the shipped tools, read from the site registry.
//    The registry is bundled in memory only, so its imports never reach vendor/engine.mjs.
const registryBuild = await build({
  entryPoints: [fwd(join(site, "src/data/tools.ts"))],
  absWorkingDir: site,
  bundle: true,
  format: "esm",
  platform: "neutral",
  write: false,
});
const registryModule = await import(
  `data:text/javascript;base64,${Buffer.from(registryBuild.outputFiles[0].text).toString("base64")}`
);
const engine = await import(pathToFileURL(engineOut).href);
const registry = {};
for (const calc of engine.CALCULATORS) {
  const tool = registryModule.getTool(calc.spec.id);
  if (!tool) throw new Error(`${calc.name}: engine id "${calc.spec.id}" is not in the site registry`);
  if (tool.status !== "live") throw new Error(`${calc.name}: registry status is "${tool.status}", not "live"`);
  registry[calc.name] = { id: tool.id, title: tool.title, url: ORIGIN + tool.url, summary: tool.summary };
}
writeFileSync(join(vendor, "registry.json"), `${JSON.stringify(registry, null, 2)}\n`);

// 3. Constants table (see DATA_LICENSE.md): the published dataset, whose withheld rows carry no value.
const dataset = resolve(root, process.env.TAKEOFFMETRIC_DATASET ?? "../TakeoffMetrics-open-data/us-construction-estimating-constants");
copyFileSync(join(dataset, "constants.csv"), join(vendor, "constants.csv"));

// 4. Provenance.
const git = (...args) => execFileSync("git", ["-C", siteRepo, ...args], { encoding: "utf8" }).trim();
const dirty = git("status", "--porcelain", "--", "site/src/engine", "site/src/data", "open-data/construction-constants");
writeFileSync(
  join(vendor, "ENGINE_COMMIT.txt"),
  [
    `commit: ${git("rev-parse", "HEAD")}`,
    `date: ${new Date().toISOString()}`,
    `worktree: ${dirty ? "engine files had uncommitted changes" : "clean"}`,
    "",
  ].join("\n")
);

console.log(`vendor/engine.mjs: ${engine.CALCULATORS.length} calculators from ${inputs.length} source files`);
for (const f of inputs) console.log(`  ${f}`);
