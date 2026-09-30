import assert from "node:assert/strict";
import { test } from "node:test";
import { CONSTANTS, MAX_ROWS, searchConstants } from "../src/constants.js";

test("the vendored table has 148 rows", () => {
  assert.equal(CONSTANTS.length, 148);
  assert.equal(searchConstants().total_rows, 148);
  assert.equal(new Set(CONSTANTS.map((r) => r.id)).size, 148);
});

test("a known row round-trips", () => {
  const { matched, rows } = searchConstants({ query: "concrete mix no. 1101, 40 lb bag", category: "concrete" });
  assert.equal(matched, 1);
  assert.deepEqual(rows[0], {
    id: "CON-001",
    category: "concrete",
    material_or_item: "QUIKRETE Concrete Mix No. 1101, 40 lb bag",
    quantity: "yield of mixed concrete per bag",
    value: "0.30",
    unit: "ft3",
    value_si: "0.008495",
    unit_si: "m3",
    condition: "mixed concrete, approximate",
    source_publisher: "QUIKRETE",
    source_title: "Concrete Mix No. 1101 data sheet",
    source_url: "https://www.quikrete.com/PDFs/DATA_SHEET-Concrete%20Mix%201101.pdf",
    used_by_tool_url:
      "https://takeoffmetric.com/concrete/concrete-calculator/; https://takeoffmetric.com/concrete/footing-calculator/; https://takeoffmetric.com/concrete/concrete-cost-calculator/; https://takeoffmetric.com/decks-fences/fence-calculator/",
  });
});

test("a call returns at most 50 rows and says when it was cut", () => {
  const all = searchConstants({});
  assert.equal(all.matched, 148);
  assert.equal(all.rows.length, MAX_ROWS);
  assert.equal(all.truncated, true);
  assert.equal(searchConstants({ query: "no such material" }).matched, 0);
  assert.equal(searchConstants({ category: "CONCRETE" }).matched, searchConstants({ category: "concrete" }).matched);
});
