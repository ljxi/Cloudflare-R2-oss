import { notFound, parseBucketPath } from "@/utils/bucket";
import { get_read_auth_status } from "@/utils/auth";

export async function onRequestGet(context) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  // 检查读取权限
  if (!get_read_auth_status(context, path)) {
    var header = new Headers()
    header.set("WWW-Authenticate", 'Basic realm="需要登录下载"')
    return new Response("没有下载权限", {
      status: 401,
      headers: header,
    });
  }

  const url = context.env["PUBURL"] + "/" + context.request.url.split("/raw/")[1]

  var response = await fetch(new Request(url, {
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