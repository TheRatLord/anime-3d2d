// usage: node tools/srv.mjs <port>   (dev server for the current directory, stays up)
import { createServer } from 'vite';
const server = await createServer({ root: process.cwd(), logLevel: 'error', server: { port: +process.argv[2], strictPort: true, hmr: false, watch: null } });
await server.listen(); console.log('up', process.argv[2]);
