import { handleAgentPost } from '../../functions/shared/agent';

/** EdgeOne Cloud Functions 入口，与 Cloudflare Pages Functions 共用处理逻辑。 */
export function onRequestPost(context: Parameters<typeof handleAgentPost>[0]) {
  return handleAgentPost(context);
}
