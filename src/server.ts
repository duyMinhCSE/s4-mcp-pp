import express from "express";
import { getBusinessPartner } from "./tools/businessPartner";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

// Create server instance
const server = new McpServer({
  name: "S4-PP-MCP",
  version: "1.0.0",
});

const app = express();
app.use(express.json());

/**
 * Health
 */
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

/**
 * Whoami
 */

app.get("/whoami", (req, res) => {
  res.json({
    headers: req.headers
  });
});

/**
 * MCP Tool Endpoint
 */
app.post("/mcp/tools/businessPartner", async (req, res) => {
  try {
    const { supplierId } = req.body;

    console.error('======/mcp/tools/businessPartner started======')

    if (!supplierId) {
      return res.status(400).json({ error: "supplierId required" });
    }

    // ✔ JWT from App Router (Principal Propagation)
    const jwt = req.headers.authorization?.replace("Bearer ", "");

    const result = await getBusinessPartner(supplierId, jwt);

    res.json({
      tool: "businessPartner",
      data: result
    });

  } catch (e: any) {
    res.status(500).json({
      error: "Failed to fetch Business Partner",
      message: e.message
    });
  }
});


server.registerTool (  
  "get_supplier",
  {
    description: "Fetch business partner data for given supplier number or business partner number",
    inputSchema:  {
        supplierId: z.string().describe("Supplier or Business Partner number")
    },
  },

  //implement callback here  
  async ({ supplierId }) => {

        const result = await getBusinessPartner(supplierId);

        return result

  }
);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.error(`MCP Server running on ${port}`);
});