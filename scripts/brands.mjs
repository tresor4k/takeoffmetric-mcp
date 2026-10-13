// The roofing manufacturer whose product figures are the site engine's roofing defaults (owner decision D172,
// 11/10/2026, same list as TakeoffMetrics-plugin/scripts/brands.mjs plus the HDZ line name): none of these names
// may reach the package. scripts/sync-engine.mjs rewrites them while bundling (the site source is untouched) and
// fails if one is left in vendor/; test/withheld.test.mjs checks every definition, every answer and every file.
export const BRAND_TERMS = ["gaf", "timberline", "feltbuster", "seal-a-ridge", "pro-start", "hdz"];
/** any occurrence, case-insensitive (the guard) */
export const BRAND = new RegExp(BRAND_TERMS.join("|"), "i");
/** the names as words of a sentence or a URL, never inside an identifier such as FELTBUSTER_SQUARES_PER_ROLL;
 *  "hdz" is also an object key and a string id of the engine, so it only takes the identifier pass (MFR everywhere) */
export const BRAND_WORDS = new RegExp(`(?<![\\w-])(${BRAND_TERMS.filter((t) => t !== "hdz").join("|")})('s)?(?![\\w])`, "gi");
/** words of a sentence first, then what is left inside identifiers, the same in every file */
export const debrand = (text) =>
  text.replace(BRAND_WORDS, "the manufacturer").replace(new RegExp(BRAND.source, "gi"), "MFR");
