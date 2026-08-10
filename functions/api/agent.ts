import { handleAgentPost } from '../shared/agent';

/** Cloudflare Pages Functions 入口。 */
export function onRequestPost(context: Parameters<typeof handleAgentPost>[0]) {
  return handleAgentPost(context);
}
