# Data license — constants table

`vendor/constants.csv` is a copy of the dataset *US Construction Estimating Constants*, published at
https://github.com/tresor4k/us-construction-estimating-constants.

It is **not** covered by the MIT license of the server code. It keeps its own terms:

- License: Creative Commons Attribution 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/,
  for the compilation. Each value remains attributed to its source.
- Cite as: TakeoffMetric Editorial, *US Construction Estimating Constants*, 2026, takeoffmetric.com.
- Values from federal publications are US government works. Values from other publishers stay attributed to them
  through the `source_publisher` and `source_url` columns of each row.

The `search_constants` tool returns those two columns with every row so the attribution travels with the value.
