// Refonte A (D151, D152, D172): no value the dataset withholds and no name of its publisher may leave the server,
// whether in a tool definition, an answer or a shipped file. This file carries none of those values: they are read
// at run time from vendor/engine.mjs, through the engine symbols that vendor/constants.csv lists for each withheld
// row. Every value typed below is synthetic.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { CONSTANTS } from "../src/constants.js";
import { tools } from "../src/tools.js";

const calcs = tools.filter((t) => t.name.startsWith("calc_"));
const byName = new Map(tools.map((t) => [t.name, t]));
const call = (name, args) => byName.get(name).handler(args).payload;

// The roofing product names (D172) and the publishers of the withheld rows.
const BRAND = /gaf|timberline|feltbuster|seal[-_ ]?a[-_ ]?ridge|pro[-_ ]?start|hdz/i;
const PUBLISHERS =
  /quikrete|caterpillar|nucor|\bgaf\b|asphalt institute|minnesota asphalt|north bay|utah state|\busu\b|missouri|\btrex\b|\bAPA\b/i;

// ------------------------------------------------------------------ withheld values, read from the engine
const engineText = readFileSync(new URL("../vendor/engine.mjs", import.meta.url), "utf8");
// the bundle renames the roofing identifiers (scripts/brands.mjs): SEAL_A_RIDGE_X -> MFR_RIDGE_X,
// PRO_START_X -> MFR_STARTER_X, FELTBUSTER_X -> MFR_X
const symbolOf = (s) =>
  s.trim().replace(/SEAL_A_RIDGE/g, "MFR_RIDGE").replace(/PRO_START/g, "MFR_STARTER").replace(/feltbuster|hdz/gi, "MFR");
const withheld = CONSTANTS.filter((r) => r.values_withheld === "true");
const exprs = [...new Set(withheld.flatMap((r) => r.engine_symbol.split(";").map(symbolOf)))];
const bases = [...new Set(exprs.map((e) => e.match(/^[A-Z_0-9]+/)[0]))].filter((b) => new RegExp(`\\bvar ${b} =`).test(engineText));
const probe = join(tmpdir(), `tm-withheld-probe-${process.pid}.mjs`);
writeFileSync(probe, `${engineText}\nexport const __W = { ${bases.join(", ")} };\n`);
const { __W } = await import(pathToFileURL(probe).href);
rmSync(probe);
const evaluate = (e) => {
  try {
    return new Function(...bases, `return (${e});`)(...bases.map((b) => __W[b]));
  } catch {
    return undefined;
  }
};
// A unit definition is not a value of a publisher's product: 1 board foot = 144 cubic inches (LUM-001) stays in
// the board foot formula. Small whole numbers and powers of ten would match any answer, so the scan skips them;
// the structural tests below cover those (no default, `needed`, no product count).
const DEFINITIONS = new Set(["CU_IN_PER_BOARD_FOOT"]);
const values = [
  ...new Set(
    exprs
      .filter((e) => !DEFINITIONS.has(e))
      .map(evaluate)
      .filter((v) => typeof v === "number" && Number.isFinite(v))
      .filter((v) => !(Number.isInteger(v) && v <= 100) && !Number.isInteger(Math.log10(v)))
      // one significant digit (0.3, 0.0003) would match any answer too
      .filter((v) => String(v).replace(/^0\.0*|\./g, "").replace(/0+$/, "").length >= 2),
  ),
];
const patterns = values.flatMap((v) => {
  const forms = new Set([String(v), v.toLocaleString("en-US", { maximumFractionDigits: 6 })]);
  if (v > 500) forms.add(Math.round((v * 0.45359237) / 0.764554857984).toLocaleString("en-US")); // lb/cu yd -> kg/m3
  if (v < 1 && v > 0.05) forms.add(String(Math.round(v * 28.316846592 * 10) / 10)); // cu ft -> L
  return [...forms].map((f) => ({ v, f, rx: new RegExp(`(?<![\\d.,])${f.replace(/[.,]/g, "\\$&")}(?![\\d])`) }));
});

const leak = (label, text) => {
  const hit = patterns.find((p) => p.rx.test(text));
  assert.equal(hit, undefined, `${label}: withheld value ${hit?.f}`);
  const name = text.match(PUBLISHERS) ?? text.match(BRAND);
  assert.equal(name, null, `${label}: publisher or product name "${name?.[0]}"`);
};

// Synthetic values for every input a withheld value became.
const SYNTHETIC = {
  bagYield: 0.37,
  stockLength: 33,
  baseDensity: 1777,
  beddingDensity: 1999,
  density: 1777,
  plantWeight: 141,
  bundlesPerSquare: 2.7,
  rollSquares: 7,
  ridgeLfPerBundle: 31,
  starterLfPerBundle: 77,
  eps: 0.00041,
};
// The refonte, tool by tool: the inputs the user now types instead of a withheld engine default.
const REPLACED = {
  calc_concrete_slab: ["bagYield"],
  calc_concrete_cost: ["bagYield"],
  calc_fence: ["bagYield"],
  calc_paver_base: ["baseDensity", "beddingDensity"],
  calc_gravel: ["density"],
  calc_sand: ["density"],
  calc_asphalt: ["plantWeight"],
  calc_rebar: ["stockLength"],
  calc_roofing: ["bundlesPerSquare", "rollSquares", "ridgeLfPerBundle", "starterLfPerBundle"],
  calc_duct: ["eps"],
};
const paramsOf = (t) => REPLACED[t.name] ?? [];

test("the probe reads the withheld engine values", () => {
  assert.ok(bases.length >= 15, `only ${bases.length} engine symbols found`);
  assert.ok(values.length >= 8, `only ${values.length} distinctive withheld values`);
});

test("the guard catches a withheld value and a name", () => {
  assert.throws(() => leak("self-test", `x ${values[0].toLocaleString("en-US")} y`));
  assert.throws(() => leak("self-test", `Bundles per square, ${"G" + "AF"} sheet`));
});

test("no withheld value or publisher name in any calculator definition", () => {
  for (const t of calcs) leak(`${t.name}: definition`, JSON.stringify({ d: t.description, t: t.title, s: t.inputSchema }));
});

test("no withheld value or publisher name in any answer, with or without the user's values", () => {
  for (const t of calcs) {
    const typed = Object.fromEntries(paramsOf(t).map((k) => [k, SYNTHETIC[k]]));
    for (const args of [{}, { system: "metric" }, typed, { ...typed, system: "metric" }]) {
      leak(`${t.name}(${JSON.stringify(args)})`, JSON.stringify(call(t.name, args)));
    }
  }
});

test("an input that replaces a withheld value has no default and is listed in needed until typed", () => {
  const replaced = calcs.filter((t) => paramsOf(t).length);
  assert.ok(replaced.length >= 10, `only ${replaced.length} tools`);
  for (const t of replaced) {
    for (const k of paramsOf(t)) assert.equal(t.inputSchema.properties[k].default, undefined, `${t.name}.${k}`);
    const bare = call(t.name, {});
    assert.deepEqual(bare.needed?.map((n) => n.key).sort(), paramsOf(t).sort(), t.name);
    const typed = call(t.name, Object.fromEntries(paramsOf(t).map((k) => [k, SYNTHETIC[k]])));
    assert.equal(typed.needed, undefined, `${t.name}: needed after typing`);
  }
  for (const [name, gone] of [["calc_concrete_slab", "bagSize"], ["calc_concrete_cost", "bagSize"], ["calc_fence", "bag"], ["calc_rebar", "stock"], ["calc_asphalt", "preset"]]) {
    assert.equal(byName.get(name).inputSchema.properties[gone], undefined, `${name}.${gone}`);
  }
});

test("counts follow the synthetic values the user typed", () => {
  const bags = (name, y) => call(name, { bagYield: y }).secondary.find((q) => /^Bags/.test(q.label)).value;
  for (const name of ["calc_concrete_slab", "calc_concrete_cost", "calc_fence"]) {
    const a = bags(name, 0.37);
    const b = bags(name, 0.74);
    assert.ok(a >= 2 * b - 1 && a <= 2 * b, `${name}: ${a} bags at 0.37 vs ${b} at 0.74`);
  }
  const roof = call("calc_roofing", { bundlesPerSquare: 2.7 });
  const squares = roof.secondary.find((q) => q.label === "Roofing squares").value;
  assert.equal(roof.primary.value, Math.ceil(squares * 2.7));
  assert.equal(call("calc_roofing", {}).primary.label, "Roofing squares");
  const gravel = call("calc_gravel", { density: 2000 });
  assert.ok(gravel.secondary.some((q) => /short tons/i.test(q.label)));
  assert.ok(!call("calc_gravel", {}).secondary.some((q) => /ton/i.test(q.label)));
  const rebar = (s) => call("calc_rebar", { stockLength: s }).primary.value;
  assert.ok(rebar(13) > rebar(33), "shorter stock bars, more bars");
});

test("no roofing product name in src/, bin/ or vendor/", () => {
  for (const dir of ["src", "bin", "vendor"]) {
    const base = new URL(`../${dir}/`, import.meta.url);
    for (const f of readdirSync(base)) {
      if (f === "constants.csv") continue; // the dataset names each source for attribution; its values are withheld
      const m = readFileSync(new URL(f, base), "utf8").match(BRAND);
      assert.equal(m, null, `${dir}/${f}: "${m?.[0]}"`);
    }
  }
});
