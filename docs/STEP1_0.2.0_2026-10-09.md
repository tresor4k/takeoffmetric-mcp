# 0.2.0 step 1 - titles, annotations, instructions, source URLs (2026-10-09)

Branch `v0.2.0-step1`, from `3b10dc6`. Nothing pushed, nothing published, version still 0.1.1.
Input: section 5 of `TakeoffMetrics/research/audits/quality_gate_ai_2026-10-09.md`.

## 1. Tool titles and annotations

- `src/tools.js`: each calc_* tool takes its title from `vendor/registry.json` (the page title on takeoffmetric.com,
  15 to 24 characters); `list_calculators` = "List Calculators", `search_constants` = "Search Estimating Constants".
- One frozen `ANNOTATIONS` object on all 17 tools: `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`,
  `openWorldHint: false`.
- Network check: `src/`, `bin/` and `vendor/engine.mjs` contain no `fetch(`, no `node:http(s)`/`net`/`dns`/`child_process`,
  no dynamic import. Only import outside the SDK: `node:fs` (reads `vendor/registry.json` and `vendor/constants.csv`).
  No tool calls the network or a model, so `openWorldHint: false` holds for all 17.
- `src/server.js`: `tools/list` now returns `title` and `annotations` (it returned name, description, inputSchema only).

## 2. Server instructions

`src/server.js` exports `INSTRUCTIONS` (646 characters) passed to the SDK `Server` options:
what the server covers, imperial or metric through `system`, same engine as takeoffmetric.com with the page URL in each
result, local only with no network request, confirm with plans, supplier and local code. No "open source" claim.

## 3. Third-party source URLs (the 10 non-200 of the audit)

Checked 2026-10-09 with curl following redirects (browser UA), then the 403/307 ones in a visible Chromium (Playwright).
"Same document" = PDF opened and the passage behind the row found in it.

| Before | After | HTTP now | Reason |
|---|---|---|---|
| https://www.quikrete.com/PDFs/DATA_SHEET-Concrete%20Mix%201101.pdf | https://www.quikrete.com/pdfs/data_sheet-concrete%20mix%201101.pdf | 301 -> 200 (PDF) | CHANGED. Same data sheet: "PRODUCT NO. 1101-40, -50, -60, -80, -90", yields per bag 40/50/60/80/90 lb (rows CON-001..005, values withheld). |
| https://www.nist.gov/document/doc-ps-20-20-american-softwood-lumber-standard-revision-1-oct-2021 | https://www.nist.gov/system/files/documents/2021/10/26/PS%2020-20%20Revsion%201%20October%202021.pdf | 302 -> 200 (PDF) | CHANGED. Same standard: "Voluntary Product Standard PS 20-20 Revision 1", "Table 3. Nominal and minimum-dressed sizes" (rows LUM-002..016). "Revsion" is NIST's own spelling. |
| https://web.archive.org/web/2024/https://www.gaf.com/en-us/document-library/documents/data-sheets/seal-a-ridge-ridge-cap-shingles-sell-sheet-reshr112.pdf | https://web.archive.org/web/20250709161926/https://www.gaf.com/en-us/document-library/documents/data-sheets/seal-a-ridge-ridge-cap-shingles-sell-sheet-reshr112.pdf | 302 -> 200 (PDF) | CHANGED. Same sell sheet RESHR112, passage "4 bundles cover 100 linear feet" (row ROF-003, value withheld). Snapshot now pinned instead of the fuzzy `/web/2024/`. |
| https://web.archive.org/web/2024/https://www.gaf.com/en-us/document-library/documents/specifications/timberline-hdz-shingles-spec-sheet-resgn467hdz.pdf | unchanged | 302 -> 500 | KEPT, TO REVIEW. The redirect lands on snapshot 20250817051922, which answers 500 (Wayback error page). No replacement guessed. |
| https://www.grc.nasa.gov/www/k-12/airplane/viscosity.html | unchanged | 200 | KEPT. The audit's 500 did not reproduce: 200, title "Viscosity". |
| https://www.northbaymaterials.com/landscape-material-density-calculator | unchanged | 301 -> 404 | KEPT, TO REVIEW. Redirects to terrabaymaterials.com (same path), which answers 404. No replacement guessed. |
| https://marenakos.com/conversion-and-coverages/ | unchanged | 307 (to itself) | KEPT. Bot challenge page "You are being redirected..."; in a browser it loads "Conversion and Coverages - Marenakos Rock Center" at the same URL. |
| https://www.cat.com/en_US/articles/ci-articles/earthwork-volumes-reference-tables.html | unchanged | 403 (curl) / 200 (browser) | KEPT. 403 to automated clients, opens in a browser: "Material Density Tables to Help Estimate Earthwork Volumes". |
| https://extension.missouri.edu/publications/g5050 | unchanged | 403 (curl and browser) | KEPT. Also 403 "Restricted Content" in a visible browser from this machine (possibly a geographic block); not confirmed openable, so no comment added. |
| https://highways.dot.gov/federal-lands/pddm/dpg/earthwork-design | unchanged | 403 (curl and browser) | KEPT. Also 403 "Access Denied" in a visible browser from this machine; not confirmed openable, so no comment added. |

Copies changed identically (byte replacement, every occurrence): `vendor/constants.csv` (5 + 15 + 1 rows, `source_url`;
the withheld-row note is built from it at run time) and `test/constants.test.mjs` (Quikrete URL, 2 occurrences).
`vendor/engine.mjs` only names Marenakos as a source key, no URL. README and docs carry none of the 10 URLs.
The 403 comments live in this report only: the CSV has no comment syntax and its `notes` column is dataset content.

Upstream copies NOT changed (outside this repository): `vendor/constants.csv` is copied by `scripts/sync-engine.mjs`
from `../TakeoffMetrics-open-data/us-construction-estimating-constants/constants.csv`; the next sync reverts these 3 URLs
unless the dataset (and its published copies) gets the same change.

## 4. Test

`test/protocol.test.mjs`: "initialize returns instructions and every tool a title and the four boolean annotations"
(real binary over stdio: `getInstructions()` non-empty string; each tool `title` string of 1 to 40 characters;
`annotations` deep-equal to the four booleans).

- Red on the old code (`git stash push -- src/server.js src/tools.js`): 73 tests, 72 pass, 1 fail
  (`expected: 'string'`, `actual: 'undefined'` on the instructions).
- Green after `git stash pop`: 73 tests, 73 pass.
- Raw stdio check (`initialize`, `notifications/initialized`, `tools/list`): protocol 2025-06-18, serverInfo 0.1.1,
  `instructions` 646 characters, 17 tools each with its title and the four annotations.

Note: `docs/` is the docs.page source; move or exclude this report before the branch is pushed if it should not appear there.
