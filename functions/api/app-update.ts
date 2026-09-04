interface ReleaseBucketObject {
  body: ReadableStream<Uint8Array>;
}

interface ReleaseBucket {
  get(key: string): Promise<ReleaseBucketObject | null>;
}

interface AppUpdateContext {
  env: { APP_RELEASES?: ReleaseBucket };
  fetch?: typeof fetch;
}

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
};

const unifiedManifestUrl = 'https://download.aov.cc/apps/shiyue-dongfang/android/latest.json';

export async function onRequestGet(context: AppUpdateContext) {
  try {
    const response = await (context.fetch ?? fetch)(unifiedManifestUrl, {
      headers: { Accept: 'application/json' },
      cf: { cacheTtl: 0 },
    } as RequestInit);
    if (response.ok) return new Response(response.body, { headers: responseHeaders });
  } catch {}
  const object = await context.env.APP_RELEASES?.get('android/latest.json');
  if (!object) return new Response(JSON.stringify({ error: '暂无可用的正式版本。' }), { status: 404, headers: responseHeaders });
  return new Response(object.body, { headers: responseHeaders });
}
