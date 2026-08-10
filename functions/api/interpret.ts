import { handleInterpretPost } from '../shared/interpret';

/** Cloudflare Pages Functions 入口。 */
export function onRequestPost(context: Parameters<typeof handleInterpretPost>[0]) {
  return handleInterpretPost(context);
}
