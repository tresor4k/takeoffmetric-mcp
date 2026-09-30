// Engine parity: fixtures computed from the site's TypeScript source (scripts/make-fixtures.mjs)
// are replayed through the MCP tool handlers, which run the vendored bundle.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { tools } from "../src/tools.js";

const { cases } = JSON.parse(readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"));
const byName = new Map(tools.map((t) => [t.name, t]));

test("fixtures cover the 15 calculators with at least 45 cases", () => {
  assert.ok(cases.length >= 45, `only ${cases.length} cases`);
  assert.equal(new Set(cases.map((c) => c.name)).size, 15);
});

for (const c of cases) {
  test(`${c.name}: ${c.label}`, () => {
    const { payload, isError } = byName.get(c.name).handler({ ...c.args, system: c.system });
    assert.equal(isError, false, JSON.stringify(payload.errors));
    // Same JSON round trip as the fixture file and as the MCP text content.
    const got = JSON.parse(JSON.stringify(payload));
    assert.equal(got.calculator, c.name);
    assert.equal(got.system, c.system);
    for (const key of Object.keys(c.expected)) {
      assert.deepEqual(got[key], c.expected[key], key);
    }
  });
}
