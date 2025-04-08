import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const transport = new StdioClientTransport({
    command: "node",
    args: ["build/index.js"]
});
const client = new Client({
    name: "example-client",
    version: "1.0.0"
});
await client.connect(transport);
// Call a tool
const result = await client.callTool({
    name: "get-subjects",
    arguments: {
        enrollment_grade: 1,
        freeword: "ITリテラシー"
    }
});
console.log("Result:", result);
