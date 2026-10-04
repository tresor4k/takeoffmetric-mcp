# Changelog

## Unreleased

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
