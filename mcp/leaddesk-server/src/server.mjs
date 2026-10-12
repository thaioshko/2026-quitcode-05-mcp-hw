// LeadDesk MCP server over stdio.
//
//   node mcp/leaddesk-server/src/server.mjs
//
// stdout is the protocol channel: nothing in src/ prints to it. Logs go to stderr only, without personal data.
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { factory } from "./leaddesk.mjs";

await serveStdio(factory);
