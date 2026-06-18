import express from "express";
import { registerLeaveTools } from "./tools/leave";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
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

app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const mcpServer = new McpServer({ name: "S4-PP-MCP", version: "1.0.0" });
  console.error("start mcp======", req.body)
  registerLeaveTools(mcpServer);

  await mcpServer.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

setInterval(purgeExpired, 60 * 60 * 1000);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.error(`MCP Server running on ${port}`);
});
