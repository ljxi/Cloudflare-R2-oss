import { notFound, parseBucketPath } from "@/utils/bucket";

export async function onRequestGet(context) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();
  const url = context.env["PUBURL"] + "/" + context.request.url.split("/raw/")[1]

  var response =await fetch(new Request(url, {
    body: context.request.body,
    headers: context.request.headers,
    method: context.request.method,
    redirect: "follow",
}))


  const headers = new Headers(response.headers);
  if (path.startsWith("_$flaredrive$/thumbnails/")){
    headers.set("Cache-Control", "max-age=31536000");
  }

  return new Response(response.body, {
    headers: headers,
    status: response.status,
    statusText: response.statusText
});
}