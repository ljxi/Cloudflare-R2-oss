import { notFound, parseBucketPath } from "@/utils/bucket";
import { get_read_auth_status } from "@/utils/auth";

const DEFAULT_ZIP_MAX_FILES = 1000;
const DEFAULT_ZIP_MAX_BYTES = 500 * 1024 * 1024;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function createCrc32() {
  let crc = 0xffffffff;
  return {
    update(data) {
      for (let i = 0; i < data.length; i++) {
        crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
      }
    },
    digest() {
      return (crc ^ 0xffffffff) >>> 0;
    },
  };
}

function normalizeBucketPath(input) {
  let p = Array.isArray(input) ? input.join("/") : String(input ?? "");
  p = p.split("?")[0].split("#")[0];
  try {
    p = decodeURIComponent(p);
  } catch {}
  return p.replace(/^\/+/, "");
}

function dosDateTime(d) {
  const time =
    ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
  const date =
    (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) &
    0xffff;
  return { time, date };
}

function unauthorized() {
  const header = new Headers();
  header.set("WWW-Authenticate", 'Basic realm="需要登录下载"');
  return new Response("没有下载权限", { status: 401, headers: header });
}

function zipHeaders(folderName) {
  const ascii =
    folderName.replace(/[^\x20-\x7e]/g, "_").replace(/["\r\n]/g, "_") || "download";
  const headers = new Headers();
  headers.set("Content-Type", "application/zip");
  headers.set(
    "Content-Disposition",
    `attachment; filename="${ascii}.zip"; filename*=UTF-8''${encodeURIComponent(folderName)}.zip`
  );
  headers.set("X-Content-Type-Options", "nosniff");
  return headers;
}

export async function onRequestGet(context) {
  const [bucket, rawPath] = parseBucketPath(context);
  if (!bucket) return notFound();

  const path = normalizeBucketPath(rawPath);

  if (!get_read_auth_status(context, path)) {
    return unauthorized();
  }

  try {
    const files = [];
    let cursor = undefined;
    const prefix = path.endsWith("/") ? path : path + "/";

    do {
      const listed = await bucket.list({ prefix, cursor });
      for (const object of listed.objects) {
        if (object.key.endsWith("_$folder$")) continue;
        files.push(object);
      }
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);

    if (files.length === 0) {
      return new Response("目录为空或不存在", { status: 404 });
    }

    const maxFiles = Number(context.env["ZIP_MAX_FILES"]) || DEFAULT_ZIP_MAX_FILES;
    if (files.length > maxFiles) {
      return new Response(`文件数量超过 ${maxFiles}，请分批下载`, { status: 413 });
    }

    const maxBytes = Number(context.env["ZIP_MAX_BYTES"]) || DEFAULT_ZIP_MAX_BYTES;
    let totalSize = 0;
    for (const f of files) totalSize += f.size || 0;
    if (totalSize > maxBytes) {
      const mb = Math.floor(maxBytes / 1024 / 1024);
      return new Response(`目录总大小超过 ${mb}MB，请分批下载`, { status: 413 });
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const centralEntries = [];
        let offset = 0;
        const { time, date } = dosDateTime(new Date());
        const FLAGS = 0x0008 | 0x0800;

        for (const file of files) {
          const object = await bucket.get(file.key);
          if (!object || !object.body) continue;

          const fileName = file.key.substring(prefix.length);
          const fileNameBytes = encoder.encode(fileName);

          const localHeader = new Uint8Array(30 + fileNameBytes.length);
          const view = new DataView(localHeader.buffer);
          view.setUint32(0, 0x04034b50, true);
          view.setUint16(4, 20, true);
          view.setUint16(6, FLAGS, true);
          view.setUint16(8, 0, true);
          view.setUint16(10, time, true);
          view.setUint16(12, date, true);
          view.setUint32(14, 0, true);
          view.setUint32(18, 0, true);
          view.setUint32(22, 0, true);
          view.setUint16(26, fileNameBytes.length, true);
          view.setUint16(28, 0, true);
          localHeader.set(fileNameBytes, 30);

          const localHeaderOffset = offset;
          await writer.write(localHeader);
          offset += localHeader.length;

          const crcState = createCrc32();
          let fileSize = 0;
          const reader = object.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value && value.length) {
              crcState.update(value);
              fileSize += value.length;
              await writer.write(value);
              offset += value.length;
            }
          }
          const crc = crcState.digest();

          const dd = new Uint8Array(16);
          const ddView = new DataView(dd.buffer);
          ddView.setUint32(0, 0x08074b50, true);
          ddView.setUint32(4, crc, true);
          ddView.setUint32(8, fileSize, true);
          ddView.setUint32(12, fileSize, true);
          await writer.write(dd);
          offset += dd.length;

          centralEntries.push({
            fileName: fileNameBytes,
            offset: localHeaderOffset,
            crc,
            size: fileSize,
          });
        }

        let centralDirSize = 0;
        for (const entry of centralEntries) {
          const centralHeader = new Uint8Array(46 + entry.fileName.length);
          const view = new DataView(centralHeader.buffer);
          view.setUint32(0, 0x02014b50, true);
          view.setUint16(4, 20, true);
          view.setUint16(6, 20, true);
          view.setUint16(8, FLAGS, true);
          view.setUint16(10, 0, true);
          view.setUint16(12, time, true);
          view.setUint16(14, date, true);
          view.setUint32(16, entry.crc, true);
          view.setUint32(20, entry.size, true);
          view.setUint32(24, entry.size, true);
          view.setUint16(28, entry.fileName.length, true);
          view.setUint16(30, 0, true);
          view.setUint16(32, 0, true);
          view.setUint16(34, 0, true);
          view.setUint16(36, 0, true);
          view.setUint32(38, 0, true);
          view.setUint32(42, entry.offset, true);
          centralHeader.set(entry.fileName, 46);
          await writer.write(centralHeader);
          centralDirSize += centralHeader.length;
        }

        const endRecord = new Uint8Array(22);
        const endView = new DataView(endRecord.buffer);
        endView.setUint32(0, 0x06054b50, true);
        endView.setUint16(4, 0, true);
        endView.setUint16(6, 0, true);
        endView.setUint16(8, centralEntries.length, true);
        endView.setUint16(10, centralEntries.length, true);
        endView.setUint32(12, centralDirSize, true);
        endView.setUint32(16, offset, true);
        endView.setUint16(20, 0, true);
        await writer.write(endRecord);
        await writer.close();
      } catch (error) {
        console.error("ZIP creation error:", error);
        try {
          await writer.abort(error);
        } catch {}
      }
    })();

    const folderName = path.split("/").filter(Boolean).pop() || "download";
    return new Response(readable, { headers: zipHeaders(folderName) });
  } catch (error) {
    console.error("Download error:", error);
    return new Response("下载失败", { status: 500 });
  }
}
