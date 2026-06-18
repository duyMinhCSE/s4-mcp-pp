import express from "express";
import { getBusinessPartner } from "./tools/businessPartner";
import { registerLeaveTools } from "./tools/leave";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { createSession, getSession, purgeExpired } from "./session";

const app = express();
app.use(express.json());

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.get("/whoami", (req, res) => {
  res.json({ headers: req.headers });
});

app.get("/session/link", (req, res) => {
  const jwt = req.headers.authorization?.replace("Bearer ", "");
  if (!jwt) {
    return res.status(401).send("No token found. Make sure you accessed this via the Approuter.");
  }

  const sessionId = createSession(jwt);

  res.send(`
    <html><body style="font-family:sans-serif;max-width:500px;margin:40px auto">
      <h2>Session linked successfully</h2>
      <p>Your session ID (valid 8 hours):</p>
      <pre style="background:#f4f4f4;padding:12px;border-radius:4px;font-size:1.1em">${sessionId}</pre>
      <p>Copy this value and set it as the <strong>sessionId</strong> parameter in your Joule tool configuration.</p>
    </body></html>
  `);
});

app.get("/session/info/:sessionId", (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found or expired" });
  }
  res.json({
    userId: session.userId,
    expiresAt: new Date(session.expiresAt).toISOString(),
    token: session.userToken
  });
});

app.post("/mcp/tools/businessPartner", async (req, res) => {
  try {
    const { supplierId } = req.body;
    console.error('======/mcp/tools/businessPartner started======')
    if (!supplierId) {
      return res.status(400).json({ error: "supplierId required" });
    }
    const jwt = req.headers.authorization?.replace("Bearer ", "");
    const result = await getBusinessPartner(supplierId, jwt);
    res.json({ tool: "businessPartner", data: result });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch Business Partner", message: e.message });
  }
});

app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const mcpServer = new McpServer({ name: "S4-PP-MCP", version: "1.0.0" });
  console.error("start mcp======", req.body)
  mcpServer.registerTool(
    "get_supplier",
    {
      description: "Fetch business partner data for given supplier number or business partner number",
      inputSchema: {
        supplierId: z.string().describe("Supplier or Business Partner number"),
        sessionId: z.string().optional().describe("Session ID from /session/link. Required for principal propagation to S/4."),
      },
    },
    
    async ({ supplierId, sessionId }) => {
      if (!sessionId) {
        return {
          content: [{
            type: "text",
            text: `Authentication required.\n\nPlease open the following URL in your browser to link your identity:\n\n${process.env.APP_URL ?? "http://localhost:3000"}/session/link\n\nThen copy the session ID shown and set it as the sessionId parameter in your Joule tool configuration.`
          }]
        };
      }

      const result = await getBusinessPartner(supplierId, undefined, sessionId);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  registerLeaveTools(mcpServer);

  await mcpServer.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

setInterval(purgeExpired, 60 * 60 * 1000);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.error(`MCP Server running on ${port}`);
});
