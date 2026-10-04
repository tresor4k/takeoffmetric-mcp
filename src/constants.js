import { readFileSync } from "node:fs";

// The constants table is vendored from the TakeoffMetric open dataset (CC BY 4.0, see DATA_LICENSE.md).
const CSV_URL = new URL("../vendor/constants.csv", import.meta.url);

export const MAX_ROWS = 50;
const SEARCHED = ["category", "material_or_item", "quantity"];
const RETURNED = [
  "id",
  "category",
  "material_or_item",
  "quantity",
  "value",
  "unit",
  "value_si",
  "unit_si",
  "condition",
  "source_publisher",
  "source_title",
  "source_url",
  "used_by_tool_url",
  "values_withheld",
  "withheld_hosts",
];

/** A withheld row carries no value: its publisher does not allow republication, so the reader goes to the source. */
function toRow(r) {
  const row = Object.fromEntries(RETURNED.map((key) => [key, r[key]]));
  row.values_withheld = r.values_withheld === "true";
  if (row.values_withheld) {
    row.value = null;
    row.value_si = null;
    row.note = `This table does not republish this publisher's values: read the value at source_url (${r.source_url}).`;
  }
  return row;
}

/** RFC 4180 reader: quoted fields, doubled quotes, line breaks inside quotes. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch !== '"') field += ch;
      else if (src[i + 1] === '"') {
        field += '"';
        i += 1;
      } else quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows;
  return body
    .filter((r) => r.some((v) => v !== ""))
    .map((r) => Object.fromEntries(header.map((key, i) => [key, r[i] ?? ""])));
}

export const CONSTANTS = parseCsv(readFileSync(CSV_URL, "utf8"));
export const CONSTANT_CATEGORIES = [...new Set(CONSTANTS.map((r) => r.category))].sort();

/** Values are returned as written in the table (strings), so no digit is reformatted; withheld rows return null. */
export function searchConstants({ query, category } = {}) {
  const q = String(query ?? "").trim().toLowerCase();
  const cat = String(category ?? "").trim().toLowerCase();
  const matched = CONSTANTS.filter(
    (r) =>
      (!cat || r.category.toLowerCase() === cat) &&
      (!q || SEARCHED.some((key) => r[key].toLowerCase().includes(q)))
  );
  return {
    total_rows: CONSTANTS.length,
    matched: matched.length,
    returned: Math.min(matched.length, MAX_ROWS),
    truncated: matched.length > MAX_ROWS,
    license: "CC BY 4.0 for the compilation; each value stays under its publisher's terms (see source_url)",
    dataset: "https://github.com/tresor4k/us-construction-estimating-constants",
    rows: matched.slice(0, MAX_ROWS).map(toRow),
  };
}
