import { notFound, parseBucketPath } from "@/utils/bucket";
import { get_read_auth_status } from "@/utils/auth";

const PREVIEWABLE_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/xml",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/svg+xml",
  "image/x-icon",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
]);

const EXTENSION_TYPES = {
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  json: "application/json; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
  gz: "application/gzip",
  tar: "application/x-tar",
};

function inferContentType(object, path) {
  const meta = object.httpMetadata && object.httpMetadata.contentType;
  if (meta) return meta;
  const idx = path.lastIndexOf(".");
  const ext = idx >= 0 ? path.slice(idx + 1).toLowerCase() : "";
  return EXTENSION_TYPES[ext] || "application/octet-stream";
}

function isPreviewable(contentType) {
  const base = contentType.split(";")[0].trim().toLowerCase();
  return PREVIEWABLE_TYPES.has(base);
}

export async function onRequestGet(context) {
  const [bucket, path] = parseBucketPath(context);
  if (!bucket) return notFound();

  if (!get_read_auth_status(context, path)) {
    const header = new Headers();
    header.set("WWW-Authenticate", 'Basic realm="需要登录下载"');
    return new Response("没有下载权限", {
      status: 401,
      headers: header,
    });
  }

  const fileObject = await bucket.get(path);
  if (fileObject) {
    const contentType = inferContentType(fileObject, path);
    const previewable = isPreviewable(contentType);
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

  try {
    const files = [];
    let cursor = undefined;
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
        const zipFiles = [];
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
  } catch (error) {
    console.error("Download error:", error);
    return new Response("下载失败: " + error.message, { status: 500 });
  }
}

function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crc ^ data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
