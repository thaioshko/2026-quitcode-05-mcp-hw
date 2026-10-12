// LeadDesk MCP server over Streamable HTTP (bonus E1): the same factory as server.mjs.
//
//   node mcp/leaddesk-server/src/http.mjs        → http://127.0.0.1:3333/mcp
//
// Listens on 127.0.0.1 only. The Host and Origin guards are called here, in the request handler:
// passed as an option to toNodeHandler they would be silently ignored, and a forged Host would get 200
// (DNS rebinding from any web page in the user's browser).
import { createServer } from "node:http";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { localhostHostValidation, localhostOriginValidation, toNodeHandler } from "@modelcontextprotocol/node";
import { factory } from "./leaddesk.mjs";

const PORT = Number(process.env.PORT ?? 3333);
const HOST = "127.0.0.1";

const mcp = toNodeHandler(createMcpHandler(factory));
const checkHost = localhostHostValidation();
const checkOrigin = localhostOriginValidation();

createServer(async (req, res) => {
  if (!checkHost(req, res)) return; // the guard has already answered 403
  if (!checkOrigin(req, res)) return;
  await mcp(req, res);
}).listen(PORT, HOST, () => {
  console.error(`leaddesk MCP over HTTP: http://${HOST}:${PORT}/mcp`);
});
