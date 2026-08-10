import { handleModelsPost } from '../../functions/shared/models';

/** EdgeOne Cloud Functions 入口，与 Cloudflare Pages Functions 共用处理逻辑。 */
export function onRequestPost(context: Parameters<typeof handleModelsPost>[0]) {
  return handleModelsPost(context);
}
