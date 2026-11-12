import { notFound, parseBucketPath } from "@/utils/bucket";
import { get_read_auth_status } from "@/utils/auth";

const PREVIEWABLE_EXTENSIONS = new Set([
  "txt", "text", "log", "md", "markdown", "mdx", "csv", "tsv",
  "json", "jsonc", "json5", "xml", "yaml", "yml", "toml", "ini",
  "conf", "cfg", "properties", "env", "css", "scss", "sass", "less",
  "js", "mjs", "cjs", "ts", "mts", "cts", "jsx", "tsx",
  "vue", "svelte", "astro",
  "py", "java", "c", "h", "cc", "cpp", "cxx", "hpp", "cs",
  "go", "rs", "rb", "php", "swift", "kt", "kts", "scala",
  "lua", "pl", "r", "dart",
  "sh", "bash", "zsh", "fish", "ps1", "bat", "cmd",
  "sql", "graphql", "gql", "diff", "patch", "tex", "rst", "adoc", "org",
  "png", "jpg", "jpeg", "jpe", "jfif", "gif", "webp", "bmp",
  "svg", "ico", "avif", "apng",
  "mp4", "m4v", "webm", "ogv", "ogg", "oga", "mp3", "wav",
  "flac", "aac", "m4a", "opus", "weba",
  "pdf",
]);

const PUBLIC_DOWNLOAD_EXTENSIONS = new Set([
  "jar", "war",
]);

const EXTENSION_TYPES: Record<string, string> = {
  txt: "text/plain; charset=utf-8",
  text: "text/plain; charset=utf-8",
  log: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  markdown: "text/markdown; charset=utf-8",
  mdx: "text/markdown; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  tsv: "text/tab-separated-values; charset=utf-8",
  json: "application/json; charset=utf-8",
  jsonc: "application/json; charset=utf-8",
  json5: "application/json; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  yaml: "text/yaml; charset=utf-8",
  yml: "text/yaml; charset=utf-8",
  toml: "text/plain; charset=utf-8",
  ini: "text/plain; charset=utf-8",
  conf: "text/plain; charset=utf-8",
  cfg: "text/plain; charset=utf-8",
  properties: "text/plain; charset=utf-8",
  env: "text/plain; charset=utf-8",
  css: "text/css; charset=utf-8",
  scss: "text/plain; charset=utf-8",
  sass: "text/plain; charset=utf-8",
  less: "text/plain; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  mjs: "application/javascript; charset=utf-8",
  cjs: "application/javascript; charset=utf-8",
  ts: "text/plain; charset=utf-8",
  mts: "text/plain; charset=utf-8",
  cts: "text/plain; charset=utf-8",
  jsx: "text/plain; charset=utf-8",
  tsx: "text/plain; charset=utf-8",
  vue: "text/plain; charset=utf-8",
  svelte: "text/plain; charset=utf-8",
  astro: "text/plain; charset=utf-8",
  py: "text/plain; charset=utf-8",
  java: "text/plain; charset=utf-8",
  c: "text/plain; charset=utf-8",
  h: "text/plain; charset=utf-8",
  cc: "text/plain; charset=utf-8",
  cpp: "text/plain; charset=utf-8",
  cxx: "text/plain; charset=utf-8",
  hpp: "text/plain; charset=utf-8",
  cs: "text/plain; charset=utf-8",
  go: "text/plain; charset=utf-8",
  rs: "text/plain; charset=utf-8",
  rb: "text/plain; charset=utf-8",
  php: "text/plain; charset=utf-8",
  swift: "text/plain; charset=utf-8",
  kt: "text/plain; charset=utf-8",
  kts: "text/plain; charset=utf-8",
  scala: "text/plain; charset=utf-8",
  lua: "text/plain; charset=utf-8",
  pl: "text/plain; charset=utf-8",
  r: "text/plain; charset=utf-8",
  dart: "text/plain; charset=utf-8",
  sh: "text/plain; charset=utf-8",
  bash: "text/plain; charset=utf-8",
  zsh: "text/plain; charset=utf-8",
  fish: "text/plain; charset=utf-8",
  ps1: "text/plain; charset=utf-8",
  bat: "text/plain; charset=utf-8",
  cmd: "text/plain; charset=utf-8",
  sql: "text/plain; charset=utf-8",
  graphql: "text/plain; charset=utf-8",
  gql: "text/plain; charset=utf-8",
  diff: "text/plain; charset=utf-8",
  patch: "text/plain; charset=utf-8",
  tex: "text/plain; charset=utf-8",
  rst: "text/plain; charset=utf-8",
  adoc: "text/plain; charset=utf-8",
  org: "text/plain; charset=utf-8",

  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jpe: "image/jpeg",
  jfif: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  avif: "image/avif",
  apng: "image/apng",

  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  aac: "audio/aac",
  m4a: "audio/mp4",
  opus: "audio/opus",
  weba: "audio/webm",

  pdf: "application/pdf",

  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
  gz: "application/gzip",
  tar: "application/x-tar",
  jar: "application/java-archive",
  war: "application/java-archive",
  apk: "application/vnd.android.package-archive",
  exe: "application/x-msdownload",
  msi: "application/x-msi",
  dmg: "application/x-apple-diskimage",
  iso: "application/x-iso9660-image",
};

function normalizeBucketPath(input: unknown): string {
  let p = Array.isArray(input) ? input.join("/") : String(input ?? "");
  p = p.split("?")[0].split("#")[0];
  try {
    p = decodeURIComponent(p);
  } catch {
    // keep as-is
  }
  return p.replace(/^\/+/, "");
}

function getExtension(path: string): string {
  const base = path.slice(path.lastIndexOf("/") + 1);
  const idx = base.lastIndexOf(".");
  if (idx <= 0) return "";
  return base.slice(idx + 1).toLowerCase();
}

function inferContentType(object: any, path: string): string {
  const meta = object.httpMetadata && object.httpMetadata.contentType;
  const byExt = EXTENSION_TYPES[getExtension(path)];
  if (meta && meta.toLowerCase() !== "application/octet-stream") return meta;
  return byExt || meta || "application/octet-stream";
}

function unauthorized(): Response {
  const header = new Headers();
  header.set("WWW-Authenticate", 'Basic realm="需要登录下载"');
  return new Response("没有下载权限", { status: 401, headers: header });
}

export async function onRequestGet(context: any): Promise<Response> {
  const [bucket, rawPath] = parseBucketPath(context);
  if (!bucket) return notFound();

  const path = normalizeBucketPath(rawPath);

  const fileObject = await bucket.get(path);

  if (fileObject) {
    const ext = getExtension(path);
    const previewable = PREVIEWABLE_EXTENSIONS.has(ext);
    const downloadable = PUBLIC_DOWNLOAD_EXTENSIONS.has(ext);
    const allowWithoutAuth = previewable || downloadable;

    if (!allowWithoutAuth && !get_read_auth_status(context, path)) {
      return unauthorized();
    }

    const contentType = inferContentType(fileObject, path);
    const fileName = path.split("/").filter(Boolean).pop() || "file";
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set(
      "Content-Disposition",
      `${previewable ? "inline" : "attachment"}; filename="${encodeURIComponent(fileName)}"`
    );
    headers.set("X-Content-Type-Options", "nosniff");
    if (typeof fileObject.size === "number") {
      headers.set("Content-Length", String(fileObject.size));
    }
    if (fileObject.httpMetadata && fileObject.httpMetadata.cacheControl) {
      headers.set("Cache-Control", fileObject.httpMetadata.cacheControl);
    }
    if (path.startsWith("_$flaredrive$/thumbnails/")) {
      headers.set("Cache-Control", "max-age=31536000");
    }

    return new Response(fileObject.body, { headers });
  }

  if (!get_read_auth_status(context, path)) return unauthorized();

  try {
    const files: any[] = [];
    let cursor: string | undefined = undefined;
    const prefix = path.endsWith("/") ? path : path + "/";

    do {
      const listed = await bucket.list({
        prefix: prefix,
        cursor: cursor,
      });

      for (const object of listed.objects) {
        if (object.key.endsWith("_$folder$")) continue;
        files.push(object);
      }

      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);

    if (files.length === 0) {
      return new Response("目录为空或不存在", { status: 404 });
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const zipFiles: { fileName: Uint8Array; offset: number; crc: number; size: number }[] = [];
        let offset = 0;

        for (const file of files) {
          const object = await bucket.get(file.key);
          if (!object) continue;

          const fileName = file.key.substring(prefix.length);
          const fileNameBytes = encoder.encode(fileName);
          const fileData = new Uint8Array(await object.arrayBuffer());
          const crc = crc32(fileData);

          const localHeader = new Uint8Array(30 + fileNameBytes.length);
          const view = new DataView(localHeader.buffer);

          view.setUint32(0, 0x04034b50, true);
          view.setUint16(4, 20, true);
          view.setUint16(6, 0, true);
          view.setUint16(8, 0, true);
          view.setUint16(10, 0, true);
          view.setUint16(12, 0, true);
          view.setUint32(14, crc, true);
          view.setUint32(18, fileData.length, true);
          view.setUint32(22, fileData.length, true);
          view.setUint16(26, fileNameBytes.length, true);
          view.setUint16(28, 0, true);

          localHeader.set(fileNameBytes, 30);

          await writer.write(localHeader);
          await writer.write(fileData);

          zipFiles.push({
            fileName: fileNameBytes,
            offset: offset,
            crc: crc,
            size: fileData.length,
          });

          offset += localHeader.length + fileData.length;
        }

        let centralDirSize = 0;
        for (const zipFile of zipFiles) {
          const centralHeader = new Uint8Array(46 + zipFile.fileName.length);
          const view = new DataView(centralHeader.buffer);

          view.setUint32(0, 0x02014b50, true);
          view.setUint16(4, 20, true);
          view.setUint16(6, 20, true);
          view.setUint16(8, 0, true);
          view.setUint16(10, 0, true);
          view.setUint16(12, 0, true);
          view.setUint16(14, 0, true);
          view.setUint32(16, zipFile.crc, true);
          view.setUint32(20, zipFile.size, true);
          view.setUint32(24, zipFile.size, true);
          view.setUint16(28, zipFile.fileName.length, true);
          view.setUint16(30, 0, true);
          view.setUint16(32, 0, true);
          view.setUint16(34, 0, true);
          view.setUint16(36, 0, true);
          view.setUint32(38, 0, true);
          view.setUint32(42, zipFile.offset, true);

          centralHeader.set(zipFile.fileName, 46);

          await writer.write(centralHeader);
          centralDirSize += centralHeader.length;
        }

        const endRecord = new Uint8Array(22);
        const endView = new DataView(endRecord.buffer);
        endView.setUint32(0, 0x06054b50, true);
        endView.setUint16(4, 0, true);
        endView.setUint16(6, 0, true);
        endView.setUint16(8, zipFiles.length, true);
        endView.setUint16(10, zipFiles.length, true);
        endView.setUint32(12, centralDirSize, true);
        endView.setUint32(16, offset, true);
        endView.setUint16(20, 0, true);

        await writer.write(endRecord);
        await writer.close();
      } catch (error) {
        console.error("ZIP creation error:", error);
        await writer.abort(error);
      }
    })();

    const folderName = path.split("/").filter(Boolean).pop() || "download";

    return new Response(readable, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(folderName)}.zip"`,
      },
    });
  } catch (error: any) {
    console.error("Download error:", error);
    return new Response("下载失败: " + error.message, { status: 500 });
  }
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crc ^ data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
