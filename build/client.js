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
// Call get-list-of-all-subjects tool
const result1 = await client.callTool({
    name: "get-list-of-all-subjects",
    arguments: {}
});
console.log("Result from get-list-of-all-subjects:", result1);
// Call get-subjects tool
const result2 = await client.callTool({
    name: "get-subjects-with-detail",
    arguments: {
        enrollment_grade: 1,
        freeword: "ITリテラシー"
    }
});
console.log("Result from get-subjects-with-detail:", result2);
