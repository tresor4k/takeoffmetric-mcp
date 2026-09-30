import { readFileSync } from "node:fs";
import { CALCULATORS } from "../vendor/engine.mjs";
import { CONSTANT_CATEGORIES, MAX_ROWS, searchConstants } from "./constants.js";

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
  for (const spec of calc.spec.inputs) {
    if (spec.key === "system") throw new Error(`${calc.name}: an engine input is named "system"`);
    properties[spec.key] = propertySchema(spec);
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
  const known = new Set(calc.spec.inputs.map((s) => s.key));
  const unknown = Object.keys(raw).filter((key) => !known.has(key));
  if (unknown.length) {
    return fail(calc, system, unknown.map((key) => ({ field: key, message: `${key}: unknown input for ${calc.name}.` })));
  }
  const { inputs, errors } = calc.parse(raw, system);
  if (errors.length) {
    return fail(calc, system, errors.map(({ field, message }) => ({ field, message })));
  }
  const result = calc.spec.compute(inputs);
  return {
    isError: false,
    payload: {
      calculator: calc.name,
      url: REGISTRY[calc.name].url,
      system,
      engine_version: calc.spec.version,
      revised: calc.spec.revised,
      inputs_used: inputs,
      primary: result.primary,
      secondary: result.secondary,
      takeoff: result.takeoff,
      warnings: result.warnings,
      assumptions: result.assumptions,
    },
  };
}

const calculatorTools = CALCULATORS.map((calc) => {
  const info = REGISTRY[calc.name];
  if (!info) throw new Error(`${calc.name}: missing from vendor/registry.json`);
  return {
    name: calc.name,
    description: `${summaryOf(calc.name)} ${DISCLAIMER}`,
    inputSchema: inputSchema(calc),
    handler: (args) => runCalculator(calc, args),
  };
});

const listCalculators = {
  name: "list_calculators",
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
        inputs: calc.spec.inputs.map((s) => s.key),
      })),
    },
  }),
};

const searchConstantsTool = {
  name: "search_constants",
  description: `Searches the table of construction estimating constants (densities, yields, coverage, unit weights), each row with its value, unit, SI value, condition and published source. Returns at most ${MAX_ROWS} rows per call. ${DISCLAIMER}`,
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
