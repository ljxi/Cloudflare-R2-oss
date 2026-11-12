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
  if (!storageBase) {
    return new Response("存储后端未配置", { status: 500 });
  }

  const targetUrl =
    storageBase.replace(/\/+$/, "") + "/" + filePath.replace(/^\/+/, "");

  const newHeaders = new Headers(context.request.headers);
  newHeaders.delete("host");
  newHeaders.set("User-Agent", "Cloudflare-Worker/1.0");

  const fetchOptions = {
    method: context.request.method,
    headers: newHeaders,
    body:
      context.request.method !== "GET" && context.request.method !== "HEAD"
        ? context.request.body
        : undefined,
    redirect: "follow",
  };

  const timeoutMs = Number(context.env["FETCH_TIMEOUT_MS"]) || 30_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  fetchOptions.signal = controller.signal;

  try {
    const response = await fetch(targetUrl, fetchOptions);
    const headers = new Headers(response.headers);
    if (path && path.startsWith("_$flaredrive$/thumbnails/")) {
      headers.set("Cache-Control", "max-age=31536000");
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    const message =
      error && error.name === "AbortError"
        ? "存储获取超时"
        : "存储获取失败";
    return new Response(message, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
