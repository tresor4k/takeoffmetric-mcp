# Changelog

## 0.2.0 — 2026-10-13

### Changed (breaking)
- Refonte A (publisher terms): every engine default that is a withheld publisher value is now an input the user types,
  with no default. Without it the tool returns geometry and volumes and a `needed` list. Inputs: `bagYield`
  (concrete slab, concrete cost, fence; replaces `bagSize` / `bag`), `baseDensity` and `beddingDensity` (paver base),
  `density` (gravel, sand), `plantWeight` (asphalt; `preset` removed), `stockLength` (rebar; replaces `stock`), the four
  roofing coverages, `eps` (duct). No sentence naming those publishers is returned.
- `calc_roofing`: no manufacturer name anywhere in the package; the withheld figures stay in the vendored engine under
  anonymous constants and are never returned by a tool (D172).
- Engine resynced from the site (concrete volume headline = net volume; PS 20-25; duct roughness credit).
- `vendor/constants.csv` is dataset 1.2.0 (LUM-002 to LUM-016 cite NIST PS 20-25). Licence of the compilation unchanged.
- Parity fixtures keep a SHA-256 of each engine answer instead of the answer.

### Fixed
- `.gitattributes` `eol=lf`: the 0.1.2 tarball shipped `vendor/constants.csv` with CRLF line ends.

## 0.1.2 — 2026-10-09

### Added
- Every tool has a `title` and explicit annotations: `readOnlyHint: true`, `destructiveHint: false`,
  `idempotentHint: true`, `openWorldHint: false` (no tool calls the network or a model).
- The server sends `instructions`: what it computes, units, the engine it shares with takeoffmetric.com, and that results
  are to be confirmed against plans, supplier data and local code.

### Changed
- `vendor/constants.csv` is dataset 1.1.1: three source links that redirected now point to their final address, same
  documents (QUIKRETE No. 1101 data sheet, NIST PS 20-20 Revision 1, archived GAF RESHR112 sell sheet). No value changed.

## 0.1.1 — 2026-10-04

### Changed
- `vendor/constants.csv` is dataset 1.1.0: 55 rows whose publishers do not allow republication carry no value.
  `search_constants` returns them with `value: null`, `value_si: null`, `values_withheld: true`, `withheld_hosts` and a
  note pointing to `source_url`.
- `DATA_LICENSE.md`: CC BY 4.0 covers the compilation; federal values are public domain; other values stay under their
  publisher's terms.
- `scripts/sync-engine.mjs` copies the table from the published dataset repository.

## 0.1.0 — 2026-09-30

### Added
- 15 calculator tools (`calc_concrete_slab`, `calc_concrete_cost`, `calc_rebar`, `calc_gravel`, `calc_fill_dirt`,
  `calc_sand`, `calc_topsoil`, `calc_cubic_yard`, `calc_asphalt`, `calc_board_foot`, `calc_roofing`, `calc_roof_pitch`,
  `calc_fence`, `calc_duct`, `calc_paver_base`), each running the TakeoffMetric engine bundled in `vendor/engine.mjs`.
- `list_calculators` and `search_constants` (148-row constants table, CC BY 4.0).
- Input schemas generated from the engine's input specifications; stdio transport.
