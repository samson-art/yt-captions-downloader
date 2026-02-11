import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './mcp-core.js';
import { checkYtDlpAtStartup } from './yt-dlp-check.js';

async function start() {
  await checkYtDlpAtStartup();
  const transport = new StdioServerTransport();
  const server = createMcpServer();
  await server.connect(transport);
}

await start();
