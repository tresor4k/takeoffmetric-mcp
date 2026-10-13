// Refonte A (0.2.0, decisions D151, D152, D172). Some engine defaults are values whose publishers do not allow
// republication (dataset rows with values_withheld = true). This server never offers, uses for an answer or quotes
// them: each one becomes an input the user types from their own product, plan or supplier, with no default.
// Without it the tool returns what it can compute (geometry, volumes) and lists the missing inputs in `needed`.

const CUFT_PER_L = 1 / 28.316846592;
const LBCUYD_PER_KGM3 = 0.764554857984 / 0.45359237;
const LB_PER_KG = 1 / 0.45359237;
const FT_PER_M = 1 / 0.3048;

// Publishers whose values the dataset withholds. The roofing product names (D172) never reach this file: the
// bundle rewrites them (scripts/brands.mjs) and calc_roofing drops every sentence about a product coverage.
export const WITHHELD_NAMES =
  /quikrete|caterpillar|nucor|asphalt institute|minnesota asphalt|north bay|\busu\b|utah state|missouri|\btrex\b|\bAPA\b/i;

const num = (description) => ({ type: "number", exclusiveMinimum: 0, description });
const lbl = (rx) => (q) => rx.test(q.label ?? "");

/** Drops what depends on a missing value; `primary` falls back to the first kept secondary of that label. */
function strip(p, { secondary, takeoff = [], warnings, assumptions, primary }) {
  if (secondary) p.secondary = p.secondary.filter((q) => !lbl(secondary)(q));
  p.takeoff = p.takeoff.filter((t) => !takeoff.includes(t.key));
  if (warnings) p.warnings = p.warnings.filter((w) => !warnings.test(w.code) && !warnings.test(w.message));
  if (assumptions) p.assumptions = p.assumptions.filter((a) => !assumptions.test(a));
  if (primary) {
    const at = p.secondary.findIndex(lbl(primary));
    if (at >= 0) [p.primary] = p.secondary.splice(at, 1);
  }
}

const roundUp = (x) => Math.ceil(x - 1e-9);
const r2 = (x) => Math.round(x * 100) / 100;

// ----------------------------------------------------------------- concrete bags (slab, cost, fence)
const BAG_YIELD = num(
  "Yield of one bag of the mix you buy, read on its bag: cu ft (imperial) or litres (metric). No default: without it no bag count is given.",
);
const yieldCuFt = (user, system) => (system === "metric" ? user.bagYield * CUFT_PER_L : user.bagYield);
const BAG_SENTENCE = (y, system) =>
  `Bags = volume / the bag yield you entered (${y} ${system === "metric" ? "L" : "cu ft"} a bag), rounded up.`;

function concreteBags(p, user, { system }, label) {
  const take = p.takeoff.find((t) => t.key === "bags");
  const cuft = take?.unit === "cuft" ? take.qty : null;
  strip(p, {
    secondary: /bags/i,
    takeoff: ["bags", "bags-total"],
    warnings: /too-many-bags/,
    assumptions: /bag yield/i,
  });
  if (user.bagYield === undefined || cuft === null) return null;
  const bags = roundUp(cuft / yieldCuFt(user, system));
  p.secondary.push({ value: bags, unit: "bag", label, precision: 0 });
  p.assumptions.push(BAG_SENTENCE(user.bagYield, system));
  return bags;
}

// ----------------------------------------------------------------- loose material densities
const DENSITY = num(
  "Density of the material your supplier sells: lb per cubic yard (imperial, densityUnit lbyd) or kg per cubic metre (densityUnit kgm3). No default: without it no weight, tonnage or bag count is given.",
);
const WEIGHT_LABELS = /ton|weight|density used|bags|per ton/i;

// ----------------------------------------------------------------- roofing (D172), same rule as the plugin
const COVERAGES = [
  { key: "bundlesPerSquare", label: "bundles per square printed on the shingle wrapper", out: /^Order quantity$|^Shingles at your price/, line: "shingles" },
  { key: "rollSquares", label: "squares one underlayment roll covers, printed on the roll", out: /^Underlayment rolls$/, line: "underlayment" },
  { key: "ridgeLfPerBundle", label: "linear feet one ridge cap bundle covers, printed on the wrapper", out: /^Ridge cap bundles$/, line: "ridge-cap" },
  { key: "starterLfPerBundle", label: "linear feet one starter bundle covers, printed on the wrapper", out: /^Starter bundles$/, line: "starter" },
];
const PRODUCT_TEXT = /bundles? per|per bundle|per roll|-square roll|the manufacturer|\bMFR\b/i;
const ROOF_NOTES = {
  shingles: "Squares plus waste x the bundles per square you entered from your wrapper, rounded up.",
  underlayment: "Squares plus waste / the squares per roll you entered from your roll, rounded up. No lap allowance is added.",
  "ridge-cap": "Ridge and hip length / the linear feet per bundle you entered from your wrapper, rounded up.",
  starter: "Starter run / the linear feet per bundle you entered from your wrapper, rounded up.",
};

/**
 * Per tool: `params` = inputs the user types (engine: true when the engine already reads that key, and its engine
 * default is then never used for an answer); `drop` = engine inputs removed from the schema (their options are
 * withheld values); `force` = engine inputs set by the server; `prepare` passes a user value to the parsed inputs;
 * `shape` reshapes the answer. Every `needed` item is a param absent from the call.
 */
export const WITHHELD = {
  calc_concrete_slab: {
    drop: ["bagSize"],
    params: { bagYield: BAG_YIELD },
    shape: (p, user, ctx) => concreteBags(p, user, ctx, "Bags"),
  },
  calc_concrete_cost: {
    drop: ["bagSize"],
    params: { bagYield: BAG_YIELD },
    shape(p, user, ctx) {
      strip(p, { secondary: /^Bagged cost|^Cheaper route/, takeoff: [], assumptions: /cheaper route/i, primary: undefined });
      if (/^Bagged cost|^Cheaper route/.test(p.primary.label ?? "")) p.primary = p.secondary.find(lbl(/^Concrete volume/)) ?? p.primary;
      const bags = concreteBags(p, user, ctx, "Bags needed");
      const price = ctx.inputs.pricePerBag;
      if (bags !== null && price !== null && price !== undefined) {
        p.secondary.push({ value: r2(bags * price), unit: "usd", label: "Bagged cost", precision: 2 });
      }
    },
  },
  calc_fence: {
    drop: ["bag"],
    params: { bagYield: BAG_YIELD },
    shape(p, user, { system }) {
      const order = p.secondary.find(lbl(/^Order quantity$/));
      const concrete = p.takeoff.find((t) => t.key === "concrete");
      p.secondary = p.secondary.filter((q) => !/^Bags/.test(q.label ?? ""));
      p.assumptions = p.assumptions.map((a) => a.replace(/, at [^,]*? a bag\./, "."));
      let bags = null;
      if (concrete) {
        const cuft = concrete.unit === "cuft" ? concrete.qty : concrete.qty / 0.028316846592;
        bags = user.bagYield === undefined ? null : roundUp(cuft / yieldCuFt(user, system));
        concrete.item = "Concrete";
        concrete.note = "The hole less the post it holds, summed over the holes.";
        if (bags === null) {
          delete concrete.order;
          delete concrete.orderUnit;
        } else {
          concrete.order = bags;
          concrete.orderUnit = "bag";
        }
      }
      if (order) order.display = bags === null ? `${order.value} posts` : `${order.value} posts, ${bags} bags`;
      if (bags !== null) {
        p.secondary.push({ value: bags, unit: "bag", label: "Bags", precision: 0 });
        p.assumptions.push(BAG_SENTENCE(user.bagYield, system));
      }
    },
  },
  calc_paver_base: {
    params: {
      baseDensity: num("Density of the base aggregate your supplier sells: lb per cubic yard (imperial) or kg per cubic metre (metric). No default: without it no base tonnage is given."),
      beddingDensity: num("Density of the bedding sand your supplier sells: lb per cubic yard (imperial) or kg per cubic metre (metric). No default: without it no bedding tonnage or bag count is given."),
    },
    shape(p, user, { system, inputs }) {
      const vol = (rx) => p.secondary.find(lbl(rx)) ?? (lbl(rx)(p.primary) ? p.primary : null);
      const base = p.secondary.find(lbl(/^Order quantity$/)) ?? p.primary;
      const bedding = vol(/^Bedding sand$/);
      strip(p, {
        secondary: /ton|bags/i,
        takeoff: ["base-weight", "bedding-weight", "bags"],
        assumptions: /^Weights:/,
      });
      p.assumptions = p.assumptions.map((a) => a.replace(" Weight = cubic yards x a published loose density.", ""));
      const weigh = (q, d, label) => {
        if (!q || d === undefined) return null;
        const lbPerCuYd = system === "metric" ? d * LBCUYD_PER_KGM3 : d;
        const cuyd = q.unit === "cum" ? q.value / 0.764554857984 : q.value;
        const lb = cuyd * lbPerCuYd;
        p.secondary.push(
          system === "metric"
            ? { value: r2(lb / LB_PER_KG / 1000), unit: "t", label: `${label}, tonnes`, precision: 2 }
            : { value: r2(lb / 2000), unit: "ton", label: `${label}, short tons`, precision: 2 },
        );
        return lb;
      };
      weigh(base, user.baseDensity, "Base");
      const beddingLb = weigh(bedding, user.beddingDensity, "Bedding");
      const bagLb = inputs.bagLb;
      if (beddingLb !== null && bagLb > 0) {
        p.secondary.push({ value: roundUp(beddingLb / bagLb), unit: "bag", label: `Bedding bags, ${bagLb} lb`, precision: 0 });
      }
      if (user.baseDensity !== undefined || user.beddingDensity !== undefined) {
        p.assumptions.push("Weight = volume x the density you entered from your supplier.");
      }
    },
  },
  calc_gravel: {
    params: { density: { ...DENSITY, engine: true } },
    shape(p, user) {
      if (user.density !== undefined) return;
      strip(p, { secondary: WEIGHT_LABELS, takeoff: ["tons", "tonnes"], assumptions: /^Density/ });
      for (const t of p.takeoff) if (t.key === "trucks") t.note = t.note?.replace(/, about [^.]* tons at this density/, "");
    },
  },
  calc_sand: {
    params: { density: { ...DENSITY, engine: true } },
    shape(p, user) {
      p.assumptions = p.assumptions.map((a) => a.replace("a published density", "the density you entered"));
      if (user.density !== undefined) return;
      strip(p, { secondary: /ton|bags|density used|^Order quantity$/i, takeoff: ["weight", "bags"], assumptions: /^Density|^Volume = /, warnings: /density/ });
      p.assumptions.unshift("Volume = area x depth. Weight and bags need the density you enter from your supplier.");
    },
  },
  calc_asphalt: {
    drop: ["preset"],
    force: { preset: "plant" },
    params: {
      plantWeight: {
        ...num("Compacted unit weight of the mix, lb per cubic foot, from your plant's mix design or ticket. No default: without it (or a layerWeight per course) no tonnage is given."),
        engine: true,
      },
    },
    shape(p, user) {
      p.assumptions = p.assumptions.map((a) => a.replace(", as the Asphalt Institute writes it", ""));
      if (user.plantWeight !== undefined) return;
      for (const w of p.warnings) {
        if (w.code === "unit-weight-required") w.message = "Enter plantWeight, the compacted unit weight of your mix in lb per cubic foot from your plant: tonnage stays blank without it.";
      }
      if (p.primary.display === "—") {
        p.secondary = p.secondary.filter((q) => q.display !== "—");
        p.takeoff = p.takeoff.filter((t) => t.qty !== 0);
        const at = p.secondary.findIndex(lbl(/^Compacted volume$/));
        if (at >= 0) [p.primary] = p.secondary.splice(at, 1);
      }
    },
  },
  calc_rebar: {
    drop: ["stock"],
    params: { stockLength: num("Length of the stock bars your supplier sells: ft (imperial) or m (metric). No default: without it no bar count to order is given.") },
    prepare(inputs, user, system) {
      if (user.stockLength !== undefined) inputs.stockFt = system === "metric" ? user.stockLength * FT_PER_M : user.stockLength;
    },
    shape(p, user) {
      if (user.stockLength !== undefined) return;
      strip(p, {
        secondary: /^Rebar to order$|^Order quantity$|price/i,
        takeoff: ["bars", "cost"],
        assumptions: /stock|bars\.|packed/i,
        warnings: /stock/i,
        primary: /^Rebar length with laps$/,
      });
      if (/^Rebar to order$/.test(p.primary.label ?? "")) p.primary = p.secondary.find(lbl(/^Rebar length with laps$/));
    },
  },
  calc_roofing: {
    params: Object.fromEntries(
      COVERAGES.map((c) => [c.key, { ...num(`The ${c.label}. No default: ask the user; without it this count is not given.`), engine: true }]),
    ),
    shape(p, user) {
      const missing = COVERAGES.filter((c) => user[c.key] === undefined);
      for (const c of missing) {
        p.secondary = p.secondary.filter((q) => !c.out.test(q.label ?? ""));
        p.takeoff = p.takeoff.filter((t) => t.key !== c.line && !(c.key === "bundlesPerSquare" && t.key === "cost"));
      }
      if (user.bundlesPerSquare === undefined) {
        const at = p.secondary.findIndex(lbl(/^Roofing squares$/));
        if (at >= 0) [p.primary] = p.secondary.splice(at, 1);
      }
      for (const t of p.takeoff) if (ROOF_NOTES[t.key]) t.note = ROOF_NOTES[t.key];
      p.warnings = p.warnings.filter((w) => w.code !== "underlayment-laps" && !PRODUCT_TEXT.test(w.message));
      p.assumptions = p.assumptions
        .map((s) => (s.startsWith("1 square = 100 sq ft") ? "1 square = 100 sq ft." : s))
        .filter((s) => !PRODUCT_TEXT.test(s));
      const counted = COVERAGES.filter((c) => user[c.key] !== undefined).map((c) => c.label.split(" printed")[0]);
      p.assumptions.push(
        counted.length
          ? `Counted from the coverage you entered from your own product: ${counted.join(", ")}. No coverage is assumed for any other product.`
          : "No product count: shingle bundles, underlayment rolls, ridge cap and starter bundles need the coverage printed on your own product. No coverage is assumed.",
      );
    },
  },
  calc_duct: {
    params: {
      eps: {
        ...num("Absolute roughness of the duct material, in ft, from the duct maker or your design reference. No default: without it no size is given."),
        exclusiveMinimum: undefined,
        minimum: 0,
        maximum: 0.05,
        engine: true,
      },
    },
    shape(p, user) {
      if (user.eps !== undefined) return;
      p.primary = null;
      p.secondary = [];
      p.takeoff = [];
      p.warnings = [];
      p.assumptions = ["Duct size, velocity and friction depend on the roughness of the duct material: type eps to get them."];
    },
  },
  calc_topsoil: {
    shape(p) {
      p.assumptions = p.assumptions
        .map((a) => a.replace(/\s*Caterpillar's.*$/, ""))
        .filter((a) => !/USU Extension/.test(a));
    },
  },
};

/** Every remaining sentence that names a publisher whose values are withheld is dropped (the guard). */
export function scrubNames(p) {
  p.warnings = p.warnings.filter((w) => !WITHHELD_NAMES.test(w.message));
  p.assumptions = p.assumptions.filter((a) => !WITHHELD_NAMES.test(a));
  for (const t of p.takeoff) {
    if (t.note && WITHHELD_NAMES.test(t.note)) delete t.note;
    if (t.item && WITHHELD_NAMES.test(t.item)) t.item = t.item.replace(WITHHELD_NAMES, "").trim();
  }
}
