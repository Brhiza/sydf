interface ReleaseBucketObject {
  body: ReadableStream<Uint8Array>;
}

interface ReleaseBucket {
  get(key: string): Promise<ReleaseBucketObject | null>;
}

interface AppUpdateContext {
  env: { APP_RELEASES?: ReleaseBucket };
}

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
};

/** APK 更新清单只从自有 R2 读取，客户端无需连接 GitHub。 */
export async function onRequestGet(context: AppUpdateContext) {
  const object = await context.env.APP_RELEASES?.get('android/latest.json');
  if (!object) return new Response(JSON.stringify({ error: '暂无可用的正式版本。' }), { status: 404, headers: responseHeaders });
  return new Response(object.body, { headers: responseHeaders });
}
