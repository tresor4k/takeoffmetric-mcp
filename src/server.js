import { readFileSync } from "node:fs";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { tools } from "./tools.js";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const toolsByName = new Map(tools.map((t) => [t.name, t]));

const errorResult = (message) => ({
  content: [{ type: "text", text: JSON.stringify({ error: message }) }],
  isError: true,
});

export const INSTRUCTIONS = [
  "Construction takeoff calculators (concrete, rebar, gravel, fill dirt, sand, topsoil, cubic yards, asphalt, board feet, roofing, roof pitch, fence, duct, paver base) and a searchable table of sourced estimating constants.",
  'Each calc_* tool takes its inputs in imperial or metric units through the "system" argument (default imperial); list_calculators gives the input keys of each one.',
  "Results come from the same engine as the calculators on takeoffmetric.com, and each result carries the URL of its page.",
  "Tools run locally and make no network requests.",
  "Results are estimates: the user should confirm them with their plans, supplier and local code.",
].join(" ");

export function createServer() {
  const server = new Server(
    { name: pkg.name, version: pkg.version },
    { capabilities: { tools: {} }, instructions: INSTRUCTIONS },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      title: t.title,
      description: t.description,
      inputSchema: t.inputSchema,
      annotations: t.annotations,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = toolsByName.get(name);
    if (!tool) return errorResult(`Unknown tool: ${name}`);
    try {
      const { payload, isError } = tool.handler(args ?? {});
      return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }], isError };
    } catch (err) {
      return errorResult(`Unhandled error in ${name}: ${err && err.message ? err.message : String(err)}`);
    }
  });

  return server;
}

export async function runStdioServer() {
  const server = createServer();
  await server.connect(new StdioServerTransport());
  // stderr only: stdout is reserved for the JSON-RPC stream.
  console.error(`${pkg.name} ${pkg.version}: MCP server running on stdio`);
}
