import { handleInterpretPost } from '../../functions/shared/interpret';

/** EdgeOne Cloud Functions 入口，与 Cloudflare Pages Functions 共用处理逻辑。 */
export function onRequestPost(context: Parameters<typeof handleInterpretPost>[0]) {
  return handleInterpretPost(context);
}
