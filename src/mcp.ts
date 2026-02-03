import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './mcp-core.js';

async function start() {
  const transport = new StdioServerTransport();
  const server = createMcpServer();
  await server.connect(transport);
}

await start();
