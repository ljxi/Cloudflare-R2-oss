import { notFound, parseBucketPath } from "@/utils/bucket";

export async function onRequestGet(context) {
  try {
    const [bucket, path] = parseBucketPath(context);
    const prefix = path && `${path}/`;
    if (!bucket || prefix.startsWith("_$flaredrive$/")) return notFound();

    const url = new URL(context.request.url);
    const cursor = url.searchParams.get("cursor") || undefined;
    const objList = await bucket.list({
      prefix,
      delimiter: "/",
      cursor,
      include: ["httpMetadata", "customMetadata"],
    });

    const objKeys = objList.objects
      .filter((obj) => !obj.key.endsWith("/_$folder$"))
      .map((obj) => {
        const { key, size, uploaded, httpMetadata, customMetadata } = obj;
        return { key, size, uploaded, httpMetadata, customMetadata };
      });

    let folders = objList.delimitedPrefixes;
    if (!path) folders = folders.filter((folder) => folder !== "_$flaredrive$/");

    return new Response(
      JSON.stringify({
        value: objKeys,
        folders,
        truncated: objList.truncated,
        cursor: objList.truncated ? objList.cursor : null,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
}
