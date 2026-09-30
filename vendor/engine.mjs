// vendor/engine.mjs - Copyright (c) 2026 TakeoffMetric. All rights reserved.
// Distributed with takeoffmetric-mcp so the server can run. Not covered by the MIT license of this package: see LICENSE.
// src/engine/units.ts
var IN_TO_M = 0.0254;
var FT_TO_M = 0.3048;
var LB_TO_KG = 0.45359237;
var UNITS = {
  // length -> metre
  in: { toBase: IN_TO_M, dimension: "length", symbol: "in", precision: 2 },
  ft: { toBase: FT_TO_M, dimension: "length", symbol: "ft", precision: 2 },
  yd: { toBase: FT_TO_M * 3, dimension: "length", symbol: "yd", precision: 2 },
  mm: { toBase: 1e-3, dimension: "length", symbol: "mm", precision: 0 },
  cm: { toBase: 0.01, dimension: "length", symbol: "cm", precision: 1 },
  m: { toBase: 1, dimension: "length", symbol: "m", precision: 3 },
  // area -> square metre
  sqft: { toBase: FT_TO_M ** 2, dimension: "area", symbol: "sq ft", precision: 1 },
  sqyd: { toBase: (FT_TO_M * 3) ** 2, dimension: "area", symbol: "sq yd", precision: 2 },
  sqm: { toBase: 1, dimension: "area", symbol: "m²", precision: 2 },
  // volume -> cubic metre
  cuft: { toBase: FT_TO_M ** 3, dimension: "volume", symbol: "cu ft", precision: 2 },
  cuyd: { toBase: (FT_TO_M * 3) ** 3, dimension: "volume", symbol: "cu yd", precision: 2 },
  l: { toBase: 1e-3, dimension: "volume", symbol: "L", precision: 0 },
  cum: { toBase: 1, dimension: "volume", symbol: "m³", precision: 3 },
  // mass -> kilogram
  lb: { toBase: LB_TO_KG, dimension: "mass", symbol: "lb", precision: 0 },
  ton: { toBase: LB_TO_KG * 2e3, dimension: "mass", symbol: "tn", precision: 2 },
  kg: { toBase: 1, dimension: "mass", symbol: "kg", precision: 0 },
  t: { toBase: 1e3, dimension: "mass", symbol: "t", precision: 2 },
  // dimensionless
  ea: { toBase: 1, dimension: "count", symbol: "ea", precision: 0 },
  bag: { toBase: 1, dimension: "count", symbol: "bags", precision: 0 },
  load: { toBase: 1, dimension: "count", symbol: "loads", precision: 0 },
  pct: { toBase: 1, dimension: "percent", symbol: "%", precision: 0 },
  usd: { toBase: 1, dimension: "money", symbol: "$", precision: 2 }
};
function convert(value, from, to) {
  const a = UNITS[from];
  const b = UNITS[to];
  if (!a || !b) throw new RangeError(`Unknown unit: ${!a ? from : to}`);
  if (a.dimension !== b.dimension) {
    throw new TypeError(`Cannot convert ${a.dimension} (${from}) to ${b.dimension} (${to})`);
  }
  if (from === to) return value;
  return value * a.toBase / b.toBase;
}
function toBase(value, from) {
  return value * UNITS[from].toBase;
}
function fromBase(base, to) {
  return base / UNITS[to].toBase;
}
function round(value, places = 0) {
  if (!Number.isFinite(value)) return value;
  const f = 10 ** places;
  const scaled = value * f;
  const nudged = scaled + Math.sign(scaled) * 1e-9 * Math.max(1, Math.abs(scaled));
  return Math.round(nudged) / f;
}
function roundUpWhole(value) {
  if (!Number.isFinite(value)) return 0;
  const r = Math.ceil(value - 1e-9);
  return r === 0 ? 0 : r;
}
function roundUpTo(value, step) {
  if (step <= 0) return value;
  const r = round(Math.ceil(value / step - 1e-9) * step, 6);
  return r === 0 ? 0 : r;
}
var GCD = (a, b) => b === 0 ? a : GCD(b, a % b);
function toFeetInches(totalInches, denominator = 16) {
  if (!Number.isFinite(totalInches)) return { negative: false, feet: 0, inches: 0, numerator: 0, denominator };
  const negative = totalInches < 0;
  const abs = Math.abs(totalInches);
  let sixteenths = Math.round(abs * denominator);
  let feet2 = Math.floor(sixteenths / (12 * denominator));
  sixteenths -= feet2 * 12 * denominator;
  let inches3 = Math.floor(sixteenths / denominator);
  let numerator = sixteenths - inches3 * denominator;
  let den = denominator;
  if (numerator === 0) {
    den = 1;
  } else {
    const g = GCD(numerator, den);
    numerator /= g;
    den /= g;
  }
  if (inches3 === 12) {
    inches3 = 0;
    feet2 += 1;
  }
  return { negative, feet: feet2, inches: inches3, numerator, denominator: den };
}
function formatFeetInches(metres, options = {}) {
  const { denominator = 16, unicode = false } = options;
  const parts = toFeetInches(fromBase(metres, "in"), denominator);
  const ftMark = unicode ? "′" : " ft";
  const inMark = unicode ? "″" : " in";
  const chunks = [];
  if (parts.feet) chunks.push(`${parts.feet}${ftMark}`);
  const inchText = parts.numerator > 0 ? parts.inches > 0 ? `${parts.inches} ${parts.numerator}/${parts.denominator}` : `${parts.numerator}/${parts.denominator}` : parts.inches > 0 || parts.feet === 0 ? `${parts.inches}` : "";
  if (inchText) chunks.push(`${inchText}${inMark}`);
  const body = chunks.join(unicode ? " " : " ").trim() || `0${inMark}`;
  return (parts.negative ? "-" : "") + body;
}
var FEET_INCH_RE = /^\s*(-)?\s*(?:(\d+(?:\.\d+)?)\s*(?:'|′|ft\b|feet\b|foot\b))?\s*(?:[-\s]*(\d+(?:\.\d+)?)?\s*(?:(\d+)\s*\/\s*(\d+))?\s*(?:"|″|in\b|inch(?:es)?\b))?\s*$/i;
var PLAIN_RE = /^\s*(-?\d+(?:\.\d+)?)\s*([a-z"'′″]*)\s*$/i;
var UNIT_ALIASES = {
  "": "ft",
  '"': "in",
  "″": "in",
  "'": "ft",
  "′": "ft",
  in: "in",
  inch: "in",
  inches: "in",
  ft: "ft",
  foot: "ft",
  feet: "ft",
  yd: "yd",
  yard: "yd",
  yards: "yd",
  mm: "mm",
  cm: "cm",
  m: "m",
  metre: "m",
  meter: "m",
  metres: "m",
  meters: "m"
};
function parseLength(raw, defaultUnit = "ft") {
  if (raw === null || raw === void 0) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? toBase(raw, defaultUnit) : null;
  const text = raw.trim().replace(/ /g, " ");
  if (text === "") return null;
  const plain = PLAIN_RE.exec(text);
  if (plain) {
    const n = Number(plain[1]);
    if (!Number.isFinite(n)) return null;
    const token = (plain[2] ?? "").toLowerCase();
    const unit = UNIT_ALIASES[token];
    if (unit === void 0) return null;
    const resolved = token === "" ? defaultUnit : unit;
    if (UNITS[resolved].dimension !== "length") return null;
    return toBase(n, resolved);
  }
  const dash = /^\s*(-)?\s*(\d+)\s*-\s*(\d+(?:\.\d+)?)\s*(?:(\d+)\s*\/\s*(\d+))?\s*$/.exec(text);
  if (dash && defaultUnit === "ft") {
    const sign = dash[1] ? -1 : 1;
    const inches3 = Number(dash[2]) * 12 + Number(dash[3]) + (dash[4] && dash[5] ? Number(dash[4]) / Number(dash[5]) : 0);
    return sign * toBase(inches3, "in");
  }
  const bareFraction = /^\s*(-)?\s*(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)\s*$/.exec(text);
  if (bareFraction) {
    const den = Number(bareFraction[4]);
    if (den === 0) return null;
    const sign = bareFraction[1] ? -1 : 1;
    const value = (bareFraction[2] ? Number(bareFraction[2]) : 0) + Number(bareFraction[3]) / den;
    return sign * toBase(value, defaultUnit);
  }
  const m = FEET_INCH_RE.exec(text);
  if (m && (m[2] !== void 0 || m[3] !== void 0 || m[4] !== void 0)) {
    const sign = m[1] ? -1 : 1;
    const feet2 = m[2] ? Number(m[2]) : 0;
    const inches3 = m[3] ? Number(m[3]) : 0;
    const num2 = m[4] ? Number(m[4]) : 0;
    const den = m[5] ? Number(m[5]) : 0;
    if (num2 > 0 && (!den || den === 0)) return null;
    const frac = num2 > 0 && den > 0 ? num2 / den : 0;
    return sign * toBase(feet2 * 12 + inches3 + frac, "in");
  }
  return null;
}
function parseNumber(raw) {
  if (raw === null || raw === void 0) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const text = raw.trim().replace(/[$,\s]/g, "").replace(/%$/, "");
  if (text === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}
function formatNumber(value, precision = 2, trim = true) {
  if (!Number.isFinite(value)) return "—";
  const rounded = round(value, precision);
  let out = rounded.toFixed(precision);
  if (trim && precision > 0) out = out.replace(/\.?0+$/, "");
  const [intPart = "0", decPart] = out.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart ? `${grouped}.${decPart}` : grouped;
}

// src/engine/validate.ts
var LENGTH_KINDS = /* @__PURE__ */ new Set(["length"]);
function defaultUnitFor(spec, system) {
  if (system === "metric") return spec.metricUnit ?? "m";
  const first = spec.units?.[0];
  return first ?? "ft";
}
function label(spec) {
  return spec.label;
}
function coerce(specs, raw, system = "imperial") {
  const values = {};
  const errors = [];
  const warnings = [];
  for (const spec of specs) {
    const present = Object.prototype.hasOwnProperty.call(raw, spec.key);
    const rawValue = present ? raw[spec.key] : void 0;
    const isBlank = rawValue === void 0 || rawValue === null || typeof rawValue === "string" && rawValue.trim() === "";
    if (spec.kind === "select") {
      const fallback = String(spec.default);
      const value = isBlank ? fallback : String(rawValue);
      const allowed = spec.options?.some((o) => o.value === value) ?? true;
      if (!allowed) {
        errors.push({ field: spec.key, code: "invalid", message: `${label(spec)}: unknown option.` });
        values[spec.key] = fallback;
      } else {
        values[spec.key] = value;
      }
      continue;
    }
    if (spec.kind === "toggle") {
      if (isBlank) {
        values[spec.key] = Boolean(spec.default);
      } else {
        const v = rawValue;
        values[spec.key] = v === true || v === 1 || v === "1" || v === "true" || v === "on" || v === "yes";
      }
      continue;
    }
    if (isBlank) {
      if (spec.optional) {
        values[spec.key] = null;
        continue;
      }
      if (present) {
        errors.push({ field: spec.key, code: "required", message: `${label(spec)} is required.` });
        values[spec.key] = null;
        continue;
      }
      const fallback = system === "metric" && spec.metricDefault !== void 0 ? spec.metricDefault : spec.default;
      values[spec.key] = coerceDefault(spec, fallback, system);
      continue;
    }
    let parsed;
    if (LENGTH_KINDS.has(spec.kind)) {
      parsed = parseLength(rawValue, defaultUnitFor(spec, system));
    } else {
      parsed = parseNumber(rawValue);
    }
    if (parsed === null) {
      errors.push({
        field: spec.key,
        code: "invalid",
        message: `${label(spec)}: enter a number${spec.kind === "length" ? `, like 20 or 20 ft 6 in` : ""}.`
      });
      values[spec.key] = null;
      continue;
    }
    if (!Number.isFinite(parsed)) {
      errors.push({ field: spec.key, code: "nonfinite", message: `${label(spec)}: value is out of range.` });
      values[spec.key] = null;
      continue;
    }
    const bounds = boundsInBase(spec, system);
    if (bounds.min !== void 0 && parsed < bounds.min) {
      errors.push({
        field: spec.key,
        code: "min",
        message: `${label(spec)}: must be at least ${formatBound(spec, spec.min, system)}.`
      });
    }
    if (bounds.max !== void 0 && parsed > bounds.max) {
      errors.push({
        field: spec.key,
        code: "max",
        message: `${label(spec)}: must be ${formatBound(spec, spec.max, system)} or less.`
      });
    }
    values[spec.key] = clamp(parsed, bounds.min, bounds.max);
  }
  return { values, errors, warnings };
}
function coerceDefault(spec, fallback, system) {
  if (typeof fallback === "boolean") return fallback;
  if (LENGTH_KINDS.has(spec.kind)) {
    return parseLength(fallback, defaultUnitFor(spec, system));
  }
  if (typeof fallback === "number") return fallback;
  return parseNumber(fallback);
}
function boundsInBase(spec, system) {
  if (!LENGTH_KINDS.has(spec.kind)) {
    const out2 = {};
    if (spec.min !== void 0) out2.min = spec.min;
    if (spec.max !== void 0) out2.max = spec.max;
    return out2;
  }
  const unit = defaultUnitFor(spec, system);
  const factor = UNITS[unit].toBase;
  const out = {};
  if (spec.min !== void 0) out.min = spec.min * factor;
  if (spec.max !== void 0) out.max = spec.max * factor;
  return out;
}
function formatBound(spec, bound, system) {
  if (!LENGTH_KINDS.has(spec.kind)) {
    return spec.kind === "percent" ? `${bound}%` : String(bound);
  }
  const unit = defaultUnitFor(spec, system);
  return `${bound} ${UNITS[unit].symbol}`;
}
function clamp(value, min, max) {
  let v = value;
  if (min !== void 0 && v < min) v = min;
  if (max !== void 0 && v > max) v = max;
  return v;
}
function num(values, key, fallback = 0) {
  const v = values[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function optNum(values, key) {
  const v = values[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function str(values, key, fallback = "") {
  const v = values[key];
  return typeof v === "string" ? v : fallback;
}
function bool(values, key) {
  return values[key] === true;
}

// src/data/reference/concrete.ts
var BAG_YIELDS = {
  "90": { size: "90", lb: 90, cuft: 0.675, perCuYd: 40 },
  "80": { size: "80", lb: 80, cuft: 0.6, perCuYd: 45 },
  "60": { size: "60", lb: 60, cuft: 0.45, perCuYd: 60 },
  "50": { size: "50", lb: 50, cuft: 0.375, perCuYd: 72 },
  "40": { size: "40", lb: 40, cuft: 0.3, perCuYd: 90 }
};
var BAG_SIZES = ["90", "80", "60", "50", "40"];
var BAG_NOTE = { "90": "regional availability" };
var CONCRETE_LB_PER_CUFT_DEFAULT = 150;
var CONCRETE_LB_PER_CUFT_MIN = 140;
var CONCRETE_LB_PER_CUFT_MAX = 155;
var TRUCK_CUYD_DEFAULT = 10;
var JOINT_SPACING_MIN_X = 24;
var JOINT_SPACING_MAX_X = 36;
var JOINT_SPACING_CAP_FT = 15;
var BASE_FHWA_RATIO = 1.31;
var READYMIX_INCREMENT_CUYD = 0.25;

// src/engine/formulas/concrete/slab.ts
var SLAB_ID = "concrete-calculator";
var SLAB_VERSION = "1.2.0";
var SLAB_REVISED = "2026-09-19";
var MAX_SECTIONS = 3;
var CUYD_TO_M3 = 0.764554857984;
var G_SECTIONS = { id: "sections", label: "Extra sections" };
var G_EDGE = { id: "edge", label: "Thickened edge (turndown)" };
var G_BASE = { id: "base", label: "Gravel base" };
var G_HAUL = { id: "haul", label: "Hauling & pricing assumptions" };
var slabInputs = [
  {
    key: "length",
    q: "l",
    label: "Length",
    kind: "length",
    units: ["ft", "in"],
    metricUnit: "m",
    default: 20,
    metricDefault: 6,
    min: 0,
    max: 1e3,
    hint: "Type 20, 20 ft 6 in or 20' 6″."
  },
  {
    key: "width",
    q: "w",
    label: "Width",
    kind: "length",
    units: ["ft", "in"],
    metricUnit: "m",
    default: 12,
    metricDefault: 3.6,
    min: 0,
    max: 1e3
  },
  {
    key: "thickness",
    q: "t",
    label: "Thickness",
    kind: "length",
    units: ["in", "ft"],
    metricUnit: "cm",
    default: "4in",
    metricDefault: "10cm",
    min: 0,
    max: 48,
    hint: "Common practice: 4″ for patios and walks, 5″–6″ under vehicles. Confirm with your plans and local code."
  },
  {
    key: "waste",
    q: "waste",
    label: "Waste allowance",
    kind: "percent",
    default: 10,
    min: 0,
    max: 25,
    step: 1,
    hint: "Covers subgrade dips, spillage and the last wheelbarrow."
  },
  {
    key: "bagSize",
    q: "bag",
    label: "Bag size",
    kind: "select",
    default: "60",
    options: BAG_SIZES.map((s) => ({
      value: s,
      label: BAG_NOTE[s] ? `${s} lb bag (${BAG_NOTE[s]})` : `${s} lb bag`
    }))
  },
  {
    key: "price",
    q: "p",
    label: "Ready-mix price",
    kind: "money",
    suffix: "$ / cu yd",
    metricFactor: CUYD_TO_M3,
    metricPerUnit: true,
    metricSuffix: "$ / m³",
    default: "",
    optional: true,
    min: 0,
    max: 5e3,
    hint: "Your delivered price, per the unit shown on the field. Leave blank to skip cost."
  },
  // ---- advanced -----------------------------------------------------
  { key: "length2", q: "l2", label: "Section 2 length", kind: "length", units: ["ft", "in"], metricUnit: "m", default: 0, min: 0, max: 1e3, advanced: true, group: G_SECTIONS },
  { key: "width2", q: "w2", label: "Section 2 width", kind: "length", units: ["ft", "in"], metricUnit: "m", default: 0, min: 0, max: 1e3, advanced: true, group: G_SECTIONS },
  { key: "length3", q: "l3", label: "Section 3 length", kind: "length", units: ["ft", "in"], metricUnit: "m", default: 0, min: 0, max: 1e3, advanced: true, group: G_SECTIONS },
  { key: "width3", q: "w3", label: "Section 3 width", kind: "length", units: ["ft", "in"], metricUnit: "m", default: 0, min: 0, max: 1e3, advanced: true, group: G_SECTIONS },
  {
    key: "edge",
    q: "e",
    label: "Thickened edge (turndown)",
    kind: "toggle",
    default: false,
    advanced: true,
    group: G_EDGE,
    hint: "A deeper perimeter strip poured monolithically with the slab."
  },
  { key: "edgeDepth", q: "ed", label: "Edge depth", kind: "length", units: ["in", "ft"], metricUnit: "cm", default: "12in", metricDefault: "30cm", min: 0, max: 60, advanced: true, group: G_EDGE, showWhen: "edge" },
  { key: "edgeWidth", q: "ew", label: "Edge width", kind: "length", units: ["in", "ft"], metricUnit: "cm", default: "12in", metricDefault: "30cm", min: 0, max: 60, advanced: true, group: G_EDGE, showWhen: "edge" },
  { key: "gravel", q: "g", label: "Gravel base depth", kind: "length", units: ["in", "ft"], metricUnit: "cm", default: "4in", metricDefault: "10cm", min: 0, max: 36, advanced: true, group: G_BASE, hint: "Set to 0 to leave the base off the takeoff." },
  {
    key: "unitWeight",
    q: "uw",
    label: "Unit weight",
    kind: "count",
    suffix: "lb / cu ft",
    default: CONCRETE_LB_PER_CUFT_DEFAULT,
    min: 90,
    max: 160,
    advanced: true,
    group: G_HAUL,
    hint: `Assumption, lb per cu ft. Normal-weight concrete runs about ${CONCRETE_LB_PER_CUFT_MIN}–${CONCRETE_LB_PER_CUFT_MAX}.`
  },
  {
    key: "truckCap",
    q: "tc",
    label: "Truck capacity",
    kind: "count",
    suffix: "cu yd",
    metricFactor: CUYD_TO_M3,
    metricSuffix: "m³",
    default: TRUCK_CUYD_DEFAULT,
    min: 1,
    max: 20,
    advanced: true,
    group: G_HAUL,
    hint: "Assumption, cubic yards per load. Ask your producer."
  },
  {
    key: "minLoad",
    q: "ml",
    label: "Producer minimum load",
    kind: "count",
    suffix: "cu yd",
    metricFactor: CUYD_TO_M3,
    metricSuffix: "m³",
    default: "",
    optional: true,
    min: 0,
    max: 20,
    advanced: true,
    group: G_HAUL,
    hint: "Cubic yards. Leave blank unless your producer quotes one."
  },
  {
    key: "shortFee",
    q: "sf",
    label: "Short-load fee",
    kind: "money",
    suffix: "$ flat",
    default: "",
    optional: true,
    min: 0,
    max: 5e3,
    advanced: true,
    group: G_HAUL,
    hint: "Flat charge your producer adds below that minimum."
  }
];
function parseSlabInputs(raw, system = "imperial") {
  const { values, errors } = coerce(slabInputs, raw, system);
  const sections = [
    { length: num(values, "length"), width: num(values, "width") },
    { length: num(values, "length2"), width: num(values, "width2") },
    { length: num(values, "length3"), width: num(values, "width3") }
  ].slice(0, MAX_SECTIONS);
  const bagSize = str(values, "bagSize", "60");
  const price = optNum(values, "price");
  const truckTyped = Object.prototype.hasOwnProperty.call(raw, "truckCap") ? optNum(values, "truckCap") : null;
  const minLoadTyped = optNum(values, "minLoad");
  const toCuYd = (v) => system === "metric" ? v / CUYD_TO_M3 : v;
  return {
    inputs: {
      system,
      sections,
      thickness: num(values, "thickness"),
      wastePct: num(values, "waste", 10),
      bagSize: BAG_SIZES.includes(bagSize) ? bagSize : "60",
      pricePerCuYd: price !== null && system === "metric" ? round(price * CUYD_TO_M3, 2) : price,
      thickenedEdge: bool(values, "edge"),
      edgeDepth: num(values, "edgeDepth"),
      edgeWidth: num(values, "edgeWidth"),
      gravelDepth: num(values, "gravel"),
      unitWeight: num(values, "unitWeight", CONCRETE_LB_PER_CUFT_DEFAULT),
      truckCuYd: truckTyped === null ? TRUCK_CUYD_DEFAULT : toCuYd(truckTyped),
      minLoadCuYd: minLoadTyped === null ? null : toCuYd(minLoadTyped),
      shortLoadFee: optNum(values, "shortFee")
    },
    errors
  };
}
var M3_TO_CUFT = 1 / 0.3048 ** 3;
var M3_TO_CUYD = M3_TO_CUFT / 27;
function jointLabel(metres) {
  const p = toFeetInches(fromBase(metres, "in"), 4);
  const frac = p.numerator > 0 ? ` ${p.numerator}/${p.denominator}` : "";
  return `${p.feet}'-${p.inches}${frac}″`;
}
function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}
function computeSlab(input) {
  const warnings = [];
  const i = {
    ...input,
    sections: input.sections.map((s) => ({ length: finite(s.length), width: finite(s.width) })),
    thickness: finite(input.thickness),
    wastePct: finite(input.wastePct, 10),
    edgeDepth: finite(input.edgeDepth),
    edgeWidth: finite(input.edgeWidth),
    gravelDepth: finite(input.gravelDepth),
    pricePerCuYd: input.pricePerCuYd === null ? null : finite(input.pricePerCuYd),
    unitWeight: Math.min(160, Math.max(90, finite(input.unitWeight, CONCRETE_LB_PER_CUFT_DEFAULT))),
    truckCuYd: Math.max(0.5, finite(input.truckCuYd, TRUCK_CUYD_DEFAULT)),
    minLoadCuYd: input.minLoadCuYd === null ? null : finite(input.minLoadCuYd),
    shortLoadFee: input.shortLoadFee === null ? null : finite(input.shortLoadFee)
  };
  const metric = i.system === "metric";
  const sectionsUsed = i.sections.filter((s) => s.length > 0 && s.width > 0);
  const hadNegative = i.sections.some((s) => s.length < 0 || s.width < 0) || i.thickness < 0;
  if (hadNegative) {
    warnings.push({
      level: "error",
      code: "negative-dimension",
      message: "Negative dimensions ignored. Enter positive lengths."
    });
  }
  const thickness = Math.max(0, i.thickness);
  const wastePct = Math.min(25, Math.max(0, i.wastePct));
  if (input.wastePct !== i.wastePct || i.wastePct > 25 || i.wastePct < 0) {
    warnings.push({
      level: "caution",
      code: "waste-clamped",
      message: "Waste clamped to 0-25%.",
      field: "waste"
    });
  }
  const area = sectionsUsed.reduce((sum, s) => sum + s.length * s.width, 0);
  const perimeter = sectionsUsed.reduce((sum, s) => sum + 2 * (s.length + s.width), 0);
  const slabVolume = area * thickness;
  let edgeVolume = 0;
  if (i.thickenedEdge && i.edgeDepth > thickness && i.edgeWidth > 0 && perimeter > 0) {
    edgeVolume = perimeter * i.edgeWidth * (i.edgeDepth - thickness);
  } else if (i.thickenedEdge && i.edgeDepth > 0 && i.edgeDepth <= thickness) {
    warnings.push({
      level: "caution",
      code: "edge-not-deeper",
      message: "Edge depth is not deeper than the slab, so it adds no concrete.",
      field: "edgeDepth"
    });
  }
  const netVolume = slabVolume + edgeVolume;
  const volumeWithWaste = netVolume * (1 + wastePct / 100);
  const gravelVolume = i.gravelDepth > 0 ? area * i.gravelDepth : 0;
  const cuft = volumeWithWaste * M3_TO_CUFT;
  const cuyd = volumeWithWaste * M3_TO_CUYD;
  const netCuyd = netVolume * M3_TO_CUYD;
  const orderCuYd = roundUpTo(cuyd, READYMIX_INCREMENT_CUYD);
  const bagYield = BAG_YIELDS[i.bagSize].cuft;
  const bags = roundUpWhole(cuft / bagYield);
  const trucks = roundUpWhole(cuyd / i.truckCuYd);
  const payload = metric ? `${formatNumber(i.truckCuYd * CUYD_TO_M3, 3)} m³` : `${formatNumber(i.truckCuYd, 2)} cu yd`;
  const minimum = metric ? `${formatNumber((i.minLoadCuYd ?? 0) * CUYD_TO_M3, 3)} m³` : `${formatNumber(i.minLoadCuYd ?? 0, 2)} cu yd`;
  const massLb = cuft * i.unitWeight;
  const massKg = massLb * 0.45359237;
  const shortLoad = i.minLoadCuYd !== null && i.shortLoadFee !== null && orderCuYd > 0 && orderCuYd < i.minLoadCuYd ? round(i.shortLoadFee, 2) : 0;
  const cost = i.pricePerCuYd !== null && i.pricePerCuYd >= 0 ? round(orderCuYd * i.pricePerCuYd + shortLoad, 2) : null;
  const jointCap = JOINT_SPACING_CAP_FT * 0.3048;
  const jointMin = Math.min(thickness * JOINT_SPACING_MIN_X, jointCap);
  const jointMax = Math.min(thickness * JOINT_SPACING_MAX_X, jointCap);
  if (sectionsUsed.length === 0) {
    warnings.push({
      level: "info",
      code: "no-dimensions",
      message: "Enter a length and a width to get a volume."
    });
  }
  if (thickness === 0 && sectionsUsed.length > 0) {
    warnings.push({ level: "info", code: "no-thickness", message: "Enter a thickness to get a volume.", field: "thickness" });
  }
  const thicknessIn = fromBase(thickness, "in");
  if (thicknessIn > 0 && thicknessIn < 3.5) {
    warnings.push({
      level: "caution",
      code: "thin-slab",
      message: `At ${formatNumber(thicknessIn, 2)}″ this is thinner than a normal 4″ slab. Thin slabs crack under point loads.`,
      field: "thickness"
    });
  }
  if (thicknessIn > 12) {
    warnings.push({
      level: "caution",
      code: "thick-slab",
      message: `${formatNumber(thicknessIn, 1)}″ is footing or mat territory, not a slab-on-grade. Check the design.`,
      field: "thickness"
    });
  }
  if (netVolume > 0 && cuyd < 1) {
    warnings.push({
      level: "info",
      code: "short-load",
      message: "Under 1 cubic yard, bags are often the cheaper way to place it. Ask your producer whether a minimum load applies."
    });
  }
  if (bags > 60) {
    warnings.push({
      level: "caution",
      code: "too-many-bags",
      message: `${formatNumber(bags, 0)} bags is a day of mixing. Price a ready-mix delivery instead.`
    });
  }
  if (trucks > 1) {
    warnings.push({
      level: "info",
      code: "multi-truck",
      message: `${trucks} truck loads. Confirm the placing rate so trucks are not waiting.`
    });
  }
  if (cuyd > 500) {
    warnings.push({
      level: "caution",
      code: "very-large",
      message: "Over 500 cubic yards. Re-check your units before ordering."
    });
  }
  const primary = metric ? { value: round(volumeWithWaste, 3), unit: "cum", label: "Concrete volume", precision: 2 } : { value: round(cuyd, 2), unit: "cuyd", label: "Concrete volume", precision: 2 };
  const secondary = metric ? [
    { value: round(orderCuYd * CUYD_TO_M3, 2), unit: "cum", label: "Order quantity", precision: 2 },
    { value: round(area, 2), unit: "sqm", label: "Slab area", precision: 2 },
    { value: round(massKg, 0), unit: "kg", label: "Concrete weight", precision: 0 },
    { value: bags, unit: "bag", label: `${i.bagSize} lb bags`, precision: 0 },
    { value: trucks, unit: "load", label: "Truck loads", precision: 0 }
  ] : [
    { value: orderCuYd, unit: "cuyd", label: "Order quantity", precision: 2 },
    { value: round(cuft, 2), unit: "cuft", label: "Concrete volume", precision: 1 },
    { value: round(convert(area, "sqm", "sqft"), 1), unit: "sqft", label: "Slab area", precision: 0 },
    { value: round(massLb, 0), unit: "lb", label: "Concrete weight", precision: 0 },
    { value: bags, unit: "bag", label: `${i.bagSize} lb bags`, precision: 0 },
    { value: trucks, unit: "load", label: "Truck loads", precision: 0 }
  ];
  if (jointMax > 0) {
    secondary.push({
      value: round(fromBase(jointMin, metric ? "m" : "ft"), 2),
      unit: metric ? "m" : "ft",
      label: "Control-joint spacing",
      // Both ends hit the 15 ft cap on thick slabs: print the cap once, not "15'-0″ to 15'-0″".
      display: jointMax - jointMin < 1e-9 ? metric ? `${formatNumber(jointMax, 2)} m max` : `${jointLabel(jointMax)} max` : metric ? `${formatNumber(jointMin, 2)}–${formatNumber(jointMax, 2)} m` : `${jointLabel(jointMin)} to ${jointLabel(jointMax)}`
    });
  }
  if (cost !== null) secondary.push({ value: cost, unit: "usd", label: "Estimated concrete cost", precision: 2 });
  const takeoff = [];
  if (netVolume > 0) {
    takeoff.push({
      key: "readymix",
      item: "Ready-mix concrete",
      qty: round(netCuyd, 2),
      unit: "cuyd",
      waste: wastePct,
      order: orderCuYd,
      orderUnit: "cuyd",
      note: `Rounded up to the nearest ${READYMIX_INCREMENT_CUYD} cu yd.`
    });
    takeoff.push({
      key: "bags",
      item: `Bagged concrete mix, ${i.bagSize} lb`,
      qty: round(cuft, 2),
      unit: "cuft",
      waste: wastePct,
      order: bags,
      orderUnit: "bag",
      note: `${bagYield} cu ft per bag.`
    });
    takeoff.push({
      key: "trucks",
      item: "Ready-mix truck loads",
      qty: round(cuyd, 2),
      unit: "cuyd",
      order: trucks,
      orderUnit: "load",
      note: `${payload} per load (your assumption).`
    });
  }
  if (gravelVolume > 0) {
    const gravelCuYd = gravelVolume * M3_TO_CUYD;
    takeoff.push({
      key: "gravel",
      item: `Compacted base, ${formatNumber(fromBase(i.gravelDepth, "in"), 1)}″`,
      qty: round(gravelCuYd, 2),
      unit: "cuyd",
      order: roundUpTo(gravelCuYd * BASE_FHWA_RATIO, 0.5),
      orderUnit: "cuyd",
      note: `Loose volume ordered = compacted volume x ${BASE_FHWA_RATIO} (3,570 / 2,730 lb/cu yd, FHWA Exhibit 5.1 A, gravel dry, average gradation; 1.17 uniformly graded, 1.49 well graded). For estimating purposes, ±33%: a highway embankment, not a plate-compacted base.`
    });
  }
  if (shortLoad > 0) {
    takeoff.push({
      key: "shortload",
      item: "Short-load fee quoted by your producer",
      qty: orderCuYd,
      unit: "cuyd",
      order: shortLoad,
      orderUnit: "usd",
      note: `Order is below the ${minimum} minimum you entered.`
    });
  }
  if (cost !== null && netVolume > 0) {
    takeoff.push({
      key: "cost",
      item: shortLoad > 0 ? "Concrete cost incl. short-load fee" : "Concrete cost at your price",
      qty: metric ? round(orderCuYd * CUYD_TO_M3, 3) : orderCuYd,
      unit: metric ? "cum" : "cuyd",
      order: cost,
      orderUnit: "usd",
      // The price is quoted back in the unit the reader typed it in, never in the
      // other system's: a note that says "cu yd" after the metric switch is false.
      note: (metric ? `${formatNumber(orderCuYd * CUYD_TO_M3, 3)} m³ x $${formatNumber((i.pricePerCuYd ?? 0) / CUYD_TO_M3, 2, false)} / m³` : `${orderCuYd} cu yd x $${formatNumber(i.pricePerCuYd ?? 0, 2, false)} / cu yd`) + (shortLoad > 0 ? ` + $${formatNumber(shortLoad, 2, false)} short-load fee.` : ".")
    });
  }
  const assumptions = [
    "Volume = length x width x thickness; 1 cubic yard = 27 cubic feet.",
    `Waste allowance ${wastePct}% applied to the net volume.`,
    `Ready-mix rounded up to ${READYMIX_INCREMENT_CUYD} cu yd; truck capacity ${payload} (editable).`,
    `Bag yield ${bagYield} cu ft per ${i.bagSize} lb bag of standard concrete mix.`,
    `Unit weight ${formatNumber(i.unitWeight, 0)} lb/cu ft (editable; normal-weight concrete runs about ${CONCRETE_LB_PER_CUFT_MIN}-${CONCRETE_LB_PER_CUFT_MAX}).`,
    `Contraction joints at ${JOINT_SPACING_MIN_X}-${JOINT_SPACING_MAX_X} times the slab thickness, capped at ${JOINT_SPACING_CAP_FT} ft (NRMCA CIP 6).`
  ];
  if (i.thickenedEdge && edgeVolume > 0) {
    assumptions.push("Turndown = perimeter x edge width x (edge depth - thickness); corners counted twice.");
  }
  if (sectionsUsed.length > 1) {
    assumptions.push(`${sectionsUsed.length} sections added together; overlapping sections are not detected.`);
  }
  assumptions.push("Thickness, reinforcement and base depth come from your drawings or local code.");
  return {
    primary,
    secondary,
    takeoff,
    warnings,
    assumptions,
    bags,
    trucks,
    cost,
    sectionsUsed,
    raw: { area, perimeter, netVolume, edgeVolume, volumeWithWaste, gravelVolume, massKg, jointMin, jointMax }
  };
}
var slabSpec = {
  id: SLAB_ID,
  version: SLAB_VERSION,
  revised: SLAB_REVISED,
  inputs: slabInputs,
  compute: computeSlab
};

// src/engine/formulas/concrete/concrete-cost.ts
var BAG_CUFT = {
  "90": 0.675,
  "80": 0.6,
  "60": 0.45,
  "50": 0.375,
  "40": 0.3
};
var BAG_ORDER = ["90", "80", "60", "50", "40"];
var BAG_90_NOTE = "regional availability";
var ORDER_STEP_CUYD = 0.25;
var CONCRETE_COST_ID = "concrete-cost-calculator";
var CONCRETE_COST_VERSION = "1.0.0";
var CONCRETE_COST_REVISED = "2026-09-20";
var COST_SHAPES = ["slab", "footing", "column"];
var CUYD_TO_M32 = 0.764554857984;
function finite2(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}
function shapeVolume(i) {
  if (i.shape === "footing") {
    const l2 = Math.max(0, finite2(i.footLength));
    const w2 = Math.max(0, finite2(i.footWidth));
    const d = Math.max(0, finite2(i.footDepth));
    return l2 * w2 * d;
  }
  if (i.shape === "column") {
    const dia = Math.max(0, finite2(i.diameter));
    const h = Math.max(0, finite2(i.height));
    const c = Math.max(0, Math.floor(finite2(i.count, 1)));
    return Math.PI * (dia / 2) ** 2 * h * c;
  }
  const l = Math.max(0, finite2(i.length));
  const w = Math.max(0, finite2(i.width));
  const t = Math.max(0, finite2(i.thickness));
  return l * w * t;
}
var G_MONEY = { id: "money", label: "Prices from your producer" };
var PLAN_LENGTH = {
  kind: "length",
  units: ["ft", "in"],
  metricUnit: "m",
  min: 0,
  max: 1e3
};
var SECTION_LENGTH = {
  kind: "length",
  units: ["in", "ft"],
  metricUnit: "cm",
  min: 0,
  max: 120
};
var THICKNESS_HINT = "Common practice: 4″ for patios and walks, 5″–6″ under vehicles. Confirm with your plans and local code.";
var concreteCostInputs = [
  {
    key: "shape",
    q: "s",
    label: "What you are pouring",
    kind: "select",
    default: "slab",
    options: COST_SHAPES.map((value) => ({ value }))
  },
  { ...PLAN_LENGTH, key: "length", q: "l", label: "Length", default: 20, metricDefault: 6, showWhen: "shape=slab" },
  { ...PLAN_LENGTH, key: "width", q: "w", label: "Width", default: 20, metricDefault: 6, showWhen: "shape=slab" },
  {
    ...SECTION_LENGTH,
    key: "thickness",
    q: "t",
    label: "Thickness",
    default: "4in",
    metricDefault: "10cm",
    max: 48,
    showWhen: "shape=slab",
    hint: THICKNESS_HINT
  },
  { ...PLAN_LENGTH, key: "footLength", q: "fl", label: "Footing length", default: 40, metricDefault: 12, showWhen: "shape=footing" },
  { ...SECTION_LENGTH, key: "footWidth", q: "fw", label: "Footing width", default: "16in", metricDefault: "40cm", showWhen: "shape=footing" },
  { ...SECTION_LENGTH, key: "footDepth", q: "fd", label: "Footing depth", default: "8in", metricDefault: "20cm", showWhen: "shape=footing" },
  { ...SECTION_LENGTH, key: "diameter", q: "dia", label: "Column diameter", default: "12in", metricDefault: "30cm", showWhen: "shape=column" },
  { ...PLAN_LENGTH, key: "height", q: "h", label: "Column height", default: 9, metricDefault: 2.7, max: 200, showWhen: "shape=column" },
  { key: "count", q: "n", label: "How many columns", kind: "count", default: 1, min: 1, max: 500, step: 1, showWhen: "shape=column" },
  {
    key: "waste",
    q: "waste",
    label: "Waste allowance",
    kind: "percent",
    default: 10,
    min: 0,
    max: 25,
    step: 1,
    hint: "Covers subgrade dips, spillage and the last wheelbarrow."
  },
  {
    key: "bagSize",
    q: "bag",
    label: "Bag size",
    kind: "select",
    default: "60",
    options: BAG_ORDER.map((s) => ({
      value: s,
      label: s === "90" ? `${s} lb bag (${BAG_90_NOTE})` : `${s} lb bag`
    }))
  },
  {
    key: "price",
    q: "p",
    label: "Ready-mix price",
    kind: "money",
    suffix: "$ / cu yd",
    metricFactor: CUYD_TO_M32,
    metricPerUnit: true,
    metricSuffix: "$ / m³",
    default: "",
    optional: true,
    min: 0,
    max: 5e3,
    hint: "Your delivered price, per the unit shown on the field. Leave blank to skip the cost."
  },
  {
    key: "pricePerBag",
    q: "pb",
    label: "Price per bag",
    kind: "money",
    suffix: "$ / bag",
    default: "",
    optional: true,
    min: 0,
    max: 500,
    hint: "Fill it in to compare bags with a truck at your own prices."
  },
  {
    key: "minLoad",
    q: "ml",
    label: "Producer minimum load",
    kind: "count",
    suffix: "cu yd",
    metricFactor: CUYD_TO_M32,
    metricSuffix: "m³",
    default: "",
    optional: true,
    min: 0,
    max: 20,
    advanced: true,
    group: G_MONEY,
    hint: "Cubic yards. Leave blank unless your producer quotes one."
  },
  {
    key: "shortFee",
    q: "sf",
    label: "Short-load fee",
    kind: "money",
    suffix: "$ flat",
    default: "",
    optional: true,
    min: 0,
    max: 5e3,
    advanced: true,
    group: G_MONEY,
    hint: "Flat charge your producer adds below that minimum."
  },
  {
    key: "delivery",
    q: "dl",
    label: "Delivery charge",
    kind: "money",
    suffix: "$ flat",
    default: "",
    optional: true,
    min: 0,
    max: 5e3,
    advanced: true,
    group: G_MONEY,
    hint: "Flat haul or fuel charge, when it is billed separately."
  }
];
var SHAPES = new Set(COST_SHAPES);
function parseConcreteCostInputs(raw, system = "imperial") {
  const { values, errors } = coerce(concreteCostInputs, raw, system);
  const shapeRaw = str(values, "shape", "slab");
  const bagRaw = str(values, "bagSize", "60");
  const price = optNum(values, "price");
  const minLoadTyped = optNum(values, "minLoad");
  return {
    inputs: {
      system,
      shape: SHAPES.has(shapeRaw) ? shapeRaw : "slab",
      length: num(values, "length"),
      width: num(values, "width"),
      thickness: num(values, "thickness"),
      footLength: num(values, "footLength"),
      footWidth: num(values, "footWidth"),
      footDepth: num(values, "footDepth"),
      diameter: num(values, "diameter"),
      height: num(values, "height"),
      count: num(values, "count", 1),
      wastePct: num(values, "waste", 10),
      bagSize: BAG_ORDER.includes(bagRaw) ? bagRaw : "60",
      pricePerCuYd: price !== null && system === "metric" ? round(price * CUYD_TO_M32, 2) : price,
      pricePerBag: optNum(values, "pricePerBag"),
      minLoadCuYd: minLoadTyped === null || system !== "metric" ? minLoadTyped : minLoadTyped / CUYD_TO_M32,
      shortFee: optNum(values, "shortFee"),
      delivery: optNum(values, "delivery")
    },
    errors
  };
}
var M3_TO_CUFT2 = 1 / 0.3048 ** 3;
var M3_TO_CUYD2 = M3_TO_CUFT2 / 27;
function optFinite(value) {
  if (value === null) return null;
  return Number.isFinite(value) && value >= 0 ? value : null;
}
function computeConcreteCost(input) {
  const warnings = [];
  const i = {
    ...input,
    wastePct: Math.min(25, Math.max(0, finite2(input.wastePct, 10))),
    count: Math.max(0, Math.floor(finite2(input.count, 1))),
    pricePerCuYd: optFinite(input.pricePerCuYd),
    pricePerBag: optFinite(input.pricePerBag),
    minLoadCuYd: optFinite(input.minLoadCuYd),
    shortFee: optFinite(input.shortFee),
    delivery: optFinite(input.delivery)
  };
  const metric = i.system === "metric";
  const slab = i.shape === "slab";
  if (input.wastePct !== i.wastePct) {
    warnings.push({ level: "caution", code: "waste-clamped", message: "Waste clamped to 0-25%.", field: "waste" });
  }
  const netVolume = shapeVolume(i);
  const volumeWithWaste = netVolume * (1 + i.wastePct / 100);
  const netCuFt = netVolume * M3_TO_CUFT2;
  const netCuYd = netVolume * M3_TO_CUYD2;
  const cuFtWithWaste = volumeWithWaste * M3_TO_CUFT2;
  const cuYdWithWaste = volumeWithWaste * M3_TO_CUYD2;
  const orderCuYd = roundUpTo(cuYdWithWaste, ORDER_STEP_CUYD);
  const orderVolume = orderCuYd * CUYD_TO_M32;
  const bagYield = BAG_CUFT[i.bagSize];
  const bags = roundUpWhole(cuFtWithWaste / bagYield);
  const priced = orderCuYd > 0;
  const shortLoad = i.minLoadCuYd !== null && i.shortFee !== null && orderCuYd > 0 && orderCuYd < i.minLoadCuYd ? round(i.shortFee, 2) : 0;
  const readyMixCost = i.pricePerCuYd !== null && priced ? round(orderCuYd * i.pricePerCuYd + shortLoad + (i.delivery ?? 0), 2) : null;
  const bagsCost = i.pricePerBag !== null && priced ? round(bags * i.pricePerBag, 2) : null;
  let cheaper = null;
  let gap = null;
  if (readyMixCost !== null && bagsCost !== null) {
    cheaper = readyMixCost <= bagsCost ? "ready-mix" : "bags";
    gap = round(Math.abs(readyMixCost - bagsCost), 2);
  }
  const area = slab ? Math.max(0, finite2(i.length)) * Math.max(0, finite2(i.width)) : 0;
  const areaSqFt = slab ? convert(area, "sqm", "sqft") : null;
  const headlineCost = readyMixCost !== null ? readyMixCost : bagsCost;
  const costPerSqFt = headlineCost !== null && areaSqFt !== null && areaSqFt > 0 ? round(headlineCost / areaSqFt, 2) : null;
  const costPerSqM = headlineCost !== null && area > 0 ? round(headlineCost / area, 2) : null;
  if (netVolume <= 0) {
    warnings.push({
      level: "info",
      code: "no-dimensions",
      message: slab ? "Enter a length, a width and a thickness to get a volume." : "Enter the dimensions of the pour to get a volume."
    });
  }
  if (netVolume > 0 && orderCuYd < 1) {
    warnings.push({
      level: "info",
      code: "short-load",
      message: "Under a cubic yard, bags are often the cheaper way to place it. Ask your producer whether a minimum load applies."
    });
  }
  if (bags > 60) {
    warnings.push({
      level: "caution",
      code: "too-many-bags",
      message: `${formatNumber(bags, 0)} bags is a day of mixing. Price a ready-mix delivery instead.`
    });
  }
  if (i.minLoadCuYd === null !== (i.shortFee === null)) {
    warnings.push({
      level: "caution",
      code: "fee-needs-both",
      message: "A short-load fee needs both figures before it can be applied: the minimum load your producer quotes and the flat fee below it.",
      field: i.minLoadCuYd === null ? "minLoad" : "shortFee"
    });
  }
  const netLine = metric ? `${formatNumber(netVolume, 3)} m³` : i.shape === "slab" ? `${formatNumber(areaSqFt ?? 0, 2)} sq ft × ${formatNumber(fromBase(i.thickness, "in"), 2)} in ÷ 12 = ${formatNumber(netCuFt, 2)} cu ft` : i.shape === "footing" ? `${formatNumber(fromBase(i.footLength, "ft"), 2)} ft × ${formatNumber(fromBase(i.footWidth, "in"), 2)} in × ${formatNumber(fromBase(i.footDepth, "in"), 2)} in ÷ 144 = ${formatNumber(netCuFt, 2)} cu ft` : `${i.count} × π × (${formatNumber(fromBase(i.diameter, "in"), 2)} in ÷ 24)² × ${formatNumber(fromBase(i.height, "ft"), 2)} ft = ${formatNumber(netCuFt, 2)} cu ft`;
  const orderNote = `${netLine}${metric ? "" : ", ÷ 27"}, +${formatNumber(i.wastePct, 0)} %, rounded up to the next ${ORDER_STEP_CUYD} cu yd.`;
  const volumeQuantity = metric ? { value: round(volumeWithWaste, 3), unit: "cum", label: "Concrete volume", precision: 2 } : { value: round(cuYdWithWaste, 2), unit: "cuyd", label: "Concrete volume", precision: 2 };
  const primary = readyMixCost !== null ? { value: readyMixCost, unit: "usd", label: "Ready-mix cost", precision: 2 } : bagsCost !== null ? { value: bagsCost, unit: "usd", label: "Bagged cost", precision: 2 } : volumeQuantity;
  const secondary = [
    metric ? { value: round(orderVolume, 3), unit: "cum", label: "Order quantity", precision: 2 } : { value: orderCuYd, unit: "cuyd", label: "Order quantity", precision: 2 },
    metric ? { value: round(netVolume, 3), unit: "cum", label: "Net volume", precision: 2 } : {
      value: round(netCuYd, 2),
      unit: "cuyd",
      label: "Net volume",
      precision: 2,
      display: `${formatNumber(netCuYd, 2)} cu yd (${formatNumber(netCuFt, 2)} cu ft)`
    }
  ];
  if (readyMixCost !== null || bagsCost !== null) {
    secondary.splice(1, 0, volumeQuantity);
  }
  if (readyMixCost !== null && bagsCost !== null) {
    secondary.splice(2, 0, { value: bagsCost, unit: "usd", label: "Bagged cost", precision: 2 });
  }
  if (slab) {
    secondary.push(
      metric ? { value: round(area, 2), unit: "sqm", label: "Slab area", precision: 2 } : { value: round(areaSqFt ?? 0, 1), unit: "sqft", label: "Slab area", precision: 0 }
    );
  }
  secondary.push({
    value: bags,
    unit: "bag",
    label: "Bags needed",
    precision: 0,
    display: `${formatNumber(bags, 0)} × ${i.bagSize} lb`
  });
  if (cheaper !== null && gap !== null) {
    secondary.push({
      value: gap,
      unit: "usd",
      label: "Cheaper route",
      precision: 2,
      display: gap === 0 ? "Same price both ways" : `${cheaper === "bags" ? "Bags" : "Ready-mix"} by $${formatNumber(gap, 2, false)}`
    });
  }
  if (shortLoad > 0) {
    secondary.push({ value: shortLoad, unit: "usd", label: "Short-load fee", precision: 2 });
  }
  if (i.delivery !== null && priced) {
    secondary.push({ value: round(i.delivery, 2), unit: "usd", label: "Delivery", precision: 2 });
  }
  if (metric) {
    if (costPerSqM !== null) {
      secondary.push({
        value: costPerSqM,
        unit: "usd",
        label: "Cost per sq m",
        precision: 2,
        display: `$${formatNumber(costPerSqM, 2, false)} / m²`
      });
    }
  } else if (costPerSqFt !== null) {
    secondary.push({
      value: costPerSqFt,
      unit: "usd",
      label: "Cost per sq ft",
      precision: 2,
      display: `$${formatNumber(costPerSqFt, 2, false)} / sq ft`
    });
  }
  const takeoff = [];
  if (netVolume > 0) {
    takeoff.push({
      key: "readymix",
      item: "Concrete ordered",
      qty: metric ? round(netVolume, 3) : round(netCuYd, 2),
      unit: metric ? "cum" : "cuyd",
      waste: i.wastePct,
      order: metric ? round(orderVolume, 3) : orderCuYd,
      orderUnit: metric ? "cum" : "cuyd",
      note: orderNote
    });
    takeoff.push({
      key: "bags",
      item: `Bagged concrete mix, ${i.bagSize} lb`,
      qty: metric ? round(volumeWithWaste, 3) : round(cuFtWithWaste, 2),
      unit: metric ? "cum" : "cuft",
      waste: i.wastePct,
      order: bags,
      orderUnit: "bag",
      note: `${bagYield} cu ft of mixed concrete per bag (QUIKRETE No. 1101 data sheet).`
    });
  }
  if (shortLoad > 0) {
    takeoff.push({
      key: "shortload",
      item: "Short-load fee quoted by your producer",
      qty: orderCuYd,
      unit: "cuyd",
      order: shortLoad,
      orderUnit: "usd",
      // The minimum is typed in the reader's unit (D65), so the note states it there.
      note: `Order is below the ${metric ? `${formatNumber((i.minLoadCuYd ?? 0) * CUYD_TO_M32, 3)} m³` : `${formatNumber(i.minLoadCuYd ?? 0, 2)} cu yd`} minimum you entered.`
    });
  }
  if (i.delivery !== null && priced) {
    takeoff.push({
      key: "delivery",
      item: "Delivery charge you entered",
      qty: 1,
      unit: "ea",
      order: round(i.delivery, 2),
      orderUnit: "usd",
      note: "Flat charge, added once to the ready-mix total."
    });
  }
  if (readyMixCost !== null) {
    takeoff.push({
      key: "readymix-total",
      item: "Ready-mix total at your price",
      qty: metric ? round(orderVolume, 3) : orderCuYd,
      unit: metric ? "cum" : "cuyd",
      order: readyMixCost,
      orderUnit: "usd",
      // The price is quoted back in the unit the reader typed it in: a note that
      // still says "cu yd" after the metric switch is false, even if it computes.
      note: (metric ? `${formatNumber(orderVolume, 3)} m³ × $${formatNumber((i.pricePerCuYd ?? 0) / CUYD_TO_M32, 2, false)} / m³` : `${formatNumber(orderCuYd, 2)} cu yd × $${formatNumber(i.pricePerCuYd ?? 0, 2, false)} / cu yd`) + (shortLoad > 0 ? ` + $${formatNumber(shortLoad, 2, false)} short-load fee` : "") + (i.delivery !== null ? ` + $${formatNumber(i.delivery, 2, false)} delivery` : "") + "."
    });
  }
  if (bagsCost !== null) {
    takeoff.push({
      key: "bags-total",
      item: "Bagged total at your price",
      qty: bags,
      unit: "bag",
      order: bagsCost,
      orderUnit: "usd",
      note: `${formatNumber(bags, 0)} bags × $${formatNumber(i.pricePerBag ?? 0, 2, false)}.`
    });
  }
  const assumptions = [
    "1 cubic yard = 27 cubic feet; 1 cubic yard = 0.764554857984 cubic metres.",
    `Waste allowance ${formatNumber(i.wastePct, 0)}% applied to the in-place volume. This is the tool's own editable assumption, not an industry figure.`,
    `The order is rounded up to the next ${ORDER_STEP_CUYD} cu yd step; confirm your plant's increment.`,
    `Bag yield ${bagYield} cu ft per ${i.bagSize} lb bag of standard concrete mix (QUIKRETE No. 1101 data sheet).`,
    "Every price, the minimum load, the short-load fee and the delivery charge are figures you typed. This page publishes no average price: a ready-mix price is set per plant, per region and per day.",
    "Material only: no labour, no pump, no finishing, no equipment."
  ];
  if (cheaper !== null) {
    assumptions.push("The cheaper route is cheaper at the prices you typed, not a recommendation.");
  }
  return {
    primary,
    secondary,
    takeoff,
    warnings,
    assumptions,
    raw: { area, netVolume, volumeWithWaste, orderVolume },
    netCuFt,
    netCuYd,
    cuFtWithWaste,
    cuYdWithWaste,
    orderCuYd,
    bags,
    shortLoad,
    readyMixCost,
    bagsCost,
    cheaper,
    gap,
    areaSqFt,
    costPerSqFt,
    costPerSqM,
    headlineCost
  };
}
var concreteCostSpec = {
  id: CONCRETE_COST_ID,
  version: CONCRETE_COST_VERSION,
  revised: CONCRETE_COST_REVISED,
  inputs: concreteCostInputs,
  compute: computeConcreteCost
};

// src/data/reference/rebar.ts
var BAR_SIZES = ["3", "4", "5", "6", "7", "8"];
var BAR_DIAMETER_IN = {
  "3": 0.375,
  "4": 0.5,
  "5": 0.625,
  "6": 0.75,
  "7": 0.875,
  "8": 1
};
var BAR_WEIGHT_LB_FT = {
  "3": 0.376,
  "4": 0.668,
  "5": 1.043,
  "6": 1.502,
  "7": 2.044,
  "8": 2.67
};
var STOCK_LENGTH_FT = [20, 40, 60];

// src/engine/formulas/concrete/rebar.ts
var REBAR_ID = "concrete-rebar";
var REBAR_VERSION = "1.0.0";
var REBAR_REVISED = "2026-09-19";
var REBAR_MODES = ["slab", "footing"];
var EPS = 1e-6;
var DASH = "—";
var LB_TO_KG2 = 0.45359237;
var MAX_PIECES = 2e4;
function ceilEps(v) {
  return Math.ceil(v - EPS);
}
function fin(v, fallback = 0) {
  return Number.isFinite(v) ? v : fallback;
}
function inches(m) {
  return convert(fin(m), "m", "in");
}
var G_PLACING = { id: "placing" };
var FT = { kind: "length", units: ["ft", "in"], metricUnit: "m" };
var IN = { kind: "length", units: ["in", "ft"], metricUnit: "cm" };
var rebarInputs = [
  { key: "mode", q: "m", label: "What you are reinforcing", kind: "select", default: "slab", options: REBAR_MODES.map((v) => ({ value: v })) },
  // 4-decimal metric defaults: a rounded 3.66 m would not equal 12 ft against
  // the stock length and would flip the default order (D50).
  { ...FT, key: "length", q: "l", label: "Length", default: 12, metricDefault: 3.6576, min: 0, max: 400 },
  { ...FT, key: "width", q: "w", label: "Width", default: 12, metricDefault: 3.6576, min: 0, max: 400, showWhen: "mode=slab" },
  { ...IN, key: "fwidth", q: "fw", label: "Footing width", default: 16, metricDefault: 40.64, min: 0, max: 240, showWhen: "mode=footing" },
  { ...IN, key: "sal", q: "sa", label: "Spacing along the length", default: 12, metricDefault: 30.48, min: 1, max: 120, showWhen: "mode=slab" },
  { ...IN, key: "sac", q: "sc", label: "Spacing across the width", default: 12, metricDefault: 30.48, min: 1, max: 120, showWhen: "mode=slab" },
  { key: "nbars", q: "nb", label: "Longitudinal bars", kind: "count", default: 2, min: 1, max: 24, step: 1, showWhen: "mode=footing" },
  { ...IN, key: "tspace", q: "ts", label: "Transverse bar spacing", default: "", optional: true, min: 0, max: 120, showWhen: "mode=footing" },
  { key: "size", q: "bs", label: "Bar size", kind: "select", default: "4", options: BAR_SIZES.map((v) => ({ value: v })) },
  { key: "stock", q: "sl", label: "Stock length", kind: "select", default: "20", options: STOCK_LENGTH_FT.map((f) => ({ value: String(f) })) },
  // ---- advanced: placing ------------------------------------------------
  { ...IN, key: "clear", q: "cl", label: "Edge clearance", default: "", optional: true, min: 0, max: 24, advanced: true, group: G_PLACING },
  { ...IN, key: "lap", q: "lp", label: "Lap splice length", default: "", optional: true, min: 0, max: 200, advanced: true, group: G_PLACING },
  { key: "mats", q: "mt", label: "Mats", kind: "count", default: 1, min: 1, max: 4, step: 1, advanced: true, group: G_PLACING, showWhen: "mode=slab" },
  { ...IN, key: "support", q: "ss", label: "Bar support spacing", default: "", optional: true, min: 0, max: 240, advanced: true, group: G_PLACING },
  // ---- advanced: assumptions --------------------------------------------
  { key: "waste", q: "wa", label: "Waste", kind: "percent", default: 0, min: 0, max: 25, step: 1, advanced: true },
  { key: "price", q: "pr", label: "Price per stock bar", kind: "money", default: "", optional: true, min: 0, max: 2e3, advanced: true }
];
var MODES = new Set(REBAR_MODES);
var SIZES = new Set(BAR_SIZES);
var STOCKS = new Set(STOCK_LENGTH_FT.map((f) => String(f)));
function parseRebarInputs(raw, system = "imperial") {
  const { values, errors } = coerce(rebarInputs, raw, system);
  const pick = (key, set, fallback) => {
    const v = str(values, key, fallback);
    return set.has(v) ? v : fallback;
  };
  return {
    inputs: {
      system,
      mode: pick("mode", MODES, "slab"),
      length: num(values, "length", 0),
      width: num(values, "width", 0),
      footingWidth: num(values, "fwidth", 0),
      spacingAlong: num(values, "sal", 0),
      spacingAcross: num(values, "sac", 0),
      longBars: num(values, "nbars", 2),
      transverseSpacing: optNum(values, "tspace"),
      size: pick("size", SIZES, "4"),
      stockFt: Number(pick("stock", STOCKS, "20")),
      clearance: optNum(values, "clear"),
      lap: optNum(values, "lap"),
      mats: num(values, "mats", 1),
      supportSpacing: optNum(values, "support"),
      wastePct: num(values, "waste", 0),
      pricePerBar: optNum(values, "price")
    },
    errors
  };
}
function barCount(span, spacing) {
  if (span <= 0 || spacing <= 0) return 0;
  return Math.min(MAX_PIECES, ceilEps(span / spacing) + 1);
}
function barRun(n, length, S, lap) {
  if (n <= 0 || length <= 0 || S <= 0) return { pieces: [], total: 0, splices: 0, per: 0 };
  if (length <= S + EPS) return { pieces: new Array(n).fill(length), total: n * length, per: 1, splices: 0 };
  const step = S - Math.max(0, lap);
  if (step <= EPS) return { pieces: new Array(n).fill(length), total: n * length, per: 1, splices: 0 };
  const k = Math.min(MAX_PIECES, ceilEps((length - lap) / step));
  const total = length + (k - 1) * lap;
  const one = new Array(k - 1).fill(S);
  one.push(total - (k - 1) * S);
  const pieces = [];
  for (let j = 0; j < n; j += 1) for (const p of one) pieces.push(p);
  return { pieces, total: n * total, splices: n * (k - 1), per: k };
}
function packBars(lengths, stock) {
  if (stock <= 0) return 0;
  const parts = [];
  let full = 0;
  for (const piece of lengths) {
    let x = piece;
    let guard = 0;
    while (x > stock + EPS && guard < 1e3) {
      full += 1;
      x -= stock;
      guard += 1;
    }
    if (x > EPS) parts.push(x);
  }
  parts.sort((a, b) => b - a);
  const bins = [];
  let maxFree = 0;
  for (const x of parts) {
    let placed = false;
    if (x <= maxFree + EPS) {
      for (let i = 0; i < bins.length; i += 1) {
        if (bins[i] + EPS >= x) {
          bins[i] = bins[i] - x;
          placed = true;
          break;
        }
      }
      if (!placed) maxFree = x - EPS;
    }
    if (!placed) {
      bins.push(stock - x);
      maxFree = Math.max(maxFree, stock - x);
    }
  }
  return full + bins.length;
}
function computeRebar(input) {
  const warnings = [];
  const metric = input.system === "metric";
  const footing = input.mode === "footing";
  const size = BAR_SIZES.includes(input.size) ? input.size : "4";
  const lbFt = BAR_WEIGHT_LB_FT[size];
  const diaIn = BAR_DIAMETER_IN[size];
  const lenFt = (v) => metric ? `${formatNumber(convert(v, "ft", "m"), 2)} m` : `${formatNumber(v, 2)} ft`;
  const stockLabel = metric ? `${formatNumber(convert(fin(input.stockFt, 20), "ft", "m"), 2)} m` : `${formatNumber(fin(input.stockFt, 20), 0)} ft`;
  const shortIn = (v) => metric ? `${formatNumber(convert(v, "in", "cm"), 1)} cm` : `${formatNumber(v, 1)} in`;
  const negative = input.length < 0 || input.width < 0 || input.footingWidth < 0 || (input.clearance ?? 0) < 0 || (input.lap ?? 0) < 0;
  if (negative) warnings.push({ level: "error", code: "negative-dimension", message: "Negative dimensions ignored." });
  const wastePct = Math.min(25, Math.max(0, fin(input.wastePct)));
  if (fin(input.wastePct) !== wastePct) {
    warnings.push({ level: "caution", code: "waste-clamped", message: "Waste clamped to 0-25%.", field: "waste" });
  }
  const L = inches(Math.max(0, fin(input.length)));
  const W = footing ? inches(Math.max(0, fin(input.footingWidth))) : inches(Math.max(0, fin(input.width)));
  const c = Math.max(0, inches(fin(input.clearance ?? 0)));
  const lap = Math.max(0, inches(fin(input.lap ?? 0)));
  const S = Math.max(1, fin(input.stockFt, 20)) * 12;
  const mats = footing ? 1 : Math.max(1, Math.round(fin(input.mats, 1)));
  const spAlong = footing ? inches(fin(input.transverseSpacing ?? 0)) : inches(Math.max(0, fin(input.spacingAlong)));
  const spAcross = footing ? 0 : inches(Math.max(0, fin(input.spacingAcross)));
  const clearL = L - 2 * c;
  const clearW = W - 2 * c;
  const live = clearL > EPS && clearW > EPS;
  const gridA = live ? footing ? Math.max(1, Math.round(fin(input.longBars, 2))) : barCount(clearW, spAcross) : 0;
  const gridB = live ? barCount(clearL, spAlong) : 0;
  const runA = barRun(gridA * mats, clearL, S, lap);
  const runB = barRun(gridB * mats, clearW, S, lap);
  const totalIn = runA.total + runB.total;
  const totalFt = totalIn / 12;
  const stockBeforeWaste = packBars(runA.pieces.concat(runB.pieces), S);
  const stockBars = stockBeforeWaste > 0 ? ceilEps(stockBeforeWaste * (1 + wastePct / 100)) : 0;
  const weightLb = totalFt * lbFt;
  const splices = runA.splices + runB.splices;
  const intersections = gridA * gridB * mats;
  const actualAcross = gridA > 1 ? clearW / (gridA - 1) : 0;
  const actualAlong = gridB > 1 ? clearL / (gridB - 1) : 0;
  const supportIn = input.supportSpacing === null ? null : Math.max(0, inches(input.supportSpacing));
  const chairs = supportIn !== null && supportIn > EPS && live ? (Math.floor(L / supportIn + EPS) + 1) * (Math.floor(W / supportIn + EPS) + 1) : null;
  const cost = input.pricePerBar !== null && input.pricePerBar >= 0 && stockBars > 0 ? round(stockBars * input.pricePerBar, 2) : null;
  if (!live) {
    warnings.push({ level: "info", code: "no-dimensions", message: footing ? "Enter a footing length and width." : "Enter a slab length and width." });
  }
  if (input.clearance === null) {
    warnings.push({
      level: "info",
      code: "clearance-blank",
      message: "Bars run to the concrete edge — enter the cover from your plans.",
      field: "clear"
    });
  }
  const longest = Math.max(live ? clearL : 0, live ? clearW : 0);
  if (input.lap === null && longest > S + EPS) {
    warnings.push({
      level: "caution",
      code: "lap-blank",
      message: `A ${lenFt(longest / 12)} bar is longer than your ${stockLabel} stock: counted with no lap — take the lap from your placing drawings.`,
      field: "lap"
    });
  }
  if (footing && input.transverseSpacing === null) {
    warnings.push({
      level: "info",
      code: "no-transverse",
      message: "No transverse bars counted: type a transverse spacing if your plans show stirrups or cross bars.",
      field: "tspace"
    });
  }
  const runQ = (feet2, label2) => metric ? { value: round(convert(feet2, "ft", "m"), 2), unit: "m", label: label2, precision: 2 } : { value: round(feet2, 1), unit: "ft", label: label2, precision: 1 };
  const spQ = (inch, label2) => metric ? { value: round(convert(inch, "in", "cm"), 2), unit: "cm", label: label2, precision: 2 } : { value: round(inch, 2), unit: "in", label: label2, precision: 2 };
  const primary = stockBars > 0 ? { value: stockBars, unit: "ea", label: "Rebar to order", precision: 0, display: `${stockBars} bars` } : { value: 0, unit: "ea", label: "Rebar to order", display: DASH };
  const secondary = [
    // runtime/view.ts prints this exact label under the headline (TOOL_RECIPE §3).
    stockBars > 0 ? { value: stockBars, unit: "ea", label: "Order quantity", precision: 0, display: `${stockBars} at ${stockLabel}` } : { value: 0, unit: "ea", label: "Order quantity", display: DASH },
    {
      value: gridA * mats,
      unit: "ea",
      label: footing ? "Longitudinal bars" : "Bars along the length",
      precision: 0,
      display: gridA > 0 ? `${gridA * mats} at ${lenFt(clearL / 12)}` : DASH
    },
    {
      value: gridB * mats,
      unit: "ea",
      label: footing ? "Transverse bars" : "Bars across the width",
      precision: 0,
      display: gridB > 0 ? `${gridB * mats} at ${lenFt(clearW / 12)}` : DASH
    },
    runQ(totalFt, "Rebar length with laps"),
    { value: splices, unit: "ea", label: "Splices", precision: 0 },
    metric ? { value: round(weightLb * LB_TO_KG2, 1), unit: "kg", label: "Weight", precision: 1 } : { value: round(weightLb, 1), unit: "lb", label: "Weight", precision: 1 },
    { value: intersections, unit: "ea", label: "Intersections", precision: 0 }
  ];
  if (!footing) {
    secondary.push(spQ(actualAlong, "Actual spacing along"), spQ(actualAcross, "Actual spacing across"));
  }
  if (chairs !== null) secondary.push({ value: chairs, unit: "ea", label: "Bar supports", precision: 0 });
  if (cost !== null) secondary.push({ value: cost, unit: "usd", label: "Rebar at your price", precision: 2 });
  const qty = (feet2) => metric ? round(convert(feet2, "ft", "m"), 2) : round(feet2, 1);
  const runUnit = metric ? "m" : "ft";
  const takeoff = [];
  if (stockBeforeWaste > 0) {
    takeoff.push({
      key: "bars",
      item: `#${size} rebar, ${stockLabel} stock`,
      qty: stockBeforeWaste,
      unit: "ea",
      waste: wastePct || void 0,
      order: stockBars,
      orderUnit: "ea",
      note: `${gridA * mats} bars at ${lenFt(clearL / 12)} and ${gridB * mats} at ${lenFt(
        clearW / 12
      )}; ${qty(totalFt)} ${runUnit} of steel, offcuts reused.`
    });
    takeoff.push({
      key: "steel",
      item: `#${size} steel weight`,
      qty: qty(totalFt),
      unit: runUnit,
      order: metric ? round(weightLb * LB_TO_KG2, 1) : round(weightLb, 1),
      orderUnit: metric ? "kg" : "lb",
      note: `${formatNumber(lbFt, 3)} lb per ft, TxDOT Item 440 Table 1. Laps included.`
    });
    takeoff.push({
      key: "splices",
      item: "Lap splices",
      qty: splices,
      unit: "ea",
      order: splices,
      orderUnit: "ea",
      note: lap > EPS ? `${shortIn(lap)} each, your figure — ${formatNumber(lap / diaIn, 1)} bar diameters at #${size}.` : "No lap typed: bars are counted end to end. The lap is on your placing drawings."
    });
    takeoff.push({
      key: "ties",
      item: "Bar intersections",
      qty: intersections,
      unit: "ea",
      order: intersections,
      orderUnit: "ea",
      note: "Geometry only. Which intersections are tied, and how much wire a tie takes, is not counted."
    });
  }
  if (chairs !== null) {
    takeoff.push({
      key: "supports",
      item: "Bar supports",
      qty: chairs,
      unit: "ea",
      order: chairs,
      orderUnit: "ea",
      note: `Rows at ${shortIn(supportIn)} each way, your spacing. No chair height is printed: none was found published.`
    });
  }
  if (cost !== null) {
    takeoff.push({
      key: "cost",
      item: "Rebar at your price",
      qty: stockBars,
      unit: "ea",
      order: cost,
      orderUnit: "usd",
      note: "Stock bars only: tie wire, chairs, delivery and cutting are not priced."
    });
  }
  const assumptions = [
    footing ? `${gridA} longitudinal bar${gridA === 1 ? "" : "s"} at ${lenFt(clearL / 12)}, ${gridB > 0 ? `${gridB} transverse bars at ${lenFt(clearW / 12)}` : "no transverse bars"}. A wall mat is the same grid as a slab: type the height as the width.` : `Bars = clear span / spacing, rounded up, plus one, then re-spaced evenly: ${gridA} across ${lenFt(
      clearW / 12
    )} and ${gridB} along ${lenFt(clearL / 12)}, so no gap is wider than the spacing you typed.`,
    input.clearance === null ? "Edge clearance is blank and counted as zero: the bars run to the edge. TxDOT Item 440 asks for 1 in minimum clear cover unless the plans show otherwise - one DOT's highway specification, quoted, not applied." : `Every bar is shortened by ${shortIn(c)} of clearance at each end - your figure, from your plans.`,
    lap > EPS ? `Lap ${shortIn(lap)} (${formatNumber(lap / diaIn, 1)} bar diameters at #${size}): pieces per bar = (bar - lap) / (${stockLabel} - lap), rounded up, and each lap adds its own length to the steel.` : "No lap is assumed and none is published: CRSI says the lap varies with strength, grade, size, spacing, cover and ties and is always on the placing drawings.",
    `Pieces are packed longest-first into ${stockLabel} bars, offcuts reused: a length budget, not a bar bending schedule.`,
    `Weight uses ${formatNumber(lbFt, 3)} lb per foot for a #${size} (${formatNumber(diaIn, 3)} in), TxDOT Item 440 Table 1. Nothing here recommends a bar size or a spacing.`,
    chairs === null ? "Bar supports are counted only when you type a spacing. TxDOT Item 440 places them in rows at 4 ft maximum each way on its highway work - quoted, not applied." : `Supports in rows at ${shortIn(supportIn)} each way over the full ${lenFt(L / 12)} by ${lenFt(W / 12)}.`,
    wastePct > 0 ? `Waste ${wastePct}% on the bar count - your figure. No rebar waste percentage we opened was published.` : "No waste is added: the sheet orders what it counted until you type your own percentage."
  ];
  return {
    primary,
    secondary,
    takeoff,
    warnings,
    assumptions,
    raw: {
      length: Math.max(0, convert(clearL, "in", "m")),
      width: Math.max(0, convert(clearW, "in", "m")),
      clear: convert(c, "in", "m"),
      along: convert(actualAlong, "in", "m"),
      across: convert(actualAcross, "in", "m")
    },
    mode: input.mode,
    barsA: gridA * mats,
    barsB: gridB * mats,
    gridA,
    gridB,
    cutA: convert(clearL, "in", "m"),
    cutB: convert(clearW, "in", "m"),
    piecesA: runA.per,
    piecesB: runB.per,
    totalFt: round(totalFt, 1),
    weightLb: round(weightLb, 1),
    stockBars,
    stockBeforeWaste,
    splices,
    intersections,
    chairs,
    actualAlong: convert(actualAlong, "in", "m"),
    actualAcross: convert(actualAcross, "in", "m"),
    lapDiameters: lap > EPS ? round(lap / diaIn, 1) : 0,
    cost
  };
}
var rebarSpec = {
  id: REBAR_ID,
  version: REBAR_VERSION,
  revised: REBAR_REVISED,
  inputs: rebarInputs,
  compute: computeRebar
};

// src/data/reference/aggregates.ts
var STATE_LABELS = {
  dry: "Dry, loose",
  damp: "Damp, as delivered",
  wet: "Wet, loose",
  bank: "Bank, in the undisturbed deposit"
};
var SOURCE_SHORT = {
  cat: "Caterpillar earthwork tables, opened 2026-09-19",
  marenakos: "Marenakos Rock Center, opened 2026-09-19",
  northbay: "North Bay Materials, opened 2026-09-19"
};
var CAT = "cat";
var cat = (lb) => ({ lb, src: CAT });
var R_GRAVEL = 1.31;
var AGGREGATES = [
  {
    id: "gravel-14-2",
    label: "Gravel, 1/4-2 in (screened)",
    r: R_GRAVEL,
    density: {
      dry: cat(2850),
      wet: cat(3400),
      bank: cat(3200)
    }
  },
  {
    id: "gravel-dry",
    label: "Gravel, unsized",
    r: R_GRAVEL,
    density: {
      dry: cat(2550),
      bank: cat(2850)
    }
  },
  {
    id: "gravel-pitrun",
    label: "Gravel, pit run (bank run)",
    r: R_GRAVEL,
    density: {
      dry: cat(3250),
      bank: cat(3650)
    }
  },
  {
    id: "crushed-stone",
    label: "Crushed stone",
    // Loose weight only. The bank row of this material is the quarry face.
    density: { dry: { lb: 2700, src: CAT } }
  },
  {
    id: "sand-gravel",
    label: "Sand and gravel mix",
    density: {
      dry: cat(2900),
      wet: cat(3400),
      bank: cat(3250)
    }
  },
  {
    id: "sand",
    label: "Sand",
    /** FHWA Exhibit 5.1 A, sand dry: 3,240 / 2,590. */
    r: 1.25,
    density: {
      dry: cat(2400),
      damp: cat(2850),
      wet: cat(3100),
      bank: cat(2700)
    }
  },
  {
    id: "topsoil",
    label: "Top soil",
    density: {
      dry: cat(1600),
      bank: cat(2300)
    }
  },
  {
    id: "earth-loam",
    label: "Earth, loam",
    density: {
      dry: cat(2100),
      bank: cat(2600)
    }
  },
  {
    id: "river-rock",
    label: "River rock (supplier chart)",
    density: {
      damp: { lb: 2800, src: "marenakos" }
    }
  },
  {
    id: "crushed-granite",
    label: "Crushed granite (supplier chart)",
    density: { damp: { lb: 2500, src: "marenakos" } }
  },
  {
    id: "landscape-mix",
    label: "Sand / gravel / DG / rock / river cobble (supplier chart)",
    density: {
      damp: { lb: 2700, src: "northbay" }
    }
  },
  { id: "pea-gravel", label: "Pea gravel", density: {} },
  { id: "road-base", label: "Road base / crushed aggregate base", density: {} },
  { id: "dg", label: "Decomposed granite", density: {} },
  { id: "millings", label: "Asphalt millings", density: {} },
  { id: "riprap", label: "Riprap", density: {} },
  { id: "other", label: "Other material", density: {} }
];
var DEFAULT_MATERIAL = "gravel-14-2";
var DEFAULT_STATE = "dry";
function getMaterial(id) {
  return AGGREGATES.find((m) => m.id === id) ?? AGGREGATES[0];
}
var STATE_ORDER = ["dry", "damp", "wet", "bank"];
function resolveDensity(materialId, state) {
  const m = getMaterial(materialId);
  const exact = m.density[state];
  if (exact) return { lb: exact.lb, state, src: exact.src };
  for (const s of STATE_ORDER) {
    const d = m.density[s];
    if (d) return { lb: d.lb, state: s, src: d.src };
  }
  return { lb: null, state: null, src: null };
}
var LB_PER_SHORT_TON = 2e3;
var LB_PER_TONNE = 1e3 / 0.45359237;
var TRUCK_CUYD_DEFAULT2 = 10;
var ORDER_INCREMENT_CUYD = 0.5;

// src/engine/formulas/earthwork/gravel.ts
var GRAVEL_ID = "earthwork-gravel";
var GRAVEL_VERSION = "1.1.0";
var GRAVEL_REVISED = "2026-09-19";
var MAX_ZONES = 4;
var FHWA_ROW = { "1.31": "3,570 / 2,730", "1.25": "3,240 / 2,590" };
var SHAPE_VALUES = ["rectangle", "circle", "triangle"];
var DENSITY_UNITS = ["lbyd", "kgm3"];
var KGM3_TO_LBCUYD = convert(convert(1, "cuyd", "cum"), "kg", "lb");
var DENSITY_UNIT_IDS = new Set(DENSITY_UNITS);
var G_AREAS = { id: "areas" };
var G_ORDER = { id: "order" };
var MATERIAL_OPTIONS = AGGREGATES.map((m) => ({ value: m.id }));
var STATE_OPTIONS = STATE_ORDER.map((value) => ({ value }));
var SHAPE_OPTIONS = SHAPE_VALUES.map((value) => ({ value }));
function shapeFields(n) {
  const suffix = n === 1 ? "" : String(n);
  const tag = n === 1 ? "" : `Area ${n} `;
  const cap = (s) => n === 1 ? s : s.toLowerCase();
  const fields = [
    {
      key: `shape${suffix}`,
      q: `s${suffix}`,
      label: `${tag}${cap("Shape")}`,
      kind: "select",
      default: "rectangle",
      options: SHAPE_OPTIONS
    },
    {
      key: `length${suffix}`,
      q: `l${suffix}`,
      label: `${tag}${cap("Length")}`,
      kind: "length",
      units: ["ft", "in"],
      metricUnit: "m",
      default: n === 1 ? 20 : 0,
      metricDefault: n === 1 ? 6 : 0,
      min: 0,
      max: 5e3,
      showWhen: `shape${suffix}=rectangle`
    },
    {
      key: `width${suffix}`,
      q: `w${suffix}`,
      label: `${tag}${cap("Width")}`,
      kind: "length",
      units: ["ft", "in"],
      metricUnit: "m",
      default: n === 1 ? 12 : 0,
      metricDefault: n === 1 ? 3.6 : 0,
      min: 0,
      max: 5e3,
      showWhen: `shape${suffix}=rectangle`
    },
    {
      key: `diameter${suffix}`,
      q: `dia${suffix}`,
      label: `${tag}${cap("Diameter")}`,
      kind: "length",
      units: ["ft", "in"],
      metricUnit: "m",
      default: 0,
      min: 0,
      max: 5e3,
      showWhen: `shape${suffix}=circle`
    },
    {
      key: `base${suffix}`,
      q: `b${suffix}`,
      label: `${tag}${cap("Base")}`,
      kind: "length",
      units: ["ft", "in"],
      metricUnit: "m",
      default: 0,
      min: 0,
      max: 5e3,
      showWhen: `shape${suffix}=triangle`
    },
    {
      key: `height${suffix}`,
      q: `h${suffix}`,
      label: `${tag}${n === 1 ? "Height (perpendicular to the base)" : "height"}`,
      kind: "length",
      units: ["ft", "in"],
      metricUnit: "m",
      default: 0,
      min: 0,
      max: 5e3,
      showWhen: `shape${suffix}=triangle`
    },
    {
      key: `depth${suffix}`,
      q: `d${suffix}`,
      label: `${tag}${cap("Depth")}`,
      kind: "length",
      units: ["in", "ft"],
      metricUnit: "cm",
      default: n === 1 ? "4in" : 0,
      metricDefault: n === 1 ? "10cm" : 0,
      min: 0,
      max: 240,
      optional: n > 1
    }
  ];
  return n === 1 ? fields : fields.map((f) => ({ ...f, advanced: true, group: G_AREAS }));
}
var TONNES_PER_SHORT_TON = convert(1, "ton", "t");
var CUM_PER_CUYD = convert(1, "cuyd", "cum");
var toImperialPrice = (typed, metric, factor) => typed === null || !metric ? typed : round(typed * factor, 2);
var gravelInputs = [
  ...shapeFields(1),
  {
    key: "material",
    q: "m",
    label: "Material",
    kind: "select",
    default: DEFAULT_MATERIAL,
    options: MATERIAL_OPTIONS
  },
  { key: "state", q: "st", label: "Condition", kind: "select", default: DEFAULT_STATE, options: STATE_OPTIONS },
  { key: "density", q: "den", label: "Density", kind: "count", default: "", optional: true, min: 1, max: 12e3 },
  {
    key: "densityUnit",
    q: "du",
    label: "Density unit",
    kind: "select",
    default: "lbyd",
    options: DENSITY_UNITS.map((value) => ({ value }))
  },
  {
    key: "compacted",
    q: "cp",
    label: "Depth is the compacted, in-place layer",
    kind: "toggle",
    default: true
  },
  {
    key: "priceTon",
    q: "pt",
    label: "Price per ton",
    kind: "money",
    default: "",
    optional: true,
    min: 0,
    max: 5e3,
    suffix: "$ / short ton",
    metricSuffix: "$ / t",
    metricFactor: TONNES_PER_SHORT_TON,
    metricPerUnit: true
  },
  {
    key: "priceYd",
    q: "py",
    label: "Price per cubic yard",
    kind: "money",
    default: "",
    optional: true,
    min: 0,
    max: 5e3,
    suffix: "$ / cu yd",
    metricSuffix: "$ / m³",
    metricFactor: CUM_PER_CUYD,
    metricPerUnit: true
  },
  // ---- advanced: areas 2 to 4 -----------------------------------------
  ...shapeFields(2),
  ...shapeFields(3),
  ...shapeFields(4),
  // ---- advanced: ordering ---------------------------------------------
  {
    // Typed, it replaces the FHWA ratio for any material; it is the only
    // conversion crushed stone or a soil ever gets. No default: the sheet has
    // nothing to offer here, your supplier does.
    key: "allowance",
    q: "ca",
    label: "Compaction allowance",
    kind: "percent",
    default: "",
    optional: true,
    min: 0,
    max: 60,
    step: 1,
    advanced: true,
    group: G_ORDER,
    showWhen: "compacted"
  },
  { key: "waste", q: "waste", label: "Extra allowance", kind: "percent", default: 0, min: 0, max: 25, step: 1, advanced: true, group: G_ORDER },
  { key: "truckCap", q: "tc", label: "Truck capacity", kind: "count", default: TRUCK_CUYD_DEFAULT2, min: 1, max: 40, advanced: true, group: G_ORDER, suffix: "cu yd", metricSuffix: "m³", metricFactor: CUM_PER_CUYD }
];
var SHAPE_IDS = new Set(SHAPE_VALUES);
function parseGravelInputs(raw, system = "imperial") {
  const { values, errors } = coerce(gravelInputs, raw, system);
  const mainDepth = num(values, "depth");
  const zones = [];
  for (let i = 1; i <= MAX_ZONES; i += 1) {
    const s = i === 1 ? "" : String(i);
    const shapeRaw = str(values, `shape${s}`, "rectangle");
    const shape = SHAPE_IDS.has(shapeRaw) ? shapeRaw : "rectangle";
    const depth = i === 1 ? mainDepth : optNum(values, `depth${s}`) ?? 0;
    if (shape === "circle") {
      zones.push({ shape, a: num(values, `diameter${s}`), b: 0, depth });
    } else if (shape === "triangle") {
      zones.push({ shape, a: num(values, `base${s}`), b: num(values, `height${s}`), depth });
    } else {
      zones.push({ shape, a: num(values, `length${s}`), b: num(values, `width${s}`), depth });
    }
  }
  const priceTonTyped = optNum(values, "priceTon");
  const truckTyped = Object.prototype.hasOwnProperty.call(raw, "truckCap") ? optNum(values, "truckCap") : null;
  const materialId = str(values, "material", DEFAULT_MATERIAL);
  const stateRaw = str(values, "state", DEFAULT_STATE);
  const densityUnitRaw = str(values, "densityUnit", "lbyd");
  return {
    inputs: {
      system,
      zones,
      materialId: AGGREGATES.some((m) => m.id === materialId) ? materialId : DEFAULT_MATERIAL,
      state: STATE_ORDER.includes(stateRaw) ? stateRaw : DEFAULT_STATE,
      density: optNum(values, "density"),
      densityUnit: DENSITY_UNIT_IDS.has(densityUnitRaw) ? densityUnitRaw : "lbyd",
      compacted: bool(values, "compacted"),
      allowancePct: optNum(values, "allowance"),
      wastePct: num(values, "waste", 0),
      truckCuYd: truckTyped === null ? TRUCK_CUYD_DEFAULT2 : system === "metric" ? truckTyped / CUM_PER_CUYD : truckTyped,
      // Metric types $ per tonne and $ per cubic metre; the sheet prices short tons
      // and cubic yards, so 33.07 $/t is 30 $/ton and 196.19 $/m3 is 150 $/cu yd.
      pricePerTon: toImperialPrice(priceTonTyped, system === "metric", TONNES_PER_SHORT_TON),
      pricePerCuYd: toImperialPrice(optNum(values, "priceYd"), system === "metric", CUM_PER_CUYD)
    },
    errors
  };
}
var M3_TO_CUFT3 = 1 / 0.3048 ** 3;
var M3_TO_CUYD3 = M3_TO_CUFT3 / 27;
var KG_PER_LB = 0.45359237;
function finite3(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}
function zoneArea(z) {
  const a = finite3(z.a);
  const b = finite3(z.b);
  if (a <= 0) return 0;
  if (z.shape === "circle") return Math.PI * a * a / 4;
  if (b <= 0) return 0;
  if (z.shape === "triangle") return a * b / 2;
  return a * b;
}
function computeGravel(input) {
  const warnings = [];
  const i = {
    ...input,
    zones: input.zones.map((z) => ({
      shape: z.shape,
      a: finite3(z.a),
      b: finite3(z.b),
      depth: finite3(z.depth)
    })),
    density: input.density === null ? null : finite3(input.density),
    allowancePct: input.allowancePct == null ? null : finite3(input.allowancePct),
    wastePct: finite3(input.wastePct, 0),
    truckCuYd: Math.max(0.5, finite3(input.truckCuYd, TRUCK_CUYD_DEFAULT2)),
    pricePerTon: input.pricePerTon === null ? null : finite3(input.pricePerTon),
    pricePerCuYd: input.pricePerCuYd === null ? null : finite3(input.pricePerCuYd)
  };
  const metric = i.system === "metric";
  const hadNegative = i.zones.some((z) => z.a < 0 || z.b < 0 || z.depth < 0);
  if (hadNegative) {
    warnings.push({
      level: "error",
      code: "negative-dimension",
      message: "Negative dimensions ignored. Enter positive lengths."
    });
  }
  const wastePct = Math.min(25, Math.max(0, i.wastePct));
  if (i.wastePct !== wastePct) {
    warnings.push({ level: "caution", code: "waste-clamped", message: "Allowance clamped to 0-25%.", field: "waste" });
  }
  const mainDepth = Math.max(0, i.zones[0]?.depth ?? 0);
  const resolvedZones = i.zones.map((z, k) => ({
    ...z,
    depth: k === 0 ? mainDepth : z.depth > 0 ? z.depth : mainDepth
  }));
  const zonesUsed = resolvedZones.filter((z) => zoneArea(z) > 0 && z.depth > 0);
  const area = zonesUsed.reduce((sum, z) => sum + zoneArea(z), 0);
  const placedVolume = zonesUsed.reduce((sum, z) => sum + zoneArea(z) * z.depth, 0);
  const material = getMaterial(i.materialId);
  const resolved = resolveDensity(i.materialId, i.state);
  const typedDensity = i.density !== null && i.density > 0 ? i.density : null;
  const userDensity = typedDensity === null ? null : i.densityUnit === "kgm3" ? typedDensity * KGM3_TO_LBCUYD : typedDensity;
  const density = userDensity ?? resolved.lb;
  const usedState = userDensity !== null ? i.state : resolved.state;
  if (density === null) {
    warnings.push({
      level: "error",
      code: "density-required",
      message: `No open source publishes a density for ${material.label}. Enter your supplier's figure in the unit next to the field and the weight, tonnage and cost lines fill in.`,
      field: "density"
    });
  } else if (userDensity !== null) {
    warnings.push({
      level: "info",
      code: "density-override",
      message: `Using your ${formatNumber(userDensity, 0)} lb/cu yd${resolved.lb !== null ? ` instead of the published ${formatNumber(resolved.lb, 0)}` : ""}.`
    });
  } else if (resolved.state !== null && resolved.state !== i.state) {
    warnings.push({
      level: "caution",
      code: "state-not-published",
      message: `Nothing published for ${material.label} ${STATE_LABELS[i.state].toLowerCase()}; showing the ${STATE_LABELS[resolved.state].toLowerCase()} row. Enter your supplier's density to override it.`,
      field: "state"
    });
  }
  const converts = i.compacted && i.state !== "bank";
  const allowancePct = converts && i.allowancePct !== null ? Math.min(60, Math.max(0, i.allowancePct)) : null;
  const ratio = converts && allowancePct === null ? material.r ?? null : null;
  const looseBase = ratio !== null ? placedVolume * ratio : allowancePct !== null ? placedVolume * (1 + allowancePct / 100) : placedVolume;
  const looseVolume = looseBase * (1 + wastePct / 100);
  if (converts && placedVolume > 0 && ratio === null && allowancePct === null) {
    warnings.push({
      level: "caution",
      code: "no-ratio",
      message: `No compaction ratio is applied to ${material.label}, so the measured volume is ordered as it is. Ask your supplier what it bulks up to loose and enter it as a compaction allowance.`,
      field: "allowance"
    });
  }
  const placedCuYd = placedVolume * M3_TO_CUYD3;
  const looseCuYd = looseVolume * M3_TO_CUYD3;
  const looseCuFt = looseVolume * M3_TO_CUFT3;
  const orderCuYd = roundUpTo(looseCuYd, ORDER_INCREMENT_CUYD);
  const massBasisCuYd = i.state === "bank" ? placedCuYd * (1 + wastePct / 100) : looseCuYd;
  const massLb = density !== null ? massBasisCuYd * density : null;
  const massKg = massLb === null ? null : massLb * KG_PER_LB;
  const tons = massLb === null ? null : massLb / LB_PER_SHORT_TON;
  const tonnes = massLb === null ? null : massLb / LB_PER_TONNE;
  const orderBasisCuYd = i.state === "bank" ? massBasisCuYd : orderCuYd;
  const orderTons = density !== null ? orderBasisCuYd * density / LB_PER_SHORT_TON : null;
  const trucks = roundUpWhole(orderCuYd / i.truckCuYd);
  const payload = metric ? `${formatNumber(i.truckCuYd * CUM_PER_CUYD, 3)} m³` : `${formatNumber(i.truckCuYd, 2)} cu yd`;
  const costPerTon = orderTons !== null && i.pricePerTon !== null && i.pricePerTon >= 0 ? round(orderTons * i.pricePerTon, 2) : null;
  const costPerCuYd = i.pricePerCuYd !== null && i.pricePerCuYd >= 0 ? round(orderCuYd * i.pricePerCuYd, 2) : null;
  const tonsPerCuYd = density !== null ? density / LB_PER_SHORT_TON : null;
  if (zonesUsed.length === 0) {
    warnings.push(
      mainDepth <= 0 && resolvedZones.some((z) => zoneArea(z) > 0) ? { level: "info", code: "no-depth", message: "Enter a depth to get a volume.", field: "depth" } : { level: "info", code: "no-dimensions", message: "Enter an area and a depth to get a volume." }
    );
  }
  const depthIn = fromBase(mainDepth, "in");
  if (depthIn > 24) {
    warnings.push({
      level: "caution",
      code: "deep-layer",
      message: `${formatNumber(depthIn, 1)} in deep is excavation, not a surface layer. Check the depth unit.`,
      field: "depth"
    });
  }
  if (trucks > 1) {
    warnings.push({
      level: "info",
      code: "multi-truck",
      message: `${trucks} loads at ${payload}. Confirm the payload your hauler carries: most quote it in tons.`
    });
  }
  if (looseCuYd > 1e3) {
    warnings.push({
      level: "caution",
      code: "very-large",
      message: "Over 1,000 cubic yards. Re-check your units before ordering."
    });
  }
  if (costPerTon !== null && costPerCuYd !== null && orderTons !== null && orderTons > 0 && orderCuYd > 0) {
    const weightUnit = metric ? "per tonne" : "per ton";
    const volumeUnit = metric ? "per cubic metre" : "per cubic yard";
    const cheaper = costPerTon <= costPerCuYd ? weightUnit : volumeUnit;
    const gap = Math.abs(costPerTon - costPerCuYd);
    warnings.push({
      level: "info",
      code: "price-compare",
      message: `Buying ${cheaper} is $${formatNumber(gap, 2, false)} cheaper here ($${formatNumber(costPerTon, 2, false)} by the ${metric ? "tonne" : "ton"} vs $${formatNumber(costPerCuYd, 2, false)} by the ${metric ? "cubic metre" : "yard"}). ` + (tonsPerCuYd ? `Your ${metric ? "cubic-metre" : "yard"} price is $${formatNumber((i.pricePerCuYd ?? 0) / tonsPerCuYd / (metric ? TONNES_PER_SHORT_TON : 1), 2, false)} ${weightUnit} at this density.` : "")
    });
  }
  const primary = metric ? { value: round(looseVolume, 3), unit: "cum", label: "Material volume", precision: 2 } : { value: round(looseCuYd, 2), unit: "cuyd", label: "Material volume", precision: 2 };
  const secondary = [];
  if (metric) {
    secondary.push({ value: round(orderCuYd * 0.764554857984, 2), unit: "cum", label: "Order quantity", precision: 2 });
    secondary.push({ value: round(area, 2), unit: "sqm", label: "Area covered", precision: 2 });
  } else {
    secondary.push({ value: orderCuYd, unit: "cuyd", label: "Order quantity", precision: 2 });
    secondary.push({ value: round(looseCuFt, 1), unit: "cuft", label: "Volume in cubic feet", precision: 1 });
    secondary.push({ value: round(convert(area, "sqm", "sqft"), 1), unit: "sqft", label: "Area covered", precision: 0 });
  }
  const DASH4 = "—";
  secondary.push(
    tons === null ? { value: 0, unit: "ton", label: "Short tons (2,000 lb)", display: DASH4 } : { value: round(tons, 2), unit: "ton", label: "Short tons (2,000 lb)", precision: 2 }
  );
  secondary.push(
    tonnes === null ? { value: 0, unit: "t", label: "Metric tonnes (1,000 kg)", display: DASH4 } : { value: round(tonnes, 2), unit: "t", label: "Metric tonnes (1,000 kg)", precision: 2 }
  );
  secondary.push(
    massLb === null ? { value: 0, unit: metric ? "kg" : "lb", label: "Weight", display: DASH4 } : metric ? { value: round(massKg ?? 0, 0), unit: "kg", label: "Weight", precision: 0 } : { value: round(massLb, 0), unit: "lb", label: "Weight", precision: 0 }
  );
  secondary.push({ value: trucks, unit: "load", label: "Truck loads", precision: 0 });
  if (mainDepth > 0) {
    const sqftPerCuYd = 27 / fromBase(mainDepth, "ft");
    const coverUnit = metric ? "sqm" : "sqft";
    secondary.push(
      metric ? { value: round(1 / mainDepth, 2), unit: "sqm", label: "Coverage per cubic metre", precision: 2 } : { value: round(sqftPerCuYd, 1), unit: "sqft", label: "Coverage per cubic yard", precision: 1 }
    );
    const perTon = density === null ? null : LB_PER_SHORT_TON / density * sqftPerCuYd;
    const perTonLabel = `Coverage per ${metric ? "tonne" : "ton"}`;
    secondary.push(
      perTon === null ? { value: 0, unit: coverUnit, label: perTonLabel, display: DASH4 } : metric ? {
        value: round(convert(perTon, "sqft", "sqm") / TONNES_PER_SHORT_TON, 2),
        unit: "sqm",
        label: perTonLabel,
        precision: 2
      } : { value: round(perTon, 1), unit: "sqft", label: perTonLabel, precision: 1 }
    );
  }
  if (density !== null) {
    secondary.push({
      value: density,
      unit: "lb",
      label: "Density used",
      display: metric ? `${formatNumber(convert(density, "lb", "kg") / convert(1, "cuyd", "cum"), 0)} kg / m³` : `${formatNumber(density, 0)} lb / cu yd`
    });
  }
  if (costPerTon !== null)
    secondary.push({ value: costPerTon, unit: "usd", label: `Cost at your price per ${metric ? "tonne" : "ton"}`, precision: 2 });
  if (costPerCuYd !== null)
    secondary.push({
      value: costPerCuYd,
      unit: "usd",
      label: `Cost at your price per ${metric ? "cubic metre" : "cubic yard"}`,
      precision: 2
    });
  const takeoff = [];
  const stateLabel = usedState ? STATE_LABELS[usedState].toLowerCase() : "condition not published";
  const vq = (cuyd, dp = 2) => formatNumber(metric ? cuyd * CUM_PER_CUYD : cuyd, dp);
  const vu = metric ? "m³" : "cu yd";
  const vUnit = metric ? "cum" : "cuyd";
  const step = metric ? formatNumber(ORDER_INCREMENT_CUYD * CUM_PER_CUYD, 2) : ORDER_INCREMENT_CUYD;
  if (placedVolume > 0) {
    takeoff.push({
      key: "volume",
      item: `${material.label}, ${stateLabel}`,
      qty: round(metric ? placedVolume : placedCuYd, 2),
      unit: vUnit,
      waste: wastePct || void 0,
      order: metric ? round(orderCuYd * CUM_PER_CUYD, 2) : orderCuYd,
      orderUnit: vUnit,
      note: ratio !== null ? `In place ${vq(placedCuYd)} ${vu} x ${ratio}, rounded up to ${step} ${vu}.` : allowancePct !== null ? `In place ${vq(placedCuYd)} ${vu} + your ${allowancePct}% allowance, rounded up to ${step} ${vu}.` : `Measured volume, rounded up to ${step} ${vu}.`
    });
    takeoff.push({
      key: "trucks",
      item: "Truck loads",
      qty: round(metric ? orderCuYd * CUM_PER_CUYD : orderCuYd, 2),
      unit: vUnit,
      order: trucks,
      orderUnit: "load",
      note: `${payload} per load (your assumption)` + (density === null ? "." : metric ? `, about ${formatNumber(i.truckCuYd * density / LB_PER_TONNE, 2)} t at this density.` : `, about ${formatNumber(i.truckCuYd * density / LB_PER_SHORT_TON, 2)} tons at this density.`)
    });
    if (density !== null && tons !== null && tonnes !== null && orderTons !== null) {
      takeoff.push({
        key: "tons",
        item: "Same order, in short tons",
        qty: round(tons, 2),
        unit: "ton",
        order: round(orderTons, 2),
        orderUnit: "ton",
        note: `${formatNumber(density, 0)} lb/cu yd${resolved.src && userDensity === null ? ` - ${SOURCE_SHORT[resolved.src]}` : " - your figure"}. 1 short ton = 2,000 lb.`
      });
      takeoff.push({
        key: "tonnes",
        item: "Same order, in metric tonnes",
        qty: round(tonnes, 2),
        unit: "t",
        order: round(orderBasisCuYd * density / LB_PER_TONNE, 2),
        orderUnit: "t",
        note: "1 tonne = 1,000 kg = 2,204.62 lb, about 10 percent more than a short ton."
      });
    }
  }
  if (costPerTon !== null && orderTons !== null) {
    takeoff.push({
      key: "cost-ton",
      item: `Material cost, priced by the ${metric ? "tonne" : "ton"}`,
      // The quantity priced follows the system too, or the sheet bills tonnes and counts short tons.
      qty: round(metric ? orderTons * TONNES_PER_SHORT_TON : orderTons, 2),
      unit: metric ? "t" : "ton",
      order: costPerTon,
      orderUnit: "usd",
      // Quoted back in the unit the price was typed in, or the line stops being true.
      note: metric ? `${formatNumber(orderTons * TONNES_PER_SHORT_TON, 2)} t x $${formatNumber((i.pricePerTon ?? 0) / TONNES_PER_SHORT_TON, 2, false)}.` : `${formatNumber(orderTons, 2)} tons x $${formatNumber(i.pricePerTon ?? 0, 2, false)}.`
    });
  }
  if (costPerCuYd !== null) {
    takeoff.push({
      key: "cost-yd",
      item: `Material cost, priced by the ${metric ? "cubic metre" : "cubic yard"}`,
      qty: metric ? round(orderCuYd * CUM_PER_CUYD, 2) : orderCuYd,
      unit: metric ? "cum" : "cuyd",
      order: costPerCuYd,
      orderUnit: "usd",
      // Quoted back in the unit the price was typed in, or the line stops being true.
      note: metric ? `${formatNumber(orderCuYd * CUM_PER_CUYD, 2)} m³ x $${formatNumber((i.pricePerCuYd ?? 0) / CUM_PER_CUYD, 2, false)}.` : `${formatNumber(orderCuYd, 2)} cu yd x $${formatNumber(i.pricePerCuYd ?? 0, 2, false)}.`
    });
  }
  const perCuYd = " lb/cu yd";
  const assumptions = [
    "Volume = area x depth. Rectangle L x W, circle pi x D squared / 4, triangle base x height / 2. 27 cu ft = 1 cu yd."
  ];
  if (density !== null && userDensity === null && resolved.src && usedState) {
    assumptions.push(
      `Density ${formatNumber(density, 0)}${perCuYd}, ${material.label}, ${STATE_LABELS[usedState].toLowerCase()} - ${SOURCE_SHORT[resolved.src]}.`
    );
  } else if (density !== null) {
    assumptions.push(`Density ${formatNumber(density, 0)}${perCuYd}, entered by you. Nothing here claims it.`);
  } else {
    assumptions.push(`No density: ${material.label} has no figure in any source we opened, so weight and cost stay blank.`);
  }
  if (ratio !== null) {
    assumptions.push(
      `Loose volume = in-place volume x ${ratio} = ${FHWA_ROW[String(ratio)]} lb/cu yd, FHWA Exhibit 5.1 A dry row. For estimating purposes, ±33%: highway embankment, not a plate-compacted base.`
    );
  } else if (allowancePct !== null) {
    assumptions.push(`Loose volume = in-place volume x ${round(1 + allowancePct / 100, 4)}, from the ${allowancePct}% compaction allowance you entered. Your figure, and it replaces any published ratio.`);
  } else if (i.compacted && i.state === "bank") {
    assumptions.push("Bank density already describes the material in place, so nothing is converted on top of it.");
  } else {
    assumptions.push("No compaction conversion: your volume is taken as the loose volume to order.");
  }
  if (wastePct > 0) assumptions.push(`Extra allowance ${wastePct}% applied on top of the volume.`);
  assumptions.push("Short ton = 2,000 lb; metric tonne = 1,000 kg = 2,204.62 lb, about 10 percent more.");
  assumptions.push(`Order rounded up to the nearest ${ORDER_INCREMENT_CUYD} cu yd; supplier increments differ.`);
  assumptions.push(`Truck capacity ${payload} per load is your assumption, not a payload.`);
  if (zonesUsed.length > 1) {
    assumptions.push(`${zonesUsed.length} areas added together; overlapping areas are not detected.`);
  }
  assumptions.push("Depth, gradation and compaction for your job come from the drawings or the soils report.");
  return {
    primary,
    secondary,
    takeoff,
    warnings,
    assumptions,
    raw: { area, placedVolume, looseVolume, massKg },
    density,
    densitySource: resolved.src,
    densityState: usedState,
    ratio,
    orderCuYd,
    tons,
    tonnes,
    trucks,
    costPerTon,
    costPerCuYd,
    zonesUsed
  };
}
var gravelSpec = {
  id: GRAVEL_ID,
  version: GRAVEL_VERSION,
  revised: GRAVEL_REVISED,
  inputs: gravelInputs,
  compute: computeGravel
};

// src/data/reference/fill-dirt.ts
var FILL_DIRT_ROWS = {
  "loam-dry": { inSitu: 3030, loose: 2070, embankment: 3520, swellPct: 50, shrinkPct: -12, looseToCompacted: 1.7, inSituToLoose: 1.46 },
  "loam-damp": { inSitu: 3370, loose: 2360, embankment: 3520, swellPct: 43, shrinkPct: -4, looseToCompacted: 1.49, inSituToLoose: 1.43 },
  "loam-wet": { inSitu: 2940, loose: 2940, embankment: 3520, swellPct: 0, shrinkPct: -20, looseToCompacted: 1.2, inSituToLoose: 1 },
  topsoil: { inSitu: 2430, loose: 1620, embankment: 3280, swellPct: 56, shrinkPct: -26, looseToCompacted: 2.02, inSituToLoose: 1.5 }
};
var FILL_MATERIAL_ORDER = ["loam-dry", "loam-damp", "loam-wet", "topsoil", "other"];
var FILL_MATERIAL_NAMES = {
  "loam-dry": "Earth, loam dry",
  "loam-damp": "Earth, loam damp",
  "loam-wet": "Earth, loam wet",
  topsoil: "Topsoil",
  other: "Other material"
};
var DEFAULT_FILL_MATERIAL = "loam-damp";
var LB_PER_SHORT_TON2 = 2e3;
var CUFT_PER_CUYD = 27;
function fillDirtRow(material) {
  return material === "other" ? null : FILL_DIRT_ROWS[material];
}
function looseDensityLb(material) {
  return fillDirtRow(material)?.loose ?? null;
}
function inSituDensityLb(material) {
  return fillDirtRow(material)?.inSitu ?? null;
}
function looseToCompacted(material) {
  return fillDirtRow(material)?.looseToCompacted ?? null;
}
function inSituToLoose(material) {
  return fillDirtRow(material)?.inSituToLoose ?? null;
}
function group(value) {
  return value.toLocaleString("en-US");
}
function compactionNote(material) {
  const row = fillDirtRow(material);
  if (!row) return null;
  return `x ${row.looseToCompacted} (${group(row.embankment)} ÷ ${group(row.loose)} = ${row.looseToCompacted}, FHWA Exhibit 5.1 A, embankment ÷ loose lb/cu yd, ${FILL_MATERIAL_NAMES[material].toLowerCase()}). Estimating figure, ±33%: that column is a highway embankment compacted to specification, not dirt tamped in a trench.`;
}
function factorDivision(material, kind) {
  const row = fillDirtRow(material);
  if (!row) return null;
  const top = kind === "compaction" ? row.embankment : row.inSitu;
  const factor = kind === "compaction" ? row.looseToCompacted : row.inSituToLoose;
  return `${group(top)} ÷ ${group(row.loose)} = ${factor}`;
}
function swellNote(material) {
  const row = fillDirtRow(material);
  if (!row) return null;
  return `x ${row.inSituToLoose} (${group(row.inSitu)} ÷ ${group(row.loose)} = ${row.inSituToLoose}, FHWA Exhibit 5.1 A, in-situ ÷ loose lb/cu yd, ${FILL_MATERIAL_NAMES[material].toLowerCase()}). Estimating figure, ±33%: a yard of ground fills more than a yard of truck bed.`;
}
var NO_CONVERSION_NOTE = "Nothing is converted: dirt sold by the yard is measured loose, the way it sits when it is spread.";

// src/engine/formulas/earthwork/fill-dirt.ts
var FILLDIRT_ID = "earthwork-fill-dirt";
var FILLDIRT_VERSION = "1.0.0";
var FILLDIRT_REVISED = "2026-09-20";
var MODE_VALUES = ["fill", "dig"];
var SHAPE_VALUES2 = ["rectangle", "circle", "triangle"];
var KGM3_TO_LBCUYD2 = convert(convert(1, "cuyd", "cum"), "kg", "lb");
var DENSITY_UNITS2 = ["lbyd", "kgm3"];
var DENSITY_UNIT_IDS2 = new Set(DENSITY_UNITS2);
var CUM_PER_CUYD2 = convert(1, "cuyd", "cum");
var T_PER_SHORT_TON = convert(1, "ton", "t");
function finite4(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}
function shapeArea(shape, a, b) {
  const x = finite4(a);
  const y = finite4(b);
  if (x <= 0) return 0;
  if (shape === "circle") return Math.PI * x * x / 4;
  if (y <= 0) return 0;
  return shape === "triangle" ? x * y / 2 : x * y;
}
var G_SUPPLY = { id: "supply" };
var G_ORDER2 = { id: "order" };
var PLAN_LENGTH2 = {
  kind: "length",
  units: ["ft", "in"],
  metricUnit: "m",
  min: 0,
  max: 5e3
};
var fillDirtInputs = [
  { key: "mode", q: "m", label: "What you are measuring", kind: "select", default: "fill", options: MODE_VALUES.map((value) => ({ value })) },
  { key: "shape", q: "s", label: "Shape of the area", kind: "select", default: "rectangle", options: SHAPE_VALUES2.map((value) => ({ value })) },
  { ...PLAN_LENGTH2, key: "length", q: "l", label: "Length", default: 20, metricDefault: 6, showWhen: "shape=rectangle" },
  { ...PLAN_LENGTH2, key: "width", q: "w", label: "Width", default: 15, metricDefault: 4.5, showWhen: "shape=rectangle" },
  { ...PLAN_LENGTH2, key: "diameter", q: "dia", label: "Diameter", default: 0, showWhen: "shape=circle" },
  { ...PLAN_LENGTH2, key: "base", q: "b", label: "Base", default: 0, showWhen: "shape=triangle" },
  { ...PLAN_LENGTH2, key: "height", q: "h", label: "Height (perpendicular to the base)", default: 0, showWhen: "shape=triangle" },
  {
    key: "depth",
    q: "d",
    label: "Depth",
    kind: "length",
    units: ["in", "ft"],
    metricUnit: "cm",
    default: "6in",
    metricDefault: "15cm",
    min: 0,
    max: 600
  },
  { key: "varies", q: "v", label: "Depth changes across the area", kind: "toggle", default: false },
  {
    key: "depth2",
    q: "d2",
    label: "Depth at the other end",
    kind: "length",
    units: ["in", "ft"],
    metricUnit: "cm",
    default: 0,
    min: 0,
    max: 600,
    showWhen: "varies"
  },
  { key: "material", q: "mt", label: "Material", kind: "select", default: DEFAULT_FILL_MATERIAL, options: FILL_MATERIAL_ORDER.map((value) => ({ value })) },
  // ---- advanced: the second depth lives with the geometry, the rest below ----
  { key: "density", q: "den", label: "Supplier density", kind: "count", default: "", optional: true, min: 1, max: 12e3, advanced: true, group: G_SUPPLY },
  {
    key: "densityUnit",
    q: "du",
    label: "Supplier density unit",
    kind: "select",
    default: "lbyd",
    options: DENSITY_UNITS2.map((value) => ({ value })),
    advanced: true,
    group: G_SUPPLY
  },
  { key: "compacted", q: "cp", label: "Compacted to a specification", kind: "toggle", default: false, advanced: true, group: G_SUPPLY, showWhen: "mode=fill" },
  { key: "allowance", q: "al", label: "Your own allowance", kind: "count", default: "", optional: true, min: 0, max: 50, advanced: true, group: G_SUPPLY },
  { key: "truck", q: "tk", label: "Truck capacity", kind: "count", default: "", optional: true, min: 1, max: 40, advanced: true, group: G_ORDER2, suffix: "cu yd", metricSuffix: "m³", metricFactor: CUM_PER_CUYD2 },
  // A price PER a physical unit switches with the unit system (D64): the chip
  // reads $/m³ and $/t in metric and the typed figure is converted with it, so
  // the same job costs the same money in either system.
  { key: "priceYd", q: "py", label: "Price per cubic yard", kind: "money", default: "", optional: true, min: 0, max: 5e3, advanced: true, group: G_ORDER2, suffix: "$ / cu yd", metricSuffix: "$ / m³", metricFactor: CUM_PER_CUYD2, metricPerUnit: true },
  { key: "priceTon", q: "pt", label: "Price per ton", kind: "money", default: "", optional: true, min: 0, max: 5e3, advanced: true, group: G_ORDER2, suffix: "$ / ton", metricSuffix: "$ / t", metricFactor: T_PER_SHORT_TON, metricPerUnit: true }
];
var MODES2 = new Set(MODE_VALUES);
var SHAPES2 = new Set(SHAPE_VALUES2);
var MATERIALS = new Set(FILL_MATERIAL_ORDER);
function parseFillDirtInputs(raw, system = "imperial") {
  const { values, errors } = coerce(fillDirtInputs, raw, system);
  const shapeRaw = str(values, "shape", "rectangle");
  const shape = SHAPES2.has(shapeRaw) ? shapeRaw : "rectangle";
  const modeRaw = str(values, "mode", "fill");
  const materialRaw = str(values, "material", DEFAULT_FILL_MATERIAL);
  const densityUnitRaw = str(values, "densityUnit", "lbyd");
  let a = 0;
  let b = 0;
  if (shape === "circle") a = num(values, "diameter");
  else if (shape === "triangle") {
    a = num(values, "base");
    b = num(values, "height");
  } else {
    a = num(values, "length");
    b = num(values, "width");
  }
  const truckTyped = optNum(values, "truck");
  const price = (key, metricPerImperial) => {
    const v = optNum(values, key);
    return v === null ? null : system === "metric" ? round(v * metricPerImperial, 2) : v;
  };
  return {
    inputs: {
      system,
      mode: MODES2.has(modeRaw) ? modeRaw : "fill",
      shape,
      a,
      b,
      depth: num(values, "depth", 0),
      varies: bool(values, "varies"),
      depth2: num(values, "depth2", 0),
      material: MATERIALS.has(materialRaw) ? materialRaw : DEFAULT_FILL_MATERIAL,
      density: optNum(values, "density"),
      densityUnit: DENSITY_UNIT_IDS2.has(densityUnitRaw) ? densityUnitRaw : "lbyd",
      compacted: bool(values, "compacted"),
      allowance: optNum(values, "allowance"),
      // The payload is a QUANTITY: metric types 7.65 m3 for the 10 cu yd load.
      truck: truckTyped === null || system !== "metric" ? truckTyped : truckTyped / CUM_PER_CUYD2,
      pricePerYd: price("priceYd", CUM_PER_CUYD2),
      pricePerTon: price("priceTon", T_PER_SHORT_TON)
    },
    errors
  };
}
function computeFillDirt(input) {
  const warnings = [];
  const i = {
    ...input,
    a: finite4(input.a),
    b: finite4(input.b),
    depth: finite4(input.depth),
    depth2: finite4(input.depth2),
    density: input.density === null ? null : finite4(input.density),
    allowance: input.allowance === null ? null : finite4(input.allowance),
    truck: input.truck === null ? null : finite4(input.truck),
    pricePerYd: input.pricePerYd === null ? null : finite4(input.pricePerYd),
    pricePerTon: input.pricePerTon === null ? null : finite4(input.pricePerTon)
  };
  const metric = i.system === "metric";
  const dig = i.mode === "dig";
  if (i.a < 0 || i.b < 0 || i.depth < 0 || i.depth2 < 0) {
    warnings.push({ level: "error", code: "negative-dimension", message: "Negative dimensions ignored. Enter positive lengths." });
  }
  const area = shapeArea(i.shape, i.a, i.b);
  const areaSqFt = convert(area, "sqm", "sqft");
  const d1 = Math.max(0, i.depth);
  const d2 = Math.max(0, i.depth2);
  const meanDepth = i.varies ? (d1 + d2) / 2 : d1;
  const volume = area * meanDepth;
  const volumeCuFt = convert(volume, "cum", "cuft");
  const volumeCuYd = convert(volume, "cum", "cuyd");
  const ratio = looseToCompacted(i.material);
  const swell = inSituToLoose(i.material);
  const allowance = i.allowance !== null && i.allowance > 0 ? Math.min(50, i.allowance) : null;
  let factor = 1;
  let factorSource = "none";
  if (dig) {
    factor = swell ?? 1;
    factorSource = "swell";
  } else if (allowance !== null) {
    factor = round(1 + allowance / 100, 4);
    factorSource = "allowance";
  } else if (i.compacted && ratio !== null) {
    factor = ratio;
    factorSource = "compaction";
  }
  const orderVolume = volume * factor;
  const orderCuYd = volumeCuYd * factor;
  const looseCuYd = dig ? orderCuYd : volumeCuYd;
  const compactedFillCuYd = dig && ratio !== null ? orderCuYd / ratio : null;
  const published = dig ? inSituDensityLb(i.material) : looseDensityLb(i.material);
  const typedRaw = i.density !== null && i.density > 0 ? i.density : null;
  const typed = typedRaw === null ? null : i.densityUnit === "kgm3" ? typedRaw * KGM3_TO_LBCUYD2 : typedRaw;
  const ownDensity = typed !== null;
  const densityLb = typed ?? published;
  const densityKgM3 = densityLb === null ? null : Math.round(densityLb / KGM3_TO_LBCUYD2);
  const weighedCuYd = dig ? volumeCuYd : orderCuYd;
  const weighedM3 = dig ? volume : orderVolume;
  const massLb = densityLb === null ? null : weighedCuYd * densityLb;
  const massKg = massLb === null ? null : convert(massLb, "lb", "kg");
  const shortTons = massLb === null ? null : round(massLb / LB_PER_SHORT_TON2, 2);
  const tonnes = massKg === null ? null : round(massKg / 1e3, 2);
  const billableCuYd = orderCuYd;
  const loads = i.truck !== null && i.truck > 0 ? roundUpWhole(billableCuYd / i.truck) : 0;
  const payload = metric ? `${formatNumber((i.truck ?? 0) * CUM_PER_CUYD2, 3)} m³` : `${formatNumber(i.truck ?? 0, 2)} cu yd`;
  const costVolume = i.pricePerYd !== null && i.pricePerYd > 0 ? round(billableCuYd * i.pricePerYd, 2) : null;
  const costWeight = i.pricePerTon !== null && i.pricePerTon > 0 && shortTons !== null ? round(shortTons * i.pricePerTon, 2) : null;
  if (area <= 0) {
    warnings.push({ level: "info", code: "no-dimensions", message: "Enter the area and a depth to get a volume." });
  } else if (meanDepth <= 0) {
    warnings.push({ level: "info", code: "no-depth", message: "Enter a depth to get a volume.", field: "depth" });
  }
  if (i.material === "other" && !ownDensity) {
    warnings.push({
      level: "caution",
      code: "no-density",
      message: 'No density is claimed for "other": volumes only, no weight and no tonnage. Ask the supplier what a cubic yard weighs and type it in.',
      field: "density"
    });
  }
  if (ownDensity) {
    warnings.push({
      level: "info",
      code: "density-override",
      message: `Using your ${formatNumber(densityLb ?? 0, 0)} lb/cu yd. Nothing here claims that figure.`,
      field: "density"
    });
  }
  if (factorSource === "allowance") {
    warnings.push({
      level: "info",
      code: "allowance-wins",
      message: i.compacted && ratio !== null ? `Your ${formatNumber(allowance ?? 0, 0)}% allowance is applied instead of the ${ratio} compaction factor: a figure you entered always wins.` : `Your ${formatNumber(allowance ?? 0, 0)}% allowance is applied. It is your figure, not a published allowance.`,
      field: "allowance"
    });
  } else if (factorSource === "compaction") {
    warnings.push({ level: "info", code: "compaction-applied", message: compactionNote(i.material) ?? "", field: "compacted" });
  } else if (!dig && i.compacted && ratio === null) {
    warnings.push({
      level: "caution",
      code: "compaction-unsourced",
      message: 'No compaction factor for "other": the exhibit has no row for it. Use your own allowance.',
      field: "compacted"
    });
  }
  if (dig && swell === null) {
    warnings.push({
      level: "caution",
      code: "swell-unsourced",
      message: 'No swell factor is applied to "other": the loose volume shown is the in-place volume.',
      field: "material"
    });
  }
  if (loads > 1 && i.truck !== null) {
    warnings.push({
      level: "info",
      code: "multi-load",
      message: `${loads} loads at ${metric ? payload : `${formatNumber(i.truck, 2)} cubic yards`}, the capacity you entered.`
    });
  }
  const primaryLabel = dig ? "Volume to haul" : "Volume to order";
  const primary = metric ? { value: round(orderVolume, 2), unit: "cum", label: primaryLabel, precision: 2 } : { value: round(orderCuYd, 2), unit: "cuyd", label: primaryLabel, precision: 2 };
  const secondary = [];
  secondary.push(
    metric ? { value: round(orderVolume, 2), unit: "cum", label: "Order quantity", precision: 2 } : { value: round(orderCuYd, 2), unit: "cuyd", label: "Order quantity", precision: 2 }
  );
  const spaceLabel = dig ? "In place" : "Space to fill";
  if (metric) {
    secondary.push({ value: round(volume, 2), unit: "cum", label: spaceLabel, precision: 2 });
    secondary.push({ value: round(area, 2), unit: "sqm", label: "Area", precision: 2 });
  } else {
    secondary.push({ value: round(volumeCuYd, 2), unit: "cuyd", label: spaceLabel, precision: 2 });
    secondary.push({ value: round(volumeCuFt, 2), unit: "cuft", label: "Cubic feet", precision: 2 });
    secondary.push({ value: round(areaSqFt, 0), unit: "sqft", label: "Area", precision: 0 });
  }
  if (factorSource !== "none" && factor !== 1) {
    secondary.push(
      metric ? { value: round(orderVolume, 2), unit: "cum", label: "Loose volume", precision: 2 } : { value: round(orderCuYd, 2), unit: "cuyd", label: "Loose volume", precision: 2 }
    );
    secondary.push({ value: factor, unit: "ea", label: "Factor used", display: `x ${formatNumber(factor, 2)}` });
  }
  if (massLb !== null && massKg !== null && shortTons !== null && tonnes !== null) {
    secondary.push(
      metric ? { value: round(massKg, 0), unit: "kg", label: "Weight", precision: 0 } : { value: round(massLb, 0), unit: "lb", label: "Weight", precision: 0 }
    );
    secondary.push(metric ? { value: tonnes, unit: "t", label: "Metric tonnes", precision: 2 } : { value: shortTons, unit: "ton", label: "Short tons", precision: 2 });
    secondary.push(metric ? { value: shortTons, unit: "ton", label: "Short tons", precision: 2 } : { value: tonnes, unit: "t", label: "Metric tonnes", precision: 2 });
  }
  if (compactedFillCuYd !== null) {
    secondary.push(
      metric ? { value: round(compactedFillCuYd * convert(1, "cuyd", "cum"), 2), unit: "cum", label: "Compacted fill this builds", precision: 2 } : { value: round(compactedFillCuYd, 2), unit: "cuyd", label: "Compacted fill this builds", precision: 2 }
    );
  }
  if (loads > 0) secondary.push({ value: loads, unit: "load", label: "Truck loads", precision: 0 });
  if (costVolume !== null) secondary.push({ value: costVolume, unit: "usd", label: "Cost by volume", precision: 2 });
  if (costWeight !== null) secondary.push({ value: costWeight, unit: "usd", label: "Cost by weight", precision: 2 });
  const takeoff = [];
  const vUnit = metric ? "cum" : "cuyd";
  const vQty = (cuYd, dec = 3) => round(metric ? cuYd * CUM_PER_CUYD2 : cuYd, dec);
  const vTxt = (cuYd, dec = 3) => metric ? `${formatNumber(cuYd * CUM_PER_CUYD2, dec)} m³` : `${formatNumber(cuYd, dec)} cu yd`;
  const dTxt = (m) => metric ? `${formatNumber(fromBase(m, "cm"), 2)} cm` : `${formatNumber(fromBase(m, "in"), 2)} in`;
  const depthText = dTxt(meanDepth);
  const depthPart = i.varies ? `(${dTxt(d1)} + ${dTxt(d2)}) / 2` : dTxt(d1);
  const geometryNote = metric ? `${formatNumber(area, 2)} m² x ${depthPart} / 100 = ${formatNumber(volume, 3)} m³.` : `${formatNumber(areaSqFt, 0)} sq ft x ${depthPart} / 12 = ${formatNumber(volumeCuFt, 2)} cu ft / ${CUFT_PER_CUYD}.`;
  const orderNote = factorSource === "compaction" ? `${vTxt(volumeCuYd)} x ${factor} (${factorDivision(i.material, "compaction")}, ±33%, highway embankment).` : factorSource === "allowance" ? `${vTxt(volumeCuYd)} x ${formatNumber(factor, 2)} = your ${formatNumber(allowance ?? 0, 0)}% allowance.` : factorSource === "swell" ? swell === null ? `${vTxt(volumeCuYd)}, no published swell factor for "other".` : `${vTxt(volumeCuYd)} x ${swell} (${factorDivision(i.material, "swell")}, ±33%).` : `${vTxt(volumeCuYd)}, ordered as measured — loose, nothing converted.`;
  if (area > 0 && meanDepth > 0) {
    takeoff.push({
      key: "volume",
      item: dig ? `Excavation in place, ${depthText} deep` : `Space to fill, ${depthText} deep`,
      qty: vQty(volumeCuYd),
      unit: vUnit,
      // Compaction is not waste: the column stays empty and the arithmetic
      // goes in the note (session 6, S-101).
      order: vQty(orderCuYd, 2),
      orderUnit: vUnit,
      note: geometryNote
    });
    takeoff.push({
      key: "order",
      item: dig ? `${FILL_MATERIAL_NAMES[i.material]}, loose, to haul` : `${FILL_MATERIAL_NAMES[i.material]}, loose, to order`,
      qty: vQty(orderCuYd),
      unit: vUnit,
      order: vQty(orderCuYd, 2),
      orderUnit: vUnit,
      note: orderNote
    });
    if (massLb !== null && shortTons !== null && densityLb !== null) {
      takeoff.push({
        key: "weight",
        item: dig ? `Weight hauled, ${FILL_MATERIAL_NAMES[i.material].toLowerCase()}` : `Weight delivered, ${FILL_MATERIAL_NAMES[i.material].toLowerCase()}`,
        qty: metric ? round(massKg ?? 0, 0) : round(massLb, 0),
        unit: metric ? "kg" : "lb",
        order: metric ? tonnes ?? 0 : shortTons,
        orderUnit: metric ? "t" : "ton",
        note: metric ? `${formatNumber(weighedM3, 3)} m³ x ${formatNumber(densityKgM3 ?? 0, 0)} kg/m³${ownDensity ? " (your figure)" : ""}; 1 t = 1,000 kg.` : `${formatNumber(weighedCuYd, 3)} cu yd x ${formatNumber(densityLb, 0)} lb/cu yd${ownDensity ? " (your figure)" : ""}; 1 tn = ${formatNumber(LB_PER_SHORT_TON2, 0)} lb.`
      });
    }
    if (compactedFillCuYd !== null && ratio !== null) {
      takeoff.push({
        key: "compacted-fill",
        item: "Compacted fill this would build",
        qty: vQty(compactedFillCuYd),
        unit: vUnit,
        order: vQty(compactedFillCuYd, 2),
        orderUnit: vUnit,
        note: `${vTxt(orderCuYd)} loose ÷ ${ratio}, compacted to that spec. ±33%.`
      });
    }
    if (loads > 0 && i.truck !== null) {
      takeoff.push({
        key: "loads",
        item: "Truck loads",
        qty: vQty(billableCuYd, 2),
        unit: vUnit,
        order: loads,
        orderUnit: "load",
        note: `${metric ? `${formatNumber(billableCuYd * CUM_PER_CUYD2, 3)} m³` : `${formatNumber(billableCuYd, 2)} cu yd`} ÷ ${payload} per load, rounded up.`
      });
    }
    if (costVolume !== null) {
      takeoff.push({
        key: "cost-volume",
        item: "Material at your quoted price per yard",
        qty: vQty(billableCuYd, 2),
        unit: vUnit,
        order: costVolume,
        orderUnit: "usd",
        note: `${formatNumber(billableCuYd, 2)} cu yd x $${formatNumber(i.pricePerYd ?? 0, 2, false)}. Material only.`
      });
    }
    if (costWeight !== null && shortTons !== null) {
      takeoff.push({
        key: "cost-weight",
        item: "Material at your quoted price per ton",
        qty: shortTons,
        unit: "ton",
        order: costWeight,
        orderUnit: "usd",
        note: `${formatNumber(shortTons, 2)} tn x $${formatNumber(i.pricePerTon ?? 0, 2, false)} per short ton. Material only.`
      });
    }
  }
  const assumptions = [
    i.varies ? "Volume = area x the mean of the two depths: exact for a surface sloping in one plane, and a geometry, not an estimate." : "Volume = area x depth. Cubic feet / 27 = cubic yards.",
    dig ? `Loose volume to haul = the in-place volume ${swell === null ? 'x nothing: "other" has no published row.' : swellNote(i.material) ?? ""}` : factorSource === "compaction" ? `Order = the space measured ${compactionNote(i.material) ?? ""}` : factorSource === "allowance" ? `Order = the space measured x ${formatNumber(factor, 2)}, your ${formatNumber(allowance ?? 0, 0)}% allowance, not a published figure.` : NO_CONVERSION_NOTE,
    densityLb === null ? 'No density is used at all: "other" has no published row, so the sheet stops at volumes.' : ownDensity ? `Density ${formatNumber(densityLb, 0)} lb per cubic yard (${formatNumber(densityKgM3 ?? 0, 0)} kg/m³), entered by you. Nothing here claims it.` : `Density ${formatNumber(densityLb, 0)} lb per cubic yard (${formatNumber(densityKgM3 ?? 0, 0)} kg/m³) - FHWA Exhibit 5.1 A, ${FILL_MATERIAL_NAMES[i.material].toLowerCase()}, ${dig ? "in-situ" : "loose"} column, opened 2026-09-19. ±5% on the densities, ±33% on the factors.`,
    "No price per cubic yard is suggested: no open source publishes one. Ask two local suppliers, delivered."
  ];
  if (i.truck === null) assumptions.push("Truck capacity is yours: a tandem, a triaxle and a trailer carry different yardages, and nothing here claims one.");
  return {
    primary,
    secondary,
    takeoff,
    warnings,
    assumptions,
    raw: { area, volume, orderVolume, massKg },
    areaSqFt,
    meanDepth,
    volumeCuFt,
    volumeCuYd,
    factor,
    factorSource,
    orderCuYd,
    looseCuYd,
    compactedFillCuYd,
    densityLb,
    densityKgM3,
    ownDensity,
    massLb,
    massKg,
    shortTons,
    tonnes,
    loads,
    costVolume,
    costWeight
  };
}
var fillDirtSpec = {
  id: FILLDIRT_ID,
  version: FILLDIRT_VERSION,
  revised: FILLDIRT_REVISED,
  inputs: fillDirtInputs,
  compute: computeFillDirt
};

// src/data/reference/sand.ts
var FHWA_SAND_RATIO = 1.25;
var FHWA_SHORT = "x 1.25 = 3,240 / 2,590 lb/cu yd, FHWA Exhibit 5.1 A sand dry. For estimating purposes, ±33%: highway embankment, not a plate-compacted layer.";
var SAND_ROWS = {
  dry: { loose: { lb: 2400, kg: 1420 }, bank: { lb: 2700, kg: 1600 } },
  damp: { loose: { lb: 2850, kg: 1690 }, bank: { lb: 3200, kg: 1900 } },
  wet: { loose: { lb: 3100, kg: 1840 }, bank: { lb: 3500, kg: 2080 } }
};
var MOISTURE_ORDER = ["dry", "damp", "wet"];
var COLUMN_ORDER = ["loose", "bank"];
var MOISTURE_LABELS = {
  dry: "Dry",
  damp: "Damp",
  wet: "Wet"
};
var COLUMN_LABELS = {
  loose: "Loose, as delivered",
  bank: "Bank, in the deposit"
};
var DEFAULT_MOISTURE = "dry";
var DEFAULT_COLUMN = "loose";
var LB_PER_SHORT_TON3 = 2e3;
var CUFT_PER_CUYD2 = 27;
var BEDDING_IN = 1;
var DEFAULT_BAG_LB = 50;
function sandDensityLb(moisture, column) {
  return SAND_ROWS[moisture][column].lb;
}
function sandDensityKg(moisture, column) {
  return SAND_ROWS[moisture][column].kg;
}

// src/engine/formulas/earthwork/sand.ts
var SAND_ID = "earthwork-sand";
var SAND_VERSION = "1.1.0";
var SAND_REVISED = "2026-09-19";
var MAX_ZONES2 = 4;
var USE_VALUES = ["bedding", "fill"];
var SHAPE_VALUES3 = ["rectangle", "circle", "triangle"];
var SHAPE_IDS2 = new Set(SHAPE_VALUES3);
var SHAPE_OPTIONS2 = SHAPE_VALUES3.map((value) => ({ value }));
var DENSITY_UNITS3 = ["lbyd", "kgm3"];
var KGM3_TO_LBCUYD3 = convert(convert(1, "cuyd", "cum"), "kg", "lb");
function finite5(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}
function zoneArea2(z) {
  const a = finite5(z.a);
  const b = finite5(z.b);
  if (a <= 0) return 0;
  if (z.shape === "circle") return Math.PI * a * a / 4;
  if (b <= 0) return 0;
  if (z.shape === "triangle") return a * b / 2;
  return a * b;
}
var G_AREAS2 = { id: "areas" };
var G_SUPPLY2 = { id: "supply" };
var G_ORDER3 = { id: "order" };
function shapeFields2(k) {
  const s = k === 1 ? "" : String(k);
  const tag = k === 1 ? "" : `Area ${k} `;
  const adv = k > 1;
  const group2 = adv ? G_AREAS2 : void 0;
  const cap = (t) => k === 1 ? t : t.toLowerCase();
  const common = {
    kind: "length",
    units: ["ft", "in"],
    metricUnit: "m",
    min: 0,
    max: 5e3,
    advanced: adv,
    ...group2 ? { group: group2 } : {}
  };
  return [
    {
      key: `shape${s}`,
      q: `s${s}`,
      label: `${tag}${cap("Shape")}`,
      kind: "select",
      default: "rectangle",
      options: SHAPE_OPTIONS2,
      advanced: adv,
      ...group2 ? { group: group2 } : {}
    },
    {
      ...common,
      key: `length${s}`,
      q: `l${s}`,
      label: `${tag}${cap("Length")}`,
      default: k === 1 ? 12 : 0,
      metricDefault: k === 1 ? 3.6 : 0,
      showWhen: `shape${s}=rectangle`
    },
    {
      ...common,
      key: `width${s}`,
      q: `w${s}`,
      label: `${tag}${cap("Width")}`,
      default: k === 1 ? 12 : 0,
      metricDefault: k === 1 ? 3.6 : 0,
      showWhen: `shape${s}=rectangle`
    },
    {
      ...common,
      key: `diameter${s}`,
      q: `dia${s}`,
      label: `${tag}${cap("Diameter")}`,
      default: 0,
      showWhen: `shape${s}=circle`
    },
    {
      ...common,
      key: `base${s}`,
      q: `b${s}`,
      label: `${tag}${cap("Base")}`,
      default: 0,
      showWhen: `shape${s}=triangle`
    },
    {
      ...common,
      key: `height${s}`,
      q: `h${s}`,
      label: `${tag}${k === 1 ? "Height (perpendicular to the base)" : "height"}`,
      default: 0,
      showWhen: `shape${s}=triangle`
    }
  ];
}
var TONNES_PER_SHORT_TON2 = convert(1, "ton", "t");
var CUM_PER_CUYD3 = convert(1, "cuyd", "cum");
var sandInputs = [
  ...shapeFields2(1),
  {
    key: "use",
    q: "u",
    label: "What the sand is for",
    kind: "select",
    default: "bedding",
    options: USE_VALUES.map((value) => ({ value }))
  },
  {
    key: "depth",
    q: "d",
    label: "Depth of sand",
    kind: "length",
    units: ["in", "ft"],
    metricUnit: "cm",
    default: `${BEDDING_IN}in`,
    metricDefault: "2.5cm",
    min: 0,
    max: 120
  },
  {
    key: "moisture",
    q: "m",
    label: "Moisture state",
    kind: "select",
    default: DEFAULT_MOISTURE,
    options: MOISTURE_ORDER.map((value) => ({ value }))
  },
  {
    key: "column",
    q: "c",
    label: "Measured as",
    kind: "select",
    default: DEFAULT_COLUMN,
    options: COLUMN_ORDER.map((value) => ({ value }))
  },
  { key: "bag", q: "bg", label: "Bag weight", kind: "count", default: DEFAULT_BAG_LB, metricDefault: "", optional: true, min: 1, max: 200 },
  // ---- advanced: areas 2 to 4 -----------------------------------------
  ...shapeFields2(2),
  ...shapeFields2(3),
  ...shapeFields2(4),
  // ---- advanced: your supplier's figure -------------------------------
  { key: "density", q: "den", label: "Supplier density", kind: "count", default: "", optional: true, min: 1, max: 12e3, advanced: true, group: G_SUPPLY2 },
  {
    key: "densityUnit",
    q: "du",
    label: "Supplier density unit",
    kind: "select",
    default: "lbyd",
    options: DENSITY_UNITS3.map((value) => ({ value })),
    advanced: true,
    group: G_SUPPLY2
  },
  // ---- advanced: ordering ---------------------------------------------
  // Hidden on the bank column: bank is a weight, and the ratio is never applied to it.
  { key: "compacted", q: "cp", label: "Depth is the compacted layer", kind: "toggle", default: false, advanced: true, group: G_ORDER3, showWhen: "column=loose" },
  { key: "overage", q: "ov", label: "Overage", kind: "percent", default: 0, min: 0, max: 25, step: 1, advanced: true, group: G_ORDER3 },
  { key: "truckTons", q: "tk", label: "Truck payload", kind: "count", default: "", optional: true, min: 1, max: 40, advanced: true, group: G_ORDER3, suffix: "short tons", metricSuffix: "t", metricFactor: TONNES_PER_SHORT_TON2 },
  {
    key: "priceTon",
    q: "pt",
    label: "Price per ton",
    kind: "money",
    default: "",
    optional: true,
    min: 0,
    max: 5e3,
    advanced: true,
    group: G_ORDER3,
    suffix: "$ / short ton",
    metricSuffix: "$ / t",
    metricFactor: TONNES_PER_SHORT_TON2,
    metricPerUnit: true
  },
  { key: "priceBag", q: "pb", label: "Price per bag", kind: "money", default: "", optional: true, min: 0, max: 500, advanced: true, group: G_ORDER3 }
];
var USES = new Set(USE_VALUES);
var MOISTURES = new Set(MOISTURE_ORDER);
var COLUMNS = new Set(COLUMN_ORDER);
var DENSITY_UNIT_IDS3 = new Set(DENSITY_UNITS3);
function parseSandInputs(raw, system = "imperial") {
  const { values, errors } = coerce(sandInputs, raw, system);
  const zones = [];
  for (let k = 1; k <= MAX_ZONES2; k += 1) {
    const s = k === 1 ? "" : String(k);
    const shapeRaw = str(values, `shape${s}`, "rectangle");
    const shape = SHAPE_IDS2.has(shapeRaw) ? shapeRaw : "rectangle";
    if (shape === "circle") zones.push({ shape, a: num(values, `diameter${s}`), b: 0 });
    else if (shape === "triangle") zones.push({ shape, a: num(values, `base${s}`), b: num(values, `height${s}`) });
    else zones.push({ shape, a: num(values, `length${s}`), b: num(values, `width${s}`) });
  }
  const bagSubmitted = Object.prototype.hasOwnProperty.call(raw, "bag");
  const bag = optNum(values, "bag") ?? (bagSubmitted || system === "metric" ? null : DEFAULT_BAG_LB);
  const priceTonTyped = optNum(values, "priceTon");
  const truckTyped = optNum(values, "truckTons");
  const useRaw = str(values, "use", "bedding");
  const moistureRaw = str(values, "moisture", DEFAULT_MOISTURE);
  const columnRaw = str(values, "column", DEFAULT_COLUMN);
  const densityUnitRaw = str(values, "densityUnit", "lbyd");
  return {
    inputs: {
      system,
      zones,
      depth: num(values, "depth", 0),
      use: USES.has(useRaw) ? useRaw : "bedding",
      moisture: MOISTURES.has(moistureRaw) ? moistureRaw : DEFAULT_MOISTURE,
      column: COLUMNS.has(columnRaw) ? columnRaw : DEFAULT_COLUMN,
      compacted: bool(values, "compacted"),
      density: optNum(values, "density"),
      densityUnit: DENSITY_UNIT_IDS3.has(densityUnitRaw) ? densityUnitRaw : "lbyd",
      bag,
      overagePct: num(values, "overage", 0),
      truckTons: truckTyped === null || system !== "metric" ? truckTyped : truckTyped / TONNES_PER_SHORT_TON2,
      // Metric types $ per tonne; the sheet prices short tons, so 33.07 $/t is 30 $/ton.
      pricePerTon: priceTonTyped === null || system !== "metric" ? priceTonTyped : round(priceTonTyped * TONNES_PER_SHORT_TON2, 2),
      pricePerBag: optNum(values, "priceBag")
    },
    errors
  };
}
function computeSand(input) {
  const warnings = [];
  const i = {
    ...input,
    zones: input.zones.map((z) => ({ shape: z.shape, a: finite5(z.a), b: finite5(z.b) })),
    depth: finite5(input.depth),
    density: input.density === null ? null : finite5(input.density),
    bag: input.bag === null ? null : finite5(input.bag),
    overagePct: finite5(input.overagePct, 0),
    truckTons: input.truckTons === null ? null : finite5(input.truckTons),
    pricePerTon: input.pricePerTon === null ? null : finite5(input.pricePerTon),
    pricePerBag: input.pricePerBag === null ? null : finite5(input.pricePerBag)
  };
  const metric = i.system === "metric";
  if (i.zones.some((z) => z.a < 0 || z.b < 0) || i.depth < 0) {
    warnings.push({
      level: "error",
      code: "negative-dimension",
      message: "Negative dimensions ignored. Enter positive lengths."
    });
  }
  const overagePct = Math.min(25, Math.max(0, i.overagePct));
  if (i.overagePct !== overagePct) {
    warnings.push({ level: "caution", code: "overage-clamped", message: "Overage clamped to 0-25%.", field: "overage" });
  }
  const depth = Math.max(0, i.depth);
  const zonesUsed = i.zones.filter((z) => zoneArea2(z) > 0);
  const area = zonesUsed.reduce((sum, z) => sum + zoneArea2(z), 0);
  const volume = area * depth;
  const volumeCuFt = convert(volume, "cum", "cuft");
  const volumeCuYd = convert(volume, "cum", "cuyd");
  const compacted = i.compacted && i.column === "loose";
  const ratio = compacted ? FHWA_SAND_RATIO : 1;
  const orderVolume = volume * ratio * (1 + overagePct / 100);
  const orderCuYd = convert(orderVolume, "cum", "cuyd");
  const published = sandDensityLb(i.moisture, i.column);
  const typed = i.density !== null && i.density > 0 ? i.density : null;
  const ownDensity = typed !== null;
  const densityLb = typed === null ? published : i.densityUnit === "kgm3" ? typed * KGM3_TO_LBCUYD3 : typed;
  const bagDensityLb = ownDensity ? densityLb : sandDensityLb("dry", i.column);
  if (ownDensity) {
    warnings.push({
      level: "info",
      code: "density-override",
      message: `Using your ${formatNumber(densityLb, 0)} lb/cu yd. Nothing here claims it, and the bag count follows it.`,
      field: "density"
    });
  } else if (i.moisture !== "dry") {
    warnings.push({
      level: "info",
      code: "bags-from-dry",
      message: `${MOISTURE_LABELS[i.moisture]} sand scales at ${formatNumber(published, 0)} lb/cu yd, not ${formatNumber(bagDensityLb, 0)}. The tonnage moves; the bag count does not.`,
      field: "moisture"
    });
  }
  const massLb = volumeCuYd * densityLb;
  const orderLb = orderCuYd * densityLb;
  const tons = massLb / LB_PER_SHORT_TON3;
  const tonnes = convert(massLb, "lb", "t");
  const orderTons = orderLb / LB_PER_SHORT_TON3;
  const bagLb = i.bag === null || i.bag <= 0 ? null : metric ? convert(i.bag, "kg", "lb") : i.bag;
  const bags = bagLb === null ? 0 : roundUpWhole(orderCuYd * bagDensityLb / bagLb);
  const loads = i.truckTons !== null && i.truckTons > 0 ? roundUpWhole(orderTons / i.truckTons) : 0;
  const payload = metric ? `${formatNumber((i.truckTons ?? 0) * TONNES_PER_SHORT_TON2, 3)} t` : `${formatNumber(i.truckTons ?? 0, 2)} tons`;
  const bulkCost = i.pricePerTon !== null && i.pricePerTon >= 0 ? round(orderTons * i.pricePerTon, 2) : null;
  const bagCost = i.pricePerBag !== null && i.pricePerBag >= 0 && bags > 0 ? round(bags * i.pricePerBag, 2) : null;
  if (area <= 0) {
    warnings.push({ level: "info", code: "no-dimensions", message: "Enter an area and a depth to get a volume." });
  } else if (depth <= 0) {
    warnings.push({ level: "info", code: "no-depth", message: "Enter a depth of sand to get a volume.", field: "depth" });
  }
  if (bagLb === null && area > 0 && depth > 0) {
    warnings.push({
      level: "info",
      code: "no-bag-weight",
      message: "Enter the net weight printed on the bag to count bags.",
      field: "bag"
    });
  }
  const depthIn = fromBase(depth, "in");
  if (i.use === "bedding" && depthIn > BEDDING_IN) {
    warnings.push({
      level: "caution",
      code: "bedding-deeper-than-source",
      message: `${formatNumber(depthIn, 2)} in of bedding sand. The cited guide screeds one inch.`,
      field: "depth"
    });
  }
  if (loads > 1 && i.truckTons !== null) {
    warnings.push({
      level: "info",
      code: "multi-load",
      message: `${loads} loads at ${payload}, the payload you entered.`
    });
  }
  if (bags > 0 && bags >= 40) {
    warnings.push({
      level: "caution",
      code: "bulk-cheaper",
      message: `${bags} bags is ${formatNumber(orderCuYd, 2)} cubic yards: price a bulk delivery too.`,
      field: "bag"
    });
  }
  const primary = metric ? { value: round(orderVolume, 3), unit: "cum", label: "Sand volume", precision: 3 } : { value: round(orderCuYd, 3), unit: "cuyd", label: "Sand volume", precision: 3 };
  const secondary = [];
  secondary.push(
    bagLb === null ? { value: 0, unit: "bag", label: "Bags", display: "—" } : {
      value: bags,
      unit: "bag",
      label: metric ? `${formatNumber(i.bag ?? 0, 0)} kg bags` : `${formatNumber(bagLb, 0)} lb bags`,
      precision: 0
    }
  );
  if (metric) {
    secondary.push({ value: round(area, 2), unit: "sqm", label: "Area covered", precision: 2 });
  } else {
    secondary.push({ value: round(convert(area, "sqm", "sqft"), 0), unit: "sqft", label: "Area covered", precision: 0 });
    secondary.push({ value: round(volumeCuFt, 2), unit: "cuft", label: "Volume to fill", precision: 2 });
  }
  const qTons = { value: round(orderTons, 2), unit: "ton", precision: 2 };
  const qTonnes = { value: round(convert(orderLb, "lb", "t"), 2), unit: "t", precision: 2 };
  secondary.unshift({ ...metric ? qTonnes : qTons, label: "Order quantity" });
  secondary.push(metric ? { ...qTons, label: "Short tons" } : { ...qTonnes, label: "Metric tonnes" });
  secondary.push({
    value: round(densityLb, 0),
    unit: "lb",
    label: "Density used",
    display: metric ? `${formatNumber(ownDensity ? convert(densityLb, "lb", "kg") / convert(1, "cuyd", "cum") : sandDensityKg(i.moisture, i.column), 0)} kg / m³` : `${formatNumber(densityLb, 0)} lb / cu yd`
  });
  if (loads > 0) secondary.push({ value: loads, unit: "load", label: "Truck loads", precision: 0 });
  if (bulkCost !== null) secondary.push({ value: bulkCost, unit: "usd", label: "Bulk cost", precision: 2 });
  if (bagCost !== null) secondary.push({ value: bagCost, unit: "usd", label: "Bagged cost", precision: 2 });
  const takeoff = [];
  const depthLabel = metric ? `${formatNumber(fromBase(depth, "cm"), 2)} cm` : `${formatNumber(depthIn, 2)} in`;
  if (area > 0 && depth > 0) {
    takeoff.push({
      key: "volume",
      item: `Sand, ${i.use === "bedding" ? "paver bedding" : "fill"}, ${depthLabel} deep`,
      // Every quantity below is converted from the base figure (m3, m2, metres),
      // never from a rounded printed one.
      qty: round(metric ? volume : volumeCuYd, 3),
      unit: metric ? "cum" : "cuyd",
      waste: overagePct || void 0,
      order: round(metric ? orderVolume : orderCuYd, 3),
      orderUnit: metric ? "cum" : "cuyd",
      note: metric ? `${formatNumber(area, 2)} m² x ${depthLabel} = ${formatNumber(volume, 3)} m³.` : `${formatNumber(convert(area, "sqm", "sqft"), 0)} sq ft x ${formatNumber(depthIn, 2)} in / 12 = ${formatNumber(volumeCuFt, 2)} cu ft, divided by ${CUFT_PER_CUYD2}.`
    });
    takeoff.push({
      key: "weight",
      item: `Weight, ${MOISTURE_LABELS[i.moisture].toLowerCase()} ${COLUMN_LABELS[i.column].toLowerCase()}`,
      qty: metric ? round(convert(orderLb, "lb", "kg"), 0) : round(orderLb, 0),
      unit: metric ? "kg" : "lb",
      order: round(metric ? convert(orderLb, "lb", "t") : orderTons, 2),
      orderUnit: metric ? "t" : "ton",
      note: metric ? `${formatNumber(orderVolume, 3)} m³ x ${formatNumber(densityLb / KGM3_TO_LBCUYD3, 0)} kg/m³${ownDensity ? " (your figure)" : ""}. 1 tonne = 1,000 kg.` : `${formatNumber(orderCuYd, 3)} cu yd x ${formatNumber(densityLb, 0)} lb/cu yd${ownDensity ? " (your figure)" : ""}. 1 short ton = 2,000 lb.`
    });
    if (bagLb !== null) {
      takeoff.push({
        key: "bags",
        // A bag is a product, not a unit: the count never moves, but the net weight
        // printed on it is named in the system the reader is working in.
        item: metric ? `Bags at ${formatNumber(convert(bagLb, "lb", "kg"), 1)} kg net` : `Bags at ${formatNumber(bagLb, 0)} lb net`,
        qty: round(orderCuYd * bagDensityLb / bagLb, 2),
        unit: "bag",
        order: bags,
        orderUnit: "bag",
        note: (metric ? `${formatNumber(orderVolume, 3)} m³ x ${formatNumber(bagDensityLb / KGM3_TO_LBCUYD3, 0)} kg/m³ / ${formatNumber(convert(bagLb, "lb", "kg"), 1)} kg, rounded up.` : `${formatNumber(orderCuYd, 3)} cu yd x ${formatNumber(bagDensityLb, 0)} lb/cu yd / ${formatNumber(bagLb, 0)} lb, rounded up.`) + (ownDensity ? "" : " Dry row: moisture is weight, not volume.")
      });
    }
    if (loads > 0 && i.truckTons !== null) {
      takeoff.push({
        key: "loads",
        item: "Truck loads",
        // The payload field itself is in short tons in both systems, so the note keeps
        // naming it that way; the quantity being hauled follows the reader.
        qty: round(metric ? convert(orderLb, "lb", "t") : orderTons, 2),
        unit: metric ? "t" : "ton",
        order: loads,
        orderUnit: "load",
        note: `${payload} per load, the payload you entered.`
      });
    }
    if (bulkCost !== null) {
      takeoff.push({
        key: "bulk-cost",
        item: "Bulk sand at your quoted price",
        // The quantity priced follows the system too, or the sheet bills tonnes and counts short tons.
        qty: round(metric ? orderTons * TONNES_PER_SHORT_TON2 : orderTons, 2),
        unit: metric ? "t" : "ton",
        order: bulkCost,
        orderUnit: "usd",
        // The price was typed in the reader's own unit: quote the note back in it,
        // or a metric sheet reads "tons x $ per tonne" and the line stops being true.
        note: metric ? `${formatNumber(orderTons * TONNES_PER_SHORT_TON2, 2)} t x $${formatNumber((i.pricePerTon ?? 0) / TONNES_PER_SHORT_TON2, 2, false)}. Material only.` : `${formatNumber(orderTons, 2)} tons x $${formatNumber(i.pricePerTon ?? 0, 2, false)}. Material only.`
      });
    }
    if (bagCost !== null) {
      takeoff.push({
        key: "bag-cost",
        item: "Bagged sand at your shelf price",
        qty: bags,
        unit: "bag",
        order: bagCost,
        orderUnit: "usd",
        note: `${bags} bags x $${formatNumber(i.pricePerBag ?? 0, 2, false)}${bulkCost !== null ? `, against $${formatNumber(bulkCost, 2, false)} in bulk` : ""}.`
      });
    }
  }
  const assumptions = [
    "Volume = area x depth. Weight = cubic yards x a published density. Bags = that weight / the net weight of one bag, rounded up.",
    ownDensity ? `Density ${formatNumber(densityLb, 0)} lb per cubic yard, entered by you. Nothing here claims it, and the bag count follows it.` : `Density ${formatNumber(densityLb, 0)} lb per cubic yard - Caterpillar's ${MOISTURE_LABELS[i.moisture].toLowerCase()} sand row, ${COLUMN_LABELS[i.column].toLowerCase()} column, opened 2026-09-19. Bags come off the dry row of the same column, ${formatNumber(bagDensityLb, 0)} lb: water is weight, not volume.`,
    i.use === "bedding" ? "Depth preset: the one-inch screeded bedding layer from the Oregon State University Extension paver guide. Editable, and the base under it is sheet C-101." : "Depth is yours: no fill, levelling or sandbox depth is suggested on this sheet.",
    overagePct > 0 ? `Overage ${overagePct}% on top of the volume - your figure, not a published allowance.` : compacted ? "No overage and no waste are added: the sheet orders what it calculated." : "No overage, no compaction allowance and no waste are added: the sheet orders what it calculated.",
    "No grade of sand is named. Concrete, mason, fill and washed sand move from yard to yard; ask your supplier which one your job takes."
  ];
  if (compacted) assumptions.push(`Compacted layer ${FHWA_SHORT}`);
  if (zonesUsed.length > 1) assumptions.push(`${zonesUsed.length} areas added together; overlapping areas are not detected.`);
  return {
    primary,
    secondary,
    takeoff,
    warnings,
    assumptions,
    raw: { area, volume, massKg: convert(massLb, "lb", "kg") },
    zonesUsed,
    volumeCuFt,
    volumeCuYd,
    orderVolume,
    orderCuYd,
    densityLb,
    ownDensity,
    bagDensityLb,
    massLb,
    tons,
    tonnes,
    orderTons,
    bagLb,
    bags,
    loads,
    bulkCost,
    bagCost
  };
}
var sandSpec = {
  id: SAND_ID,
  version: SAND_VERSION,
  revised: SAND_REVISED,
  inputs: sandInputs,
  compute: computeSand
};

// src/data/reference/topsoil.ts
var TOPSOIL_LOOSE_LB_CUYD = 1620;
var TOPSOIL_LOOSE_LB_CUYD_CAT = 1600;
var LB_PER_SHORT_TON4 = 2e3;
var CUFT_PER_CUYD3 = 27;
var TOPSOIL_JOBS = {
  "new-lawn": { depthIn: 4, kind: "reach", low: 4, high: null },
  topdress: { depthIn: 0.5, kind: "max", low: null, high: 0.5 },
  "bed-amend": { depthIn: 3, kind: "add", low: 2, high: 4 },
  "raised-bed": { depthIn: 8, kind: "fill", low: 6, high: 24 }
};
var TOPSOIL_JOB_ORDER = ["new-lawn", "topdress", "bed-amend", "raised-bed"];
var DEFAULT_TOPSOIL_JOB = "new-lawn";
var TOPSOIL_JOB_NAMES = {
  "new-lawn": "New lawn",
  topdress: "Top-dressing",
  "bed-amend": "Bed amendment",
  "raised-bed": "Raised bed"
};
var DEFAULT_BAG_CUFT = 1;
var TOPDRESS_MAX_NOTE = "Clemson HGIC says no more than 0.5 in of material at a time: a thicker pass stunts the turf and shades it.";
var BED_MIN_NOTE = "USU Extension gives 6 to 12 in for the box, and a bed under 12 in should have no bottom so roots reach the soil below.";

// src/engine/formulas/earthwork/topsoil.ts
var TOPSOIL_ID = "earthwork-topsoil";
var TOPSOIL_VERSION = "1.0.0";
var TOPSOIL_REVISED = "2026-09-20";
var SHAPE_VALUES4 = ["rectangle", "circle", "triangle"];
var CUM_PER_CUYD4 = convert(1, "cuyd", "cum");
function finite6(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}
function shapeArea2(shape, a, b) {
  const x = finite6(a);
  const y = finite6(b);
  if (x <= 0) return 0;
  if (shape === "circle") return Math.PI * x * x / 4;
  if (y <= 0) return 0;
  return shape === "triangle" ? x * y / 2 : x * y;
}
var G_DEPTH = { id: "depth" };
var G_SUPPLY3 = { id: "supply" };
var G_ORDER4 = { id: "order" };
var PLAN_LENGTH3 = {
  kind: "length",
  units: ["ft", "in"],
  metricUnit: "m",
  min: 0,
  max: 5e3
};
var topsoilInputs = [
  { key: "job", q: "j", label: "What you are doing", kind: "select", default: DEFAULT_TOPSOIL_JOB, options: TOPSOIL_JOB_ORDER.map((value) => ({ value })) },
  { key: "shape", q: "s", label: "Shape of the area", kind: "select", default: "rectangle", options: SHAPE_VALUES4.map((value) => ({ value })) },
  { ...PLAN_LENGTH3, key: "length", q: "l", label: "Length", default: 20, metricDefault: 6, showWhen: "shape=rectangle" },
  { ...PLAN_LENGTH3, key: "width", q: "w", label: "Width", default: 10, metricDefault: 3, showWhen: "shape=rectangle" },
  { ...PLAN_LENGTH3, key: "diameter", q: "dia", label: "Diameter", default: 0, showWhen: "shape=circle" },
  { ...PLAN_LENGTH3, key: "base", q: "b", label: "Base", default: 0, showWhen: "shape=triangle" },
  { ...PLAN_LENGTH3, key: "height", q: "h", label: "Height (perpendicular to the base)", default: 0, showWhen: "shape=triangle" },
  // The DEFAULT of this field is the new-lawn figure; `parseTopsoilInputs`
  // substitutes the published figure of whichever job is selected when nothing
  // was typed (4 / 0.5 / 3 / 8 in), because the depth means a different thing
  // in each job and so does its published value.
  {
    key: "depth",
    q: "d",
    label: "Depth",
    kind: "length",
    units: ["in", "ft"],
    metricUnit: "cm",
    default: "4in",
    metricDefault: "10.16cm",
    min: 0,
    max: 120
  },
  // Only a reach job reads this. It is the reason the sheet exists.
  {
    key: "existing",
    q: "e",
    label: "Topsoil already on the ground",
    kind: "length",
    units: ["in", "ft"],
    metricUnit: "cm",
    default: 0,
    min: 0,
    max: 120,
    showWhen: "job=new-lawn"
  },
  // ---- advanced ----
  { key: "density", q: "den", label: "Supplier density", kind: "count", default: "", optional: true, min: 1, max: 6e3, advanced: true, group: G_SUPPLY3, suffix: "lb / cu yd" },
  { key: "bagCuFt", q: "bag", label: "Cubic feet in a bag", kind: "count", default: DEFAULT_BAG_CUFT, min: 0.1, max: 3, step: 0.05, advanced: true, group: G_SUPPLY3, suffix: "cu ft" },
  { key: "allowance", q: "al", label: "Your own allowance", kind: "count", default: "", optional: true, min: 0, max: 50, advanced: true, group: G_DEPTH, suffix: "%" },
  { key: "truck", q: "tk", label: "Truck capacity", kind: "count", default: "", optional: true, min: 1, max: 40, advanced: true, group: G_ORDER4, suffix: "cu yd", metricSuffix: "m³", metricFactor: CUM_PER_CUYD4 },
  // A price PER a physical unit switches with the unit system (D64): the chip
  // reads $/m³ in metric and the typed figure comes back to $/cu yd here.
  { key: "priceYd", q: "py", label: "Price per cubic yard", kind: "money", default: "", optional: true, min: 0, max: 5e3, advanced: true, group: G_ORDER4, suffix: "$ / cu yd", metricSuffix: "$ / m³", metricFactor: CUM_PER_CUYD4, metricPerUnit: true },
  // A price per BAG is a flat fee on a thing, not a price per physical unit: it
  // is NOT converted (D64). A bag costs what it costs in either system.
  { key: "priceBag", q: "pb", label: "Price per bag", kind: "money", default: "", optional: true, min: 0, max: 500, advanced: true, group: G_ORDER4, suffix: "$ / bag", metricSuffix: "$ / bag" }
];
var SHAPES3 = new Set(SHAPE_VALUES4);
var JOBS = new Set(TOPSOIL_JOB_ORDER);
function has(raw, key) {
  const v = raw[key];
  return v !== void 0 && v !== null && String(v).trim() !== "";
}
function parseTopsoilInputs(raw, system = "imperial") {
  const { values, errors } = coerce(topsoilInputs, raw, system);
  const shapeRaw = str(values, "shape", "rectangle");
  const shape = SHAPES3.has(shapeRaw) ? shapeRaw : "rectangle";
  const jobRaw = str(values, "job", DEFAULT_TOPSOIL_JOB);
  const job = JOBS.has(jobRaw) ? jobRaw : DEFAULT_TOPSOIL_JOB;
  let a = 0;
  let b = 0;
  if (shape === "circle") a = num(values, "diameter");
  else if (shape === "triangle") {
    a = num(values, "base");
    b = num(values, "height");
  } else {
    a = num(values, "length");
    b = num(values, "width");
  }
  const depth = has(raw, "depth") ? num(values, "depth", 0) : toBase(TOPSOIL_JOBS[job].depthIn, "in");
  const priceYdTyped = optNum(values, "priceYd");
  const truckTyped = optNum(values, "truck");
  return {
    inputs: {
      system,
      job,
      shape,
      a,
      b,
      depth,
      // Only a reach job has the field on screen; a stale value from another job
      // must never reduce an order.
      existing: TOPSOIL_JOBS[job].kind === "reach" ? num(values, "existing", 0) : 0,
      allowance: optNum(values, "allowance"),
      density: optNum(values, "density"),
      bagCuFt: num(values, "bagCuFt", DEFAULT_BAG_CUFT),
      // The payload is a QUANTITY: metric types 7.65 m³ for the 10 cu yd load.
      truck: truckTyped === null || system !== "metric" ? truckTyped : truckTyped / CUM_PER_CUYD4,
      pricePerYd: priceYdTyped === null ? null : system === "metric" ? round(priceYdTyped * CUM_PER_CUYD4, 2) : priceYdTyped,
      // Flat fee on a bag: the same money in both systems (D64).
      pricePerBag: optNum(values, "priceBag")
    },
    errors
  };
}
function computeTopsoil(input) {
  const warnings = [];
  const i = {
    ...input,
    a: finite6(input.a),
    b: finite6(input.b),
    depth: finite6(input.depth),
    existing: finite6(input.existing),
    allowance: input.allowance === null ? null : finite6(input.allowance),
    density: input.density === null ? null : finite6(input.density),
    bagCuFt: finite6(input.bagCuFt, DEFAULT_BAG_CUFT),
    truck: input.truck === null ? null : finite6(input.truck),
    pricePerYd: input.pricePerYd === null ? null : finite6(input.pricePerYd),
    pricePerBag: input.pricePerBag === null ? null : finite6(input.pricePerBag)
  };
  const metric = i.system === "metric";
  const row = TOPSOIL_JOBS[i.job];
  const kind = row.kind;
  if (i.a < 0 || i.b < 0 || i.depth < 0 || i.existing < 0) {
    warnings.push({ level: "error", code: "negative-dimension", message: "Negative dimensions ignored. Enter positive lengths." });
  }
  const depthAsked = Math.max(0, i.depth);
  const existing = Math.max(0, i.existing);
  const depthToBuy = kind === "reach" ? Math.max(0, depthAsked - existing) : depthAsked;
  const askedIn = fromBase(depthAsked, "in");
  const existingIn = fromBase(existing, "in");
  const nothingToAdd = kind === "reach" && depthAsked > 0 && depthToBuy <= 0;
  const area = shapeArea2(i.shape, i.a, i.b);
  const areaSqFt = convert(area, "sqm", "sqft");
  const volume = area * depthToBuy;
  const volumeCuFt = convert(volume, "cum", "cuft");
  const volumeCuYd = convert(volume, "cum", "cuyd");
  const allowance = i.allowance !== null && i.allowance > 0 ? Math.min(50, i.allowance) : null;
  const factor = allowance === null ? 1 : round(1 + allowance / 100, 4);
  const orderVolume = volume * factor;
  const orderCuYd = volumeCuYd * factor;
  const orderCuFt = orderCuYd * CUFT_PER_CUYD3;
  const typed = i.density !== null && i.density > 0 ? i.density : null;
  const ownDensity = typed !== null;
  const densityLb = typed ?? TOPSOIL_LOOSE_LB_CUYD;
  const massLb = orderCuYd * densityLb;
  const massKg = convert(massLb, "lb", "kg");
  const shortTons = round(massLb / LB_PER_SHORT_TON4, 2);
  const tonnes = round(massKg / 1e3, 2);
  const bagCuFt = i.bagCuFt > 0 ? i.bagCuFt : DEFAULT_BAG_CUFT;
  const bags = orderCuFt > 0 ? roundUpWhole(orderCuFt / bagCuFt) : 0;
  const coverageSqFtPerCuYd = depthToBuy > 0 ? CUFT_PER_CUYD3 / fromBase(depthToBuy, "ft") : null;
  const coverageM2PerM3 = depthToBuy > 0 ? 1 / depthToBuy : null;
  const loads = i.truck !== null && i.truck > 0 && orderCuYd > 0 ? roundUpWhole(orderCuYd / i.truck) : 0;
  const payload = metric ? `${formatNumber((i.truck ?? 0) * CUM_PER_CUYD4, 3)} m³` : `${formatNumber(i.truck ?? 0, 2)} cu yd`;
  const costParts = [];
  if (i.pricePerYd !== null && i.pricePerYd > 0) costParts.push(orderCuYd * i.pricePerYd);
  if (i.pricePerBag !== null && i.pricePerBag > 0) costParts.push(bags * i.pricePerBag);
  const cost = costParts.length > 0 && orderCuYd > 0 ? round(costParts.reduce((s, v) => s + v, 0), 2) : null;
  const dIn = (metres) => metric ? `${formatNumber(fromBase(metres, "cm"), 2)} cm` : `${formatNumber(fromBase(metres, "in"), 2)} in`;
  if (kind === "max" && row.high !== null && askedIn > row.high + 1e-9) {
    warnings.push({
      level: "caution",
      code: "topdress-over-source",
      message: `${dIn(depthAsked)} in one pass. ${TOPDRESS_MAX_NOTE}`,
      field: "depth"
    });
  }
  if (nothingToAdd) {
    warnings.push({
      level: "error",
      code: "nothing-to-add",
      // TWO sentences on purpose: `plateSubHtml` prints `message.split(". ")[0]` and appends a
      // period, so a single sentence ending in "." comes out with two (seen on the rendered
      // page, session 10). The first sentence is therefore the whole plate line.
      message: `${dIn(existing)} already there reaches the ${dIn(depthAsked)} root zone. This sheet orders nothing, and that is the answer, not a missing input.`,
      field: "existing"
    });
  }
  if (kind === "fill" && row.low !== null && askedIn < row.low - 1e-9 && askedIn > 0) {
    warnings.push({
      level: "caution",
      code: "bed-shallow",
      message: `${dIn(depthAsked)} box. ${BED_MIN_NOTE}`,
      field: "depth"
    });
  }
  if (area <= 0) {
    warnings.push({ level: "info", code: "no-dimensions", message: "Enter the area to get a volume." });
  } else if (depthAsked <= 0) {
    warnings.push({ level: "info", code: "no-depth", message: "Enter a depth to get a volume.", field: "depth" });
  }
  if (ownDensity) {
    warnings.push({
      level: "info",
      code: "density-override",
      message: `Using your ${formatNumber(densityLb, 0)} lb/cu yd. Nothing here claims that figure.`,
      field: "density"
    });
  }
  if (allowance !== null) {
    warnings.push({
      level: "info",
      code: "allowance-applied",
      message: `Your ${formatNumber(allowance, 0)}% allowance is applied. It is your figure, not a published one.`,
      field: "allowance"
    });
  }
  if (loads > 1 && i.truck !== null) {
    warnings.push({
      level: "info",
      code: "multi-load",
      message: `${loads} loads at ${metric ? payload : `${formatNumber(i.truck, 2)} cubic yards`}, the capacity you entered.`
    });
  }
  const primaryLabel = "Topsoil to order";
  const primary = metric ? { value: round(orderVolume, 2), unit: "cum", label: primaryLabel, precision: 2 } : { value: round(orderCuYd, 2), unit: "cuyd", label: primaryLabel, precision: 2 };
  const secondary = [];
  secondary.push(
    metric ? { value: round(orderVolume, 2), unit: "cum", label: "Order quantity", precision: 2 } : { value: round(orderCuYd, 2), unit: "cuyd", label: "Order quantity", precision: 2 }
  );
  if (!metric) secondary.push({ value: round(volumeCuFt, 2), unit: "cuft", label: "Cubic feet", precision: 2 });
  secondary.push({ value: bags, unit: "bag", label: "Bags", precision: 0 });
  secondary.push(
    metric ? { value: round(massKg, 0), unit: "kg", label: "Weight", precision: 0 } : { value: round(massLb, 0), unit: "lb", label: "Weight", precision: 0 }
  );
  secondary.push(metric ? { value: tonnes, unit: "t", label: "Metric tonnes", precision: 2 } : { value: shortTons, unit: "ton", label: "Short tons", precision: 2 });
  secondary.push(
    metric ? { value: round(area, 2), unit: "sqm", label: "Area", precision: 2 } : { value: round(areaSqFt, 0), unit: "sqft", label: "Area", precision: 0 }
  );
  secondary.push(
    metric ? { value: round(fromBase(depthToBuy, "cm"), 2), unit: "cm", label: "Depth to buy", precision: 2 } : { value: round(fromBase(depthToBuy, "in"), 2), unit: "in", label: "Depth to buy", precision: 2 }
  );
  if (coverageSqFtPerCuYd !== null && coverageM2PerM3 !== null) {
    secondary.push(
      metric ? { value: round(coverageM2PerM3, 2), unit: "sqm", label: "Coverage", precision: 2, display: `${formatNumber(coverageM2PerM3, 2)} m² per m³` } : { value: round(coverageSqFtPerCuYd, 2), unit: "sqft", label: "Coverage", precision: 2, display: `${formatNumber(coverageSqFtPerCuYd, 2)} sq ft per cu yd` }
    );
  }
  if (loads > 0) secondary.push({ value: loads, unit: "load", label: "Truck loads", precision: 0 });
  if (cost !== null) secondary.push({ value: cost, unit: "usd", label: "Cost", precision: 2 });
  const takeoff = [];
  const vUnit = metric ? "cum" : "cuyd";
  const vQty = (cuYd, dec = 3) => round(metric ? cuYd * CUM_PER_CUYD4 : cuYd, dec);
  const vTxt = (cuYd, dec = 2) => metric ? `${formatNumber(cuYd * CUM_PER_CUYD4, dec)} m³` : `${formatNumber(cuYd, dec)} cu yd`;
  const aTxt = metric ? `${formatNumber(area, 2)} m²` : `${formatNumber(areaSqFt, 0)} sq ft`;
  if (area > 0 && depthToBuy > 0) {
    takeoff.push({
      key: "soil",
      item: `${TOPSOIL_JOB_NAMES[i.job]} — topsoil, loose, ${dIn(depthToBuy)} deep`,
      qty: vQty(volumeCuYd),
      unit: vUnit,
      order: vQty(orderCuYd, 2),
      orderUnit: vUnit,
      note: metric ? `${aTxt} × ${dIn(depthToBuy)} / 100 = ${formatNumber(volume, 3)} m³${allowance === null ? "" : ` × ${formatNumber(factor, 2)}`}.` : `${aTxt} × ${dIn(depthToBuy)} / 12 = ${formatNumber(volumeCuFt, 2)} cu ft / ${CUFT_PER_CUYD3}${allowance === null ? "" : ` × ${formatNumber(factor, 2)}`}.`
    });
    takeoff.push({
      key: "bags",
      item: `Bagged topsoil, ${formatNumber(bagCuFt, 2)} cu ft a bag`,
      qty: round(orderCuFt, 2),
      unit: "cuft",
      order: bags,
      orderUnit: "bag",
      note: `${formatNumber(orderCuFt, 2)} cu ft ÷ ${formatNumber(bagCuFt, 2)} cu ft, rounded up. Bags are sold by volume.`
    });
    takeoff.push({
      key: "weight",
      item: "Weight delivered, topsoil loose",
      qty: metric ? round(massKg, 0) : round(massLb, 0),
      unit: metric ? "kg" : "lb",
      order: metric ? tonnes : shortTons,
      orderUnit: metric ? "t" : "ton",
      note: `${vTxt(orderCuYd)} × ${formatNumber(densityLb, 0)} lb/cu yd${ownDensity ? " (your figure)" : ""}; ${metric ? "1 t = 1,000 kg" : `1 tn = ${formatNumber(LB_PER_SHORT_TON4, 0)} lb`}.`
    });
    if (loads > 0 && i.truck !== null) {
      takeoff.push({
        key: "loads",
        item: "Truck loads",
        qty: vQty(orderCuYd, 2),
        unit: vUnit,
        order: loads,
        orderUnit: "load",
        note: `${vTxt(orderCuYd)} ÷ ${payload} per load, rounded up.`
      });
    }
    if (cost !== null) {
      takeoff.push({
        key: "cost",
        item: "Material at the price you were quoted",
        qty: vQty(orderCuYd, 2),
        unit: vUnit,
        order: cost,
        orderUnit: "usd",
        note: (i.pricePerYd !== null && i.pricePerYd > 0 ? `${formatNumber(orderCuYd, 2)} cu yd × $${formatNumber(i.pricePerYd, 2, false)}. ` : "") + (i.pricePerBag !== null && i.pricePerBag > 0 ? `${bags} bags × $${formatNumber(i.pricePerBag, 2, false)}. ` : "") + "Material only."
      });
    }
  }
  const assumptions = [
    kind === "reach" ? "The root zone is a TOTAL depth to reach (MSU E2910, at least 4 in), so the sheet buys the target minus the topsoil already on the ground." : kind === "max" ? "Half an inch is a maximum PER PASS (Clemson HGIC), not a total for a season: the sheet prices one pass." : kind === "add" ? "The depth is a layer ADDED on top of soil that stays (UMD Extension, 2 to 4 in of compost mixed into the top 4 in)." : "The depth is the height of the BOX being filled (USU Extension, 6 to 12 in). UMD's 12 to 24 in applies to a bed on a hard surface.",
    "Volume = area × the depth bought. Cubic feet ÷ 27 = cubic yards. Nothing is compacted: an embankment factor is a highway fill, not a garden bed.",
    ownDensity ? `Density ${formatNumber(densityLb, 0)} lb per cubic yard, entered by you. Nothing here claims it.` : `Density ${formatNumber(TOPSOIL_LOOSE_LB_CUYD, 0)} lb per cubic yard — FHWA Exhibit 5.1 A, topsoil, loose column, opened 2026-09-19, ±5%. Caterpillar's ${formatNumber(TOPSOIL_LOOSE_LB_CUYD_CAT, 0)} lb/cu yd agrees to within 1.23%.`,
    `Bags are sold by VOLUME: ${formatNumber(bagCuFt, 2)} cubic feet a bag is your figure, read off the bag. Nothing here claims a bag size.`,
    "No price is suggested: no open source publishes one. Ask two local suppliers, delivered."
  ];
  if (i.truck === null) assumptions.push("Truck capacity is yours: a pickup, a tandem and a trailer carry different yardages, and nothing here claims one.");
  return {
    primary,
    secondary,
    takeoff,
    warnings,
    assumptions,
    raw: { area, volume, orderVolume, depthToBuy, massKg },
    areaSqFt,
    depthAsked,
    depthToBuy,
    kind,
    nothingToAdd,
    volumeCuFt,
    volumeCuYd,
    orderCuYd,
    orderCuFt,
    factor,
    bags,
    coverageSqFtPerCuYd,
    coverageM2PerM3,
    densityLb,
    ownDensity,
    massLb,
    massKg,
    shortTons,
    tonnes,
    loads,
    cost
  };
}
var topsoilSpec = {
  id: TOPSOIL_ID,
  version: TOPSOIL_VERSION,
  revised: TOPSOIL_REVISED,
  inputs: topsoilInputs,
  compute: computeTopsoil
};

// src/data/reference/cubic-yard.ts
var CUFT_PER_CUYD4 = 27;
var M3_PER_CUYD = 0.764554857984;
var SQFT_PER_SQYD = 9;
var SQFT_PER_CUYD_INCH = CUFT_PER_CUYD4 * 12;
var MAX_ALLOWANCE_PCT = 50;
var SWELL_ROWS = {
  "loam-dry": { inSitu: 3030, loose: 2070, factor: 1.46 },
  "loam-damp": { inSitu: 3370, loose: 2360, factor: 1.43 },
  "loam-wet": { inSitu: 2940, loose: 2940, factor: 1 },
  topsoil: { inSitu: 2430, loose: 1620, factor: 1.5 }
};
var SWELL_ORDER = ["loam-dry", "loam-damp", "loam-wet", "topsoil"];
var DEFAULT_SWELL_MATERIAL = "loam-damp";
var SWELL_NAMES = {
  "loam-dry": "loam dry",
  "loam-damp": "loam damp",
  "loam-wet": "loam wet",
  topsoil: "topsoil"
};
function swellDivision(m) {
  const r = SWELL_ROWS[m];
  return `${r.inSitu.toLocaleString("en-US")} ÷ ${r.loose.toLocaleString("en-US")} = ${r.factor.toFixed(2)}`;
}

// src/engine/formulas/measure/cubic-yard.ts
var CUBIC_YARD_ID = "measure-cubic-yard";
var CUBIC_YARD_VERSION = "1.0.0";
var CUBIC_YARD_REVISED = "2026-09-26";
var MAX_AREAS = 4;
var SHAPE_VALUES5 = ["rectangle", "circle", "triangle"];
var G_AREAS3 = { id: "areas" };
var G_ORDER5 = { id: "order" };
var SHAPE_OPTIONS3 = SHAPE_VALUES5.map((value) => ({ value }));
function areaFields(n) {
  const s = n === 1 ? "" : String(n);
  const tag = n === 1 ? "" : `Area ${n} `;
  const cap = (t) => n === 1 ? t : t.toLowerCase();
  const plan = { kind: "length", units: ["ft", "in"], metricUnit: "m", min: 0, max: 5e3 };
  const fields = [
    { key: `shape${s}`, q: `s${s}`, label: `${tag}${cap("Shape")}`, kind: "select", default: "rectangle", options: SHAPE_OPTIONS3 },
    { ...plan, key: `length${s}`, q: `l${s}`, label: `${tag}${cap("Length")}`, default: n === 1 ? 12 : 0, metricDefault: n === 1 ? 3.6 : 0, showWhen: `shape${s}=rectangle` },
    { ...plan, key: `width${s}`, q: `w${s}`, label: `${tag}${cap("Width")}`, default: n === 1 ? 10 : 0, metricDefault: n === 1 ? 3 : 0, showWhen: `shape${s}=rectangle` },
    { ...plan, key: `diameter${s}`, q: `dia${s}`, label: `${tag}${cap("Diameter")}`, default: 0, showWhen: `shape${s}=circle` },
    { ...plan, key: `base${s}`, q: `b${s}`, label: `${tag}${cap("Base")}`, default: 0, showWhen: `shape${s}=triangle` },
    { ...plan, key: `height${s}`, q: `h${s}`, label: `${tag}${n === 1 ? "Height (perpendicular to the base)" : "height"}`, default: 0, showWhen: `shape${s}=triangle` },
    {
      key: `depth${s}`,
      q: `d${s}`,
      label: `${tag}${cap("Depth")}`,
      kind: "length",
      units: ["in", "ft"],
      metricUnit: "cm",
      default: n === 1 ? "4in" : 0,
      metricDefault: n === 1 ? "10cm" : 0,
      min: 0,
      max: 240,
      optional: n > 1
    }
  ];
  return n === 1 ? fields : fields.map((f) => ({ ...f, advanced: true, group: G_AREAS3 }));
}
var cubicYardInputs = [
  ...areaFields(1),
  { key: "dug", q: "dg", label: "Dug out of the ground, not delivered", kind: "toggle", default: false },
  { key: "material", q: "mt", label: "Ground dug", kind: "select", default: DEFAULT_SWELL_MATERIAL, options: SWELL_ORDER.map((value) => ({ value })), showWhen: "dug" },
  ...areaFields(2),
  ...areaFields(3),
  ...areaFields(4),
  // ---- the reverse question, always visible (orchestrator decision, 2026-09-26) ----
  { key: "have", q: "hv", label: "Volume you have", kind: "count", default: 1, metricDefault: 1, optional: true, min: 0, max: 1e4, suffix: "cu yd", metricSuffix: "m³", metricFactor: M3_PER_CUYD },
  // A count, not a length, so it sits beside "have" instead of with the dimensions; typed
  // in inches or cm, the runtime brings it back exact across the switch.
  { key: "coverDepth", q: "cd", label: "Depth to spread it", kind: "count", default: 1, metricDefault: 2.5, min: 0, max: 240, suffix: "in", metricSuffix: "cm", metricFactor: 2.54 },
  { key: "allowance", q: "al", label: "Your own allowance", kind: "percent", default: "", optional: true, min: 0, max: MAX_ALLOWANCE_PCT, step: 1, advanced: true, group: G_ORDER5 },
  { key: "bag", q: "bg", label: "Bag size", kind: "count", default: "", optional: true, min: 0.1, max: 5, advanced: true, group: G_ORDER5, suffix: "cu ft" },
  { key: "truck", q: "tk", label: "Truck capacity", kind: "count", default: "", optional: true, min: 1, max: 40, advanced: true, group: G_ORDER5, suffix: "cu yd", metricSuffix: "m³", metricFactor: M3_PER_CUYD },
  { key: "price", q: "py", label: "Price per cubic yard", kind: "money", default: "", optional: true, min: 0, max: 5e3, advanced: true, group: G_ORDER5, suffix: "$ / cu yd", metricSuffix: "$ / m³", metricFactor: M3_PER_CUYD, metricPerUnit: true }
];
var SHAPE_IDS3 = new Set(SHAPE_VALUES5);
var MATERIAL_IDS = new Set(SWELL_ORDER);
function parseCubicYardInputs(raw, system = "imperial") {
  const { values, errors } = coerce(cubicYardInputs, raw, system);
  const metric = system === "metric";
  const areas = [];
  for (let k = 1; k <= MAX_AREAS; k += 1) {
    const s = k === 1 ? "" : String(k);
    const shapeRaw = str(values, `shape${s}`, "rectangle");
    const shape = SHAPE_IDS3.has(shapeRaw) ? shapeRaw : "rectangle";
    const depth = optNum(values, `depth${s}`) ?? 0;
    if (shape === "circle") areas.push({ shape, a: num(values, `diameter${s}`), b: 0, depth });
    else if (shape === "triangle") areas.push({ shape, a: num(values, `base${s}`), b: num(values, `height${s}`), depth });
    else areas.push({ shape, a: num(values, `length${s}`), b: num(values, `width${s}`), depth });
  }
  const materialRaw = str(values, "material", DEFAULT_SWELL_MATERIAL);
  const qty = (key) => {
    const v = optNum(values, key);
    return v === null || !metric ? v : v / M3_PER_CUYD;
  };
  const priceTyped = optNum(values, "price");
  return {
    inputs: {
      system,
      areas,
      dug: bool(values, "dug"),
      material: MATERIAL_IDS.has(materialRaw) ? materialRaw : DEFAULT_SWELL_MATERIAL,
      allowancePct: optNum(values, "allowance"),
      bagCuFt: optNum(values, "bag"),
      truckCuYd: qty("truck"),
      pricePerCuYd: priceTyped === null || !metric ? priceTyped : round(priceTyped * M3_PER_CUYD, 2),
      // Optional so it can be blanked; untouched, it is the 1-unit example (coerce() gives
      // blank optionals null, so the default is read here - the C-101 truckCap pattern).
      haveCuYd: Object.prototype.hasOwnProperty.call(raw, "have") ? qty("have") : metric ? 1 / M3_PER_CUYD : 1,
      // Inches, or cm in metric, to metres.
      coverDepth: num(values, "coverDepth", 0) * (metric ? 0.01 : 0.0254)
    },
    errors
  };
}
function finite7(v, fallback = 0) {
  return v !== null && Number.isFinite(v) ? v : fallback;
}
function areaOf(z) {
  const a = finite7(z.a);
  const b = finite7(z.b);
  if (a <= 0) return 0;
  if (z.shape === "circle") return Math.PI * a * a / 4;
  if (b <= 0) return 0;
  return z.shape === "triangle" ? a * b / 2 : a * b;
}
function nextQuarter(v) {
  return v > 0 ? Math.ceil(v * 4 - 1e-9) / 4 : 0;
}
var upWhole = (v) => Math.max(0, Math.ceil(v - 1e-9));
var SQFT_PER_SQM = 1 / 0.3048 ** 2;
function computeCubicYard(input) {
  const warnings = [];
  const metric = input.system === "metric";
  const areasIn = input.areas.map((z) => ({ shape: z.shape, a: finite7(z.a), b: finite7(z.b), depth: finite7(z.depth) }));
  if (areasIn.some((z) => z.a < 0 || z.b < 0 || z.depth < 0) || finite7(input.coverDepth) < 0) {
    warnings.push({ level: "error", code: "negative-dimension", message: "Negative dimensions ignored. Enter positive lengths." });
  }
  const areasUsed = [];
  for (const [k, z] of areasIn.entries()) {
    const area2 = areaOf(z);
    if (area2 > 0 && z.depth > 0) areasUsed.push({ ...z, index: k + 1, area: area2, volume: area2 * z.depth });
    else if (area2 > 0 && k > 0) {
      warnings.push({ level: "caution", code: "area-no-depth", message: `Area ${k + 1} has a size but no depth: it is not counted.`, field: `depth${k + 1}` });
    }
  }
  const area = areasUsed.reduce((s, z) => s + z.area, 0);
  const volume = areasUsed.reduce((s, z) => s + z.volume, 0);
  const areaSqFt = area * SQFT_PER_SQM;
  const cuYd = volume / M3_PER_CUYD;
  const cuFt = cuYd * CUFT_PER_CUYD4;
  const swellFactor = input.dug ? SWELL_ROWS[input.material].factor : null;
  const looseCuYd = swellFactor === null ? null : cuYd * swellFactor;
  const allowanceTyped = input.allowancePct !== null && finite7(input.allowancePct) > 0 ? finite7(input.allowancePct) : null;
  const allowance = allowanceTyped === null ? null : Math.min(MAX_ALLOWANCE_PCT, allowanceTyped);
  if (allowanceTyped !== null && allowance !== allowanceTyped) {
    warnings.push({ level: "caution", code: "allowance-clamped", message: `Allowance held at ${MAX_ALLOWANCE_PCT}%.`, field: "allowance" });
  }
  const orderCuYd = (looseCuYd ?? cuYd) * (allowance === null ? 1 : 1 + allowance / 100);
  const orderRounded = nextQuarter(orderCuYd);
  const bag = input.bagCuFt !== null && finite7(input.bagCuFt) > 0 ? finite7(input.bagCuFt) : null;
  const truck = input.truckCuYd !== null && finite7(input.truckCuYd) > 0 ? finite7(input.truckCuYd) : null;
  const price = input.pricePerCuYd !== null && finite7(input.pricePerCuYd) > 0 ? finite7(input.pricePerCuYd) : null;
  const bags = bag !== null && orderCuYd > 0 ? upWhole(orderCuYd * CUFT_PER_CUYD4 / bag) : null;
  const trips = truck !== null && orderCuYd > 0 ? upWhole(orderCuYd / truck) : null;
  const cost = price !== null && orderCuYd > 0 ? round(orderCuYd * price, 2) : null;
  const have = finite7(input.haveCuYd);
  const coverDepth = finite7(input.coverDepth);
  const coverDepthFt = convert(coverDepth, "m", "ft");
  const coverSqFt = have > 0 && coverDepthFt > 0 ? have * CUFT_PER_CUYD4 / coverDepthFt : null;
  const coverSqYd = coverSqFt === null ? null : coverSqFt / SQFT_PER_SQYD;
  const vTxt = (yd, dec = 2) => metric ? `${formatNumber(yd * M3_PER_CUYD, dec)} m³` : `${formatNumber(yd, dec)} cu yd`;
  const dTxt = (m) => metric ? `${formatNumber(fromBase(m, "cm"), 2)} cm` : `${formatNumber(fromBase(m, "in"), 2)} in`;
  const lTxt = (m) => metric ? `${formatNumber(m, 2)} m` : `${formatNumber(fromBase(m, "ft"), 2)} ft`;
  const aTxt = (m2) => metric ? `${formatNumber(m2, 2)} m²` : `${formatNumber(m2 * SQFT_PER_SQM, 2)} sq ft`;
  const vol = (yd, label2, dec = 2) => metric ? { value: round(yd * M3_PER_CUYD, dec), unit: "cum", label: label2, precision: dec } : { value: round(yd, dec), unit: "cuyd", label: label2, precision: dec };
  const secondary = [];
  const takeoff = [];
  const assumptions = [];
  let primary;
  {
    if (areasUsed.length === 0) {
      const sized = areasIn.some((z) => areaOf(z) > 0);
      warnings.push(
        sized ? { level: "info", code: "no-depth", message: "Enter a depth to get a volume.", field: "depth" } : { level: "info", code: "no-dimensions", message: "Enter an area and a depth to get a volume." }
      );
    }
    primary = metric ? { value: round(volume, 2), unit: "cum", label: "Cubic meters", precision: 2 } : { value: round(cuYd, 2), unit: "cuyd", label: "Cubic yards", precision: 2 };
    secondary.push(vol(orderRounded, "Order quantity"));
    if (metric) {
      secondary.push({ value: round(cuYd, 2), unit: "cuyd", label: "Cubic yards", precision: 2 });
      secondary.push({ value: round(area, 2), unit: "sqm", label: "Plan area", precision: 2 });
    } else {
      secondary.push({ value: round(cuFt, 2), unit: "cuft", label: "Cubic feet", precision: 2 });
      secondary.push({ value: round(volume, 3), unit: "cum", label: "Cubic meters", precision: 3 });
      secondary.push({ value: round(areaSqFt, 1), unit: "sqft", label: "Plan area", precision: 1 });
    }
    if (areasUsed.length > 1) for (const z of areasUsed) secondary.push(vol(z.volume / M3_PER_CUYD, `Area ${z.index}`));
    if (swellFactor !== null && looseCuYd !== null) {
      secondary.push(vol(looseCuYd, "Loose volume"));
      secondary.push({ value: swellFactor, unit: "ea", label: "Factor used", display: `x ${swellFactor.toFixed(2)}` });
    }
    if (bags !== null) secondary.push({ value: bags, unit: "bag", label: "Bags", precision: 0 });
    if (trips !== null) secondary.push({ value: trips, unit: "load", label: "Truck trips", precision: 0 });
    if (cost !== null) secondary.push({ value: cost, unit: "usd", label: "Cost", precision: 2 });
    const vUnit = metric ? "cum" : "cuyd";
    const vQty = (yd, dec = 3) => round(metric ? yd * M3_PER_CUYD : yd, dec);
    const shapeTxt = (z) => z.shape === "circle" ? `circle ${lTxt(z.a)} across` : z.shape === "triangle" ? `triangle ${lTxt(z.a)} x ${lTxt(z.b)} / 2` : `${lTxt(z.a)} x ${lTxt(z.b)}`;
    for (const z of areasUsed) {
      const yd = z.volume / M3_PER_CUYD;
      takeoff.push({
        key: `area-${z.index}`,
        item: `Area ${z.index}, ${shapeTxt(z)}, ${dTxt(z.depth)} deep`,
        qty: vQty(yd),
        unit: vUnit,
        order: vQty(yd),
        orderUnit: vUnit,
        note: metric ? `${aTxt(z.area)} x ${formatNumber(z.depth, 4)} m = ${formatNumber(z.volume, 3)} m³.` : `${aTxt(z.area)} x ${formatNumber(fromBase(z.depth, "in"), 2)} in / 12 = ${formatNumber(yd * CUFT_PER_CUYD4, 2)} cu ft / 27.`
      });
    }
    if (areasUsed.length > 0) {
      if (!metric) {
        takeoff.push({
          key: "plan-area",
          item: "Plan area",
          qty: round(areaSqFt, 2),
          unit: "sqft",
          order: round(areaSqFt / SQFT_PER_SQYD, 2),
          orderUnit: "sqyd",
          note: `${formatNumber(areaSqFt, 2)} sq ft ÷ 9 = ${formatNumber(areaSqFt / SQFT_PER_SQYD, 2)} sq yd.`
        });
      }
      if (swellFactor !== null && looseCuYd !== null) {
        takeoff.push({
          key: "loose",
          item: `Loose volume to haul, ${SWELL_NAMES[input.material]}`,
          qty: vQty(looseCuYd),
          unit: vUnit,
          order: vQty(looseCuYd),
          orderUnit: vUnit,
          note: `${vTxt(cuYd, 3)} x ${swellFactor.toFixed(2)} (${swellDivision(input.material)}, FHWA Exhibit 5.1 A, in-situ ÷ loose, ±33%).`
        });
      }
      takeoff.push({
        key: "order",
        item: "Order, next quarter yard",
        qty: vQty(orderCuYd),
        unit: vUnit,
        order: vQty(orderRounded),
        orderUnit: vUnit,
        note: (allowance === null ? "" : `${vTxt(looseCuYd ?? cuYd, 3)} x ${formatNumber(1 + allowance / 100, 2)}, your ${formatNumber(allowance, 0)}% allowance. `) + `${formatNumber(orderRounded, 2)} cu yd: rounded up to the next quarter yard.`
      });
      if (bags !== null && bag !== null) {
        takeoff.push({
          key: "bags",
          item: `Bags of ${formatNumber(bag, 2)} cu ft`,
          qty: round(orderCuYd * CUFT_PER_CUYD4, 2),
          unit: "cuft",
          order: bags,
          orderUnit: "bag",
          note: `${formatNumber(orderCuYd * CUFT_PER_CUYD4, 2)} cu ft ÷ ${formatNumber(bag, 2)} cu ft per bag, rounded up.`
        });
      }
      if (trips !== null && truck !== null) {
        takeoff.push({
          key: "trips",
          item: "Truck trips",
          qty: vQty(orderCuYd, 2),
          unit: vUnit,
          order: trips,
          orderUnit: "load",
          note: `${vTxt(orderCuYd)} ÷ ${metric ? `${formatNumber(truck * M3_PER_CUYD, 3)} m³` : `${formatNumber(truck, 2)} cu yd`} per trip, rounded up.`
        });
      }
      if (cost !== null && price !== null) {
        takeoff.push({
          key: "cost",
          item: "Material at your price",
          qty: vQty(orderCuYd, 2),
          unit: vUnit,
          order: cost,
          orderUnit: "usd",
          note: metric ? `${formatNumber(orderCuYd * M3_PER_CUYD, 2)} m³ x $${formatNumber(price / M3_PER_CUYD, 2, false)}.` : `${formatNumber(orderCuYd, 2)} cu yd x $${formatNumber(price, 2, false)}.`
        });
      }
    }
    assumptions.push("Volume = area x depth, summed over the areas. Cubic feet / 27 = cubic yards; 1 cu yd = 0.764554857984 m³.");
    if (areasUsed.length > 1) assumptions.push(`${areasUsed.length} areas added together; overlapping areas are not detected.`);
    assumptions.push(
      swellFactor === null ? "Nothing is added for swell, settling, compaction or waste until you ask." : `Dug, not delivered: x ${swellFactor.toFixed(2)} (${swellDivision(input.material)}), FHWA Exhibit 5.1 A in-situ ÷ loose, an estimating figure subject to ±33%.`
    );
    if (allowance !== null) assumptions.push(`Allowance ${formatNumber(allowance, 0)}% - your figure, not a published one.`);
    assumptions.push("Order rounded up to the next quarter yard: the sheet's rounding, not a supplier rule. No bag size, truck size or price is assumed.");
  }
  if (coverSqFt !== null && coverSqYd !== null) {
    secondary.push(
      metric ? { value: round(coverSqFt / SQFT_PER_SQM, 1), unit: "sqm", label: "Covers", precision: 1 } : { value: round(coverSqFt, 1), unit: "sqft", label: "Covers", precision: 1 }
    );
    if (!metric) secondary.push({ value: round(coverSqYd, 2), unit: "sqyd", label: "Covers", precision: 2 });
    takeoff.push({
      key: "coverage",
      item: `${vTxt(have)} spread ${dTxt(coverDepth)} deep covers`,
      qty: metric ? round(coverSqFt / SQFT_PER_SQM, 2) : round(coverSqFt, 2),
      unit: metric ? "sqm" : "sqft",
      order: metric ? round(coverSqFt / SQFT_PER_SQM, 2) : round(coverSqFt, 2),
      orderUnit: metric ? "sqm" : "sqft",
      note: metric ? `${formatNumber(have * M3_PER_CUYD, 3)} m³ ÷ ${formatNumber(coverDepth, 4)} m = ${formatNumber(coverSqFt / SQFT_PER_SQM, 2)} m².` : `${formatNumber(have, 2)} x 27 ÷ (${formatNumber(fromBase(coverDepth, "in"), 2)} / 12) = ${formatNumber(coverSqFt, 2)} sq ft. 1 cu yd at 1 in covers 324 sq ft.`
    });
    assumptions.push("Covers = volume ÷ depth, the volume as spread: nothing added for settling or compaction.");
  }
  return {
    primary,
    secondary,
    takeoff,
    warnings,
    assumptions,
    raw: { area, volume, orderVolume: orderCuYd * M3_PER_CUYD },
    areasUsed,
    areaSqFt,
    areaSqYd: areaSqFt / SQFT_PER_SQYD,
    cuFt,
    cuYd,
    m3: volume,
    swellFactor,
    looseCuYd,
    orderCuYd,
    orderRounded,
    bags,
    trips,
    cost,
    coverSqFt,
    coverSqYd
  };
}
var cubicYardSpec = {
  id: CUBIC_YARD_ID,
  version: CUBIC_YARD_VERSION,
  revised: CUBIC_YARD_REVISED,
  inputs: cubicYardInputs,
  compute: computeCubicYard
};

// src/engine/formulas/shapes.ts
var SHAPES4 = [
  { value: "rectangle", label: "Rectangle or square" },
  { value: "circle", label: "Circle" },
  { value: "triangle", label: "Triangle" }
];
var SHAPE_IDS4 = new Set(SHAPES4.map((s) => s.value));
function finite8(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}
function zoneArea3(z) {
  const a = finite8(z.a);
  const b = finite8(z.b);
  if (a <= 0) return 0;
  if (z.shape === "circle") return Math.PI * a * a / 4;
  if (b <= 0) return 0;
  if (z.shape === "triangle") return a * b / 2;
  return a * b;
}

// src/data/reference/asphalt.ts
var AI_PCF = 148;
var MAPA_LB_PER_SQYD_IN = 110;
var SQFT_PER_SQYD2 = 9;
var IN_PER_FT = 12;
function spreadRate(pcf) {
  return pcf * SQFT_PER_SQYD2 / IN_PER_FT;
}
function pcfFromSpreadRate(rate) {
  return rate * IN_PER_FT / SQFT_PER_SQYD2;
}
var MAPA_PCF = pcfFromSpreadRate(MAPA_LB_PER_SQYD_IN);
function presetPcf(preset) {
  if (preset === "ai") return AI_PCF;
  if (preset === "mapa") return MAPA_PCF;
  return null;
}
var DEFAULT_PRESET = "ai";
var LAYER_ROLES = ["surface", "binder", "base"];
var LAYER_LABELS = {
  surface: "Surface course",
  binder: "Binder course",
  base: "Asphalt base course"
};

// src/engine/formulas/paving/asphalt.ts
var ASPHALT_ID = "paving-asphalt";
var ASPHALT_VERSION = "1.0.0";
var ASPHALT_REVISED = "2026-09-19";
var MAX_ZONES3 = 4;
var MAX_LAYERS = 3;
var G_AREAS4 = { id: "areas" };
var G_LAYERS = { id: "layers" };
var G_ORDER6 = { id: "order" };
function shapeFields3(k) {
  const s = k === 1 ? "" : String(k);
  const tag = k === 1 ? "" : `Area ${k} `;
  const adv = k > 1;
  const group2 = adv ? G_AREAS4 : void 0;
  const cap = (t) => k === 1 ? t : t.toLowerCase();
  const common = {
    kind: "length",
    units: ["ft", "in"],
    metricUnit: "m",
    min: 0,
    max: 5e3,
    advanced: adv,
    ...group2 ? { group: group2 } : {}
  };
  return [
    {
      key: `shape${s}`,
      q: `s${s}`,
      label: `${tag}${cap("Shape")}`,
      kind: "select",
      default: "rectangle",
      options: SHAPES4.map((x) => ({ value: x.value, label: x.label })),
      advanced: adv,
      ...group2 ? { group: group2 } : {}
    },
    {
      ...common,
      key: `length${s}`,
      q: `l${s}`,
      label: `${tag}${cap("Length")}`,
      default: k === 1 ? 25 : 0,
      metricDefault: k === 1 ? 7.6 : 0,
      showWhen: `shape${s}=rectangle`
    },
    {
      ...common,
      key: `width${s}`,
      q: `w${s}`,
      label: `${tag}${cap("Width")}`,
      default: k === 1 ? 10 : 0,
      metricDefault: k === 1 ? 3 : 0,
      showWhen: `shape${s}=rectangle`
    },
    {
      ...common,
      key: `diameter${s}`,
      q: `dia${s}`,
      label: `${tag}${cap("Diameter")}`,
      default: 0,
      showWhen: `shape${s}=circle`
    },
    {
      ...common,
      key: `base${s}`,
      q: `b${s}`,
      label: `${tag}${cap("Base")}`,
      default: 0,
      showWhen: `shape${s}=triangle`
    },
    {
      ...common,
      key: `height${s}`,
      q: `h${s}`,
      label: `${tag}${k === 1 ? "Height (perpendicular to the base)" : "height"}`,
      default: 0,
      showWhen: `shape${s}=triangle`
    }
  ];
}
function layerFields(k) {
  const s = String(k);
  const adv = k > 1;
  const tag = `Layer ${k} `;
  return [
    {
      key: `role${s}`,
      q: `r${s}`,
      label: `${tag}course`,
      kind: "select",
      default: LAYER_ROLES[k - 1] ?? "surface",
      options: LAYER_ROLES.map((r) => ({ value: r, label: LAYER_LABELS[r] })),
      advanced: true,
      group: G_LAYERS
    },
    {
      key: k === 1 ? "thickness" : `thickness${s}`,
      q: k === 1 ? "t" : `t${s}`,
      label: k === 1 ? "Compacted thickness" : `${tag}compacted thickness`,
      kind: "length",
      units: ["in", "ft"],
      metricUnit: "cm",
      default: k === 1 ? "4in" : 0,
      metricDefault: k === 1 ? "10cm" : 0,
      min: 0,
      max: 60,
      optional: adv,
      ...adv ? { advanced: true, group: G_LAYERS } : {}
    },
    {
      key: `layerWeight${s}`,
      q: `k${s}`,
      label: `${tag}unit weight`,
      kind: "count",
      default: "",
      optional: true,
      min: 50,
      max: 300,
      advanced: true,
      group: G_LAYERS
    }
  ];
}
var TONNES_PER_SHORT_TON3 = convert(1, "ton", "t");
var asphaltInputs = [
  ...shapeFields3(1),
  ...layerFields(1).filter((f) => f.key === "thickness"),
  {
    key: "preset",
    q: "up",
    label: "Unit weight",
    kind: "select",
    default: DEFAULT_PRESET,
    options: [{ value: "ai" }, { value: "mapa" }, { value: "plant" }]
  },
  {
    key: "plantWeight",
    q: "pw",
    label: "Plant unit weight",
    kind: "count",
    default: "",
    optional: true,
    min: 50,
    max: 300,
    showWhen: "preset=plant"
  },
  {
    key: "priceTon",
    q: "pt",
    label: "Price per ton",
    kind: "money",
    default: "",
    optional: true,
    min: 0,
    max: 5e3,
    suffix: "$ / short ton",
    metricSuffix: "$ / t",
    metricFactor: TONNES_PER_SHORT_TON3,
    metricPerUnit: true
  },
  // ---- advanced: areas 2 to 4 -----------------------------------------
  ...shapeFields3(2),
  ...shapeFields3(3),
  ...shapeFields3(4),
  // ---- advanced: the pavement section ---------------------------------
  ...layerFields(1).filter((f) => f.key !== "thickness"),
  ...layerFields(2),
  ...layerFields(3),
  // ---- advanced: ordering ---------------------------------------------
  { key: "overage", q: "ov", label: "Overage", kind: "percent", default: 0, min: 0, max: 25, step: 1, advanced: true, group: G_ORDER6 },
  { key: "truckTons", q: "tk", label: "Truck payload", kind: "count", default: "", optional: true, min: 1, max: 40, advanced: true, group: G_ORDER6, suffix: "short tons", metricSuffix: "t", metricFactor: TONNES_PER_SHORT_TON3 }
];
var PRESETS = /* @__PURE__ */ new Set(["ai", "mapa", "plant"]);
var ROLES = new Set(LAYER_ROLES);
function parseAsphaltInputs(raw, system = "imperial") {
  const { values, errors } = coerce(asphaltInputs, raw, system);
  const zones = [];
  for (let k = 1; k <= MAX_ZONES3; k += 1) {
    const s = k === 1 ? "" : String(k);
    const shapeRaw = str(values, `shape${s}`, "rectangle");
    const shape = SHAPE_IDS4.has(shapeRaw) ? shapeRaw : "rectangle";
    if (shape === "circle") zones.push({ shape, a: num(values, `diameter${s}`), b: 0 });
    else if (shape === "triangle") zones.push({ shape, a: num(values, `base${s}`), b: num(values, `height${s}`) });
    else zones.push({ shape, a: num(values, `length${s}`), b: num(values, `width${s}`) });
  }
  const layers = [];
  for (let k = 1; k <= MAX_LAYERS; k += 1) {
    const s = String(k);
    const roleRaw = str(values, `role${s}`, LAYER_ROLES[k - 1] ?? "surface");
    layers.push({
      role: ROLES.has(roleRaw) ? roleRaw : LAYER_ROLES[k - 1],
      thickness: (k === 1 ? optNum(values, "thickness") : optNum(values, `thickness${s}`)) ?? 0,
      unitWeight: optNum(values, `layerWeight${s}`)
    });
  }
  const presetRaw = str(values, "preset", DEFAULT_PRESET);
  const priceTonTyped = optNum(values, "priceTon");
  const truckTyped = optNum(values, "truckTons");
  return {
    inputs: {
      system,
      zones,
      layers,
      preset: PRESETS.has(presetRaw) ? presetRaw : DEFAULT_PRESET,
      plantWeight: optNum(values, "plantWeight"),
      overagePct: num(values, "overage", 0),
      truckTons: truckTyped === null || system !== "metric" ? truckTyped : truckTyped / TONNES_PER_SHORT_TON3,
      // Metric types $ per tonne; the sheet prices short tons, so 33.07 $/t is 30 $/ton.
      pricePerTon: priceTonTyped === null || system !== "metric" ? priceTonTyped : round(priceTonTyped * TONNES_PER_SHORT_TON3, 2)
    },
    errors
  };
}
var M3_TO_CUFT4 = 1 / 0.3048 ** 3;
function computeAsphalt(input) {
  const warnings = [];
  const i = {
    ...input,
    zones: input.zones.map((z) => ({ shape: z.shape, a: finite8(z.a), b: finite8(z.b) })),
    layers: input.layers.map((l) => ({
      role: l.role,
      thickness: finite8(l.thickness),
      unitWeight: l.unitWeight === null ? null : finite8(l.unitWeight)
    })),
    plantWeight: input.plantWeight === null ? null : finite8(input.plantWeight),
    overagePct: finite8(input.overagePct, 0),
    truckTons: input.truckTons === null ? null : finite8(input.truckTons),
    pricePerTon: input.pricePerTon === null ? null : finite8(input.pricePerTon)
  };
  const metric = i.system === "metric";
  if (i.zones.some((z) => z.a < 0 || z.b < 0) || i.layers.some((l) => l.thickness < 0)) {
    warnings.push({
      level: "error",
      code: "negative-dimension",
      message: "Negative dimensions ignored. Enter positive lengths."
    });
  }
  const overagePct = Math.min(25, Math.max(0, i.overagePct));
  if (i.overagePct !== overagePct) {
    warnings.push({ level: "caution", code: "overage-clamped", message: "Overage clamped to 0-25%.", field: "overage" });
  }
  const zonesUsed = i.zones.filter((z) => zoneArea3(z) > 0);
  const area = zonesUsed.reduce((sum, z) => sum + zoneArea3(z), 0);
  const plant = i.plantWeight !== null && i.plantWeight > 0 ? i.plantWeight : null;
  const pcf = i.preset === "plant" ? plant : presetPcf(i.preset);
  if (pcf === null) {
    warnings.push({
      level: "error",
      code: "unit-weight-required",
      message: "Enter the plant's unit weight in pounds per cubic foot, or pick one of the two published figures. Tonnage stays blank until there is a number behind it.",
      field: "plantWeight"
    });
  } else if (i.preset === "plant") {
    warnings.push({
      level: "info",
      code: "unit-weight-plant",
      message: `Using your ${formatNumber(pcf, 1)} lb/cu ft. Nothing on this page claims it: it is the figure you were quoted.`
    });
  }
  const layers = [];
  let totalThickness = 0;
  let massLb = pcf === null ? null : 0;
  for (const l of i.layers) {
    const thickness = Math.max(0, l.thickness);
    if (thickness <= 0 || area <= 0) continue;
    const own = l.unitWeight !== null && l.unitWeight > 0;
    const layerPcf = own ? l.unitWeight : pcf;
    const volume2 = area * thickness;
    const lb = layerPcf === null ? null : volume2 * M3_TO_CUFT4 * layerPcf;
    totalThickness += thickness;
    if (lb !== null && massLb !== null) massLb += lb;
    else if (lb !== null && massLb === null) massLb = lb;
    layers.push({
      role: l.role,
      thickness,
      pcf: layerPcf,
      ownWeight: own,
      volume: volume2,
      massLb: lb,
      tons: lb === null ? null : convert(lb, "lb", "ton"),
      rate: layerPcf === null ? null : spreadRate(layerPcf)
    });
  }
  const volume = layers.reduce((s, l) => s + l.volume, 0);
  if (layers.some((l) => l.ownWeight)) {
    warnings.push({
      level: "info",
      code: "layer-weight-override",
      message: "One or more layers carry their own unit weight; the sheet figure applies to the rest."
    });
  }
  const tons = massLb === null ? null : convert(massLb, "lb", "ton");
  const tonnes = massLb === null ? null : convert(massLb, "lb", "t");
  const massKg = massLb === null ? null : convert(massLb, "lb", "kg");
  const orderTons = tons === null ? null : tons * (1 + overagePct / 100);
  const trucks = orderTons !== null && i.truckTons !== null && i.truckTons > 0 ? roundUpWhole(orderTons / i.truckTons) : 0;
  const payload = metric ? `${formatNumber((i.truckTons ?? 0) * TONNES_PER_SHORT_TON3, 3)} t` : `${formatNumber(i.truckTons ?? 0, 2)} tons`;
  const cost = orderTons !== null && i.pricePerTon !== null && i.pricePerTon >= 0 ? round(orderTons * i.pricePerTon, 2) : null;
  if (layers.length === 0) {
    warnings.push(
      area > 0 ? { level: "info", code: "no-thickness", message: "Enter a compacted thickness to get a tonnage.", field: "thickness" } : { level: "info", code: "no-dimensions", message: "Enter an area and a compacted thickness to get a tonnage." }
    );
  }
  const totalIn = fromBase(totalThickness, "in");
  if (totalIn > 12) {
    warnings.push({
      level: "caution",
      code: "deep-section",
      message: `${formatNumber(totalIn, 1)} in of asphalt in one section. Check the thickness unit, and check whether part of that depth is aggregate base rather than mix.`,
      field: "thickness"
    });
  }
  if (trucks > 1 && i.truckTons !== null) {
    warnings.push({
      level: "info",
      code: "multi-truck",
      message: `${trucks} loads at ${payload}. Mix has to stay hot: the plant, not this sheet, schedules them.`
    });
  }
  if (orderTons !== null && orderTons > 0 && orderTons < 1) {
    warnings.push({
      level: "caution",
      code: "small-load",
      message: "Under one ton. Plants set a minimum load and a minimum charge; ask before you plan a patch this size."
    });
  }
  const DASH4 = "—";
  const primary = tons === null ? { value: 0, unit: metric ? "t" : "ton", label: "Asphalt mix", display: DASH4 } : metric ? { value: round(tonnes, 2), unit: "t", label: "Asphalt mix", precision: 2 } : { value: round(tons, 2), unit: "ton", label: "Asphalt mix", precision: 2 };
  const secondary = [];
  secondary.push(
    orderTons === null ? { value: 0, unit: metric ? "t" : "ton", label: "Order quantity", display: DASH4 } : metric ? { value: round(orderTons * convert(1, "ton", "t"), 2), unit: "t", label: "Order quantity", precision: 2 } : { value: round(orderTons, 2), unit: "ton", label: "Order quantity", precision: 2 }
  );
  if (metric) {
    secondary.push({ value: round(area, 2), unit: "sqm", label: "Area paved", precision: 2 });
    secondary.push({ value: round(volume, 3), unit: "cum", label: "Compacted volume", precision: 3 });
  } else {
    secondary.push({ value: round(convert(area, "sqm", "sqft"), 0), unit: "sqft", label: "Area paved", precision: 0 });
    secondary.push({ value: round(convert(area, "sqm", "sqyd"), 1), unit: "sqyd", label: "Area paved", precision: 1 });
    secondary.push({ value: round(convert(volume, "cum", "cuft"), 1), unit: "cuft", label: "Compacted volume", precision: 1 });
  }
  secondary.push(
    tons === null ? { value: 0, unit: "ton", label: "Short tons (2,000 lb)", display: DASH4 } : { value: round(tons, 2), unit: "ton", label: "Short tons (2,000 lb)", precision: 2 }
  );
  secondary.push(
    tonnes === null ? { value: 0, unit: "t", label: "Metric tonnes (1,000 kg)", display: DASH4 } : { value: round(tonnes, 2), unit: "t", label: "Metric tonnes (1,000 kg)", precision: 2 }
  );
  if (pcf !== null) {
    secondary.push({
      value: round(pcf, 2),
      unit: "lb",
      label: "Unit weight used",
      display: `${formatNumber(pcf, 2)} lb / cu ft`
    });
    secondary.push({
      value: round(spreadRate(pcf), 2),
      unit: "lb",
      label: "Spread rate",
      display: `${formatNumber(spreadRate(pcf), 1)} lb / sq yd / in`
    });
  }
  if (i.truckTons !== null && i.truckTons > 0) {
    secondary.push({ value: trucks, unit: "load", label: "Truck loads", precision: 0 });
  }
  if (cost !== null)
    secondary.push({ value: cost, unit: "usd", label: `Cost at your price per ${metric ? "tonne" : "ton"}`, precision: 2 });
  const takeoff = [];
  const inLabel = (m) => metric ? `${formatNumber(fromBase(m, "cm"), 2)} cm` : `${formatNumber(fromBase(m, "in"), 2)} in`;
  for (const [k, l] of layers.entries()) {
    takeoff.push({
      key: `layer-${k + 1}`,
      item: `${LAYER_LABELS[l.role]}, ${inLabel(l.thickness)} compacted`,
      // Converted from the layer's own tonnage, not from the rounded cell above it.
      qty: l.tons === null ? 0 : round(metric ? l.tons * TONNES_PER_SHORT_TON3 : l.tons, 2),
      unit: metric ? "t" : "ton",
      waste: overagePct || void 0,
      order: l.tons === null ? 0 : round(l.tons * (1 + overagePct / 100) * (metric ? TONNES_PER_SHORT_TON3 : 1), 2),
      orderUnit: metric ? "t" : "ton",
      // Two different things: the Asphalt Institute's formula, quoted in the units it
      // is published in and never converted, then the arithmetic on YOUR job, which
      // follows the system on screen.
      note: l.pcf === null ? "No unit weight yet, so no tonnage for this course." : metric ? `Asphalt Institute: sq ft x in / 12 x ${formatNumber(l.pcf, 2)} lb/cu ft / 2,000${l.ownWeight ? " (this layer's own unit weight)" : ""}. Spread rate ${formatNumber(l.rate, 1)} lb/sq yd/in. Your job: ${formatNumber(area, 2)} m² x ${inLabel(l.thickness)} = ${formatNumber(l.tons * TONNES_PER_SHORT_TON3, 2)} t.` : `${formatNumber(convert(area, "sqm", "sqft"), 0)} sq ft x ${formatNumber(fromBase(l.thickness, "in"), 2)} in / 12 x ${formatNumber(l.pcf, 2)} lb/cu ft / 2,000${l.ownWeight ? " (this layer's own unit weight)" : ""}. Spread rate ${formatNumber(l.rate, 1)} lb/sq yd/in.`
    });
  }
  if (tons !== null && orderTons !== null && layers.length > 0) {
    if (!metric)
      takeoff.push({
        key: "tonnes",
        item: "Same tonnage, in metric tonnes",
        qty: round(tonnes, 2),
        unit: "t",
        order: round(orderTons * convert(1, "ton", "t"), 2),
        orderUnit: "t",
        note: "1 short ton = 2,000 lb; 1 tonne = 1,000 kg = 2,204.62 lb, about 10 percent more."
      });
    if (i.truckTons !== null && i.truckTons > 0) {
      takeoff.push({
        key: "trucks",
        item: "Truck loads",
        // The payload field is in short tons in both systems: the note keeps its word,
        // the quantity hauled follows the reader.
        qty: round(metric ? orderTons * TONNES_PER_SHORT_TON3 : orderTons, 2),
        unit: metric ? "t" : "ton",
        order: trucks,
        orderUnit: "load",
        note: `${payload} per load, the payload you entered. Blank the field and the sheet counts nothing.`
      });
    }
    if (cost !== null) {
      takeoff.push({
        key: "cost",
        item: "Mix cost at your quoted price",
        // The quantity priced follows the system too, or the sheet bills tonnes and counts short tons.
        qty: round(metric ? orderTons * TONNES_PER_SHORT_TON3 : orderTons, 2),
        unit: metric ? "t" : "ton",
        order: cost,
        orderUnit: "usd",
        // Quoted back in the unit the price was typed in, or the line stops being true.
        note: metric ? `${formatNumber(orderTons * TONNES_PER_SHORT_TON3, 2)} t x $${formatNumber((i.pricePerTon ?? 0) / TONNES_PER_SHORT_TON3, 2, false)}. Mix only: no haul, no trucking, no placement.` : `${formatNumber(orderTons, 2)} tons x $${formatNumber(i.pricePerTon ?? 0, 2, false)}. Mix only: no haul, no trucking, no placement.`
      });
    }
  }
  const assumptions = [
    "Tons = area (sq ft) x compacted thickness (in) / 12 x unit weight (lb/cu ft) / 2,000, per layer, as the Asphalt Institute writes it.",
    "Thickness entered is the compacted thickness in place, not the loose depth behind the paver."
  ];
  if (pcf !== null) {
    assumptions.push(
      i.preset === "ai" ? `Unit weight ${formatNumber(pcf, 0)} lb/cu ft in place - Asphalt Institute, which publishes 142 to 148 and says to use 148.` : i.preset === "mapa" ? `Unit weight ${formatNumber(pcf, 2)} lb/cu ft, which is MAPA's stated 110 lb per square yard per inch of compacted thickness converted (110 x 12 / 9). MAPA's own assumption; TxDOT Item 341 (2024) uses the same rate unless the plans show another.` : `Unit weight ${formatNumber(pcf, 2)} lb/cu ft, entered by you. Nothing here claims it.`
    );
    assumptions.push(`Equivalent spread rate ${formatNumber(spreadRate(pcf), 1)} lb per square yard per inch (lb/cu ft x 9 / 12).`);
  } else {
    assumptions.push("No unit weight yet: tonnage, loads and cost stay blank rather than guess one.");
  }
  if (layers.length > 1) assumptions.push(`${layers.length} courses added; each carries its own compacted thickness.`);
  if (zonesUsed.length > 1) assumptions.push(`${zonesUsed.length} areas added together; overlapping areas are not detected.`);
  assumptions.push(
    overagePct > 0 ? `Overage ${overagePct}% on top of the calculated tonnage - your figure, not a published allowance.` : "No overage, no compaction factor and no waste are added: the sheet orders what it calculated until you say otherwise."
  );
  assumptions.push(
    "No thickness, lift depth or tack-coat rate is suggested anywhere on this sheet: take them from your plans, your specification or the plant."
  );
  assumptions.push("Quantities are for the mix only. Aggregate base under the pavement is sheet C-101.");
  return {
    primary,
    secondary,
    takeoff,
    warnings,
    assumptions,
    raw: { area, volume, massKg },
    pcf,
    preset: i.preset,
    layers,
    zonesUsed,
    totalThickness,
    tons,
    tonnes,
    orderTons,
    trucks,
    cost
  };
}
var asphaltSpec = {
  id: ASPHALT_ID,
  version: ASPHALT_VERSION,
  revised: ASPHALT_REVISED,
  inputs: asphaltInputs,
  compute: computeAsphalt
};

// src/data/reference/board-foot.ts
var CU_IN_PER_BOARD_FOOT = 144;
var CU_IN_PER_CU_FT = 1728;
var BOARD_FEET_PER_CU_FT = CU_IN_PER_CU_FT / CU_IN_PER_BOARD_FOOT;
var DRESSED_THICKNESS_IN = [
  [1, 0.75],
  [2, 1.5]
];
var DRESSED_WIDTH_IN = [
  [2, 1.5],
  [3, 2.5],
  [4, 3.5],
  [5, 4.5],
  [6, 5.5],
  [7, 6.5],
  [8, 7.25],
  [9, 8.25],
  [10, 9.25],
  [11, 10.25],
  [12, 11.25],
  [14, 13.25],
  [16, 15.25]
];
var NOMINAL_TOL_IN = 1e-6;
function dressedFor(table, nominalIn) {
  if (!Number.isFinite(nominalIn)) return null;
  for (const [nominal, dressed] of table) {
    if (Math.abs(nominal - nominalIn) <= NOMINAL_TOL_IN) return dressed;
  }
  return null;
}

// src/engine/formulas/framing/board-foot.ts
var BOARDFOOT_ID = "framing-board-foot";
var BOARDFOOT_VERSION = "1.0.0";
var BOARDFOOT_REVISED = "2026-09-20";
var MAX_LINES = 4;
var WASTE_MAX_PCT = 25;
var G_SIZES = { id: "sizes" };
var G_ORDER7 = { id: "order" };
var IN2 = {
  kind: "length",
  units: ["in", "ft"],
  metricUnit: "cm"
};
var FT2 = {
  kind: "length",
  units: ["ft", "in"],
  metricUnit: "m"
};
function lineFields(k) {
  const extra = k > 1;
  const common = extra ? { advanced: true, group: G_SIZES, showWhen: "more" } : {};
  const tag = `Line ${k} `;
  return [
    {
      ...IN2,
      ...common,
      key: `t${k}`,
      q: `t${k}`,
      label: `${tag}thickness`,
      default: 2,
      metricDefault: 5.08,
      min: 0,
      max: 24
    },
    {
      ...IN2,
      ...common,
      key: `w${k}`,
      q: `w${k}`,
      label: `${tag}width`,
      default: 4,
      metricDefault: 10.16,
      min: 0,
      max: 48
    },
    {
      ...FT2,
      ...common,
      key: `l${k}`,
      q: `l${k}`,
      label: `${tag}length`,
      default: 8,
      metricDefault: 2.4384,
      min: 0,
      max: 60
    },
    {
      ...common,
      key: `n${k}`,
      q: `n${k}`,
      label: `${tag}pieces`,
      kind: "count",
      default: k === 1 ? 10 : 0,
      min: 0,
      max: 2e3,
      step: 1
    }
  ];
}
var boardFootInputs = [
  ...lineFields(1),
  {
    key: "more",
    q: "m",
    label: "Add more sizes",
    kind: "toggle",
    default: false,
    advanced: true,
    group: G_SIZES
  },
  ...lineFields(2),
  ...lineFields(3),
  ...lineFields(4),
  // ---- advanced: ordering and the optional comparison --------------------
  {
    key: "waste",
    q: "wa",
    label: "Allowance",
    kind: "count",
    default: 0,
    min: 0,
    max: WASTE_MAX_PCT,
    step: 1,
    advanced: true,
    group: G_ORDER7
  },
  {
    key: "price",
    q: "pr",
    label: "Price per board foot",
    kind: "money",
    default: "",
    optional: true,
    min: 0,
    max: 500,
    advanced: true,
    group: G_ORDER7
  },
  {
    key: "dressed",
    q: "dr",
    label: "These are nominal softwood sizes",
    kind: "toggle",
    default: false,
    advanced: true,
    group: G_ORDER7
  }
];
function parseBoardFootInputs(raw, system = "imperial") {
  const { values, errors } = coerce(boardFootInputs, raw, system);
  const lines = [];
  for (let k = 1; k <= MAX_LINES; k += 1) {
    lines.push({
      thickness: num(values, `t${k}`, 0),
      width: num(values, `w${k}`, 0),
      length: num(values, `l${k}`, 0),
      pieces: num(values, `n${k}`, 0)
    });
  }
  return {
    inputs: {
      system,
      lines,
      wastePct: num(values, "waste", 0),
      pricePerBf: optNum(values, "price"),
      dressed: bool(values, "dressed")
    },
    errors
  };
}
function fin2(v, fallback = 0) {
  return Number.isFinite(v) ? v : fallback;
}
function lineBoardFeet(thicknessIn, widthIn, lengthFt, pieces) {
  if (thicknessIn <= 0 || widthIn <= 0 || lengthFt <= 0 || pieces <= 0) return 0;
  return thicknessIn * widthIn * lengthFt * pieces / BOARD_FEET_PER_CU_FT;
}
function lineDressedCuFt(thicknessIn, widthIn, lengthFt, pieces) {
  const td = dressedFor(DRESSED_THICKNESS_IN, thicknessIn);
  const wd = dressedFor(DRESSED_WIDTH_IN, widthIn);
  if (td === null || wd === null) return null;
  return td * wd * (lengthFt * 12) * pieces / CU_IN_PER_CU_FT;
}
function computeBoardFoot(input) {
  const warnings = [];
  const metric = input.system === "metric";
  const raw = input.lines.slice(0, MAX_LINES).map((l) => ({
    thickness: fin2(l.thickness),
    width: fin2(l.width),
    length: fin2(l.length),
    pieces: Math.round(fin2(l.pieces))
  }));
  while (raw.length < MAX_LINES) raw.push({ thickness: 0, width: 0, length: 0, pieces: 0 });
  if (raw.some((l) => l.thickness < 0 || l.width < 0 || l.length < 0 || l.pieces < 0)) {
    warnings.push({ level: "error", code: "negative-dimension", message: "Negative dimensions ignored." });
  }
  const wastePct = Math.min(WASTE_MAX_PCT, Math.max(0, fin2(input.wastePct)));
  if (fin2(input.wastePct) !== wastePct) {
    warnings.push({
      level: "caution",
      code: "waste-clamped",
      message: `Allowance clamped to 0-${WASTE_MAX_PCT}%.`,
      field: "waste"
    });
  }
  const lines = raw.map((l, k) => {
    const thicknessIn = convert(Math.max(0, l.thickness), "m", "in");
    const widthIn = convert(Math.max(0, l.width), "m", "in");
    const lengthFt = convert(Math.max(0, l.length), "m", "ft");
    const pieces2 = Math.max(0, l.pieces);
    const boardFeet = lineBoardFeet(thicknessIn, widthIn, lengthFt, pieces2);
    const filled2 = boardFeet > 0;
    return {
      index: k + 1,
      thicknessIn,
      widthIn,
      lengthFt,
      pieces: pieces2,
      boardFeet,
      dressedThicknessIn: filled2 ? dressedFor(DRESSED_THICKNESS_IN, thicknessIn) : null,
      dressedWidthIn: filled2 ? dressedFor(DRESSED_WIDTH_IN, widthIn) : null,
      dressedCuFt: filled2 && input.dressed ? lineDressedCuFt(thicknessIn, widthIn, lengthFt, pieces2) : null
    };
  });
  const filled = lines.filter((l) => l.boardFeet > 0);
  const totalBf = filled.reduce((t, l) => t + l.boardFeet, 0);
  const withWasteBf = totalBf * (1 + wastePct / 100);
  const orderBf = withWasteBf > 0 ? Math.ceil(round(withWasteBf, 6)) : 0;
  const nominalCuFt = totalBf / BOARD_FEET_PER_CU_FT;
  const cuIn = totalBf * CU_IN_PER_BOARD_FOOT;
  const linealFt = filled.reduce((t, l) => t + l.pieces * l.lengthFt, 0);
  const pieces = filled.reduce((t, l) => t + l.pieces, 0);
  const allKnown = filled.length > 0 && filled.every((l) => l.dressedCuFt !== null);
  const dressedCuFt = input.dressed && allKnown ? filled.reduce((t, l) => t + l.dressedCuFt, 0) : null;
  const dressedPct = dressedCuFt !== null && nominalCuFt > 0 ? round(dressedCuFt / nominalCuFt * 100, 1) : null;
  const noDressedRow = input.dressed && filled.length > 0 && !allKnown;
  const cost = input.pricePerBf !== null && input.pricePerBf >= 0 ? round(orderBf * input.pricePerBf, 2) : null;
  const pricePer1000 = input.pricePerBf !== null && input.pricePerBf >= 0 ? round(input.pricePerBf * 1e3, 2) : null;
  const sizeLabel = (l) => metric ? `${formatNumber(convert(l.thicknessIn, "in", "mm"), 1)} x ${formatNumber(convert(l.widthIn, "in", "mm"), 1)} mm x ${formatNumber(convert(l.lengthFt, "ft", "m"), 2)} m` : `${formatNumber(l.thicknessIn, 2)} x ${formatNumber(l.widthIn, 2)} x ${formatNumber(l.lengthFt, 2)} ft`;
  if (noDressedRow) {
    const off = filled.filter((l) => l.dressedCuFt === null).map((l) => sizeLabel(l));
    warnings.push({
      level: "caution",
      code: "no-dressed-row",
      message: `${off.join(", ")}: the softwood standard has no nominal row for that size, so no dressed volume is shown. The numbers you typed are the real dimensions already.`,
      field: "dressed"
    });
  }
  if (filled.length === 0) {
    warnings.push({
      level: "info",
      code: "no-dimensions",
      message: "Type a thickness, a width, a length and a piece count."
    });
  }
  const DASH4 = "—";
  const primary = totalBf > 0 ? {
    value: round(totalBf, 2),
    unit: "ea",
    label: "Total board feet",
    precision: 2,
    display: `${formatNumber(totalBf, 2)} BF`
  } : { value: 0, unit: "ea", label: "Total board feet", display: DASH4 };
  const secondary = [];
  secondary.push(
    orderBf > 0 ? { value: orderBf, unit: "ea", label: "Order quantity", precision: 0, display: `${orderBf} BF` } : { value: 0, unit: "ea", label: "Order quantity", display: DASH4 }
  );
  for (const l of filled) {
    secondary.push({
      value: round(l.boardFeet, 2),
      unit: "ea",
      label: `Line ${l.index}: ${sizeLabel(l)}`,
      precision: 2,
      display: `${formatNumber(l.boardFeet, 2)} BF`
    });
  }
  secondary.push({ value: pieces, unit: "ea", label: "Pieces", precision: 0 });
  secondary.push(
    metric ? { value: round(convert(linealFt, "ft", "m"), 2), unit: "m", label: "Lineal metres", precision: 2 } : { value: round(linealFt, 2), unit: "ft", label: "Lineal feet", precision: 2 }
  );
  const volPrecision = metric ? 3 : 2;
  const volume = (cuFt, label2) => metric ? { value: round(convert(cuFt, "cuft", "cum"), volPrecision), unit: "cum", label: label2, precision: volPrecision } : { value: round(cuFt, volPrecision), unit: "cuft", label: label2, precision: volPrecision };
  secondary.push(volume(nominalCuFt, "Nominal volume"));
  if (dressedCuFt !== null) {
    secondary.push(volume(dressedCuFt, "Dressed volume"));
    if (dressedPct !== null) {
      secondary.push({ value: dressedPct, unit: "pct", label: "Dressed share", precision: 1 });
    }
  }
  if (cost !== null) secondary.push({ value: cost, unit: "usd", label: "Cost at your price", precision: 2 });
  if (pricePer1000 !== null) {
    secondary.push({ value: pricePer1000, unit: "usd", label: "Per 1,000 board feet", precision: 2 });
  }
  const roundSentence = "rounded up to the next whole board foot; your supplier may bill fractions";
  const takeoff = [];
  for (const l of filled) {
    takeoff.push({
      key: `line-${l.index}`,
      item: sizeLabel(l),
      qty: l.pieces,
      unit: "ea",
      order: l.pieces,
      orderUnit: "ea",
      note: `${formatNumber(l.boardFeet / l.pieces, 2)} BF each - ${formatNumber(l.boardFeet, 2)} BF net on this line`
    });
  }
  if (totalBf > 0) {
    takeoff.push({
      key: "pieces",
      item: "Pieces on this order",
      qty: pieces,
      unit: "ea",
      order: pieces,
      orderUnit: "ea",
      note: wastePct > 0 ? `${formatNumber(totalBf, 2)} BF net, ${orderBf} BF billed with your ${formatNumber(wastePct, 2)} % allowance` : `${formatNumber(totalBf, 2)} BF net, ${orderBf} BF billed, ${roundSentence}`
    });
    if (cost !== null) {
      takeoff.push({
        key: "cost",
        item: "Lumber cost",
        qty: pieces,
        unit: "ea",
        order: cost,
        orderUnit: "usd",
        note: `${orderBf} BF at your price per board foot. Delivery, fasteners and finish are not priced.`
      });
    }
  }
  const assumptions = [
    `One board foot is ${CU_IN_PER_BOARD_FOOT} cubic inches of sawed lumber (a board 1 in thick, 12 in wide, 1 ft long), so a line is T" x W" x L" / ${CU_IN_PER_BOARD_FOOT} = T" x W" x L' / ${BOARD_FEET_PER_CU_FT}.`,
    `Board feet are billed on the NOMINAL size you type, and ${BOARD_FEET_PER_CU_FT} board feet make one cubic foot (${CU_IN_PER_CU_FT} / ${CU_IN_PER_BOARD_FOOT}).`,
    `The board feet billed are ${roundSentence}.`
  ];
  assumptions.push(
    wastePct > 0 ? `Allowance ${wastePct}% on the total - your figure. No published lumber cut-off percentage was read.` : "No allowance is added: the sheet orders what it measured until you type your own percentage."
  );
  assumptions.push(
    input.dressed ? "Dressed sizes are the MINIMUM dressed dry sizes of the softwood standard PS 20-20 Table 3, applied because you stated the sizes typed are nominal softwood sizes. A given product can be larger; hardwood is sold on rough thickness." : "Nothing is converted to a dressed size: tick the nominal softwood option if the sizes you typed are nominal softwood sizes."
  );
  assumptions.push(
    "No weight and no density: ask your supplier for the weight per board foot of the species you are buying."
  );
  assumptions.push(
    "No species, no grade and no log rule: Doyle and Scribner measure logs, a different unit, and are out of scope."
  );
  return {
    primary,
    secondary,
    takeoff,
    warnings,
    assumptions,
    raw: {
      totalBf,
      withWasteBf,
      nominalCuM: convert(nominalCuFt, "cuft", "cum"),
      dressedCuM: dressedCuFt === null ? null : convert(dressedCuFt, "cuft", "cum"),
      linealM: convert(linealFt, "ft", "m")
    },
    lines,
    totalBf,
    withWasteBf,
    orderBf,
    nominalCuFt,
    cuIn,
    dressedCuFt,
    dressedPct,
    noDressedRow,
    linealFt,
    pieces,
    cost,
    pricePer1000
  };
}
var boardFootSpec = {
  id: BOARDFOOT_ID,
  version: BOARDFOOT_VERSION,
  revised: BOARDFOOT_REVISED,
  inputs: boardFootInputs,
  compute: computeBoardFoot
};

// src/data/reference/roofing.ts
var HDZ_BUNDLES_PER_SQUARE = 3;
var SEAL_A_RIDGE_BUNDLES_PER_100_LF = 4;
var PRO_START_LF_PER_BUNDLE = 120.33;
var FELTBUSTER_SQUARES_PER_ROLL = 10;
var FELTBUSTER_SQFT_PER_ROLL = 1e3;
var SQFT_PER_SQUARE = FELTBUSTER_SQFT_PER_ROLL / FELTBUSTER_SQUARES_PER_ROLL;
var SEAL_A_RIDGE_LF_PER_BUNDLE = 100 / SEAL_A_RIDGE_BUNDLES_PER_100_LF;
var PITCH_RUN_IN = 12;
var ROOF_FORMS = ["gable", "hip", "shed"];

// src/engine/formulas/roofing/roofing.ts
var ROOFING_ID = "roofing-calculator";
var ROOFING_VERSION = "1.0.0";
var ROOFING_REVISED = "2026-09-19";
var MAX_SECTIONS2 = 4;
var G_SECTIONS2 = { id: "sections" };
var G_PRODUCTS = { id: "products" };
var G_ORDER8 = { id: "order" };
function sectionFields(k) {
  const s = k === 1 ? "" : String(k);
  const tag = k === 1 ? "" : `Section ${k} `;
  const adv = k > 1;
  const cap = (t) => k === 1 ? t : t.toLowerCase();
  const group2 = adv ? G_SECTIONS2 : void 0;
  const common = {
    kind: "length",
    units: ["ft", "in"],
    metricUnit: "m",
    min: 0,
    max: 500,
    showWhen: "mode=sections",
    advanced: adv,
    ...group2 ? { group: group2 } : {}
  };
  return [
    {
      key: `form${s}`,
      q: `f${s}`,
      label: `${tag}${cap("Roof form")}`,
      kind: "select",
      default: "gable",
      options: ROOF_FORMS.map((f) => ({ value: f })),
      showWhen: "mode=sections",
      advanced: adv,
      ...group2 ? { group: group2 } : {}
    },
    {
      ...common,
      key: `length${s}`,
      q: `l${s}`,
      label: `${tag}${cap("Plan length")}`,
      default: k === 1 ? 40 : 0,
      metricDefault: k === 1 ? 12 : 0
    },
    {
      ...common,
      key: `width${s}`,
      q: `w${s}`,
      label: `${tag}${cap("Plan width")}`,
      default: k === 1 ? 25 : 0,
      metricDefault: k === 1 ? 7.6 : 0
    },
    {
      key: `rise${s}`,
      q: `p${s}`,
      label: `${tag}${cap("Pitch, rise in 12")}`,
      kind: "count",
      default: 6,
      min: 0,
      max: 24,
      step: 0.5,
      showWhen: "mode=sections",
      advanced: adv,
      ...group2 ? { group: group2 } : {}
    }
  ];
}
var roofingInputs = [
  {
    key: "mode",
    q: "m",
    label: "What you have",
    kind: "select",
    default: "sections",
    options: [{ value: "sections" }, { value: "area" }]
  },
  ...sectionFields(1),
  // ---- the "I already have the sloped area" branch ---------------------
  {
    key: "knownArea",
    q: "sa",
    label: "Sloped roof area",
    kind: "area",
    default: 0,
    min: 0,
    max: 2e5,
    optional: true,
    showWhen: "mode=area"
  },
  // The area carries its own unit: the imperial / metric switch only rewrites
  // lengths, so a typed 2,000 sq ft must not become 2,000 m2 when it is pressed.
  {
    key: "areaUnit",
    q: "au",
    label: "Area unit",
    kind: "select",
    default: "sqft",
    options: [{ value: "sqft" }, { value: "sqm" }],
    showWhen: "mode=area"
  },
  {
    key: "knownRidge",
    q: "rl",
    label: "Ridge and hip length",
    kind: "length",
    units: ["ft", "in"],
    metricUnit: "m",
    default: 0,
    min: 0,
    max: 5e3,
    optional: true,
    showWhen: "mode=area"
  },
  {
    key: "knownEave",
    q: "el",
    label: "Eave length",
    kind: "length",
    units: ["ft", "in"],
    metricUnit: "m",
    default: 0,
    min: 0,
    max: 5e3,
    optional: true,
    showWhen: "mode=area"
  },
  {
    key: "priceBundle",
    q: "pb",
    label: "Price per bundle",
    kind: "money",
    default: "",
    optional: true,
    min: 0,
    max: 2e3
  },
  // ---- advanced: sections 2 to 4 --------------------------------------
  ...sectionFields(2),
  ...sectionFields(3),
  ...sectionFields(4),
  // ---- advanced: the products you are actually buying ------------------
  {
    key: "bundlesPerSquare",
    q: "bs",
    label: "Bundles per square",
    kind: "count",
    default: HDZ_BUNDLES_PER_SQUARE,
    min: 1,
    max: 10,
    step: 1,
    advanced: true,
    group: G_PRODUCTS
  },
  {
    key: "rollSquares",
    q: "rs",
    label: "Squares per underlayment roll",
    kind: "count",
    default: FELTBUSTER_SQUARES_PER_ROLL,
    min: 1,
    max: 40,
    advanced: true,
    group: G_PRODUCTS
  },
  {
    key: "ridgeLfPerBundle",
    q: "rb",
    label: "Ridge cap, linear feet per bundle",
    kind: "count",
    default: SEAL_A_RIDGE_LF_PER_BUNDLE,
    min: 1,
    max: 200,
    advanced: true,
    group: G_PRODUCTS
  },
  {
    key: "starterLfPerBundle",
    q: "sb",
    label: "Starter, linear feet per bundle",
    kind: "count",
    default: PRO_START_LF_PER_BUNDLE,
    min: 1,
    max: 500,
    advanced: true,
    group: G_PRODUCTS
  },
  // ---- advanced: ordering ---------------------------------------------
  {
    key: "starterRakes",
    q: "sr",
    label: "Starter on the rakes too",
    kind: "toggle",
    default: false,
    advanced: true,
    group: G_ORDER8
  },
  { key: "waste", q: "wa", label: "Waste", kind: "percent", default: 0, min: 0, max: 25, step: 1, advanced: true, group: G_ORDER8 }
];
var FORMS = new Set(ROOF_FORMS);
var MODES3 = /* @__PURE__ */ new Set(["sections", "area"]);
function parseRoofingInputs(raw, system = "imperial") {
  const { values, errors } = coerce(roofingInputs, raw, system);
  const sections = [];
  for (let k = 1; k <= MAX_SECTIONS2; k += 1) {
    const s = k === 1 ? "" : String(k);
    const formRaw = str(values, `form${s}`, "gable");
    sections.push({
      form: FORMS.has(formRaw) ? formRaw : "gable",
      length: num(values, `length${s}`),
      width: num(values, `width${s}`),
      rise: num(values, `rise${s}`, 0)
    });
  }
  const modeRaw = str(values, "mode", "sections");
  const areaTyped = optNum(values, "knownArea") ?? 0;
  const areaInSqm = str(values, "areaUnit", "sqft") === "sqm";
  return {
    inputs: {
      system,
      mode: MODES3.has(modeRaw) ? modeRaw : "sections",
      sections,
      knownArea: areaInSqm ? areaTyped : convert(areaTyped, "sqft", "sqm"),
      knownRidge: optNum(values, "knownRidge") ?? 0,
      knownEave: optNum(values, "knownEave") ?? 0,
      bundlesPerSquare: num(values, "bundlesPerSquare", HDZ_BUNDLES_PER_SQUARE),
      rollSquares: num(values, "rollSquares", FELTBUSTER_SQUARES_PER_ROLL),
      ridgeLfPerBundle: num(values, "ridgeLfPerBundle", SEAL_A_RIDGE_LF_PER_BUNDLE),
      starterLfPerBundle: num(values, "starterLfPerBundle", PRO_START_LF_PER_BUNDLE),
      starterOnRakes: bool(values, "starterRakes"),
      wastePct: num(values, "waste", 0),
      pricePerBundle: optNum(values, "priceBundle")
    },
    errors
  };
}
function pitchFactor(rise) {
  const r = Number.isFinite(rise) ? Math.max(0, rise) : 0;
  return Math.sqrt(r * r + PITCH_RUN_IN * PITCH_RUN_IN) / PITCH_RUN_IN;
}
function hipFactor(rise) {
  const r = Number.isFinite(rise) ? Math.max(0, rise) : 0;
  return Math.sqrt(2 + (r / PITCH_RUN_IN) ** 2);
}
function fin3(v, fallback = 0) {
  return Number.isFinite(v) ? v : fallback;
}
function sectionGeometry(s) {
  const rise = Math.max(0, fin3(s.rise));
  const factor = pitchFactor(rise);
  let length = Math.max(0, fin3(s.length));
  let width = Math.max(0, fin3(s.width));
  let swapped = false;
  if (s.form === "hip" && width > length) {
    [length, width] = [width, length];
    swapped = true;
  }
  const planArea2 = length * width;
  const slopedArea = planArea2 * factor;
  if (s.form === "hip") {
    return {
      form: s.form,
      length,
      width,
      rise,
      factor,
      planArea: planArea2,
      slopedArea,
      ridge: Math.max(0, length - width),
      hips: 4 * (width / 2) * hipFactor(rise),
      eaves: 2 * (length + width),
      rakes: 0,
      swapped
    };
  }
  if (s.form === "shed") {
    return {
      form: s.form,
      length,
      width,
      rise,
      factor,
      planArea: planArea2,
      slopedArea,
      ridge: 0,
      hips: 0,
      eaves: length,
      rakes: 2 * width * factor,
      swapped
    };
  }
  return {
    form: "gable",
    length,
    width,
    rise,
    factor,
    planArea: planArea2,
    slopedArea,
    ridge: length,
    hips: 0,
    eaves: 2 * length,
    rakes: 4 * (width / 2) * factor,
    swapped
  };
}
function computeRoofing(input) {
  const warnings = [];
  const i = {
    ...input,
    sections: input.sections.map((s) => ({
      form: s.form,
      length: fin3(s.length),
      width: fin3(s.width),
      rise: fin3(s.rise)
    })),
    knownArea: fin3(input.knownArea),
    knownRidge: fin3(input.knownRidge),
    knownEave: fin3(input.knownEave),
    bundlesPerSquare: fin3(input.bundlesPerSquare, HDZ_BUNDLES_PER_SQUARE),
    rollSquares: fin3(input.rollSquares, FELTBUSTER_SQUARES_PER_ROLL),
    ridgeLfPerBundle: fin3(input.ridgeLfPerBundle, SEAL_A_RIDGE_LF_PER_BUNDLE),
    starterLfPerBundle: fin3(input.starterLfPerBundle, PRO_START_LF_PER_BUNDLE),
    wastePct: fin3(input.wastePct, 0),
    pricePerBundle: input.pricePerBundle === null ? null : fin3(input.pricePerBundle)
  };
  const metric = i.system === "metric";
  const byArea = i.mode === "area";
  if (i.sections.some((s) => s.length < 0 || s.width < 0 || s.rise < 0) || i.knownArea < 0 || i.knownRidge < 0 || i.knownEave < 0) {
    warnings.push({
      level: "error",
      code: "negative-dimension",
      message: "Negative dimensions ignored. Enter positive lengths."
    });
  }
  const wastePct = Math.min(25, Math.max(0, i.wastePct));
  if (i.wastePct !== wastePct) {
    warnings.push({ level: "caution", code: "waste-clamped", message: "Waste clamped to 0-25%.", field: "waste" });
  }
  const sections = byArea ? [] : i.sections.map(sectionGeometry).filter((s) => s.planArea > 0);
  const planArea2 = sections.reduce((t, s) => t + s.planArea, 0);
  const slopedArea = byArea ? Math.max(0, i.knownArea) : sections.reduce((t, s) => t + s.slopedArea, 0);
  const ridgeCapLength = byArea ? Math.max(0, i.knownRidge) : sections.reduce((t, s) => t + s.ridge + s.hips, 0);
  const eaveLength = byArea ? Math.max(0, i.knownEave) : sections.reduce((t, s) => t + s.eaves, 0);
  const rakeLength = byArea ? 0 : sections.reduce((t, s) => t + s.rakes, 0);
  const starterLength = eaveLength + (i.starterOnRakes ? rakeLength : 0);
  const rises = new Set(sections.map((s) => s.rise));
  const factor = byArea ? null : sections.length > 0 && rises.size === 1 ? sections[0].factor : null;
  if (sections.some((s) => s.swapped)) {
    warnings.push({
      level: "info",
      code: "hip-swapped",
      message: "A hip was entered narrower than it is long; length and width were swapped so the ridge runs the long way. Check the plan drawing against your roof."
    });
  }
  if (!byArea && rises.size > 1) {
    warnings.push({
      level: "caution",
      code: "mixed-pitch",
      message: "The sections do not share one pitch. Each one is converted with its own factor; the single pitch factor shown on a one-pitch roof is hidden."
    });
  }
  if (!byArea && sections.some((s) => s.rise === 0)) {
    warnings.push({
      level: "caution",
      code: "flat-pitch",
      message: "A rise of 0 in 12 gives a pitch factor of 1, so the sloped area equals the footprint. Check your shingle's own minimum slope before taking off a roof that flat.",
      field: "rise"
    });
  }
  if (byArea && slopedArea > 0 && ridgeCapLength === 0 && eaveLength === 0) {
    warnings.push({
      level: "info",
      code: "no-lengths",
      message: "Sloped area only: type the ridge, hip and eave lengths to get ridge cap and starter as well. Nothing is inferred from an area.",
      field: "knownRidge"
    });
  }
  const slopedSqFt = convert(slopedArea, "sqm", "sqft");
  const squares = slopedSqFt / SQFT_PER_SQUARE;
  const orderSquares = squares * (1 + wastePct / 100);
  const perSquare = i.bundlesPerSquare > 0 ? i.bundlesPerSquare : 0;
  const rollSq = i.rollSquares > 0 ? i.rollSquares : 0;
  const ridgeLf = i.ridgeLfPerBundle > 0 ? i.ridgeLfPerBundle : 0;
  const starterLf = i.starterLfPerBundle > 0 ? i.starterLfPerBundle : 0;
  const bundles = perSquare > 0 ? roundUpWhole(orderSquares * perSquare) : 0;
  const rolls = rollSq > 0 ? roundUpWhole(orderSquares / rollSq) : 0;
  const ridgeCapFt = convert(ridgeCapLength, "m", "ft");
  const starterFt = convert(starterLength, "m", "ft");
  const ridgeCapBundles = ridgeLf > 0 ? roundUpWhole(ridgeCapFt / ridgeLf) : 0;
  const starterBundles = starterLf > 0 ? roundUpWhole(starterFt / starterLf) : 0;
  const cost = i.pricePerBundle !== null && i.pricePerBundle >= 0 && bundles > 0 ? round(bundles * i.pricePerBundle, 2) : null;
  if (slopedArea <= 0) {
    warnings.push({
      level: "info",
      code: "no-dimensions",
      message: byArea ? "Enter the sloped roof area you already measured." : "Enter a plan length, a plan width and a pitch to get a bundle count."
    });
  } else if (rolls > 0) {
    warnings.push({
      level: "info",
      code: "underlayment-laps",
      message: 'The underlayment roll is a 10-square roll before laps: GAF FeltBuster prints "excludes laps". No lap allowance is added here because none was published.'
    });
  }
  const DASH4 = "—";
  const primary = bundles > 0 ? { value: bundles, unit: "ea", label: "Shingle bundles", precision: 0, display: `${bundles} bundles` } : { value: 0, unit: "ea", label: "Shingle bundles", display: DASH4 };
  const secondary = [];
  secondary.push(
    bundles > 0 ? { value: bundles, unit: "ea", label: "Order quantity", precision: 0, display: `${bundles} bundles of shingles` } : { value: 0, unit: "ea", label: "Order quantity", display: DASH4 }
  );
  if (metric) {
    secondary.push({ value: round(slopedArea, 2), unit: "sqm", label: "Sloped roof area", precision: 2 });
    if (!byArea) secondary.push({ value: round(planArea2, 2), unit: "sqm", label: "Plan area", precision: 2 });
  } else {
    secondary.push({ value: round(slopedSqFt, 0), unit: "sqft", label: "Sloped roof area", precision: 0 });
    secondary.push({ value: round(slopedArea, 2), unit: "sqm", label: "Sloped roof area, metric", precision: 2 });
    if (!byArea) secondary.push({ value: round(convert(planArea2, "sqm", "sqft"), 0), unit: "sqft", label: "Plan area", precision: 0 });
  }
  secondary.push({
    value: round(squares, 2),
    unit: "ea",
    label: "Roofing squares",
    display: `${formatNumber(squares, 2)} squares`
  });
  if (factor !== null) {
    secondary.push({
      value: round(factor, 4),
      unit: "ea",
      label: "Pitch factor",
      display: `${formatNumber(factor, 3)} x plan area`
    });
  }
  secondary.push({ value: rolls, unit: "ea", label: "Underlayment rolls", precision: 0 });
  secondary.push(
    metric ? { value: round(ridgeCapLength, 2), unit: "m", label: "Ridge and hip", precision: 2 } : { value: round(ridgeCapFt, 1), unit: "ft", label: "Ridge and hip", precision: 1 }
  );
  secondary.push({ value: ridgeCapBundles, unit: "ea", label: "Ridge cap bundles", precision: 0 });
  secondary.push(
    metric ? { value: round(starterLength, 2), unit: "m", label: "Starter run", precision: 2 } : { value: round(starterFt, 1), unit: "ft", label: "Starter run", precision: 1 }
  );
  secondary.push({ value: starterBundles, unit: "ea", label: "Starter bundles", precision: 0 });
  if (!byArea && rakeLength > 0) {
    secondary.push(
      metric ? { value: round(rakeLength, 2), unit: "m", label: "Rake length", precision: 2 } : { value: round(convert(rakeLength, "m", "ft"), 1), unit: "ft", label: "Rake length", precision: 1 }
    );
  }
  if (cost !== null) secondary.push({ value: cost, unit: "usd", label: "Shingles at your price per bundle", precision: 2 });
  const takeoff = [];
  const areaQty = (sqm) => metric ? round(sqm, 2) : round(convert(sqm, "sqm", "sqft"), 0);
  const areaUnit = metric ? "sqm" : "sqft";
  const runQty = (m) => metric ? round(m, 2) : round(convert(m, "m", "ft"), 1);
  const runUnit = metric ? "m" : "ft";
  const ftLabel = (m) => metric ? `${formatNumber(m, 2)} m` : `${formatNumber(convert(m, "m", "ft"), 1)} ft`;
  for (const [k, s] of sections.entries()) {
    takeoff.push({
      key: `section-${k + 1}`,
      item: `${s.form} section, ${ftLabel(s.length)} x ${ftLabel(s.width)} at ${formatNumber(s.rise, 2)} in 12`,
      qty: areaQty(s.planArea),
      unit: areaUnit,
      order: areaQty(s.slopedArea),
      orderUnit: areaUnit,
      note: `Pitch factor ${formatNumber(s.factor, 4)} = sqrt(${formatNumber(s.rise, 2)}² + 12²) / 12. Ridge ${ftLabel(
        s.ridge
      )}, hips ${ftLabel(s.hips)}, eaves ${ftLabel(s.eaves)}, rakes ${ftLabel(s.rakes)}.${s.swapped ? " Length and width swapped so the hip ridge runs the long way." : ""}`
    });
  }
  if (slopedArea > 0) {
    takeoff.push({
      key: "shingles",
      item: `Shingles at ${formatNumber(perSquare, 2)} bundles per square`,
      qty: areaQty(slopedArea),
      unit: areaUnit,
      waste: wastePct || void 0,
      order: bundles,
      orderUnit: "ea",
      note: `${formatNumber(orderSquares, 2)} squares x ${formatNumber(
        perSquare,
        2
      )} bundles, rounded up. 3 bundles per square is GAF Timberline HDZ's own figure; change the field to match your wrapper.`
    });
    takeoff.push({
      key: "underlayment",
      item: `Underlayment, ${formatNumber(rollSq, 2)}-square rolls`,
      qty: areaQty(slopedArea),
      unit: areaUnit,
      order: rolls,
      orderUnit: "ea",
      note: "GAF FeltBuster: 10 squares per roll, 1,000 sq ft, excludes laps. The laps are not in the figure and none is added here."
    });
    if (ridgeCapLength > 0) {
      takeoff.push({
        key: "ridge-cap",
        item: `Ridge cap at ${formatNumber(ridgeLf, 2)} lin ft per bundle`,
        qty: runQty(ridgeCapLength),
        unit: runUnit,
        order: ridgeCapBundles,
        orderUnit: "ea",
        note: "GAF Seal-A-Ridge publishes 4 bundles per 100 linear feet; 100 / 4 = 25 linear feet per bundle, which is the default in the field."
      });
    }
    if (starterLength > 0) {
      takeoff.push({
        key: "starter",
        item: `Starter at ${formatNumber(starterLf, 2)} lin ft per bundle`,
        qty: runQty(starterLength),
        unit: runUnit,
        order: starterBundles,
        orderUnit: "ea",
        note: `GAF Pro-Start: approx. 120.33 lineal feet per bundle when split in half. ${i.starterOnRakes ? "Eaves and rakes." : "Eaves only; switch on rakes if your shingle's instructions ask for it."}`
      });
    }
    if (cost !== null) {
      takeoff.push({
        key: "cost",
        item: "Shingle bundles at your quoted price",
        qty: bundles,
        unit: "ea",
        order: cost,
        orderUnit: "usd",
        note: `${bundles} shingle bundles x $${formatNumber(
          i.pricePerBundle ?? 0,
          2,
          false
        )}. Shingles only: ridge cap, starter and underlayment are other products at other prices; no accessories, no labour.`
      });
    }
  }
  const assumptions = [
    "Pitch factor = sqrt(rise² + 12²) / 12; sloped area = plan area including overhangs x that factor. Exact for a gable and a hip alike when every plane carries the same pitch.",
    "1 square = 100 sq ft, as GAF's FeltBuster sheet writes it (10 squares per roll = 1,000 sq ft)."
  ];
  if (byArea) {
    assumptions.push("You typed the sloped area, so no geometry is assumed: ridge, hip and eave lengths are yours as well.");
  } else {
    assumptions.push(
      "Plan length and width are the footprint INCLUDING the overhangs, measured on the ground or off the plan, not the wall line."
    );
    if (sections.length > 1) assumptions.push(`${sections.length} sections added together; overlapping planes are not detected.`);
  }
  assumptions.push(
    `Bundles per square ${formatNumber(perSquare, 2)}${perSquare === HDZ_BUNDLES_PER_SQUARE ? " - GAF Timberline HDZ's published figure for that one product" : " - your figure"}.`
  );
  assumptions.push(
    "Ridge cap 25 linear feet per bundle is GAF Seal-A-Ridge's 4 bundles per 100 linear feet divided out; starter 120.33 lineal feet per bundle is GAF Pro-Start's own number when the sheets are split in half."
  );
  assumptions.push(
    wastePct > 0 ? `Waste ${wastePct}% on the roof area - your figure. No waste ladder by roof complexity is published anywhere we opened.` : "No waste is added: the sheet orders what it measured until you type your own percentage."
  );
  assumptions.push(
    "No nails, ice barrier, drip edge, valley metal, flashing or lap allowance is counted, and no price is built in: no open document gives a quantity for any of them."
  );
  return {
    primary,
    secondary,
    takeoff,
    warnings,
    assumptions,
    raw: { planArea: planArea2, slopedArea, ridgeCapLength, starterLength, eaveLength, rakeLength },
    sections,
    factor,
    squares,
    orderSquares,
    bundles,
    rolls,
    ridgeCapBundles,
    starterBundles,
    cost
  };
}
var roofingSpec = {
  id: ROOFING_ID,
  version: ROOFING_VERSION,
  revised: ROOFING_REVISED,
  inputs: roofingInputs,
  compute: computeRoofing
};

// src/engine/formulas/roofing/roof-pitch.ts
var ROOF_PITCH_ID = "roof-pitch-calculator";
var ROOF_PITCH_VERSION = "1.0.0";
var ROOF_PITCH_REVISED = "2026-09-20";
var RUN_12IN_M = toBase(12, "in");
var RUN_1M = 1;
var DEG_PER_RAD = 180 / Math.PI;
var MAX_ANGLE_DEG = 89.999;
var MODES4 = /* @__PURE__ */ new Set(["rise-run", "angle", "grade", "onsite"]);
var roofPitchInputs = [
  {
    key: "mode",
    q: "m",
    label: "What you have",
    kind: "select",
    default: "rise-run",
    options: [{ value: "rise-run" }, { value: "angle" }, { value: "grade" }, { value: "onsite" }]
  },
  // `rise` and `run` carry NO showWhen. `conditionMet` (runtime/view.ts:164)
  // understands one toggle or one `field=value` - it cannot say "either of two
  // modes" - and the runtime is frozen (D58). These two fields are the ones the
  // rise-run mode AND the on-site mode both type into, so they stay visible and
  // their hints say what they hold in each mode.
  {
    key: "rise",
    q: "r",
    label: "Rise",
    kind: "length",
    units: ["in"],
    metricUnit: "cm",
    default: 6,
    metricDefault: 15.24,
    // A fall is a real roof: the rise is allowed to go negative and is NAMED as
    // a fall rather than silently flipped.
    min: -120,
    max: 120,
    hint: "how far the roof climbs over the run below. Holding a level on the roof: the drop measured at its far end."
  },
  {
    key: "run",
    q: "u",
    label: "Run",
    kind: "length",
    units: ["in"],
    metricUnit: "cm",
    default: 12,
    metricDefault: 30.48,
    min: 0,
    max: 120,
    hint: "the run your rise is measured over — 12 in is the convention, a 24 in level reads over 24."
  },
  {
    key: "angle",
    q: "a",
    label: "Angle",
    kind: "count",
    suffix: "degrees",
    default: 26.57,
    min: 0,
    max: 89,
    step: 0.01,
    showWhen: "mode=angle"
  },
  {
    key: "grade",
    q: "g",
    label: "Grade",
    kind: "count",
    suffix: "%",
    default: 50,
    min: 0,
    max: 2e3,
    step: 0.1,
    showWhen: "mode=grade"
  },
  // No default: the span block appears only once a span is typed.
  {
    key: "span",
    q: "s",
    label: "Building span",
    kind: "length",
    units: ["ft", "in"],
    metricUnit: "m",
    default: "",
    min: 0,
    max: 200,
    optional: true,
    hint: "wall to wall, if you want a rafter length. A common rafter runs over half of it."
  },
  {
    key: "overhang",
    q: "o",
    label: "Overhang",
    kind: "length",
    units: ["in"],
    metricUnit: "cm",
    default: "",
    min: 0,
    max: 120,
    optional: true,
    hint: "measured horizontally, the way a framing square reads it."
  }
];
function parseRoofPitchInputs(raw, system = "imperial") {
  const { values, errors } = coerce(roofPitchInputs, raw, system);
  const modeRaw = str(values, "mode", "rise-run");
  return {
    inputs: {
      system,
      mode: MODES4.has(modeRaw) ? modeRaw : "rise-run",
      rise: num(values, "rise", 0),
      run: num(values, "run", 0),
      angleDeg: num(values, "angle", 0),
      gradePct: num(values, "grade", 0),
      span: optNum(values, "span"),
      overhang: optNum(values, "overhang")
    },
    errors
  };
}
function fin4(v, fallback = 0) {
  return Number.isFinite(v) ? v : fallback;
}
function fromRiseRun(rise, run) {
  if (!Number.isFinite(rise) || !Number.isFinite(run) || run <= 0) return null;
  if (rise === 0) return { pitchX12: 0, angleDeg: 0, gradePct: 0, slopeFactor: 1 };
  return {
    pitchX12: rise * 12 / run,
    angleDeg: Math.atan2(rise, run) * DEG_PER_RAD,
    gradePct: rise / run * 100,
    slopeFactor: Math.hypot(rise, run) / run
  };
}
function riseFromAngle(angleDeg, run = RUN_12IN_M) {
  const a = Math.min(MAX_ANGLE_DEG, Math.max(-MAX_ANGLE_DEG, fin4(angleDeg)));
  return run * Math.tan(a / DEG_PER_RAD);
}
function riseFromGrade(gradePct, run = RUN_12IN_M) {
  return run * fin4(gradePct) / 100;
}
function spanFigures(span, overhang, f) {
  if (!Number.isFinite(span) || span <= 0) return null;
  const halfRun = span / 2;
  const totalRun = halfRun + Math.max(0, fin4(overhang));
  return {
    halfRun,
    totalRun,
    ridgeHeight: halfRun * (f.gradePct / 100),
    rafter: totalRun * f.slopeFactor,
    rafterNoOverhang: halfRun * f.slopeFactor
  };
}
function computeRoofPitch(input) {
  const warnings = [];
  const metric = input.system === "metric";
  const mode = MODES4.has(input.mode) ? input.mode : "rise-run";
  let rise;
  let run;
  if (mode === "angle") {
    const typed = fin4(input.angleDeg);
    const bounded = Math.min(MAX_ANGLE_DEG, Math.max(-MAX_ANGLE_DEG, typed));
    if (bounded !== typed) {
      warnings.push({
        level: "caution",
        code: "angle-bounded",
        field: "angle",
        message: `The angle was held at ${MAX_ANGLE_DEG}°. At 90° the run is zero, so there is no rise per 12 to write.`
      });
    }
    run = RUN_12IN_M;
    rise = riseFromAngle(bounded, run);
  } else if (mode === "grade") {
    run = RUN_12IN_M;
    rise = riseFromGrade(fin4(input.gradePct), run);
  } else {
    rise = fin4(input.rise);
    run = fin4(input.run);
  }
  const figures = fromRiseRun(rise, run);
  const valid = figures !== null;
  const f = figures ?? { pitchX12: 0, angleDeg: 0, gradePct: 0, slopeFactor: 1 };
  const descending = valid && rise < 0;
  if (!valid) {
    warnings.push({
      level: "error",
      code: "run-zero",
      field: "run",
      message: "A run of zero has no pitch. A rise is always measured over a run: type the run it climbs over — 12 in is the convention, a 24 in level reads over 24."
    });
  } else if (rise === 0) {
    warnings.push({
      level: "info",
      code: "flat-plane",
      field: "rise",
      message: "A rise of zero is a flat plane: pitch 0 in 12, angle 0°, grade 0 %, and a slope factor of exactly 1, so a sloped area equals its footprint."
    });
  } else if (descending) {
    warnings.push({
      level: "caution",
      code: "descending-slope",
      field: "rise",
      message: "A negative rise is read as a fall and is shown as one: the pitch, the angle and the grade are printed negative rather than quietly flipped. The slope factor is the same as for the matching climb."
    });
  }
  const typedOverhang = input.overhang !== null ? fin4(input.overhang) : 0;
  if (typedOverhang < 0) {
    warnings.push({
      level: "caution",
      code: "overhang-negative",
      field: "overhang",
      message: "A negative overhang was read as none. The overhang is the horizontal run past the wall."
    });
  }
  const typedSpan = input.span !== null ? fin4(input.span) : 0;
  const span = valid ? spanFigures(typedSpan, typedOverhang, f) : null;
  if (valid && span === null) {
    warnings.push({
      level: "info",
      code: "no-span",
      field: "span",
      message: "Type the span, wall to wall, to get the ridge height and the common rafter as well. Nothing is assumed about the building until you do."
    });
  }
  const DASH4 = "—";
  const deg = (v) => `${formatNumber(v, 2)}°`;
  const pitchText = `${formatNumber(f.pitchX12, 2)} in 12`;
  const lenText = (m) => metric ? `${formatNumber(m, 4)} m` : formatFeetInches(m);
  const lenValue = (m) => metric ? round(m, 4) : round(fromBase(m, "ft"), 4);
  const lenUnit = metric ? "m" : "ft";
  const primary = !valid ? { value: 0, unit: "ea", label: metric ? "Roof angle, degrees" : "Roof pitch, rise in 12", display: DASH4 } : metric ? { value: round(f.angleDeg, 2), unit: "ea", label: "Roof angle, degrees", precision: 2, display: deg(f.angleDeg) } : { value: round(f.pitchX12, 2), unit: "ea", label: "Roof pitch, rise in 12", precision: 2, display: pitchText };
  const secondary = [];
  if (valid) {
    if (metric) {
      secondary.push({
        value: round(f.pitchX12, 2),
        unit: "ea",
        label: "US pitch, rise in inches per 12 of run",
        precision: 2,
        display: pitchText
      });
    } else {
      secondary.push({ value: round(f.angleDeg, 2), unit: "ea", label: "Angle", precision: 2, display: deg(f.angleDeg) });
    }
    secondary.push({
      value: round(f.gradePct, 2),
      unit: "pct",
      label: "Grade",
      precision: 2,
      display: `${formatNumber(f.gradePct, 2)} %`
    });
    secondary.push({
      value: round(f.slopeFactor, 6),
      unit: "ea",
      label: "Slope factor",
      precision: 6,
      display: formatNumber(f.slopeFactor, 4)
    });
    if (span) {
      secondary.push({
        value: lenValue(span.ridgeHeight),
        unit: lenUnit,
        label: "Ridge height",
        display: lenText(span.ridgeHeight)
      });
      secondary.push({
        value: lenValue(span.rafter),
        unit: lenUnit,
        label: "Common rafter",
        display: lenText(span.rafter)
      });
      secondary.push({
        value: lenValue(span.rafterNoOverhang),
        unit: lenUnit,
        label: "Rafter without overhang",
        display: lenText(span.rafterNoOverhang)
      });
    }
  }
  const takeoff = [];
  if (valid) {
    const runLabel = metric ? "1.00 m" : "12 in";
    const perRun = metric ? RUN_1M : RUN_12IN_M;
    const ratioUnit = metric ? "cm" : "in";
    const ratioQty = (multiplier) => round(fromBase(perRun * multiplier, ratioUnit), 2);
    const riseOverRun = ratioQty(f.gradePct / 100);
    const slopeOverRun = ratioQty(f.slopeFactor);
    const arithmetic = `rise ${formatNumber(fromBase(rise, ratioUnit), 2)} ${ratioUnit} over a run of ${formatNumber(fromBase(run, ratioUnit), 2)} ${ratioUnit}`;
    takeoff.push({
      key: "pitch",
      item: `Roof pitch — rise per ${runLabel} of run`,
      qty: riseOverRun,
      unit: ratioUnit,
      order: riseOverRun,
      orderUnit: ratioUnit,
      note: `${arithmetic}. Pitch = rise × 12 ÷ run = ${pitchText}. Angle = atan(rise ÷ run) = ${deg(f.angleDeg)}. Grade = rise ÷ run × 100 = ${formatNumber(f.gradePct, 2)} %.`
    });
    takeoff.push({
      key: "slope-factor",
      item: `Slope length per ${runLabel} of run`,
      qty: slopeOverRun,
      unit: ratioUnit,
      order: slopeOverRun,
      orderUnit: ratioUnit,
      note: `Slope factor = √(rise² + run²) ÷ run = ${formatNumber(f.slopeFactor, 6)}. Multiply a plan area by it to get the sloped area — the same factor the roofing calculator uses.`
    });
    if (span) {
      takeoff.push({
        key: "ridge-height",
        item: "Ridge height above the wall plate",
        qty: lenValue(span.ridgeHeight),
        unit: lenUnit,
        order: lenValue(span.ridgeHeight),
        orderUnit: lenUnit,
        note: `Half the span, ${lenText(span.halfRun)}, × ${formatNumber(f.gradePct / 100, 6)} = ${lenText(span.ridgeHeight)}.`
      });
      takeoff.push({
        key: "rafter",
        item: "Common rafter, overhang included",
        qty: lenValue(span.rafter),
        unit: lenUnit,
        order: lenValue(span.rafter),
        orderUnit: lenUnit,
        note: `Run with overhang ${lenText(span.totalRun)} × slope factor ${formatNumber(f.slopeFactor, 6)} = ${lenText(span.rafter)}. Line length only: no birdsmouth, no ridge cut, no rafter count.`
      });
      takeoff.push({
        key: "rafter-no-overhang",
        item: "Common rafter, wall to ridge",
        qty: lenValue(span.rafterNoOverhang),
        unit: lenUnit,
        order: lenValue(span.rafterNoOverhang),
        orderUnit: lenUnit,
        note: `Half the span, ${lenText(span.halfRun)}, × slope factor ${formatNumber(f.slopeFactor, 6)}.`
      });
    }
  }
  const assumptions = [
    "Every figure here is arithmetic on your own two numbers: pitch = rise × 12 ÷ run, angle = atan(rise ÷ run), grade = rise ÷ run × 100, slope factor = √(rise² + run²) ÷ run. Nothing is read off a table and nothing is attributed to anyone.",
    "The slope factor multiplies a plan area to give the sloped area — the same factor the roofing calculator uses."
  ];
  if (mode === "angle") {
    assumptions.push(
      "You typed an angle, so it was solved back to a rise over a 12 in run: rise = tan(angle) × 12. The four outputs are the same in every mode."
    );
  } else if (mode === "grade") {
    assumptions.push(
      "You typed a grade, so it was solved back to a rise over a 12 in run: rise = grade ÷ 100 × 12. The four outputs are the same in every mode."
    );
  } else if (mode === "onsite") {
    assumptions.push(
      "On-site measurement: a level held horizontal against the roof line and the drop measured at its far end. The run field carries the level's own length — 12 in, 24 in, whatever you held — so the rise is read over exactly that."
    );
  } else {
    assumptions.push("The rise and the run are read over the same line, in the same unit. A 12 in run is the US convention, not a requirement.");
  }
  if (span) {
    assumptions.push(
      "The span is wall to wall and the common rafter runs over half of it. The overhang is measured HORIZONTALLY and added to that run, the way a framing square reads it; the rafter follows the same slope."
    );
    assumptions.push(
      "The rafter figure is a line length. The rafter count, the birdsmouth, the ridge cut, hips and valleys are a framing takeoff, not a slope conversion."
    );
  }
  assumptions.push(
    "No minimum pitch by roofing material, no low-slope threshold and no 'standard' pitch is printed here: those are code and manufacturer requirements. Read them on your plans, in your product's instructions and in your local code."
  );
  assumptions.push(
    "This sheet measures a slope; it buys nothing. The takeoff's order column repeats the measured figure because there is no quantity to order."
  );
  return {
    primary,
    secondary,
    takeoff,
    warnings,
    assumptions,
    raw: {
      rise,
      run,
      pitchX12: f.pitchX12,
      angleDeg: f.angleDeg,
      gradePct: f.gradePct,
      slopeFactor: f.slopeFactor,
      span
    },
    valid,
    descending
  };
}
var roofPitchSpec = {
  id: ROOF_PITCH_ID,
  version: ROOF_PITCH_VERSION,
  revised: ROOF_PITCH_REVISED,
  inputs: roofPitchInputs,
  compute: computeRoofPitch
};

// src/data/reference/fence.ts
var FENCE_BAG_IDS = ["40", "50", "60", "80", "90"];
var FENCE_BAG_YIELD_CUFT = {
  "40": 0.3,
  "50": 0.375,
  "60": 0.45,
  "80": 0.6,
  "90": 0.675
};
var FENCE_DEFAULT_BAG = "60";
var FENCE_PICKET_WIDTH_IN = 5.5;
var FENCE_PICKET_WIDTH_MM = 140;
var FENCE_PICKET_GAP_IN = 0;
var FENCE_POST_SIDE_IN = 3.5;
var FENCE_HOLE_DIA_IN = 10;
var FENCE_HOLE_DEPTH_IN = 24;
var FENCE_RAIL_CHOICES = [2, 3];

// src/engine/formulas/decks/fence.ts
var FENCE_ID = "decks-fences-fence";
var FENCE_VERSION = "1.0.0";
var FENCE_REVISED = "2026-09-21";
var FENCE_STYLES = ["stick", "panel"];
var EPS2 = 1e-9;
var DASH2 = "—";
var IN_PER_FT2 = 12;
var CUIN_PER_CUFT = 1728;
function ceilEps2(v) {
  return Math.ceil(v - EPS2);
}
function fin5(v, fallback = 0) {
  return Number.isFinite(v) ? v : fallback;
}
function feet(m) {
  return convert(fin5(m), "m", "ft");
}
function inches2(m) {
  return convert(fin5(m), "m", "in");
}
var G_HOLE = { id: "hole" };
var G_PRICE = { id: "price" };
var FT3 = { kind: "length", units: ["ft", "in"], metricUnit: "m" };
var IN3 = { kind: "length", units: ["in", "ft"], metricUnit: "cm" };
var fenceInputs = [
  // Four-decimal metric defaults: a rounded 30.5 m is not a 100 ft fence, and
  // the spacing is compared with the run before anything is rounded (D50).
  { ...FT3, key: "run", q: "r", label: "Fence length", default: 100, metricDefault: 30.48, min: 0, max: 5e3 },
  { ...FT3, key: "spacing", q: "sp", label: "Post spacing", default: 8, metricDefault: 2.4384, min: 0, max: 40 },
  { key: "corners", q: "co", label: "Corners", kind: "count", default: 2, min: 0, max: 40, step: 1 },
  { key: "closed", q: "cl", label: "The fence closes on itself", kind: "toggle", default: false },
  { key: "gates", q: "ga", label: "Gates", kind: "count", default: 1, min: 0, max: 20, step: 1 },
  { ...FT3, key: "gateWidth", q: "gw", label: "Gate opening width", default: 4, metricDefault: 1.2192, min: 0, max: 40 },
  {
    key: "style",
    q: "st",
    label: "Fence style",
    kind: "select",
    default: "stick",
    options: FENCE_STYLES.map((v) => ({ value: v }))
  },
  {
    key: "rails",
    q: "ra",
    label: "Rails per section",
    kind: "select",
    default: "3",
    options: FENCE_RAIL_CHOICES.map((v) => ({ value: String(v) }))
  },
  {
    ...IN3,
    key: "picketWidth",
    q: "pw",
    label: "Picket width",
    default: FENCE_PICKET_WIDTH_IN,
    metricDefault: FENCE_PICKET_WIDTH_MM / 10,
    min: 0,
    max: 24
  },
  { ...IN3, key: "picketGap", q: "pg", label: "Gap between pickets", default: FENCE_PICKET_GAP_IN, metricDefault: 0, min: 0, max: 24 },
  // ---- advanced: the hole ------------------------------------------------
  {
    ...IN3,
    key: "postSide",
    q: "ps",
    label: "Post side",
    default: FENCE_POST_SIDE_IN,
    metricDefault: 8.89,
    min: 0,
    max: 24,
    advanced: true,
    group: G_HOLE
  },
  {
    ...IN3,
    key: "holeDia",
    q: "hd",
    label: "Hole diameter",
    default: FENCE_HOLE_DIA_IN,
    metricDefault: 25.4,
    min: 0,
    max: 60,
    advanced: true,
    group: G_HOLE
  },
  {
    ...IN3,
    key: "holeDepth",
    q: "hh",
    label: "Hole depth",
    default: FENCE_HOLE_DEPTH_IN,
    metricDefault: 60.96,
    min: 0,
    max: 120,
    advanced: true,
    group: G_HOLE
  },
  {
    key: "bag",
    q: "bg",
    label: "Concrete bag",
    kind: "select",
    default: FENCE_DEFAULT_BAG,
    options: FENCE_BAG_IDS.map((v) => ({ value: v })),
    advanced: true,
    group: G_HOLE
  },
  // ---- advanced: your prices ---------------------------------------------
  // Flat per-piece prices: one post, one picket. They are NOT converted by the
  // unit switch, and they are not multiplied by another product's count (D64).
  {
    key: "pricePost",
    q: "pp",
    label: "Price per post",
    kind: "money",
    default: "",
    optional: true,
    min: 0,
    max: 2e3,
    suffix: "$ / post",
    advanced: true,
    group: G_PRICE
  },
  {
    key: "pricePicket",
    q: "pk",
    label: "Price per picket",
    kind: "money",
    default: "",
    optional: true,
    min: 0,
    max: 2e3,
    suffix: "$ / picket",
    advanced: true,
    group: G_PRICE
  }
];
var STYLES = new Set(FENCE_STYLES);
var RAILS = new Set(FENCE_RAIL_CHOICES.map((v) => String(v)));
var BAGS = new Set(FENCE_BAG_IDS);
function parseFenceInputs(raw, system = "imperial") {
  const { values, errors } = coerce(fenceInputs, raw, system);
  const pick = (key, set, fallback) => {
    const v = str(values, key, fallback);
    return set.has(v) ? v : fallback;
  };
  return {
    inputs: {
      system,
      runLength: num(values, "run", 0),
      spacing: num(values, "spacing", 0),
      corners: num(values, "corners", 0),
      closed: bool(values, "closed"),
      gates: num(values, "gates", 0),
      gateWidth: num(values, "gateWidth", 0),
      style: pick("style", STYLES, "stick"),
      railsPerSection: Number(pick("rails", RAILS, "3")),
      picketWidth: num(values, "picketWidth", 0),
      picketGap: num(values, "picketGap", 0),
      postSide: num(values, "postSide", 0),
      holeDiameter: num(values, "holeDia", 0),
      holeDepth: num(values, "holeDepth", 0),
      bag: pick("bag", BAGS, FENCE_DEFAULT_BAG),
      pricePerPost: optNum(values, "pricePost"),
      pricePerPicket: optNum(values, "pricePicket")
    },
    errors
  };
}
function fenceLine(runFt, spacingFt, corners, gates, gateWidthFt, closed) {
  if (!(runFt > 0) || !(spacingFt > 0)) return null;
  const netFt = runFt - gates * gateWidthFt;
  if (netFt <= EPS2) {
    return {
      netFt: Math.max(0, netFt),
      runs: 0,
      sectionsPerRun: 0,
      sections: 0,
      actualSpacingFt: 0,
      posts: 0,
      linePosts: 0,
      terminalPosts: 0,
      cornerPosts: corners,
      gatePosts: gates * 2,
      overGated: true
    };
  }
  const runs = Math.max(1, closed ? corners : corners + 1);
  const perRunFt = netFt / runs;
  const sectionsPerRun = ceilEps2(perRunFt / spacingFt);
  const sections = sectionsPerRun * runs;
  const posts = sections + (closed ? 0 : 1) + gates;
  const terminalPosts = closed ? 0 : 2;
  return {
    netFt,
    runs,
    sectionsPerRun,
    sections,
    actualSpacingFt: perRunFt / sectionsPerRun,
    posts,
    // A gate leaf hangs on two posts; one of them is the line or terminal post
    // already counted where the fence stops, so only the second was added.
    gatePosts: gates * 2,
    terminalPosts,
    cornerPosts: corners,
    linePosts: Math.max(0, posts - terminalPosts - corners - gates),
    overGated: false
  };
}
function fencePickets(netFt, picketWidthIn, picketGapIn) {
  const pitchIn = picketWidthIn + picketGapIn;
  if (!(pitchIn > 0) || !(netFt > 0)) return null;
  const count = ceilEps2(netFt * IN_PER_FT2 / pitchIn);
  return { pitchIn, count, remainderIn: count * pitchIn - netFt * IN_PER_FT2 };
}
function fenceConcretePerHoleCuFt(holeDiaIn, holeDepthIn, postSideIn) {
  if (!(holeDiaIn > 0) || !(holeDepthIn > 0)) return 0;
  const hole = Math.PI * (holeDiaIn / 2) ** 2 * holeDepthIn;
  const post = postSideIn ** 2 * holeDepthIn;
  return Math.max(0, hole - post) / CUIN_PER_CUFT;
}
function computeFence(input) {
  const warnings = [];
  const metric = input.system === "metric";
  const lenFt = (v) => metric ? `${formatNumber(convert(v, "ft", "m"), 2)} m` : `${formatNumber(v, 2)} ft`;
  const negative = input.runLength < 0 || input.spacing < 0 || input.gateWidth < 0 || input.picketWidth < 0 || input.picketGap < 0;
  if (negative) warnings.push({ level: "error", code: "negative-dimension", message: "Negative dimensions ignored." });
  const runFt = feet(Math.max(0, fin5(input.runLength)));
  const spacingFt = feet(Math.max(0, fin5(input.spacing)));
  const gateWidthFt = feet(Math.max(0, fin5(input.gateWidth)));
  const corners = Math.max(0, Math.round(fin5(input.corners)));
  const gates = Math.max(0, Math.round(fin5(input.gates)));
  const closed = input.closed === true;
  const panel = input.style === "panel";
  const railsPerSection = panel ? 0 : Math.max(0, Math.round(fin5(input.railsPerSection, 3)));
  const picketWidthIn = inches2(Math.max(0, fin5(input.picketWidth)));
  const picketGapIn = inches2(Math.max(0, fin5(input.picketGap)));
  const postSideIn = inches2(Math.max(0, fin5(input.postSide)));
  const holeDiaIn = inches2(Math.max(0, fin5(input.holeDiameter)));
  const holeDepthIn = inches2(Math.max(0, fin5(input.holeDepth)));
  const yieldCuFt = FENCE_BAG_YIELD_CUFT[input.bag] ?? FENCE_BAG_YIELD_CUFT[FENCE_DEFAULT_BAG];
  const line = fenceLine(runFt, spacingFt, corners, gates, gateWidthFt, closed);
  const L = line ?? {
    netFt: 0,
    runs: 0,
    sectionsPerRun: 0,
    sections: 0,
    actualSpacingFt: 0,
    posts: 0,
    linePosts: 0,
    terminalPosts: 0,
    cornerPosts: 0,
    gatePosts: 0,
    overGated: false
  };
  const p = !panel && L.netFt > 0 ? fencePickets(L.netFt, picketWidthIn, picketGapIn) : null;
  const pickets = p ? p.count : 0;
  const picketPitchIn = p ? p.pitchIn : picketWidthIn + picketGapIn;
  const picketRemainderIn = p ? p.remainderIn : 0;
  const panels = panel ? L.sections : 0;
  const rails = panel ? 0 : L.sections * railsPerSection;
  const railLinealFt = rails * L.actualSpacingFt;
  const perHoleCuFt = fenceConcretePerHoleCuFt(holeDiaIn, holeDepthIn, postSideIn);
  const totalCuFt = perHoleCuFt * L.posts;
  const bags = totalCuFt > 0 && yieldCuFt > 0 ? ceilEps2(totalCuFt / yieldCuFt) : 0;
  const postPrice = input.pricePerPost !== null && input.pricePerPost > 0 ? input.pricePerPost : null;
  const picketPrice = input.pricePerPicket !== null && input.pricePerPicket > 0 ? input.pricePerPicket : null;
  const postCost = postPrice !== null && L.posts > 0 ? round(L.posts * postPrice, 2) : null;
  const picketCost = picketPrice !== null && pickets > 0 ? round(pickets * picketPrice, 2) : null;
  const cost = postCost === null && picketCost === null ? null : round((postCost ?? 0) + (picketCost ?? 0), 2);
  if (line === null) {
    warnings.push({ level: "info", code: "no-dimensions", message: "Enter a fence length and a post spacing." });
  }
  if (L.overGated) {
    warnings.push({
      level: "error",
      code: "gates-over-run",
      message: `The gate openings use the whole ${lenFt(runFt)} run, so nothing is ordered. Shorten a gate or lengthen the fence.`,
      field: "gateWidth"
    });
  }
  if (gates > 0 && gateWidthFt <= 0) {
    warnings.push({
      level: "caution",
      code: "gate-no-width",
      message: "A gate is counted with no opening width typed, so no opening is taken out of the length.",
      field: "gateWidth"
    });
  }
  if (!L.overGated && L.sections > 0 && L.actualSpacingFt > 0 && L.actualSpacingFt < 1) {
    warnings.push({
      level: "caution",
      code: "sections-short",
      message: `Each section lands at ${lenFt(L.actualSpacingFt)}: check the corner count and the spacing.`,
      field: "spacing"
    });
  }
  if (!panel && L.netFt > 0 && picketPitchIn <= 0) {
    warnings.push({
      level: "caution",
      code: "no-picket-pitch",
      message: "No picket width is typed, so no picket is counted.",
      field: "picketWidth"
    });
  }
  if (holeDiaIn > 0 && postSideIn > 0 && holeDiaIn <= postSideIn) {
    warnings.push({
      level: "caution",
      code: "hole-under-post",
      message: "The hole is not wider than the post, so no concrete fits around it.",
      field: "holeDia"
    });
  }
  const runQ = (linFt, label2) => metric ? { value: round(convert(linFt, "ft", "m"), 2), unit: "m", label: label2, precision: 2 } : { value: round(linFt, 2), unit: "ft", label: label2, precision: 2 };
  const countQ = (value, label2) => ({
    value,
    unit: "ea",
    label: label2,
    precision: 0
  });
  const primary = L.posts > 0 ? { value: L.posts, unit: "ea", label: "Posts", precision: 0, display: `${L.posts} posts` } : { value: 0, unit: "ea", label: "Posts", display: DASH2 };
  const secondary = [
    // runtime/view.ts prints this exact label under the headline (recipe §3).
    L.posts > 0 ? {
      value: L.posts,
      unit: "ea",
      label: "Order quantity",
      precision: 0,
      display: `${L.posts} posts, ${bags} bags`
    } : { value: 0, unit: "ea", label: "Order quantity", display: DASH2 },
    runQ(L.netFt, "Net fence length"),
    countQ(L.runs, "Runs"),
    countQ(L.sections, "Sections"),
    metric ? { value: round(convert(L.actualSpacingFt, "ft", "m"), 3), unit: "m", label: "Actual spacing", precision: 3 } : { value: round(L.actualSpacingFt, 3), unit: "ft", label: "Actual spacing", precision: 3 },
    countQ(L.linePosts, "Line posts"),
    countQ(L.terminalPosts, "Terminal posts"),
    countQ(L.cornerPosts, "Corner posts"),
    countQ(L.gatePosts, "Gate posts")
  ];
  if (panel) {
    secondary.push(countQ(panels, "Panels"));
  } else {
    secondary.push(countQ(rails, "Rails"));
    secondary.push(runQ(railLinealFt, "Rail lineal length"));
    secondary.push(countQ(pickets, "Pickets"));
    secondary.push(
      metric ? {
        value: round(convert(picketRemainderIn, "in", "mm"), 0),
        unit: "mm",
        label: "Last picket ripped by",
        precision: 0
      } : { value: round(picketRemainderIn, 2), unit: "in", label: "Last picket ripped by", precision: 2 }
    );
  }
  secondary.push(
    metric ? { value: round(convert(perHoleCuFt, "cuft", "cum"), 4), unit: "cum", label: "Concrete per hole", precision: 4 } : { value: round(perHoleCuFt, 4), unit: "cuft", label: "Concrete per hole", precision: 4 }
  );
  secondary.push(
    metric ? { value: round(convert(totalCuFt, "cuft", "cum"), 3), unit: "cum", label: "Concrete total", precision: 3 } : { value: round(totalCuFt, 2), unit: "cuft", label: "Concrete total", precision: 2 }
  );
  secondary.push({ value: bags, unit: "bag", label: `Bags, ${input.bag} lb`, precision: 0 });
  if (postCost !== null) secondary.push({ value: postCost, unit: "usd", label: "Posts at your price", precision: 2 });
  if (picketCost !== null) secondary.push({ value: picketCost, unit: "usd", label: "Pickets at your price", precision: 2 });
  const qty = (linFt) => metric ? round(convert(linFt, "ft", "m"), 2) : round(linFt, 2);
  const runUnit = metric ? "m" : "ft";
  const takeoff = [];
  if (L.posts > 0) {
    takeoff.push({
      key: "posts",
      item: "Posts",
      qty: L.posts,
      unit: "ea",
      order: L.posts,
      orderUnit: "ea",
      note: `${L.linePosts} line + ${L.terminalPosts} terminal + ${L.cornerPosts} corner + ${gates} added for the gate${gates === 1 ? "" : "s"}. A gate hangs on ${L.gatePosts}, one of which is already counted.`
    });
    if (panel) {
      takeoff.push({
        key: "panels",
        item: "Pre-built panels",
        qty: panels,
        unit: "ea",
        order: panels,
        orderUnit: "ea",
        note: `One per section, ${lenFt(L.actualSpacingFt)} between posts. Rails and pickets come with the panel and are not ordered.`
      });
    } else {
      if (rails > 0) {
        takeoff.push({
          key: "rails",
          item: `Rails, ${railsPerSection} per section`,
          qty: rails,
          unit: "ea",
          order: qty(railLinealFt),
          orderUnit: runUnit,
          note: `${L.sections} sections x ${railsPerSection}, each ${lenFt(L.actualSpacingFt)} between posts.`
        });
      }
      if (pickets > 0) {
        takeoff.push({
          key: "pickets",
          item: "Pickets",
          qty: pickets,
          unit: "ea",
          order: pickets,
          orderUnit: "ea",
          note: `${lenFt(L.netFt)} of fence at a ${formatNumber(picketPitchIn, 3)} in pitch; the last board is ripped by ${formatNumber(
            picketRemainderIn,
            2
          )} in.`
        });
      }
    }
  }
  if (bags > 0) {
    takeoff.push({
      key: "concrete",
      item: `Concrete, ${input.bag} lb bags`,
      qty: metric ? round(convert(totalCuFt, "cuft", "cum"), 3) : round(totalCuFt, 2),
      unit: metric ? "cum" : "cuft",
      order: bags,
      orderUnit: "bag",
      note: `${L.posts} holes at ${formatNumber(perHoleCuFt, 4)} cu ft, ${formatNumber(yieldCuFt, 3)} cu ft a bag. The hole less the post it holds.`
    });
  }
  if (cost !== null) {
    takeoff.push({
      key: "cost",
      item: "Posts and pickets at your price",
      qty: L.posts + pickets,
      unit: "ea",
      order: cost,
      orderUnit: "usd",
      note: "Your flat price per piece. Rails, panels, concrete, hardware and the gate are not priced."
    });
  }
  const assumptions = [
    gates > 0 ? `A gate is a hole in the fence: ${gates} x ${lenFt(gateWidthFt)} comes off the ${lenFt(
      runFt
    )} line before anything is divided, so no picket and no rail crosses an opening.` : "No gate is counted, so the whole line carries fence.",
    closed ? `The line closes on itself, so ${corners} corners make ${L.runs} run${L.runs === 1 ? "" : "s"}, each divided on its own.` : `An open line with ${corners} corner${corners === 1 ? "" : "s"} has ${L.runs} run${L.runs === 1 ? "" : "s"}, each divided on its own: a corner ends a section whether the spacing likes it or not.`,
    `Your ${lenFt(spacingFt)} spacing is a maximum: each run is divided into whole sections, and the fence lands at ${lenFt(
      L.actualSpacingFt
    )} on centre.`,
    "A gate leaf hangs on two posts, but one of them is the line or terminal post already counted where the fence stops.",
    panel ? "Pre-built panels are ordered one per section; rails and pickets came with the panel and are not ordered." : `Pickets are counted at a ${formatNumber(picketPitchIn, 3)} in pitch across the net length, rounded up; the last board is ripped rather than pretended to fit.`,
    `Concrete per hole is the cylinder less the post: ${formatNumber(holeDiaIn, 2)} in across x ${formatNumber(
      holeDepthIn,
      2
    )} in deep, minus a ${formatNumber(postSideIn, 2)} in post, at ${formatNumber(yieldCuFt, 3)} cu ft a bag.`,
    "The hole depth is the one you dig to. How deep a post must be set, the frost line, any required spacing, height limit or setback are your local code and are not printed here."
  ];
  return {
    primary,
    secondary,
    takeoff,
    warnings,
    assumptions,
    raw: {
      runLength: convert(runFt, "ft", "m"),
      netLength: convert(L.netFt, "ft", "m"),
      actualSpacing: convert(L.actualSpacingFt, "ft", "m"),
      gateWidth: convert(gateWidthFt, "ft", "m"),
      picketPitch: convert(picketPitchIn, "in", "m"),
      concretePerHole: convert(perHoleCuFt, "cuft", "cum"),
      concreteTotal: convert(totalCuFt, "cuft", "cum")
    },
    netFt: L.netFt,
    runs: L.runs,
    sectionsPerRun: L.sectionsPerRun,
    sections: L.sections,
    actualSpacingFt: L.actualSpacingFt,
    posts: L.posts,
    linePosts: L.linePosts,
    terminalPosts: L.terminalPosts,
    cornerPosts: L.cornerPosts,
    gatePosts: L.gatePosts,
    panels,
    rails,
    railLinealFt,
    pickets,
    picketPitchIn,
    picketRemainderIn,
    concretePerHoleCuFt: perHoleCuFt,
    concreteTotalCuFt: totalCuFt,
    bags,
    overGated: L.overGated,
    cost
  };
}
var fenceSpec = {
  id: FENCE_ID,
  version: FENCE_VERSION,
  revised: FENCE_REVISED,
  inputs: fenceInputs,
  compute: computeFence
};

// src/data/reference/duct.ts
var RHO_LBM = 0.075;
var LBM_PER_SLUG = 32.174;
var MU0 = 362e-9;
var T0_R = 459.67 + 59;
var T70_R = 459.67 + 70;
var SUTHERLAND_R = 198.72;
var MU70 = MU0 * (T70_R / T0_R) ** 1.5 * ((T0_R + SUTHERLAND_R) / (T70_R + SUTHERLAND_R));
var VP_K = 4005;
var EPS_GALV_FT = 3e-4;
var HUEBSCHER_K = 1.3;
var HUEBSCHER_P = 0.625;
var HUEBSCHER_Q = 0.25;
var LPS_PER_CFM = 0.3048 ** 3 * 1e3 / 60;
var MPS_PER_FPM = 0.3048 / 60;
var PA_PER_INWG = 0.0254 * 1e3 * 9.80665;
var PAM_PER_INWG100 = PA_PER_INWG / 30.48;

// src/engine/formulas/hvac/duct.ts
var DUCT_ID = "hvac-duct";
var DUCT_VERSION = "1.0.0";
var DUCT_REVISED = "2026-09-26";
var MAX_BRANCHES = 6;
var EXAMPLE_BRANCHES = [200, 300, 250, 150];
var D_LO = 0.1;
var D_HI = 2e3;
var Q_HI = 1e7;
var RHO_SLUG = RHO_LBM / LBM_PER_SLUG;
function velocityPressure(vFpm) {
  return (vFpm / VP_K) ** 2;
}
function frictionFactor(re, rel) {
  if (!(re > 0)) return 0;
  if (re < 2300) return 64 / re;
  let f = (-1.8 * Math.log10(6.9 / re + (rel / 3.7) ** 1.11)) ** -2;
  for (let k = 0; k < 50; k += 1) {
    const f2 = (-2 * Math.log10(rel / 3.7 + 2.51 / (re * Math.sqrt(f)))) ** -2;
    if (Math.abs(f2 - f) < 1e-12) return f2;
    f = f2;
  }
  return f;
}
function roundFlow(cfm, dIn, eps = EPS_GALV_FT) {
  const dFt = dIn / 12;
  if (!(dFt > 0) || !(cfm > 0)) return { loss: 0, v: 0, vp: 0, re: 0, f: 0 };
  const v = cfm / (Math.PI * dFt ** 2 / 4);
  const re = RHO_SLUG * (v / 60) * dFt / MU70;
  const f = frictionFactor(re, eps / dFt);
  const vp = velocityPressure(v);
  return { loss: f * (100 / dFt) * vp, v, vp, re, f };
}
function deq(a, b) {
  if (!(a > 0) || !(b > 0)) return 0;
  return HUEBSCHER_K * (a * b) ** HUEBSCHER_P / (a + b) ** HUEBSCHER_Q;
}
function solve(fn, target, lo, hi) {
  let a = lo;
  let b = hi;
  for (let k = 0; k < 100; k += 1) {
    const mid = (a + b) / 2;
    if (fn(mid) < target) a = mid;
    else b = mid;
  }
  return (a + b) / 2;
}
function roundForFriction(cfm, rate, eps = EPS_GALV_FT) {
  return solve((d) => -roundFlow(cfm, d, eps).loss, -rate, D_LO, D_HI);
}
function roundForVelocity(cfm, vmax) {
  return Math.sqrt(4 * (cfm / vmax) / Math.PI) * 12;
}
function stockUp(x, step) {
  return Math.ceil(x / step - 1e-9) * step;
}
function sizeSection(cfm, i, heightIn) {
  const exact = i.method === "friction" ? roundForFriction(cfm, i.rate, i.eps) : roundForVelocity(cfm, i.vmax);
  const stock = stockUp(exact, i.step);
  let rect = null;
  if (heightIn !== null && heightIn > 0) {
    const wExact = i.method === "friction" ? solve((w2) => deq(heightIn, w2), exact, 0.01, 50 * D_HI) : cfm / i.vmax * 144 / heightIn;
    const w = stockUp(wExact, i.step);
    const de = deq(heightIn, w);
    rect = {
      h: heightIn,
      wExact,
      w,
      deq: de,
      v: cfm / (heightIn * w / 144),
      loss: roundFlow(cfm, de, i.eps).loss,
      aspect: Math.max(w, heightIn) / Math.min(w, heightIn)
    };
  }
  return { cfm, exact, stock, rect, ...roundFlow(cfm, stock, i.eps) };
}
function capacityOf(aIn, bIn, i) {
  const rect = bIn !== null && bIn > 0;
  const de = rect ? deq(aIn, bIn) : aIn;
  const area = rect ? aIn * bIn / 144 : Math.PI * (aIn / 12) ** 2 / 4;
  const cfm = i.method === "friction" ? solve((q) => roundFlow(q, de, i.eps).loss, i.rate, 0, Q_HI) : i.vmax * area;
  const fl = roundFlow(cfm, de, i.eps);
  return { a: aIn, b: rect ? bIn : null, deq: de, area, cfm, v: area > 0 ? cfm / area : 0, loss: fl.loss, vp: velocityPressure(cfm / area) };
}
function flowField(key, q, label2, dflt, show, optional = false) {
  return { key, q, label: label2, kind: "count", default: dflt, min: 0, max: 2e5, optional, showWhen: show };
}
function inchField(key, q, label2, dflt, show, optional = true) {
  return {
    key,
    q,
    label: label2,
    kind: "length",
    units: ["in"],
    metricUnit: "mm",
    default: dflt,
    ...dflt === "" ? {} : { metricDefault: round(dflt * 25.4, 1) },
    min: 0,
    max: 3e3,
    optional,
    showWhen: show
  };
}
var branchFields = [];
for (let k = 1; k <= MAX_BRANCHES; k += 1) {
  branchFields.push(flowField(`b${k}`, `b${k}`, `Branch ${k} airflow`, EXAMPLE_BRANCHES[k - 1] ?? "", "mode=trunk", true));
}
var ductInputs = [
  { key: "mode", q: "md", label: "Mode", kind: "select", default: "size", options: [{ value: "size" }, { value: "capacity" }, { value: "trunk" }] },
  { key: "method", q: "mt", label: "Size by", kind: "select", default: "friction", options: [{ value: "friction" }, { value: "velocity" }] },
  { key: "rate", q: "fr", label: "Friction rate", kind: "count", default: 0.08, min: 5e-3, max: 10, showWhen: "method=friction" },
  { key: "vmax", q: "vm", label: "Maximum velocity", kind: "count", default: 900, min: 1, max: 2e4, showWhen: "method=velocity" },
  flowField("cfm", "q", "Airflow", 1e3, "mode=size"),
  inchField("height", "h", "Rectangular height", "", "mode=size"),
  {
    key: "run",
    q: "l",
    label: "Straight run",
    kind: "length",
    units: ["ft"],
    metricUnit: "m",
    default: "",
    optional: true,
    min: 0,
    max: 5e3,
    showWhen: "mode=size"
  },
  inchField("capA", "a", "Diameter or width", 12, "mode=capacity", false),
  inchField("capB", "b", "Height", "", "mode=capacity"),
  flowField("trunkCfm", "tq", "Trunk airflow", 1200, "mode=trunk"),
  ...branchFields,
  inchField("trunkHeight", "th", "Trunk height", "", "mode=trunk"),
  { key: "step", q: "st", label: "Round up by", kind: "select", default: "1", options: [{ value: "1" }, { value: "2" }] },
  { key: "eps", q: "e", label: "Roughness", kind: "count", default: EPS_GALV_FT, min: 0, max: 0.05, advanced: true }
];
var MODES5 = /* @__PURE__ */ new Set(["size", "capacity", "trunk"]);
function parseDuctInputs(raw, system = "imperial") {
  const { values, errors } = coerce(ductInputs, raw, system);
  const branch = (k) => Object.prototype.hasOwnProperty.call(raw, `b${k}`) ? optNum(values, `b${k}`) : EXAMPLE_BRANCHES[k - 1] ?? null;
  const modeRaw = str(values, "mode", "size");
  const branches = [];
  for (let k = 1; k <= MAX_BRANCHES; k += 1) branches.push(branch(k));
  return {
    inputs: {
      system,
      mode: MODES5.has(modeRaw) ? modeRaw : "size",
      method: str(values, "method", "friction") === "velocity" ? "velocity" : "friction",
      rate: num(values, "rate", 0.08),
      vmax: num(values, "vmax", 900),
      step: str(values, "step", "1") === "2" ? 2 : 1,
      eps: num(values, "eps", EPS_GALV_FT),
      cfm: num(values, "cfm", 0),
      height: optNum(values, "height"),
      run: optNum(values, "run"),
      capA: num(values, "capA", 0),
      capB: optNum(values, "capB"),
      trunkCfm: num(values, "trunkCfm", 0),
      branches,
      trunkHeight: optNum(values, "trunkHeight")
    },
    errors
  };
}
function finite9(x, fallback = 0) {
  return typeof x === "number" && Number.isFinite(x) ? x : fallback;
}
function optFinite2(x) {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}
var DASH3 = "—";
function computeDuct(input) {
  const i = {
    ...input,
    rate: Math.max(1e-6, finite9(input.rate, 0.08)),
    vmax: Math.max(1e-6, finite9(input.vmax, 900)),
    step: input.step === 2 ? 2 : 1,
    eps: Math.max(0, finite9(input.eps, EPS_GALV_FT)),
    cfm: finite9(input.cfm),
    height: optFinite2(input.height),
    run: optFinite2(input.run),
    capA: finite9(input.capA),
    capB: optFinite2(input.capB),
    trunkCfm: finite9(input.trunkCfm),
    branches: input.branches.map(optFinite2),
    trunkHeight: optFinite2(input.trunkHeight)
  };
  const metric = i.system === "metric";
  const warnings = [];
  const toIn = (m) => m === null || m <= 0 ? null : fromBase(m, "in");
  const diam = (inch) => metric ? `${formatNumber(inch * 25.4, 1)} mm` : `${formatNumber(inch, 2)} in`;
  const stockTxt = (inch) => metric ? `${formatNumber(inch * 25.4, 1)} mm (${inch} in)` : `${inch} in`;
  const box = (h, w) => metric ? `${formatNumber(h * 25.4, 1)} × ${formatNumber(w * 25.4, 1)} mm` : `${formatNumber(h, 2)} × ${formatNumber(w, 2)} in`;
  const vel = (fpm) => metric ? `${formatNumber(fpm * MPS_PER_FPM, 2)} m/s` : `${formatNumber(fpm, 0)} fpm`;
  const fric = (x) => metric ? `${formatNumber(x * PAM_PER_INWG100, 3)} Pa/m` : `${formatNumber(x, 4)} in. wg / 100 ft`;
  const pres = (x) => metric ? `${formatNumber(x * PA_PER_INWG, 2)} Pa` : `${formatNumber(x, 4)} in. wg`;
  const flowTxt = (q) => metric ? `${formatNumber(q * LPS_PER_CFM, 1)} L/s` : `${formatNumber(q, 0)} cfm`;
  const limit = i.method === "friction" ? fric(i.rate) : vel(i.vmax);
  const lenUnit = metric ? "mm" : "in";
  const lenQty = (inch) => metric ? round(inch * 25.4, 1) : round(inch, 2);
  const unitWord = metric ? ", mm" : ", in";
  const secondary = [];
  const takeoff = [];
  const rows = [];
  let capacity = null;
  let end = null;
  let runLoss = null;
  let primary;
  const sectionNote = (s) => {
    const how = i.method === "friction" ? `Exact ${diam(s.exact)} at ${limit} (Darcy, Colebrook from Haaland).` : `Exact ${diam(s.exact)}: ${flowTxt(s.cfm)} at ${limit}.`;
    return `${how} Rounded up by ${i.step} in to ${stockTxt(s.stock)}: ${vel(s.v)}, VP ${pres(s.vp)}, Re ${formatNumber(s.re, 0)}, f ${formatNumber(s.f, 4)}, ${fric(s.loss)}.`;
  };
  const rectNote = (r) => `Huebscher (inches): Deq = 1.30 (${formatNumber(r.h, 2)} × ${formatNumber(r.w, 2)})^0.625 / (${formatNumber(r.h, 2)} + ${formatNumber(r.w, 2)})^0.25 = ${formatNumber(r.deq, 2)} in, friction ${fric(r.loss)}. Velocity on the actual ${box(r.h, r.w)}: ${vel(r.v)}. Aspect ${formatNumber(r.aspect, 3)}.`;
  const offScale = (s) => {
    if (s.exact >= D_HI * 0.999)
      warnings.push({
        level: "caution",
        code: "off-scale",
        message: "The exact size runs past 2,000 in. Check the airflow and the rate units."
      });
  };
  if (i.mode === "capacity") {
    const aIn = toIn(i.capA);
    const bIn = toIn(i.capB);
    if (aIn === null) {
      warnings.push({ level: "error", code: "no-size", message: "Enter the duct's diameter or width.", field: "capA" });
      primary = { value: 0, unit: "ea", label: metric ? "Carries, L/s" : "Carries, cfm", display: DASH3 };
      secondary.push({ value: 0, unit: "ea", label: "Order quantity", display: DASH3 });
    } else {
      const c = capacityOf(aIn, bIn, i);
      capacity = c;
      const size = c.b === null ? `${diam(c.a)} round` : box(c.a, c.b);
      primary = metric ? { value: round(c.cfm * LPS_PER_CFM, 0), unit: "ea", label: "Carries, L/s", precision: 0, display: flowTxt(c.cfm) } : { value: round(c.cfm, 0), unit: "ea", label: "Carries, cfm", precision: 0, display: flowTxt(c.cfm) };
      secondary.push({ value: c.a, unit: "ea", label: "Order quantity", display: size });
      secondary.push({ value: round(c.v, 2), unit: "ea", label: "Velocity", display: vel(c.v) });
      secondary.push({ value: round(c.loss, 5), unit: "ea", label: "Friction per 100 ft", display: fric(c.loss) });
      secondary.push({ value: round(c.vp, 5), unit: "ea", label: "Velocity pressure", display: pres(c.vp) });
      if (c.b !== null) secondary.push({ value: round(c.deq, 2), unit: "ea", label: "Equivalent round", display: diam(c.deq) });
      secondary.push({ value: 0, unit: "ea", label: "Limit", display: limit });
      takeoff.push({
        key: "capacity",
        item: `${size} carries ${flowTxt(c.cfm)}`,
        qty: lenQty(c.a),
        unit: lenUnit,
        order: lenQty(c.a),
        orderUnit: lenUnit,
        note: (i.method === "friction" ? `Airflow at which ${c.b === null ? "the round" : `its equivalent round ${diam(c.deq)} (Huebscher)`} loses ${limit} (Darcy, Colebrook from Haaland).` : `${limit} × actual area ${metric ? `${formatNumber(c.area * 0.3048 ** 2, 4)} m²` : `${formatNumber(c.area, 4)} sq ft`}.`) + ` ${vel(c.v)} on the actual area, VP ${pres(c.vp)}, ${fric(c.loss)}.`
      });
    }
  } else {
    const total = i.mode === "size" ? i.cfm : i.trunkCfm;
    const hIn = toIn(i.mode === "size" ? i.height : i.trunkHeight);
    if (!(total > 0)) {
      warnings.push({
        level: "error",
        code: "no-airflow",
        message: "Enter an airflow. The sheet sizes the airflow you type.",
        field: i.mode === "size" ? "cfm" : "trunkCfm"
      });
    } else {
      rows.push({ branch: 0, branchCfm: 0, section: sizeSection(total, i, hIn) });
      if (i.mode === "trunk") {
        let left = total;
        for (let k = 1; k <= MAX_BRANCHES; k += 1) {
          const b = i.branches[k - 1];
          if (b === null || b === void 0 || b <= 0) continue;
          left -= b;
          if (left <= 0) {
            end = { branch: k, left };
            break;
          }
          rows.push({ branch: k, branchCfm: b, section: sizeSection(left, i, hIn) });
        }
      }
    }
    const first = rows[0]?.section;
    if (!first) {
      primary = { value: 0, unit: "ea", label: `${i.mode === "size" ? "Round duct" : "Trunk start"}${unitWord}`, display: DASH3 };
      secondary.push({ value: 0, unit: "ea", label: "Order quantity", display: DASH3 });
    } else {
      offScale(first);
      primary = {
        value: metric ? round(first.stock * 25.4, 1) : first.stock,
        unit: "ea",
        label: `${i.mode === "size" ? "Round duct" : "Trunk start"}${unitWord}`,
        precision: metric ? 1 : 0,
        display: stockTxt(first.stock)
      };
    }
    if (first && i.mode === "size") {
      const r = first.rect;
      secondary.push({
        value: first.stock,
        unit: "ea",
        label: "Order quantity",
        display: `${stockTxt(first.stock)} round${r ? `, or ${box(r.h, r.w)}` : ""}`
      });
      secondary.push({ value: round(first.exact, 4), unit: "ea", label: "Exact diameter", display: diam(first.exact) });
      secondary.push({ value: round(first.v, 2), unit: "ea", label: "Velocity at stock size", display: vel(first.v) });
      secondary.push({ value: round(first.loss, 5), unit: "ea", label: "Friction at stock size", display: fric(first.loss) });
      secondary.push({ value: round(first.vp, 5), unit: "ea", label: "Velocity pressure", display: pres(first.vp) });
      const runM = i.run !== null && i.run > 0 ? i.run : null;
      if (runM !== null) {
        runLoss = first.loss * fromBase(runM, "ft") / 100;
        secondary.push({ value: round(runLoss, 5), unit: "ea", label: "Run loss", display: pres(runLoss) });
      }
      if (r) {
        secondary.push({ value: r.w, unit: "ea", label: "Rectangular", display: box(r.h, r.w) });
        secondary.push({ value: round(r.deq, 4), unit: "ea", label: "Equivalent round", display: diam(r.deq) });
        secondary.push({ value: round(r.v, 2), unit: "ea", label: "Velocity, rectangle", display: vel(r.v) });
        secondary.push({ value: round(r.loss, 5), unit: "ea", label: "Friction, rectangle", display: fric(r.loss) });
        secondary.push({ value: round(r.aspect, 3), unit: "ea", label: "Aspect ratio", display: formatNumber(r.aspect, 3) });
      }
      takeoff.push({
        key: "round",
        item: `Round duct, ${flowTxt(first.cfm)}`,
        qty: lenQty(first.exact),
        unit: lenUnit,
        order: lenQty(first.stock),
        orderUnit: lenUnit,
        note: sectionNote(first)
      });
      if (r) {
        takeoff.push({
          key: "rect",
          item: `Rectangular, ${metric ? `${formatNumber(r.h * 25.4, 1)} mm` : `${formatNumber(r.h, 2)} in`} high`,
          qty: lenQty(r.wExact),
          unit: lenUnit,
          order: lenQty(r.w),
          orderUnit: lenUnit,
          note: rectNote(r)
        });
      }
      if (runM !== null && runLoss !== null) {
        const runQty = metric ? round(runM, 3) : round(fromBase(runM, "ft"), 2);
        takeoff.push({
          key: "run",
          item: `Straight run at ${stockTxt(first.stock)}`,
          qty: runQty,
          unit: metric ? "m" : "ft",
          order: runQty,
          orderUnit: metric ? "m" : "ft",
          note: metric ? `${fric(first.loss)} × ${formatNumber(runM, 2)} m = ${pres(runLoss)}. Straight duct only: fittings are not in it.` : `${fric(first.loss)} × ${formatNumber(fromBase(runM, "ft"), 2)} ft / 100 = ${pres(runLoss)}. Straight duct only: fittings are not in it.`
        });
      }
    }
    if (first && i.mode === "trunk") {
      secondary.push({
        value: first.stock,
        unit: "ea",
        label: "Order quantity",
        display: `${rows.map((row) => formatNumber(metric ? row.section.stock * 25.4 : row.section.stock, 1)).join(" · ")} ${lenUnit}`
      });
      for (const row of rows) {
        const s = row.section;
        const label2 = row.branch === 0 ? "Start" : `After branch ${row.branch}`;
        secondary.push({
          value: s.stock,
          unit: "ea",
          label: label2,
          display: `${flowTxt(s.cfm)} · ${stockTxt(s.stock)}${s.rect ? ` or ${box(s.rect.h, s.rect.w)}` : ""} · ${vel(s.v)}`
        });
        takeoff.push({
          key: `section-${row.branch}`,
          item: `${label2}, ${flowTxt(s.cfm)}${row.branch ? ` (branch ${flowTxt(row.branchCfm)} taken off)` : ""}`,
          qty: lenQty(s.exact),
          unit: lenUnit,
          order: lenQty(s.stock),
          orderUnit: lenUnit,
          note: sectionNote(s) + (s.rect ? ` ${rectNote(s.rect)}` : "")
        });
      }
      if (end) {
        const taken = total - end.left;
        takeoff.push({
          key: "trunk-end",
          item: `After branch ${end.branch}: ${flowTxt(Math.max(0, end.left))} left`,
          qty: 0,
          unit: lenUnit,
          order: 0,
          orderUnit: lenUnit,
          note: `Branches up to ${end.branch} take ${flowTxt(taken)} of the ${flowTxt(total)} trunk: the trunk ends here.`
        });
        warnings.push(
          end.left < 0 ? {
            level: "caution",
            code: "branches-exceed",
            message: `The branches take ${flowTxt(taken)}, more than the ${flowTxt(total)} trunk. Check the airflows.`
          } : { level: "info", code: "trunk-ends", message: `Branch ${end.branch} takes the last of the air: the trunk ends there.` }
        );
      }
    }
  }
  if (Math.abs(i.eps - EPS_GALV_FT) > 1e-12) {
    warnings.push({
      level: "info",
      code: "roughness-typed",
      message: `Roughness ${formatNumber(i.eps, 5)} ft is your figure. The default 0.0003 ft is galvanized steel.`,
      field: "eps"
    });
  }
  const assumptions = [
    "Standard air, 0.075 lb per cubic foot (McGill AirFlow), valid within 30 °F of 70 °F and below 1,500 ft of elevation.",
    "Velocity pressure VP = (V / 4005)², V in fpm, VP in in. wg (PNNL, standard air at 70 °F and 29.92 in Hg).",
    "Friction: loss per 100 ft = f × (100 / D in ft) × VP (Darcy), f by Colebrook iterated from a Haaland first guess (Purdue).",
    "Reynolds number with μ = 3.679 × 10⁻⁷ lb·s/ft² at 70 °F: NASA's 3.62 × 10⁻⁷ at 59 °F carried to 70 °F by Sutherland's law.",
    Math.abs(i.eps - EPS_GALV_FT) > 1e-12 ? `Roughness ${formatNumber(i.eps, 5)} ft, typed by you.` : "Roughness 0.0003 ft (0.09 mm), galvanized steel as ASHRAE gives it (Chen et al., 2012). Another material takes its own roughness.",
    i.method === "friction" ? `The friction rate, ${limit}, is your design input: no rate is recommended here.` : `The velocity limit, ${limit}, is your design input: no velocity is recommended here.`
  ];
  if (i.mode !== "capacity") {
    assumptions.push(`Sizes round up by ${i.step} in, then velocity and friction are computed again at the size you buy.`);
  }
  assumptions.push(
    "Rectangular duct: friction through Huebscher's equivalent round, velocity through the actual area (McGill).",
    "McGill's chart reads 0.50 in. wg per 100 ft for 10,000 cfm in a 24 in round duct; this sheet gives 0.459 (-8 %). The chart's roughness basis sits in an appendix not opened here: type a higher roughness to test it.",
    "Straight duct only: fittings, takeoffs, grilles and filters add losses this sheet does not compute."
  );
  return {
    primary,
    secondary,
    takeoff,
    warnings,
    assumptions,
    mode: i.mode,
    method: i.method,
    rows,
    capacity,
    end,
    runLoss
  };
}
var ductSpec = {
  id: DUCT_ID,
  version: DUCT_VERSION,
  revised: DUCT_REVISED,
  inputs: ductInputs,
  compute: computeDuct
};

// src/data/reference/paver-base.ts
var BASE_MIN_IN = {
  walk: [4, 6],
  driveway: [6, 8],
  street: [8, 12]
};
var BASE_DEPTH_IN_LOW = 4;
var BEDDING_IN2 = 1;
var BEDDING_MAX_IN = 1.5;
var CRUSHED_STONE_LB_CUYD = 2700;
var SAND_DRY_LB_CUYD = 2400;
var CUFT_PER_CUYD5 = 27;
var LB_PER_SHORT_TON5 = 2e3;
var DEFAULT_BAG_LB2 = 50;

// src/engine/formulas/masonry/paver-base.ts
var PAVER_BASE_ID = "masonry-paver-base";
var PAVER_BASE_VERSION = "1.0.0";
var PAVER_BASE_REVISED = "2026-09-20";
var USE_VALUES2 = ["walk", "driveway", "street"];
var USES2 = new Set(USE_VALUES2);
var SHAPE_VALUES6 = ["rectangle", "circle", "triangle"];
var SHAPES5 = new Set(SHAPE_VALUES6);
var CUM_PER_CUYD5 = convert(1, "cuyd", "cum");
var T_PER_SHORT_TON2 = convert(1, "ton", "t");
function finite10(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}
function planArea(shape, a, b) {
  const x = finite10(a);
  const y = finite10(b);
  if (x <= 0) return 0;
  if (shape === "circle") return Math.PI * x * x / 4;
  if (y <= 0) return 0;
  if (shape === "triangle") return x * y / 2;
  return x * y;
}
function layerOf(area, depth, lbPerCuYd, allowancePct) {
  const volume = area * Math.max(0, depth);
  const cuYd = convert(volume, "cum", "cuyd");
  const orderVolume = volume * (1 + allowancePct / 100);
  const orderCuYd = convert(orderVolume, "cum", "cuyd");
  const lb = orderCuYd * lbPerCuYd;
  return {
    volume,
    cuFt: convert(volume, "cum", "cuft"),
    cuYd,
    orderVolume,
    orderCuYd,
    lb,
    tons: lb / LB_PER_SHORT_TON5
  };
}
var G_ALLOW = { id: "allowances" };
var G_ORDER9 = { id: "order" };
var planField = {
  kind: "length",
  units: ["ft", "in"],
  metricUnit: "m",
  min: 0,
  max: 5e3
};
var depthField = {
  kind: "length",
  units: ["in", "ft"],
  metricUnit: "cm",
  min: 0,
  max: 120
};
var paverBaseInputs = [
  {
    key: "use",
    q: "u",
    label: "What the pavement carries",
    kind: "select",
    default: "walk",
    options: USE_VALUES2.map((value) => ({ value }))
  },
  {
    key: "shape",
    q: "s",
    label: "Shape",
    kind: "select",
    default: "rectangle",
    options: SHAPE_VALUES6.map((value) => ({ value }))
  },
  { ...planField, key: "length", q: "l", label: "Length", default: 12, metricDefault: 3.6, showWhen: "shape=rectangle" },
  { ...planField, key: "width", q: "w", label: "Width", default: 12, metricDefault: 3.6, showWhen: "shape=rectangle" },
  { ...planField, key: "diameter", q: "dia", label: "Diameter", default: 0, showWhen: "shape=circle" },
  { ...planField, key: "base", q: "b", label: "Base", default: 0, showWhen: "shape=triangle" },
  {
    ...planField,
    key: "height",
    q: "h",
    label: "Height (perpendicular to the base)",
    default: 0,
    showWhen: "shape=triangle"
  },
  { ...depthField, key: "baseDepth", q: "bd", label: "Aggregate base depth", default: `${BASE_DEPTH_IN_LOW}in`, metricDefault: "10cm" },
  { ...depthField, key: "beddingDepth", q: "bg", label: "Bedding sand depth", default: `${BEDDING_IN2}in`, metricDefault: "2.5cm" },
  {
    ...depthField,
    key: "paverThickness",
    q: "pt",
    label: "Paver thickness",
    default: "",
    metricDefault: "",
    optional: true,
    max: 24
  },
  // ---- advanced: the reader's own allowances, never assumed ------------
  { key: "baseAllowance", q: "al", label: "Base allowance", kind: "percent", default: 0, min: 0, max: 50, step: 1, advanced: true, group: G_ALLOW },
  { key: "beddingAllowance", q: "ab", label: "Bedding allowance", kind: "percent", default: 0, min: 0, max: 50, step: 1, advanced: true, group: G_ALLOW },
  // ---- advanced: ordering ---------------------------------------------
  { key: "bagLb", q: "bl", label: "Bag weight", kind: "count", default: DEFAULT_BAG_LB2, optional: true, min: 1, max: 200, advanced: true, group: G_ORDER9, suffix: "lb" },
  {
    key: "truck",
    q: "tk",
    label: "Truck capacity",
    kind: "count",
    default: "",
    optional: true,
    min: 1,
    max: 40,
    advanced: true,
    group: G_ORDER9,
    suffix: "cu yd",
    metricSuffix: "m³",
    metricFactor: CUM_PER_CUYD5
  },
  {
    key: "priceBaseTon",
    q: "pb",
    label: "Base price per ton",
    kind: "money",
    default: "",
    optional: true,
    min: 0,
    max: 5e3,
    advanced: true,
    group: G_ORDER9,
    suffix: "$ / ton",
    metricSuffix: "$ / t",
    metricFactor: T_PER_SHORT_TON2,
    metricPerUnit: true
  },
  {
    key: "priceBeddingTon",
    q: "ps",
    label: "Bedding price per ton",
    kind: "money",
    default: "",
    optional: true,
    min: 0,
    max: 5e3,
    advanced: true,
    group: G_ORDER9,
    suffix: "$ / ton",
    metricSuffix: "$ / t",
    metricPerUnit: true,
    metricFactor: T_PER_SHORT_TON2
  }
];
function parsePaverBaseInputs(raw, system = "imperial") {
  const { values, errors } = coerce(paverBaseInputs, raw, system);
  const shapeRaw = str(values, "shape", "rectangle");
  const shape = SHAPES5.has(shapeRaw) ? shapeRaw : "rectangle";
  const a = shape === "circle" ? num(values, "diameter") : shape === "triangle" ? num(values, "base") : num(values, "length");
  const b = shape === "circle" ? 0 : shape === "triangle" ? num(values, "height") : num(values, "width");
  const useRaw = str(values, "use", "walk");
  const bagSubmitted = Object.prototype.hasOwnProperty.call(raw, "bagLb");
  const bagLb = optNum(values, "bagLb") ?? (bagSubmitted ? null : DEFAULT_BAG_LB2);
  const truckTyped = optNum(values, "truck");
  const priceBase = optNum(values, "priceBaseTon");
  const priceBedding = optNum(values, "priceBeddingTon");
  const perTon = (typed) => typed === null || system !== "metric" ? typed : round(typed * T_PER_SHORT_TON2, 2);
  return {
    inputs: {
      system,
      use: USES2.has(useRaw) ? useRaw : "walk",
      shape,
      a,
      b,
      baseDepth: num(values, "baseDepth", 0),
      beddingDepth: num(values, "beddingDepth", 0),
      paverThickness: optNum(values, "paverThickness"),
      baseAllowancePct: num(values, "baseAllowance", 0),
      beddingAllowancePct: num(values, "beddingAllowance", 0),
      bagLb,
      truckCuYd: truckTyped === null || system !== "metric" ? truckTyped : truckTyped / CUM_PER_CUYD5,
      priceBaseTon: perTon(priceBase),
      priceBeddingTon: perTon(priceBedding)
    },
    errors
  };
}
function computePaverBase(input) {
  const warnings = [];
  const i = {
    ...input,
    a: finite10(input.a),
    b: finite10(input.b),
    baseDepth: finite10(input.baseDepth),
    beddingDepth: finite10(input.beddingDepth),
    paverThickness: input.paverThickness === null ? null : finite10(input.paverThickness),
    baseAllowancePct: finite10(input.baseAllowancePct, 0),
    beddingAllowancePct: finite10(input.beddingAllowancePct, 0),
    bagLb: input.bagLb === null ? null : finite10(input.bagLb),
    truckCuYd: input.truckCuYd === null ? null : finite10(input.truckCuYd),
    priceBaseTon: input.priceBaseTon === null ? null : finite10(input.priceBaseTon),
    priceBeddingTon: input.priceBeddingTon === null ? null : finite10(input.priceBeddingTon)
  };
  const metric = i.system === "metric";
  if (i.a < 0 || i.b < 0 || i.baseDepth < 0 || i.beddingDepth < 0) {
    warnings.push({
      level: "error",
      code: "negative-dimension",
      message: "Negative dimensions ignored. Enter positive lengths."
    });
  }
  const clamp2 = (pct) => Math.min(50, Math.max(0, pct));
  const basePct = clamp2(i.baseAllowancePct);
  const beddingPct = clamp2(i.beddingAllowancePct);
  if (basePct !== i.baseAllowancePct || beddingPct !== i.beddingAllowancePct) {
    warnings.push({ level: "caution", code: "allowance-clamped", message: "Allowances clamped to 0-50%." });
  }
  const area = planArea(i.shape, i.a, i.b);
  const areaSqFt = convert(area, "sqm", "sqft");
  const baseDepth = Math.max(0, i.baseDepth);
  const beddingDepth = Math.max(0, i.beddingDepth);
  const paver = i.paverThickness !== null && i.paverThickness > 0 ? i.paverThickness : null;
  const base = layerOf(area, baseDepth, CRUSHED_STONE_LB_CUYD, basePct);
  const bedding = layerOf(area, beddingDepth, SAND_DRY_LB_CUYD, beddingPct);
  const excavationDepth = paver === null ? null : baseDepth + beddingDepth + paver;
  const excavationVolume = excavationDepth === null ? null : area * excavationDepth;
  const excavationCuYd = excavationVolume === null ? null : convert(excavationVolume, "cum", "cuyd");
  const bagLb = i.bagLb === null || i.bagLb <= 0 ? null : i.bagLb;
  const bags = bagLb === null ? 0 : roundUpWhole(bedding.lb / bagLb);
  const loads = i.truckCuYd !== null && i.truckCuYd > 0 ? roundUpWhole((base.orderCuYd + bedding.orderCuYd) / i.truckCuYd) : 0;
  const priced = area > 0;
  const baseCost = priced && i.priceBaseTon !== null && i.priceBaseTon >= 0 ? round(base.tons * i.priceBaseTon, 2) : null;
  const beddingCost = priced && i.priceBeddingTon !== null && i.priceBeddingTon >= 0 ? round(bedding.tons * i.priceBeddingTon, 2) : null;
  const cost = baseCost === null && beddingCost === null ? null : round((baseCost ?? 0) + (beddingCost ?? 0), 2);
  const [lo, hi] = BASE_MIN_IN[i.use];
  const baseIn = round(fromBase(baseDepth, "in"), 6);
  const beddingIn = round(fromBase(beddingDepth, "in"), 6);
  if (area > 0 && baseIn < lo) {
    warnings.push({
      level: "caution",
      code: "base-under-minimum",
      message: `${formatNumber(baseIn, 2)} in of base under a ${i.use}. CMHA Tech Spec 10 gives ${lo} to ${hi} in as the minimum for that class; it is a minimum, so more is never corrected.`,
      field: "baseDepth"
    });
  }
  if (area > 0 && beddingIn > BEDDING_MAX_IN) {
    warnings.push({
      level: "caution",
      code: "bedding-over-source",
      message: `${formatNumber(beddingIn, 2)} in of bedding sand. The cited guides screed ${BEDDING_IN2} to ${BEDDING_MAX_IN} in, uncompacted.`,
      field: "beddingDepth"
    });
  }
  if (area <= 0) {
    warnings.push({ level: "info", code: "no-dimensions", message: "Enter the area of the pavement to get a quantity." });
  } else if (paver === null) {
    warnings.push({
      level: "info",
      code: "no-paver-thickness",
      message: "Enter the thickness of your pavers to get the excavation depth: base + bedding + paver.",
      field: "paverThickness"
    });
  }
  if (area > 0 && bagLb === null) {
    warnings.push({
      level: "info",
      code: "no-bag-weight",
      message: "Enter the net weight printed on the bag to count bags of bedding sand.",
      field: "bagLb"
    });
  }
  if (loads > 1) {
    warnings.push({
      level: "info",
      code: "multi-load",
      message: `${loads} loads of base and bedding together, at the capacity you entered.`
    });
  }
  const orderShown = metric ? round(base.orderVolume, 3) : round(base.orderCuYd, 3);
  const orderUnit = metric ? "cum" : "cuyd";
  const primary = {
    value: orderShown,
    unit: orderUnit,
    label: "Base aggregate",
    precision: 3
  };
  const secondary = [];
  secondary.push({ value: orderShown, unit: orderUnit, label: "Order quantity", precision: 3 });
  secondary.push(
    metric ? { value: round(convert(base.lb, "lb", "t"), 2), unit: "t", label: "Base, tonnes", precision: 2 } : { value: round(base.tons, 2), unit: "ton", label: "Base, short tons", precision: 2 }
  );
  secondary.push({
    value: metric ? round(bedding.orderVolume, 3) : round(bedding.orderCuYd, 3),
    unit: orderUnit,
    label: "Bedding sand",
    precision: 3
  });
  secondary.push(
    metric ? { value: round(convert(bedding.lb, "lb", "t"), 2), unit: "t", label: "Bedding, tonnes", precision: 2 } : { value: round(bedding.tons, 2), unit: "ton", label: "Bedding, short tons", precision: 2 }
  );
  secondary.push(
    bagLb === null ? { value: 0, unit: "bag", label: "Bedding bags", display: "—" } : { value: bags, unit: "bag", label: `Bedding bags, ${formatNumber(bagLb, 0)} lb`, precision: 0 }
  );
  secondary.push(
    metric ? { value: round(area, 2), unit: "sqm", label: "Area", precision: 2 } : { value: round(areaSqFt, 0), unit: "sqft", label: "Area", precision: 0 }
  );
  if (excavationDepth !== null && excavationCuYd !== null && excavationVolume !== null) {
    secondary.push({
      value: metric ? round(fromBase(excavationDepth, "cm"), 1) : round(fromBase(excavationDepth, "in"), 3),
      unit: metric ? "cm" : "in",
      label: "Excavation depth",
      precision: metric ? 1 : 3
    });
    secondary.push({
      value: metric ? round(excavationVolume, 3) : round(excavationCuYd, 3),
      unit: orderUnit,
      label: "Excavated volume",
      precision: 3
    });
  }
  if (loads > 0) secondary.push({ value: loads, unit: "load", label: "Truck loads", precision: 0 });
  if (baseCost !== null) secondary.push({ value: baseCost, unit: "usd", label: "Base cost", precision: 2 });
  if (beddingCost !== null) secondary.push({ value: beddingCost, unit: "usd", label: "Bedding cost", precision: 2 });
  const takeoff = [];
  const depthLabel = (metres) => metric ? `${formatNumber(fromBase(metres, "cm"), 1)} cm` : `${formatNumber(fromBase(metres, "in"), 2)} in`;
  const areaLabel = metric ? `${formatNumber(area, 2)} m²` : `${formatNumber(areaSqFt, 0)} sq ft`;
  if (area > 0) {
    if (baseDepth > 0) {
      takeoff.push({
        key: "base",
        item: `Crushed stone base, ${depthLabel(baseDepth)} in place`,
        // Every quantity is converted from the base figure (m3, m2, metres),
        // never from a rounded printed one.
        qty: round(metric ? base.volume : base.cuYd, 3),
        unit: orderUnit,
        order: round(metric ? base.orderVolume : base.orderCuYd, 3),
        orderUnit,
        note: metric ? `${areaLabel} x ${depthLabel(baseDepth)} = ${formatNumber(base.volume, 3)} m³.${basePct > 0 ? ` Your ${basePct}% allowance is in the order column.` : " No compaction factor is applied."}` : `${areaLabel} x ${formatNumber(fromBase(baseDepth, "in"), 2)} in / 12 = ${formatNumber(base.cuFt, 2)} cu ft, divided by ${CUFT_PER_CUYD5}.${basePct > 0 ? ` Your ${basePct}% allowance is in the order column.` : " No compaction factor is applied."}`
      });
      takeoff.push({
        key: "base-weight",
        item: "Base weight, loose as delivered",
        qty: metric ? round(convert(base.lb, "lb", "kg"), 0) : round(base.lb, 0),
        unit: metric ? "kg" : "lb",
        order: round(metric ? convert(base.lb, "lb", "t") : base.tons, 2),
        orderUnit: metric ? "t" : "ton",
        note: metric ? `${formatNumber(base.orderVolume, 3)} m³ x ${formatNumber(convert(CRUSHED_STONE_LB_CUYD, "lb", "kg") / CUM_PER_CUYD5, 0)} kg/m³, Caterpillar's loose crushed stone row.` : `${formatNumber(base.orderCuYd, 3)} cu yd x ${formatNumber(CRUSHED_STONE_LB_CUYD, 0)} lb/cu yd, Caterpillar's loose crushed stone row. 1 short ton = ${LB_PER_SHORT_TON5} lb.`
      });
    }
    if (beddingDepth > 0) {
      takeoff.push({
        key: "bedding",
        item: `Bedding sand, ${depthLabel(beddingDepth)} screeded`,
        qty: round(metric ? bedding.volume : bedding.cuYd, 3),
        unit: orderUnit,
        order: round(metric ? bedding.orderVolume : bedding.orderCuYd, 3),
        orderUnit,
        note: metric ? `${areaLabel} x ${depthLabel(beddingDepth)} = ${formatNumber(bedding.volume, 3)} m³, uncompacted.` : `${areaLabel} x ${formatNumber(fromBase(beddingDepth, "in"), 2)} in / 12 = ${formatNumber(bedding.cuFt, 2)} cu ft, divided by ${CUFT_PER_CUYD5}, uncompacted.`
      });
      if (bagLb !== null) {
        takeoff.push({
          key: "bags",
          item: `Bedding sand in bags, ${formatNumber(bagLb, 0)} lb net`,
          qty: round(bedding.lb / bagLb, 2),
          unit: "bag",
          order: bags,
          orderUnit: "bag",
          note: `${formatNumber(bedding.orderCuYd, 3)} cu yd x ${formatNumber(SAND_DRY_LB_CUYD, 0)} lb/cu yd / ${formatNumber(bagLb, 0)} lb, rounded up. Dry row: water is weight, not volume.`
        });
      }
    }
    if (excavationDepth !== null && excavationVolume !== null && excavationCuYd !== null) {
      takeoff.push({
        key: "excavation",
        item: `Excavation, ${depthLabel(excavationDepth)} deep`,
        qty: round(metric ? excavationVolume : excavationCuYd, 3),
        unit: orderUnit,
        order: round(metric ? excavationVolume : excavationCuYd, 3),
        orderUnit,
        note: `${depthLabel(baseDepth)} base + ${depthLabel(beddingDepth)} bedding + ${depthLabel(paver ?? 0)} paver. Spoil swells once dug.`
      });
    }
    if (loads > 0 && i.truckCuYd !== null) {
      takeoff.push({
        key: "loads",
        item: "Truck loads, base and bedding",
        qty: round(metric ? base.orderVolume + bedding.orderVolume : base.orderCuYd + bedding.orderCuYd, 3),
        unit: orderUnit,
        order: loads,
        orderUnit: "load",
        note: metric ? `${formatNumber(i.truckCuYd * CUM_PER_CUYD5, 2)} m³ per load, the capacity you entered.` : `${formatNumber(i.truckCuYd, 2)} cu yd per load, the capacity you entered.`
      });
    }
    if (baseCost !== null) {
      takeoff.push({
        key: "base-cost",
        item: "Base stone at your quoted price",
        // The quantity priced follows the system, or the sheet bills tonnes and counts short tons.
        qty: round(metric ? base.tons * T_PER_SHORT_TON2 : base.tons, 2),
        unit: metric ? "t" : "ton",
        order: baseCost,
        orderUnit: "usd",
        note: metric ? `${formatNumber(base.tons * T_PER_SHORT_TON2, 2)} t x $${formatNumber((i.priceBaseTon ?? 0) / T_PER_SHORT_TON2, 2, false)}. Material only.` : `${formatNumber(base.tons, 2)} tons x $${formatNumber(i.priceBaseTon ?? 0, 2, false)}. Material only.`
      });
    }
    if (beddingCost !== null) {
      takeoff.push({
        key: "bedding-cost",
        item: "Bedding sand at your quoted price",
        qty: round(metric ? bedding.tons * T_PER_SHORT_TON2 : bedding.tons, 2),
        unit: metric ? "t" : "ton",
        order: beddingCost,
        orderUnit: "usd",
        note: metric ? `${formatNumber(bedding.tons * T_PER_SHORT_TON2, 2)} t x $${formatNumber((i.priceBeddingTon ?? 0) / T_PER_SHORT_TON2, 2, false)}. Material only.` : `${formatNumber(bedding.tons, 2)} tons x $${formatNumber(i.priceBeddingTon ?? 0, 2, false)}. Material only.`
      });
    }
  }
  const assumptions = [
    "Volume = area x depth. Weight = cubic yards x a published loose density. The depth you type is the layer in place.",
    `Base minimum for a ${i.use}: ${lo} to ${hi} in, CMHA Tech Spec 10 (2022). It is a minimum, so this sheet warns below it and never changes a depth you typed.`,
    `Bedding sand screeded ${BEDDING_IN2} to ${BEDDING_MAX_IN} in uncompacted - Oregon State University Extension and CMHA. The bedding slice has its own sheet; it is counted here so the excavation adds up.`,
    `Weights: crushed stone ${formatNumber(CRUSHED_STONE_LB_CUYD, 0)} lb and dry sand ${formatNumber(SAND_DRY_LB_CUYD, 0)} lb per cubic yard, Caterpillar's LOOSE rows - the state a truck dumps in.`,
    basePct > 0 || beddingPct > 0 ? `Allowance ${basePct}% on the base and ${beddingPct}% on the bedding - your figures, not a published one.` : "No compaction factor, no waste and no allowance are added: the sheet orders exactly the space measured.",
    "No paver count, no geotextile, no edge restraint and no joint sand: each needs its own source and its own sheet."
  ];
  if (excavationDepth !== null) {
    assumptions.push(
      `Excavation depth = base + bedding + paver thickness = ${depthLabel(excavationDepth)}, the cross-section the OSU guide adds up.`
    );
  }
  return {
    primary,
    secondary,
    takeoff,
    warnings,
    assumptions,
    raw: { area, baseVolume: base.volume, beddingVolume: bedding.volume, excavationVolume },
    areaSqFt,
    base,
    bedding,
    excavationDepth,
    excavationCuYd,
    bags,
    loads,
    baseCost,
    beddingCost,
    cost
  };
}
var paverBaseSpec = {
  id: PAVER_BASE_ID,
  version: PAVER_BASE_VERSION,
  revised: PAVER_BASE_REVISED,
  inputs: paverBaseInputs,
  compute: computePaverBase
};

// takeoffmetric-mcp-entry.ts
var CALCULATORS = [
  { name: "calc_concrete_slab", spec: slabSpec, parse: parseSlabInputs },
  { name: "calc_concrete_cost", spec: concreteCostSpec, parse: parseConcreteCostInputs },
  { name: "calc_rebar", spec: rebarSpec, parse: parseRebarInputs },
  { name: "calc_gravel", spec: gravelSpec, parse: parseGravelInputs },
  { name: "calc_fill_dirt", spec: fillDirtSpec, parse: parseFillDirtInputs },
  { name: "calc_sand", spec: sandSpec, parse: parseSandInputs },
  { name: "calc_topsoil", spec: topsoilSpec, parse: parseTopsoilInputs },
  { name: "calc_cubic_yard", spec: cubicYardSpec, parse: parseCubicYardInputs },
  { name: "calc_asphalt", spec: asphaltSpec, parse: parseAsphaltInputs },
  { name: "calc_board_foot", spec: boardFootSpec, parse: parseBoardFootInputs },
  { name: "calc_roofing", spec: roofingSpec, parse: parseRoofingInputs },
  { name: "calc_roof_pitch", spec: roofPitchSpec, parse: parseRoofPitchInputs },
  { name: "calc_fence", spec: fenceSpec, parse: parseFenceInputs },
  { name: "calc_duct", spec: ductSpec, parse: parseDuctInputs },
  { name: "calc_paver_base", spec: paverBaseSpec, parse: parsePaverBaseInputs }
];
export {
  CALCULATORS
};
