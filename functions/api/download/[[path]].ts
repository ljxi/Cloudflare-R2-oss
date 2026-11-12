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

  try {
    // 获取目录下所有文件
    const files = [];
    let cursor = undefined;
    const prefix = path.endsWith('/') ? path : path + '/';

    do {
      const listed = await bucket.list({
        prefix: prefix,
        cursor: cursor,
      });

      for (const object of listed.objects) {
        // 跳过文件夹标记文件
        if (object.key.endsWith('_$folder$')) continue;
        files.push(object);
      }

      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);

    if (files.length === 0) {
      return new Response("目录为空或不存在", { status: 404 });
    }

    // 使用 ZIP 流式压缩
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // 开始压缩过程（在后台异步执行）
    (async () => {
      try {
        // ZIP 文件头
        const zipFiles = [];
        let offset = 0;

        for (const file of files) {
          const object = await bucket.get(file.key);
          if (!object) continue;

          const fileName = file.key.substring(prefix.length);
          const fileNameBytes = encoder.encode(fileName);
          const fileData = new Uint8Array(await object.arrayBuffer());

          // 本地文件头
          const localHeader = new Uint8Array(30 + fileNameBytes.length);
          const view = new DataView(localHeader.buffer);
          
          view.setUint32(0, 0x04034b50, true); // 本地文件头签名
          view.setUint16(4, 20, true); // 版本
          view.setUint16(6, 0, true); // 标志位
          view.setUint16(8, 0, true); // 压缩方法（0=不压缩）
          view.setUint16(10, 0, true); // 修改时间
          view.setUint16(12, 0, true); // 修改日期
          view.setUint32(14, crc32(fileData), true); // CRC-32
          view.setUint32(18, fileData.length, true); // 压缩后大小
          view.setUint32(22, fileData.length, true); // 未压缩大小
          view.setUint16(26, fileNameBytes.length, true); // 文件名长度
          view.setUint16(28, 0, true); // 额外字段长度

          localHeader.set(fileNameBytes, 30);

          await writer.write(localHeader);
          await writer.write(fileData);

          zipFiles.push({
            fileName: fileNameBytes,
            offset: offset,
            crc: crc32(fileData),
            size: fileData.length,
          });

          offset += localHeader.length + fileData.length;
        }

        // 中央目录
        let centralDirSize = 0;
        for (const zipFile of zipFiles) {
          const centralHeader = new Uint8Array(46 + zipFile.fileName.length);
          const view = new DataView(centralHeader.buffer);

          view.setUint32(0, 0x02014b50, true); // 中央目录文件头签名
          view.setUint16(4, 20, true); // 制作版本
          view.setUint16(6, 20, true); // 解压版本
          view.setUint16(8, 0, true); // 标志位
          view.setUint16(10, 0, true); // 压缩方法
          view.setUint16(12, 0, true); // 修改时间
          view.setUint16(14, 0, true); // 修改日期
          view.setUint32(16, zipFile.crc, true); // CRC-32
          view.setUint32(20, zipFile.size, true); // 压缩后大小
          view.setUint32(24, zipFile.size, true); // 未压缩大小
          view.setUint16(28, zipFile.fileName.length, true); // 文件名长度
          view.setUint16(30, 0, true); // 额外字段长度
          view.setUint16(32, 0, true); // 文件注释长度
          view.setUint16(34, 0, true); // 磁盘号
          view.setUint16(36, 0, true); // 内部文件属性
          view.setUint32(38, 0, true); // 外部文件属性
          view.setUint32(42, zipFile.offset, true); // 本地文件头偏移

          centralHeader.set(zipFile.fileName, 46);

          await writer.write(centralHeader);
          centralDirSize += centralHeader.length;
        }

        // 中央目录结束记录
        const endRecord = new Uint8Array(22);
        const endView = new DataView(endRecord.buffer);
        endView.setUint32(0, 0x06054b50, true); // 结束记录签名
        endView.setUint16(4, 0, true); // 磁盘号
        endView.setUint16(6, 0, true); // 中央目录开始磁盘号
        endView.setUint16(8, zipFiles.length, true); // 本磁盘上的记录数
        endView.setUint16(10, zipFiles.length, true); // 中央目录记录总数
        endView.setUint32(12, centralDirSize, true); // 中央目录大小
        endView.setUint32(16, offset, true); // 中央目录偏移
        endView.setUint16(20, 0, true); // 注释长度

        await writer.write(endRecord);
        await writer.close();
      } catch (error) {
        console.error('ZIP creation error:', error);
        await writer.abort(error);
      }
    })();

    // 获取文件夹名称
    const folderName = path.split('/').filter(Boolean).pop() || 'download';

    return new Response(readable, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(folderName)}.zip"`,
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return new Response("下载失败: " + error.message, { status: 500 });
  }
}

// CRC-32 计算函数
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
