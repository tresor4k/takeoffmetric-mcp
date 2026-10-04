# takeoffmetric-mcp

A Model Context Protocol server (stdio) that runs the construction calculators of TakeoffMetric
(https://takeoffmetric.com/) from an MCP client. It ships 15 calculators, a tool that lists them, and a search
over a table of estimating constants in which every row names its published source.

The calculators are not re-implemented here. The site's TypeScript engine is bundled unchanged into
`vendor/engine.mjs`, and the test suite checks that each tool returns what the engine source computes.

## Install

Requires Node.js 20 or later.

```bash
npx -y takeoffmetric-mcp
```

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "takeoffmetric": {
      "command": "npx",
      "args": ["-y", "takeoffmetric-mcp"]
    }
  }
}
```

Claude Code:

```bash
claude mcp add takeoffmetric -- npx -y takeoffmetric-mcp
```

## Tools

| Tool | What it returns |
|---|---|
| `calc_concrete_slab` | Concrete volume, order quantity, bags, truck loads and weight for a slab, with extra sections and an optional thickened edge. |
| `calc_concrete_cost` | Concrete cost from your own delivered price, with short-load fee, delivery, and bags compared with ready-mix. |
| `calc_rebar` | Bar count each way, lap splices, stock bars, weight, intersections and supports for a slab grid or a continuous footing. |
| `calc_gravel` | Cubic yards, short tons and metric tonnes of gravel, stone or rock, with the compaction conversion and a truck count. |
| `calc_fill_dirt` | Cubic yards, tons and truck loads of fill dirt, loose or in place. |
| `calc_sand` | Cubic yards, short tons and a bag count for sand, by moisture condition. |
| `calc_topsoil` | Cubic yards, bags, weight and coverage of topsoil for a lawn, a top-dressing pass, a garden bed or a raised box. |
| `calc_cubic_yard` | Cubic yards, cubic feet and cubic meters over several areas, the area a volume covers, swell, bags and truck trips. |
| `calc_asphalt` | Short tons and metric tonnes of hot mix by course and by area, with the spread rate. |
| `calc_board_foot` | Board feet, lineal feet, pieces and cost for a lumber order of several sizes. |
| `calc_roofing` | Squares, shingle bundles, underlayment rolls, ridge cap and starter from the plan footprint and the pitch. |
| `calc_roof_pitch` | Rise in 12, angle, grade and slope factor from any one of them, plus ridge height and common rafter length from a span. |
| `calc_fence` | Posts, rails, pickets, gates and post-hole concrete for a fence line. |
| `calc_duct` | Round and rectangular duct size from airflow and a friction rate or velocity limit, what a duct carries, and a reducing trunk. |
| `calc_paver_base` | Crushed stone base, bedding sand and excavation depth under a paver patio, driveway or street. |

Two more tools complete the server:

- `list_calculators`: tool name, title, page URL, one-line description and input keys of each calculator.
- `search_constants`: rows of the constants table matched by a substring (`query`) and/or a `category`, 50 rows at most per call.

### Inputs

Each calculator's input schema is generated at start-up from the engine's own input list, so keys, bounds, options
and defaults are the ones of the matching form on the site.

- Every input is optional. A key you leave out takes the engine default, as an untouched form field does.
- `system` is `"imperial"` (default) or `"metric"`. It sets the unit the numbers are typed in and the defaults.
- A length is a number in the unit named in its description, or a string that carries its unit, such as `"20 ft 6 in"`.
- An unknown key or an out-of-range value returns `isError: true` with one message per field. Nothing is computed from a clamped value.

### Output

A JSON text block: `calculator`, `url`, `system`, `engine_version`, `revised`, `inputs_used`, `primary`, `secondary`,
`takeoff`, `warnings`, `assumptions`. `inputs_used` is the engine's normalized input (lengths in metres). `assumptions`
lists what the result rests on, and `warnings` carries the cautions the page would show.

## Worked example

Request (`tools/call`, tool `calc_concrete_slab`):

```json
{"length":24,"width":16,"thickness":"5 in","price":165}
```

Response, copied from a run of this server (whitespace condensed):

```json
{
  "calculator": "calc_concrete_slab",
  "url": "https://takeoffmetric.com/concrete/concrete-calculator/",
  "system": "imperial",
  "engine_version": "1.2.0",
  "revised": "2026-09-19",
  "inputs_used": {"system":"imperial","sections":[{"length":7.315200000000001,"width":4.8768},{"length":0,"width":0},{"length":0,"width":0}],"thickness":0.127,"wastePct":10,"bagSize":"60","pricePerCuYd":165,"thickenedEdge":false,"edgeDepth":0.30479999999999996,"edgeWidth":0.30479999999999996,"gravelDepth":0.1016,"unitWeight":150,"truckCuYd":10,"minLoadCuYd":null,"shortLoadFee":null},
  "primary": {"value":6.52,"unit":"cuyd","label":"Concrete volume","precision":2},
  "secondary": [
    {"value":6.75,"unit":"cuyd","label":"Order quantity","precision":2},
    {"value":176,"unit":"cuft","label":"Concrete volume","precision":1},
    {"value":384,"unit":"sqft","label":"Slab area","precision":0},
    {"value":26400,"unit":"lb","label":"Concrete weight","precision":0},
    {"value":392,"unit":"bag","label":"60 lb bags","precision":0},
    {"value":1,"unit":"load","label":"Truck loads","precision":0},
    {"value":10,"unit":"ft","label":"Control-joint spacing","display":"10'-0″ to 15'-0″"},
    {"value":1113.75,"unit":"usd","label":"Estimated concrete cost","precision":2}
  ],
  "takeoff": [
    {"key":"readymix","item":"Ready-mix concrete","qty":5.93,"unit":"cuyd","waste":10,"order":6.75,"orderUnit":"cuyd","note":"Rounded up to the nearest 0.25 cu yd."},
    …
    {"key":"trucks","item":"Ready-mix truck loads","qty":6.52,"unit":"cuyd","order":1,"orderUnit":"load","note":"10 cu yd per load (your assumption)."},
    {"key":"gravel","item":"Compacted base, 4″","qty":4.74,"unit":"cuyd","order":6.5,"orderUnit":"cuyd","note":"Loose volume ordered = compacted volume x 1.31 (3,570 / 2,730 lb/cu yd, FHWA Exhibit 5.1 A, gravel dry, average gradation; 1.17 uniformly graded, 1.49 well graded). For estimating purposes, ±33%: a highway embankment, not a plate-compacted base."},
    {"key":"cost","item":"Concrete cost at your price","qty":6.75,"unit":"cuyd","order":1113.75,"orderUnit":"usd","note":"6.75 cu yd x $165.00 / cu yd."}
  ],
  "warnings": [
    {"level":"caution","code":"too-many-bags","message":"392 bags is a day of mixing. Price a ready-mix delivery instead."}
  ],
  "assumptions": [
    "Volume = length x width x thickness; 1 cubic yard = 27 cubic feet.",
    "Waste allowance 10% applied to the net volume.",
    "Ready-mix rounded up to 0.25 cu yd; truck capacity 10 cu yd (editable).",
    …
    "Unit weight 150 lb/cu ft (editable; normal-weight concrete runs about 140-155).",
    "Contraction joints at 24-36 times the slab thickness, capped at 15 ft (NRMCA CIP 6).",
    "Thickness, reinforcement and base depth come from your drawings or local code."
  ]
}
```

## How the numbers are sourced

- Formulas, constants and rounding rules come from the engine bundle. `vendor/ENGINE_COMMIT.txt` records the commit it
  was built from, and every response carries the calculator's `engine_version` and `revised` date.
- Each tool computes with the same engine as its page on the site. `calc_gravel`, for instance, runs the engine
  behind https://takeoffmetric.com/earthwork/gravel-calculator/.
- `search_constants` reads `vendor/constants.csv` (dataset 1.1.0, 148 rows). Each row gives the value, its unit, the SI
  value, the condition it applies to, and the publisher, title and URL of the document it was read from. 55 rows carry
  no value because their publishers do not allow republication: they return `value: null`, `values_withheld: true`,
  the publisher's domains in `withheld_hosts`, and the URL where the value can be read.
- The site's methodology (tested formulas, assumptions shown on the page, sources as documents, versioned sheets) is
  at https://takeoffmetric.com/methodology/.

## Limits

- Results are estimates. Confirm quantities with your plans, your supplier and your local code before ordering or building.
- This release covers 15 calculators. Calculators that apply building-code provisions, or that rely on third-party
  tables the site links to without reproducing them, are not part of it.
- Responses carry numbers and notes only: no drawing and no CSV export.
- `unit` fields use the engine's unit codes. Several results that are not plain counts are coded `ea`; read `label`
  and `display` for their meaning.
- Prices are whatever you type in. The server holds no price data and makes no network request.
- Transport is stdio only.

## Development

```bash
npm install
npm test
```

The tests run with this repository alone. `npm run sync-engine` and `npm run make-fixtures` are maintainer scripts:
they rebuild `vendor/` and `test/fixtures.json` from the site's source repository, which users of the package never need.

## License

Server code: MIT. Calculation engine (`vendor/engine.mjs`): copyright TakeoffMetric, distributed with this package to run
as part of it, not licensed for modification or separate redistribution. Both are set out in `LICENSE`.
Constants table: CC BY 4.0 for the compilation; federal values are public domain; any other value stays under its
publisher's terms. See `DATA_LICENSE.md`.
