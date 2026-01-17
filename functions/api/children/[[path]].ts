import { notFound, parseBucketPath } from "@/utils/bucket";
import { get_read_auth_status } from "@/utils/auth";

export async function onRequestGet(context) {
  try {
    const [bucket, path] = parseBucketPath(context);
    const prefix = path && `${path}/`;
    if (!bucket || prefix.startsWith("_$flaredrive$/")) return notFound();

    // 检查读取权限
    if (!get_read_auth_status(context, path)) {
      var header = new Headers()
      header.set("WWW-Authenticate", 'Basic realm="需要登录查看"')
      return new Response("没有查看权限", {
        status: 401,
        headers: header,
      });
    }

    const objList = await bucket.list({
      prefix,
      delimiter: "/",
      include: ["httpMetadata", "customMetadata"],
    });
    const objKeys = objList.objects
      .filter((obj) => !obj.key.endsWith("/_$folder$"))
      .map((obj) => {
        const { key, size, uploaded, httpMetadata, customMetadata } = obj;
        return { key, size, uploaded, httpMetadata, customMetadata };
      });

    let folders = objList.delimitedPrefixes;
    if (!path)
      folders = folders.filter((folder) => folder !== "_$flaredrive$/");

    return new Response(JSON.stringify({ value: objKeys, folders }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(e.toString(), { status: 500 });
  }
}
