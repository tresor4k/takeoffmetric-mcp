// Protocol: the real binary over stdio, driven by the SDK client.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import Ajv from "ajv";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const bin = fileURLToPath(new URL("../bin/takeoffmetric-mcp.js", import.meta.url));
const client = new Client({ name: "takeoffmetric-mcp-test", version: "0.0.0" });
const body = (result) => JSON.parse(result.content[0].text);

before(async () => {
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [bin], stderr: "ignore" }));
});
after(async () => {
  await client.close();
});

test("initialize reports the package name and version", () => {
  assert.deepEqual(client.getServerVersion(), { name: "takeoffmetric-mcp", version: "0.1.1" });
});

test("tools/list returns 17 tools with valid JSON Schemas", async () => {
  const { tools } = await client.listTools();
  assert.equal(tools.length, 17);
  assert.equal(tools.filter((t) => t.name.startsWith("calc_")).length, 15);
  const ajv = new Ajv({ strict: true, allowUnionTypes: true });
  for (const tool of tools) {
    assert.equal(tool.inputSchema.type, "object", tool.name);
    assert.ok(ajv.validateSchema(tool.inputSchema), `${tool.name}: ${ajv.errorsText()}`);
    ajv.compile(tool.inputSchema);
    assert.ok(tool.description.length > 20, tool.name);
  }
});

test("initialize returns instructions and every tool a title and the four boolean annotations", async () => {
  const instructions = client.getInstructions();
  assert.equal(typeof instructions, "string");
  assert.ok(instructions.trim().length > 0);
  const expected = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
  const { tools } = await client.listTools();
  for (const tool of tools) {
    assert.equal(typeof tool.title, "string", tool.name);
    assert.ok(tool.title.length > 0 && tool.title.length <= 40, `${tool.name}: ${tool.title}`);
    assert.deepEqual(tool.annotations, expected, tool.name);
  }
});

test("tools/call succeeds once per tool", async () => {
  const { tools } = await client.listTools();
  for (const tool of tools) {
    const result = await client.callTool({ name: tool.name, arguments: {} });
    assert.notEqual(result.isError, true, `${tool.name}: ${result.content[0].text}`);
    const payload = body(result);
    if (tool.name.startsWith("calc_")) {
      assert.equal(payload.calculator, tool.name);
      assert.match(payload.url, /^https:\/\/takeoffmetric\.com\/[a-z-]+\/[a-z-]+\/$/);
      assert.equal(typeof payload.primary.value, "number");
      assert.ok(Array.isArray(payload.takeoff));
    }
  }
});

test("list_calculators names the 15 calculators and their input keys", async () => {
  const { calculators } = body(await client.callTool({ name: "list_calculators", arguments: {} }));
  assert.equal(calculators.length, 15);
  const slab = calculators.find((c) => c.name === "calc_concrete_slab");
  assert.ok(slab.inputs.includes("thickness"));
  assert.equal(slab.title, "Concrete Calculator");
});

test("an out-of-range input returns isError with the field message", async () => {
  const result = await client.callTool({ name: "calc_concrete_slab", arguments: { waste: 999 } });
  assert.equal(result.isError, true);
  const { errors } = body(result);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].field, "waste");
});

test("an unknown input key and an unknown tool are refused", async () => {
  const typo = await client.callTool({ name: "calc_gravel", arguments: { lenght: 30 } });
  assert.equal(typo.isError, true);
  assert.equal(body(typo).errors[0].field, "lenght");
  const missing = await client.callTool({ name: "calc_mortar", arguments: {} });
  assert.equal(missing.isError, true);
});
