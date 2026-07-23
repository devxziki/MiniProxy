import { createServer } from 'node:http';
import { handleRequest } from './src/proxy.js';

const BASE = parseInt(process.env.PORT || '3000', 10);
let port = BASE;

const server = createServer(handleRequest);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && port < BASE + 10) {
    port++;
    server.listen(port);
  } else {
    console.error(`Failed to start on port ${port}:`, err.message);
    process.exit(1);
  }
});

server.listen(port, () => {
  console.log(`MiniProxy running → http://localhost:${port}`);
  console.log(`Chat endpoint → POST http://localhost:${port}/v1/chat/completions`);
});
