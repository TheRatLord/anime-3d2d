// Gives the tools a base URL: an already running dev server if PORT is set, otherwise a
// private Vite server that lives only as long as the tool run.
import { createServer } from 'vite';
export async function serve() {
  if (process.env.PORT) return { url: `http://localhost:${process.env.PORT}/`, close: async () => {} };
  const server = await createServer({ root: process.cwd(), logLevel: 'error', server: { port: 0, strictPort: false, hmr: false, watch: null } });
  await server.listen();
  const port = server.httpServer.address().port;
  return { url: `http://localhost:${port}/`, close: () => server.close() };
}
