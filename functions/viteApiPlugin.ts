import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { onRequestPost as agent } from './api/agent';
import { onRequestPost as interpret } from './api/interpret';
import { onRequestPost as models } from './api/models';

type PagesHandler = (context: {
  request: Request;
  env: Record<string, string | undefined>;
}) => Promise<Response>;

const handlers = new Map<string, PagesHandler>([
  ['/api/agent', agent],
  ['/api/interpret', interpret],
  ['/api/models', models],
]);

function readRequestBody(request: IncomingMessage) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;
    request.on('data', (chunk: Buffer | string) => {
      if (settled) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > 64 * 1024) {
        settled = true;
        reject(new Error('request body too large'));
        return;
      }
      chunks.push(buffer);
    });
    request.on('end', () => {
      if (!settled) resolve(Buffer.concat(chunks));
    });
    request.on('error', (error) => {
      if (!settled) reject(error);
    });
  });
}

function writeResponse(response: Response, target: ServerResponse) {
  target.statusCode = response.status;
  response.headers.forEach((value, key) => target.setHeader(key, value));
  return response.arrayBuffer().then((body) => target.end(Buffer.from(body)));
}

function jsonError(target: ServerResponse, status: number, message: string) {
  target.statusCode = status;
  target.setHeader('Content-Type', 'application/json; charset=utf-8');
  target.end(JSON.stringify({ error: message }));
}

export function pagesApiPlugin(loadedEnv: Record<string, string>): Plugin {
  const env: Record<string, string | undefined> = { ...loadedEnv, ...process.env };
  const attachMiddleware = (middlewares: { use: (handler: (request: IncomingMessage, response: ServerResponse, next: () => void) => void) => void }) => {
    middlewares.use(async (request, response, next) => {
      const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);
      const handler = handlers.get(url.pathname);
      if (!handler) {
        next();
        return;
      }
      if (request.method !== 'POST') {
        jsonError(response, 405, '请求方式不受支持。');
        return;
      }
      try {
        const body = await readRequestBody(request);
        const headers = new Headers();
        for (const [key, value] of Object.entries(request.headers)) {
          if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
          else if (value !== undefined) headers.set(key, value);
        }
        const webRequest = new Request(url, {
          method: 'POST',
          headers,
          body,
        });
        await writeResponse(await handler({ request: webRequest, env }), response);
      } catch (error) {
        if (!response.headersSent) {
          const tooLarge = error instanceof Error && error.message === 'request body too large';
          jsonError(response, tooLarge ? 413 : 500, tooLarge ? '请求内容过大。' : '本地 AI 服务暂时不可用。');
        }
        else response.end();
      }
    });
  };

  return {
    name: 'pages-api-local-preview',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    },
  };
}
