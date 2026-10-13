// Maintainer script (run with tsx): computes the parity fixtures from the site's TypeScript SOURCE,
// not from vendor/engine.mjs. The test suite replays them through the MCP handlers (bundle path).
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { debrand } from "./brands.mjs";
import { CALCULATORS } from "./calculators.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = resolve(root, process.env.TAKEOFFMETRIC_SITE ?? "../TakeoffMetrics/site");

const digest = (x) => createHash("sha256").update(debrand(JSON.stringify(x))).digest("hex");

/** A non-default case derived from the input specs: the first three plain numeric fields, raised by half. */
function vary(specs) {
  const args = {};
  for (const s of specs) {
    if (Object.keys(args).length >= 3) break;
    if (s.advanced || s.optional || s.kind === "select" || s.kind === "toggle") continue;
    if (typeof s.default !== "number" || s.default <= 0) continue;
    const raised = Math.min(s.default * 1.5, s.max ?? Infinity);
    args[s.key] = Number.isInteger(s.default) ? Math.ceil(raised) : raised;
  }
  return args;
}

// Raising rise and run together keeps the same slope, so the pitch case is written by hand.
const OVERRIDES = { calc_roof_pitch: { rise: 8 } };

const cases = [];
for (const c of CALCULATORS) {
  const mod = await import(pathToFileURL(join(site, "src/engine/formulas", `${c.file}.ts`)).href);
  const spec = mod[c.spec];
  const parse = mod[c.parse];
  const varied = OVERRIDES[c.name] ?? vary(spec.inputs);
  if (!Object.keys(varied).length) throw new Error(`${c.name}: no numeric input to vary`);
  const primaries = {};
  for (const [label, system, args] of [
    ["defaults", "imperial", {}],
    ["defaults", "metric", {}],
    ["non-default", "imperial", varied],
    ["non-default", "metric", varied],
  ]) {
    const { inputs, errors } = parse(args, system);
    if (errors.length) throw new Error(`${c.name} ${label} ${system}: ${JSON.stringify(errors)}`);
    const r = spec.compute(inputs);
    if (label === "defaults") primaries[system] = JSON.stringify(r.primary);
    else if (primaries[system] === JSON.stringify(r.primary)) {
      throw new Error(`${c.name} ${label} ${system}: primary did not move, pick other inputs`);
    }
    cases.push({
      name: c.name,
      label: `${label} ${system}`,
      system,
      args,
      // A digest, not the answer: the engine defaults include values whose publishers do not allow
      // republication (refonte A), so the fixture file carries none of them. Names rewritten as in the bundle.
      sha256: digest({ version: spec.version, revised: spec.revised, inputs, result: r }),
    });
  }
}

writeFileSync(join(root, "test/fixtures.json"), `${JSON.stringify({ cases }, null, 1)}\n`);
console.log(`test/fixtures.json: ${cases.length} cases for ${CALCULATORS.length} calculators`);
