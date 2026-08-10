import { onRequestPost as handleRequest } from '../../functions/api/agent';

/** EdgeOne Cloud Functions 入口，与 Cloudflare Pages Functions 共用处理逻辑。 */
export function onRequestPost(context: Parameters<typeof handleRequest>[0]) {
  return handleRequest(context);
}
