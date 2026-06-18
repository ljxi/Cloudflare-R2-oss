import { notFound, parseBucketPath } from "@/utils/bucket";

export async function onRequestGet(context) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  const urlParts = context.request.url.split("/raw/");
  if (urlParts.length < 2) {
    return new Response("未找到资源", { status: 404 });
  }
  const filePath = urlParts[1];
  const storageBase = context.env["PUBURL"];
  const targetUrl = storageBase + "/" + filePath;

  const newHeaders = new Headers(context.request.headers);
  newHeaders.delete("host");
  newHeaders.set("User-Agent", "Cloudflare-Worker/1.0");

  const fetchOptions = {
    method: context.request.method,
    headers: newHeaders,
    body: context.request.method !== "GET" && context.request.method !== "HEAD" ? context.request.body : undefined,
    redirect: "follow",
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(targetUrl, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const headers = new Headers(response.headers);
    if (path && path.startsWith("_$flaredrive$/thumbnails/")) {
      headers.set("Cache-Control", "max-age=31536000");
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers,
    });
  } catch (error) {
    return new Response("存储获取失败：" + error.message, { status: 502 });
  }
}
