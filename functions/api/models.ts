import { handleModelsPost } from '../shared/models';

/** Cloudflare Pages Functions 入口。 */
export function onRequestPost(context: Parameters<typeof handleModelsPost>[0]) {
  return handleModelsPost(context);
}
