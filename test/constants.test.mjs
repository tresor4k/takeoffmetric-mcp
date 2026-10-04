import assert from "node:assert/strict";
import { test } from "node:test";
import { CONSTANTS, MAX_ROWS, searchConstants } from "../src/constants.js";

test("the vendored table has 148 rows", () => {
  assert.equal(CONSTANTS.length, 148);
  assert.equal(searchConstants().total_rows, 148);
  assert.equal(new Set(CONSTANTS.map((r) => r.id)).size, 148);
});

test("a withheld row returns no value and points to its source", () => {
  const { matched, rows } = searchConstants({ query: "concrete mix no. 1101, 40 lb bag", category: "concrete" });
  assert.equal(matched, 1);
  assert.deepEqual(rows[0], {
    id: "CON-001",
    category: "concrete",
    material_or_item: "QUIKRETE Concrete Mix No. 1101, 40 lb bag",
    quantity: "yield of mixed concrete per bag",
    value: null,
    unit: "ft3",
    value_si: null,
    unit_si: "m3",
    condition: "mixed concrete, approximate",
    source_publisher: "QUIKRETE",
    source_title: "Concrete Mix No. 1101 data sheet",
    source_url: "https://www.quikrete.com/PDFs/DATA_SHEET-Concrete%20Mix%201101.pdf",
    used_by_tool_url:
      "https://takeoffmetric.com/concrete/concrete-calculator/; https://takeoffmetric.com/concrete/footing-calculator/; https://takeoffmetric.com/concrete/concrete-cost-calculator/; https://takeoffmetric.com/decks-fences/fence-calculator/",
    values_withheld: true,
    withheld_hosts: "quikrete.com",
    note: "This table does not republish this publisher's values: read the value at source_url (https://www.quikrete.com/PDFs/DATA_SHEET-Concrete%20Mix%201101.pdf).",
  });
});

test("55 rows are withheld and none of them returns a value", () => {
  const withheld = CONSTANTS.filter((r) => r.values_withheld === "true");
  assert.equal(withheld.length, 55);
  for (const r of withheld) assert.equal(r.value + r.value_si, "", r.id);
  for (const category of new Set(withheld.map((r) => r.category))) {
    for (const row of searchConstants({ category }).rows.filter((x) => x.values_withheld)) {
      assert.equal(row.value, null, row.id);
      assert.equal(row.value_si, null, row.id);
      assert.ok(row.note.includes(row.source_url), row.id);
    }
  }
});

test("a row from an open source keeps its value", () => {
  const open = CONSTANTS.filter((r) => r.values_withheld === "false");
  assert.equal(open.length, 93);
  const row = searchConstants({ query: open[0].quantity }).rows.find((x) => x.id === open[0].id);
  assert.equal(row.values_withheld, false);
  assert.equal(row.value, open[0].value);
  assert.notEqual(row.value, "");
  assert.equal(row.note, undefined);
});

test("a call returns at most 50 rows and says when it was cut", () => {
  const all = searchConstants({});
  assert.equal(all.matched, 148);
  assert.equal(all.rows.length, MAX_ROWS);
  assert.equal(all.truncated, true);
  assert.equal(searchConstants({ query: "no such material" }).matched, 0);
  assert.equal(searchConstants({ category: "CONCRETE" }).matched, searchConstants({ category: "concrete" }).matched);
});
