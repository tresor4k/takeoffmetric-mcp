import { readFileSync } from "node:fs";
import { CALCULATORS } from "../vendor/engine.mjs";
import { CONSTANT_CATEGORIES, MAX_ROWS, searchConstants } from "./constants.js";
import { WITHHELD, scrubNames } from "./withheld.js";

// Title, live URL and summary of each calculator, extracted from the site registry by scripts/sync-engine.mjs.
const REGISTRY = JSON.parse(readFileSync(new URL("../vendor/registry.json", import.meta.url), "utf8"));

const DISCLAIMER = "Estimate only; confirm with your plans, supplier and local code.";

// The site summary of the board foot page ends on its drawing; this server returns numbers only.
const summaryOf = (name) =>
  REGISTRY[name].summary.replace(
    ", an optional nominal-versus-dressed volume, and the piece redrawn from what you typed.",
    " and an optional nominal-versus-dressed volume.",
  );
const SYSTEMS = ["imperial", "metric"];

// Every tool computes locally from its arguments: no network, no model, no state, no side effect.
const ANNOTATIONS = Object.freeze({
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
});

function unitText(spec) {
  const byUnits = spec.units?.length
    ? spec.metricUnit
      ? `${spec.units[0]} (imperial) or ${spec.metricUnit} (metric)`
      : spec.units[0]
    : "";
  if (spec.kind === "length" && byUnits) return byUnits;
  if (spec.suffix) return spec.metricSuffix ? `${spec.suffix} (imperial) or ${spec.metricSuffix} (metric)` : spec.suffix;
  if (byUnits) return byUnits;
  return spec.kind === "percent" ? "%" : "";
}

function describe(spec) {
  const parts = [/[.?!]$/.test(spec.label) ? spec.label : `${spec.label}.`];
  const unit = unitText(spec);
  if (unit) parts.push(`Unit: ${unit}.`);
  if (spec.kind === "length") parts.push('A number in that unit, or a string that carries its own unit such as "20 ft 6 in".');
  if (spec.metricDefault !== undefined) parts.push(`Default in metric: ${spec.metricDefault}.`);
  if (spec.optional) parts.push("Optional.");
  if (spec.showWhen) parts.push(`Shown on the site only when "${spec.showWhen}" is set.`);
  const labelled = (spec.options ?? []).filter((o) => o.label && o.label !== o.value);
  if (labelled.length) parts.push(`Options: ${labelled.map((o) => `${o.value} = ${o.label}`).join("; ")}.`);
  if (spec.hint) parts.push(spec.hint);
  return parts.join(" ");
}

/** One JSON Schema property per engine InputSpec. */
function propertySchema(spec) {
  const prop = {};
  if (spec.kind === "select") {
    prop.type = "string";
    if (spec.options) prop.enum = spec.options.filter((o) => !o.disabled).map((o) => o.value);
  } else if (spec.kind === "toggle") {
    prop.type = "boolean";
  } else {
    prop.type = spec.kind === "length" ? ["number", "string"] : "number";
    if (spec.min !== undefined) prop.minimum = spec.min;
    if (spec.max !== undefined) prop.maximum = spec.max;
  }
  if (spec.default !== undefined && spec.default !== "") prop.default = spec.default;
  prop.description = describe(spec);
  return prop;
}

function inputSchema(calc) {
  const properties = {
    system: {
      type: "string",
      enum: SYSTEMS,
      default: "imperial",
      description: "Unit system the inputs are typed in and the defaults are taken from.",
    },
  };
  const w = WITHHELD[calc.name] ?? {};
  for (const spec of calc.spec.inputs) {
    if (spec.key === "system") throw new Error(`${calc.name}: an engine input is named "system"`);
    if (w.drop?.includes(spec.key) || w.force?.[spec.key] !== undefined) continue;
    properties[spec.key] = propertySchema(spec);
  }
  // Refonte A: a value the dataset withholds is typed by the user, never defaulted (src/withheld.js).
  for (const [key, { engine, ...param }] of Object.entries(w.params ?? {})) {
    properties[key] = Object.fromEntries(Object.entries(param).filter(([, v]) => v !== undefined));
  }
  return { type: "object", properties, additionalProperties: false };
}

const fail = (calc, system, errors) => ({
  isError: true,
  payload: { calculator: calc.name, url: REGISTRY[calc.name].url, system, errors },
});

function runCalculator(calc, args) {
  const { system = "imperial", ...raw } = args;
  if (!SYSTEMS.includes(system)) {
    return fail(calc, system, [{ field: "system", message: 'system: must be "imperial" or "metric".' }]);
  }
  // A misspelled key would silently fall back to the engine default, so it is refused.
  const w = WITHHELD[calc.name] ?? {};
  const known = new Set(Object.keys(inputSchema(calc).properties));
  const unknown = Object.keys(raw).filter((key) => !known.has(key));
  if (unknown.length) {
    return fail(calc, system, unknown.map((key) => ({ field: key, message: `${key}: unknown input for ${calc.name}.` })));
  }
  const user = {};
  for (const [key, param] of Object.entries(w.params ?? {})) {
    if (raw[key] === undefined || raw[key] === null || raw[key] === "") continue;
    const v = Number(raw[key]);
    if (!Number.isFinite(v) || v < (param.minimum ?? 0) || (param.minimum === undefined && v <= 0) || v > (param.maximum ?? Infinity)) {
      return fail(calc, system, [{ field: key, message: `${key}: must be a positive number read from your own product, plan or supplier.` }]);
    }
    user[key] = v;
    if (!param.engine) delete raw[key];
  }
  const { inputs, errors } = calc.parse({ ...raw, ...(w.force ?? {}) }, system);
  if (errors.length) {
    return fail(calc, system, errors.map(({ field, message }) => ({ field, message })));
  }
  w.prepare?.(inputs, user, system);
  const result = calc.spec.compute(inputs);
  const answer = {
    primary: result.primary,
    secondary: [...result.secondary],
    takeoff: result.takeoff.map((t) => ({ ...t })),
    warnings: [...result.warnings],
    assumptions: [...result.assumptions],
  };
  w.shape?.(answer, user, { system, inputs });
  scrubNames(answer);
  // the engine default of a withheld value never leaves the server, not even as an input echo
  const inputsUsed = { ...inputs };
  for (const key of [...(w.drop ?? []), ...Object.keys(w.force ?? {}), ...Object.keys(w.params ?? {})]) {
    if (user[key] === undefined) delete inputsUsed[key];
  }
  if (w.drop?.includes("stock") && user.stockLength === undefined) delete inputsUsed.stockFt;
  const needed = Object.entries(w.params ?? {})
    .filter(([key]) => user[key] === undefined)
    .map(([key, param]) => ({ key, description: param.description }));
  return {
    isError: false,
    payload: {
      calculator: calc.name,
      url: REGISTRY[calc.name].url,
      system,
      engine_version: calc.spec.version,
      revised: calc.spec.revised,
      inputs_used: inputsUsed,
      ...answer,
      ...(needed.length ? { needed } : {}),
    },
  };
}

const calculatorTools = CALCULATORS.map((calc) => {
  const info = REGISTRY[calc.name];
  if (!info) throw new Error(`${calc.name}: missing from vendor/registry.json`);
  return {
    name: calc.name,
    title: info.title,
    annotations: ANNOTATIONS,
    description: `${summaryOf(calc.name)} ${DISCLAIMER}`,
    inputSchema: inputSchema(calc),
    handler: (args) => runCalculator(calc, args),
  };
});

const listCalculators = {
  name: "list_calculators",
  title: "List Calculators",
  annotations: ANNOTATIONS,
  description: "Lists the calculators of this server: tool name, title, page URL, one-line description and input keys.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  handler: () => ({
    isError: false,
    payload: {
      calculators: CALCULATORS.map((calc) => ({
        name: calc.name,
        title: REGISTRY[calc.name].title,
        url: REGISTRY[calc.name].url,
        description: summaryOf(calc.name),
        engine_version: calc.spec.version,
        revised: calc.spec.revised,
        inputs: Object.keys(inputSchema(calc).properties).filter((key) => key !== "system"),
      })),
    },
  }),
};

const searchConstantsTool = {
  name: "search_constants",
  title: "Search Estimating Constants",
  annotations: ANNOTATIONS,
  description: `Searches the table of construction estimating constants (densities, yields, coverage, unit weights), each row with its value, unit, SI value, condition and published source. Rows whose publisher does not allow republication return value null with values_withheld true: read the value at source_url. Returns at most ${MAX_ROWS} rows per call. ${DISCLAIMER}`,
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Case-insensitive substring matched against category, material_or_item and quantity.",
      },
      category: { type: "string", enum: CONSTANT_CATEGORIES, description: "Keep only the rows of one category." },
    },
    additionalProperties: false,
  },
  handler: (args) => ({ isError: false, payload: searchConstants(args) }),
};

export const tools = [...calculatorTools, listCalculators, searchConstantsTool];
