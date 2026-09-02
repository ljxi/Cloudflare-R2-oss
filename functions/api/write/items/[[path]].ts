import { notFound, parseBucketPath } from "@/utils/bucket";
import { get_auth_status } from "@/utils/auth";

function unauthorized() {
  return new Response("没有操作权限", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="需要登录"' },
  });
}

export async function onRequestPostCreateMultipart(context) {
  if (!get_auth_status(context)) return unauthorized();

  const [bucket, path] = parseBucketPath(context);
  if (!bucket || !path) return notFound();

  const request: Request = context.request;
  const customMetadata: Record<string, string> = {};
  const thumbnail = request.headers.get("fd-thumbnail");
  if (thumbnail) customMetadata.thumbnail = thumbnail;

  const multipartUpload = await bucket.createMultipartUpload(path, {
    httpMetadata: { contentType: request.headers.get("content-type") || undefined },
    customMetadata,
  });

  return new Response(
    JSON.stringify({ key: multipartUpload.key, uploadId: multipartUpload.uploadId }),
    { headers: { "Content-Type": "application/json" } }
  );
}

export async function onRequestPostCompleteMultipart(context) {
  if (!get_auth_status(context)) return unauthorized();

  const [bucket, path] = parseBucketPath(context);
  if (!bucket || !path) return notFound();

  const request: Request = context.request;
  const url = new URL(request.url);
  const uploadId = url.searchParams.get("uploadId");
  if (!uploadId) return new Response("Missing uploadId", { status: 400 });

  try {
    const completeBody: { parts: Array<any> } = await request.json();
    if (!Array.isArray(completeBody.parts) || !completeBody.parts.length) {
      return new Response("Missing multipart parts", { status: 400 });
    }

    const multipartUpload = await bucket.resumeMultipartUpload(path, uploadId);
    const object = await multipartUpload.complete(completeBody.parts);
    return new Response(null, { headers: { etag: object.httpEtag } });
  } catch (error: any) {
    return new Response(error?.message || "Multipart completion failed", { status: 400 });
  }
}

export async function onRequestPost(context) {
  const searchParams = new URL(context.request.url).searchParams;
  if (searchParams.has("uploads")) return onRequestPostCreateMultipart(context);
  if (searchParams.has("uploadId")) return onRequestPostCompleteMultipart(context);
  return new Response("Method not allowed", { status: 405 });
}

export async function onRequestPutMultipart(context) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket || !path) return notFound();

  const url = new URL(context.request.url);
  const uploadId = url.searchParams.get("uploadId");
  const partNumber = Number.parseInt(url.searchParams.get("partNumber") || "", 10);
  if (!uploadId || !Number.isInteger(partNumber) || partNumber < 1) {
    return new Response("Invalid multipart parameters", { status: 400 });
  }

  const multipartUpload = await bucket.resumeMultipartUpload(path, uploadId);
  const uploadedPart = await multipartUpload.uploadPart(partNumber, context.request.body);
  return new Response(null, {
    headers: { "Content-Type": "application/json", etag: uploadedPart.etag },
  });
}

export async function onRequestPut(context) {
  if (!get_auth_status(context)) return unauthorized();

  const url = new URL(context.request.url);
  if (url.searchParams.has("uploadId")) return onRequestPutMultipart(context);

  const [bucket, path] = parseBucketPath(context);
  if (!bucket || !path) return notFound();

  const request: Request = context.request;
  let content = request.body;
  const customMetadata: Record<string, string> = {};

  const copySource = request.headers.get("x-amz-copy-source");
  if (copySource) {
    let sourceName;
    try {
      sourceName = decodeURIComponent(copySource);
    } catch {
      return new Response("Invalid copy source", { status: 400 });
    }
    const source = await bucket.get(sourceName);
    if (!source) return notFound();
    content = source.body;
    if (source.customMetadata?.thumbnail) customMetadata.thumbnail = source.customMetadata.thumbnail;
  }

  const thumbnail = request.headers.get("fd-thumbnail");
  if (thumbnail) customMetadata.thumbnail = thumbnail;

  const obj = await bucket.put(path, content, {
    customMetadata,
    httpMetadata: { contentType: request.headers.get("content-type") || undefined },
  });
  const { key, size, uploaded } = obj;
  return new Response(JSON.stringify({ key, size, uploaded }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestDelete(context) {
  if (!get_auth_status(context)) return unauthorized();

  const [bucket, path] = parseBucketPath(context);
  if (!bucket || !path) return notFound();

  // Folder markers represent logical directories. Remove their contents too.
  if (path.endsWith("/_$folder$") || path.endsWith("_$folder$")) {
    const prefix = path.endsWith("/_$folder$")
      ? path.slice(0, -"_$folder$".length)
      : path.slice(0, -"_$folder$".length);
    let cursor: string | undefined;
    do {
      const listed = await bucket.list({ prefix, cursor });
      if (listed.objects.length) await bucket.delete(listed.objects.map((obj) => obj.key));
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);
    return new Response(null, { status: 204 });
  }

  await bucket.delete(path);
  return new Response(null, { status: 204 });
}
