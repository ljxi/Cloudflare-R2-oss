import { notFound, parseBucketPath } from "@/utils/bucket";

export async function onRequestGet(context) {
  try {
    const [bucket, path] = parseBucketPath(context);
    const prefix = path && `${path}/`;
    if (!bucket || prefix.startsWith("_$flaredrive$/")) return notFound();

    const objects = [];
    const folderSet = new Set();
    let cursor: string | undefined;

    do {
      const objList = await bucket.list({
        prefix,
        delimiter: "/",
        cursor,
        include: ["httpMetadata", "customMetadata"],
      });

      for (const obj of objList.objects) {
        if (obj.key.endsWith("/_$folder$")) continue;
        const { key, size, uploaded, httpMetadata, customMetadata } = obj;
        objects.push({ key, size, uploaded, httpMetadata, customMetadata });
      }

      for (const folder of objList.delimitedPrefixes) folderSet.add(folder);
      cursor = objList.truncated ? objList.cursor : undefined;
    } while (cursor);

    let folders = [...folderSet];
    if (!path) folders = folders.filter((folder) => folder !== "_$flaredrive$/");

    return new Response(JSON.stringify({ value: objects, folders }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
}
