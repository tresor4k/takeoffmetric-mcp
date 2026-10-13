// Engine parity: fixtures computed from the site's TypeScript source (scripts/make-fixtures.mjs) are replayed
// through the vendored bundle. A fixture keeps a SHA-256 of the engine answer, never the answer itself: the engine
// defaults include values whose publishers do not allow republication (refonte A, src/withheld.js).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CALCULATORS } from "../vendor/engine.mjs";
import { debrand } from "../scripts/brands.mjs";

const { cases } = JSON.parse(readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"));
const byName = new Map(CALCULATORS.map((c) => [c.name, c]));
const digest = (x) => createHash("sha256").update(debrand(JSON.stringify(x))).digest("hex");

test("fixtures cover the 15 calculators with at least 45 cases", () => {
  assert.ok(cases.length >= 45, `only ${cases.length} cases`);
  assert.equal(new Set(cases.map((c) => c.name)).size, 15);
});

for (const c of cases) {
  test(`${c.name}: ${c.label}`, () => {
    const calc = byName.get(c.name);
    const { inputs, errors } = calc.parse(c.args, c.system);
    assert.deepEqual(errors, []);
    const result = calc.spec.compute(inputs);
    const got = digest(JSON.parse(JSON.stringify({ version: calc.spec.version, revised: calc.spec.revised, inputs, result })));
    assert.equal(got, c.sha256);
  });
}
