# Data license — constants table

`vendor/constants.csv` is a copy of version 1.1.0 of the dataset *US Construction Estimating Constants*, published at
https://github.com/tresor4k/us-construction-estimating-constants.

It is **not** covered by the MIT license of the server code. It keeps its own terms:

- **The compilation** (selection of rows, SI conversions, conditions, notes, column structure) is licensed under Creative
  Commons Attribution 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/.
- **Values from federal publications** are works of the US government and in the public domain.
- **Any other value** stays under the terms of its publisher. It is not relicensed by CC BY 4.0; each row names its
  publisher and links its source (`source_publisher`, `source_title`, `source_url`).
- **55 rows carry no value** (`values_withheld` = `true`): their publishers do not allow republication. Those rows keep the
  name of the quantity, its unit and the link to the source; `withheld_hosts` lists the domains concerned, and
  `search_constants` returns `value: null` with the instruction to read the value at `source_url`.
- Cite as: TakeoffMetric Editorial, *US Construction Estimating Constants*, version 1.1.0, 2026, takeoffmetric.com.

The `search_constants` tool returns the source columns with every row so the attribution travels with the value.
