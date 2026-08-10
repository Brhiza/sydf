import { describe, expect, it } from 'vitest';
import { onRequestPost as cloudflareAgent } from './agent';
import { onRequestPost as cloudflareInterpret } from './interpret';
import { onRequestPost as cloudflareModels } from './models';
import { onRequestPost as edgeoneAgent } from '../../cloud-functions/api/agent';
import { onRequestPost as edgeoneInterpret } from '../../cloud-functions/api/interpret';
import { onRequestPost as edgeoneModels } from '../../cloud-functions/api/models';

type Handler = typeof cloudflareInterpret;

function invalidJsonRequest(path: string) {
  return new Request(`https://example.com${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });
}

async function result(handler: Handler, path: string) {
  const response = await handler({ request: invalidJsonRequest(path), env: {} });
  return { status: response.status, body: await response.json() };
}

describe('Cloudflare 与 EdgeOne 函数入口', () => {
  it.each([
    ['/api/agent', cloudflareAgent, edgeoneAgent],
    ['/api/interpret', cloudflareInterpret, edgeoneInterpret],
    ['/api/models', cloudflareModels, edgeoneModels],
  ] as const)('%s 使用相同的请求处理逻辑', async (path, cloudflareHandler, edgeoneHandler) => {
    expect(await result(edgeoneHandler, path)).toEqual(await result(cloudflareHandler, path));
  });
});
