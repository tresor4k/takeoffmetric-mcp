// The 15 calculators shipped in 0.1.0: MCP tool name -> engine file and export names.
// Names only. Every formula, constant and rounding rule stays in the site engine.
export const CALCULATORS = [
  { name: "calc_concrete_slab", file: "concrete/slab", spec: "slabSpec", parse: "parseSlabInputs" },
  { name: "calc_concrete_cost", file: "concrete/concrete-cost", spec: "concreteCostSpec", parse: "parseConcreteCostInputs" },
  { name: "calc_rebar", file: "concrete/rebar", spec: "rebarSpec", parse: "parseRebarInputs" },
  { name: "calc_gravel", file: "earthwork/gravel", spec: "gravelSpec", parse: "parseGravelInputs" },
  { name: "calc_fill_dirt", file: "earthwork/fill-dirt", spec: "fillDirtSpec", parse: "parseFillDirtInputs" },
  { name: "calc_sand", file: "earthwork/sand", spec: "sandSpec", parse: "parseSandInputs" },
  { name: "calc_topsoil", file: "earthwork/topsoil", spec: "topsoilSpec", parse: "parseTopsoilInputs" },
  { name: "calc_cubic_yard", file: "measure/cubic-yard", spec: "cubicYardSpec", parse: "parseCubicYardInputs" },
  { name: "calc_asphalt", file: "paving/asphalt", spec: "asphaltSpec", parse: "parseAsphaltInputs" },
  { name: "calc_board_foot", file: "framing/board-foot", spec: "boardFootSpec", parse: "parseBoardFootInputs" },
  { name: "calc_roofing", file: "roofing/roofing", spec: "roofingSpec", parse: "parseRoofingInputs" },
  { name: "calc_roof_pitch", file: "roofing/roof-pitch", spec: "roofPitchSpec", parse: "parseRoofPitchInputs" },
  { name: "calc_fence", file: "decks/fence", spec: "fenceSpec", parse: "parseFenceInputs" },
  { name: "calc_duct", file: "hvac/duct", spec: "ductSpec", parse: "parseDuctInputs" },
  { name: "calc_paver_base", file: "masonry/paver-base", spec: "paverBaseSpec", parse: "parsePaverBaseInputs" },
];

// Engine files that must never enter the bundle in 0.1.0 (build spec, section 3).
export const EXCLUDED = [
  "masonry/mortar",
  "masonry/block",
  "concrete/footing",
  "framing/rafter",
  "framing/wall-framing",
  "stairs/stair-stringer",
  "decks/deck",
  "plumbing/pipe-weight",
  "framing/firewood",
];
