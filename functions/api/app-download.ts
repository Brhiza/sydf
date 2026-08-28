interface ReleaseObjectBody {
  body: ReadableStream<Uint8Array>;
  size: number;
  httpEtag: string;
  range?: { offset: number; length: number };
  writeHttpMetadata(headers: Headers): void;
}

interface ReleaseBucket {
  get(key: string, options?: { range?: Headers }): Promise<ReleaseObjectBody | null>;
}

interface AppDownloadContext {
  request: Request;
  env: { APP_RELEASES?: ReleaseBucket };
}

const validVersion = /^\d+\.\d+\.\d+(?:[.-][0-9A-Za-z.-]+)?$/;

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, {
    status,
    headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
  });
}

async function handleDownload(context: AppDownloadContext, headOnly = false) {
  const version = new URL(context.request.url).searchParams.get('version')?.trim() ?? '';
  if (!validVersion.test(version)) return errorResponse('版本号无效。', 400);
  const bucket = context.env.APP_RELEASES;
  if (!bucket) return errorResponse('下载服务尚未配置。', 503);
  const rangeRequested = context.request.headers.has('range');
  const object = await bucket.get(`android/${version}/shiyue-dongfang-${version}.apk`, {
    range: context.request.headers,
  });
  if (!object) return errorResponse('安装包不存在。', 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Content-Disposition', `attachment; filename="shiyue-dongfang-${version}.apk"`);
  headers.set('Content-Type', 'application/vnd.android.package-archive');
  headers.set('ETag', object.httpEtag);
  if (rangeRequested && object.range) {
    const end = object.range.offset + object.range.length - 1;
    headers.set('Content-Length', String(object.range.length));
    headers.set('Content-Range', `bytes ${object.range.offset}-${end}/${object.size}`);
    return new Response(headOnly ? null : object.body, { status: 206, headers });
  }
  headers.set('Content-Length', String(object.size));
  return new Response(headOnly ? null : object.body, { headers });
}

/** 从自有 R2 流式下载 APK，并保留断点续传能力。 */
export function onRequestGet(context: AppDownloadContext) {
  return handleDownload(context);
}

/** 仅返回安装包元数据，供更新线路测速使用。 */
export function onRequestHead(context: AppDownloadContext) {
  return handleDownload(context, true);
}
