import { notFound, parseBucketPath } from "@/utils/bucket";

export async function onRequestGet(context) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  const publicUrl = context.env["PUBURL"];
  if (!publicUrl) return new Response("PUBURL is not configured", { status: 500 });

  const url = new URL(context.request.url);
  const marker = "/raw/";
  const markerIndex = url.pathname.indexOf(marker);
  if (markerIndex < 0) return notFound();

  const objectPath = url.pathname.slice(markerIndex + marker.length);
  const base = String(publicUrl).replace(/\/$/, "");
  const response = await fetch(new Request(`${base}/${objectPath}${url.search}`, {
    method: "GET",
    headers: context.request.headers,
    redirect: "follow",
  }));

  const headers = new Headers(response.headers);
  if (path.startsWith("_$flaredrive$/thumbnails/")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}
