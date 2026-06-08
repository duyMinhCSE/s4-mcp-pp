import express from "express";
import { getBusinessPartner } from "./tools/businessPartner";

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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`MCP Server running on ${port}`);
});